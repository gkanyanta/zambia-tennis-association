import xlsx from 'xlsx';
import MembershipType from '../models/MembershipType.js';
import MembershipSubscription from '../models/MembershipSubscription.js';
import User from '../models/User.js';
import Club from '../models/Club.js';
import Transaction from '../models/Transaction.js';
import { generateReceipt } from '../utils/generateReceipt.js';
import sendEmail from '../utils/sendEmail.js';
import { updateTournamentEntryZpinStatus } from '../utils/updateTournamentZpin.js';

// ============================================
// ADMIN: CONFIRM PENDING SUBSCRIPTION
// ============================================

// @desc    Confirm/activate a pending subscription payment (admin)
// @route   PUT /api/membership/subscriptions/:id/confirm
// @access  Private (Admin)
export const confirmSubscriptionPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { paymentMethod = 'other', bankReference, overrideReason } = req.body;

    if (!bankReference || !bankReference.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Bank reference / transaction ID is required to confirm a payment'
      });
    }

    const subscription = await MembershipSubscription.findById(id);

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found'
      });
    }

    if (subscription.status === 'active') {
      // Already active — return existing data instead of erroring
      const existingTxn = await Transaction.findOne({
        relatedId: subscription._id,
        relatedModel: 'MembershipSubscription',
        status: 'completed'
      });

      return res.status(200).json({
        success: true,
        message: 'Subscription is already active',
        data: {
          subscription,
          transaction: existingTxn || null,
          zpin: subscription.zpin
        }
      });
    }

    // Allow activation from any non-active status. For cancelled/expired
    // subscriptions, require an overrideReason so the admin action is auditable.
    const isOverride = subscription.status !== 'pending';
    if (isOverride && (!overrideReason || !overrideReason.trim())) {
      return res.status(400).json({
        success: false,
        message: `Subscription is "${subscription.status}". A reason is required to activate it as an admin override.`
      });
    }

    // Activate subscription
    subscription.status = 'active';
    subscription.paymentDate = new Date();
    subscription.paymentMethod = paymentMethod;
    // Store bank reference in transactionId — do NOT overwrite paymentReference
    // paymentReference is the canonical link to the Lenco payment
    subscription.transactionId = bankReference.trim();
    if (isOverride) {
      const stamp = `[${new Date().toISOString()}] Admin override (${req.user?.email || req.user?.id}): ${overrideReason.trim()}`;
      subscription.notes = subscription.notes ? `${subscription.notes}\n${stamp}` : stamp;
      subscription.processedBy = req.user?.id;
    }

    // Update entity (player or club)
    let entityEmail;
    if (subscription.entityType === 'player') {
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
        entityEmail = updatedPlayer.email;
        await updateTournamentEntryZpinStatus(subscription.entityId);
      }
    } else if (subscription.entityType === 'club') {
      const club = await Club.findById(subscription.entityId);
      if (club) {
        club.affiliationStatus = 'active';
        club.affiliationType = subscription.membershipTypeCode;
        club.affiliationExpiry = subscription.endDate;
        await club.save();
        entityEmail = club.email;
      }
    }

    await subscription.save();

    // Create transaction record — use original paymentReference if it's a Lenco ref,
    // otherwise generate a unique confirm reference
    const isLencoRef = subscription.paymentReference &&
      (subscription.paymentReference.startsWith('MEM-') || subscription.paymentReference.startsWith('CLUB-'));
    const txnReference = isLencoRef
      ? subscription.paymentReference
      : `CONFIRM-${subscription._id}-${Date.now()}`;

    // Idempotency: check if Transaction already exists for this subscription
    let transaction = await Transaction.findOne({
      relatedId: subscription._id,
      relatedModel: 'MembershipSubscription',
      status: 'completed'
    }) || await Transaction.findOne({ reference: txnReference });
    if (!transaction) {
      transaction = await Transaction.create({
        reference: txnReference,
        transactionId: bankReference.trim(),
        type: 'membership',
        amount: subscription.amount,
        currency: subscription.currency || 'ZMW',
        payerName: subscription.payer?.name || subscription.entityName,
        payerEmail: subscription.payer?.email || entityEmail || null,
        status: 'completed',
        paymentGateway: isLencoRef ? 'lenco' : 'manual',
        paymentMethod: isLencoRef ? 'online' : paymentMethod,
        relatedId: subscription._id,
        relatedModel: 'MembershipSubscription',
        description: `${subscription.membershipTypeName} - ${subscription.year} (Confirmed)`,
        metadata: {
          membershipType: subscription.membershipTypeCode,
          membershipYear: subscription.year,
          membershipExpiry: subscription.endDate,
          entityType: subscription.entityType,
          confirmedBy: req.user.id,
          playerName: subscription.entityName,
          zpin: subscription.zpin,
          bankReference: bankReference.trim()
        },
        paymentDate: new Date()
      });
    }

    subscription.receiptNumber = transaction.receiptNumber;
    await subscription.save();

    // Generate and send receipt
    const receiptEmail = subscription.payer?.email || entityEmail;
    const receiptRecipient = subscription.payer?.name || subscription.entityName;
    try {
      const pdfBuffer = await generateReceipt(transaction);
      if (receiptEmail) {
        await sendEmail({
          email: receiptEmail,
          subject: `Membership Payment Confirmed - ${transaction.receiptNumber} - ZTA`,
          html: `
            <h2>Membership Payment Confirmed!</h2>
            <p>Dear ${receiptRecipient},</p>
            <p>The ${subscription.membershipTypeName} for ${subscription.entityName} has been confirmed and activated.</p>
            <p><strong>Details:</strong></p>
            <ul>
              <li>Receipt Number: ${transaction.receiptNumber}</li>
              <li>Membership: ${subscription.membershipTypeName}</li>
              <li>Amount: K${subscription.amount}</li>
              <li>Valid Until: December 31, ${subscription.year}</li>
              ${subscription.zpin ? `<li>ZPIN: ${subscription.zpin}</li>` : ''}
            </ul>
            <p>Please find your official receipt attached.</p>
            <p>Thank you for being a member of the Zambia Tennis Association!</p>
          `,
          attachments: [{
            filename: `ZTA-Receipt-${transaction.receiptNumber}.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf'
          }]
        });
      }
    } catch (emailError) {
      console.error('Failed to send confirmation receipt email:', emailError);
    }

    res.status(200).json({
      success: true,
      message: 'Subscription confirmed and activated',
      data: {
        subscription,
        transaction,
        zpin: subscription.zpin
      }
    });
  } catch (error) {
    console.error('Confirm subscription payment error:', error);
    res.status(500).json({
      success: false,
      message: `Failed to confirm subscription payment: ${error.message}`,
      error: error.message
    });
  }
};

// ============================================
// HELPER FUNCTIONS
// ============================================

// Calculate player age as of December 31st of the current year
const calculateAge = (dateOfBirth) => {
  if (!dateOfBirth) return null;
  const currentYear = new Date().getFullYear();
  const birthDate = new Date(dateOfBirth);
  const birthYear = birthDate.getFullYear();
  // Age they will be on Dec 31st of current year
  return currentYear - birthYear;
};

// Determine appropriate membership type based on player age, nationality,
// and (for juniors) whether they want senior-tournament eligibility.
// `wantsSeniorEligibility` is only meaningful for Zambian under-18s; it
// routes them to zpin_junior_senior (K250) instead of zpin_junior (K100).
const determinePlayerMembershipType = async (player, wantsSeniorEligibility = false) => {
  const age = calculateAge(player.dateOfBirth);
  const isInternational = player.isInternational || false;

  // Get all active player membership types
  const membershipTypes = await MembershipType.find({
    category: 'player',
    isActive: true
  }).sort({ sortOrder: 1 });

  // International players — single rate regardless of age or eligibility
  if (isInternational) {
    const intlType = membershipTypes.find(t => t.code === 'zpin_international');
    if (intlType) return intlType;
  }

  // Junior (18 or under)
  if (age !== null && age <= 18) {
    if (wantsSeniorEligibility && age >= 14) {
      const upgradedType = membershipTypes.find(t => t.code === 'zpin_junior_senior');
      if (upgradedType) return upgradedType;
    }
    const juniorType = membershipTypes.find(t => t.code === 'zpin_junior');
    if (juniorType) return juniorType;
  }

  // Senior (18+) - default
  const seniorType = membershipTypes.find(t => t.code === 'zpin_senior');
  return seniorType || membershipTypes[0];
};

// ============================================
// PUBLIC PLAYER SEARCH & BULK PAYMENT
// ============================================

// @desc    Search players for ZPIN payment (public)
// @route   GET /api/membership/players/search
// @access  Public
export const searchPlayersForPayment = async (req, res) => {
  try {
    const { q, club, limit = 20 } = req.query;

    if (!q || q.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Please provide at least 2 characters for search'
      });
    }

    // Split on whitespace so a query like "Mwape Banda" requires both tokens
    // to match somewhere across firstName / lastName / zpin. A single-token
    // query falls back to the original behaviour.
    const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const tokens = String(q).trim().split(/\s+/).filter(Boolean);
    const tokenClause = (tok) => ({
      $or: [
        { firstName: { $regex: escapeRegex(tok), $options: 'i' } },
        { lastName: { $regex: escapeRegex(tok), $options: 'i' } },
        { zpin: { $regex: escapeRegex(tok), $options: 'i' } }
      ]
    });

    // Search all registered users (not just 'player' role) so that staff/admin
    // accounts with player profiles can also be found for tournament entry.
    // Require at least a dateOfBirth so that system accounts without player
    // profiles don't pollute results.
    const roleClause = { role: { $in: ['player', 'admin', 'staff'] }, dateOfBirth: { $exists: true, $ne: null } };
    const searchQuery = {
      ...roleClause,
      ...(tokens.length > 1
        ? { $and: tokens.map(tokenClause) }
        : tokenClause(tokens[0]))
    };

    if (club) {
      searchQuery.club = club;
    }

    // Find players
    const players = await User.find(searchQuery)
      .select('firstName lastName zpin dateOfBirth club gender isInternational membershipStatus membershipExpiry')
      .limit(parseInt(limit))
      .sort({ firstName: 1, lastName: 1 });

    // Get current year for subscription check
    const currentYear = MembershipSubscription.getCurrentYear();

    // Enrich with age, fee calculation, and subscription status
    const enrichedPlayers = await Promise.all(players.map(async (player) => {
      const age = calculateAge(player.dateOfBirth);
      const membershipType = await determinePlayerMembershipType(player);

      // Check if already has active subscription for current year
      const activeSubscription = await MembershipSubscription.findOne({
        entityId: player._id,
        entityType: 'player',
        year: currentYear,
        status: 'active'
      });

      const hasActiveSubscription = !!activeSubscription;

      return {
        _id: player._id,
        firstName: player.firstName,
        lastName: player.lastName,
        fullName: `${player.firstName} ${player.lastName}`,
        zpin: hasActiveSubscription ? player.zpin : null,
        activeMembershipTypeCode: activeSubscription?.membershipTypeCode || null,
        dateOfBirth: player.dateOfBirth,
        age,
        club: player.club,
        gender: player.gender,
        isInternational: player.isInternational || false,
        membershipType: membershipType ? {
          _id: membershipType._id,
          name: membershipType.name,
          code: membershipType.code,
          amount: membershipType.amount
        } : null,
        hasActiveSubscription,
        subscriptionExpiry: activeSubscription?.endDate || player.membershipExpiry
      };
    }));

    res.status(200).json({
      success: true,
      count: enrichedPlayers.length,
      data: enrichedPlayers
    });
  } catch (error) {
    console.error('Search players error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search players',
      error: error.message
    });
  }
};

// @desc    Get player details for payment (public)
// @route   GET /api/membership/players/:id/payment-details
// @access  Public
export const getPlayerPaymentDetails = async (req, res) => {
  try {
    const player = await User.findOne({
      _id: req.params.id,
      role: 'player'
    }).select('firstName lastName zpin dateOfBirth club gender isInternational membershipStatus membershipExpiry');

    if (!player) {
      return res.status(404).json({
        success: false,
        message: 'Player not found'
      });
    }

    const age = calculateAge(player.dateOfBirth);
    const membershipType = await determinePlayerMembershipType(player);
    const currentYear = MembershipSubscription.getCurrentYear();

    // Check active subscription
    const activeSubscription = await MembershipSubscription.findOne({
      entityId: player._id,
      entityType: 'player',
      year: currentYear,
      status: 'active'
    });

    res.status(200).json({
      success: true,
      data: {
        _id: player._id,
        firstName: player.firstName,
        lastName: player.lastName,
        fullName: `${player.firstName} ${player.lastName}`,
        zpin: player.zpin,
        dateOfBirth: player.dateOfBirth,
        age,
        club: player.club,
        gender: player.gender,
        isInternational: player.isInternational || false,
        membershipType: membershipType ? {
          _id: membershipType._id,
          name: membershipType.name,
          code: membershipType.code,
          amount: membershipType.amount,
          currency: membershipType.currency
        } : null,
        hasActiveSubscription: !!activeSubscription,
        subscriptionExpiry: activeSubscription?.endDate
      }
    });
  } catch (error) {
    console.error('Get player payment details error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get player details',
      error: error.message
    });
  }
};

// @desc    Initialize bulk ZPIN payment (public - for parents/sponsors)
// @route   POST /api/membership/bulk-payment/initialize
// @access  Public
export const initializeBulkPayment = async (req, res) => {
  try {
    const { playerIds, payer, nationalityOverrides, seniorEligibilityOverrides } = req.body;

    // Extract payer details from nested object
    const payerName = payer?.name;
    const payerEmail = payer?.email;
    const payerPhone = payer?.phone;
    const payerRelation = payer?.relation;

    // Validation
    if (!playerIds || !Array.isArray(playerIds) || playerIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide at least one player ID'
      });
    }

    if (playerIds.length > 20) {
      return res.status(400).json({
        success: false,
        message: 'Maximum 20 players per transaction'
      });
    }

    if (!payerName || !payerEmail) {
      return res.status(400).json({
        success: false,
        message: 'Payer name and email are required'
      });
    }

    const currentYear = MembershipSubscription.getCurrentYear();
    const players = [];
    const subscriptions = [];
    let totalAmount = 0;

    // Process each player
    for (const playerId of playerIds) {
      const player = await User.findOne({ _id: playerId, role: 'player' });

      if (!player) {
        return res.status(404).json({
          success: false,
          message: `Player not found: ${playerId}`
        });
      }

      // Check for existing active subscription
      const existingActive = await MembershipSubscription.findOne({
        entityId: player._id,
        entityType: 'player',
        year: currentYear,
        status: 'active'
      });

      if (existingActive) {
        return res.status(400).json({
          success: false,
          message: `${player.firstName} ${player.lastName} already has an active membership for ${currentYear}`
        });
      }

      // Apply nationality override if provided. Use findByIdAndUpdate so we
      // do not re-run full User validation on imported records that may be
      // missing optional-but-conditionally-required fields (placeholder
      // emails, guardian info, etc.).
      if (nationalityOverrides && nationalityOverrides.hasOwnProperty(playerId.toString())) {
        const isInternational = nationalityOverrides[playerId.toString()];
        if (player.isInternational !== isInternational) {
          await User.findByIdAndUpdate(player._id, { isInternational }, { runValidators: false });
          player.isInternational = isInternational;
        }
      }

      // Determine membership type based on age, nationality, and (for
      // juniors) whether the parent opted in to senior-tournament eligibility.
      const wantsSeniorEligibility = !!(
        seniorEligibilityOverrides &&
        Object.prototype.hasOwnProperty.call(seniorEligibilityOverrides, playerId.toString()) &&
        seniorEligibilityOverrides[playerId.toString()]
      );
      const membershipType = await determinePlayerMembershipType(player, wantsSeniorEligibility);

      if (!membershipType) {
        return res.status(400).json({
          success: false,
          message: `Could not determine membership type for ${player.firstName} ${player.lastName}`
        });
      }

      players.push({
        player,
        membershipType,
        age: calculateAge(player.dateOfBirth)
      });

      totalAmount += membershipType.amount;
    }

    // Generate payment reference for bulk payment
    const reference = `MEM-BULK-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    // Create pending subscriptions for all players
    for (const { player, membershipType } of players) {
      // Check for existing pending subscription
      let subscription = await MembershipSubscription.findOne({
        entityId: player._id,
        entityType: 'player',
        year: currentYear,
        status: 'pending'
      });

      if (subscription) {
        // Update existing pending subscription
        subscription.membershipType = membershipType._id;
        subscription.membershipTypeName = membershipType.name;
        subscription.membershipTypeCode = membershipType.code;
        subscription.amount = membershipType.amount;
        subscription.paymentReference = reference;
        subscription.payer = { name: payerName, email: payerEmail, phone: payerPhone, relation: payerRelation };
        subscription.notes = `Bulk payment by ${payerName} (${payerRelation || 'N/A'})`;
        await subscription.save();
      } else {
        // Create new subscription
        subscription = new MembershipSubscription({
          entityType: 'player',
          entityId: player._id,
          entityModel: 'User',
          entityName: `${player.firstName} ${player.lastName}`,
          membershipType: membershipType._id,
          membershipTypeName: membershipType.name,
          membershipTypeCode: membershipType.code,
          year: currentYear,
          startDate: new Date(),
          endDate: MembershipSubscription.getYearEndDate(currentYear),
          amount: membershipType.amount,
          currency: membershipType.currency,
          paymentReference: reference,
          status: 'pending',
          payer: { name: payerName, email: payerEmail, phone: payerPhone, relation: payerRelation },
          notes: `Bulk payment by ${payerName} (${payerRelation || 'N/A'})`
        });
        await subscription.save();
      }

      subscriptions.push({
        subscriptionId: subscription._id,
        playerId: player._id,
        playerName: `${player.firstName} ${player.lastName}`,
        zpin: player.zpin,
        membershipType: membershipType.name,
        amount: membershipType.amount
      });
    }

    res.status(200).json({
      success: true,
      data: {
        reference,
        totalAmount,
        currency: 'ZMW',
        playerCount: players.length,
        publicKey: process.env.LENCO_PUBLIC_KEY,
        payer: {
          name: payerName,
          email: payerEmail,
          phone: payerPhone,
          relation: payerRelation
        },
        subscriptions,
        year: currentYear,
        expiryDate: MembershipSubscription.getYearEndDate(currentYear)
      }
    });
  } catch (error) {
    console.error('Initialize bulk payment error:', error);
    res.status(500).json({
      success: false,
      message: `Failed to initialize bulk payment: ${error.message}`,
      error: error.message
    });
  }
};

// @desc    Initialize a senior-eligibility top-up payment for one or more
//          junior players. The flat top-up fee is K150 per player and
//          upgrades their existing zpin_junior subscription to
//          zpin_junior_senior on payment success.
// @route   POST /api/membership/top-up/initialize
// @access  Public
const TOP_UP_AMOUNT = 150;
export const initializeSeniorTopUp = async (req, res) => {
  try {
    const { playerIds, payer } = req.body;
    const payerName = payer?.name;
    const payerEmail = payer?.email;
    const payerPhone = payer?.phone;
    const payerRelation = payer?.relation;

    if (!Array.isArray(playerIds) || playerIds.length === 0) {
      return res.status(400).json({ success: false, message: 'Please provide at least one player ID' });
    }
    if (playerIds.length > 20) {
      return res.status(400).json({ success: false, message: 'Maximum 20 players per transaction' });
    }
    if (!payerName || !payerEmail) {
      return res.status(400).json({ success: false, message: 'Payer name and email are required' });
    }

    const currentYear = MembershipSubscription.getCurrentYear();
    const upgradedType = await MembershipType.findOne({ code: 'zpin_junior_senior', isActive: true });
    if (!upgradedType) {
      return res.status(500).json({
        success: false,
        message: 'Senior-eligibility membership type is not configured. Run the membershipTypes seed.'
      });
    }

    const reference = `MEM-TOPUP-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const pendingTopUps = [];
    let totalAmount = 0;

    for (const playerId of playerIds) {
      const player = await User.findOne({ _id: playerId, role: 'player' });
      if (!player) {
        return res.status(404).json({ success: false, message: `Player not found: ${playerId}` });
      }

      const playerTennisAge = calculateAge(player.dateOfBirth);
      if (playerTennisAge === null || playerTennisAge < 14) {
        return res.status(400).json({
          success: false,
          message: `${player.firstName} ${player.lastName} must be at least 14 years old (tennis age) to be eligible for senior tournaments.`
        });
      }

      const activeJunior = await MembershipSubscription.findOne({
        entityId: player._id,
        entityType: 'player',
        year: currentYear,
        status: 'active',
        membershipTypeCode: 'zpin_junior'
      });
      if (!activeJunior) {
        return res.status(400).json({
          success: false,
          message: `${player.firstName} ${player.lastName} does not have an active Junior ZPIN to upgrade. Existing senior-eligible or expired players are not eligible for top-up.`
        });
      }

      // Don't double-bill if a previous top-up is mid-flight for this player
      const existingPending = await MembershipSubscription.findOne({
        entityId: player._id,
        entityType: 'player',
        year: currentYear,
        status: 'pending',
        membershipTypeCode: 'zpin_junior_senior'
      });
      if (existingPending) {
        return res.status(400).json({
          success: false,
          message: `A senior-eligibility top-up for ${player.firstName} ${player.lastName} is already pending. Complete or cancel it before retrying.`
        });
      }

      // Pending sub for the upgrade. previousSubscription links it to the
      // existing junior sub so the webhook knows what to upgrade in place.
      const pending = new MembershipSubscription({
        entityType: 'player',
        entityId: player._id,
        entityModel: 'User',
        entityName: `${player.firstName} ${player.lastName}`,
        membershipType: upgradedType._id,
        membershipTypeName: upgradedType.name,
        membershipTypeCode: upgradedType.code,
        year: currentYear,
        startDate: new Date(),
        endDate: MembershipSubscription.getYearEndDate(currentYear),
        amount: TOP_UP_AMOUNT,
        currency: upgradedType.currency || 'ZMW',
        paymentReference: reference,
        status: 'pending',
        previousSubscription: activeJunior._id,
        payer: { name: payerName, email: payerEmail, phone: payerPhone, relation: payerRelation },
        notes: `Senior-eligibility top-up for existing Junior ZPIN ${activeJunior._id}`,
      });
      await pending.save();

      pendingTopUps.push({
        topUpId: pending._id,
        playerId: player._id,
        playerName: `${player.firstName} ${player.lastName}`,
        zpin: player.zpin,
        existingJuniorSubscriptionId: activeJunior._id,
        amount: TOP_UP_AMOUNT,
      });
      totalAmount += TOP_UP_AMOUNT;
    }

    res.status(200).json({
      success: true,
      data: {
        reference,
        totalAmount,
        currency: 'ZMW',
        playerCount: pendingTopUps.length,
        publicKey: process.env.LENCO_PUBLIC_KEY,
        payer: { name: payerName, email: payerEmail, phone: payerPhone, relation: payerRelation },
        topUps: pendingTopUps,
        year: currentYear,
      }
    });
  } catch (error) {
    console.error('Initialize senior top-up error:', error);
    res.status(500).json({
      success: false,
      message: `Failed to initialize top-up: ${error.message}`,
      error: error.message
    });
  }
};

// @desc    Verify bulk ZPIN payment
// @route   POST /api/membership/bulk-payment/verify
// @access  Public
export const verifyBulkPayment = async (req, res) => {
  try {
    const { reference, transactionId, payerEmail } = req.body;

    if (!reference) {
      return res.status(400).json({
        success: false,
        message: 'Payment reference is required'
      });
    }

    // Find all subscriptions with this reference (pending OR already active via webhook)
    const subscriptions = await MembershipSubscription.find({
      paymentReference: reference,
      status: { $in: ['pending', 'active'] }
    });

    if (subscriptions.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No subscriptions found for this reference'
      });
    }

    // If all already active (webhook beat us), ensure Transaction + receipt exist
    const allActive = subscriptions.every(s => s.status === 'active');
    if (allActive) {
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
          existingTxn = new Transaction({
            reference,
            transactionId,
            type: 'membership',
            amount: totalAmount,
            currency: 'ZMW',
            payerName: firstSub?.payer?.name || firstSub?.entityName || 'Bulk Payer',
            payerEmail: firstSub?.payer?.email || payerEmail,
            status: 'completed',
            paymentGateway: 'lenco',
            paymentMethod: 'online',
            relatedId: firstSub?._id,
            relatedModel: 'MembershipSubscription',
            description: `Bulk ZPIN Registration - ${subscriptions.length} player(s)`,
            metadata: {
              playerCount: subscriptions.length,
              players: activatedPlayers
            },
            paymentDate: new Date()
          });
          await existingTxn.save();
        } catch (txnErr) {
          console.error('verifyBulkPayment: Backfill transaction creation failed:', txnErr.message);
          existingTxn = await Transaction.findOne({ reference });
        }
      }

      // Backfill receipt number on subscriptions missing it
      if (existingTxn?.receiptNumber) {
        await MembershipSubscription.updateMany(
          { paymentReference: reference, $or: [{ receiptNumber: { $exists: false } }, { receiptNumber: null }, { receiptNumber: '' }] },
          { $set: { receiptNumber: existingTxn.receiptNumber } }
        );
      }

      return res.status(200).json({
        success: true,
        message: 'Memberships already active',
        data: {
          reference,
          transactionId,
          receiptNumber: existingTxn?.receiptNumber,
          totalAmount: subscriptions.reduce((sum, s) => sum + s.amount, 0),
          playerCount: subscriptions.length,
          players: subscriptions.map(s => ({
            playerId: s.entityId,
            playerName: s.entityName,
            zpin: s.zpin,
            membershipType: s.membershipTypeName,
            amount: s.amount,
            expiryDate: s.endDate
          })),
          year: new Date().getFullYear(),
          expiryDate: MembershipSubscription.getYearEndDate()
        }
      });
    }

    const activatedPlayers = [];
    let totalAmount = 0;

    // Activate each pending subscription (skip already-active ones)
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
        // Generate ZPIN if not exists
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
        amount: subscription.amount,
        expiryDate: subscription.endDate
      });

      totalAmount += subscription.amount;
    }

    // Create transaction record (idempotent — use findOne first to handle race with webhook)
    let transaction = await Transaction.findOne({ reference });
    if (!transaction) {
      try {
        transaction = new Transaction({
          reference,
          transactionId,
          type: 'membership',
          amount: totalAmount,
          currency: 'ZMW',
          payerName: subscriptions[0]?.payer?.name || subscriptions[0]?.notes?.match(/Bulk payment by ([^(]+)/)?.[1]?.trim() || 'Bulk Payer',
          payerEmail: subscriptions[0]?.payer?.email || payerEmail,
          status: 'completed',
          paymentGateway: 'lenco',
          paymentMethod: 'online',
          relatedId: subscriptions[0]?._id,
          relatedModel: 'MembershipSubscription',
          description: `Bulk ZPIN Registration - ${activatedPlayers.length} player(s)`,
          metadata: {
            playerCount: activatedPlayers.length,
            players: activatedPlayers.map(p => ({ id: p.playerId, name: p.playerName, zpin: p.zpin }))
          },
          paymentDate: new Date()
        });
        await transaction.save();
      } catch (txnErr) {
        console.error('verifyBulkPayment: Transaction creation failed, attempting to find existing:', txnErr.message);
        transaction = await Transaction.findOne({ reference });
      }
    }

    // Write receipt number back to all subscriptions in the bulk
    if (transaction?.receiptNumber) {
      await MembershipSubscription.updateMany(
        { paymentReference: reference },
        { $set: { receiptNumber: transaction.receiptNumber } }
      );
    }

    // Generate and send receipt
    try {
      const pdfBuffer = await generateReceipt(transaction);
      const recipientEmail = subscriptions[0]?.payer?.email || payerEmail;

      if (recipientEmail) {
        await sendEmail({
          email: recipientEmail,
          subject: `ZPIN Registration Receipt - ${transaction.receiptNumber} - ZTA`,
          html: `
            <h2>ZPIN Registration Successful!</h2>
            <p>Thank you for registering with the Zambia Tennis Association.</p>
            <p><strong>Receipt Details:</strong></p>
            <ul>
              <li>Receipt Number: ${transaction.receiptNumber}</li>
              <li>Reference: ${reference}</li>
              <li>Total Amount: K${totalAmount.toFixed(2)}</li>
              <li>Players Registered: ${activatedPlayers.length}</li>
            </ul>
            <h3>Players Activated:</h3>
            <ul>
              ${activatedPlayers.map(p => `<li>${p.playerName} (ZPIN: ${p.zpin}) - ${p.membershipType} - K${p.amount}</li>`).join('')}
            </ul>
            <p>All memberships are valid until December 31, ${new Date().getFullYear()}.</p>
            <p>Please find your official receipt attached.</p>
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
      }
    } catch (emailError) {
      console.error('Failed to send receipt email:', emailError);
    }

    res.status(200).json({
      success: true,
      status: 'successful',
      message: `Successfully activated ${activatedPlayers.length} membership(s)`,
      data: {
        reference,
        transactionId,
        receiptNumber: transaction.receiptNumber,
        totalAmount,
        playerCount: activatedPlayers.length,
        players: activatedPlayers,
        year: new Date().getFullYear(),
        expiryDate: MembershipSubscription.getYearEndDate()
      }
    });
  } catch (error) {
    console.error('Verify bulk payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify bulk payment',
      error: error.message
    });
  }
};

// ============================================
// PUBLIC CLUB SEARCH & AFFILIATION PAYMENT
// ============================================

// @desc    Search clubs for affiliation payment (public)
// @route   GET /api/membership/clubs/search
// @access  Public
export const searchClubsForPayment = async (req, res) => {
  try {
    const { q, limit = 20 } = req.query;

    // Build search query
    const searchQuery = { status: 'active' };

    if (q && q.length >= 2) {
      searchQuery.$or = [
        { name: { $regex: q, $options: 'i' } },
        { city: { $regex: q, $options: 'i' } },
        { province: { $regex: q, $options: 'i' } }
      ];
    }

    // Find clubs
    const clubs = await Club.find(searchQuery)
      .select('name city province contactPerson email phone memberCount')
      .limit(parseInt(limit))
      .sort({ name: 1 });

    // Get current year for subscription check
    const currentYear = MembershipSubscription.getCurrentYear();
    const EARLIEST_PAYABLE_YEAR = 2024;

    // Get all active club membership types
    const membershipTypes = await MembershipType.find({
      category: 'club',
      isActive: true
    }).sort({ sortOrder: 1 });

    // Enrich with subscription status
    const enrichedClubs = await Promise.all(clubs.map(async (club) => {
      // Check all years from 2024 to currentYear for active subscriptions
      const activeSubscriptions = await MembershipSubscription.find({
        entityId: club._id,
        entityType: 'club',
        year: { $gte: EARLIEST_PAYABLE_YEAR, $lte: currentYear },
        status: 'active'
      });

      const paidYears = new Set(activeSubscriptions.map(s => s.year));
      const unpaidYears = [];
      for (let y = EARLIEST_PAYABLE_YEAR; y <= currentYear; y++) {
        if (!paidYears.has(y)) {
          unpaidYears.push(y);
        }
      }

      // Only fully paid up if no unpaid years
      const hasActiveSubscription = unpaidYears.length === 0;

      // Current affiliation is the latest active subscription
      const latestSubscription = activeSubscriptions.length > 0
        ? activeSubscriptions.sort((a, b) => b.year - a.year)[0]
        : null;

      return {
        _id: club._id,
        name: club.name,
        city: club.city,
        province: club.province,
        contactPerson: club.contactPerson,
        email: club.email,
        phone: club.phone,
        memberCount: club.memberCount,
        hasActiveSubscription,
        unpaidYears,
        currentAffiliation: latestSubscription ? {
          type: latestSubscription.membershipTypeName,
          expiryDate: latestSubscription.endDate
        } : null,
        availableTypes: membershipTypes.map(t => ({
          _id: t._id,
          name: t.name,
          code: t.code,
          amount: t.amount,
          description: t.description
        }))
      };
    }));

    res.status(200).json({
      success: true,
      count: enrichedClubs.length,
      data: enrichedClubs
    });
  } catch (error) {
    console.error('Search clubs error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search clubs',
      error: error.message
    });
  }
};

