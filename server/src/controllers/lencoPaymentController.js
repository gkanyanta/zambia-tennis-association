import axios from 'axios';
import User from '../models/User.js';
import Tournament from '../models/Tournament.js';
import Donation from '../models/Donation.js';
import CoachListing from '../models/CoachListing.js';
import sendEmail from '../utils/sendEmail.js';

// Lenco API configuration
const LENCO_BASE_URL = process.env.LENCO_BASE_URL || 'https://sandbox.lenco.co/access/v2/';
const LENCO_API_KEY = process.env.LENCO_API_KEY;
const LENCO_PUBLIC_KEY = process.env.LENCO_PUBLIC_KEY;

// Helper function to generate unique reference
const generateReference = (prefix = 'ZTA') => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
};

// Helper function to verify payment with Lenco API
const verifyLencoPayment = async (reference) => {
  try {
    console.log(`Verifying Lenco payment for reference: ${reference}`);

    const response = await axios.get(
      `${LENCO_BASE_URL}collections/status/${reference}`,
      {
        headers: {
          'Authorization': `Bearer ${LENCO_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('Lenco verification response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Lenco verification error:', {
      message: error.message,
      response: error.response?.data
    });
    throw error;
  }
};

// @desc    Initialize membership payment
// @route   POST /api/lenco/membership/initialize
// @access  Private
export const initializeMembershipPayment = async (req, res) => {
  try {
    const { membershipType } = req.body;
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Define membership prices in ZMW (Zambian Kwacha)
    const prices = {
      junior: 200,
      adult: 400,
      family: 750
    };

    const amount = prices[membershipType];

    if (!amount) {
      return res.status(400).json({
        success: false,
        message: 'Invalid membership type. Must be junior, adult, or family'
      });
    }

    // Generate unique reference
    const reference = generateReference('MEM');

    // Return payment initialization data for frontend widget
    res.status(200).json({
      success: true,
      data: {
        reference,
        amount,
        email: user.email,
        publicKey: LENCO_PUBLIC_KEY,
        membershipType,
        currency: 'ZMW'
      }
    });
  } catch (error) {
    console.error('Initialize membership payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to initialize payment',
      error: error.message
    });
  }
};

// @desc    Initialize tournament payment
// @route   POST /api/lenco/tournament/:tournamentId/initialize
// @access  Private
export const initializeTournamentPayment = async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.tournamentId);
    const user = await User.findById(req.user.id);

    if (!tournament) {
      return res.status(404).json({
        success: false,
        message: 'Tournament not found'
      });
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const amount = tournament.entryFee;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid tournament entry fee'
      });
    }

    // Generate unique reference
    const reference = generateReference('TOUR');

    res.status(200).json({
      success: true,
      data: {
        reference,
        amount,
        email: user.email,
        publicKey: LENCO_PUBLIC_KEY,
        tournamentId: tournament._id,
        tournamentName: tournament.name,
        currency: 'ZMW'
      }
    });
  } catch (error) {
    console.error('Initialize tournament payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to initialize tournament payment',
      error: error.message
    });
  }
};

// @desc    Initialize donation
// @route   POST /api/lenco/donation/initialize
// @access  Public
export const initializeDonation = async (req, res) => {
  try {
    const { amount, donorName, donorEmail, donorPhone, donationType, message, isAnonymous } = req.body;

    // Validation
    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid donation amount'
      });
    }

    if (!donorName || !donorEmail) {
      return res.status(400).json({
        success: false,
        message: 'Please provide donor name and email'
      });
    }

    // Generate unique reference
    const reference = generateReference('DON');

    // Create pending donation record
    const donation = await Donation.create({
      donorName,
      donorEmail,
      donorPhone,
      amount,
      currency: 'ZMW',
      donationType: donationType || 'general',
      message,
      isAnonymous: isAnonymous || false,
      paymentGateway: 'lenco',
      lencoReference: reference,
      status: 'pending'
    });

    res.status(200).json({
      success: true,
      data: {
        reference,
        amount,
        email: donorEmail,
        publicKey: LENCO_PUBLIC_KEY,
        donationId: donation._id,
        currency: 'ZMW'
      }
    });
  } catch (error) {
    console.error('Initialize donation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to initialize donation',
      error: error.message
    });
  }
};

// @desc    Initialize coach listing payment
// @route   POST /api/lenco/coach-listing/initialize
// @access  Private
export const initializeCoachListingPayment = async (req, res) => {
  try {
    const { amount, duration, coachId } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid payment amount'
      });
    }

    if (!duration || duration <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid listing duration in months'
      });
    }

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Generate unique reference
    const reference = generateReference('COACH');

    res.status(200).json({
      success: true,
      data: {
        reference,
        amount,
        duration,
        coachId,
        email: user.email,
        publicKey: LENCO_PUBLIC_KEY,
        currency: 'ZMW'
      }
    });
  } catch (error) {
    console.error('Initialize coach listing payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to initialize coach listing payment',
      error: error.message
    });
  }
};

// @desc    Verify payment and update records
// @route   GET /api/lenco/verify/:reference
// @access  Public (authenticated for memberships/tournaments)
export const verifyPayment = async (req, res) => {
  try {
    const { reference } = req.params;

    // Verify payment with Lenco API
    const lencoResponse = await verifyLencoPayment(reference);

    // Check payment status
    if (lencoResponse.status !== 'successful' && lencoResponse.data?.status !== 'successful') {
      return res.status(400).json({
        success: false,
        message: 'Payment not completed',
        data: lencoResponse
      });
    }

    // Extract transaction details
    const transactionId = lencoResponse.data?.transaction_id || lencoResponse.transaction_id;
    const amountPaid = lencoResponse.data?.amount || lencoResponse.amount;

    // Determine payment type based on reference prefix
    const referencePrefix = reference.split('-')[0];

    // Handle membership payment
    if (referencePrefix === 'MEM') {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const user = await User.findById(req.user.id);

      // Update user membership
      const membershipType = reference.includes('junior') ? 'junior' :
                            reference.includes('family') ? 'family' : 'adult';

      user.membershipType = membershipType;
      user.membershipStatus = 'active';
      user.membershipExpiry = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year
      user.lastPaymentDate = new Date();
      user.lastPaymentAmount = amountPaid;
      await user.save();

      // Send confirmation email
      try {
        await sendEmail({
          email: user.email,
          subject: 'Membership Payment Confirmed - ZTA',
          html: `
            <h2>Payment Successful!</h2>
            <p>Dear ${user.firstName},</p>
            <p>Your membership payment has been confirmed.</p>
            <p><strong>Payment Details:</strong></p>
            <ul>
              <li>Reference: ${reference}</li>
              <li>Amount: K${amountPaid}</li>
              <li>Membership Type: ${membershipType.charAt(0).toUpperCase() + membershipType.slice(1)}</li>
              <li>Status: Active</li>
              <li>Expires: ${user.membershipExpiry.toLocaleDateString()}</li>
            </ul>
            <p>Welcome to the ZTA family!</p>
          `
        });
      } catch (emailError) {
        console.error('Email sending failed:', emailError);
      }

      return res.status(200).json({
        success: true,
        message: 'Membership payment verified successfully',
        data: {
          reference,
          transactionId,
          amount: amountPaid,
          status: 'successful',
          user: {
            id: user._id,
            name: `${user.firstName} ${user.lastName}`,
            membershipType: user.membershipType,
            membershipStatus: user.membershipStatus,
            membershipExpiry: user.membershipExpiry
          }
        }
      });
    }

    // Handle tournament payment
    if (referencePrefix === 'TOUR') {
      // Find tournament registration and update
      // Implementation depends on tournament registration structure
      return res.status(200).json({
        success: true,
        message: 'Tournament payment verified successfully',
        data: {
          reference,
          transactionId,
          amount: amountPaid,
          status: 'successful'
        }
      });
    }

    // Handle donation
    if (referencePrefix === 'DON') {
      const donation = await Donation.findOne({ lencoReference: reference });

      if (!donation) {
        return res.status(404).json({
          success: false,
          message: 'Donation record not found'
        });
      }

      // Update donation status
      donation.status = 'completed';
      donation.lencoTransactionId = transactionId;
      donation.paymentDate = new Date();
      donation.paymentMethod = 'card'; // Default, could be extracted from Lenco response
      await donation.save();

      // Send thank you email
      try {
        await sendEmail({
          email: donation.donorEmail,
          subject: 'Thank You for Your Donation - ZTA',
          html: `
            <h2>Thank You for Your Generous Donation!</h2>
            <p>Dear ${donation.donorName},</p>
            <p>We have received your donation of <strong>K${amountPaid}</strong>.</p>
            <p><strong>Receipt Details:</strong></p>
            <ul>
              <li>Receipt Number: ${donation.receiptNumber}</li>
              <li>Reference: ${reference}</li>
              <li>Amount: K${amountPaid}</li>
              <li>Donation Type: ${donation.donationType.replace('_', ' ')}</li>
              <li>Date: ${donation.paymentDate.toLocaleDateString()}</li>
            </ul>
            <p>Your support helps us promote and develop tennis in Zambia.</p>
            <p>Best regards,<br>Zambia Tennis Association</p>
          `
        });
      } catch (emailError) {
        console.error('Email sending failed:', emailError);
      }

      return res.status(200).json({
        success: true,
        message: 'Donation payment verified successfully',
        data: {
          reference,
          transactionId,
          amount: amountPaid,
          status: 'successful',
          donation: {
            id: donation._id,
            receiptNumber: donation.receiptNumber,
            donorName: donation.isAnonymous ? 'Anonymous' : donation.donorName,
            donationType: donation.donationType,
            status: donation.status
          }
        }
      });
    }

    // Handle coach listing payment
    if (referencePrefix === 'COACH') {
      // Implementation for coach listing verification
      return res.status(200).json({
        success: true,
        message: 'Coach listing payment verified successfully',
        data: {
          reference,
          transactionId,
          amount: amountPaid,
          status: 'successful'
        }
      });
    }

    // Unknown payment type
    return res.status(400).json({
      success: false,
      message: 'Unknown payment type'
    });

  } catch (error) {
    console.error('Verify payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify payment',
      error: error.message
    });
  }
};

// @desc    Handle Lenco webhook notifications
// @route   POST /api/lenco/webhook
// @access  Public
export const handleWebhook = async (req, res) => {
  try {
    console.log('Lenco webhook received:', req.body);

    const { event, data } = req.body;

    // Handle successful collection event
    if (event === 'collection.successful') {
      const { reference, transaction_id, amount, status } = data;

      console.log(`Processing webhook for reference: ${reference}`);

      // Determine payment type and update accordingly
      const referencePrefix = reference.split('-')[0];

      if (referencePrefix === 'DON') {
        const donation = await Donation.findOne({ lencoReference: reference });

        if (donation && donation.status === 'pending') {
          donation.status = 'completed';
          donation.lencoTransactionId = transaction_id;
          donation.paymentDate = new Date();
          await donation.save();

          console.log(`Donation ${donation._id} updated via webhook`);
        }
      }

      // Add similar handling for other payment types as needed

      return res.status(200).json({
        success: true,
        message: 'Webhook processed successfully'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Webhook received'
    });

  } catch (error) {
    console.error('Webhook processing error:', error);
    // Always return 200 to Lenco to prevent retries
    res.status(200).json({
      success: false,
      message: 'Webhook processing failed',
      error: error.message
    });
  }
};
