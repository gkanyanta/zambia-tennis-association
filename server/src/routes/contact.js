import express from 'express';
import {
  submitContactForm,
  getContactSubmissions,
  updateContactStatus
} from '../controllers/contactController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// Public route for submitting contact form
router.post('/', submitContactForm);

// Admin routes for managing contact submissions
router.get('/', protect, authorize('admin'), getContactSubmissions);
router.put('/:id', protect, authorize('admin'), updateContactStatus);

export default router;
