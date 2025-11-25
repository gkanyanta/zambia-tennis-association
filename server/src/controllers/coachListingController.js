import CoachListing from '../models/CoachListing.js';
import Coach from '../models/Coach.js';
import CoachListingSettings from '../models/CoachListingSettings.js';

// @desc    Get all coach listings
// @route   GET /api/coach-listings
// @access  Private/Admin
export const getCoachListings = async (req, res) => {
  try {
    const { coachId, paymentStatus } = req.query;

    const query = {};
    if (coachId) query.coach = coachId;
    if (paymentStatus) query.paymentStatus = paymentStatus;

    const listings = await CoachListing.find(query)
      .populate('coach', 'firstName lastName email')
      .populate('recordedBy', 'firstName lastName')
      .populate('refundedBy', 'firstName lastName')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: listings.length,
      data: listings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get single coach listing
// @route   GET /api/coach-listings/:id
// @access  Private/Admin
export const getCoachListing = async (req, res) => {
  try {
    const listing = await CoachListing.findById(req.params.id)
      .populate('coach', 'firstName lastName email phone club')
      .populate({
        path: 'coach',
        populate: {
          path: 'club',
          select: 'name city province'
        }
      })
      .populate('recordedBy', 'firstName lastName email')
      .populate('refundedBy', 'firstName lastName email');

    if (!listing) {
      return res.status(404).json({
        success: false,
        message: 'Listing not found'
      });
    }

    res.status(200).json({
      success: true,
      data: listing
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get listings for a specific coach
// @route   GET /api/coach-listings/coach/:coachId
// @access  Private/Admin
export const getCoachListingsByCoach = async (req, res) => {
  try {
    const listings = await CoachListing.find({ coach: req.params.coachId })
      .populate('recordedBy', 'firstName lastName')
      .populate('refundedBy', 'firstName lastName')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: listings.length,
      data: listings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Create coach listing (process payment)
// @route   POST /api/coach-listings
// @access  Private/Admin
export const createCoachListing = async (req, res) => {
  try {
    const {
      coachId,
      amount,
      duration,
      paymentMethod,
      transactionReference,
      paymentDate,
      notes
    } = req.body;

    // Verify coach exists
    const coach = await Coach.findById(coachId);
    if (!coach) {
      return res.status(404).json({
        success: false,
        message: 'Coach not found'
      });
    }

    // Check if coach's club is verified
    if (coach.clubVerificationStatus !== 'verified') {
      return res.status(400).json({
        success: false,
        message: 'Coach club association must be verified before creating a listing'
      });
    }

    // Get settings to validate duration
    const settings = await CoachListingSettings.getSettings();
    if (!settings.isValidDuration(duration)) {
      return res.status(400).json({
        success: false,
        message: `Duration must be between ${settings.minListingDuration} and ${settings.maxListingDuration} months`
      });
    }

    // Calculate validity period
    const validFrom = paymentDate ? new Date(paymentDate) : new Date();
    const validUntil = new Date(validFrom);
    validUntil.setMonth(validUntil.getMonth() + parseInt(duration));

    // Create listing
    const listing = await CoachListing.create({
      coach: coachId,
      amount,
      duration,
      paymentMethod,
      transactionReference,
      paymentDate: validFrom,
      validFrom,
      validUntil,
      recordedBy: req.user._id,
      notes,
      paymentStatus: 'completed'
    });

    // Update coach
    coach.currentListingId = listing._id;
    coach.listingExpiryDate = validUntil;
    coach.listingStatus = 'active';
    coach.lastModifiedBy = req.user._id;
    await coach.save();

    // Populate listing
    await listing.populate('coach', 'firstName lastName email');
    await listing.populate('recordedBy', 'firstName lastName');

    res.status(201).json({
      success: true,
      data: listing
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Refund coach listing
// @route   PUT /api/coach-listings/:id/refund
// @access  Private/Admin
export const refundCoachListing = async (req, res) => {
  try {
    const { refundAmount, refundReason } = req.body;

    const listing = await CoachListing.findById(req.params.id);

    if (!listing) {
      return res.status(404).json({
        success: false,
        message: 'Listing not found'
      });
    }

    if (listing.paymentStatus === 'refunded') {
      return res.status(400).json({
        success: false,
        message: 'Listing is already refunded'
      });
    }

    if (listing.paymentStatus !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Only completed payments can be refunded'
      });
    }

    // Validate refund amount
    if (refundAmount > listing.amount) {
      return res.status(400).json({
        success: false,
        message: 'Refund amount cannot exceed payment amount'
      });
    }

    listing.paymentStatus = 'refunded';
    listing.refundAmount = refundAmount || listing.amount;
    listing.refundReason = refundReason || 'No reason provided';
    listing.refundDate = new Date();
    listing.refundedBy = req.user._id;

    await listing.save();

    // Update coach listing status
    const coach = await Coach.findById(listing.coach);
    if (coach) {
      coach.listingStatus = 'suspended';
      coach.currentListingId = null;
      coach.lastModifiedBy = req.user._id;
      await coach.save();
    }

    await listing.populate('coach', 'firstName lastName email');
    await listing.populate('recordedBy', 'firstName lastName');
    await listing.populate('refundedBy', 'firstName lastName');

    res.status(200).json({
      success: true,
      data: listing
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get listing settings
// @route   GET /api/coach-listings/settings
// @access  Private/Admin
export const getListingSettings = async (req, res) => {
  try {
    const settings = await CoachListingSettings.getSettings();

    res.status(200).json({
      success: true,
      data: settings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update listing settings
// @route   PUT /api/coach-listings/settings
// @access  Private/Admin
export const updateListingSettings = async (req, res) => {
  try {
    let settings = await CoachListingSettings.getSettings();

    // Update fields
    Object.keys(req.body).forEach(key => {
      if (key !== '_id' && key !== '__v') {
        settings[key] = req.body[key];
      }
    });

    settings.lastModifiedBy = req.user._id;
    await settings.save();

    res.status(200).json({
      success: true,
      data: settings
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get pricing plans
// @route   GET /api/coach-listings/pricing
// @access  Public
export const getPricingPlans = async (req, res) => {
  try {
    const settings = await CoachListingSettings.getSettings();
    const activePlans = settings.getActivePricingPlans();

    res.status(200).json({
      success: true,
      data: activePlans
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get listing revenue statistics
// @route   GET /api/coach-listings/stats/revenue
// @access  Private/Admin
export const getRevenueStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const query = { paymentStatus: 'completed' };

    if (startDate || endDate) {
      query.paymentDate = {};
      if (startDate) query.paymentDate.$gte = new Date(startDate);
      if (endDate) query.paymentDate.$lte = new Date(endDate);
    }

    const listings = await CoachListing.find(query);

    const totalRevenue = listings.reduce((sum, listing) => sum + listing.amount, 0);
    const totalRefunds = await CoachListing.aggregate([
      { $match: { paymentStatus: 'refunded' } },
      { $group: { _id: null, total: { $sum: '$refundAmount' } } }
    ]);

    const netRevenue = totalRevenue - (totalRefunds[0]?.total || 0);

    // Group by payment method
    const byPaymentMethod = listings.reduce((acc, listing) => {
      const method = listing.paymentMethod;
      if (!acc[method]) {
        acc[method] = { count: 0, amount: 0 };
      }
      acc[method].count++;
      acc[method].amount += listing.amount;
      return acc;
    }, {});

    // Group by duration
    const byDuration = listings.reduce((acc, listing) => {
      const duration = listing.duration;
      if (!acc[duration]) {
        acc[duration] = { count: 0, amount: 0 };
      }
      acc[duration].count++;
      acc[duration].amount += listing.amount;
      return acc;
    }, {});

    res.status(200).json({
      success: true,
      data: {
        totalRevenue,
        totalRefunds: totalRefunds[0]?.total || 0,
        netRevenue,
        totalListings: listings.length,
        byPaymentMethod,
        byDuration
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
