import express from 'express';
import {
  getTournaments,
  getTournament,
  createTournament,
  updateTournament,
  registerForTournament,
  deleteTournament,
  submitEntry,
  updateEntryStatus,
  autoSeedCategory,
  generateDraw,
  updateMatchResult,
  checkEligibility,
  getPlayerEligibleCategories,
  getJuniorCategories
} from '../controllers/tournamentController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// Category information routes
router.get('/junior-categories', getJuniorCategories);

// Basic tournament routes
router.get('/', getTournaments);
router.get('/:id', getTournament);
router.post('/', protect, authorize('admin', 'staff'), createTournament);
router.put('/:id', protect, authorize('admin', 'staff'), updateTournament);
router.post('/:id/register', protect, registerForTournament);
router.delete('/:id', protect, authorize('admin'), deleteTournament);

// Eligibility checking routes
router.get('/:tournamentId/eligible-categories/:playerId', getPlayerEligibleCategories);
router.get('/:tournamentId/categories/:categoryId/check-eligibility/:playerId', checkEligibility);

// Entry management routes
router.post('/:tournamentId/categories/:categoryId/entries', protect, submitEntry);
router.put('/:tournamentId/categories/:categoryId/entries/:entryId', protect, authorize('admin', 'staff'), updateEntryStatus);
router.post('/:tournamentId/categories/:categoryId/auto-seed', protect, authorize('admin', 'staff'), autoSeedCategory);

// Draw management routes
router.post('/:tournamentId/categories/:categoryId/draw', protect, authorize('admin', 'staff'), generateDraw);

// Match result routes
router.put('/:tournamentId/categories/:categoryId/matches/:matchId', protect, authorize('admin', 'staff'), updateMatchResult);

export default router;
