import express from 'express';
import {
  initializeMembershipPayment,
  initializeTournamentPayment,
  initializeDonation,
  initializeCoachListingPayment,
  verifyPayment,
  handleWebhook
} from '../controllers/lencoPaymentController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// Initialize payments
router.post('/membership/initialize', protect, initializeMembershipPayment);
router.post('/tournament/:tournamentId/initialize', protect, initializeTournamentPayment);
router.post('/donation/initialize', initializeDonation); // Public
router.post('/coach-listing/initialize', protect, initializeCoachListingPayment);

// Verify payment
router.get('/verify/:reference', verifyPayment); // Public, but some types require auth

// Webhook
router.post('/webhook', handleWebhook); // Public - called by Lenco

export default router;
