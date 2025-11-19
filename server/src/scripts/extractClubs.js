import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env') });

async function extractClubs() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB\n');

    // Get all unique clubs
    const clubs = await User.distinct('club', { role: 'player' });

    // Filter out null/empty values
    const validClubs = clubs.filter(club => club && club !== 'N/A');

    console.log(`Found ${validClubs.length} unique clubs:\n`);

    // Get count of players per club
    for (const club of validClubs.sort()) {
      const count = await User.countDocuments({ club, role: 'player' });
      console.log(`${club}: ${count} players`);
    }

    await mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

extractClubs();
