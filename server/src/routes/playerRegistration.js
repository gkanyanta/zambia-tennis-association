import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import {
  submitRegistration,
  submitAndPay,
  verifyRegistrationPayment,
  getRegistrationByReference,
  initializePayLaterPayment,
  getRegistrations,
  getRegistration,
  updateRegistration,
  approveRegistration,
  rejectRegistration,
  recordManualPaymentForRegistration
} from '../controllers/playerRegistrationController.js';

const router = express.Router();

// Public routes
router.post('/submit', submitRegistration);
router.post('/submit-and-pay', submitAndPay);
router.post('/verify-payment', verifyRegistrationPayment);
router.get('/lookup/:referenceNumber', getRegistrationByReference);
router.post('/pay-later', initializePayLaterPayment);

// Admin routes
router.get('/', protect, authorize('admin', 'staff'), getRegistrations);
router.get('/:id', protect, authorize('admin', 'staff'), getRegistration);
router.put('/:id', protect, authorize('admin', 'staff'), updateRegistration);
router.post('/:id/approve', protect, authorize('admin'), approveRegistration);
router.post('/:id/reject', protect, authorize('admin'), rejectRegistration);
router.post('/:id/record-payment', protect, authorize('admin', 'staff'), recordManualPaymentForRegistration);

export default router;
