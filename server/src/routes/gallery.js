import express from 'express';
import {
  getGalleryImages,
  getGalleryImage,
  createGalleryImage,
  updateGalleryImage,
  deleteGalleryImage
} from '../controllers/galleryController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router
  .route('/')
  .get(getGalleryImages)
  .post(protect, authorize('admin', 'staff'), createGalleryImage);

router
  .route('/:id')
  .get(getGalleryImage)
  .put(protect, authorize('admin', 'staff'), updateGalleryImage)
  .delete(protect, authorize('admin', 'staff'), deleteGalleryImage);

export default router;
