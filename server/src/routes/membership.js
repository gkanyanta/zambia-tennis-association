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
  recordManualPayment
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
// PLAYER MEMBERSHIP (ZPIN)
// ============================================

// Get current user's subscription status
router.get('/my-subscription', protect, getMySubscription);

// Initialize player membership payment
router.post('/initialize-payment', protect, initializeMembershipPayment);

// ============================================
// CLUB AFFILIATION
// ============================================

// Initialize club affiliation payment
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

export default router;
