import express from 'express';
import {
  getAboutContent,
  getContentBySection,
  updateContentSection,
  deleteContentSection
} from '../controllers/aboutContentController.js';
import { protect, authorize } from '../middleware/auth.js';
import { validateAboutContent } from '../middleware/aboutValidation.js';

const router = express.Router();

// Public routes
router.get('/', getAboutContent);
router.get('/:section', getContentBySection);

// Protected routes (admin/staff)
router.put(
  '/:section',
  protect,
  authorize('admin', 'staff'),
  validateAboutContent,
  updateContentSection
);

router.delete(
  '/:section',
  protect,
  authorize('admin'),
  deleteContentSection
);

export default router;
