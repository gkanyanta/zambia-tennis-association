import express from 'express';
import {
  getLeagues,
  getLeague,
  createLeague,
  updateLeague,
  deleteLeague,
  getLeagueStandings,
  getLeagueFixtures,
  generateFixtures,
  updateFixtureResult,
  getAvailablePlayers,
  updateFixturePlayers,
  updateMatchScore,
  getFixture
} from '../controllers/leagueController.js';
import { protect, authorize } from '../middleware/auth.js';
import {
  validateLeagueDates,
  validateFixtureDates,
  validateMatchScores,
  validateTeamForLeague
} from '../middleware/leagueValidation.js';

const router = express.Router();

// League routes
router.get('/', getLeagues);
router.get('/:id', getLeague);
router.post('/', protect, authorize('admin', 'staff'), validateLeagueDates, createLeague);
router.put('/:id', protect, authorize('admin', 'staff'), validateLeagueDates, validateTeamForLeague, updateLeague);
router.delete('/:id', protect, authorize('admin'), deleteLeague);

// League standings and fixtures
router.get('/:id/standings', getLeagueStandings);
router.get('/:id/fixtures', getLeagueFixtures);
router.post('/:id/fixtures/generate', protect, authorize('admin', 'staff'), generateFixtures);

// Fixture management
router.get('/:leagueId/fixtures/:fixtureId', getFixture);
router.put('/:leagueId/fixtures/:fixtureId', protect, authorize('admin', 'staff'), validateFixtureDates, updateFixtureResult);
router.get('/:leagueId/fixtures/:fixtureId/available-players', protect, authorize('admin', 'staff'), getAvailablePlayers);
router.put('/:leagueId/fixtures/:fixtureId/players', protect, authorize('admin', 'staff'), updateFixturePlayers);
router.put('/:leagueId/fixtures/:fixtureId/matches/:matchIndex/score', protect, authorize('admin', 'staff'), validateMatchScores, updateMatchScore);

export default router;
