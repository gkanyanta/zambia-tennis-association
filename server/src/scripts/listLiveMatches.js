import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import mongoose from 'mongoose';
import { connectDatabase } from '../config/database.js';
import LiveMatch from '../models/LiveMatch.js';

const run = async () => {
  await connectDatabase();
  const matches = await LiveMatch.find({ status: { $in: ['active', 'suspended', 'live'] } })
    .select('player1 player2 status umpireId umpireName');
  console.log(`${matches.length} active/suspended live match(es):`);
  for (const m of matches) {
    console.log(`  ${m.player1?.name} vs ${m.player2?.name} | status=${m.status} | umpire=${m.umpireName || '(none)'}`);
  }
  await mongoose.disconnect();
};
run().catch(err => { console.error(err); process.exit(1); });
