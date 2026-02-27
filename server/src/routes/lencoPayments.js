import express from 'express';
import {
  initializeMembershipPayment,
  initializeTournamentPayment,
  initializeDonation,
  initializeCoachListingPayment,
  verifyPayment,
  handleWebhook,
  downloadReceipt,
  resendReceipt,
  getIncomeStatement,
  getTransactions
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

// Receipt download (public - anyone with receipt number can download)
router.get('/receipt/:receiptNumber', downloadReceipt);
router.post('/receipt/:receiptNumber/send', protect, authorize('admin', 'staff'), resendReceipt);

// Admin routes for income tracking
router.get('/income-statement', protect, authorize('admin'), getIncomeStatement);
router.get('/transactions', protect, authorize('admin'), getTransactions);

export default router;
