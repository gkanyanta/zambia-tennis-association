import express from 'express';
import {
  initializeDonation,
  verifyDonation,
  initializeCoachListingPayment,
  verifyCoachListingPayment,
  handleWebhook,
  getDonations,
  getDonationStats
} from '../controllers/flutterwaveController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.post('/donations/initialize', initializeDonation);
router.get('/donations/verify/:transactionId', verifyDonation);

// Protected routes - Admin/Staff
router.post('/coach-listings/initialize', protect, authorize('admin', 'staff'), initializeCoachListingPayment);
router.get('/coach-listings/verify/:transactionId', protect, authorize('admin', 'staff'), verifyCoachListingPayment);
router.get('/donations', protect, authorize('admin', 'staff'), getDonations);
router.get('/donations/stats', protect, authorize('admin', 'staff'), getDonationStats);

// Webhook (no auth - validated by signature)
router.post('/webhook', handleWebhook);

export default router;
