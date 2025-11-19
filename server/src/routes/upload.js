import express from 'express';
import sharp from 'sharp';
import cloudinary from '../config/cloudinary.js';
import { upload } from '../middleware/upload.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// @desc    Upload and resize image to Cloudinary
// @route   POST /api/upload
// @access  Private
router.post('/', protect, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    // Check if Cloudinary is configured
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      console.error('Cloudinary not configured. Missing environment variables.');
      return res.status(500).json({
        success: false,
        message: 'Image upload service not configured. Please contact administrator.'
      });
    }

    // Resize and optimize the image in memory
    let optimizedBuffer;
    try {
      optimizedBuffer = await sharp(req.file.buffer)
        .resize(1200, 800, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .jpeg({ quality: 85, progressive: true })
        .toBuffer();
    } catch (sharpError) {
      console.error('Sharp image processing error:', sharpError);
      return res.status(500).json({
        success: false,
        message: 'Error processing image: ' + sharpError.message
      });
    }

    // Upload to Cloudinary using upload_stream
    const uploadPromise = new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'zta-uploads',
          resource_type: 'image',
          transformation: [
            { width: 1200, height: 800, crop: 'limit' },
            { quality: 'auto:good' }
          ]
        },
        (error, result) => {
          if (error) {
            reject(error);
          } else {
            resolve(result);
          }
        }
      );

      uploadStream.end(optimizedBuffer);
    });

    const uploadResult = await uploadPromise;

    res.status(200).json({
      success: true,
      data: {
        filename: uploadResult.public_id,
        path: uploadResult.secure_url,
        url: uploadResult.secure_url,
        size: uploadResult.bytes
      }
    });
  } catch (error) {
    console.error('Image upload/resize error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

export default router;
