import express from 'express';
import {
  recordPayment,
  getPayments,
  getPayment,
  getEntityPayments,
  getPaymentStats,
  getExpiringMemberships,
  calculatePaymentAmount,
  calculateTotalAmountDue
} from '../controllers/membershipPaymentController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication and admin/staff authorization
router.use(protect);
router.use(authorize('admin', 'staff'));

// Payment recording and retrieval
router.post('/', recordPayment);
router.get('/', getPayments);
router.get('/stats', getPaymentStats);
router.get('/expiring', getExpiringMemberships);
router.get('/calculate-amount/:entityType/:entityId', calculatePaymentAmount);
router.get('/total-due/:entityType/:entityId', calculateTotalAmountDue);
router.get('/entity/:entityType/:entityId', getEntityPayments);
router.get('/:id', getPayment);

export default router;
