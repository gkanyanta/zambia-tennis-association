import Payment from '../models/Payment.js';
import User from '../models/User.js';
import Club from '../models/Club.js';
import Settings from '../models/Settings.js';

// @desc    Record a new payment
// @route   POST /api/membership-payments
// @access  Private/Admin
export const recordPayment = async (req, res) => {
  try {
    const {
      entityType,
      entityId,
      membershipType,
      amount,
      paymentMethod,
      transactionReference,
      paymentDate,
      notes
    } = req.body;

    // Validate entity exists
    let entity;
    let entityModel;
    let entityName;

    if (entityType === 'player') {
      entity = await User.findById(entityId);
      if (!entity) {
        return res.status(404).json({
          success: false,
          message: 'Player not found'
        });
      }
      entityModel = 'User';
      entityName = `${entity.firstName} ${entity.lastName}`;
    } else if (entityType === 'club') {
      entity = await Club.findById(entityId);
      if (!entity) {
        return res.status(404).json({
          success: false,
          message: 'Club not found'
        });
      }
      entityModel = 'Club';
      entityName = entity.name;
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid entity type'
        });
    }

    // Get settings
    const settings = await Settings.getSettings();

    // Calculate validity dates - ALL memberships expire on December 31st of the payment year
    const validFrom = paymentDate ? new Date(paymentDate) : new Date();
    const currentYear = validFrom.getFullYear();
    const validUntil = new Date(currentYear, 11, 31, 23, 59, 59); // Dec 31, 11:59:59 PM

    // Calculate payment allocation (arrears first, then current year)
    let remainingAmount = amount;
    let paidArrears = 0;
    let paidCurrentYear = 0;
    const clearedArrears = [];

    // Get current outstanding balance
    const outstandingBalance = entity.outstandingBalance || 0;

    // Apply payment to arrears first
    if (outstandingBalance > 0 && remainingAmount > 0) {
      const arrearsPayment = Math.min(remainingAmount, outstandingBalance);
      paidArrears = arrearsPayment;
      remainingAmount -= arrearsPayment;

      // Clear specific arrears entries (oldest first)
      let amountToClear = arrearsPayment;
      const sortedArrears = (entity.arrears || []).sort((a, b) => a.year - b.year);

      for (const arrear of sortedArrears) {
        if (amountToClear <= 0) break;

        const amountToApply = Math.min(amountToClear, arrear.amount);
        if (amountToApply >= arrear.amount) {
          // Fully paid this year's arrears
          clearedArrears.push(arrear.year);
        }
        amountToClear -= amountToApply;
      }
    }

    // Remaining amount goes to current year
    paidCurrentYear = remainingAmount;

    // Create payment record with allocation details
    const payment = await Payment.create({
      entityType,
      entityId,
      entityModel,
      entityName,
      amount,
      membershipType,
      paymentMethod: paymentMethod || 'cash',
      transactionReference,
      paymentDate: validFrom,
      validFrom,
      validUntil,
      recordedBy: req.user._id,
      notes: notes ? `${notes}\nPayment Allocation: Arrears K${paidArrears.toFixed(2)}, Current Year K${paidCurrentYear.toFixed(2)}` : `Payment Allocation: Arrears K${paidArrears.toFixed(2)}, Current Year K${paidCurrentYear.toFixed(2)}`,
      status: 'completed'
    });

    // Update entity with payment info and arrears
    if (entityType === 'player') {
      // Update membership type if changed
      if (membershipType === 'international') {
        entity.isInternational = true;
        entity.membershipType = 'adult'; // International are adults
      } else if (membershipType) {
        entity.membershipType = membershipType;
      }

      // Clear paid arrears
      entity.arrears = (entity.arrears || []).filter(a => !clearedArrears.includes(a.year));
      entity.outstandingBalance = Math.max(0, (entity.outstandingBalance || 0) - paidArrears);

      // Update payment tracking
      entity.lastPaymentDate = validFrom;
      entity.lastPaymentAmount = amount;
      entity.lastPaymentId = payment._id;

      // Determine if current year is fully paid
      const currentYearFee = entity.isInternational
        ? settings.membershipFees.international
        : (entity.membershipType === 'junior' ? settings.membershipFees.junior : settings.membershipFees.adult);

      if (paidCurrentYear >= currentYearFee) {
        // Fully paid for current year
        entity.membershipExpiry = validUntil;
        entity.membershipStatus = 'active';
      } else if (paidCurrentYear > 0) {
        // Partially paid - still expired until full payment
        entity.membershipStatus = entity.membershipExpiry && entity.membershipExpiry > new Date() ? entity.membershipStatus : 'expired';
      }

      await entity.save();
    } else if (entityType === 'club') {
      // Clear paid arrears
      entity.arrears = (entity.arrears || []).filter(a => !clearedArrears.includes(a.year));
      entity.outstandingBalance = Math.max(0, (entity.outstandingBalance || 0) - paidArrears);

      // Update payment tracking
      entity.lastPaymentDate = validFrom;
      entity.lastPaymentAmount = amount;
      entity.lastPaymentId = payment._id;

      // Determine if current year is fully paid
      const currentYearFee = settings.clubAffiliationFee || 0;

      if (paidCurrentYear >= currentYearFee) {
        // Fully paid for current year
        entity.affiliationExpiry = validUntil;
        entity.status = 'active';
      } else if (paidCurrentYear > 0) {
        // Partially paid - still inactive until full payment
        entity.status = entity.affiliationExpiry && entity.affiliationExpiry > new Date() ? entity.status : 'inactive';
      }

      await entity.save();
    }

    // Populate the payment with full details
    await payment.populate('recordedBy', 'firstName lastName email');

    res.status(201).json({
      success: true,
      data: payment,
      message: `Payment recorded successfully for ${entityName}`
    });
  } catch (error) {
    console.error('Record payment error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get all payments with filters
// @route   GET /api/membership-payments
// @access  Private/Admin
export const getPayments = async (req, res) => {
  try {
    const {
      entityType,
      entityId,
      membershipType,
      status,
      startDate,
      endDate,
      page = 1,
      limit = 50
    } = req.query;

    // Build filter query
    const query = {};

    if (entityType) query.entityType = entityType;
    if (entityId) query.entityId = entityId;
    if (membershipType) query.membershipType = membershipType;
    if (status) query.status = status;

    if (startDate || endDate) {
      query.paymentDate = {};
      if (startDate) query.paymentDate.$gte = new Date(startDate);
      if (endDate) query.paymentDate.$lte = new Date(endDate);
    }

    // Execute query with pagination
    const payments = await Payment.find(query)
      .populate('recordedBy', 'firstName lastName email')
      .sort({ paymentDate: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const count = await Payment.countDocuments(query);

    res.status(200).json({
      success: true,
      count: payments.length,
      total: count,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page),
      data: payments
    });
  } catch (error) {
    console.error('Get payments error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get payment by ID
// @route   GET /api/membership-payments/:id
// @access  Private/Admin
export const getPayment = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate('recordedBy', 'firstName lastName email');

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    res.status(200).json({
      success: true,
      data: payment
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get payments for a specific entity (player or club)
// @route   GET /api/membership-payments/entity/:entityType/:entityId
// @access  Private/Admin
export const getEntityPayments = async (req, res) => {
  try {
    const { entityType, entityId } = req.params;

    const payments = await Payment.find({ entityType, entityId })
      .populate('recordedBy', 'firstName lastName email')
      .sort({ paymentDate: -1 });

    res.status(200).json({
      success: true,
      count: payments.length,
      data: payments
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get payment statistics
// @route   GET /api/membership-payments/stats
// @access  Private/Admin
export const getPaymentStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    // Build date filter
    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.paymentDate = {};
      if (startDate) dateFilter.paymentDate.$gte = new Date(startDate);
      if (endDate) dateFilter.paymentDate.$lte = new Date(endDate);
    }

    // Total revenue
    const revenueByType = await Payment.aggregate([
      { $match: { status: 'completed', ...dateFilter } },
      {
        $group: {
          _id: '$membershipType',
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]);

    // Total revenue
    const totalRevenue = revenueByType.reduce((sum, item) => sum + item.total, 0);
    const totalPayments = revenueByType.reduce((sum, item) => sum + item.count, 0);

    // Expiring soon (next 30 days)
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const expiringSoon = await Payment.countDocuments({
      status: 'completed',
      validUntil: {
        $gte: new Date(),
        $lte: thirtyDaysFromNow
      }
    });

    // Already expired
    const expired = await Payment.countDocuments({
      status: 'completed',
      validUntil: { $lt: new Date() }
    });

    res.status(200).json({
      success: true,
      data: {
        totalRevenue,
        totalPayments,
        revenueByType,
        expiringSoon,
        expired
      }
    });
  } catch (error) {
    console.error('Get payment stats error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get expiring memberships
// @route   GET /api/membership-payments/expiring
// @access  Private/Admin
export const getExpiringMemberships = async (req, res) => {
  try {
    const { days = 30 } = req.query;

    const daysFromNow = new Date();
    daysFromNow.setDate(daysFromNow.getDate() + parseInt(days));

    const expiringPayments = await Payment.find({
      status: 'completed',
      validUntil: {
        $gte: new Date(),
        $lte: daysFromNow
      }
    })
      .populate('recordedBy', 'firstName lastName')
      .sort({ validUntil: 1 });

    res.status(200).json({
      success: true,
      count: expiringPayments.length,
      data: expiringPayments
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Calculate suggested payment amount
// @route   GET /api/membership-payments/calculate-amount/:entityType/:entityId
// @access  Private/Admin
export const calculatePaymentAmount = async (req, res) => {
  try {
    const { entityType, entityId } = req.params;

    const settings = await Settings.getSettings();
    let amount = 0;
    let membershipType = '';

    if (entityType === 'player') {
      const player = await User.findById(entityId);
      if (!player) {
        return res.status(404).json({
          success: false,
          message: 'Player not found'
        });
      }

      // Determine membership type and amount
      if (player.isInternational) {
        amount = settings.membershipFees.international;
        membershipType = 'international';
      } else if (player.membershipType === 'junior') {
        amount = settings.membershipFees.junior;
        membershipType = 'junior';
      } else {
        amount = settings.membershipFees.adult;
        membershipType = 'adult';
      }
    } else if (entityType === 'club') {
      const club = await Club.findById(entityId);
      if (!club) {
        return res.status(404).json({
          success: false,
          message: 'Club not found'
        });
      }

      amount = settings.clubAffiliationFee;
      membershipType = 'club_affiliation';
    }

    res.status(200).json({
      success: true,
      data: {
        amount,
        membershipType,
        currency: settings.currency
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Calculate total amount due including arrears
// @route   GET /api/membership-payments/total-due/:entityType/:entityId
// @access  Private/Admin
export const calculateTotalAmountDue = async (req, res) => {
  try {
    const { entityType, entityId } = req.params;

    const settings = await Settings.getSettings();
    let entity;
    let currentYearFee = 0;
    let membershipType = '';

    if (entityType === 'player') {
      entity = await User.findById(entityId);
      if (!entity) {
        return res.status(404).json({
          success: false,
          message: 'Player not found'
        });
      }

      // Determine current year fee
      if (entity.isInternational) {
        currentYearFee = settings.membershipFees.international;
        membershipType = 'international';
      } else if (entity.membershipType === 'junior') {
        currentYearFee = settings.membershipFees.junior;
        membershipType = 'junior';
      } else {
        currentYearFee = settings.membershipFees.adult;
        membershipType = 'adult';
      }
    } else if (entityType === 'club') {
      entity = await Club.findById(entityId);
      if (!entity) {
        return res.status(404).json({
          success: false,
          message: 'Club not found'
        });
      }

      currentYearFee = settings.clubAffiliationFee;
      membershipType = 'club_affiliation';
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid entity type'
      });
    }

    // Get outstanding balance (arrears from previous years)
    const outstandingBalance = entity.outstandingBalance || 0;

    // Calculate total amount due
    const totalAmountDue = outstandingBalance + currentYearFee;

    // Get arrears breakdown
    const arrearsBreakdown = (entity.arrears || []).map(arrear => ({
      year: arrear.year,
      amount: arrear.amount,
      membershipType: arrear.membershipType,
      addedOn: arrear.addedOn
    }));

    res.status(200).json({
      success: true,
      data: {
        currentYearFee,
        outstandingBalance,
        totalAmountDue,
        membershipType,
        currency: settings.currency,
        arrears: arrearsBreakdown,
        breakdown: {
          arrears: outstandingBalance,
          currentYear: currentYearFee
        }
      }
    });
  } catch (error) {
    console.error('Calculate total amount due error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
