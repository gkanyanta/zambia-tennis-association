import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import Club from '../models/Club.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env') });

async function updateClubMemberCounts() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB\n');

    const clubs = await Club.find();
    console.log(`Found ${clubs.length} clubs\n`);

    let updated = 0;

    for (const club of clubs) {
      // Count players for this club
      const memberCount = await User.countDocuments({ club: club.name, role: 'player' });

      if (club.memberCount !== memberCount) {
        club.memberCount = memberCount;
        await club.save();
        console.log(`Updated ${club.name}: ${memberCount} members`);
        updated++;
      } else {
        console.log(`${club.name}: ${memberCount} members (no change)`);
      }
    }

    console.log(`\n=== Update Complete ===`);
    console.log(`Total clubs: ${clubs.length}`);
    console.log(`Updated: ${updated}`);
    console.log(`Unchanged: ${clubs.length - updated}`);

    await mongoose.connection.close();
    console.log('\nDatabase connection closed');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

updateClubMemberCounts();
