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
  updateFixtureResult
} from '../controllers/leagueController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// League routes
router.get('/', getLeagues);
router.get('/:id', getLeague);
router.post('/', protect, authorize('admin', 'staff'), createLeague);
router.put('/:id', protect, authorize('admin', 'staff'), updateLeague);
router.delete('/:id', protect, authorize('admin'), deleteLeague);

// League standings and fixtures
router.get('/:id/standings', getLeagueStandings);
router.get('/:id/fixtures', getLeagueFixtures);
router.post('/:id/fixtures/generate', protect, authorize('admin', 'staff'), generateFixtures);
router.put('/:leagueId/fixtures/:fixtureId', protect, authorize('admin', 'staff'), updateFixtureResult);

export default router;
