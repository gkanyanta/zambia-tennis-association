import express from 'express';
import {
  getBookings,
  getBooking,
  createBooking,
  updateBooking,
  cancelBooking,
  getAvailableSlots
} from '../controllers/bookingController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.get('/', protect, getBookings);
router.get('/:id', protect, getBooking);
router.post('/', protect, createBooking);
router.put('/:id', protect, updateBooking);
router.put('/:id/cancel', protect, cancelBooking);
router.get('/available/:clubName/:courtNumber/:date', getAvailableSlots);

export default router;
