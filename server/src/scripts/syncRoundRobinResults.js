/**
 * Sync round-robin match results from draw.matches into roundRobinGroups[].matches
 *
 * The bug: results were written to draw.matches but the PDF reads from
 * roundRobinGroups[].matches. This script copies winner/score/status from
 * draw.matches to the corresponding group matches by matching player pairs.
 *
 * Safe to run multiple times. Only updates group matches that have no result.
 *
 * Usage: cd server && node src/scripts/syncRoundRobinResults.js
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

async function main() {
  await connectDatabase();
  console.log('Connected to database.\n');

  // Find the Girls Tournament
  const tournaments = await Tournament.find({});

  let totalSynced = 0;

  for (const tournament of tournaments) {
    for (const category of tournament.categories) {
      if (!category.draw || category.draw.type !== 'round_robin') continue;
      if (!category.draw.roundRobinGroups?.length) continue;

      const drawMatches = category.draw.matches || [];
      const resultsMap = new Map();

      // Build a map of results from draw.matches keyed by player pair
      for (const m of drawMatches) {
        if (!m.winner && !m.score) continue;
        if (!m.player1?.id || !m.player2?.id) continue;
        // Key by sorted player IDs so order doesn't matter
        const key = [m.player1.id, m.player2.id].sort().join('|');
        resultsMap.set(key, { winner: m.winner, score: m.score, status: m.status, completedTime: m.completedTime });
      }

      if (resultsMap.size === 0) continue;

      console.log(`\n== ${tournament.name} / ${category.name} ==`);
      console.log(`  Found ${resultsMap.size} results in draw.matches`);

      let categorySynced = 0;

      for (const group of category.draw.roundRobinGroups) {
        for (const gMatch of group.matches) {
          if (gMatch.winner || gMatch.score) continue; // already has result
          if (!gMatch.player1?.id || !gMatch.player2?.id) continue;

          const key = [gMatch.player1.id, gMatch.player2.id].sort().join('|');
          const result = resultsMap.get(key);
          if (!result) continue;

          gMatch.winner = result.winner;
          gMatch.score = result.score;
          gMatch.status = result.status || 'completed';
          gMatch.completedTime = result.completedTime;
          categorySynced++;

          const winnerName = gMatch.player1.id === result.winner ? gMatch.player1.name : gMatch.player2.name;
          console.log(`  Synced: ${gMatch.player1.name} vs ${gMatch.player2.name} → ${result.score} (${winnerName})`);
        }

        // Recompute standings
        const standings = {};
        group.players.forEach(p => {
          standings[p.id] = { playerId: p.id, playerName: p.name, played: 0, won: 0, lost: 0, points: 0 };
        });
        group.matches.forEach(m => {
          if (m.winner && m.player1 && m.player2) {
            if (standings[m.player1.id]) { standings[m.player1.id].played++; }
            if (standings[m.player2.id]) { standings[m.player2.id].played++; }
            if (standings[m.winner]) { standings[m.winner].won++; standings[m.winner].points += 2; }
            const loserId = m.player1.id === m.winner ? m.player2.id : m.player1.id;
            if (standings[loserId]) { standings[loserId].lost++; }
          }
        });
        group.standings = Object.values(standings).sort((a, b) => b.points - a.points || b.won - a.won);

        if (categorySynced > 0) {
          console.log(`  ${group.groupName} standings:`);
          for (const s of group.standings) {
            console.log(`    ${s.playerName}: P=${s.played} W=${s.won} L=${s.lost} Pts=${s.points}`);
          }
        }
      }

      if (categorySynced > 0) {
        await tournament.save();
        console.log(`  Saved! (${categorySynced} matches synced)`);
        totalSynced += categorySynced;
      }
    }
  }

  console.log(`\nDone. Total synced: ${totalSynced}`);
  await mongoose.disconnect();
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
