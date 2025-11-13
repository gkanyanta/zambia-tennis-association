import express from 'express';
import {
  getRankings,
  getRankingsByCategory,
  createOrUpdateRanking,
  deleteRanking,
  bulkUpdateRankings
} from '../controllers/rankingController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.get('/', getRankings);
router.get('/category/:category', getRankingsByCategory);
router.post('/', protect, authorize('admin', 'staff'), createOrUpdateRanking);
router.post('/bulk', protect, authorize('admin', 'staff'), bulkUpdateRankings);
router.delete('/:id', protect, authorize('admin'), deleteRanking);

export default router;
