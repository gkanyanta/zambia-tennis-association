import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import Club from '../models/Club.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env') });

async function importClubs() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB\n');

    // Get all unique clubs from players
    const clubs = await User.distinct('club', { role: 'player' });
    const validClubs = clubs.filter(club => club && club !== 'N/A');

    console.log(`Found ${validClubs.length} unique clubs to import\n`);

    let imported = 0;
    let skipped = 0;

    for (const clubName of validClubs.sort()) {
      // Check if club already exists
      const existingClub = await Club.findOne({ name: clubName });

      if (existingClub) {
        console.log(`Skipping ${clubName} - already exists`);
        skipped++;
        continue;
      }

      // Get player count for this club
      const memberCount = await User.countDocuments({ club: clubName, role: 'player' });

      // Create club record
      await Club.create({
        name: clubName,
        memberCount: memberCount,
        status: 'active'
      });

      console.log(`Imported ${clubName} - ${memberCount} members`);
      imported++;
    }

    console.log('\n=== Import Complete ===');
    console.log(`Total clubs: ${validClubs.length}`);
    console.log(`Imported: ${imported}`);
    console.log(`Skipped: ${skipped}`);

    await mongoose.connection.close();
    console.log('\nDatabase connection closed');

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

importClubs();