// @desc    Initialize public club affiliation payment
// @route   POST /api/membership/club/public-payment/initialize
// @access  Public
export const initializePublicClubPayment = async (req, res) => {
  try {
    const { clubId, membershipTypeId, payer, year } = req.body;
    const EARLIEST_PAYABLE_YEAR = 2024;

    // Extract payer details from nested object
    const payerName = payer?.name;
    const payerEmail = payer?.email;
    const payerPhone = payer?.phone;
    const payerRelation = payer?.relation;

    // Validation
    if (!clubId || !membershipTypeId) {
      return res.status(400).json({
        success: false,
        message: 'Club ID and membership type are required'
      });
    }

    if (!payerName || !payerEmail) {
      return res.status(400).json({
        success: false,
        message: 'Payer name and email are required'
      });
    }

    // Get club
    const club = await Club.findById(clubId);
    if (!club) {
      return res.status(404).json({
        success: false,
        message: 'Club not found'
      });
    }

    // Get membership type
    const membershipType = await MembershipType.findById(membershipTypeId);
    if (!membershipType || !membershipType.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Membership type not found or inactive'
      });
    }

    if (membershipType.category !== 'club') {
      return res.status(400).json({
        success: false,
        message: 'This membership type is for clubs only'
      });
    }

    // Determine the payment year (default to current year for backward compatibility)
    const currentYear = MembershipSubscription.getCurrentYear();
    const paymentYear = year ? parseInt(year, 10) : currentYear;

    // Validate year range
    if (paymentYear < EARLIEST_PAYABLE_YEAR || paymentYear > currentYear) {
      return res.status(400).json({
        success: false,
        message: `Payment year must be between ${EARLIEST_PAYABLE_YEAR} and ${currentYear}`
      });
    }

    // Check for existing active subscription for the requested year
    const existingActive = await MembershipSubscription.findOne({
      entityId: club._id,
      entityType: 'club',
      year: paymentYear,
      status: 'active'
    });

    if (existingActive) {
      return res.status(400).json({
        success: false,
        message: `${club.name} already has an active affiliation for ${paymentYear}`
      });
    }

    // Enforce oldest-first: check if there are unpaid years older than the requested year
    if (paymentYear > EARLIEST_PAYABLE_YEAR) {
      const olderActiveSubscriptions = await MembershipSubscription.find({
        entityId: club._id,
        entityType: 'club',
        year: { $gte: EARLIEST_PAYABLE_YEAR, $lt: paymentYear },
        status: 'active'
      });
      const paidOlderYears = new Set(olderActiveSubscriptions.map(s => s.year));
      for (let y = EARLIEST_PAYABLE_YEAR; y < paymentYear; y++) {
        if (!paidOlderYears.has(y)) {
          return res.status(400).json({
            success: false,
            message: `Please pay for ${y} first. Arrears must be paid starting from the oldest year.`
          });
        }
      }
    }

    // Generate payment reference
    const reference = `CLUB-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    // Create or update pending subscription
    let subscription = await MembershipSubscription.findOne({
      entityId: club._id,
      entityType: 'club',
      year: paymentYear,
      status: 'pending'
    });

    if (subscription) {
      subscription.membershipType = membershipType._id;
      subscription.membershipTypeName = membershipType.name;
      subscription.membershipTypeCode = membershipType.code;
      subscription.amount = membershipType.amount;
      subscription.paymentReference = reference;
      subscription.notes = `Payment by ${payerName} (${payerRelation || 'N/A'}) for ${paymentYear}`;
      await subscription.save();
    } else {
      subscription = new MembershipSubscription({
        entityType: 'club',
        entityId: club._id,
        entityModel: 'Club',
        entityName: club.name,
        membershipType: membershipType._id,
        membershipTypeName: membershipType.name,
        membershipTypeCode: membershipType.code,
        year: paymentYear,
        startDate: new Date(),
        endDate: MembershipSubscription.getYearEndDate(paymentYear),
        amount: membershipType.amount,
        currency: membershipType.currency,
        paymentReference: reference,
        status: 'pending',
        notes: `Payment by ${payerName} (${payerRelation || 'N/A'}) for ${paymentYear}`
      });
      await subscription.save();
    }

    res.status(200).json({
      success: true,
      data: {
        reference,
        amount: membershipType.amount,
        currency: membershipType.currency,
        publicKey: process.env.LENCO_PUBLIC_KEY,
        club: {
          id: club._id,
          name: club.name
        },
        membershipType: {
          id: membershipType._id,
          name: membershipType.name,
          code: membershipType.code
        },
        payer: {
          name: payerName,
          email: payerEmail,
          phone: payerPhone,
          relation: payerRelation
        },
        subscription: {
          id: subscription._id,
          year: paymentYear,
          expiryDate: subscription.endDate
        }
      }
    });
  } catch (error) {
    console.error('Initialize public club payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to initialize payment',
      error: error.message
    });
  }
};

// ============================================
// MEMBERSHIP TYPES (Admin configurable pricing)
// ============================================

// @desc    Get all membership types
// @route   GET /api/membership/types
// @access  Public
export const getMembershipTypes = async (req, res) => {
  try {
    const { category, activeOnly = 'true' } = req.query;

    const query = {};
    if (category) query.category = category;
    if (activeOnly === 'true') query.isActive = true;

    const types = await MembershipType.find(query).sort({ category: 1, sortOrder: 1 });

    res.status(200).json({
      success: true,
      count: types.length,
      data: types
    });
  } catch (error) {
    console.error('Get membership types error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get membership types',
      error: error.message
    });
  }
};

// @desc    Get single membership type
// @route   GET /api/membership/types/:id
// @access  Public
export const getMembershipType = async (req, res) => {
  try {
    const type = await MembershipType.findById(req.params.id);

    if (!type) {
      return res.status(404).json({
        success: false,
        message: 'Membership type not found'
      });
    }

    res.status(200).json({
      success: true,
      data: type
    });
  } catch (error) {
    console.error('Get membership type error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get membership type',
      error: error.message
    });
  }
};

// @desc    Create membership type
// @route   POST /api/membership/types
// @access  Private (Admin)
export const createMembershipType = async (req, res) => {
  try {
    const type = await MembershipType.create(req.body);

    res.status(201).json({
      success: true,
      message: 'Membership type created successfully',
      data: type
    });
  } catch (error) {
    console.error('Create membership type error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create membership type',
      error: error.message
    });
  }
};

// @desc    Update membership type
// @route   PUT /api/membership/types/:id
// @access  Private (Admin)
export const updateMembershipType = async (req, res) => {
  try {
    const type = await MembershipType.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!type) {
      return res.status(404).json({
        success: false,
        message: 'Membership type not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Membership type updated successfully',
      data: type
    });
  } catch (error) {
    console.error('Update membership type error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update membership type',
      error: error.message
    });
  }
};

// @desc    Delete membership type (soft delete - just deactivate)
// @route   DELETE /api/membership/types/:id
// @access  Private (Admin)
export const deleteMembershipType = async (req, res) => {
  try {
    const type = await MembershipType.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!type) {
      return res.status(404).json({
        success: false,
        message: 'Membership type not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Membership type deactivated successfully',
      data: type
    });
  } catch (error) {
    console.error('Delete membership type error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete membership type',
      error: error.message
    });
  }
};

// ============================================
// MEMBERSHIP SUBSCRIPTIONS
// ============================================

// @desc    Get subscription status for current user
// @route   GET /api/membership/my-subscription
// @access  Private
export const getMySubscription = async (req, res) => {
  try {
    const subscription = await MembershipSubscription.getActiveSubscription(
      req.user.id,
      'player'
    );

    res.status(200).json({
      success: true,
      data: {
        hasActiveSubscription: !!subscription,
        subscription,
        currentYear: MembershipSubscription.getCurrentYear(),
        yearEndDate: MembershipSubscription.getYearEndDate()
      }
    });
  } catch (error) {
    console.error('Get my subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get subscription status',
      error: error.message
    });
  }
};

// @desc    Initialize membership payment
// @route   POST /api/membership/initialize-payment
// @access  Private
export const initializeMembershipPayment = async (req, res) => {
  try {
    const { membershipTypeId } = req.body;
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get membership type
    const membershipType = await MembershipType.findById(membershipTypeId);

    if (!membershipType || !membershipType.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Membership type not found or inactive'
      });
    }

    if (membershipType.category !== 'player') {
      return res.status(400).json({
        success: false,
        message: 'This endpoint is for player memberships only. Use club endpoint for club affiliations.'
      });
    }

    // Check for existing active subscription
    const currentYear = MembershipSubscription.getCurrentYear();
    const existingActive = await MembershipSubscription.findOne({
      entityId: user._id,
      entityType: 'player',
      year: currentYear,
      status: 'active'
    });

    if (existingActive) {
      return res.status(400).json({
        success: false,
        message: `You already have an active membership for ${currentYear}`,
        data: { subscription: existingActive }
      });
    }

    // Create pending subscription
    const subscription = await MembershipSubscription.createSubscription({
      entityType: 'player',
      entityId: user._id,
      entityModel: 'User',
      entityName: `${user.firstName} ${user.lastName}`,
      membershipType: membershipType._id,
      membershipTypeName: membershipType.name,
      membershipTypeCode: membershipType.code,
      amount: membershipType.amount,
      currency: membershipType.currency,
      status: 'pending'
    });

    // Generate payment reference
    const reference = `MEM-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    subscription.paymentReference = reference;
    await subscription.save();

    res.status(200).json({
      success: true,
      data: {
        reference,
        amount: membershipType.amount,
        currency: membershipType.currency,
        email: user.email,
        publicKey: process.env.LENCO_PUBLIC_KEY,
        membershipType: {
          id: membershipType._id,
          name: membershipType.name,
          code: membershipType.code
        },
        subscription: {
          id: subscription._id,
          year: subscription.year,
          endDate: subscription.endDate
        }
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

// @desc    Initialize club affiliation payment
// @route   POST /api/membership/club/initialize-payment
// @access  Private (Club admin or site admin)
export const initializeClubPayment = async (req, res) => {
  try {
    const { membershipTypeId, clubId } = req.body;

    // Get club
    const club = await Club.findById(clubId);
    if (!club) {
      return res.status(404).json({
        success: false,
        message: 'Club not found'
      });
    }

    // Get membership type
    const membershipType = await MembershipType.findById(membershipTypeId);

    if (!membershipType || !membershipType.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Membership type not found or inactive'
      });
    }

    if (membershipType.category !== 'club') {
      return res.status(400).json({
        success: false,
        message: 'This endpoint is for club affiliations only'
      });
    }

    // Check for existing active subscription
    const currentYear = MembershipSubscription.getCurrentYear();
    const existingActive = await MembershipSubscription.findOne({
      entityId: club._id,
      entityType: 'club',
      year: currentYear,
      status: 'active'
    });

    if (existingActive) {
      return res.status(400).json({
        success: false,
        message: `Club already has an active affiliation for ${currentYear}`,
        data: { subscription: existingActive }
      });
    }

    // Create pending subscription
    const subscription = await MembershipSubscription.createSubscription({
      entityType: 'club',
      entityId: club._id,
      entityModel: 'Club',
      entityName: club.name,
      membershipType: membershipType._id,
      membershipTypeName: membershipType.name,
      membershipTypeCode: membershipType.code,
      amount: membershipType.amount,
      currency: membershipType.currency,
      status: 'pending'
    });

    // Generate payment reference
    const reference = `CLUB-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    subscription.paymentReference = reference;
    await subscription.save();

    const user = await User.findById(req.user.id);

    res.status(200).json({
      success: true,
      data: {
        reference,
        amount: membershipType.amount,
        currency: membershipType.currency,
        email: user?.email || club.email,
        publicKey: process.env.LENCO_PUBLIC_KEY,
        membershipType: {
          id: membershipType._id,
          name: membershipType.name,
          code: membershipType.code
        },
        club: {
          id: club._id,
          name: club.name
        },
        subscription: {
          id: subscription._id,
          year: subscription.year,
          endDate: subscription.endDate
        }
      }
    });
  } catch (error) {
    console.error('Initialize club payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to initialize payment',
      error: error.message
    });
  }
};

// @desc    Verify membership payment and activate subscription
// @route   POST /api/membership/verify-payment
// @access  Public
export const verifyMembershipPayment = async (req, res) => {
  try {
    const { reference, transactionId } = req.body;

    // Find subscription by payment reference
    const subscription = await MembershipSubscription.findOne({ paymentReference: reference })
      .populate('membershipType');

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found for this payment reference'
      });
    }

    if (subscription.status === 'active') {
      return res.status(200).json({
        success: true,
        message: 'Subscription already active',
        data: { subscription }
      });
    }

    // Activate subscription
    await subscription.activate({
      reference,
      transactionId
    });

    // Update entity (User or Club)
    if (subscription.entityType === 'player') {
      const user = await User.findById(subscription.entityId);
      if (user) {
        const updates = {
          membershipType: subscription.membershipTypeCode,
          membershipStatus: 'active',
          membershipExpiry: subscription.endDate,
          lastPaymentDate: new Date(),
          lastPaymentAmount: subscription.amount,
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
        await subscription.save();
      }
    } else if (subscription.entityType === 'club') {
      const club = await Club.findById(subscription.entityId);
      if (club) {
        club.affiliationStatus = 'active';
        club.affiliationType = subscription.membershipTypeCode;
        club.affiliationExpiry = subscription.endDate;
        await club.save();
      }
    }

    // Create transaction record for income tracking
    const transaction = await Transaction.create({
      reference,
      transactionId,
      type: 'membership',
      amount: subscription.amount,
      currency: subscription.currency,
      payerName: subscription.payer?.name || subscription.entityName,
      payerEmail: subscription.payer?.email || null,
      status: 'completed',
      paymentGateway: 'lenco',
      relatedId: subscription._id,
      relatedModel: 'MembershipSubscription',
      description: `${subscription.membershipTypeName} - ${subscription.year}`,
      metadata: {
        membershipType: subscription.membershipTypeCode,
        membershipYear: subscription.year,
        entityType: subscription.entityType,
        playerName: subscription.entityName,
        zpin: subscription.zpin
      },
      paymentDate: new Date()
    });

    // Update subscription with receipt number
    subscription.receiptNumber = transaction.receiptNumber;
    await subscription.save();

    // Generate and send receipt
    try {
      const pdfBuffer = await generateReceipt(transaction);
      const email = subscription.entityType === 'player'
        ? (await User.findById(subscription.entityId))?.email
        : (await Club.findById(subscription.entityId))?.email;

      if (email) {
        await sendEmail({
          email,
          subject: `Membership Payment Receipt - ${transaction.receiptNumber} - ZTA`,
          html: `
            <h2>Membership Payment Confirmed!</h2>
            <p>Dear ${subscription.entityName},</p>
            <p>Your ${subscription.membershipTypeName} has been successfully processed.</p>
            <p><strong>Details:</strong></p>
            <ul>
              <li>Receipt Number: ${transaction.receiptNumber}</li>
              <li>Membership: ${subscription.membershipTypeName}</li>
              <li>Amount: K${subscription.amount}</li>
              <li>Valid Until: December 31, ${subscription.year}</li>
              ${subscription.zpin ? `<li>ZPIN: ${subscription.zpin}</li>` : ''}
            </ul>
            <p>Please find your official receipt attached.</p>
            <p>Thank you for being a member of the Zambia Tennis Association!</p>
          `,
          attachments: [{
            filename: `ZTA-Receipt-${transaction.receiptNumber}.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf'
          }]
        });
      }
    } catch (emailError) {
      console.error('Failed to send receipt email:', emailError);
    }

    res.status(200).json({
      success: true,
      message: 'Membership activated successfully',
      data: {
        subscription,
        receiptNumber: transaction.receiptNumber,
        zpin: subscription.zpin,
        expiryDate: subscription.endDate
      }
    });
  } catch (error) {
    console.error('Verify membership payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify payment',
      error: error.message
    });
  }
};

