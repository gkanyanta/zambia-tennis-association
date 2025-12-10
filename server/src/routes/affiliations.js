import express from 'express';
import {
  getAffiliations,
  getAffiliation,
  createAffiliation,
  updateAffiliation,
  deleteAffiliation,
  reorderAffiliations
} from '../controllers/affiliationController.js';
import { protect, authorize } from '../middleware/auth.js';
import { validateAffiliation } from '../middleware/aboutValidation.js';

const router = express.Router();

// Public routes
router.get('/', getAffiliations);
router.get('/:id', getAffiliation);

// Protected routes (admin/staff)
router.post(
  '/',
  protect,
  authorize('admin', 'staff'),
  validateAffiliation,
  createAffiliation
);

router.put(
  '/:id',
  protect,
  authorize('admin', 'staff'),
  validateAffiliation,
  updateAffiliation
);

router.delete(
  '/:id',
  protect,
  authorize('admin'),
  deleteAffiliation
);

router.patch(
  '/reorder',
  protect,
  authorize('admin', 'staff'),
  reorderAffiliations
);

export default router;
