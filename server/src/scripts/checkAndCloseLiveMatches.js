import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
import mongoose from 'mongoose';
import { connectDatabase } from '../config/database.js';
import LiveMatch from '../models/LiveMatch.js';
import Tournament from '../models/Tournament.js';

const run = async () => {
  await connectDatabase();

  // Find ZCSA tournament
  const tournament = await Tournament.findOne({ name: /zcsa/i }).select('_id name');
  console.log(`Tournament: ${tournament.name}`);

  const active = await LiveMatch.find({
    tournamentId: tournament._id,
    status: { $in: ['warmup', 'active', 'live', 'suspended'] }
  });

  console.log(`\n${active.length} active live match(es):\n`);
  for (const m of active) {
    const sets = (m.matchState?.sets || []).map(s => `${s.player1Games}-${s.player2Games}`).join(', ');
    console.log(`  [${m._id}] ${m.player1?.name} vs ${m.player2?.name}`);
    console.log(`    status=${m.status} | sets=[${sets}] | umpire=${m.umpireName || 'none'}`);
  }

  if (active.length === 0) {
    await mongoose.disconnect();
    return;
  }

  // Close all active matches
  for (const m of active) {
    m.status = 'completed';
    m.completedAt = new Date();
    if (m.matchState) {
      m.matchState.status = 'completed';
      m.markModified('matchState');
    }
    await m.save();
    console.log(`\n  ✓ Closed: ${m.player1?.name} vs ${m.player2?.name}`);
  }

  console.log('\nAll active live matches closed.');
  await mongoose.disconnect();
};

run().catch(err => { console.error(err); process.exit(1); });
