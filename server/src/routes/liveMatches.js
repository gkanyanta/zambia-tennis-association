import express from 'express';
import {
  startLiveMatch,
  awardPointHandler,
  undoPointHandler,
  suspendMatch,
  resumeMatch,
  endMatch,
  getLiveMatches,
  getLiveMatch,
  getLiveMatchesByTournament
} from '../controllers/liveMatchController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.get('/', getLiveMatches);
router.get('/tournament/:tournamentId', getLiveMatchesByTournament);
router.get('/:id', getLiveMatch);

// Protected routes (admin/staff)
router.post('/', protect, authorize('admin', 'staff'), startLiveMatch);
router.post('/:id/point', protect, authorize('admin', 'staff'), awardPointHandler);
router.post('/:id/undo', protect, authorize('admin', 'staff'), undoPointHandler);
router.put('/:id/suspend', protect, authorize('admin', 'staff'), suspendMatch);
router.put('/:id/resume', protect, authorize('admin', 'staff'), resumeMatch);
router.put('/:id/end', protect, authorize('admin', 'staff'), endMatch);

export default router;
