import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import mongoose from 'mongoose';
import { connectDatabase } from '../config/database.js';
import Tournament from '../models/Tournament.js';
import LiveMatch from '../models/LiveMatch.js';

const run = async () => {
  await connectDatabase();

  // Check all live matches regardless of status
  const allLive = await LiveMatch.find().select('player1 player2 status umpireId umpireName').limit(20);
  console.log(`All live matches (${allLive.length}):`);
  for (const m of allLive) {
    console.log(`  ${m.player1?.name} vs ${m.player2?.name} | status=${m.status} | umpire=${m.umpireName || '(none)'}`);
  }

  // Search draw
  const t = await Tournament.findOne({ name: /zcsa/i }).select('categories');
  for (const cat of t.categories) {
    const allMatches = [
      ...(cat.draw?.matches || []),
      ...(cat.draw?.roundRobinGroups || []).flatMap(g => g.matches || []),
      ...(cat.draw?.knockoutStage?.matches || [])
    ];
    for (const m of allMatches) {
      const p1 = m.player1?.name || '';
      const p2 = m.player2?.name || '';
      if (/banda|nkoma/i.test(p1) || /banda|nkoma/i.test(p2)) {
        console.log(`\nDraw match found [${cat.name}]: ${p1} vs ${p2} | status=${m.status} | winner=${m.winner || '-'}`);
      }
    }
  }

  await mongoose.disconnect();
};
run().catch(err => { console.error(err); process.exit(1); });
