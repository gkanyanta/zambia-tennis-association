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
  generateDraw,
  updateMatchResult
} from '../controllers/tournamentController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// Basic tournament routes
router.get('/', getTournaments);
router.get('/:id', getTournament);
router.post('/', protect, authorize('admin', 'staff'), createTournament);
router.put('/:id', protect, authorize('admin', 'staff'), updateTournament);
router.post('/:id/register', protect, registerForTournament);
router.delete('/:id', protect, authorize('admin'), deleteTournament);

// Entry management routes
router.post('/:tournamentId/categories/:categoryId/entries', protect, submitEntry);
router.put('/:tournamentId/categories/:categoryId/entries/:entryId', protect, authorize('admin', 'staff'), updateEntryStatus);

// Draw management routes
router.post('/:tournamentId/categories/:categoryId/draw', protect, authorize('admin', 'staff'), generateDraw);

// Match result routes
router.put('/:tournamentId/categories/:categoryId/matches/:matchId', protect, authorize('admin', 'staff'), updateMatchResult);

export default router;
