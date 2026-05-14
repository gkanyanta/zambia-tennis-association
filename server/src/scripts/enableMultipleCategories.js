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
  const t = await Tournament.findOne({ name: /zcsa/i }).select('name allowMultipleCategories');
  console.log(`${t.name}: allowMultipleCategories ${t.allowMultipleCategories} → true`);
  t.allowMultipleCategories = true;
  await t.save();
  console.log('Done.');
  await mongoose.disconnect();
};
run().catch(err => { console.error(err); process.exit(1); });
