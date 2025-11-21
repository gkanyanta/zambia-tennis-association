import express from 'express';
import {
  getRankingsByCategory,
  getAllCategories,
  getPlayerRankings,
  createOrUpdateRanking,
  updateTournamentPoints,
  importRankings,
  deleteRanking,
  recalculateRankings
} from '../controllers/rankingController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.get('/categories/all', getAllCategories);
router.get('/:category', getRankingsByCategory);
router.get('/player/:playerId', getPlayerRankings);

// Admin routes
router.post('/', protect, authorize('admin', 'staff'), createOrUpdateRanking);
router.post('/import', protect, authorize('admin', 'staff'), importRankings);
router.put('/:id/tournament', protect, authorize('admin', 'staff'), updateTournamentPoints);
router.post('/recalculate/:category', protect, authorize('admin', 'staff'), recalculateRankings);
router.delete('/:id', protect, authorize('admin'), deleteRanking);

export default router;
