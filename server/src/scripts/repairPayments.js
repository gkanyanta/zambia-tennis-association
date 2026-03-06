/**
 * One-time repair script: backfill missing Transactions and receipt numbers
 * for subscriptions that are active but have no Transaction record or receipt.
 *
 * Usage: node --experimental-modules server/src/scripts/repairPayments.js
 *   or via: cd server && node -e "import('./src/scripts/repairPayments.js')"
 */
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load server .env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { connectDatabase } from '../config/database.js';
import Transaction from '../models/Transaction.js';
import MembershipSubscription from '../models/MembershipSubscription.js';

const run = async () => {
  await connectDatabase();
  console.log('Connected to database\n');

  // 1. Find active subscriptions missing Transaction records
  const allActive = await MembershipSubscription.find({
    status: 'active',
    paymentDate: { $exists: true, $ne: null }
  });

  console.log(`Found ${allActive.length} active subscriptions with paymentDate`);

  const existingRelatedIds = new Set(
    (await Transaction.distinct('relatedId', { relatedModel: 'MembershipSubscription' }))
      .map(id => id.toString())
  );
  const existingReferences = new Set(
    await Transaction.distinct('reference', { type: 'membership' })
  );

  let createdTxns = 0;
  let backfilledReceipts = 0;
  let errors = 0;

  for (const sub of allActive) {
    const hasRelated = existingRelatedIds.has(sub._id.toString());
    const hasRef = sub.paymentReference && existingReferences.has(sub.paymentReference);

    if (!hasRelated && !hasRef) {
      // No Transaction exists — create one
      try {
        const methodMap = { online: 'card', cash: 'cash', cheque: 'cheque' };
        const txnPaymentMethod = methodMap[sub.paymentMethod] || sub.paymentMethod || 'other';
        const isLenco = sub.paymentReference &&
          (sub.paymentReference.startsWith('MEM-') || sub.paymentReference.startsWith('CLUB-'));

        const txn = await Transaction.create({
          reference: sub.paymentReference || `REPAIR-${sub._id}`,
          type: 'membership',
          amount: sub.amount,
          currency: sub.currency || 'ZMW',
          payerName: sub.payer?.name || sub.entityName,
          payerEmail: sub.payer?.email || null,
          status: 'completed',
          paymentGateway: isLenco ? 'lenco' : 'manual',
          paymentMethod: isLenco ? 'card' : txnPaymentMethod,
          relatedId: sub._id,
          relatedModel: 'MembershipSubscription',
          description: `${sub.membershipTypeName} - ${sub.year} (Repaired)`,
          metadata: {
            membershipType: sub.membershipTypeCode,
            membershipYear: sub.year,
            entityType: sub.entityType,
            playerName: sub.entityName,
            zpin: sub.zpin,
            repaired: true
          },
          paymentDate: sub.paymentDate
        });

        if (txn.receiptNumber && !sub.receiptNumber) {
          sub.receiptNumber = txn.receiptNumber;
          await sub.save();
          backfilledReceipts++;
        }

        console.log(`  CREATED Transaction for ${sub.entityName} (${sub._id}) → ${txn.receiptNumber}`);
        createdTxns++;
        existingRelatedIds.add(sub._id.toString());
        if (sub.paymentReference) existingReferences.add(sub.paymentReference);
      } catch (err) {
        console.error(`  ERROR creating transaction for ${sub.entityName} (${sub._id}):`, err.message);
        errors++;
      }
    } else if (!sub.receiptNumber) {
      // Transaction exists but subscription missing receiptNumber — backfill
      try {
        const txn = await Transaction.findOne({
          $or: [
            { relatedId: sub._id, relatedModel: 'MembershipSubscription' },
            ...(sub.paymentReference ? [{ reference: sub.paymentReference }] : [])
          ],
          status: 'completed'
        });
        if (txn?.receiptNumber) {
          sub.receiptNumber = txn.receiptNumber;
          await sub.save();
          console.log(`  BACKFILLED receipt for ${sub.entityName} (${sub._id}) → ${txn.receiptNumber}`);
          backfilledReceipts++;
        }
      } catch (err) {
        console.error(`  ERROR backfilling receipt for ${sub.entityName} (${sub._id}):`, err.message);
        errors++;
      }
    }
  }

  console.log('\n--- REPAIR SUMMARY ---');
  console.log(`Active subscriptions scanned: ${allActive.length}`);
  console.log(`Transactions created: ${createdTxns}`);
  console.log(`Receipt numbers backfilled: ${backfilledReceipts}`);
  console.log(`Errors: ${errors}`);

  // 2. Report any pending subscriptions that might be paid (have a Lenco reference)
  const pendingWithRef = await MembershipSubscription.find({
    status: 'pending',
    paymentReference: { $regex: /^(MEM|CLUB)-/ }
  });

  if (pendingWithRef.length > 0) {
    console.log(`\n--- PENDING SUBSCRIPTIONS WITH LENCO REFERENCES (may need manual verification) ---`);
    for (const sub of pendingWithRef) {
      console.log(`  ${sub.entityName} | Ref: ${sub.paymentReference} | Amount: ${sub.amount} | Created: ${sub.createdAt}`);
    }
    console.log(`Total: ${pendingWithRef.length} — verify these in Lenco dashboard and confirm manually if paid.`);
  }

  await mongoose.disconnect();
  console.log('\nDone.');
};

run().catch(err => {
  console.error('Repair script failed:', err);
  process.exit(1);
});
