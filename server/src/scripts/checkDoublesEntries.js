import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
import mongoose from 'mongoose';
import { connectDatabase } from '../config/database.js';
import Tournament from '../models/Tournament.js';

const run = async () => {
  await connectDatabase();
  const t = await Tournament.findOne({ name: /zcsa/i }).select('name categories');
  console.log(t.name);
  for (const c of t.categories) {
    if (c.format === 'doubles' || c.name.toLowerCase().includes('doubles')) {
      console.log(`\n${c.name}: ${c.entries.length} entries, registrationOpen=${c.registrationOpen}`);
      for (const e of c.entries) {
        console.log(`  ${e.playerName} | status=${e.status} | partner=${e.partnerName || '-'}`);
      }
    }
  }
  await mongoose.disconnect();
};
run().catch(err => { console.error(err); process.exit(1); });
