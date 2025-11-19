import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env') });

async function deleteOldImport() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB\n');

    // Find all players with ZTAJ or ZTAS ZPINs (the imports)
    const playersToDelete = await User.find({
      zpin: { $regex: /^(ZTAJ|ZTAS)/ }
    });
    console.log(`Found ${playersToDelete.length} players to delete`);

    // Delete them
    const result = await User.deleteMany({
      zpin: { $regex: /^(ZTAJ|ZTAS)/ }
    });
    console.log(`Deleted ${result.deletedCount} players\n`);

    await mongoose.connection.close();
    console.log('Database connection closed');

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

deleteOldImport();
