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

// Admin routes (must be before /:id to avoid being shadowed)
router.get('/admin/all', protect, authorize('admin', 'staff'), getAdminCalendarEvents);

// Public routes
router.get('/', getCalendarEvents);
router.get('/:id', getCalendarEventById);
router.post('/', protect, authorize('admin', 'staff'), createCalendarEvent);
router.put('/:id', protect, authorize('admin', 'staff'), updateCalendarEvent);
router.delete('/:id', protect, authorize('admin', 'staff'), deleteCalendarEvent);

export default router;
