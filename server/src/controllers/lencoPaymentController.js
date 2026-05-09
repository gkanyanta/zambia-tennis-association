import axios from 'axios';
import crypto from 'crypto';
import xlsx from 'xlsx';
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
import { updateTournamentEntryZpinStatus } from '../utils/updateTournamentZpin.js';

// Lenco API configuration
const LENCO_BASE_URL = process.env.LENCO_BASE_URL || 'https://sandbox.lenco.co/access/v2/';
const LENCO_WEBHOOK_SECRET = process.env.LENCO_WEBHOOK_SECRET;
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

// Pull the operator/mobile-money reference and other useful fields out of
// a Lenco webhook payload (or verify-API response). Lenco field naming is
// inconsistent across event types, so check several known shapes; the full
// payload is also saved verbatim under metadata.lenco so we never lose data.
const buildLencoMetadata = (lencoData) => {
  if (!lencoData || typeof lencoData !== 'object') return {};
  const mm = lencoData.mobileMoney || lencoData.mobile_money || {};
  const bank = lencoData.bankPayment || lencoData.bank_payment || {};
  const card = lencoData.card || {};
  const operatorReference =
    lencoData.operatorReference ||
    lencoData.operator_reference ||
    lencoData.mobileMoneyReference ||
    lencoData.mobile_money_reference ||
    lencoData.senderReference ||
    lencoData.sender_reference ||
    mm.reference ||
    mm.operatorReference ||
    mm.providerReference ||
    bank.reference ||
    null;
  const channel =
    lencoData.paymentChannel ||
    lencoData.channel ||
    lencoData.method ||
    (mm && Object.keys(mm).length ? 'mobile-money' : null) ||
    (bank && Object.keys(bank).length ? 'bank' : null) ||
    (card && Object.keys(card).length ? 'card' : null) ||
    null;
  const payerMobile =
    mm.phone || mm.mobileNumber || mm.msisdn ||
    lencoData.customerPhone || lencoData.customer_phone ||
    lencoData.payer?.phone || null;
  const payerProvider = mm.operator || mm.provider || mm.network || null;
  return {
    lenco: lencoData,
    mobileMoneyReference: operatorReference,
    paymentChannel: channel,
    payerMobileNumber: payerMobile,
    payerMobileMoneyOperator: payerProvider,
  };
};

const channelToPaymentMethod = (channel) => {
  if (!channel) return null;
  const c = String(channel).toLowerCase();
  if (c.includes('mobile')) return 'mobile_money';
  if (c.includes('bank')) return 'bank_transfer';
  if (c.includes('card')) return 'card';
  return null;
};

