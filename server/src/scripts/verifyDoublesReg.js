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
  const t = await Tournament.findOne({ name: /zcsa/i }).select('name status categories');
  console.log(`${t.name} — status: ${t.status}`);
  for (const c of t.categories) {
    const isDoubles = c.format === 'doubles' || c.name.toLowerCase().includes('doubles');
    if (isDoubles) console.log(`  ${c.name}: registrationOpen=${c.registrationOpen}`);
  }
  await mongoose.disconnect();
};
run().catch(err => { console.error(err); process.exit(1); });
