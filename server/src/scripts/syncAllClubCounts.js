import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../../.env') });

// Import models
import Club from '../models/Club.js';
import User from '../models/User.js';

async function syncAllClubCounts() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Get all clubs
    const clubs = await Club.find();
    console.log(`Found ${clubs.length} clubs`);

    let updatedCount = 0;

    // Update each club's member count
    for (const club of clubs) {
      const memberCount = await User.countDocuments({
        club: club.name,
        role: 'player'
      });

      const oldCount = club.memberCount;
      club.memberCount = memberCount;
      await club.save();

      console.log(`${club.name}: ${oldCount} → ${memberCount}`);
      updatedCount++;
    }

    console.log(`\n✅ Successfully updated ${updatedCount} club(s)`);

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

syncAllClubCounts();
