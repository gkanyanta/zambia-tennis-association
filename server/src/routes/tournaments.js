import express from 'express';
import {
  getTournaments,
  getTournament,
  createTournament,
  updateTournament,
  registerForTournament,
  deleteTournament
} from '../controllers/tournamentController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.get('/', getTournaments);
router.get('/:id', getTournament);
router.post('/', protect, authorize('admin', 'staff'), createTournament);
router.put('/:id', protect, authorize('admin', 'staff'), updateTournament);
router.post('/:id/register', protect, registerForTournament);
router.delete('/:id', protect, authorize('admin'), deleteTournament);

export default router;
