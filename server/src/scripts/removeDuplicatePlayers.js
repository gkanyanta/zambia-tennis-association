import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env') });

async function removeDuplicatePlayers() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB\n');

    // Get all players
    const players = await User.find({ role: 'player' }).sort({ createdAt: 1 });
    console.log(`Found ${players.length} total players\n`);

    const seen = new Map(); // Map of "firstName lastName" to player ID
    const toDelete = [];

    for (const player of players) {
      const key = `${player.firstName} ${player.lastName}`.toLowerCase();

      if (seen.has(key)) {
        // This is a duplicate - mark for deletion
        toDelete.push(player._id);
        console.log(`Duplicate found: ${player.firstName} ${player.lastName} (${player.zpin}) - will delete`);
      } else {
        // First occurrence - keep it
        seen.set(key, player._id);
      }
    }

    console.log(`\nFound ${toDelete.length} duplicates to remove\n`);

    if (toDelete.length > 0) {
      const result = await User.deleteMany({ _id: { $in: toDelete } });
      console.log(`Deleted ${result.deletedCount} duplicate players`);
    } else {
      console.log('No duplicates found');
    }

    // Show final count
    const finalCount = await User.countDocuments({ role: 'player' });
    const juniors = await User.countDocuments({ membershipType: 'junior' });
    const seniors = await User.countDocuments({ membershipType: 'adult' });

    console.log('\n=== Final Player Count ===');
    console.log(`Total Players: ${finalCount}`);
    console.log(`  - Juniors: ${juniors}`);
    console.log(`  - Seniors: ${seniors}`);

    await mongoose.connection.close();
    console.log('\nDatabase connection closed');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

removeDuplicatePlayers();
