import express from 'express';
import {
  getLeagueTeams,
  getLeagueTeam,
  createLeagueTeam,
  updateLeagueTeam,
  deleteLeagueTeam,
  addPlayerToRoster,
  removePlayerFromRoster,
  updatePlayerPosition
} from '../controllers/leagueController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// League team routes
router.get('/', getLeagueTeams);
router.get('/:id', getLeagueTeam);
router.post('/', protect, authorize('admin', 'staff'), createLeagueTeam);
router.put('/:id', protect, authorize('admin', 'staff'), updateLeagueTeam);
router.delete('/:id', protect, authorize('admin'), deleteLeagueTeam);

// Roster management routes
router.post('/:id/roster', protect, authorize('admin', 'staff'), addPlayerToRoster);
router.delete('/:id/roster/:playerId', protect, authorize('admin', 'staff'), removePlayerFromRoster);
router.put('/:id/roster/:playerId', protect, authorize('admin', 'staff'), updatePlayerPosition);

export default router;
