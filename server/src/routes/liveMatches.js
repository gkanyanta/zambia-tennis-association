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
  getLiveMatchesByTournament,
  getMyMatches
} from '../controllers/liveMatchController.js';
import { protect, authorize, authorizeUmpire } from '../middleware/auth.js';

const router = express.Router();

// Protected routes - must be before /:id to avoid conflict
router.get('/my-matches', protect, getMyMatches);

// Public routes
router.get('/', getLiveMatches);
router.get('/tournament/:tournamentId', getLiveMatchesByTournament);
router.get('/:id', getLiveMatch);

// Protected routes (admin/staff only for match creation)
router.post('/', protect, authorize('admin', 'staff'), startLiveMatch);

// Protected routes (admin/staff or assigned umpire for scoring actions)
router.post('/:id/point', protect, authorizeUmpire, awardPointHandler);
router.post('/:id/undo', protect, authorizeUmpire, undoPointHandler);
router.put('/:id/suspend', protect, authorizeUmpire, suspendMatch);
router.put('/:id/resume', protect, authorizeUmpire, resumeMatch);
router.put('/:id/end', protect, authorizeUmpire, endMatch);

export default router;
