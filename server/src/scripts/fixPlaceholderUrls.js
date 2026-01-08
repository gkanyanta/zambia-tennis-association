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

// Fix corrupted placeholder URLs that are missing the domain
const fixPlaceholderUrls = async () => {
  try {
    await connectDB();

    console.log('Fixing corrupted placeholder URLs...\n');

    // Fix Executive Members
    const executiveMembers = await mongoose.connection.db.collection('executivemembers').find({
      profileImage: { $regex: '^[A-F0-9]{6}\\?text=' }
    }).toArray();

    console.log(`Found ${executiveMembers.length} executive members with corrupted URLs`);

    for (const member of executiveMembers) {
      const fixedUrl = `https://via.placeholder.com/400x400/${member.profileImage}`;
      await mongoose.connection.db.collection('executivemembers').updateOne(
        { _id: member._id },
        { $set: { profileImage: fixedUrl } }
      );
      console.log(`✓ Fixed: ${member.name} - ${fixedUrl}`);
    }

    // Fix Affiliations
    const affiliations = await mongoose.connection.db.collection('affiliations').find({
      logo: { $regex: '^[A-F0-9]{6}\\?text=' }
    }).toArray();

    console.log(`\nFound ${affiliations.length} affiliations with corrupted URLs`);

    for (const affiliation of affiliations) {
      const fixedUrl = `https://via.placeholder.com/300x300/${affiliation.logo}`;
      await mongoose.connection.db.collection('affiliations').updateOne(
        { _id: affiliation._id },
        { $set: { logo: fixedUrl } }
      );
      console.log(`✓ Fixed: ${affiliation.name} - ${fixedUrl}`);
    }

    console.log('\n✅ All placeholder URLs fixed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error fixing placeholder URLs:', error);
    process.exit(1);
  }
};

fixPlaceholderUrls();