// Helper function to create transaction record and send receipt (idempotent).
// Pass the raw Lenco webhook payload (or verify-API response) as
// `transactionData.lencoData` so the mobile-money provider reference and
// other channel fields get captured automatically.
const createTransactionAndSendReceipt = async (transactionData) => {
  try {
    // Idempotency: check if a Transaction already exists for this reference
    const existing = await Transaction.findOne({ reference: transactionData.reference });
    if (existing) {
      console.log(`Transaction already exists for reference ${transactionData.reference}: ${existing.receiptNumber}`);
      return existing;
    }

    const lencoMeta = buildLencoMetadata(transactionData.lencoData);
    const inferredMethod = channelToPaymentMethod(lencoMeta.paymentChannel);

    // Create transaction record
    const transaction = new Transaction({
      reference: transactionData.reference,
      transactionId: transactionData.transactionId,
      type: transactionData.type,
      amount: transactionData.amount,
      currency: transactionData.currency || 'ZMW',
      payerName: transactionData.payerName,
      payerEmail: transactionData.payerEmail,
      payerPhone: transactionData.payerPhone || lencoMeta.payerMobileNumber,
      status: 'completed',
      paymentGateway: transactionData.paymentGateway || 'lenco',
      paymentMethod: transactionData.paymentMethod || inferredMethod || 'card',
      relatedId: transactionData.relatedId,
      relatedModel: transactionData.relatedModel,
      metadata: { ...(transactionData.metadata || {}), ...lencoMeta },
      description: transactionData.description,
      paymentDate: transactionData.paymentDate || new Date()
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

    const baseFee = tournament.entryFee;

    if (!baseFee || baseFee <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid tournament entry fee'
      });
    }

    // Check ZPIN paid-up status — non-paid-up players pay 1.5x
    const zpinPaidUp = await MembershipSubscription.hasActiveSubscription(user._id, 'player');
    const amount = zpinPaidUp ? baseFee : Math.ceil(baseFee * 1.5);

    // Generate unique reference
    const reference = generateReference('TOUR');

    // Tag the player's pending_payment entries in this tournament with the reference
    // so verifyPayment knows which entries to activate on success.
    const userId = user._id.toString();
    await Tournament.updateMany(
      { _id: tournament._id, 'categories.entries.playerId': userId, 'categories.entries.status': 'pending_payment' },
      { $set: { 'categories.$[].entries.$[e].paymentReference': reference } },
      { arrayFilters: [{ 'e.playerId': userId, 'e.status': 'pending_payment' }] }
    );

    res.status(200).json({
      success: true,
      data: {
        reference,
        amount,
        baseFee,
        zpinPaidUp,
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
      // Senior-eligibility top-up: applies a per-player upgrade against an
      // existing junior subscription rather than activating a new sub.
      if (reference.includes('-TOPUP-')) {
        const pendingTopUps = await MembershipSubscription.find({
          paymentReference: reference,
          membershipTypeCode: 'zpin_junior_senior'
        });
        if (pendingTopUps.length === 0) {
          return res.status(404).json({ success: false, message: 'No top-ups found for this reference' });
        }

        const upgraded = [];
        let totalAmount = 0;
        for (const pending of pendingTopUps) {
          if (pending.status === 'cancelled') continue;
          const juniorSub = pending.previousSubscription
            ? await MembershipSubscription.findById(pending.previousSubscription)
            : null;
          if (juniorSub && juniorSub.membershipTypeCode === 'zpin_junior') {
            juniorSub.membershipType = pending.membershipType;
            juniorSub.membershipTypeName = pending.membershipTypeName;
            juniorSub.membershipTypeCode = pending.membershipTypeCode;
            juniorSub.amount = (juniorSub.amount || 0) + pending.amount;
            juniorSub.notes = (juniorSub.notes || '') + ` | Upgraded to senior-eligible via top-up ${reference} on ${new Date().toISOString().slice(0, 10)}`;
            await juniorSub.save();
            await User.findByIdAndUpdate(juniorSub.entityId, {
              membershipType: 'junior',
              membershipStatus: 'active'
            }, { runValidators: false });
          }
          pending.status = 'cancelled';
          pending.transactionId = transactionId;
          pending.paymentDate = new Date();
          pending.paymentMethod = 'online';
          pending.notes = (pending.notes || '') + ` | Applied to junior sub ${juniorSub?._id || '(missing)'}`;
          await pending.save();
          if (juniorSub) {
            upgraded.push({ id: juniorSub.entityId, name: juniorSub.entityName, zpin: juniorSub.zpin });
            totalAmount += pending.amount;
          }
        }

        let txn = await Transaction.findOne({ reference });
        if (!txn && upgraded.length > 0) {
          const firstPending = pendingTopUps[0];
          try {
            txn = await createTransactionAndSendReceipt({
              reference,
              transactionId,
              lencoData: lencoResponse.data,
              type: 'membership',
              amount: totalAmount,
              payerName: firstPending?.payer?.name || 'Top-Up Payer',
              payerEmail: firstPending?.payer?.email || null,
              relatedId: firstPending?._id,
              relatedModel: 'MembershipSubscription',
              description: `Senior-eligibility top-up - ${upgraded.length} player(s)`,
              metadata: { topUp: true, playerCount: upgraded.length, players: upgraded }
            });
          } catch (txnErr) {
            console.error('verifyPayment: Failed to create top-up transaction:', txnErr);
          }
        }

        return res.status(200).json({
          success: true,
          message: `Senior-eligibility top-up applied for ${upgraded.length} player(s).`,
          data: {
            reference,
            transactionId,
            amount: totalAmount,
            type: 'topup',
            players: upgraded,
            receiptNumber: txn?.receiptNumber || null,
          }
        });
      }

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

        // Check if already activated — return existing data including receipt
        const allActive = subscriptions.every(s => s.status === 'active');
        if (allActive) {
          // Ensure Transaction + receipt exist even if previous run failed after activation
          let existingTxn = await Transaction.findOne({ reference });

          if (!existingTxn) {
            // Transaction was never created (race condition or prior failure) — create it now
            let totalAmount = 0;
            const activatedPlayers = [];
            for (const s of subscriptions) {
              totalAmount += s.amount;
              activatedPlayers.push({ id: s.entityId, name: s.entityName, zpin: s.zpin });
            }
            const firstSub = subscriptions[0];
            try {
              existingTxn = await createTransactionAndSendReceipt({
                reference,
                transactionId,
                lencoData: lencoResponse.data,
                type: 'membership',
                amount: totalAmount,
                payerName: firstSub?.payer?.name || firstSub?.entityName || 'Bulk Payer',
                payerEmail: firstSub?.payer?.email || null,
                relatedId: firstSub?._id,
                relatedModel: 'MembershipSubscription',
                description: `Bulk ZPIN Registration - ${subscriptions.length} player(s)`,
                metadata: {
                  playerCount: subscriptions.length,
                  players: activatedPlayers
                }
              });
            } catch (txnErr) {
              console.error('verifyPayment: Failed to backfill bulk transaction:', txnErr);
            }
          }

          // Backfill receiptNumber on subscriptions that are missing it
          if (existingTxn?.receiptNumber) {
            const subsToUpdate = subscriptions.filter(s => !s.receiptNumber);
            if (subsToUpdate.length > 0) {
              await MembershipSubscription.updateMany(
                { paymentReference: reference, $or: [{ receiptNumber: { $exists: false } }, { receiptNumber: null }, { receiptNumber: '' }] },
                { $set: { receiptNumber: existingTxn.receiptNumber } }
              );
            }
          }

          const receiptNumber = existingTxn?.receiptNumber || subscriptions[0]?.receiptNumber;

          return res.status(200).json({
            success: true,
            message: 'Memberships already active',
            data: {
              reference,
              transactionId,
              amount: amountPaid,
              status: 'successful',
              receiptNumber,
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
            const updates = {
              membershipType: subscription.membershipTypeCode,
              membershipStatus: 'active',
              membershipExpiry: subscription.endDate,
              lastPaymentDate: new Date(),
              lastPaymentAmount: subscription.amount,
            };
            if (!player.zpin) {
              const year = new Date().getFullYear().toString().slice(-2);
              const count = await User.countDocuments({ zpin: { $exists: true, $ne: null } });
              updates.zpin = `ZP${year}${String(count + 1).padStart(5, '0')}`;
            }
            const updatedPlayer = await User.findByIdAndUpdate(player._id, updates, { new: true });
            subscription.zpin = updatedPlayer.zpin;
            await updateTournamentEntryZpinStatus(subscription.entityId);
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

        // Create transaction record (with race condition protection)
        const firstSub = subscriptions[0];
        let transaction;
        try {
          transaction = await createTransactionAndSendReceipt({
            reference,
            transactionId,
            lencoData: lencoResponse.data,
            type: 'membership',
            amount: totalAmount,
            payerName: firstSub?.payer?.name || firstSub?.notes?.match(/payment by ([^(]+)\(/i)?.[1]?.trim() || 'Bulk Payer',
            payerEmail: firstSub?.payer?.email || null,
            relatedId: subscriptions[0]?._id,
            relatedModel: 'MembershipSubscription',
            description: `Bulk ZPIN Registration - ${activatedPlayers.length} player(s)`,
            metadata: {
              playerCount: activatedPlayers.length,
              players: activatedPlayers.map(p => ({ id: p.playerId, name: p.playerName, zpin: p.zpin }))
            }
          });
        } catch (txnErr) {
          console.error('verifyPayment: Bulk transaction creation failed, attempting to find existing:', txnErr.message);
          transaction = await Transaction.findOne({ reference });
        }

        // Write receipt number back to all subscriptions in the bulk
        if (transaction?.receiptNumber) {
          await MembershipSubscription.updateMany(
            { paymentReference: reference },
            { $set: { receiptNumber: transaction.receiptNumber } }
          );
        }

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
          // Already activated (perhaps via webhook) — ensure Transaction + receipt exist
          let existingTxn = await Transaction.findOne({ reference });

          if (!existingTxn) {
            // Transaction was never created — create it now
            let entityEmail = null;
            if (subscription.entityType === 'player') {
              entityEmail = (await User.findById(subscription.entityId))?.email || null;
            } else if (subscription.entityType === 'club') {
              entityEmail = (await Club.findById(subscription.entityId))?.email || null;
            }
            try {
              existingTxn = await createTransactionAndSendReceipt({
                reference,
                transactionId,
                lencoData: lencoResponse.data,
                type: 'membership',
                amount: amountPaid,
                payerName: subscription.payer?.name || subscription.entityName,
                payerEmail: subscription.payer?.email || entityEmail || null,
                relatedId: subscription._id,
                relatedModel: 'MembershipSubscription',
                description: `${subscription.membershipTypeName} - ${subscription.year}`,
                metadata: {
                  membershipType: subscription.membershipTypeCode,
                  membershipYear: subscription.year,
                  entityType: subscription.entityType,
                  playerName: subscription.entityName,
                  zpin: subscription.zpin
                }
              });
            } catch (txnErr) {
              console.error('verifyPayment: Failed to backfill single transaction:', txnErr);
            }
          }

          // Backfill receiptNumber on subscription if missing
          let receiptNumber = subscription.receiptNumber;
          if (!receiptNumber && existingTxn?.receiptNumber) {
            receiptNumber = existingTxn.receiptNumber;
            subscription.receiptNumber = receiptNumber;
            await subscription.save();
          }

          return res.status(200).json({
            success: true,
            message: 'Membership already active',
            data: {
              reference,
              transactionId,
              amount: amountPaid,
              status: 'successful',
              receiptNumber,
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
            const updates = {
              membershipType: subscription.membershipTypeCode,
              membershipStatus: 'active',
              membershipExpiry: subscription.endDate,
              lastPaymentDate: new Date(),
              lastPaymentAmount: amountPaid,
            };
            // Generate ZPIN if not exists
            if (!user.zpin) {
              const year = new Date().getFullYear().toString().slice(-2);
              const count = await User.countDocuments({ zpin: { $exists: true, $ne: null } });
              updates.zpin = `ZP${year}${String(count + 1).padStart(5, '0')}`;
            }
            const updatedUser = await User.findByIdAndUpdate(user._id, updates, { new: true });

            subscription.zpin = updatedUser.zpin;
            await updateTournamentEntryZpinStatus(subscription.entityId);
          }
        }

        // Save subscription activation before attempting Transaction creation
        // so that even if Transaction creation fails (e.g. race condition with webhook),
        // the subscription is still active
        await subscription.save();

        // Create transaction record
        let entityEmail = null;
        if (subscription.entityType === 'player') {
          entityEmail = (await User.findById(subscription.entityId))?.email || null;
        } else if (subscription.entityType === 'club') {
          entityEmail = (await Club.findById(subscription.entityId))?.email || null;
        }

        let transaction;
        try {
          transaction = await createTransactionAndSendReceipt({
            reference,
            transactionId,
            lencoData: lencoResponse.data,
            type: 'membership',
            amount: amountPaid,
            payerName: subscription.payer?.name || subscription.entityName,
            payerEmail: subscription.payer?.email || entityEmail || null,
            relatedId: subscription._id,
            relatedModel: 'MembershipSubscription',
            description: `${subscription.membershipTypeName} - ${subscription.year}`,
            metadata: {
              membershipType: subscription.membershipTypeCode,
              membershipYear: subscription.year,
              entityType: subscription.entityType,
              playerName: subscription.entityName,
              zpin: subscription.zpin
            }
          });
        } catch (txnErr) {
          console.error('verifyPayment: Transaction creation failed, attempting to find existing:', txnErr.message);
          // Race condition: webhook may have created the Transaction — try to find it
          transaction = await Transaction.findOne({ reference });
        }

        if (transaction?.receiptNumber) {
          subscription.receiptNumber = transaction.receiptNumber;
          await subscription.save();
        }

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

      await User.findByIdAndUpdate(user._id, {
        membershipType,
        membershipStatus: 'active',
        membershipExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
        lastPaymentDate: new Date(),
        lastPaymentAmount: amountPaid,
      });

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
        // Ensure receipt exists
        let receiptNumber = subscription.receiptNumber;
        if (!receiptNumber) {
          const existingTxn = await Transaction.findOne({ reference });
          if (existingTxn) {
            receiptNumber = existingTxn.receiptNumber;
            subscription.receiptNumber = receiptNumber;
            await subscription.save();
          }
        }

        return res.status(200).json({
          success: true,
          message: 'Club affiliation already active',
          data: {
            reference,
            transactionId,
            amount: amountPaid,
            status: 'successful',
            receiptNumber,
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
        lencoData: lencoResponse.data,
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
      const tournament = await Tournament.findOne({ 'categories.entries.paymentReference': reference });

      if (!tournament) {
        return res.status(404).json({ success: false, message: 'Tournament payment reference not found' });
      }

      // Idempotency: check if already processed
      const existingTxn = await Transaction.findOne({ reference });
      if (existingTxn) {
        return res.status(200).json({
          success: true,
          message: 'Tournament payment already processed',
          data: { reference, transactionId, amount: amountPaid, status: 'successful', receiptNumber: existingTxn.receiptNumber }
        });
      }

      let totalAmount = 0;
      let payerName = null;
      let payerEmail = null;
      const updatedEntries = [];

      for (const category of tournament.categories) {
        for (const entry of category.entries) {
          if (entry.paymentReference === reference && entry.status === 'pending_payment') {
            entry.status = 'pending';
            entry.paymentStatus = 'paid';
            entry.paymentDate = new Date();
            entry.paymentMethod = 'online';
            const fee = entry.entryFee || tournament.entryFee || 0;
            totalAmount += fee;
            if (!payerName) {
              payerName = entry.payer?.name || entry.playerName;
              payerEmail = entry.payer?.email;
            }
            updatedEntries.push({ playerName: entry.playerName, category: category.name });
          }
        }
      }
      await tournament.save();

      const transaction = await createTransactionAndSendReceipt({
        reference,
        transactionId,
        lencoData: lencoResponse.data,
        type: 'tournament',
        amount: totalAmount || amountPaid,
        payerName: payerName || 'Tournament Entrant',
        payerEmail,
        relatedId: tournament._id,
        relatedModel: 'Tournament',
        description: `Tournament Entry Fee - ${tournament.name}`,
        metadata: { tournamentName: tournament.name, entries: updatedEntries }
      });

      return res.status(200).json({
        success: true,
        message: 'Tournament payment verified successfully',
        data: {
          reference,
          transactionId,
          amount: totalAmount || amountPaid,
          status: 'successful',
          receiptNumber: transaction.receiptNumber,
          tournamentName: tournament.name,
          entries: updatedEntries
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
        lencoData: lencoResponse.data,
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
        lencoData: lencoResponse.data,
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

// Helper: verify Lenco webhook signature
const verifyWebhookSignature = (req) => {
  if (!LENCO_WEBHOOK_SECRET) {
    console.warn('LENCO_WEBHOOK_SECRET not set — skipping webhook signature verification');
    return true;
  }
  const signature = req.headers['x-lenco-signature'] || req.headers['x-webhook-signature'];
  if (!signature) {
    console.warn('No webhook signature header found');
    return false;
  }
  const hash = crypto
    .createHmac('sha512', LENCO_WEBHOOK_SECRET)
    .update(JSON.stringify(req.body))
    .digest('hex');
  return hash === signature;
};

// @desc    Handle Lenco webhook notifications
// @route   POST /api/lenco/webhook
// @access  Public
export const handleWebhook = async (req, res) => {
  try {
    console.log('Lenco webhook received:', JSON.stringify(req.body));

    // Verify webhook signature if secret is configured
    if (LENCO_WEBHOOK_SECRET && !verifyWebhookSignature(req)) {
      console.error('Webhook signature verification failed');
      return res.status(401).json({ success: false, message: 'Invalid signature' });
    }

    const { event, data } = req.body;

    // Handle successful collection event
    if (event === 'collection.successful') {
      const { reference, transaction_id, amount, status } = data;

      console.log(`Processing webhook for reference: ${reference}`);

      // Determine payment type and update accordingly
      const referencePrefix = reference.split('-')[0];

      if (referencePrefix === 'MEM') {
        const isBulkPayment = reference.includes('-BULK-');
        const isTopUp = reference.includes('-TOPUP-');

        if (isTopUp) {
          // Senior-eligibility top-up: each pending sub linked to an
          // existing junior sub via `previousSubscription`. We upgrade the
          // junior in place and discard the pending sub once applied.
          const pendingTopUps = await MembershipSubscription.find({
            paymentReference: reference,
            membershipTypeCode: 'zpin_junior_senior'
          });

          if (!pendingTopUps.length) {
            console.log(`Webhook: No pending top-ups found for reference ${reference}`);
          } else {
            const upgraded = [];
            let totalAmount = 0;
            for (const pending of pendingTopUps) {
              if (pending.status !== 'pending') continue;
              const juniorSub = pending.previousSubscription
                ? await MembershipSubscription.findById(pending.previousSubscription)
                : null;
              if (!juniorSub || juniorSub.membershipTypeCode !== 'zpin_junior') {
                console.warn(`Webhook: previousSubscription missing or not junior for top-up ${pending._id}`);
                pending.status = 'cancelled';
                pending.notes = (pending.notes || '') + ` | Top-up could not be applied: junior subscription not found`;
                await pending.save();
                continue;
              }
              // Upgrade the existing junior sub in place
              juniorSub.membershipType = pending.membershipType;
              juniorSub.membershipTypeName = pending.membershipTypeName;
              juniorSub.membershipTypeCode = pending.membershipTypeCode;
              juniorSub.amount = (juniorSub.amount || 0) + pending.amount;
              juniorSub.notes = (juniorSub.notes || '') + ` | Upgraded to senior-eligible via top-up ${reference} on ${new Date().toISOString().slice(0, 10)}`;
              await juniorSub.save();

              // Sync the player User record
              await User.findByIdAndUpdate(
                juniorSub.entityId,
                { membershipType: 'junior', membershipStatus: 'active' },
                { runValidators: false }
              );

              // Mark the pending top-up as applied (cancelled = consumed)
              pending.status = 'cancelled';
              pending.transactionId = transaction_id;
              pending.paymentDate = new Date();
              pending.paymentMethod = 'online';
              pending.notes = (pending.notes || '') + ` | Applied to junior sub ${juniorSub._id}`;
              await pending.save();

              upgraded.push({
                id: juniorSub.entityId,
                name: juniorSub.entityName,
                zpin: juniorSub.zpin,
              });
              totalAmount += pending.amount;
            }

            if (upgraded.length > 0) {
              const firstPending = pendingTopUps[0];
              try {
                await createTransactionAndSendReceipt({
                  reference,
                  transactionId: transaction_id,
                  lencoData: data,
                  type: 'membership',
                  amount: totalAmount,
                  payerName: firstPending?.payer?.name || 'Top-Up Payer',
                  payerEmail: firstPending?.payer?.email || null,
                  relatedId: firstPending?._id,
                  relatedModel: 'MembershipSubscription',
                  description: `Senior-eligibility top-up - ${upgraded.length} player(s)`,
                  metadata: {
                    topUp: true,
                    playerCount: upgraded.length,
                    players: upgraded
                  }
                });
              } catch (txnErr) {
                console.error('Webhook: Failed to create top-up transaction:', txnErr);
              }
            }
            console.log(`Webhook: Applied ${upgraded.length} top-up(s) for ${reference}`);
          }
        } else if (isBulkPayment) {
          // Bulk membership payment
          const subscriptions = await MembershipSubscription.find({ paymentReference: reference });

          if (!subscriptions.length) {
            console.log(`Webhook: No subscriptions found for bulk reference ${reference}`);
          } else if (subscriptions.every(s => s.status === 'active')) {
            console.log(`Webhook: Bulk subscriptions already active for ${reference}`);
            // Ensure Transaction exists (may have been lost in a race condition)
            let existingTxn = await Transaction.findOne({ reference });
            if (!existingTxn) {
              let totalAmount = 0;
              const activatedPlayers = [];
              for (const s of subscriptions) {
                totalAmount += s.amount;
                activatedPlayers.push({ id: s.entityId, name: s.entityName, zpin: s.zpin });
              }
              const firstSub = subscriptions[0];
              try {
                existingTxn = await createTransactionAndSendReceipt({
                  reference,
                  transactionId: transaction_id,
                  lencoData: data,
                  type: 'membership',
                  amount: totalAmount,
                  payerName: firstSub?.payer?.name || firstSub?.entityName || 'Bulk Payer',
                  payerEmail: firstSub?.payer?.email || null,
                  relatedId: firstSub?._id,
                  relatedModel: 'MembershipSubscription',
                  description: `Bulk ZPIN Registration - ${subscriptions.length} player(s)`,
                  metadata: {
                    playerCount: subscriptions.length,
                    players: activatedPlayers
                  }
                });
              } catch (txnErr) {
                console.error('Webhook: Failed to backfill bulk transaction:', txnErr);
              }
            }
            // Backfill receipt if missing
            if (existingTxn?.receiptNumber) {
              await MembershipSubscription.updateMany(
                { paymentReference: reference, $or: [{ receiptNumber: { $exists: false } }, { receiptNumber: null }, { receiptNumber: '' }] },
                { $set: { receiptNumber: existingTxn.receiptNumber } }
              );
            }
          } else {
            const activatedPlayers = [];
            let totalAmount = 0;

            for (const subscription of subscriptions) {
              if (subscription.status === 'active') continue;

              subscription.status = 'active';
              subscription.transactionId = transaction_id;
              subscription.paymentDate = new Date();
              subscription.paymentMethod = 'online';

              // Update player record
              const player = await User.findById(subscription.entityId);
              if (player) {
                const updates = {
                  membershipType: subscription.membershipTypeCode,
                  membershipStatus: 'active',
                  membershipExpiry: subscription.endDate,
                  lastPaymentDate: new Date(),
                  lastPaymentAmount: subscription.amount,
                };
                if (!player.zpin) {
                  const year = new Date().getFullYear().toString().slice(-2);
                  const count = await User.countDocuments({ zpin: { $exists: true, $ne: null } });
                  updates.zpin = `ZP${year}${String(count + 1).padStart(5, '0')}`;
                }
                const updatedPlayer = await User.findByIdAndUpdate(player._id, updates, { new: true });
                subscription.zpin = updatedPlayer.zpin;
                await updateTournamentEntryZpinStatus(subscription.entityId);
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

            // Create transaction record and send receipt
            if (activatedPlayers.length > 0) {
              const firstSub = subscriptions[0];
              try {
                const txnRecord = await createTransactionAndSendReceipt({
                  reference,
                  transactionId: transaction_id,
                  lencoData: data,
                  type: 'membership',
                  amount: totalAmount,
                  payerName: firstSub?.payer?.name || 'Bulk Payer',
                  payerEmail: firstSub?.payer?.email || null,
                  relatedId: subscriptions[0]?._id,
                  relatedModel: 'MembershipSubscription',
                  description: `Bulk ZPIN Registration - ${activatedPlayers.length} player(s)`,
                  metadata: {
                    playerCount: activatedPlayers.length,
                    players: activatedPlayers.map(p => ({ id: p.playerId, name: p.playerName, zpin: p.zpin }))
                  }
                });

                // Write receipt number back to all subscriptions in the bulk
                if (txnRecord?.receiptNumber) {
                  await MembershipSubscription.updateMany(
                    { paymentReference: reference },
                    { $set: { receiptNumber: txnRecord.receiptNumber } }
                  );
                }
              } catch (txnError) {
                console.error('Webhook: Failed to create bulk transaction record:', txnError);
              }
            }

            console.log(`Webhook: Activated ${activatedPlayers.length} bulk membership(s) for ${reference}`);
          }
        } else {
          // Single membership payment
          const subscription = await MembershipSubscription.findOne({ paymentReference: reference })
            .populate('membershipType');

          if (!subscription) {
            console.log(`Webhook: No subscription found for reference ${reference}`);
          } else if (subscription.status === 'active') {
            console.log(`Webhook: Subscription already active for ${reference}`);
            // Ensure Transaction exists (may have been lost in a race condition)
            let existingTxn = await Transaction.findOne({ reference });
            if (!existingTxn) {
              let entityEmail = null;
              if (subscription.entityType === 'player') {
                entityEmail = (await User.findById(subscription.entityId))?.email || null;
              } else if (subscription.entityType === 'club') {
                entityEmail = (await Club.findById(subscription.entityId))?.email || null;
              }
              try {
                existingTxn = await createTransactionAndSendReceipt({
                  reference,
                  transactionId: transaction_id,
                  lencoData: data,
                  type: 'membership',
                  amount,
                  payerName: subscription.payer?.name || subscription.entityName,
                  payerEmail: subscription.payer?.email || entityEmail || null,
                  relatedId: subscription._id,
                  relatedModel: 'MembershipSubscription',
                  description: `${subscription.membershipTypeName} - ${subscription.year}`,
                  metadata: {
                    membershipType: subscription.membershipTypeCode,
                    membershipYear: subscription.year,
                    entityType: subscription.entityType,
                    playerName: subscription.entityName,
                    zpin: subscription.zpin
                  }
                });
              } catch (txnErr) {
                console.error('Webhook: Failed to backfill single transaction:', txnErr);
              }
            }
            // Backfill receiptNumber if missing
            if (!subscription.receiptNumber && existingTxn?.receiptNumber) {
              subscription.receiptNumber = existingTxn.receiptNumber;
              await subscription.save();
            }
          } else {
            // Activate the subscription
            subscription.status = 'active';
            subscription.transactionId = transaction_id;
            subscription.paymentDate = new Date();

            // Update entity (User for player, Club for club)
            if (subscription.entityType === 'player') {
              const user = await User.findById(subscription.entityId);
              if (user) {
                const updates = {
                  membershipType: subscription.membershipTypeCode,
                  membershipStatus: 'active',
                  membershipExpiry: subscription.endDate,
                  lastPaymentDate: new Date(),
                  lastPaymentAmount: amount,
                };
                if (!user.zpin) {
                  const year = new Date().getFullYear().toString().slice(-2);
                  const count = await User.countDocuments({ zpin: { $exists: true, $ne: null } });
                  updates.zpin = `ZP${year}${String(count + 1).padStart(5, '0')}`;
                }
                const updatedUser = await User.findByIdAndUpdate(user._id, updates, { new: true });
                subscription.zpin = updatedUser.zpin;
                await updateTournamentEntryZpinStatus(subscription.entityId);
              }
            }

            // Create transaction record and send receipt
            let entityEmail = null;
            if (subscription.entityType === 'player') {
              entityEmail = (await User.findById(subscription.entityId))?.email || null;
            } else if (subscription.entityType === 'club') {
              entityEmail = (await Club.findById(subscription.entityId))?.email || null;
            }

            try {
              const transaction = await createTransactionAndSendReceipt({
                reference,
                transactionId: transaction_id,
                lencoData: data,
                type: 'membership',
                amount,
                payerName: subscription.payer?.name || subscription.entityName,
                payerEmail: subscription.payer?.email || null,
                relatedId: subscription._id,
                relatedModel: 'MembershipSubscription',
                description: `${subscription.membershipTypeName} - ${subscription.year}`,
                metadata: {
                  membershipType: subscription.membershipTypeCode,
                  membershipYear: subscription.year,
                  entityType: subscription.entityType,
                  playerName: subscription.entityName,
                  zpin: subscription.zpin
                }
              });

              subscription.receiptNumber = transaction.receiptNumber;
            } catch (txnError) {
              console.error('Webhook: Failed to create single MEM transaction record:', txnError);
            }

            await subscription.save();
            console.log(`Webhook: Activated single membership for ${reference}`);
          }
        }
      }

      if (referencePrefix === 'CLUB') {
        const subscription = await MembershipSubscription.findOne({ paymentReference: reference })
          .populate('membershipType');

        if (!subscription) {
          console.log(`Webhook: No club subscription found for reference ${reference}`);
        } else if (subscription.status === 'active') {
          console.log(`Webhook: Club subscription already active for ${reference}`);
          // Backfill receipt if missing
          if (!subscription.receiptNumber) {
            const existingTxn = await Transaction.findOne({ reference });
            if (existingTxn?.receiptNumber) {
              subscription.receiptNumber = existingTxn.receiptNumber;
              await subscription.save();
            }
          }
        } else {
          subscription.status = 'active';
          subscription.transactionId = transaction_id;
          subscription.paymentDate = new Date();
          await subscription.save();

          // Create transaction record and send receipt
          const club = await Club.findById(subscription.entityId);
          try {
            const transaction = await createTransactionAndSendReceipt({
              reference,
              transactionId: transaction_id,
              lencoData: data,
              type: 'membership',
              amount,
              payerName: subscription.payer?.name || subscription.entityName,
              payerEmail: subscription.payer?.email || null,
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
          } catch (txnError) {
            console.error('Webhook: Failed to create CLUB transaction record:', txnError);
          }

          console.log(`Webhook: Activated club affiliation for ${reference}`);
        }
      }

      if (referencePrefix === 'DON') {
        const donation = await Donation.findOne({ lencoReference: reference });

        if (donation && donation.status === 'pending') {
          donation.status = 'completed';
          donation.lencoTransactionId = transaction_id;
          donation.paymentDate = new Date();
          await donation.save();

          // Create transaction record and send receipt
          try {
            await createTransactionAndSendReceipt({
              reference,
              transactionId: transaction_id,
              lencoData: data,
              type: 'donation',
              amount,
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
          } catch (txnError) {
            console.error('Webhook: Failed to create DON transaction record:', txnError);
          }

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

          // Create transaction record and send receipt
          try {
            await createTransactionAndSendReceipt({
              reference,
              transactionId: transaction_id,
              lencoData: data,
              type: 'registration',
              amount,
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
          } catch (txnError) {
            console.error('Webhook: Failed to create REG transaction record:', txnError);
          }

          console.log(`Registration ${registration.referenceNumber} updated via webhook`);
        }
      }

      if (referencePrefix === 'TOUR') {
        const tournament = await Tournament.findOne({ 'categories.entries.paymentReference': reference });
        if (!tournament) {
          console.log(`Webhook: No tournament found for TOUR reference ${reference}`);
        } else {
          const existingTxn = await Transaction.findOne({ reference });
          if (existingTxn) {
            console.log(`Webhook: TOUR transaction already exists for ${reference}`);
          } else {
            let totalAmount = 0;
            let payerName = null;
            let payerEmail = null;
            const updatedEntries = [];

            for (const category of tournament.categories) {
              for (const entry of category.entries) {
                if (entry.paymentReference === reference && entry.status === 'pending_payment') {
                  entry.status = 'pending';
                  entry.paymentStatus = 'paid';
                  entry.paymentDate = new Date();
                  entry.paymentMethod = 'online';
                  const fee = entry.entryFee || tournament.entryFee || 0;
                  totalAmount += fee;
                  if (!payerName) {
                    payerName = entry.payer?.name || entry.playerName;
                    payerEmail = entry.payer?.email;
                  }
                  updatedEntries.push({ playerName: entry.playerName, category: category.name });
                }
              }
            }
            await tournament.save();

            if (updatedEntries.length > 0) {
              try {
                await createTransactionAndSendReceipt({
                  reference,
                  transactionId: transaction_id,
                  lencoData: data,
                  type: 'tournament',
                  amount: totalAmount || amount,
                  payerName: payerName || 'Tournament Entrant',
                  payerEmail,
                  relatedId: tournament._id,
                  relatedModel: 'Tournament',
                  description: `Tournament Entry Fee - ${tournament.name}`,
                  metadata: { tournamentName: tournament.name, entries: updatedEntries }
                });
              } catch (txnError) {
                console.error('Webhook: Failed to create TOUR transaction record:', txnError);
              }
              console.log(`Webhook: Activated ${updatedEntries.length} tournament entry/entries for ${reference}`);
            }
          }
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

// Helper: enrich membership transaction metadata from subscription data
// Handles cases where transactions were created before playerName/zpin metadata was added
const enrichTransactionMetadata = async (transaction) => {
  if (transaction.type !== 'membership' || transaction.relatedModel !== 'MembershipSubscription') {
    return transaction;
  }

  if (!transaction.metadata) transaction.metadata = {};

  // Enrich single player info
  if (!transaction.metadata.players && transaction.relatedId) {
    const subscription = await MembershipSubscription.findById(transaction.relatedId);
    if (subscription) {
      if (!transaction.metadata.playerName) transaction.metadata.playerName = subscription.entityName;
      if (!transaction.metadata.membershipType) transaction.metadata.membershipType = subscription.membershipTypeCode;
      if (!transaction.metadata.membershipExpiry) transaction.metadata.membershipExpiry = subscription.endDate;
      // Fill zpin from subscription; if still missing, look up the player directly
      if (!transaction.metadata.zpin) transaction.metadata.zpin = subscription.zpin;
      if (!transaction.metadata.zpin && subscription.entityType === 'player' && subscription.entityId) {
        const player = await User.findById(subscription.entityId).select('zpin');
        if (player?.zpin) transaction.metadata.zpin = player.zpin;
      }
    }
  }

  // Enrich bulk player data
  if (transaction.metadata.playerCount && (!transaction.metadata.players || transaction.metadata.players.length === 0)) {
    const subscriptions = await MembershipSubscription.find({ paymentReference: transaction.reference });
    if (subscriptions.length > 0) {
      transaction.metadata.players = subscriptions.map(s => ({
        id: s.entityId,
        name: s.entityName,
        zpin: s.zpin
      }));
    }
  }

  // Enrich existing bulk/top-up player entries that may have missing zpin/name
  if (transaction.metadata.players && transaction.metadata.players.length > 0) {
    // Normalise legacy format: { playerId, playerName } → { id, name }
    for (const player of transaction.metadata.players) {
      if (!player.id && player.playerId) player.id = player.playerId;
      if (!player.name && player.playerName) player.name = player.playerName;
    }

    const missingData = transaction.metadata.players.some(p => !p.zpin || !p.name);
    if (missingData) {
      const subscriptions = await MembershipSubscription.find({ paymentReference: transaction.reference });
      const playerIds = transaction.metadata.players.filter(p => !p.zpin && p.id).map(p => p.id);
      const usersWithZpin = playerIds.length > 0
        ? await User.find({ _id: { $in: playerIds } }).select('_id zpin')
        : [];
      const userZpinMap = {};
      for (const u of usersWithZpin) userZpinMap[u._id.toString()] = u.zpin;

      if (subscriptions.length > 0) {
        const subMap = {};
        for (const sub of subscriptions) subMap[sub.entityId.toString()] = sub;
        for (const player of transaction.metadata.players) {
          const sub = subMap[player.id?.toString()];
          if (sub) {
            if (!player.name) player.name = sub.entityName;
            if (!player.zpin) player.zpin = sub.zpin || userZpinMap[player.id?.toString()];
          }
        }
      } else {
        // No subscriptions via paymentReference — use User lookup directly
        for (const player of transaction.metadata.players) {
          if (!player.zpin && player.id) player.zpin = userZpinMap[player.id.toString()];
        }
      }
    }
  }

  return transaction;
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

    // Enrich metadata for membership receipts
    await enrichTransactionMetadata(transaction);

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

// @desc    Resend receipt PDF to an email address
// @route   POST /api/lenco/receipt/:receiptNumber/send
// @access  Private (admin)
export const resendReceipt = async (req, res) => {
  try {
    const { receiptNumber } = req.params;
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email address is required' });
    }

    const transaction = await Transaction.findOne({ receiptNumber });

    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Receipt not found' });
    }

    // Enrich metadata for membership receipts
    await enrichTransactionMetadata(transaction);

    const pdfBuffer = await generateReceipt(transaction);

    await sendEmail({
      email,
      subject: `Payment Receipt - ${transaction.receiptNumber} - ZTA`,
      html: `
        <h2>Payment Receipt</h2>
        <p>Dear ${transaction.payerName},</p>
        <p>Please find your official payment receipt from the Zambia Tennis Association attached to this email.</p>
        <p><strong>Receipt Details:</strong></p>
        <ul>
          <li>Receipt Number: ${transaction.receiptNumber}</li>
          <li>Amount: K${parseFloat(transaction.amount).toFixed(2)}</li>
          <li>Date: ${new Date(transaction.paymentDate || transaction.createdAt).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
          })}</li>
        </ul>
        <p>Best regards,<br>Zambia Tennis Association</p>
      `,
      attachments: [{
        filename: `ZTA-Receipt-${transaction.receiptNumber}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf'
      }]
    });

    res.status(200).json({
      success: true,
      message: `Receipt sent to ${email}`
    });
  } catch (error) {
    console.error('Resend receipt error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Helper: sync missing Transaction records from active MembershipSubscriptions
// This handles cases where subscriptions were activated but Transaction creation failed.
// Also backfills receiptNumber on subscriptions that are active but missing it.
const syncMissingTransactions = async () => {
  try {
    // Get all existing Transaction references for membership subscriptions
    const existingRelatedIds = await Transaction.distinct('relatedId', {
      relatedModel: 'MembershipSubscription'
    });
    const existingIdSet = new Set(existingRelatedIds.map(id => id.toString()));

    // Also get all references that already have Transaction records
    const existingReferences = await Transaction.distinct('reference', {
      type: 'membership',
      status: 'completed'
    });
    const existingRefSet = new Set(existingReferences);

    // Find active subscriptions (don't require paymentDate — some may be missing it)
    const activeSubscriptions = await MembershipSubscription.find({
      status: 'active'
    });

    // Group subscriptions by paymentReference to handle bulk payments correctly
    const subsByRef = new Map();
    for (const sub of activeSubscriptions) {
      const ref = sub.paymentReference;
      if (!ref) continue;
      if (!subsByRef.has(ref)) subsByRef.set(ref, []);
      subsByRef.get(ref).push(sub);
    }

    let created = 0;

    for (const [paymentRef, subs] of subsByRef) {
      // Check if a Transaction already exists for this paymentReference
      if (existingRefSet.has(paymentRef)) {
        // Transaction exists — just backfill receiptNumber on subs that are missing it
        const subsNeedingReceipt = subs.filter(s => !s.receiptNumber);
        if (subsNeedingReceipt.length > 0) {
          const txn = await Transaction.findOne({ reference: paymentRef, status: 'completed' });
          if (txn?.receiptNumber) {
            await MembershipSubscription.updateMany(
              { paymentReference: paymentRef, $or: [{ receiptNumber: { $exists: false } }, { receiptNumber: null }, { receiptNumber: '' }] },
              { $set: { receiptNumber: txn.receiptNumber } }
            );
          }
        }
        continue;
      }

      // Check if any sub in this group already has a Transaction by relatedId
      // (e.g. from a SYNC-* reference created previously)
      const hasAnyTxn = subs.some(s => existingIdSet.has(s._id.toString()));
      if (hasAnyTxn) {
        // A partial sync exists — backfill receiptNumber from existing Transaction
        const subWithTxn = subs.find(s => existingIdSet.has(s._id.toString()));
        if (subWithTxn) {
          const txn = await Transaction.findOne({ relatedId: subWithTxn._id, status: 'completed' });
          if (txn?.receiptNumber) {
            for (const s of subs) {
              if (!s.receiptNumber) {
                s.receiptNumber = txn.receiptNumber;
                await s.save();
              }
            }
          }
        }
        continue;
      }

      // No Transaction exists at all — create one
      try {
        const isBulk = subs.length > 1;
        const firstSub = subs[0];
        let totalAmount = 0;
        const players = [];
        for (const s of subs) {
          totalAmount += s.amount;
          players.push({ id: s.entityId, name: s.entityName, zpin: s.zpin });
        }

        const methodMap = { online: 'card', cash: 'cash', cheque: 'cheque' };
        const txnPaymentMethod = methodMap[firstSub.paymentMethod] || firstSub.paymentMethod || 'other';
        const txnReference = `SYNC-${firstSub._id}-${Date.now()}`;

        const txn = await Transaction.create({
          reference: txnReference,
          transactionId: firstSub.transactionId || null,
          type: 'membership',
          amount: totalAmount,
          currency: firstSub.currency || 'ZMW',
          payerName: firstSub.payer?.name || firstSub.entityName,
          payerEmail: firstSub.payer?.email || null,
          status: 'completed',
          paymentGateway: firstSub.paymentMethod === 'online' ? 'lenco' : 'manual',
          paymentMethod: txnPaymentMethod,
          relatedId: firstSub._id,
          relatedModel: 'MembershipSubscription',
          description: isBulk
            ? `Bulk ZPIN Registration - ${subs.length} player(s)`
            : `${firstSub.membershipTypeName} - ${firstSub.year}${firstSub.paymentMethod !== 'online' ? ' (Manual)' : ''}`,
          metadata: {
            membershipType: firstSub.membershipTypeCode,
            membershipYear: firstSub.year,
            entityType: firstSub.entityType,
            playerName: firstSub.entityName,
            zpin: firstSub.zpin,
            bankReference: firstSub.paymentReference,
            synced: true,
            ...(isBulk ? { playerCount: subs.length, players } : {})
          },
          paymentDate: firstSub.paymentDate || firstSub.createdAt || new Date()
        });

        // Backfill receiptNumber onto all subscriptions in the group
        if (txn.receiptNumber) {
          for (const s of subs) {
            if (!s.receiptNumber) {
              s.receiptNumber = txn.receiptNumber;
              await s.save();
            }
          }
        }

        // Send receipt email for synced transactions
        const recipientEmail = firstSub.payer?.email;
        if (recipientEmail && txn.receiptNumber) {
          try {
            const pdfBuffer = await generateReceipt(txn);
            await sendEmail({
              email: recipientEmail,
              subject: `Payment Receipt - ${txn.receiptNumber} - ZTA`,
              html: `
                <h2>Payment Receipt</h2>
                <p>Dear ${txn.payerName},</p>
                <p>Thank you for your payment to the Zambia Tennis Association.</p>
                <p><strong>Receipt Details:</strong></p>
                <ul>
                  <li>Receipt Number: ${txn.receiptNumber}</li>
                  <li>Amount: K${parseFloat(txn.amount).toFixed(2)}</li>
                  <li>Date: ${new Date(txn.paymentDate).toLocaleDateString('en-GB', {
                    day: 'numeric', month: 'long', year: 'numeric'
                  })}</li>
                </ul>
                <p>Please find your official receipt attached.</p>
                <p>Best regards,<br>Zambia Tennis Association</p>
              `,
              attachments: [{
                filename: `ZTA-Receipt-${txn.receiptNumber}.pdf`,
                content: pdfBuffer,
                contentType: 'application/pdf'
              }]
            });
            txn.receiptSentAt = new Date();
            await txn.save();
          } catch (emailErr) {
            console.error(`Failed to send receipt email for synced transaction ${txn.receiptNumber}:`, emailErr.message);
          }
        }

        created++;
      } catch (err) {
        console.error(`Failed to sync transaction for paymentReference ${paymentRef}:`, err.message);
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

// Helper: find the next available receipt number for the current year
const getNextReceiptNumber = async (type) => {
  const prefixMap = { donation: 'DON', membership: 'MEM', tournament: 'TRN', coach_listing: 'COA', registration: 'REG' };
  const prefix = prefixMap[type] || 'TXN';
  const year = new Date().getFullYear();

  // Find ALL receipt numbers for this year across all prefixes, extract the numeric suffix
  const allTxns = await Transaction.find({
    receiptNumber: { $exists: true, $ne: null }
  }).select('receiptNumber').lean();

  const yearPattern = `-${year}-`;
  let maxNum = 0;
  for (const t of allTxns) {
    if (t.receiptNumber && t.receiptNumber.includes(yearPattern)) {
      const parts = t.receiptNumber.split('-');
      const num = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(num) && num > maxNum) maxNum = num;
    }
  }

  return `ZTA-${prefix}-${year}-${String(maxNum + 1).padStart(5, '0')}`;
};

// @desc    Repair missing transactions for active subscriptions
// @route   POST /api/lenco/repair-transactions
// @access  Private (Admin)
export const repairMissingTransactions = async (req, res) => {
  try {
    const activeSubscriptions = await MembershipSubscription.find({ status: 'active' });
    const results = { total: activeSubscriptions.length, missingFound: 0, created: 0, receiptBackfilled: 0, emailsSent: 0, errors: [] };

    // Group by paymentReference
    const subsByRef = new Map();
    for (const sub of activeSubscriptions) {
      const ref = sub.paymentReference;
      if (!ref) continue;
      if (!subsByRef.has(ref)) subsByRef.set(ref, []);
      subsByRef.get(ref).push(sub);
    }

    for (const [paymentRef, subs] of subsByRef) {
      // Check if Transaction exists by reference or relatedId
      let txn = await Transaction.findOne({ reference: paymentRef });
      if (!txn) {
        txn = await Transaction.findOne({
          relatedId: { $in: subs.map(s => s._id) },
          relatedModel: 'MembershipSubscription',
          status: 'completed'
        });
      }

      if (txn) {
        // Backfill receiptNumber on subs missing it
        if (txn.receiptNumber) {
          for (const s of subs) {
            if (!s.receiptNumber) {
              s.receiptNumber = txn.receiptNumber;
              await s.save();
              results.receiptBackfilled++;
            }
          }
        }
        continue;
      }

      // No Transaction — create one with a pre-assigned receipt number
      results.missingFound++;
      const isBulk = subs.length > 1;
      const firstSub = subs[0];
      let totalAmount = 0;
      const players = [];
      for (const s of subs) {
        totalAmount += s.amount;
        players.push({ id: s.entityId, name: s.entityName, zpin: s.zpin });
      }

      const methodMap = { online: 'card', cash: 'cash', cheque: 'cheque' };
      const txnPaymentMethod = methodMap[firstSub.paymentMethod] || firstSub.paymentMethod || 'other';
      const txnReference = `REPAIR-${firstSub._id}-${Date.now()}`;

      try {
        // Pre-assign receipt number to avoid collisions (bypasses pre-save hook)
        const receiptNumber = await getNextReceiptNumber('membership');

        const newTxn = new Transaction({
          reference: txnReference,
          receiptNumber,
          transactionId: firstSub.transactionId || null,
          type: 'membership',
          amount: totalAmount,
          currency: firstSub.currency || 'ZMW',
          payerName: firstSub.payer?.name || firstSub.entityName,
          payerEmail: firstSub.payer?.email || null,
          status: 'completed',
          paymentGateway: firstSub.paymentMethod === 'online' ? 'lenco' : 'manual',
          paymentMethod: txnPaymentMethod,
          relatedId: firstSub._id,
          relatedModel: 'MembershipSubscription',
          description: isBulk
            ? `Bulk ZPIN Registration - ${subs.length} player(s)`
            : `${firstSub.membershipTypeName} - ${firstSub.year}`,
          metadata: {
            membershipType: firstSub.membershipTypeCode,
            membershipYear: firstSub.year,
            entityType: firstSub.entityType,
            playerName: firstSub.entityName,
            zpin: firstSub.zpin,
            bankReference: firstSub.paymentReference,
            repaired: true,
            ...(isBulk ? { playerCount: subs.length, players } : {})
          },
          paymentDate: firstSub.paymentDate || firstSub.createdAt || new Date()
        });
        await newTxn.save();

        // Backfill receiptNumber
        if (newTxn.receiptNumber) {
          for (const s of subs) {
            s.receiptNumber = newTxn.receiptNumber;
            await s.save();
            results.receiptBackfilled++;
          }
        }

        // Send receipt email
        const recipientEmail = firstSub.payer?.email;
        if (recipientEmail && newTxn.receiptNumber) {
          try {
            const pdfBuffer = await generateReceipt(newTxn);
            await sendEmail({
              email: recipientEmail,
              subject: `Payment Receipt - ${newTxn.receiptNumber} - ZTA`,
              html: `
                <h2>Payment Receipt</h2>
                <p>Dear ${newTxn.payerName},</p>
                <p>Thank you for your payment to the Zambia Tennis Association.</p>
                <p><strong>Receipt Details:</strong></p>
                <ul>
                  <li>Receipt Number: ${newTxn.receiptNumber}</li>
                  <li>Amount: K${parseFloat(newTxn.amount).toFixed(2)}</li>
                  <li>Date: ${new Date(newTxn.paymentDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</li>
                </ul>
                ${isBulk ? `<h3>Players:</h3><ul>${players.map(p => `<li>${p.name} (ZPIN: ${p.zpin})</li>`).join('')}</ul>` : ''}
                <p>Please find your official receipt attached.</p>
                <p>Best regards,<br>Zambia Tennis Association</p>
              `,
              attachments: [{
                filename: `ZTA-Receipt-${newTxn.receiptNumber}.pdf`,
                content: pdfBuffer,
                contentType: 'application/pdf'
              }]
            });
            newTxn.receiptSentAt = new Date();
            await newTxn.save();
            results.emailsSent++;
          } catch (emailErr) {
            results.errors.push(`Email failed for ${recipientEmail}: ${emailErr.message}`);
          }
        }

        results.created++;
      } catch (err) {
        results.errors.push(`Transaction creation failed for ref ${paymentRef}: ${err.message}`);
      }
    }

    res.status(200).json({ success: true, data: results });
  } catch (error) {
    console.error('Repair transactions error:', error);
    res.status(500).json({ success: false, message: error.message });
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
    const { page = 1, limit = 20, type, status, startDate, endDate, paymentSource } = req.query;

    // Sync any missing transaction records from subscriptions
    await syncMissingTransactions();

    const query = {};

    if (type) query.type = type;
    if (status) query.status = status;
    if (paymentSource === 'manual') query.paymentGateway = 'manual';
    else if (paymentSource === 'online') query.paymentGateway = 'lenco';
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

// @desc    Export transactions to Excel
// @route   GET /api/lenco/transactions/export/excel
// @access  Private (Admin)
export const exportTransactionsExcel = async (req, res) => {
  try {
    const { type, status, startDate, endDate, paymentSource } = req.query;

    await syncMissingTransactions();

    const query = {};
    if (type) query.type = type;
    if (status) query.status = status;
    if (startDate || endDate) {
      query.paymentDate = {};
      if (startDate) query.paymentDate.$gte = new Date(startDate);
      if (endDate) query.paymentDate.$lte = new Date(endDate);
    }
    if (paymentSource === 'manual') query.paymentGateway = 'manual';
    else if (paymentSource === 'online') query.paymentGateway = 'lenco';

    const transactions = await Transaction.find(query).sort({ createdAt: -1 });

    const excelData = transactions.map(txn => ({
      'Date': txn.paymentDate ? new Date(txn.paymentDate).toLocaleDateString() : '',
      'Receipt #': txn.receiptNumber || '',
      'Type': txn.type || '',
      'Description': txn.description || '',
      'Payer Name': txn.payerName || '',
      'Payer Email': txn.payerEmail || '',
      'Amount': txn.amount || 0,
      'Currency': txn.currency || 'ZMW',
      'Status': txn.status || '',
      'Payment Method': txn.paymentGateway === 'manual' ? 'Manual' : 'Online'
    }));

    const workbook = xlsx.utils.book_new();
    const worksheet = xlsx.utils.json_to_sheet(excelData);
    worksheet['!cols'] = [
      { wch: 15 }, { wch: 22 }, { wch: 15 }, { wch: 30 }, { wch: 20 },
      { wch: 25 }, { wch: 12 }, { wch: 8 }, { wch: 12 }, { wch: 15 }
    ];
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Transactions');

    const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    const filename = `ZTA_Transactions_${new Date().toISOString().split('T')[0]}.xlsx`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (error) {
    console.error('Export transactions Excel error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export transactions',
      error: error.message
    });
  }
};
