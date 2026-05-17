/**
 * Fix women_senior opening balance double-counting and men_doubles duplicates.
 */
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { connectDatabase } from '../config/database.js';

const PERIOD = '2026';

// Sheet totals for players who have real tournament results already in the DB
const SHEET_TOTALS = {
  'CHRISTABEL CHISONGO': 684,
  'ISABEL CHISONGO':     544,
  'MARGARET CHEWE':      322,
  'SORAYA MUMENA':       349,
  'MITRESS NALWIZYA':    186,
  'NALUNGWE NATASHA':    177,
};

const run = async () => {
  await connectDatabase();
  const col = mongoose.connection.db.collection('rankings');

  // ── 1. Fix women_senior opening balance ─────────────────────────────────────
  console.log('Fixing women_senior opening balances...');
  for (const [name, sheetTotal] of Object.entries(SHEET_TOTALS)) {
    const r = await col.findOne({ playerName: name, category: 'women_senior', rankingPeriod: PERIOD });
    if (!r) { console.log(`  Not found: ${name}`); continue; }

    const realResults = r.tournamentResults.filter(t => t.tournamentName !== 'Opening Balance 2026');
    const realSum = realResults.reduce((s, t) => s + (t.points || 0), 0);
    const correctOB = sheetTotal - realSum;

    const newResults = [
      { tournamentName: 'Opening Balance 2026', tournamentDate: new Date('2026-01-01'), points: correctOB, position: '–', year: 2026 },
      ...realResults
    ];
    const newTotal = newResults.reduce((s, t) => s + t.points, 0);

    await col.updateOne({ _id: r._id }, { $set: { tournamentResults: newResults, totalPoints: newTotal } });
    console.log(`  ${name}: OB = ${correctOB}, total = ${newTotal} ✓`);
  }

  // ── 2. Remove men_doubles duplicates (no-ZPIN when ZPIN version exists) ──────
  console.log('\nCleaning men_doubles duplicates...');
  const allMD = await col.find({ category: 'men_doubles', rankingPeriod: PERIOD }).toArray();
  const byName = {};
  for (const r of allMD) {
    const key = r.playerName.trim().toLowerCase();
    if (!byName[key]) byName[key] = [];
    byName[key].push(r);
  }
  let removed = 0;
  for (const records of Object.values(byName)) {
    if (records.length < 2) continue;
    const withZpin    = records.filter(r => r.playerZpin);
    const withoutZpin = records.filter(r => !r.playerZpin);
    if (withZpin.length && withoutZpin.length) {
      for (const dup of withoutZpin) {
        await col.deleteOne({ _id: dup._id });
        console.log(`  Removed duplicate: "${dup.playerName}" (no ZPIN)`);
        removed++;
      }
    }
  }
  if (!removed) console.log('  No duplicates found.');

  // ── 3. Re-rank women_senior ──────────────────────────────────────────────────
  console.log('\nRe-ranking women_senior...');
  const ws = await col.find({ category: 'women_senior', rankingPeriod: PERIOD, isActive: true })
    .sort({ totalPoints: -1 }).toArray();
  for (let i = 0; i < ws.length; i++) {
    await col.updateOne({ _id: ws[i]._id }, { $set: { previousRank: ws[i].rank, rank: i + 1 } });
  }
  console.log(`  ${ws.length} records re-ranked.`);

  // ── 4. Verify ────────────────────────────────────────────────────────────────
  for (const cat of ['women_senior', 'women_doubles', 'men_doubles']) {
    const top5 = await col.find({ category: cat, rankingPeriod: PERIOD, isActive: true })
      .sort({ rank: 1 }).limit(5).toArray();
    console.log(`\n${cat}:`);
    for (const r of top5) console.log(`  ${r.rank}. ${r.playerName} — ${r.totalPoints} pts`);
  }

  await mongoose.disconnect();
  console.log('\nDone.');
};

run().catch(err => { console.error(err); process.exit(1); });
