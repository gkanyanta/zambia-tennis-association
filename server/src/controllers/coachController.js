import Coach from '../models/Coach.js';
import Club from '../models/Club.js';
import CoachListing from '../models/CoachListing.js';

// @desc    Get all coaches
// @route   GET /api/coaches
// @access  Public
export const getCoaches = async (req, res) => {
  try {
    const { status, listingStatus, clubId, itfLevel } = req.query;

    // Build query
    const query = {};

    if (status) query.status = status;
    if (listingStatus) query.listingStatus = listingStatus;
    if (clubId) query.club = clubId;
    if (itfLevel) query.itfLevel = itfLevel;

    const coaches = await Coach.find(query)
      .populate('club', 'name city province')
      .populate('createdBy', 'firstName lastName')
      .populate('clubVerifiedBy', 'firstName lastName')
      .sort({ lastName: 1, firstName: 1 });

    res.status(200).json({
      success: true,
      count: coaches.length,
      data: coaches
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get active/listed coaches (for public display)
// @route   GET /api/coaches/active
// @access  Public
export const getActiveCoaches = async (req, res) => {
  try {
    const coaches = await Coach.find({
      status: 'active',
      listingStatus: 'active',
      clubVerificationStatus: 'verified',
      listingExpiryDate: { $gt: new Date() }
    })
      .populate('club', 'name city province')
      .sort({ lastName: 1, firstName: 1 });

    res.status(200).json({
      success: true,
      count: coaches.length,
      data: coaches
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get single coach
// @route   GET /api/coaches/:id
// @access  Public
export const getCoach = async (req, res) => {
  try {
    const coach = await Coach.findById(req.params.id)
      .populate('club', 'name city province email phone address')
      .populate('createdBy', 'firstName lastName email')
      .populate('clubVerifiedBy', 'firstName lastName')
      .populate('lastModifiedBy', 'firstName lastName')
      .populate('currentListingId');

    if (!coach) {
      return res.status(404).json({
        success: false,
        message: 'Coach not found'
      });
    }

    // Get listing history
    const listingHistory = await CoachListing.find({ coach: coach._id })
      .populate('recordedBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .limit(10);

    res.status(200).json({
      success: true,
      data: {
        ...coach.toObject(),
        listingHistory
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Create coach
// @route   POST /api/coaches
// @access  Private/Admin
export const createCoach = async (req, res) => {
  try {
    // Verify club exists and is active
    const club = await Club.findById(req.body.club);
    if (!club) {
      return res.status(400).json({
        success: false,
        message: 'Invalid club ID'
      });
    }

    if (club.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'Club must be active to add coaches'
      });
    }

    // Add createdBy
    req.body.createdBy = req.user._id;

    const coach = await Coach.create(req.body);

    // Populate club data
    await coach.populate('club', 'name city province');

    res.status(201).json({
      success: true,
      data: coach
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'A coach with this email already exists'
      });
    }
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update coach
// @route   PUT /api/coaches/:id
// @access  Private/Admin
export const updateCoach = async (req, res) => {
  try {
    // If club is being updated, verify it exists and is active
    if (req.body.club) {
      const club = await Club.findById(req.body.club);
      if (!club) {
        return res.status(400).json({
          success: false,
          message: 'Invalid club ID'
        });
      }

      if (club.status !== 'active') {
        return res.status(400).json({
          success: false,
          message: 'Club must be active'
        });
      }
    }

    // Add lastModifiedBy
    req.body.lastModifiedBy = req.user._id;

    const coach = await Coach.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    ).populate('club', 'name city province');

    if (!coach) {
      return res.status(404).json({
        success: false,
        message: 'Coach not found'
      });
    }

    res.status(200).json({
      success: true,
      data: coach
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete coach
// @route   DELETE /api/coaches/:id
// @access  Private/Admin
export const deleteCoach = async (req, res) => {
  try {
    const coach = await Coach.findById(req.params.id);

    if (!coach) {
      return res.status(404).json({
        success: false,
        message: 'Coach not found'
      });
    }

    // Check if coach has active listings
    const activeListings = await CoachListing.countDocuments({
      coach: coach._id,
      paymentStatus: 'completed',
      validUntil: { $gt: new Date() }
    });

    if (activeListings > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete coach with active listings. Please wait for listings to expire or refund them first.'
      });
    }

    await coach.deleteOne();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Verify club association
// @route   PUT /api/coaches/:id/verify-club
// @access  Private/Admin
export const verifyClubAssociation = async (req, res) => {
  try {
    const { status, reason } = req.body;

    if (!['verified', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be either verified or rejected'
      });
    }

    const coach = await Coach.findById(req.params.id);

    if (!coach) {
      return res.status(404).json({
        success: false,
        message: 'Coach not found'
      });
    }

    coach.clubVerificationStatus = status;
    coach.clubVerifiedBy = req.user._id;
    coach.clubVerifiedAt = new Date();

    if (status === 'rejected') {
      coach.clubRejectionReason = reason || 'No reason provided';
      coach.listingStatus = 'suspended';
    }

    await coach.save();
    await coach.populate('club', 'name city province');

    res.status(200).json({
      success: true,
      data: coach
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update listing status
// @route   PUT /api/coaches/:id/listing-status
// @access  Private/Admin
export const updateListingStatus = async (req, res) => {
  try {
    const { listingStatus } = req.body;

    if (!['pending', 'active', 'suspended', 'expired'].includes(listingStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid listing status'
      });
    }

    const coach = await Coach.findById(req.params.id);

    if (!coach) {
      return res.status(404).json({
        success: false,
        message: 'Coach not found'
      });
    }

    coach.listingStatus = listingStatus;
    coach.lastModifiedBy = req.user._id;

    await coach.save();
    await coach.populate('club', 'name city province');

    res.status(200).json({
      success: true,
      data: coach
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get coaches expiring soon
// @route   GET /api/coaches/expiring-soon
// @access  Private/Admin
export const getCoachesExpiringSoon = async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    const coaches = await Coach.find({
      listingStatus: 'active',
      listingExpiryDate: {
        $gt: new Date(),
        $lte: futureDate
      }
    })
      .populate('club', 'name city province')
      .sort({ listingExpiryDate: 1 });

    res.status(200).json({
      success: true,
      count: coaches.length,
      data: coaches
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get expired coaches
// @route   GET /api/coaches/expired
// @access  Private/Admin
export const getExpiredCoaches = async (req, res) => {
  try {
    const coaches = await Coach.find({
      listingExpiryDate: { $lt: new Date() },
      listingStatus: { $ne: 'expired' }
    })
      .populate('club', 'name city province')
      .sort({ listingExpiryDate: -1 });

    res.status(200).json({
      success: true,
      count: coaches.length,
      data: coaches
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
