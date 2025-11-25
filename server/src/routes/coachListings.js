import express from 'express';
import {
  getCoachListings,
  getCoachListing,
  getCoachListingsByCoach,
  createCoachListing,
  refundCoachListing,
  getListingSettings,
  updateListingSettings,
  getPricingPlans,
  getRevenueStats
} from '../controllers/coachListingController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.get('/pricing', getPricingPlans);

// Protected routes (admin/staff only)
router.get('/', protect, authorize('admin', 'staff'), getCoachListings);
router.get('/settings', protect, authorize('admin', 'staff'), getListingSettings);
router.put('/settings', protect, authorize('admin', 'staff'), updateListingSettings);
router.get('/stats/revenue', protect, authorize('admin', 'staff'), getRevenueStats);
router.get('/coach/:coachId', protect, authorize('admin', 'staff'), getCoachListingsByCoach);
router.get('/:id', protect, authorize('admin', 'staff'), getCoachListing);
router.post('/', protect, authorize('admin', 'staff'), createCoachListing);
router.put('/:id/refund', protect, authorize('admin', 'staff'), refundCoachListing);

export default router;
