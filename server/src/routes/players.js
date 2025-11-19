import express from 'express';
import User from '../models/User.js';

const router = express.Router();

// @desc    Get all players (public)
// @route   GET /api/players
// @access  Public
router.get('/', async (req, res) => {
  try {
    const players = await User.find({ role: 'player' })
      .select('-password')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: players.length,
      data: players
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

export default router;
