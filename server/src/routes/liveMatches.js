import express from 'express';
import {
  startLiveMatch,
  setFirstServer,
  awardPointHandler,
  undoPointHandler,
  suspendMatch,
  resumeMatch,
  endMatch,
  cancelLiveScoring,
  updateMatchSettings,
  toggleVisibility,
  getLiveMatches,
  getLiveMatch,
  getLiveMatchesByTournament,
  getMyMatches,
  resyncCompletedResults
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
router.post('/resync', protect, authorize('admin', 'staff'), resyncCompletedResults);

// Protected routes (admin/staff or assigned umpire for scoring actions)
router.put('/:id/first-server', protect, authorizeUmpire, setFirstServer);
router.post('/:id/point', protect, authorizeUmpire, awardPointHandler);
router.post('/:id/undo', protect, authorizeUmpire, undoPointHandler);
router.put('/:id/suspend', protect, authorizeUmpire, suspendMatch);
router.put('/:id/resume', protect, authorizeUmpire, resumeMatch);
router.put('/:id/toggle-visibility', protect, authorizeUmpire, toggleVisibility);
router.put('/:id/settings', protect, authorizeUmpire, updateMatchSettings);
router.put('/:id/end', protect, authorizeUmpire, endMatch);
router.delete('/:id/cancel', protect, authorize('admin', 'staff'), cancelLiveScoring);

export default router;
