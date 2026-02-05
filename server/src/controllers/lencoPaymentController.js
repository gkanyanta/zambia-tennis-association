import axios from 'axios';
import User from '../models/User.js';
import Club from '../models/Club.js';
import Tournament from '../models/Tournament.js';
import Donation from '../models/Donation.js';
import CoachListing from '../models/CoachListing.js';
import Transaction from '../models/Transaction.js';
import MembershipSubscription from '../models/MembershipSubscription.js';
import PlayerRegistration from '../models/PlayerRegistration.js';
import sendEmail from '../utils/sendEmail.js';
import { generateReceipt } from '../utils/generateReceipt.js';

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

// Helper function to create transaction record and send receipt
const createTransactionAndSendReceipt = async (transactionData) => {
  try {
    // Create transaction record
    const transaction = new Transaction({
      reference: transactionData.reference,
      transactionId: transactionData.transactionId,
      type: transactionData.type,
      amount: transactionData.amount,
      currency: transactionData.currency || 'ZMW',
      payerName: transactionData.payerName,
      payerEmail: transactionData.payerEmail,
      payerPhone: transactionData.payerPhone,
      status: 'completed',
      paymentGateway: 'lenco',
      paymentMethod: transactionData.paymentMethod || 'card',
      relatedId: transactionData.relatedId,
      relatedModel: transactionData.relatedModel,
      metadata: transactionData.metadata || {},
      description: transactionData.description,
      paymentDate: new Date()
    });

    await transaction.save();
    console.log(`Transaction created: ${transaction.receiptNumber}`);

    // Generate PDF receipt
    const pdfBuffer = await generateReceipt(transaction);

    // Send receipt email
    try {
      await sendEmail({
        email: transaction.payerEmail,
        subject: `Payment Receipt - ${transaction.receiptNumber} - ZTA`,
        html: `
          <h2>Payment Receipt</h2>
          <p>Dear ${transaction.payerName},</p>
          <p>Thank you for your payment to the Zambia Tennis Association.</p>
          <p><strong>Receipt Details:</strong></p>
          <ul>
            <li>Receipt Number: ${transaction.receiptNumber}</li>
            <li>Reference: ${transaction.reference}</li>
            <li>Amount: K${parseFloat(transaction.amount).toFixed(2)}</li>
            <li>Date: ${new Date(transaction.paymentDate).toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'long',
              year: 'numeric'
            })}</li>
          </ul>
          <p>Please find your official receipt attached to this email.</p>
          <p>Best regards,<br>Zambia Tennis Association</p>
        `,
        attachments: [{
          filename: `ZTA-Receipt-${transaction.receiptNumber}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf'
        }]
      });

      transaction.receiptSentAt = new Date();
      await transaction.save();
      console.log(`Receipt sent to ${transaction.payerEmail}`);
    } catch (emailError) {
      console.error('Failed to send receipt email:', emailError);
    }

    return transaction;
  } catch (error) {
    console.error('Error creating transaction:', error);
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

    // Handle membership payment (new subscription system or legacy)
    if (referencePrefix === 'MEM') {
      // Check if this is a bulk payment (MEM-BULK-*)
      const isBulkPayment = reference.includes('-BULK-');

      if (isBulkPayment) {
        // Handle bulk payment - find all subscriptions with this reference
        const subscriptions = await MembershipSubscription.find({ paymentReference: reference });

        if (subscriptions.length === 0) {
          return res.status(404).json({
            success: false,
            message: 'No subscriptions found for this reference'
          });
        }

        // Check if already activated
        const allActive = subscriptions.every(s => s.status === 'active');
        if (allActive) {
          return res.status(200).json({
            success: true,
            message: 'Memberships already active',
            data: {
              reference,
              transactionId,
              amount: amountPaid,
              status: 'successful',
              playerCount: subscriptions.length,
              players: subscriptions.map(s => ({
                id: s.entityId,
                name: s.entityName,
                zpin: s.zpin,
                membershipType: s.membershipTypeCode
              }))
            }
          });
        }

        // Activate all subscriptions
        const activatedPlayers = [];
        let totalAmount = 0;

        for (const subscription of subscriptions) {
          if (subscription.status === 'active') continue;

          subscription.status = 'active';
          subscription.transactionId = transactionId;
          subscription.paymentDate = new Date();
          subscription.paymentMethod = 'online';

          // Update player record
          const player = await User.findById(subscription.entityId);
          if (player) {
            if (!player.zpin) {
              const year = new Date().getFullYear().toString().slice(-2);
              const count = await User.countDocuments({ zpin: { $exists: true, $ne: null } });
              player.zpin = `ZP${year}${String(count + 1).padStart(5, '0')}`;
            }
            player.membershipType = subscription.membershipTypeCode;
            player.membershipStatus = 'active';
            player.membershipExpiry = subscription.endDate;
            player.lastPaymentDate = new Date();
            player.lastPaymentAmount = subscription.amount;
            await player.save();
            subscription.zpin = player.zpin;
          }

          await subscription.save();
          activatedPlayers.push({
            playerId: subscription.entityId,
            playerName: subscription.entityName,
            zpin: subscription.zpin,
            membershipType: subscription.membershipTypeName,
            amount: subscription.amount
          });
          totalAmount += subscription.amount;
        }

        // Create transaction record
        const payerInfo = subscriptions[0]?.notes?.match(/payment by ([^(]+)\(([^)]+)\)/i);
        // Try to get payer email from the first player in the batch
        const firstPlayer = subscriptions[0]?.entityId ? await User.findById(subscriptions[0].entityId) : null;
        const transaction = await createTransactionAndSendReceipt({
          reference,
          transactionId,
          type: 'membership',
          amount: totalAmount,
          payerName: payerInfo?.[1]?.trim() || 'Bulk Payer',
          payerEmail: firstPlayer?.email || null,
          description: `Bulk ZPIN Registration - ${activatedPlayers.length} player(s)`,
          metadata: {
            playerCount: activatedPlayers.length,
            players: activatedPlayers.map(p => ({ id: p.playerId, name: p.playerName, zpin: p.zpin }))
          }
        });

        return res.status(200).json({
          success: true,
          message: `Successfully activated ${activatedPlayers.length} membership(s)`,
          data: {
            reference,
            transactionId,
            amount: totalAmount,
            status: 'successful',
            receiptNumber: transaction.receiptNumber,
            playerCount: activatedPlayers.length,
            players: activatedPlayers
          }
        });
      }

      // Single subscription payment
      const subscription = await MembershipSubscription.findOne({ paymentReference: reference })
        .populate('membershipType');

      if (subscription) {
        // New subscription system - activate subscription
        if (subscription.status === 'active') {
          // Already activated (perhaps via webhook)
          return res.status(200).json({
            success: true,
            message: 'Membership already active',
            data: {
              reference,
              transactionId,
              amount: amountPaid,
              status: 'successful',
              receiptNumber: subscription.receiptNumber,
              user: {
                id: subscription.entityId,
                name: subscription.entityName,
                membershipType: subscription.membershipTypeCode,
                membershipStatus: 'active',
                membershipExpiry: subscription.endDate,
                zpin: subscription.zpin
              }
            }
          });
        }

        // Activate the subscription
        subscription.status = 'active';
        subscription.transactionId = transactionId;
        subscription.paymentDate = new Date();

        // Update entity (User for player, Club for club)
        if (subscription.entityType === 'player') {
          const user = await User.findById(subscription.entityId);
          if (user) {
            // Generate ZPIN if not exists
            if (!user.zpin) {
              const year = new Date().getFullYear().toString().slice(-2);
              const count = await User.countDocuments({ zpin: { $exists: true, $ne: null } });
              user.zpin = `ZP${year}${String(count + 1).padStart(5, '0')}`;
            }
            user.membershipType = subscription.membershipTypeCode;
            user.membershipStatus = 'active';
            user.membershipExpiry = subscription.endDate;
            user.lastPaymentDate = new Date();
            user.lastPaymentAmount = amountPaid;
            await user.save();

            subscription.zpin = user.zpin;
          }
        }

        // Create transaction record
        let entityEmail = null;
        if (subscription.entityType === 'player') {
          entityEmail = (await User.findById(subscription.entityId))?.email || null;
        } else if (subscription.entityType === 'club') {
          entityEmail = (await Club.findById(subscription.entityId))?.email || null;
        }

        const transaction = await createTransactionAndSendReceipt({
          reference,
          transactionId,
          type: 'membership',
          amount: amountPaid,
          payerName: subscription.entityName,
          payerEmail: entityEmail,
          relatedId: subscription._id,
          relatedModel: 'MembershipSubscription',
          description: `${subscription.membershipTypeName} - ${subscription.year}`,
          metadata: {
            membershipType: subscription.membershipTypeCode,
            membershipYear: subscription.year,
            entityType: subscription.entityType,
            zpin: subscription.zpin
          }
        });

        subscription.receiptNumber = transaction.receiptNumber;
        await subscription.save();

        return res.status(200).json({
          success: true,
          message: 'Membership payment verified successfully',
          data: {
            reference,
            transactionId,
            amount: amountPaid,
            status: 'successful',
            receiptNumber: transaction.receiptNumber,
            user: {
              id: subscription.entityId,
              name: subscription.entityName,
              membershipType: subscription.membershipTypeCode,
              membershipStatus: 'active',
              membershipExpiry: subscription.endDate,
              zpin: subscription.zpin
            }
          }
        });
      }

      // Legacy membership system (fallback for old references)
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

    // Handle club affiliation payment
    if (referencePrefix === 'CLUB') {
      const subscription = await MembershipSubscription.findOne({ paymentReference: reference })
        .populate('membershipType');

      if (!subscription) {
        return res.status(404).json({
          success: false,
          message: 'Club subscription not found'
        });
      }

      if (subscription.status === 'active') {
        return res.status(200).json({
          success: true,
          message: 'Club affiliation already active',
          data: {
            reference,
            transactionId,
            amount: amountPaid,
            status: 'successful',
            receiptNumber: subscription.receiptNumber,
            club: {
              id: subscription.entityId,
              name: subscription.entityName,
              affiliationType: subscription.membershipTypeCode,
              affiliationStatus: 'active',
              affiliationExpiry: subscription.endDate
            }
          }
        });
      }

      // Activate the subscription
      subscription.status = 'active';
      subscription.transactionId = transactionId;
      subscription.paymentDate = new Date();
      await subscription.save();

      // Create transaction record and send receipt
      const club = await Club.findById(subscription.entityId);
      const transaction = await createTransactionAndSendReceipt({
        reference,
        transactionId,
        type: 'membership',
        amount: amountPaid,
        payerName: subscription.entityName,
        payerEmail: club?.email || null,
        relatedId: subscription._id,
        relatedModel: 'MembershipSubscription',
        description: `Club Affiliation - ${subscription.membershipTypeName} - ${subscription.year}`,
        metadata: {
          membershipType: subscription.membershipTypeCode,
          membershipYear: subscription.year,
          entityType: 'club'
        }
      });

      subscription.receiptNumber = transaction.receiptNumber;
      await subscription.save();

      return res.status(200).json({
        success: true,
        message: 'Club affiliation payment verified successfully',
        data: {
          reference,
          transactionId,
          amount: amountPaid,
          status: 'successful',
          receiptNumber: transaction.receiptNumber,
          club: {
            id: subscription.entityId,
            name: subscription.entityName,
            affiliationType: subscription.membershipTypeCode,
            affiliationStatus: 'active',
            affiliationExpiry: subscription.endDate
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
      donation.paymentMethod = 'card';
      await donation.save();

      // Create transaction record and send receipt
      const transaction = await createTransactionAndSendReceipt({
        reference,
        transactionId,
        type: 'donation',
        amount: amountPaid,
        payerName: donation.donorName,
        payerEmail: donation.donorEmail,
        payerPhone: donation.donorPhone,
        relatedId: donation._id,
        relatedModel: 'Donation',
        description: `Donation - ${donation.donationType?.replace('_', ' ') || 'General'}`,
        metadata: {
          donationType: donation.donationType,
          message: donation.message,
          isAnonymous: donation.isAnonymous
        }
      });

      return res.status(200).json({
        success: true,
        message: 'Donation payment verified successfully',
        data: {
          reference,
          transactionId,
          amount: amountPaid,
          status: 'successful',
          receiptNumber: transaction.receiptNumber,
          donation: {
            id: donation._id,
            receiptNumber: transaction.receiptNumber,
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

    // Handle player registration payment
    if (referencePrefix === 'REG') {
      const registration = await PlayerRegistration.findOne({ paymentReference: reference });

      if (!registration) {
        return res.status(404).json({
          success: false,
          message: 'Registration not found for this payment reference'
        });
      }

      if (registration.status === 'pending_approval' || registration.status === 'approved') {
        return res.status(200).json({
          success: true,
          message: 'Registration payment already processed',
          data: {
            reference,
            transactionId,
            amount: amountPaid,
            status: 'successful',
            registrationRef: registration.referenceNumber
          }
        });
      }

      // Update registration status
      registration.status = 'pending_approval';
      registration.paymentDate = new Date();
      registration.paymentMethod = 'online';
      await registration.save();

      // Create transaction record
      const transaction = await createTransactionAndSendReceipt({
        reference,
        transactionId,
        type: 'registration',
        amount: amountPaid,
        payerName: `${registration.firstName} ${registration.lastName}`,
        payerEmail: registration.email,
        payerPhone: registration.phone,
        relatedId: registration._id,
        relatedModel: 'PlayerRegistration',
        description: `Player Registration - ${registration.membershipTypeName}`,
        metadata: {
          registrationRef: registration.referenceNumber,
          membershipType: registration.membershipTypeCode
        }
      });

      return res.status(200).json({
        success: true,
        message: 'Registration payment verified successfully',
        data: {
          reference,
          transactionId,
          amount: amountPaid,
          status: 'successful',
          receiptNumber: transaction.receiptNumber,
          registrationRef: registration.referenceNumber
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

      if (referencePrefix === 'REG') {
        const registration = await PlayerRegistration.findOne({ paymentReference: reference });

        if (registration && registration.status === 'pending_payment') {
          registration.status = 'pending_approval';
          registration.paymentDate = new Date();
          registration.paymentMethod = 'online';
          await registration.save();

          console.log(`Registration ${registration.referenceNumber} updated via webhook`);
        }
      }

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

// @desc    Download receipt PDF
// @route   GET /api/lenco/receipt/:receiptNumber
// @access  Public
export const downloadReceipt = async (req, res) => {
  try {
    const { receiptNumber } = req.params;

    const transaction = await Transaction.findOne({ receiptNumber });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Receipt not found'
      });
    }

    // Generate PDF
    const pdfBuffer = await generateReceipt(transaction);

    // Set headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="ZTA-Receipt-${receiptNumber}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    res.send(pdfBuffer);
  } catch (error) {
    console.error('Download receipt error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate receipt',
      error: error.message
    });
  }
};

// Helper: sync missing Transaction records from active MembershipSubscriptions
// This handles cases where subscriptions were activated but Transaction creation failed
const syncMissingTransactions = async () => {
  try {
    // Get IDs of subscriptions that already have Transaction records
    const existingRelatedIds = await Transaction.distinct('relatedId', {
      relatedModel: 'MembershipSubscription'
    });

    const existingIdSet = new Set(existingRelatedIds.map(id => id.toString()));

    // Find active subscriptions with payment dates that have no Transaction
    const activeSubscriptions = await MembershipSubscription.find({
      status: 'active',
      paymentDate: { $exists: true, $ne: null }
    });

    const missing = activeSubscriptions.filter(
      sub => !existingIdSet.has(sub._id.toString())
    );

    if (missing.length === 0) return 0;

    let created = 0;
    for (const sub of missing) {
      try {
        // Map subscription paymentMethod to Transaction paymentMethod
        const methodMap = { online: 'card', cash: 'cash', cheque: 'cheque' };
        const txnPaymentMethod = methodMap[sub.paymentMethod] || sub.paymentMethod || 'other';

        await Transaction.create({
          reference: sub.paymentReference || `SYNC-${sub._id}-${Date.now()}`,
          type: 'membership',
          amount: sub.amount,
          currency: sub.currency || 'ZMW',
          payerName: sub.entityName,
          status: 'completed',
          paymentGateway: sub.paymentMethod === 'online' ? 'lenco' : 'manual',
          paymentMethod: txnPaymentMethod,
          relatedId: sub._id,
          relatedModel: 'MembershipSubscription',
          description: `${sub.membershipTypeName} - ${sub.year}${sub.paymentMethod !== 'online' ? ' (Manual)' : ''}`,
          metadata: {
            membershipType: sub.membershipTypeCode,
            membershipYear: sub.year,
            entityType: sub.entityType,
            synced: true
          },
          paymentDate: sub.paymentDate
        });
        created++;
      } catch (err) {
        // Skip duplicates or validation errors
        console.error(`Failed to sync transaction for subscription ${sub._id}:`, err.message);
      }
    }

    if (created > 0) {
      console.log(`Synced ${created} missing transaction records from subscriptions`);
    }
    return created;
  } catch (error) {
    console.error('syncMissingTransactions error:', error);
    return 0;
  }
};

// @desc    Get income statement/summary
// @route   GET /api/lenco/income-statement
// @access  Private (Admin)
export const getIncomeStatement = async (req, res) => {
  try {
    const { startDate, endDate, type } = req.query;

    // Sync any missing transaction records from subscriptions
    await syncMissingTransactions();

    // Build query
    const query = { status: 'completed' };

    if (startDate || endDate) {
      query.paymentDate = {};
      if (startDate) query.paymentDate.$gte = new Date(startDate);
      if (endDate) query.paymentDate.$lte = new Date(endDate);
    }

    if (type) {
      query.type = type;
    }

    // Get summary
    const summary = await Transaction.getIncomeSummary(startDate, endDate);

    // Get transactions
    const transactions = await Transaction.find(query)
      .sort({ paymentDate: -1 })
      .limit(100);

    res.status(200).json({
      success: true,
      data: {
        summary,
        transactions,
        filters: {
          startDate: startDate || null,
          endDate: endDate || null,
          type: type || 'all'
        }
      }
    });
  } catch (error) {
    console.error('Get income statement error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get income statement',
      error: error.message
    });
  }
};

// @desc    Get all transactions
// @route   GET /api/lenco/transactions
// @access  Private (Admin)
export const getTransactions = async (req, res) => {
  try {
    const { page = 1, limit = 20, type, status, startDate, endDate } = req.query;

    // Sync any missing transaction records from subscriptions
    await syncMissingTransactions();

    const query = {};

    if (type) query.type = type;
    if (status) query.status = status;
    if (startDate || endDate) {
      query.paymentDate = {};
      if (startDate) query.paymentDate.$gte = new Date(startDate);
      if (endDate) query.paymentDate.$lte = new Date(endDate);
    }

    const total = await Transaction.countDocuments(query);
    const transactions = await Transaction.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      data: {
        transactions,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get transactions',
      error: error.message
    });
  }
};
