/**
 * Add a feed-in consolation draw to a single-elimination category. Main-draw
 * losers (Round 1, and Round 2 in a 16-draw) are fed in automatically as
 * results are entered. The consolation category awards no ranking points.
 *
 *   node src/scripts/createFeedInConsolation.js <tournamentId> <mainCategoryId> [...] [--dry-run]
 *
 * --dry-run simulates the whole main draw in memory (top player listed wins)
 * and prints how the consolation draw fills, without saving anything.
 * Back up the tournament first (backupTournaments.js).
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
import mongoose from 'mongoose';
import { connectDatabase } from '../config/database.js';
import Tournament from '../models/Tournament.js';
import { buildFeedInConsolationDraw, syncFeedInConsolation } from '../utils/feedInConsolation.js';

const show = p => !p ? 'TBD' : p.isBye ? 'BYE' : p.name;
const printDraw = (cat) => {
  for (const m of cat.draw.qualifyingStage?.matches || []) {
    console.log(`    C1 #${m.matchNumber}: ${show(m.player1)} v ${show(m.player2)} [${m.status}${m.winner ? ' → ' + show(m.player1?.id === m.winner ? m.player1 : m.player2) : ''}]`);
  }
  for (const m of cat.draw.matches) {
    console.log(`    ${m.roundName} #${m.matchNumber}: ${show(m.player1)} v ${show(m.player2)} [${m.status}${m.winner ? ' → ' + show(m.player1?.id === m.winner ? m.player1 : m.player2) : ''}]`);
  }
};

// Same-bracket advancement as updateMatch
function advance(draw, match) {
  const cur = draw.matches.filter(m => m.round === match.round).sort((a, b) => a.matchNumber - b.matchNumber);
  const pos = cur.findIndex(m => m.matchNumber === match.matchNumber);
  const next = draw.matches.filter(m => m.round === match.round + 1).sort((a, b) => a.matchNumber - b.matchNumber)[Math.floor(pos / 2)];
  if (next) next[pos % 2 === 0 ? 'player1' : 'player2'] = match.player1.id === match.winner ? match.player1 : match.player2;
}

const run = async () => {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const [tournamentId, ...categoryIds] = args.filter(a => a !== '--dry-run');
  if (!tournamentId || !categoryIds.length) throw new Error('Usage: createFeedInConsolation.js <tournamentId> <mainCategoryId> ... [--dry-run]');
  await connectDatabase();

  const tournament = await Tournament.findById(tournamentId);
  if (!tournament) throw new Error('Tournament not found');

  for (const id of categoryIds) {
    const main = tournament.categories.id(id);
    if (!main) throw new Error(`Category ${id} not found`);
    if (main.draw?.type !== 'single_elimination') throw new Error(`${main.name} needs a single-elimination draw first`);
    if (tournament.categories.some(c => c.consolationOf?.toString() === id)) throw new Error(`${main.name} already has a consolation draw`);

    tournament.categories.push({
      categoryCode: `${main.categoryCode}-CONS`,
      name: `${main.name} – Consolation`,
      type: main.type,
      gender: main.gender,
      ageGroup: main.ageGroup,
      minAge: main.minAge,
      maxAge: main.maxAge,
      ageCalculationDate: main.ageCalculationDate,
      format: main.format,
      drawType: 'single_elimination',
      maxEntries: 0,
      entryFee: 0,
      registrationOpen: false,
      entries: [],
      consolationOf: main._id,
      draw: buildFeedInConsolationDraw(main.draw)
    });
    const cons = tournament.categories[tournament.categories.length - 1];
    syncFeedInConsolation(tournament, main);
    console.log(`\n${cons.name} (from current main-draw results):`);
    printDraw(cons);

    if (dryRun) {
      // Play out the main draw: player1 wins every match
      for (let r = 1; r <= main.draw.numberOfRounds; r++) {
        for (const m of main.draw.matches.filter(x => x.round === r).sort((a, b) => a.matchNumber - b.matchNumber)) {
          if (m.winner || !m.player1?.id || !m.player2?.id) continue;
          m.winner = m.player1.id; m.status = 'completed';
          advance(main.draw, m);
          syncFeedInConsolation(tournament, main);
        }
      }
      console.log(`\n  Simulated: all main-draw matches won by the top player listed →`);
      printDraw(cons);
    }
  }

  if (dryRun) {
    console.log('\nDry run — nothing saved.');
  } else {
    await tournament.save();
    console.log('\nSaved.');
  }
  await mongoose.disconnect();
};

run().catch(async err => { console.error(err); await mongoose.disconnect(); process.exit(1); });
