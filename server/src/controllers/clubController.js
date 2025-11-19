import Club from '../models/Club.js';
import User from '../models/User.js';

// @desc    Get all clubs
// @route   GET /api/clubs
// @access  Public
export const getClubs = async (req, res) => {
  try {
    const clubs = await Club.find().sort({ name: 1 });
    res.status(200).json({
      success: true,
      count: clubs.length,
      data: clubs
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get single club
// @route   GET /api/clubs/:id
// @access  Public
export const getClub = async (req, res) => {
  try {
    const club = await Club.findById(req.params.id);

    if (!club) {
      return res.status(404).json({
        success: false,
        message: 'Club not found'
      });
    }

    // Get club members
    const members = await User.find({ club: club.name, role: 'player' })
      .select('firstName lastName email zpin membershipType membershipStatus')
      .sort({ lastName: 1 });

    res.status(200).json({
      success: true,
      data: {
        ...club.toObject(),
        members
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Create club
// @route   POST /api/clubs
// @access  Private/Admin
export const createClub = async (req, res) => {
  try {
    const club = await Club.create(req.body);

    res.status(201).json({
      success: true,
      data: club
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'A club with this name already exists'
      });
    }
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update club
// @route   PUT /api/clubs/:id
// @access  Private/Admin
export const updateClub = async (req, res) => {
  try {
    const club = await Club.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    );

    if (!club) {
      return res.status(404).json({
        success: false,
        message: 'Club not found'
      });
    }

    res.status(200).json({
      success: true,
      data: club
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete club
// @route   DELETE /api/clubs/:id
// @access  Private/Admin
export const deleteClub = async (req, res) => {
  try {
    const club = await Club.findById(req.params.id);

    if (!club) {
      return res.status(404).json({
        success: false,
        message: 'Club not found'
      });
    }

    // Check if club has members
    const memberCount = await User.countDocuments({ club: club.name, role: 'player' });
    if (memberCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete club with ${memberCount} active members`
      });
    }

    await club.deleteOne();

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

// @desc    Update club member count
// @route   PUT /api/clubs/:id/update-count
// @access  Private/Admin
export const updateMemberCount = async (req, res) => {
  try {
    const club = await Club.findById(req.params.id);

    if (!club) {
      return res.status(404).json({
        success: false,
        message: 'Club not found'
      });
    }

    // Count actual members
    const memberCount = await User.countDocuments({ club: club.name, role: 'player' });

    club.memberCount = memberCount;
    await club.save();

    res.status(200).json({
      success: true,
      data: club
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
