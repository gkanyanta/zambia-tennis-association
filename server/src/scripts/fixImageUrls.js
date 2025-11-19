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

// Fix image URLs in all collections
const fixImageUrls = async () => {
  try {
    await connectDB();

    // Fix News articles
    const newsResult = await mongoose.connection.db.collection('news').updateMany(
      {
        imageUrl: { $regex: '^http://localhost:5000https://' }
      },
      [
        {
          $set: {
            imageUrl: {
              $replaceOne: {
                input: '$imageUrl',
                find: 'http://localhost:5000',
                replacement: ''
              }
            }
          }
        }
      ]
    );
    console.log(`Fixed ${newsResult.modifiedCount} news articles`);

    // Fix Gallery images
    const galleryResult = await mongoose.connection.db.collection('galleries').updateMany(
      {
        imageUrl: { $regex: '^http://localhost:5000https://' }
      },
      [
        {
          $set: {
            imageUrl: {
              $replaceOne: {
                input: '$imageUrl',
                find: 'http://localhost:5000',
                replacement: ''
              }
            }
          }
        }
      ]
    );
    console.log(`Fixed ${galleryResult.modifiedCount} gallery images`);

    // Fix Hero slider images
    const heroResult = await mongoose.connection.db.collection('heroes').updateMany(
      {
        imageUrl: { $regex: '^http://localhost:5000https://' }
      },
      [
        {
          $set: {
            imageUrl: {
              $replaceOne: {
                input: '$imageUrl',
                find: 'http://localhost:5000',
                replacement: ''
              }
            }
          }
        }
      ]
    );
    console.log(`Fixed ${heroResult.modifiedCount} hero images`);

    console.log('\n✅ All image URLs fixed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error fixing image URLs:', error);
    process.exit(1);
  }
};

fixImageUrls();
