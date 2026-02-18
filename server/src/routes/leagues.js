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
  recordWalkover,
  registerForLeague,
  getLeagueRegistrations,
  reviewRegistration,
  generatePlayoffs,
  getPlayoffBracket
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

// League registrations
router.post('/:id/register', protect, authorize('club_official'), registerForLeague);
router.get('/:id/registrations', protect, authorize('admin', 'staff'), getLeagueRegistrations);
router.put('/:id/registrations/:registrationId', protect, authorize('admin', 'staff'), reviewRegistration);

// Ties (fixtures)
router.get('/:id/ties', getLeagueTies);
router.post('/:id/ties/generate', protect, authorize('admin', 'staff'), generateTies);
router.get('/:leagueId/ties/:tieId', getTie);
router.put('/:leagueId/ties/:tieId', protect, authorize('admin', 'staff'), updateTie);

// Player selection & scoring (club_official can score their own ties)
router.get('/:leagueId/ties/:tieId/available-players', protect, authorize('admin', 'staff', 'club_official'), getAvailablePlayers);
router.put('/:leagueId/ties/:tieId/players', protect, authorize('admin', 'staff', 'club_official'), updateTiePlayers);

// Rubber scoring
router.put('/:leagueId/ties/:tieId/rubbers/:rubberIndex/score', protect, authorize('admin', 'staff', 'club_official'), validateRubberScores, updateRubberScore);

// Walkover
router.post('/:leagueId/ties/:tieId/walkover', protect, authorize('admin', 'staff'), recordWalkover);

// Playoffs
router.post('/:id/playoffs/generate', protect, authorize('admin', 'staff'), generatePlayoffs);
router.get('/:id/playoffs', getPlayoffBracket);

export default router;
