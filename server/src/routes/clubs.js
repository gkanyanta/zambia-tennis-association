import express from 'express';
import {
  getClubs,
  getClub,
  createClub,
  updateClub,
  deleteClub,
  updateMemberCount
} from '../controllers/clubController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.get('/', getClubs);
router.get('/:id', getClub);

// Protected routes (admin only)
router.post('/', protect, authorize('admin', 'staff'), createClub);
router.put('/:id', protect, authorize('admin', 'staff'), updateClub);
router.delete('/:id', protect, authorize('admin', 'staff'), deleteClub);
router.put('/:id/update-count', protect, authorize('admin', 'staff'), updateMemberCount);

export default router;
