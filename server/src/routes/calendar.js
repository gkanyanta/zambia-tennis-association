import express from 'express';
import {
  getCalendarEvents,
  getAdminCalendarEvents,
  getCalendarEventById,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent
} from '../controllers/calendarController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.get('/', getCalendarEvents);
router.get('/:id', getCalendarEventById);

// Admin routes
router.get('/admin/all', protect, authorize('admin', 'staff'), getAdminCalendarEvents);
router.post('/', protect, authorize('admin', 'staff'), createCalendarEvent);
router.put('/:id', protect, authorize('admin', 'staff'), updateCalendarEvent);
router.delete('/:id', protect, authorize('admin', 'staff'), deleteCalendarEvent);

export default router;
