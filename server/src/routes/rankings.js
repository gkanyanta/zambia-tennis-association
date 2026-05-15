import express from 'express';
import {
  getRankingsByCategory,
  getAllCategories,
  getPlayerRankings,
  getDoublesPairRankings,
  createOrUpdateRanking,
  updateTournamentPoints,
  deleteTournamentResult,
  importRankings,
  deleteRanking,
  recalculateRankings,
  linkPlayerToRanking
} from '../controllers/rankingController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.get('/categories/all', getAllCategories);
router.get('/pairs/:category', getDoublesPairRankings);
router.get('/player/:playerId', getPlayerRankings);
router.get('/:category', getRankingsByCategory);

// Admin routes
router.post('/', protect, authorize('admin', 'staff'), createOrUpdateRanking);
router.post('/import', protect, authorize('admin', 'staff'), importRankings);
router.put('/:id/tournament', protect, authorize('admin', 'staff'), updateTournamentPoints);
router.delete('/:id/tournament/:resultId', protect, authorize('admin', 'staff'), deleteTournamentResult);
router.patch('/:id/link-player', protect, authorize('admin', 'staff'), linkPlayerToRanking);
router.post('/recalculate/:category', protect, authorize('admin', 'staff'), recalculateRankings);
router.delete('/:id', protect, authorize('admin'), deleteRanking);

export default router;
