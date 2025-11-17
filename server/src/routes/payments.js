import express from 'express';
import {
  createMembershipPayment,
  confirmMembershipPayment,
  createTournamentPayment,
  stripeWebhook
} from '../controllers/paymentController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.post('/membership', protect, createMembershipPayment);
router.post('/membership/confirm', protect, confirmMembershipPayment);
router.post('/tournament/:tournamentId', protect, createTournamentPayment);
router.post('/webhook', express.raw({type: 'application/json'}), stripeWebhook);

export default router;
