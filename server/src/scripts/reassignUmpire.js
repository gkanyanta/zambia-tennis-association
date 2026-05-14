import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import mongoose from 'mongoose';
import { connectDatabase } from '../config/database.js';
import LiveMatch from '../models/LiveMatch.js';
import User from '../models/User.js';

const run = async () => {
  await connectDatabase();

  const match = await LiveMatch.findOne({
    $or: [
      { 'player1.name': /grant.*banda/i },
      { 'player2.name': /grant.*banda/i },
      { 'player1.name': /victor.*nkh?oma/i },
      { 'player2.name': /victor.*nkh?oma/i },
    ]
  });

  if (!match) {
    console.error('Live match not found for Grant Banda / Victor Nkhoma');
    await mongoose.disconnect();
    process.exit(1);
  }

  console.log(`Found: ${match.player1.name} vs ${match.player2.name} | status=${match.status}`);
  console.log(`Current umpire: ${match.umpireName || '(none)'}`);

  const newUmpire = await User.findOne({
    firstName: { $regex: /^moses$/i },
    lastName: { $regex: /ng.andu/i }
  });

  if (!newUmpire) {
    console.error("User Moses Ng'andu not found");
    await mongoose.disconnect();
    process.exit(1);
  }

  console.log(`Assigning: ${newUmpire.firstName} ${newUmpire.lastName}`);
  match.umpireId = newUmpire._id.toString();
  match.umpireName = `${newUmpire.firstName} ${newUmpire.lastName}`;
  await match.save();

  console.log('Done.');
  await mongoose.disconnect();
};

run().catch(err => { console.error(err); process.exit(1); });
