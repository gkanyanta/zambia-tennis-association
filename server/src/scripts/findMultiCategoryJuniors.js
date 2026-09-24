/**
 * List ranking tournaments with finalized junior singles results, flagging
 * players who entered more than one junior age group in the same tournament.
 *
 *   node src/scripts/findMultiCategoryJuniors.js
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
import mongoose from 'mongoose';
import { connectDatabase } from '../config/database.js';
import Tournament from '../models/Tournament.js';

const run = async () => {
  await connectDatabase();
  const tournaments = await Tournament.find({}).sort({ startDate: 1 });
  for (const t of tournaments) {
    const juniors = t.categories.filter(c => c.type === 'junior' && c.format === 'singles');
    const finalized = juniors.filter(c => c.draw?.finalized).length;
    const byPlayer = {};
    for (const c of juniors) {
      for (const e of c.entries || []) {
        if (['withdrawn', 'rejected'].includes(e.status)) continue;
        const key = e.playerId || e.playerZpin || e.playerName;
        (byPlayer[key] ||= { name: e.playerName, groups: [] }).groups.push(`${c.gender} ${c.ageGroup}`);
      }
    }
    const multi = Object.values(byPlayer).filter(p => p.groups.length > 1);
    if (!finalized && !multi.length) continue;
    console.log(`${t._id} | ${t.startDate?.toISOString().slice(0, 10)} | ${t.name} | ranking=${!!t.rankingTournament} multiCat=${!!t.allowMultipleCategories} | finalized junior cats ${finalized}/${juniors.length} | multi-group players ${multi.length}`);
    for (const p of multi) console.log(`    ${p.name}: ${p.groups.join(' + ')}`);
  }
  await mongoose.disconnect();
};

run().catch(async err => { console.error(err); await mongoose.disconnect(); process.exit(1); });
