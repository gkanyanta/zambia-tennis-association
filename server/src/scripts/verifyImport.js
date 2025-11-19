import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env') });

async function verifyImport() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB\n');

    // Get total count of players with ZPIN starting with ZTAJ
    const totalJuniors = await User.countDocuments({ zpin: /^ZTAJ/ });
    console.log(`Total junior players imported: ${totalJuniors}\n`);

    // Get first 5 imported players
    console.log('Sample of imported players:');
    console.log('='.repeat(80));

    const samplePlayers = await User.find({ zpin: /^ZTAJ/ })
      .select('firstName lastName email zpin membershipType membershipStatus club')
      .limit(5)
      .lean();

    samplePlayers.forEach((player, index) => {
      console.log(`${index + 1}. ${player.firstName} ${player.lastName}`);
      console.log(`   ZPIN: ${player.zpin}`);
      console.log(`   Email: ${player.email}`);
      console.log(`   Membership: ${player.membershipType} (${player.membershipStatus})`);
      console.log();
    });

    // Show ZPIN range
    const firstPlayer = await User.findOne({ zpin: /^ZTAJ/ }).sort({ zpin: 1 });
    const lastPlayer = await User.findOne({ zpin: /^ZTAJ/ }).sort({ zpin: -1 });

    console.log('ZPIN Range:');
    console.log(`First ZPIN: ${firstPlayer.zpin} (${firstPlayer.firstName} ${firstPlayer.lastName})`);
    console.log(`Last ZPIN: ${lastPlayer.zpin} (${lastPlayer.firstName} ${lastPlayer.lastName})`);
    console.log('\nDefault Password for all players: ZTA@2025');
    console.log('(Players should change this on first login)');

    await mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

verifyImport();
