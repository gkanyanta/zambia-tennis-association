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
  getTransactions,
  exportTransactionsExcel,
  repairMissingTransactions
} from '../controllers/lencoPaymentController.js';
import { protect, authorize, optionalAuth } from '../middleware/auth.js';

const router = express.Router();

// Initialize payments
router.post('/membership/initialize', protect, initializeMembershipPayment);
router.post('/tournament/:tournamentId/initialize', optionalAuth, initializeTournamentPayment);
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
router.get('/income-statement', protect, authorize('admin', 'staff', 'finance'), getIncomeStatement);
router.get('/transactions/export/excel', protect, authorize('admin', 'staff', 'finance'), exportTransactionsExcel);
router.get('/transactions', protect, authorize('admin', 'staff', 'finance'), getTransactions);

// Temporary repair endpoint - fix missing transactions and receipts
router.post('/repair-transactions', protect, authorize('admin'), repairMissingTransactions);

export default router;
