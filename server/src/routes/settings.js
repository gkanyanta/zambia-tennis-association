import express from 'express';
import {
  getSettings,
  updateSettings,
  getMembershipFees
} from '../controllers/settingsController.js';
import { manualStatusUpdate } from '../jobs/updateMembershipStatus.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// Public route for getting membership fees
router.get('/fees', getMembershipFees);

// Protected routes for admin
router.get('/', protect, authorize('admin', 'staff'), getSettings);
router.put('/', protect, authorize('admin'), updateSettings);
router.post('/update-status', protect, authorize('admin', 'staff'), manualStatusUpdate);

export default router;
