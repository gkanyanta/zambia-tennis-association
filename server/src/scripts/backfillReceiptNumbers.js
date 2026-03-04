/**
 * Backfill receiptNumber on active MembershipSubscriptions that are missing it.
 * Finds the matching Transaction by relatedId or paymentReference and copies the receiptNumber.
 *
 * Usage:
 *   DRY_RUN=true node server/src/scripts/backfillReceiptNumbers.js   # preview
 *   node server/src/scripts/backfillReceiptNumbers.js                 # apply
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
import MembershipSubscription from '../models/MembershipSubscription.js';
import Transaction from '../models/Transaction.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

const DRY_RUN = process.env.DRY_RUN === 'true';

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to database');
  console.log(DRY_RUN ? '*** DRY RUN ***' : '*** LIVE RUN ***');
  console.log('');

  // Find active subscriptions without a receiptNumber
  const subs = await MembershipSubscription.find({
    status: 'active',
    $or: [
      { receiptNumber: { $exists: false } },
      { receiptNumber: null },
      { receiptNumber: '' }
    ]
  });

  console.log(`Found ${subs.length} active subscriptions missing receiptNumber`);

  let fixed = 0;
  for (const sub of subs) {
    // Try to find transaction by relatedId first
    let transaction = await Transaction.findOne({
      relatedId: sub._id,
      relatedModel: 'MembershipSubscription',
      status: 'completed'
    });

    // If not found, try by paymentReference
    if (!transaction && sub.paymentReference) {
      transaction = await Transaction.findOne({
        reference: sub.paymentReference,
        status: 'completed'
      });
    }

    if (transaction?.receiptNumber) {
      console.log(`  ${sub.entityName} (${sub.zpin || 'no zpin'}) → ${transaction.receiptNumber}`);
      if (!DRY_RUN) {
        sub.receiptNumber = transaction.receiptNumber;
        await sub.save();
      }
      fixed++;
    } else {
      console.log(`  ${sub.entityName} (${sub.zpin || 'no zpin'}) — no matching transaction found`);
    }
  }

  console.log(`\n${DRY_RUN ? 'Would fix' : 'Fixed'} ${fixed} of ${subs.length} subscriptions`);
  await mongoose.disconnect();
}

main().catch(err => {
  console.error('Script failed:', err);
  mongoose.disconnect();
  process.exit(1);
});
