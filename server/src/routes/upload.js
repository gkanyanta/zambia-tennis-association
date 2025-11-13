import express from 'express';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { upload } from '../middleware/upload.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// @desc    Upload and resize image
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

    const originalPath = req.file.path;
    const optimizedFilename = `optimized-${req.file.filename}`;
    const optimizedPath = path.join('uploads', optimizedFilename);

    // Resize and optimize the image
    await sharp(originalPath)
      .resize(1200, 800, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({ quality: 85, progressive: true })
      .toFile(optimizedPath);

    // Delete the original unoptimized file
    fs.unlinkSync(originalPath);

    // Get file stats for the optimized image
    const stats = fs.statSync(optimizedPath);

    res.status(200).json({
      success: true,
      data: {
        filename: optimizedFilename,
        path: `/uploads/${optimizedFilename}`,
        size: stats.size
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
