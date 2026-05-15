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

  const active = await LiveMatch.find({ status: { $in: ['warmup', 'active', 'live', 'suspended'] } });
  console.log(`${active.length} active live match(es):\n`);

  for (const m of active) {
    console.log(`  ${m.player1?.name} vs ${m.player2?.name}`);
    console.log(`    status: ${m.status} | umpire: ${m.umpireName || '(none)'}`);
    console.log(`    matchState: sets=${JSON.stringify(m.matchState?.sets)} currentSet=${m.matchState?.currentSet}`);
  }

  if (active.length === 0) {
    console.log('No active matches to close.');
    await mongoose.disconnect();
    return;
  }

  const readline = (await import('readline')).createInterface({ input: process.stdin, output: process.stdout });
  readline.question('\nClose all of the above? (yes/no): ', async (answer) => {
    readline.close();
    if (answer.trim().toLowerCase() !== 'yes') {
      console.log('Aborted.');
      await mongoose.disconnect();
      return;
    }

    for (const m of active) {
      m.status = 'completed';
      m.completedAt = new Date();
      if (m.matchState) {
        m.matchState.status = 'completed';
        m.markModified('matchState');
      }
      await m.save();
      console.log(`  Closed: ${m.player1?.name} vs ${m.player2?.name}`);
    }

    console.log('\nDone.');
    await mongoose.disconnect();
  });
};

run().catch(err => { console.error(err); process.exit(1); });
