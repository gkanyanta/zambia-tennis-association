import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

dotenv.config();

// Configure Cloudinary
try {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    console.warn('Warning: Cloudinary environment variables not fully configured');
    console.warn(`CLOUDINARY_CLOUD_NAME: ${cloudName ? 'set' : 'missing'}`);
    console.warn(`CLOUDINARY_API_KEY: ${apiKey ? 'set' : 'missing'}`);
    console.warn(`CLOUDINARY_API_SECRET: ${apiSecret ? 'set' : 'missing'}`);
  } else {
    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret
    });
    console.log('Cloudinary configured successfully');
  }
} catch (error) {
  console.error('Error configuring Cloudinary:', error.message);
}

export default cloudinary;
