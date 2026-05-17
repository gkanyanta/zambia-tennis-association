/**
 * Entry summary: count of accepted entries per category and amounts received
 * (less surcharge — shows base entry fees only).
 */
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { connectDatabase } from '../config/database.js';

const run = async () => {
  await connectDatabase();
  const db = mongoose.connection.db;

  // Get all in-progress / recently active tournaments
  const tournaments = await db.collection('tournaments').find(
    { status: { $in: ['in_progress', 'entries_open', 'entries_closed', 'completed'] } },
    { projection: { name: 1, status: 1, startDate: 1, entryFee: 1, surcharge: 1 } }
  ).sort({ startDate: -1 }).limit(5).toArray();

  console.log('Recent tournaments:');
  for (const t of tournaments) {
    console.log(`  [${t._id}] ${t.name} | ${t.status} | fee: ${t.entryFee} | surcharge: ${t.surcharge}`);
  }

  // Use the most recent in_progress one (likely ZCSA)
  const tournament = tournaments.find(t => t.status === 'in_progress') || tournaments[0];
  if (!tournament) { console.log('No tournament found'); process.exit(0); }

  const full = await db.collection('tournaments').findOne({ _id: tournament._id });
  console.log(`\n\nReport for: ${full.name}\n${'='.repeat(60)}`);

  let grandEntries = 0;
  let grandBase = 0;
  let grandSurcharge = 0;

  for (const cat of full.categories) {
    const accepted  = (cat.entries || []).filter(e => e.status === 'accepted');
    const withdrawn = (cat.entries || []).filter(e => e.status !== 'accepted');
    if (accepted.length === 0 && withdrawn.length === 0) continue;

    const isDoubles = cat.format === 'doubles' || cat.format === 'mixed_doubles';
    let catBase = 0;
    let catSurcharge = 0;
    let catEntryCount = 0;

    for (const e of accepted) {
      catEntryCount++;

      // Main player: surcharge is baked into entryFee (base = K250)
      const mainFee = e.entryFee || 0;
      const mainSurcharge = (e.zpinPaidUp === false && !e.surchargeWaived)
        ? Math.max(0, mainFee - 250)
        : 0;
      catBase += mainFee - mainSurcharge;
      catSurcharge += mainSurcharge;

      // Partner fee (doubles)
      if (isDoubles && e.partnerName) {
        const partnerFee = e.partnerEntryFee || e.entryFee || 0;
        const partnerSurcharge = (e.partnerZpinPaidUp === false && !e.partnerSurchargeWaived)
          ? Math.max(0, partnerFee - 250)
          : 0;
        catBase += partnerFee - partnerSurcharge;
        catSurcharge += partnerSurcharge;
      }
    }

    const unit  = isDoubles ? 'pairs' : 'players';
    const label = `${cat.name} (${catEntryCount} ${unit} played)`;
    console.log(`\n  ${label}`);
    console.log(`    Base fees:  K${catBase.toLocaleString()}`);
    if (catSurcharge > 0) console.log(`    Surcharge:  K${catSurcharge.toLocaleString()}`);
    console.log(`    Total:      K${(catBase + catSurcharge).toLocaleString()}`);
    if (withdrawn.length > 0) {
      const wLabel = isDoubles ? `${withdrawn.length} pair(s)` : `${withdrawn.length} player(s)`;
      const names = withdrawn.map(e => e.playerName || e.name || '(unknown)').join(', ');
      console.log(`    Did not play (withdrawn/unpaid): ${wLabel} — ${names}`);
    }

    grandEntries += catEntryCount;
    grandBase    += catBase;
    grandSurcharge += catSurcharge;
  }

  console.log(`\n${'─'.repeat(60)}`);
  console.log(`TOTAL ENTRIES:        ${grandEntries}`);
  console.log(`Total (less surcharge): K${grandBase.toLocaleString()}`);
  console.log(`Surcharge collected:    K${grandSurcharge.toLocaleString()}`);
  console.log(`Grand Total:            K${(grandBase + grandSurcharge).toLocaleString()}`);

  await mongoose.disconnect();
};

run().catch(err => { console.error(err); process.exit(1); });
