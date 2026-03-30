/**
 * Repair script: create missing Transaction records for active subscriptions
 * and backfill receiptNumber on subscriptions.
 *
 * This fixes the issue where payments show in Membership Management but not
 * in Income & Payments, and receipts are missing.
 *
 * Usage: cd server && node src/scripts/repairMissingTransactions.js
 */
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { connectDatabase } from '../config/database.js';
import Transaction from '../models/Transaction.js';
import MembershipSubscription from '../models/MembershipSubscription.js';
import User from '../models/User.js';
import sendEmail from '../utils/sendEmail.js';
import { generateReceipt } from '../utils/generateReceipt.js';

const run = async () => {
  await connectDatabase();
  console.log('Connected to database\n');

  // Step 1: Find all active subscriptions
  const activeSubscriptions = await MembershipSubscription.find({
    status: 'active'
  });
  console.log(`Found ${activeSubscriptions.length} active subscriptions total`);

  // Step 2: Group by paymentReference
  const subsByRef = new Map();
  for (const sub of activeSubscriptions) {
    const ref = sub.paymentReference;
    if (!ref) {
      console.log(`  WARNING: Subscription ${sub._id} (${sub.entityName}) has no paymentReference`);
      continue;
    }
    if (!subsByRef.has(ref)) subsByRef.set(ref, []);
    subsByRef.get(ref).push(sub);
  }
  console.log(`Grouped into ${subsByRef.size} payment references\n`);

  // Step 3: Check each group for missing Transactions
  let missingCount = 0;
  let fixedCount = 0;
  let receiptBackfillCount = 0;

  for (const [paymentRef, subs] of subsByRef) {
    // Check if Transaction exists by reference
    let txn = await Transaction.findOne({ reference: paymentRef });

    // Also check by relatedId (for SYNC-* or CONFIRM-* or MANUAL-* transactions)
    if (!txn) {
      txn = await Transaction.findOne({
        relatedId: { $in: subs.map(s => s._id) },
        relatedModel: 'MembershipSubscription',
        status: 'completed'
      });
    }

    const subsNeedingReceipt = subs.filter(s => !s.receiptNumber);

    if (txn) {
      // Transaction exists — just backfill receiptNumber if needed
      if (subsNeedingReceipt.length > 0 && txn.receiptNumber) {
        for (const s of subsNeedingReceipt) {
          s.receiptNumber = txn.receiptNumber;
          await s.save();
          receiptBackfillCount++;
          console.log(`  BACKFILL: ${s.entityName} (${s.zpin}) ← receipt ${txn.receiptNumber}`);
        }
      }
      continue;
    }

    // No Transaction at all — create one
    missingCount++;
    const isBulk = subs.length > 1;
    const firstSub = subs[0];

    let totalAmount = 0;
    const players = [];
    for (const s of subs) {
      totalAmount += s.amount;
      players.push({ id: s.entityId, name: s.entityName, zpin: s.zpin });
    }

    console.log(`\n  MISSING TRANSACTION for ref: ${paymentRef}`);
    console.log(`    Players: ${players.map(p => `${p.name} (${p.zpin})`).join(', ')}`);
    console.log(`    Total: K${totalAmount}`);

    const methodMap = { online: 'card', cash: 'cash', cheque: 'cheque' };
    const txnPaymentMethod = methodMap[firstSub.paymentMethod] || firstSub.paymentMethod || 'other';
    const txnReference = `REPAIR-${firstSub._id}-${Date.now()}`;

    try {
      const newTxn = await Transaction.create({
        reference: txnReference,
        transactionId: firstSub.transactionId || null,
        type: 'membership',
        amount: totalAmount,
        currency: firstSub.currency || 'ZMW',
        payerName: firstSub.payer?.name || firstSub.entityName,
        payerEmail: firstSub.payer?.email || null,
        status: 'completed',
        paymentGateway: firstSub.paymentMethod === 'online' ? 'lenco' : 'manual',
        paymentMethod: txnPaymentMethod,
        relatedId: firstSub._id,
        relatedModel: 'MembershipSubscription',
        description: isBulk
          ? `Bulk ZPIN Registration - ${subs.length} player(s)`
          : `${firstSub.membershipTypeName} - ${firstSub.year}`,
        metadata: {
          membershipType: firstSub.membershipTypeCode,
          membershipYear: firstSub.year,
          entityType: firstSub.entityType,
          playerName: firstSub.entityName,
          zpin: firstSub.zpin,
          bankReference: firstSub.paymentReference,
          repaired: true,
          ...(isBulk ? { playerCount: subs.length, players } : {})
        },
        paymentDate: firstSub.paymentDate || firstSub.createdAt
      });

      console.log(`    CREATED: Transaction ${newTxn.receiptNumber} (ref: ${txnReference})`);

      // Backfill receiptNumber on all subscriptions
      if (newTxn.receiptNumber) {
        for (const s of subs) {
          s.receiptNumber = newTxn.receiptNumber;
          await s.save();
          receiptBackfillCount++;
        }
      }

      // Send receipt email
      const recipientEmail = firstSub.payer?.email;
      if (recipientEmail && newTxn.receiptNumber) {
        try {
          const pdfBuffer = await generateReceipt(newTxn);
          await sendEmail({
            email: recipientEmail,
            subject: `Payment Receipt - ${newTxn.receiptNumber} - ZTA`,
            html: `
              <h2>Payment Receipt</h2>
              <p>Dear ${newTxn.payerName},</p>
              <p>Thank you for your payment to the Zambia Tennis Association.</p>
              <p><strong>Receipt Details:</strong></p>
              <ul>
                <li>Receipt Number: ${newTxn.receiptNumber}</li>
                <li>Amount: K${parseFloat(newTxn.amount).toFixed(2)}</li>
                <li>Date: ${new Date(newTxn.paymentDate).toLocaleDateString('en-GB', {
                  day: 'numeric', month: 'long', year: 'numeric'
                })}</li>
              </ul>
              ${isBulk ? `<h3>Players:</h3><ul>${players.map(p => `<li>${p.name} (ZPIN: ${p.zpin})</li>`).join('')}</ul>` : ''}
              <p>Please find your official receipt attached.</p>
              <p>Best regards,<br>Zambia Tennis Association</p>
            `,
            attachments: [{
              filename: `ZTA-Receipt-${newTxn.receiptNumber}.pdf`,
              content: pdfBuffer,
              contentType: 'application/pdf'
            }]
          });
          newTxn.receiptSentAt = new Date();
          await newTxn.save();
          console.log(`    EMAIL SENT to ${recipientEmail}`);
        } catch (emailErr) {
          console.error(`    EMAIL FAILED: ${emailErr.message}`);
        }
      } else {
        console.log(`    NO EMAIL: payer email not available`);
      }

      fixedCount++;
    } catch (err) {
      console.error(`    FAILED to create transaction: ${err.message}`);
    }
  }

  console.log(`\n========== SUMMARY ==========`);
  console.log(`Active subscriptions: ${activeSubscriptions.length}`);
  console.log(`Payment references: ${subsByRef.size}`);
  console.log(`Missing transactions found: ${missingCount}`);
  console.log(`Transactions created: ${fixedCount}`);
  console.log(`Receipt numbers backfilled: ${receiptBackfillCount}`);

  await mongoose.disconnect();
  console.log('\nDone.');
};

run().catch(err => {
  console.error('Script failed:', err);
  process.exit(1);
});
