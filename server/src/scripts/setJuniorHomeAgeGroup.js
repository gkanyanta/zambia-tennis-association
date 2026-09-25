/**
 * Set a junior's home age group for a ranking year. That category's ranking row
 * is flagged primaryAgeGroup: in tournaments from the effective date (default
 * today) they only earn points there and other age groups are walk-ins. Their
 * existing ranking in the former age group stays as it is. The home group starts
 * on whatever the player already has there — opening balances are not moved.
 * Re-run syncTournamentRankings.js for the year's ranking tournaments afterwards.
 *
 *   node src/scripts/setJuniorHomeAgeGroup.js <year> <playerId>=<category> [...] [--from=YYYY-MM-DD]
 *   e.g. node src/scripts/setJuniorHomeAgeGroup.js 2026 691e2e62d583bd2c6c1ced48=boys_14u
 *
 * Run backupRankings.js first.
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
import mongoose from 'mongoose';
import { connectDatabase } from '../config/database.js';
import Ranking from '../models/Ranking.js';
import User from '../models/User.js';

const run = async () => {
  const args = process.argv.slice(2);
  const fromArg = args.find(a => a.startsWith('--from='));
  const from = fromArg ? new Date(fromArg.slice(7)) : new Date(new Date().toISOString().slice(0, 10));
  const [year, ...pairs] = args.filter(a => a !== fromArg);
  if (!year || !pairs.length) throw new Error('Usage: setJuniorHomeAgeGroup.js <year> <playerId>=<category> ... [--from=YYYY-MM-DD]');
  await connectDatabase();

  for (const pair of pairs) {
    const [playerId, category] = pair.split('=');
    const user = await User.findById(playerId);
    if (!user) throw new Error(`Player ${playerId} not found`);
    const prefix = category.split('_')[0];
    const juniorCats = [10, 12, 14, 16, 18].map(a => `${prefix}_${a}u`);
    if (!juniorCats.includes(category)) throw new Error(`${category} is not a junior singles category`);

    const rows = await Ranking.find({
      $or: [{ playerId: user._id }, ...(user.zpin ? [{ playerZpin: user.zpin }] : [])],
      category: { $in: juniorCats }, rankingPeriod: year, isActive: true
    }).sort({ createdAt: 1 });

    for (const row of rows) {
      if (row.category !== category && row.primaryAgeGroup) {
        row.primaryAgeGroup = false;
        row.primaryAgeGroupFrom = undefined;
        await row.save();
      }
    }
    let home = rows.find(r => r.category === category);
    if (!home) {
      home = new Ranking({
        playerId: user._id,
        playerName: `${user.firstName} ${user.lastName}`.toUpperCase(),
        playerZpin: user.zpin,
        category, rank: 9999, totalPoints: 0, rankingPeriod: year,
        tournamentResults: [], isActive: true
      });
    }
    home.primaryAgeGroup = true;
    home.primaryAgeGroupFrom = from;
    await home.save();
    console.log(`${user.firstName} ${user.lastName} (${user.zpin}): home age group ${category} from ${from.toISOString().slice(0, 10)}`);
  }
  await mongoose.disconnect();
};

run().catch(async err => { console.error(err); await mongoose.disconnect(); process.exit(1); });
