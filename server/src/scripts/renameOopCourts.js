/**
 * Rename courts in the ZCSA tournament's Order of Play only.
 * Court 2 → Court 8, Court 3 → Court 9.
 * Does NOT touch draw, entries, categories, or any other field.
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import mongoose from 'mongoose';
import { connectDatabase } from '../config/database.js';
import Tournament from '../models/Tournament.js';

const RENAMES = { 'Court 2': 'Court 8', 'Court 3': 'Court 9' };

const run = async () => {
  await connectDatabase();

  const tournament = await Tournament.findOne({ name: /zcsa/i }).select('name orderOfPlay');
  if (!tournament) { console.error('ZCSA tournament not found'); process.exit(1); }

  console.log(`Found: "${tournament.name}"`);

  if (!tournament.orderOfPlay || tournament.orderOfPlay.length === 0) {
    console.log('No Order of Play slots found — nothing to rename.');
    await mongoose.disconnect();
    return;
  }

  let changed = 0;
  for (const slot of tournament.orderOfPlay) {
    const newName = RENAMES[slot.court];
    if (newName) {
      console.log(`  Slot day=${slot.day}: "${slot.court}" → "${newName}"`);
      slot.court = newName;
      changed++;
    }
  }

  if (changed === 0) {
    console.log('No matching court names found — nothing changed.');
  } else {
    tournament.markModified('orderOfPlay');
    await tournament.save();
    console.log(`\nSaved. ${changed} slot(s) renamed.`);
  }

  await mongoose.disconnect();
};

run().catch(err => { console.error(err); process.exit(1); });
