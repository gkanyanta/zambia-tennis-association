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
  bulkEntryAction,
  bulkUpdateSeeds,
  autoSeedCategory,
  generateDraw,
  updateMatchResult,
  finalizeResults,
  checkEligibility,
  getPlayerEligibleCategories,
  getJuniorCategories,
  publicRegister,
  verifyPayLaterToken,
  downloadDrawPDF,
  updateMixerRatings,
  updateMixerCourtResult,
  getTournamentFinanceSummary,
  addBudgetLine,
  updateBudgetLine,
  deleteBudgetLine,
  addExpense,
  updateExpense,
  deleteExpense,
  addManualIncome,
  updateManualIncome,
  deleteManualIncome
} from '../controllers/tournamentController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// Category information routes
router.get('/junior-categories', getJuniorCategories);

// Pay-later verification (must be before /:id route)
router.get('/pay-later/verify', verifyPayLaterToken);

// Basic tournament routes
router.get('/', getTournaments);
router.get('/:id', getTournament);
router.post('/', protect, authorize('admin', 'staff'), createTournament);
router.put('/:id', protect, authorize('admin', 'staff'), updateTournament);
router.post('/:id/register', protect, registerForTournament);
router.post('/:id/public-register', publicRegister);
router.delete('/:id', protect, authorize('admin'), deleteTournament);

// Eligibility checking routes
router.get('/:tournamentId/eligible-categories/:playerId', getPlayerEligibleCategories);
router.get('/:tournamentId/categories/:categoryId/check-eligibility/:playerId', checkEligibility);

// Entry management routes
router.post('/:tournamentId/entries/bulk', protect, authorize('admin', 'staff'), bulkEntryAction);
router.post('/:tournamentId/categories/:categoryId/entries', protect, submitEntry);
router.put('/:tournamentId/categories/:categoryId/entries/:entryId', protect, authorize('admin', 'staff'), updateEntryStatus);
router.put('/:tournamentId/categories/:categoryId/seeds', protect, authorize('admin', 'staff'), bulkUpdateSeeds);
router.post('/:tournamentId/categories/:categoryId/auto-seed', protect, authorize('admin', 'staff'), autoSeedCategory);

// Draw management routes
router.get('/:tournamentId/categories/:categoryId/draw/pdf', downloadDrawPDF);
router.post('/:tournamentId/categories/:categoryId/draw', protect, authorize('admin', 'staff'), generateDraw);

// Match result routes
router.put('/:tournamentId/categories/:categoryId/matches/:matchId', protect, authorize('admin', 'staff'), updateMatchResult);
router.post('/:tournamentId/categories/:categoryId/results/finalize', protect, authorize('admin', 'staff'), finalizeResults);

// Mixer (madalas) routes
router.put('/:tournamentId/categories/:categoryId/mixer/ratings', protect, authorize('admin', 'staff'), updateMixerRatings);
router.put('/:tournamentId/categories/:categoryId/mixer/rounds/:roundNumber/courts/:courtNumber', protect, authorize('admin', 'staff'), updateMixerCourtResult);

// Finance routes
router.get('/:tournamentId/finance', protect, authorize('admin', 'staff'), getTournamentFinanceSummary);
router.post('/:tournamentId/finance/budget', protect, authorize('admin', 'staff'), addBudgetLine);
router.put('/:tournamentId/finance/budget/:budgetLineId', protect, authorize('admin', 'staff'), updateBudgetLine);
router.delete('/:tournamentId/finance/budget/:budgetLineId', protect, authorize('admin', 'staff'), deleteBudgetLine);
router.post('/:tournamentId/finance/expenses', protect, authorize('admin', 'staff'), addExpense);
router.put('/:tournamentId/finance/expenses/:expenseId', protect, authorize('admin', 'staff'), updateExpense);
router.delete('/:tournamentId/finance/expenses/:expenseId', protect, authorize('admin', 'staff'), deleteExpense);
router.post('/:tournamentId/finance/income', protect, authorize('admin', 'staff'), addManualIncome);
router.put('/:tournamentId/finance/income/:incomeId', protect, authorize('admin', 'staff'), updateManualIncome);
router.delete('/:tournamentId/finance/income/:incomeId', protect, authorize('admin', 'staff'), deleteManualIncome);

export default router;
