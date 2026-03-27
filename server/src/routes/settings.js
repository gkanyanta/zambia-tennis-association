import express from 'express';
import {
  getSettings,
  updateSettings,
  getMembershipFees
} from '../controllers/settingsController.js';
import { manualStatusUpdate } from '../jobs/updateMembershipStatus.js';
import { sendExpiryReminders } from '../jobs/membershipReminders.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// Public route for getting membership fees
router.get('/fees', getMembershipFees);

// Protected routes for admin
router.get('/', protect, authorize('admin', 'staff'), getSettings);
router.put('/', protect, authorize('admin'), updateSettings);
router.post('/update-status', protect, authorize('admin', 'staff'), manualStatusUpdate);
router.post('/send-reminders', protect, authorize('admin', 'staff'), async (req, res) => {
  try {
    const result = await sendExpiryReminders();
    res.status(200).json({
      success: true,
      data: result,
      message: `Reminder job complete: ${result.sent} sent, ${result.failed} failed`
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
