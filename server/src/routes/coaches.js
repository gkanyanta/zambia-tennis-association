import express from 'express';
import {
  getCoaches,
  getActiveCoaches,
  getCoach,
  createCoach,
  updateCoach,
  deleteCoach,
  verifyClubAssociation,
  updateListingStatus,
  getCoachesExpiringSoon,
  getExpiredCoaches
} from '../controllers/coachController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.get('/active', getActiveCoaches);
router.get('/:id', getCoach);

// Protected routes (admin/staff only)
router.get('/', protect, authorize('admin', 'staff'), getCoaches);
router.post('/', protect, authorize('admin', 'staff'), createCoach);
router.put('/:id', protect, authorize('admin', 'staff'), updateCoach);
router.delete('/:id', protect, authorize('admin', 'staff'), deleteCoach);
router.put('/:id/verify-club', protect, authorize('admin', 'staff'), verifyClubAssociation);
router.put('/:id/listing-status', protect, authorize('admin', 'staff'), updateListingStatus);
router.get('/reports/expiring-soon', protect, authorize('admin', 'staff'), getCoachesExpiringSoon);
router.get('/reports/expired', protect, authorize('admin', 'staff'), getExpiredCoaches);

export default router;
