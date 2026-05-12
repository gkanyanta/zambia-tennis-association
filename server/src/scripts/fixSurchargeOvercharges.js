/**
 * Fix entries where zpinPaidUp=true but entryFee still includes the 50% surcharge.
 * This happened because the subscription query used wrong field names (userId/userType
 * instead of entityId/entityType), so zpinPaidUp was set false at registration time.
 * The backfill script later corrected zpinPaidUp to true but left the inflated fee.
 *
 * Only fixes unpaid entries (status: pending_payment) — cannot refund already-paid ones.
 */
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { connectDatabase } from '../config/database.js';
import Tournament from '../models/Tournament.js';

const ACTIVE_STATUSES = ['upcoming', 'entries_open', 'entries_closed', 'in_progress'];

const run = async () => {
  await connectDatabase();
  console.log('Scanning for overcharged entries (zpinPaidUp=true but fee includes surcharge)...\n');

  const tournaments = await Tournament.find({ status: { $in: ACTIVE_STATUSES } });

  let totalFixed = 0;

  for (const tournament of tournaments) {
    const baseFee = tournament.entryFee ?? 0;
    let tournamentDirty = false;

    for (const cat of tournament.categories) {
      const catBaseFee = cat.entryFee ?? baseFee;
      if (!catBaseFee) continue;
      const expectedSurcharge = Math.ceil(catBaseFee * 1.5);

      for (const entry of cat.entries) {
        if (entry.paymentStatus !== 'unpaid') continue;
        if (entry.status !== 'pending_payment') continue;

        // Player overcharged
        if (entry.zpinPaidUp === true && entry.entryFee === expectedSurcharge) {
          console.log(`FIX: ${tournament.name} — ${cat.name} — ${entry.playerName}`);
          console.log(`  entryFee: ${entry.entryFee} → ${catBaseFee}`);
          entry.entryFee = catBaseFee;
          tournamentDirty = true;
          totalFixed++;
        }

        // Partner overcharged
        if (entry.partnerZpinPaidUp === true && entry.partnerEntryFee === expectedSurcharge) {
          console.log(`FIX (partner): ${tournament.name} — ${cat.name} — ${entry.partnerName}`);
          console.log(`  partnerEntryFee: ${entry.partnerEntryFee} → ${catBaseFee}`);
          entry.partnerEntryFee = catBaseFee;
          tournamentDirty = true;
          totalFixed++;
        }
      }
    }

    if (tournamentDirty) {
      await tournament.save();
      console.log(`  Saved ${tournament.name}\n`);
    }
  }

  if (totalFixed === 0) {
    console.log('No overcharged entries found.');
  } else {
    console.log(`\nTotal fixed: ${totalFixed} entries`);
  }

  await mongoose.disconnect();
};

run().catch(e => { console.error(e); process.exit(1); });
