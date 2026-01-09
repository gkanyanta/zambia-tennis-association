import express from 'express';
import Player from '../models/Player.js';
import Club from '../models/Club.js';
import Tournament from '../models/Tournament.js';

const router = express.Router();

// GET /api/stats - Get homepage statistics
router.get('/', async (req, res) => {
  try {
    // Get counts from database
    const [playersCount, clubsCount, tournamentsCount] = await Promise.all([
      Player.countDocuments({}),
      Club.countDocuments({}),
      Tournament.countDocuments({})
    ]);

    // Calculate current year tournaments
    const currentYear = new Date().getFullYear();
    const tournamentsThisYear = await Tournament.countDocuments({
      startDate: {
        $gte: new Date(`${currentYear}-01-01`),
        $lte: new Date(`${currentYear}-12-31`)
      }
    });

    // Calculate ZTA age (assuming founded in 1989 - adjust if needed)
    const foundedYear = 1989;
    const yearsOfExcellence = currentYear - foundedYear;

    res.json({
      activeMembers: playersCount,
      tournamentsYearly: tournamentsThisYear,
      yearsOfExcellence: yearsOfExcellence,
      growingClubs: clubsCount
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

export default router;
