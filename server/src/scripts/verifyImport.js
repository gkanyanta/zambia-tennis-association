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

    // Get total count of players
    const totalJuniors = await User.countDocuments({ zpin: /^ZTAJ/ });
    const totalSeniors = await User.countDocuments({ zpin: /^ZTAS/ });
    console.log(`Total junior players (ZTAJ): ${totalJuniors}`);
    console.log(`Total senior players (ZTAS): ${totalSeniors}`);
    console.log(`Total players imported: ${totalJuniors + totalSeniors}\n`);

    // Get sample junior players
    console.log('Sample Junior Players (ZTAJ):');
    console.log('='.repeat(80));

    const sampleJuniors = await User.find({ zpin: /^ZTAJ/ })
      .select('firstName lastName email zpin membershipType membershipStatus')
      .limit(3)
      .lean();

    sampleJuniors.forEach((player, index) => {
      console.log(`${index + 1}. ${player.firstName} ${player.lastName}`);
      console.log(`   ZPIN: ${player.zpin}`);
      console.log(`   Email: ${player.email}`);
      console.log(`   Membership: ${player.membershipType} (${player.membershipStatus})`);
      console.log();
    });

    // Get sample senior players
    console.log('Sample Senior Players (ZTAS):');
    console.log('='.repeat(80));

    const sampleSeniors = await User.find({ zpin: /^ZTAS/ })
      .select('firstName lastName email zpin membershipType membershipStatus')
      .limit(3)
      .lean();

    sampleSeniors.forEach((player, index) => {
      console.log(`${index + 1}. ${player.firstName} ${player.lastName}`);
      console.log(`   ZPIN: ${player.zpin}`);
      console.log(`   Email: ${player.email}`);
      console.log(`   Membership: ${player.membershipType} (${player.membershipStatus})`);
      console.log();
    });

    // Show ZPIN ranges
    const firstJunior = await User.findOne({ zpin: /^ZTAJ/ }).sort({ zpin: 1 });
    const lastJunior = await User.findOne({ zpin: /^ZTAJ/ }).sort({ zpin: -1 });
    const firstSenior = await User.findOne({ zpin: /^ZTAS/ }).sort({ zpin: 1 });
    const lastSenior = await User.findOne({ zpin: /^ZTAS/ }).sort({ zpin: -1 });

    console.log('ZPIN Ranges:');
    console.log(`Juniors: ${firstJunior.zpin} to ${lastJunior.zpin}`);
    console.log(`Seniors: ${firstSenior.zpin} to ${lastSenior.zpin}`);
    console.log('\nDefault Password for all players: ZTA@2025');
    console.log('(Players should change this on first login)');

    await mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

verifyImport();
