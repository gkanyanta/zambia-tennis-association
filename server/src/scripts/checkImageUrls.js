import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Connect to MongoDB
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

// Check image URLs
const checkImageUrls = async () => {
  try {
    await connectDB();

    console.log('Checking image URLs...\n');

    // Check Executive Members
    const executiveMembers = await mongoose.connection.db.collection('executivemembers').find({}).toArray();
    console.log(`=== Executive Members (${executiveMembers.length}) ===`);
    executiveMembers.forEach(member => {
      console.log(`${member.name}: ${member.profileImage}`);
    });

    // Check Affiliations
    const affiliations = await mongoose.connection.db.collection('affiliations').find({}).toArray();
    console.log(`\n=== Affiliations (${affiliations.length}) ===`);
    affiliations.forEach(affiliation => {
      console.log(`${affiliation.name}: ${affiliation.logo}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('Error checking image URLs:', error);
    process.exit(1);
  }
};

checkImageUrls();
