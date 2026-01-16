import MembershipType from '../models/MembershipType.js';
import MembershipSubscription from '../models/MembershipSubscription.js';
import User from '../models/User.js';
import Club from '../models/Club.js';
import Transaction from '../models/Transaction.js';
import { generateReceipt } from '../utils/generateReceipt.js';
import sendEmail from '../utils/sendEmail.js';

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
        user.lastPaymentAmount = subscription.amount;
        await user.save();

        subscription.zpin = user.zpin;
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
      payerName: subscription.entityName,
      payerEmail: subscription.entityType === 'player'
        ? (await User.findById(subscription.entityId))?.email
        : (await Club.findById(subscription.entityId))?.email,
      status: 'completed',
      paymentGateway: 'lenco',
      relatedId: subscription._id,
      relatedModel: 'MembershipSubscription',
      description: `${subscription.membershipTypeName} - ${subscription.year}`,
      metadata: {
        membershipType: subscription.membershipTypeCode,
        membershipYear: subscription.year,
        entityType: subscription.entityType,
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
      notes
    } = req.body;

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
      processedBy: req.user.id
    });

    // Update entity
    if (entityType === 'player') {
      if (!entity.zpin) {
        const year = new Date().getFullYear().toString().slice(-2);
        const count = await User.countDocuments({ zpin: { $exists: true, $ne: null } });
        entity.zpin = `ZP${year}${String(count + 1).padStart(5, '0')}`;
      }
      entity.membershipType = membershipType.code;
      entity.membershipStatus = 'active';
      entity.membershipExpiry = subscription.endDate;
      await entity.save();
      subscription.zpin = entity.zpin;
      await subscription.save();
    } else {
      entity.affiliationStatus = 'active';
      entity.affiliationType = membershipType.code;
      entity.affiliationExpiry = subscription.endDate;
      await entity.save();
    }

    // Create transaction record
    const transaction = await Transaction.create({
      reference: subscription.paymentReference,
      type: 'membership',
      amount: subscription.amount,
      currency: subscription.currency,
      payerName: entityName,
      payerEmail: entityEmail,
      status: 'completed',
      paymentGateway: 'manual',
      paymentMethod,
      relatedId: subscription._id,
      relatedModel: 'MembershipSubscription',
      description: `${membershipType.name} - ${subscription.year} (Manual)`,
      metadata: {
        membershipType: membershipType.code,
        membershipYear: subscription.year,
        entityType,
        recordedBy: req.user.id
      },
      paymentDate: new Date()
    });

    subscription.receiptNumber = transaction.receiptNumber;
    await subscription.save();

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
