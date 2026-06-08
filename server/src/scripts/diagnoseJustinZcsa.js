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

const TARGET_ZPIN = 'ZTAS0022';

const run = async () => {
  await connectDatabase();

  // 1. Find the ZCSA tournament(s)
  const tournaments = await Tournament.find({ name: /zcsa/i });
  console.log(`Found ${tournaments.length} ZCSA tournament(s)\n`);

  for (const t of tournaments) {
    console.log(`=== ${t.name} ===`);
    console.log(`  rankingTournament: ${t.rankingTournament}`);
    console.log(`  grade: ${t.grade || '(not set)'}`);
    console.log(`  status: ${t.status}`);
    console.log(`  startDate: ${t.startDate}`);

    if (!t.rankingTournament) {
      console.log('  *** NOT a ranking tournament — no points will be awarded ***');
    }

    for (const cat of t.categories) {
      // Check if Justin is in this category's entries
      const entry = cat.entries?.find(e =>
        e.playerZpin === TARGET_ZPIN ||
        e.partnerZpin === TARGET_ZPIN ||
        e.playerName?.toLowerCase().includes('chabu') ||
        e.partnerName?.toLowerCase().includes('chabu')
      );
      if (!entry) continue;

      console.log(`\n  Category: ${cat.name || cat.type} | format: ${cat.format} | gender: ${cat.gender} | ageGroup: ${cat.ageGroup || 'N/A'}`);
      const rankingCat = rankingCategoryFor(cat);
      console.log(`  rankingCategoryFor → ${rankingCat || '*** NULL — no ranking category mapped ***'}`);

      console.log(`  Entry found:`);
      console.log(`    playerName: ${entry.playerName}`);
      console.log(`    playerZpin: ${entry.playerZpin || '*** MISSING ***'}`);
      console.log(`    partnerName: ${entry.partnerName || 'N/A'}`);
      console.log(`    partnerZpin: ${entry.partnerZpin || 'N/A'}`);
      console.log(`    status: ${entry.status}`);

      // Check draw
      const draw = cat.draw;
      if (!draw) {
        console.log(`  *** No draw created ***`);
        continue;
      }
      console.log(`  Draw type: ${draw.type} | finalized: ${draw.finalized}`);
      if (!draw.finalized) {
        console.log(`  *** Draw NOT finalized — points only awarded on finalize ***`);
      }

      // Find Justin's matches
      const allMatches = [
        ...(draw.matches || []),
        ...(draw.roundRobinGroups || []).flatMap(g => g.matches || []),
        ...(draw.knockoutStage?.matches || [])
      ];

      const justinMatches = allMatches.filter(m =>
        m.player1?.id === entry.playerId?.toString() ||
        m.player2?.id === entry.playerId?.toString()
      );

      console.log(`  Matches involving Justin: ${justinMatches.length}`);
      for (const m of justinMatches) {
        const isP1 = m.player1?.id === entry.playerId?.toString();
        const opponent = isP1 ? m.player2 : m.player1;
        const won = m.winner === entry.playerId?.toString();
        console.log(`    Round ${m.round}: vs ${opponent?.name || 'BYE'} | status: ${m.status} | winner: ${won ? 'JUSTIN' : (m.winner ? opponent?.name : 'none')} | isBye: ${opponent?.isBye}`);
      }
    }
  }

  // 2. Check existing ranking records for Justin
  console.log(`\n=== Ranking records for ${TARGET_ZPIN} ===`);
  const rankings = await Ranking.find({ playerZpin: TARGET_ZPIN });
  if (rankings.length === 0) {
    console.log('  No ranking records found for this ZPIN');
  }
  for (const r of rankings) {
    console.log(`  Category: ${r.category} | Period: ${r.rankingPeriod} | Rank: ${r.rank} | Points: ${r.totalPoints}`);
    for (const tr of r.tournamentResults) {
      console.log(`    - ${tr.tournamentName} | pos: ${tr.position} | pts: ${tr.points} | upsetBonus: ${tr.upsetBonus || 0}`);
    }
  }

  await mongoose.disconnect();
  console.log('\nDone.');
};

run().catch(err => { console.error(err); process.exit(1); });
