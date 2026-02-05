import express from 'express';
import rateLimit from 'express-rate-limit';
import cloudinary from '../config/cloudinary.js';
import { documentUpload } from '../middleware/documentUpload.js';

const router = express.Router();

// Rate limit: 10 uploads per 15 minutes per IP
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Too many uploads. Please try again later.' }
});

// @desc    Upload a document (image or PDF) for registration
// @route   POST /api/upload/document
// @access  Public (rate-limited)
router.post('/', uploadLimiter, documentUpload.single('document'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      return res.status(500).json({
        success: false,
        message: 'Upload service not configured. Please contact administrator.'
      });
    }

    const isPdf = req.file.mimetype === 'application/pdf';

    const uploadPromise = new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'zta-registration-documents',
          resource_type: isPdf ? 'raw' : 'image',
          ...(isPdf ? {} : {
            transformation: [
              { width: 1200, height: 1200, crop: 'limit' },
              { quality: 'auto:good' }
            ]
          })
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      uploadStream.end(req.file.buffer);
    });

    const uploadResult = await uploadPromise;

    res.status(200).json({
      success: true,
      data: {
        url: uploadResult.secure_url,
        publicId: uploadResult.public_id,
        originalName: req.file.originalname,
        fileType: isPdf ? 'pdf' : 'image'
      }
    });
  } catch (error) {
    console.error('Document upload error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to upload document'
    });
  }
});

export default router;
