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

  const tournament = await Tournament.findOne({ name: /zcsa/i }).select('name categories');
  if (!tournament) { console.error('ZCSA tournament not found'); process.exit(1); }

  console.log(`Tournament: ${tournament.name}`);

  let opened = 0;
  for (const cat of tournament.categories) {
    if (cat.format === 'doubles' || cat.name.toLowerCase().includes('doubles')) {
      console.log(`  Opening: ${cat.name} (was ${cat.registrationOpen ? 'already open' : 'closed'})`);
      cat.registrationOpen = true;
      opened++;
    }
  }

  if (opened === 0) {
    console.log('No doubles categories found.');
  } else {
    await tournament.save();
    console.log(`\nDone. ${opened} doubles category/categories opened for registration.`);
  }

  await mongoose.disconnect();
};

run().catch(err => { console.error(err); process.exit(1); });
