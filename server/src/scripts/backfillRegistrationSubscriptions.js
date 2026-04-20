/**
 * Backfill MembershipSubscription rows for approved player registrations
 * that paid via the REG-* flow but never got a subscription record created.
 *
 * Such players have:
 *   - User record with membershipStatus = 'active'
 *   - A completed Transaction (REG-* reference, ZTA-REG-* receipt)
 *   - NO MembershipSubscription for the current year
 *
 * The player listing derives status from MembershipSubscription, so without
 * this row they incorrectly surface as expired.
 *
 * Usage:
 *   cd server
 *   node src/scripts/backfillRegistrationSubscriptions.js          # dry run
 *   node src/scripts/backfillRegistrationSubscriptions.js --apply  # write
 */
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { connectDatabase } from '../config/database.js';
import PlayerRegistration from '../models/PlayerRegistration.js';
import MembershipSubscription from '../models/MembershipSubscription.js';
import MembershipType from '../models/MembershipType.js';
import Transaction from '../models/Transaction.js';
import User from '../models/User.js';

const APPLY = process.argv.includes('--apply');

const run = async () => {
  await connectDatabase();
  console.log(`Connected — mode: ${APPLY ? 'APPLY (writes)' : 'DRY RUN'}\n`);

  const currentYear = MembershipSubscription.getCurrentYear();

  // Find all approved registrations that have a payment recorded
  const approved = await PlayerRegistration.find({
    status: 'approved',
    paymentDate: { $ne: null },
    createdUserId: { $ne: null },
  });
  console.log(`Approved+paid registrations to inspect: ${approved.length}`);

  let created = 0;
  let alreadyHadSub = 0;
  let missingUser = 0;
  let missingType = 0;
  const skipped = [];

  for (const reg of approved) {
    const user = await User.findById(reg.createdUserId);
    if (!user) {
      missingUser++;
      skipped.push({ ref: reg.referenceNumber, reason: 'user not found' });
      continue;
    }

    const existing = await MembershipSubscription.findOne({
      entityId: user._id,
      entityType: 'player',
      year: currentYear,
    });
    if (existing) {
      alreadyHadSub++;
      continue;
    }

    const mtDoc =
      (reg.membershipTypeCode &&
        (await MembershipType.findOne({ code: reg.membershipTypeCode }))) ||
      (await MembershipType.findOne({
        code: user.membershipType === 'junior' ? 'zpin_junior' : 'zpin_senior',
      }));
    if (!mtDoc) {
      missingType++;
      skipped.push({ ref: reg.referenceNumber, reason: `no MembershipType for ${reg.membershipTypeCode || user.membershipType}` });
      continue;
    }

    const regTxn = await Transaction.findOne({
      $or: [
        { reference: reg.paymentReference },
        { relatedId: reg._id, relatedModel: 'PlayerRegistration' },
      ],
      status: 'completed',
    }).sort({ createdAt: -1 });

    const subData = {
      entityType: 'player',
      entityId: user._id,
      entityModel: 'User',
      entityName: `${user.firstName} ${user.lastName}`,
      membershipType: mtDoc._id,
      membershipTypeName: reg.membershipTypeName || mtDoc.name,
      membershipTypeCode: reg.membershipTypeCode || mtDoc.code,
      year: currentYear,
      startDate: reg.paymentDate || new Date(),
      endDate: MembershipSubscription.getYearEndDate(currentYear),
      amount: reg.paymentAmount || mtDoc.amount,
      currency: mtDoc.currency || 'ZMW',
      status: 'active',
      paymentMethod: reg.paymentMethod || 'online',
      paymentReference: reg.paymentReference || `REG-${reg.referenceNumber}`,
      transactionId: regTxn?.transactionId || null,
      paymentDate: reg.paymentDate || new Date(),
      receiptNumber: regTxn?.receiptNumber || null,
      zpin: user.zpin || null,
      notes: `Backfilled from registration ${reg.referenceNumber}`,
    };

    console.log(`  + ${user.zpin || '(no zpin)'} ${user.firstName} ${user.lastName} | reg=${reg.referenceNumber} | receipt=${subData.receiptNumber || 'NONE'}`);

    if (APPLY) {
      const sub = new MembershipSubscription(subData);
      await sub.save();
    }
    created++;
  }

  console.log(`\n=== Summary ===`);
  console.log(`Approved+paid registrations:      ${approved.length}`);
  console.log(`Already had a subscription:       ${alreadyHadSub}`);
  console.log(`User missing (skipped):           ${missingUser}`);
  console.log(`MembershipType missing (skipped): ${missingType}`);
  console.log(`Subscriptions ${APPLY ? 'CREATED' : 'WOULD CREATE'}: ${created}`);
  if (skipped.length) {
    console.log(`\nSkipped:`);
    for (const s of skipped) console.log(`  - ${s.ref}: ${s.reason}`);
  }
  if (!APPLY) console.log(`\n(Re-run with --apply to write)`);

  await mongoose.disconnect();
};

run().catch(err => { console.error(err); process.exit(1); });
