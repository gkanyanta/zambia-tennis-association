/**
 * Re-sync completed live match results back into the tournament draw.
 *
 * This fixes round-robin (and other) matches where live scoring completed
 * but results were not synced to the draw due to the bug where only
 * draw.matches was searched (not roundRobinGroups[].matches).
 *
 * Usage: cd server && node src/scripts/resyncLiveResults.js
 *
 * This script is safe to run multiple times — it only updates matches
 * that don't already have a winner set in the draw.
 */
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { connectDatabase } from '../config/database.js';
import LiveMatch from '../models/LiveMatch.js';
import Tournament from '../models/Tournament.js';
import { getScoreString } from '../utils/tennisScoring.js';

async function main() {
  await connectDatabase();
  console.log('Connected to database.\n');

  // Find all completed live matches
  const liveMatches = await LiveMatch.find({ status: 'completed' }).sort({ completedAt: -1 });
  console.log(`Found ${liveMatches.length} completed live match(es).\n`);

  // Group by tournament
  const byTournament = {};
  for (const lm of liveMatches) {
    const key = lm.tournamentId.toString();
    if (!byTournament[key]) byTournament[key] = { name: lm.tournamentName, matches: [] };
    byTournament[key].matches.push(lm);
  }

  let totalSynced = 0;
  let totalAlready = 0;

  for (const [tournamentId, { name, matches }] of Object.entries(byTournament)) {
    console.log(`\n== ${name} (${matches.length} completed matches) ==\n`);

    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) {
      console.log('  Tournament not found in DB — skipping.\n');
      continue;
    }

    // Print results table
    console.log('  Category                | Round        | Player 1             | Player 2             | Score          | Winner');
    console.log('  ' + '-'.repeat(120));

    let tournamentModified = false;

    for (const lm of matches) {
      const state = lm.matchState;
      const scoreString = getScoreString(state);
      const winnerIndex = state.winner;
      const winnerName = winnerIndex === 0 ? lm.player1.name : lm.player2.name;
      const winnerId = winnerIndex === 0 ? lm.player1.id : lm.player2.id;

      const p1 = (lm.player1.name || '').padEnd(20).substring(0, 20);
      const p2 = (lm.player2.name || '').padEnd(20).substring(0, 20);
      const cat = (lm.categoryName || '').padEnd(23).substring(0, 23);
      const rnd = (lm.roundName || '').padEnd(12).substring(0, 12);
      const sc = (scoreString || '').padEnd(14).substring(0, 14);

      console.log(`  ${cat} | ${rnd} | ${p1} | ${p2} | ${sc} | ${winnerName}`);

      // Find match in tournament draw
      const category = tournament.categories.id(lm.categoryId);
      if (!category || !category.draw) {
        console.log('    ^ Category/draw not found — cannot sync');
        continue;
      }

      // Search draw.matches and roundRobinGroups
      let match = category.draw.matches.id(lm.matchId);
      let matchGroup = null;

      if (!match && category.draw.roundRobinGroups) {
        for (const group of category.draw.roundRobinGroups) {
          match = group.matches.id(lm.matchId);
          if (match) {
            matchGroup = group;
            break;
          }
        }
      }

      if (!match) {
        console.log('    ^ Match not found in draw — cannot sync');
        continue;
      }

      if (match.winner && match.score) {
        totalAlready++;
        continue;
      }

      // Sync result to draw
      match.winner = winnerId;
      match.score = scoreString;
      match.status = 'completed';
      match.completedTime = lm.completedAt || new Date();
      tournamentModified = true;
      totalSynced++;

      // For single elimination, advance winner
      if (category.draw.type === 'single_elimination') {
        const nextRound = match.round + 1;
        const currentRoundMatches = category.draw.matches
          .filter(m => m.round === match.round)
          .sort((a, b) => a.matchNumber - b.matchNumber);
        const positionInRound = currentRoundMatches.findIndex(
          m => m._id.toString() === match._id.toString()
        );
        const nextMatchIndex = Math.floor(positionInRound / 2);
        const isFirstPlayer = positionInRound % 2 === 0;
        const nextMatches = category.draw.matches
          .filter(m => m.round === nextRound)
          .sort((a, b) => a.matchNumber - b.matchNumber);
        if (nextMatches[nextMatchIndex]) {
          const winnerPlayer = match.player1.id === match.winner ? match.player1 : match.player2;
          if (isFirstPlayer) {
            nextMatches[nextMatchIndex].player1 = winnerPlayer;
          } else {
            nextMatches[nextMatchIndex].player2 = winnerPlayer;
          }
        }
      }

      // Recompute round-robin standings
      if (matchGroup) {
        const standings = {};
        matchGroup.players.forEach(p => {
          standings[p.id] = { playerId: p.id, playerName: p.name, played: 0, won: 0, lost: 0, points: 0 };
        });
        matchGroup.matches.forEach(m => {
          if (m.winner && m.player1 && m.player2) {
            if (standings[m.player1.id]) { standings[m.player1.id].played++; }
            if (standings[m.player2.id]) { standings[m.player2.id].played++; }
            if (standings[m.winner]) { standings[m.winner].won++; standings[m.winner].points += 2; }
            const loserId = m.player1.id === m.winner ? m.player2.id : m.player1.id;
            if (standings[loserId]) { standings[loserId].lost++; }
          }
        });
        matchGroup.standings = Object.values(standings).sort((a, b) => b.points - a.points || b.won - a.won);
      }
    }

    if (tournamentModified) {
      await tournament.save();
      console.log(`\n  Saved ${name} to database.`);
    }
  }

  console.log(`\n\nDone. Synced: ${totalSynced} | Already synced: ${totalAlready}`);
  await mongoose.disconnect();
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
