/**
 * One-time backfill: set zpinPaidUp/partnerZpinPaidUp = true on tournament
 * entries for all players who currently have an active ZPIN subscription,
 * and correct entryFee / partnerEntryFee to remove the surcharge.
 *
 * Safe to re-run — only touches entries where the flag or fee is wrong.
 */
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { connectDatabase } from '../config/database.js';
import MembershipSubscription from '../models/MembershipSubscription.js';
import Tournament from '../models/Tournament.js';

const ACTIVE_STATUSES = ['upcoming', 'entries_open', 'entries_closed', 'in_progress'];

const run = async () => {
  await connectDatabase();

  const currentYear = new Date().getFullYear();
  const activeSubs = await MembershipSubscription.find({
    entityType: 'player',
    year: currentYear,
    status: 'active'
  }).select('entityId entityName zpin membershipTypeCode').lean();

  console.log(`Found ${activeSubs.length} active player subscriptions`);

  const subByPlayerId = {};
  for (const s of activeSubs) subByPlayerId[s.entityId.toString()] = s;

  const tournaments = await Tournament.find({ status: { $in: ACTIVE_STATUSES } });

  let playerFixed = 0;
  let partnerFixed = 0;

  for (const tournament of tournaments) {
    const baseFeeT = tournament.entryFee ?? 0;
    let dirty = false;

    for (const cat of tournament.categories) {
      const catBaseFee = cat.entryFee ?? baseFeeT;

      for (const entry of cat.entries) {
        if (entry.paymentStatus !== 'unpaid') continue;

        // Fix player
        const pid = entry.playerId?.toString();
        if (pid && subByPlayerId[pid]) {
          const sub = subByPlayerId[pid];
          const isJunior = sub.membershipTypeCode === 'zpin_junior';
          const correctPaidUp = cat.type !== 'senior' || !isJunior;
          const correctFee = catBaseFee > 0
            ? (correctPaidUp ? catBaseFee : Math.ceil(catBaseFee * 1.5))
            : 0;
          if (entry.zpinPaidUp !== correctPaidUp || (catBaseFee > 0 && entry.entryFee !== correctFee)) {
            console.log(`  ${sub.entityName} (${sub.zpin}): zpinPaidUp ${entry.zpinPaidUp}→${correctPaidUp}, fee ${entry.entryFee}→${correctFee} [${tournament.name} / ${cat.name}]`);
            entry.zpinPaidUp = correctPaidUp;
            if (catBaseFee > 0) entry.entryFee = correctFee;
            dirty = true;
            playerFixed++;
          }
        }

        // Fix partner
        const ppid = entry.partnerId?.toString();
        if (ppid && subByPlayerId[ppid]) {
          const sub = subByPlayerId[ppid];
          const isJunior = sub.membershipTypeCode === 'zpin_junior';
          const correctPaidUp = cat.type !== 'senior' || !isJunior;
          const correctFee = catBaseFee > 0
            ? (correctPaidUp ? catBaseFee : Math.ceil(catBaseFee * 1.5))
            : 0;
          if (entry.partnerZpinPaidUp !== correctPaidUp || (catBaseFee > 0 && entry.partnerEntryFee !== correctFee)) {
            console.log(`  PARTNER ${sub.entityName} (${sub.zpin}): zpinPaidUp ${entry.partnerZpinPaidUp}→${correctPaidUp}, fee ${entry.partnerEntryFee}→${correctFee} [${tournament.name} / ${cat.name}]`);
            entry.partnerZpinPaidUp = correctPaidUp;
            if (catBaseFee > 0) entry.partnerEntryFee = correctFee;
            dirty = true;
            partnerFixed++;
          }
        }
      }
    }

    if (dirty) await tournament.save();
  }

  console.log(`\nDone. ${playerFixed} player entries + ${partnerFixed} partner entries corrected.`);
  await mongoose.disconnect();
};

run().catch(err => { console.error(err); process.exit(1); });
