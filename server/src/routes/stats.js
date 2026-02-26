import express from 'express';
import User from '../models/User.js';
import Club from '../models/Club.js';
import Tournament from '../models/Tournament.js';
import Transaction from '../models/Transaction.js';
import PlayerRegistration from '../models/PlayerRegistration.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// GET /api/stats - Get homepage statistics
router.get('/', async (req, res) => {
  try {
    // Get counts from database
    // Players are Users with role='player'
    const [playersCount, clubsCount, tournamentsCount] = await Promise.all([
      User.countDocuments({ role: 'player' }),
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
    res.status(500).json({ error: 'Failed to fetch statistics', message: error.message });
  }
});

// GET /api/stats/admin - Get admin dashboard statistics
router.get('/admin', protect, authorize('admin', 'staff'), async (req, res) => {
  try {
    const currentYear = new Date().getFullYear();
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    const [
      totalPlayers,
      activeMembers,
      expiredMembers,
      tournamentsThisYear,
      pendingPayment,
      pendingApproval,
      revenueThisMonth,
      revenueLastMonth,
      clubsCount,
      recentRegistrations
    ] = await Promise.all([
      // Total registered players
      User.countDocuments({ role: 'player' }),
      // Active memberships
      User.countDocuments({ role: 'player', membershipStatus: 'active' }),
      // Expired memberships
      User.countDocuments({ role: 'player', membershipStatus: 'expired' }),
      // Tournaments this year
      Tournament.countDocuments({
        startDate: {
          $gte: new Date(`${currentYear}-01-01`),
          $lte: new Date(`${currentYear}-12-31`)
        }
      }),
      // Pending payment registrations
      PlayerRegistration.countDocuments({ status: 'pending_payment' }),
      // Pending approval registrations
      PlayerRegistration.countDocuments({ status: 'pending_approval' }),
      // Revenue this month
      Transaction.aggregate([
        { $match: { status: 'completed', paymentDate: { $gte: startOfMonth } } },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
      ]),
      // Revenue last month
      Transaction.aggregate([
        { $match: { status: 'completed', paymentDate: { $gte: startOfLastMonth, $lte: endOfLastMonth } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      // Total clubs
      Club.countDocuments({}),
      // Recent registrations (last 5)
      PlayerRegistration.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .select('firstName lastName status createdAt membershipTypeName')
        .lean()
    ]);

    const monthRevenue = revenueThisMonth[0]?.total || 0;
    const lastMonthRevenue = revenueLastMonth[0]?.total || 0;
    const revenueChange = lastMonthRevenue > 0
      ? Math.round(((monthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100)
      : 0;

    res.json({
      totalPlayers,
      activeMembers,
      expiredMembers,
      tournamentsThisYear,
      pendingApplications: pendingPayment + pendingApproval,
      pendingPayment,
      pendingApproval,
      revenueThisMonth: monthRevenue,
      revenueTransactions: revenueThisMonth[0]?.count || 0,
      revenueChange,
      clubsCount,
      recentRegistrations
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    res.status(500).json({ error: 'Failed to fetch admin statistics', message: error.message });
  }
});

export default router;