// @desc    Get all subscriptions (admin)
// @route   GET /api/membership/subscriptions
// @access  Private (Admin)
export const getSubscriptions = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      entityType,
      status,
      year,
      search
    } = req.query;

    const query = {};

    if (entityType) query.entityType = entityType;
    if (status) query.status = status;
    if (year) query.year = parseInt(year);
    if (search) {
      query.$or = [
        { entityName: { $regex: search, $options: 'i' } },
        { zpin: { $regex: search, $options: 'i' } },
        { paymentReference: { $regex: search, $options: 'i' } }
      ];
    }

    const total = await MembershipSubscription.countDocuments(query);
    const subscriptions = await MembershipSubscription.find(query)
      .populate('membershipType')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      data: {
        subscriptions,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get subscriptions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get subscriptions',
      error: error.message
    });
  }
};

// @desc    Get subscription statistics
// @route   GET /api/membership/stats
// @access  Private (Admin)
export const getSubscriptionStats = async (req, res) => {
  try {
    const currentYear = MembershipSubscription.getCurrentYear();

    // Get counts by status and type
    const stats = await MembershipSubscription.aggregate([
      { $match: { year: currentYear } },
      {
        $group: {
          _id: { entityType: '$entityType', status: '$status' },
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      }
    ]);

    // Get total active players and clubs
    const activePlayers = await MembershipSubscription.countDocuments({
      year: currentYear,
      entityType: 'player',
      status: 'active'
    });

    const activeClubs = await MembershipSubscription.countDocuments({
      year: currentYear,
      entityType: 'club',
      status: 'active'
    });

    // Get total revenue
    const revenue = await MembershipSubscription.aggregate([
      { $match: { year: currentYear, status: 'active' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    res.status(200).json({
      success: true,
      data: {
        currentYear,
        activePlayers,
        activeClubs,
        totalRevenue: revenue[0]?.total || 0,
        breakdown: stats
      }
    });
  } catch (error) {
    console.error('Get subscription stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get statistics',
      error: error.message
    });
  }
};

// @desc    Record manual/offline payment (admin)
// @route   POST /api/membership/record-payment
// @access  Private (Admin)
export const recordManualPayment = async (req, res) => {
  try {
    const {
      entityType,
      entityId,
      membershipTypeId,
      amount,
      paymentMethod,
      transactionReference,
      notes,
      year
    } = req.body;

    // Validate year if provided
    const EARLIEST_PAYABLE_YEAR = 2024;
    const currentYear = MembershipSubscription.getCurrentYear();
    if (year) {
      const paymentYear = parseInt(year, 10);
      if (paymentYear < EARLIEST_PAYABLE_YEAR || paymentYear > currentYear) {
        return res.status(400).json({
          success: false,
          message: `Payment year must be between ${EARLIEST_PAYABLE_YEAR} and ${currentYear}`
        });
      }
    }

    // Get membership type
    const membershipType = await MembershipType.findById(membershipTypeId);
    if (!membershipType) {
      return res.status(404).json({
        success: false,
        message: 'Membership type not found'
      });
    }

    // Get entity
    let entity, entityName, entityEmail;
    if (entityType === 'player') {
      entity = await User.findById(entityId);
      entityName = entity ? `${entity.firstName} ${entity.lastName}` : 'Unknown';
      entityEmail = entity?.email;
    } else {
      entity = await Club.findById(entityId);
      entityName = entity?.name || 'Unknown';
      entityEmail = entity?.email;
    }

    if (!entity) {
      return res.status(404).json({
        success: false,
        message: `${entityType === 'player' ? 'Player' : 'Club'} not found`
      });
    }

    // Create subscription
    const paymentYear = year ? parseInt(year, 10) : undefined;
    const subscription = await MembershipSubscription.createSubscription({
      entityType,
      entityId,
      entityModel: entityType === 'player' ? 'User' : 'Club',
      entityName,
      membershipType: membershipType._id,
      membershipTypeName: membershipType.name,
      membershipTypeCode: membershipType.code,
      amount: amount || membershipType.amount,
      currency: membershipType.currency,
      status: 'active',
      paymentMethod,
      paymentReference: transactionReference || `MANUAL-${Date.now()}`,
      paymentDate: new Date(),
      notes,
      year: paymentYear,
      processedBy: req.user.id
    });

    // Update entity
    if (entityType === 'player') {
      const playerUpdates = {
        membershipType: membershipType.code,
        membershipStatus: 'active',
        membershipExpiry: subscription.endDate,
      };
      if (!entity.zpin) {
        const year = new Date().getFullYear().toString().slice(-2);
        const count = await User.countDocuments({ zpin: { $exists: true, $ne: null } });
        playerUpdates.zpin = `ZP${year}${String(count + 1).padStart(5, '0')}`;
      }
      const updatedEntity = await User.findByIdAndUpdate(entity._id, playerUpdates, { new: true });
      subscription.zpin = updatedEntity.zpin;
      await updateTournamentEntryZpinStatus(entityId);
      await subscription.save();
    } else {
      entity.affiliationStatus = 'active';
      entity.affiliationType = membershipType.code;
      entity.affiliationExpiry = subscription.endDate;
      await entity.save();
    }

    // Create transaction record with a guaranteed-unique reference
    // Use subscription ID in reference to avoid duplicate key errors when
    // admins reuse the same bank reference for multiple players
    const txnReference = `MANUAL-${subscription._id}-${Date.now()}`;
    let transaction = await Transaction.findOne({
      relatedId: subscription._id,
      relatedModel: 'MembershipSubscription',
      status: 'completed'
    });
    if (!transaction) {
      transaction = await Transaction.create({
        reference: txnReference,
        transactionId: transactionReference || null,
        type: 'membership',
        amount: subscription.amount,
        currency: subscription.currency,
        payerName: subscription.payer?.name || entityName,
        payerEmail: subscription.payer?.email || entityEmail || null,
        status: 'completed',
        paymentGateway: 'manual',
        paymentMethod,
        relatedId: subscription._id,
        relatedModel: 'MembershipSubscription',
        description: `${membershipType.name} - ${subscription.year} (Manual)`,
        metadata: {
          membershipType: membershipType.code,
          membershipYear: subscription.year,
          membershipExpiry: subscription.endDate,
          entityType,
          recordedBy: req.user.id,
          playerName: entityName,
          zpin: subscription.zpin,
          bankReference: transactionReference || null
        },
        paymentDate: new Date()
      });
    }

    subscription.receiptNumber = transaction.receiptNumber;
    await subscription.save();

    // Generate and send receipt email
    const receiptEmail = entityEmail;
    try {
      const pdfBuffer = await generateReceipt(transaction);
      if (receiptEmail) {
        await sendEmail({
          email: receiptEmail,
          subject: `Membership Payment Receipt - ${transaction.receiptNumber} - ZTA`,
          html: `
            <h2>Membership Payment Receipt</h2>
            <p>Dear ${entityName},</p>
            <p>Your ${membershipType.name} payment has been recorded.</p>
            <p><strong>Details:</strong></p>
            <ul>
              <li>Receipt Number: ${transaction.receiptNumber}</li>
              <li>Membership: ${membershipType.name}</li>
              <li>Amount: K${subscription.amount}</li>
              <li>Valid Until: December 31, ${subscription.year}</li>
              ${subscription.zpin ? `<li>ZPIN: ${subscription.zpin}</li>` : ''}
            </ul>
            <p>Please find your official receipt attached.</p>
            <p>Thank you for being a member of the Zambia Tennis Association!</p>
          `,
          attachments: [{
            filename: `ZTA-Receipt-${transaction.receiptNumber}.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf'
          }]
        });

        transaction.receiptSentAt = new Date();
        await transaction.save();
      }
    } catch (emailError) {
      console.error('Failed to send manual payment receipt email:', emailError);
    }

    res.status(201).json({
      success: true,
      message: 'Payment recorded successfully',
      data: {
        subscription,
        transaction,
        zpin: subscription.zpin
      }
    });
  } catch (error) {
    console.error('Record manual payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to record payment',
      error: error.message
    });
  }
};

// @desc    Export subscriptions to Excel
// @route   GET /api/membership/subscriptions/export/excel
// @access  Private (Admin)
export const exportSubscriptionsExcel = async (req, res) => {
  try {
    const { entityType, status, year, search, startDate, endDate, paymentSource } = req.query;

    const query = {};
    if (entityType) query.entityType = entityType;
    if (status) query.status = status;
    if (year) query.year = parseInt(year);
    if (search) {
      query.$or = [
        { entityName: { $regex: search, $options: 'i' } },
        { zpin: { $regex: search, $options: 'i' } },
        { paymentReference: { $regex: search, $options: 'i' } }
      ];
    }
    if (startDate || endDate) {
      query.paymentDate = {};
      if (startDate) query.paymentDate.$gte = new Date(startDate);
      if (endDate) query.paymentDate.$lte = new Date(endDate);
    }
    if (paymentSource === 'manual') query.paymentMethod = { $ne: 'online' };
    else if (paymentSource === 'online') query.paymentMethod = 'online';

    const subscriptions = await MembershipSubscription.find(query)
      .populate('processedBy', 'firstName lastName')
      .sort({ createdAt: -1 });

    const excelData = subscriptions.map(sub => ({
      'Entity Name': sub.entityName || '',
      'Entity Type': sub.entityType || '',
      'ZPIN': sub.zpin || '',
      'Membership Type': sub.membershipTypeName || '',
      'Year': sub.year || '',
      'Amount': sub.amount || 0,
      'Status': sub.status || '',
      'Payment Method': sub.paymentMethod || '',
      'Payment Date': sub.paymentDate ? new Date(sub.paymentDate).toLocaleDateString() : '',
      'Receipt #': sub.receiptNumber || '',
      'Payer Name': sub.payer?.name || '',
      'Payer Email': sub.payer?.email || '',
      'Processed By': sub.processedBy ? `${sub.processedBy.firstName} ${sub.processedBy.lastName}` : ''
    }));

    const workbook = xlsx.utils.book_new();
    const worksheet = xlsx.utils.json_to_sheet(excelData);
    worksheet['!cols'] = [
      { wch: 25 }, { wch: 12 }, { wch: 12 }, { wch: 20 }, { wch: 8 },
      { wch: 12 }, { wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 22 },
      { wch: 20 }, { wch: 25 }, { wch: 20 }
    ];
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Subscriptions');

    const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    const filename = `ZTA_Subscriptions_${new Date().toISOString().split('T')[0]}.xlsx`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (error) {
    console.error('Export subscriptions Excel error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export subscriptions',
      error: error.message
    });
  }
};
