import express from 'express';
import {
  getLeagues,
  getLeague,
  createLeague,
  updateLeague,
  deleteLeague,
  getLeagueStandings,
  getLeagueTies,
  getTie,
  generateTies,
  updateTie,
  getAvailablePlayers,
  updateTiePlayers,
  updateRubberScore,
  recordWalkover
} from '../controllers/leagueController.js';
import { protect, authorize } from '../middleware/auth.js';
import { validateLeagueDates, validateRubberScores } from '../middleware/leagueValidation.js';

const router = express.Router();

// League CRUD
router.get('/', getLeagues);
router.get('/:id', getLeague);
router.post('/', protect, authorize('admin', 'staff'), validateLeagueDates, createLeague);
router.put('/:id', protect, authorize('admin', 'staff'), validateLeagueDates, updateLeague);
router.delete('/:id', protect, authorize('admin'), deleteLeague);

// Standings
router.get('/:id/standings', getLeagueStandings);

// Ties (fixtures)
router.get('/:id/ties', getLeagueTies);
router.post('/:id/ties/generate', protect, authorize('admin', 'staff'), generateTies);
router.get('/:leagueId/ties/:tieId', getTie);
router.put('/:leagueId/ties/:tieId', protect, authorize('admin', 'staff'), updateTie);

// Player selection
router.get('/:leagueId/ties/:tieId/available-players', protect, authorize('admin', 'staff'), getAvailablePlayers);
router.put('/:leagueId/ties/:tieId/players', protect, authorize('admin', 'staff'), updateTiePlayers);

// Rubber scoring
router.put('/:leagueId/ties/:tieId/rubbers/:rubberIndex/score', protect, authorize('admin', 'staff'), validateRubberScores, updateRubberScore);

// Walkover
router.post('/:leagueId/ties/:tieId/walkover', protect, authorize('admin', 'staff'), recordWalkover);

export default router;
