import Booking from '../models/Booking.js';
import sendEmail from '../utils/sendEmail.js';

// @desc    Get all bookings
// @route   GET /api/bookings
// @access  Private
export const getBookings = async (req, res) => {
  try {
    let query = {};

    // If not admin, only show user's own bookings
    if (req.user.role !== 'admin') {
      query.user = req.user.id;
    }

    const bookings = await Booking.find(query)
      .populate('user', 'firstName lastName email')
      .sort({ date: -1 });

    res.status(200).json({
      success: true,
      count: bookings.length,
      data: bookings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get single booking
// @route   GET /api/bookings/:id
// @access  Private
export const getBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id).populate('user', 'firstName lastName email');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Make sure user is booking owner or admin
    if (booking.user._id.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this booking'
      });
    }

    res.status(200).json({
      success: true,
      data: booking
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Create booking
// @route   POST /api/bookings
// @access  Private
export const createBooking = async (req, res) => {
  try {
    req.body.user = req.user.id;

    // Check for conflicting bookings
    const existingBooking = await Booking.findOne({
      clubName: req.body.clubName,
      courtNumber: req.body.courtNumber,
      date: req.body.date,
      'timeSlot.start': req.body.timeSlot.start,
      status: { $ne: 'cancelled' }
    });

    if (existingBooking) {
      return res.status(400).json({
        success: false,
        message: 'This time slot is already booked'
      });
    }

    const booking = await Booking.create(req.body);

    // Send confirmation email
    try {
      await sendEmail({
        email: req.user.email,
        subject: 'Court Booking Confirmation',
        html: `
          <h1>Booking Confirmed!</h1>
          <p>Dear ${req.user.firstName},</p>
          <p>Your court booking has been confirmed.</p>
          <p><strong>Booking Details:</strong></p>
          <ul>
            <li>Club: ${booking.clubName}</li>
            <li>Court: ${booking.courtNumber}</li>
            <li>Date: ${new Date(booking.date).toLocaleDateString()}</li>
            <li>Time: ${booking.timeSlot.start} - ${booking.timeSlot.end}</li>
            <li>Amount: K${booking.amount}</li>
          </ul>
          <p>Please arrive 10 minutes before your booking time.</p>
        `
      });
    } catch (emailError) {
      console.error('Email sending failed:', emailError);
    }

    res.status(201).json({
      success: true,
      data: booking
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update booking
// @route   PUT /api/bookings/:id
// @access  Private
export const updateBooking = async (req, res) => {
  try {
    let booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Make sure user is booking owner or admin
    if (booking.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to update this booking'
      });
    }

    booking = await Booking.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      data: booking
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Cancel booking
// @route   PUT /api/bookings/:id/cancel
// @access  Private
export const cancelBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Make sure user is booking owner or admin
    if (booking.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to cancel this booking'
      });
    }

    booking.status = 'cancelled';
    await booking.save();

    res.status(200).json({
      success: true,
      data: booking
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get available time slots
// @route   GET /api/bookings/available/:clubName/:courtNumber/:date
// @access  Public
export const getAvailableSlots = async (req, res) => {
  try {
    const { clubName, courtNumber, date } = req.params;

    const bookings = await Booking.find({
      clubName,
      courtNumber,
      date: new Date(date),
      status: { $ne: 'cancelled' }
    });

    // Generate all possible time slots (7 AM to 9 PM, 1-hour slots)
    const allSlots = [];
    for (let hour = 7; hour <= 20; hour++) {
      allSlots.push({
        start: `${hour.toString().padStart(2, '0')}:00`,
        end: `${(hour + 1).toString().padStart(2, '0')}:00`
      });
    }

    // Filter out booked slots
    const availableSlots = allSlots.filter(slot => {
      return !bookings.some(booking => booking.timeSlot.start === slot.start);
    });

    res.status(200).json({
      success: true,
      data: availableSlots
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
