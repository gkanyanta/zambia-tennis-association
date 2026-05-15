/**
 * Backfill doublesPoints and partnerDoublesPoints on existing doubles entries
 * by looking up each player's totalPoints from the Ranking collection.
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
import mongoose from 'mongoose';
import { connectDatabase } from '../config/database.js';
import Tournament from '../models/Tournament.js';
import Ranking from '../models/Ranking.js';
import { rankingCategoryFor } from '../utils/rankingPoints.js';

const run = async () => {
  await connectDatabase();

  const tournaments = await Tournament.find({ status: { $in: ['in_progress', 'upcoming', 'entries_open', 'entries_closed'] } });

  let updated = 0;

  for (const tournament of tournaments) {
    const rankingYear = String(new Date(tournament.startDate).getFullYear());
    let dirty = false;

    for (const cat of tournament.categories) {
      if (cat.format !== 'doubles' && cat.format !== 'mixed_doubles') continue;
      const rankingCat = rankingCategoryFor(cat);
      if (!rankingCat) continue;

      for (const entry of cat.entries) {
        let changed = false;

        // Player doubles points
        if (entry.doublesPoints == null && entry.playerZpin && entry.playerZpin !== 'PENDING') {
          const doc = await Ranking.findOne({ playerZpin: entry.playerZpin, category: rankingCat, rankingPeriod: rankingYear, isActive: true }).select('totalPoints playerName');
          if (doc) {
            entry.doublesPoints = doc.totalPoints;
            changed = true;
            console.log(`  ${entry.playerName}: doublesPoints=${doc.totalPoints}`);
          }
        }

        // Partner doubles points
        if (entry.partnerDoublesPoints == null && entry.partnerZpin && entry.partnerZpin !== 'PENDING') {
          const doc = await Ranking.findOne({ playerZpin: entry.partnerZpin, category: rankingCat, rankingPeriod: rankingYear, isActive: true }).select('totalPoints playerName');
          if (doc) {
            entry.partnerDoublesPoints = doc.totalPoints;
            changed = true;
            console.log(`  ${entry.partnerName}: partnerDoublesPoints=${doc.totalPoints}`);
          }
        }

        if (changed) { dirty = true; updated++; }
      }
    }

    if (dirty) await tournament.save();
  }

  console.log(`\nDone. ${updated} entries updated.`);
  await mongoose.disconnect();
};

run().catch(err => { console.error(err); process.exit(1); });
