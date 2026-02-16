import express from 'express';
import {
  getMembershipTypes,
  getMembershipType,
  createMembershipType,
  updateMembershipType,
  deleteMembershipType,
  getMySubscription,
  initializeMembershipPayment,
  initializeClubPayment,
  verifyMembershipPayment,
  getSubscriptions,
  getSubscriptionStats,
  recordManualPayment,
  confirmSubscriptionPayment,
  searchPlayersForPayment,
  getPlayerPaymentDetails,
  initializeBulkPayment,
  verifyBulkPayment,
  searchClubsForPayment,
  initializePublicClubPayment
} from '../controllers/membershipController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// ============================================
// MEMBERSHIP TYPES (Configurable pricing)
// ============================================

// Public - get all active membership types
router.get('/types', getMembershipTypes);
router.get('/types/:id', getMembershipType);

// Admin only - manage membership types
router.post('/types', protect, authorize('admin'), createMembershipType);
router.put('/types/:id', protect, authorize('admin'), updateMembershipType);
router.delete('/types/:id', protect, authorize('admin'), deleteMembershipType);

// ============================================
// PUBLIC PLAYER SEARCH & BULK PAYMENT
// ============================================

// Search players for ZPIN payment (public - for parents/sponsors)
router.get('/players/search', searchPlayersForPayment);

// Get player payment details (public)
router.get('/players/:id/payment-details', getPlayerPaymentDetails);

// Initialize bulk ZPIN payment (public - no login required)
router.post('/bulk-payment/initialize', initializeBulkPayment);

// Verify bulk ZPIN payment (public)
router.post('/bulk-payment/verify', verifyBulkPayment);

// ============================================
// PUBLIC CLUB SEARCH & AFFILIATION PAYMENT
// ============================================

// Search clubs for affiliation payment (public)
router.get('/clubs/search', searchClubsForPayment);

// Initialize public club affiliation payment (no login required)
router.post('/club/public-payment/initialize', initializePublicClubPayment);

// ============================================
// AUTHENTICATED PLAYER MEMBERSHIP (ZPIN)
// ============================================

// Get current user's subscription status
router.get('/my-subscription', protect, getMySubscription);

// Initialize player membership payment (logged in user paying for themselves)
router.post('/initialize-payment', protect, initializeMembershipPayment);

// ============================================
// AUTHENTICATED CLUB AFFILIATION
// ============================================

// Initialize club affiliation payment (club admin)
router.post('/club/initialize-payment', protect, initializeClubPayment);

// ============================================
// PAYMENT VERIFICATION
// ============================================

// Verify membership payment (called after Lenco redirect)
router.post('/verify-payment', verifyMembershipPayment);

// ============================================
// ADMIN ROUTES
// ============================================

// Get all subscriptions with filtering
router.get('/subscriptions', protect, authorize('admin'), getSubscriptions);

// Get subscription statistics
router.get('/stats', protect, authorize('admin'), getSubscriptionStats);

// Record manual/offline payment
router.post('/record-payment', protect, authorize('admin'), recordManualPayment);

// Confirm/activate a pending subscription
router.put('/subscriptions/:id/confirm', protect, authorize('admin'), confirmSubscriptionPayment);

export default router;
