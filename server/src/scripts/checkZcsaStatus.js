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
  const t = await Tournament.findOne({ name: /zcsa/i }).select('name status entryDeadline startDate endDate allowPublicRegistration allowMultipleCategories');
  console.log('Name:', t.name);
  console.log('Status:', t.status);
  console.log('allowPublicRegistration:', t.allowPublicRegistration);
  console.log('entryDeadline:', t.entryDeadline);
  console.log('Now:', new Date());
  console.log('Deadline passed?', t.entryDeadline ? new Date() > new Date(t.entryDeadline) : 'no deadline set');
  console.log('allowMultipleCategories:', t.allowMultipleCategories);
  await mongoose.disconnect();
};
run().catch(err => { console.error(err); process.exit(1); });
