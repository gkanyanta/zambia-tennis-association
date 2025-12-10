import express from 'express';
import {
  getExecutiveMembers,
  getExecutiveMember,
  createExecutiveMember,
  updateExecutiveMember,
  deleteExecutiveMember,
  reorderExecutiveMembers
} from '../controllers/executiveMemberController.js';
import { protect, authorize } from '../middleware/auth.js';
import { validateExecutiveMember } from '../middleware/aboutValidation.js';

const router = express.Router();

// Public routes
router.get('/', getExecutiveMembers);
router.get('/:id', getExecutiveMember);

// Protected routes (admin/staff)
router.post(
  '/',
  protect,
  authorize('admin', 'staff'),
  validateExecutiveMember,
  createExecutiveMember
);

router.put(
  '/:id',
  protect,
  authorize('admin', 'staff'),
  validateExecutiveMember,
  updateExecutiveMember
);

router.delete(
  '/:id',
  protect,
  authorize('admin'),
  deleteExecutiveMember
);

router.patch(
  '/reorder',
  protect,
  authorize('admin', 'staff'),
  reorderExecutiveMembers
);

export default router;
