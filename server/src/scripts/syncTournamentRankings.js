/**
 * Re-apply ranking points for a tournament's finalized categories — e.g. when
 * "ranking tournament" was switched on only after results were finalized.
 * Juniors earn points only in the age group they play in this year; other
 * age groups are walk-ins.
 *
 *   node src/scripts/syncTournamentRankings.js <tournamentId>
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
import Tournament from '../models/Tournament.js';
import { syncTournamentRankingPoints } from '../controllers/tournamentController.js';

const run = async () => {
  const id = process.argv[2];
  if (!id) throw new Error('Usage: node src/scripts/syncTournamentRankings.js <tournamentId>');
  await connectDatabase();
  const tournament = await Tournament.findById(id);
  if (!tournament) throw new Error(`Tournament ${id} not found`);
  console.log(`${tournament.name} — ranking tournament: ${tournament.rankingTournament}, grade ${tournament.grade}`);
  const result = await syncTournamentRankingPoints(tournament);
  console.log(`Synced ${result.categories} finalized categories; re-ranked: ${result.rankingCategories.join(', ')}`);
  await mongoose.disconnect();
};

run().catch(async err => { console.error(err); await mongoose.disconnect(); process.exit(1); });
