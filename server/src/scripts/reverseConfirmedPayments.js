/**
 * Reverse mistakenly confirmed membership payments.
 *
 * This script:
 * 1. Sets MembershipSubscription status back to 'pending'
 * 2. Resets the User membership status back to 'pending' (or 'inactive')
 * 3. Marks the Transaction record as 'cancelled'
 *
 * Usage:
 *   DRY_RUN=true node server/src/scripts/reverseConfirmedPayments.js   # preview changes
 *   node server/src/scripts/reverseConfirmedPayments.js                 # apply changes
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
import MembershipSubscription from '../models/MembershipSubscription.js';
import User from '../models/User.js';
import Transaction from '../models/Transaction.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

const DRY_RUN = process.env.DRY_RUN === 'true';

// ZPINs of the players whose payments were mistakenly confirmed
const PLAYER_ZPINS = ['ZTAS0020', 'ZTAS0023', 'ZTAS0031'];

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to database');
  console.log(DRY_RUN ? '*** DRY RUN - no changes will be saved ***' : '*** LIVE RUN - changes will be applied ***');
  console.log('');

  // Find the players by ZPIN
  const players = await User.find({ zpin: { $in: PLAYER_ZPINS } });

  if (players.length === 0) {
    console.log('No players found with those ZPINs. Trying as zpinId...');
    // Maybe these are zpinId or some other identifier format
  }

  console.log(`Found ${players.length} players:`);
  for (const p of players) {
    console.log(`  - ${p.zpin}: ${p.firstName} ${p.lastName} (ID: ${p._id})`);
    console.log(`    membershipStatus: ${p.membershipStatus}, membershipExpiry: ${p.membershipExpiry}`);
  }
  console.log('');

  for (const player of players) {
    console.log(`--- Processing ${player.zpin}: ${player.firstName} ${player.lastName} ---`);

    // Find the active subscription that was recently confirmed
    const subscription = await MembershipSubscription.findOne({
      entityType: 'player',
      entityId: player._id,
      status: 'active',
      year: new Date().getFullYear(),
    }).sort({ updatedAt: -1 });

    if (!subscription) {
      console.log('  No active subscription found for current year. Skipping.');
      continue;
    }

    console.log(`  Subscription: ${subscription._id}`);
    console.log(`    type: ${subscription.membershipTypeName}, amount: K${subscription.amount}`);
    console.log(`    status: ${subscription.status}, paymentDate: ${subscription.paymentDate}`);
    console.log(`    receiptNumber: ${subscription.receiptNumber}`);

    // Find the transaction
    const transaction = await Transaction.findOne({
      relatedId: subscription._id,
      relatedModel: 'MembershipSubscription',
      paymentGateway: 'manual',
      status: 'completed',
    }).sort({ createdAt: -1 });

    if (transaction) {
      console.log(`  Transaction: ${transaction._id}`);
      console.log(`    reference: ${transaction.reference}`);
      console.log(`    receiptNumber: ${transaction.receiptNumber}`);
    } else {
      console.log('  No matching transaction found.');
    }

    if (!DRY_RUN) {
      // 1. Revert subscription to pending
      subscription.status = 'pending';
      subscription.paymentDate = undefined;
      subscription.paymentMethod = undefined;
      subscription.receiptNumber = undefined;
      await subscription.save();
      console.log('  ✓ Subscription reverted to pending');

      // 2. Revert player membership status
      player.membershipStatus = 'pending';
      player.membershipExpiry = undefined;
      player.lastPaymentDate = undefined;
      player.lastPaymentAmount = undefined;
      await player.save();
      console.log('  ✓ Player membership status reverted to pending');

      // 3. Cancel the transaction
      if (transaction) {
        transaction.status = 'failed';
        transaction.metadata = {
          ...transaction.metadata,
          cancelledReason: 'Payment confirmed by mistake - money not received',
          cancelledAt: new Date().toISOString(),
        };
        await transaction.save();
        console.log('  ✓ Transaction marked as cancelled');
      }
    } else {
      console.log('  [DRY RUN] Would revert subscription to pending');
      console.log('  [DRY RUN] Would revert player membership status to pending');
      if (transaction) {
        console.log('  [DRY RUN] Would mark transaction as failed');
      }
    }

    console.log('');
  }

  console.log('Done.');
  await mongoose.disconnect();
}

main().catch(err => {
  console.error('Script failed:', err);
  mongoose.disconnect();
  process.exit(1);
});
