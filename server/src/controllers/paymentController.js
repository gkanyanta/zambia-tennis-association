import Stripe from 'stripe';
import User from '../models/User.js';
import Tournament from '../models/Tournament.js';
import Booking from '../models/Booking.js';
import sendEmail from '../utils/sendEmail.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// @desc    Create payment intent for membership
// @route   POST /api/payments/membership
// @access  Private
export const createMembershipPayment = async (req, res) => {
  try {
    const { membershipType } = req.body;

    // Define membership prices
    const prices = {
      junior: 20000, // K200 in ngwee
      adult: 40000,  // K400 in ngwee
      family: 75000  // K750 in ngwee
    };

    const amount = prices[membershipType];

    if (!amount) {
      return res.status(400).json({
        success: false,
        message: 'Invalid membership type'
      });
    }

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: 'zmw',
      metadata: {
        userId: req.user.id,
        membershipType,
        type: 'membership'
      }
    });

    res.status(200).json({
      success: true,
      data: {
        clientSecret: paymentIntent.client_secret,
        amount
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Confirm membership payment
// @route   POST /api/payments/membership/confirm
// @access  Private
export const confirmMembershipPayment = async (req, res) => {
  try {
    const { paymentIntentId, membershipType } = req.body;

    // Verify payment with Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== 'succeeded') {
      return res.status(400).json({
        success: false,
        message: 'Payment not completed'
      });
    }

    // Update user membership
    const user = await User.findById(req.user.id);
    user.membershipType = membershipType;
    user.membershipStatus = 'active';
    user.membershipExpiry = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year from now
    await user.save();

    // Send confirmation email
    try {
      await sendEmail({
        email: user.email,
        subject: 'Membership Payment Confirmed',
        html: `
          <h1>Payment Successful!</h1>
          <p>Dear ${user.firstName},</p>
          <p>Your membership payment has been confirmed.</p>
          <p><strong>Membership Details:</strong></p>
          <ul>
            <li>Type: ${membershipType.charAt(0).toUpperCase() + membershipType.slice(1)}</li>
            <li>Status: Active</li>
            <li>Expires: ${user.membershipExpiry.toLocaleDateString()}</li>
          </ul>
          <p>Welcome to the ZTA family!</p>
        `
      });
    } catch (emailError) {
      console.error('Email sending failed:', emailError);
    }

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Create payment intent for tournament
// @route   POST /api/payments/tournament/:tournamentId
// @access  Private
export const createTournamentPayment = async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.tournamentId);

    if (!tournament) {
      return res.status(404).json({
        success: false,
        message: 'Tournament not found'
      });
    }

    const amount = tournament.entryFee * 100; // Convert to ngwee

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: 'zmw',
      metadata: {
        userId: req.user.id,
        tournamentId: tournament._id.toString(),
        type: 'tournament'
      }
    });

    res.status(200).json({
      success: true,
      data: {
        clientSecret: paymentIntent.client_secret,
        amount
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Create payment intent for booking
// @route   POST /api/payments/booking/:bookingId
// @access  Private
export const createBookingPayment = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.bookingId);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Make sure user is booking owner
    if (booking.user.toString() !== req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized'
      });
    }

    const amount = booking.amount * 100; // Convert to ngwee

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: 'zmw',
      metadata: {
        userId: req.user.id,
        bookingId: booking._id.toString(),
        type: 'booking'
      }
    });

    res.status(200).json({
      success: true,
      data: {
        clientSecret: paymentIntent.client_secret,
        amount
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Webhook for Stripe events
// @route   POST /api/payments/webhook
// @access  Public
export const stripeWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object;
    const { type, bookingId, tournamentId } = paymentIntent.metadata;

    if (type === 'booking') {
      await Booking.findByIdAndUpdate(bookingId, {
        paymentStatus: 'paid',
        status: 'confirmed',
        paymentId: paymentIntent.id
      });
    } else if (type === 'tournament') {
      const tournament = await Tournament.findById(tournamentId);
      const registration = tournament.registrations.find(
        r => r.user.toString() === paymentIntent.metadata.userId
      );
      if (registration) {
        registration.paymentStatus = 'paid';
        registration.paymentId = paymentIntent.id;
        await tournament.save();
      }
    }
  }

  res.json({ received: true });
};
