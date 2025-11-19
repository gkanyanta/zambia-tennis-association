import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env') });

async function checkPlayerCount() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB\n');

    const totalPlayers = await User.countDocuments({ role: 'player' });
    const juniors = await User.countDocuments({ membershipType: 'junior' });
    const seniors = await User.countDocuments({ membershipType: 'adult' });

    console.log('=== Player Count Summary ===');
    console.log(`Total Players: ${totalPlayers}`);
    console.log(`  - Juniors: ${juniors}`);
    console.log(`  - Seniors: ${seniors}`);

    // Show ZPIN ranges
    const firstJunior = await User.findOne({ zpin: /^ZTAJ/ }).sort({ zpin: 1 });
    const lastJunior = await User.findOne({ zpin: /^ZTAJ/ }).sort({ zpin: -1 });
    const firstSenior = await User.findOne({ zpin: /^ZTAS/ }).sort({ zpin: 1 });
    const lastSenior = await User.findOne({ zpin: /^ZTAS/ }).sort({ zpin: -1 });

    console.log('\n=== ZPIN Ranges ===');
    if (firstJunior && lastJunior) {
      console.log(`Juniors: ${firstJunior.zpin} to ${lastJunior.zpin}`);
    }
    if (firstSenior && lastSenior) {
      console.log(`Seniors: ${firstSenior.zpin} to ${lastSenior.zpin}`);
    }

    await mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkPlayerCount();
