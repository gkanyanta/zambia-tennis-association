import { apiFetch } from './api';

export interface Tournament {
  _id: string;
  name: string;
  description: string;
  date: string;
  location: string;
  category: string;
  status: string;
  registrations: any[];
  maxParticipants?: number;
  entryFee: number;
  registrationDeadline?: string;
  startDate: string;
  endDate: string;
  venue: string;
  city: string;
  province: string;
  entryDeadline: string;
  categories: TournamentCategory[];
  organizer?: string;
  contactEmail?: string;
  contactPhone?: string;
  rules?: string;
  prizes?: string;
  tournamentLevel?: 'club' | 'regional' | 'national' | 'international';
  allowPublicRegistration?: boolean;
  allowMultipleCategories?: boolean;
  requirePaymentUpfront?: boolean;
}

export interface TournamentCategory {
  _id: string;
  categoryCode: string;
  name: string;
  type: 'junior' | 'senior' | 'madalas';
  gender: 'boys' | 'girls' | 'mens' | 'womens' | 'mixed';
  ageGroup?: string;
  maxAge?: number;
  minAge?: number;
  ageCalculationDate?: string;
  drawType: 'single_elimination' | 'round_robin' | 'feed_in' | 'mixer';
  maxEntries: number;
  entryCount: number;
  entries: TournamentEntry[];
  mixerRatings?: Array<{ playerId: string; playerName: string; gender: string; rating: 'A' | 'B' }>;
  draw?: {
    type: string;
    matches: Array<{
      _id: string;
      matchNumber: number;
      round: number;
      roundName: string;
      player1?: { id: string; name: string; seed?: number; isBye?: boolean };
      player2?: { id: string; name: string; seed?: number; isBye?: boolean };
      winner?: string;
      score?: string;
      status: string;
      court?: string;
      scheduledTime?: string;
      completedTime?: string;
    }>;
    roundRobinGroups?: Array<{
      groupName: string;
      players: Array<{ id: string; name: string; seed?: number }>;
      matches: any[];
      standings?: any[];
    }>;
    bracketSize?: number;
    numberOfRounds?: number;
    generatedAt: string;
    finalized?: boolean;
    finalizedAt?: string;
    standings?: {
      champion?: { id: string; name: string };
      runnerUp?: { id: string; name: string };
      semiFinalists?: Array<{ id: string; name: string }>;
      overallWinner?: { id: string; name: string; gamesWon: number };
      ladiesWinner?: { id: string; name: string; gamesWon: number };
    };
    mixerRounds?: Array<{
      roundNumber: number;
      courts: Array<{
        _id?: string;
        courtNumber: number;
        pair1A: { playerId: string; playerName: string };
        pair1B: { playerId: string; playerName: string };
        pair2A: { playerId: string; playerName: string };
        pair2B: { playerId: string; playerName: string };
        pair1GamesWon: number | null;
        pair2GamesWon: number | null;
        status: string;
      }>;
    }>;
    mixerStandings?: Array<{
      playerId: string;
      playerName: string;
      gender: string;
      rating: string;
      roundsPlayed: number;
      totalGamesWon: number;
      totalGamesLost: number;
    }>;
  };
}

export interface TournamentEntry {
  _id: string;
  playerId: string;
  playerName: string;
  playerZpin: string;
  dateOfBirth: string;
  age: number;
  ageOnDec31: number;
  gender: 'male' | 'female';
  clubName: string;
  ranking?: number;
  seed?: number;
  eligibilityCheck: {
    eligible: boolean;
    reason: string;
    suggestedCategory?: string;
    warnings: string[];
  };
  status: 'pending_payment' | 'pending' | 'accepted' | 'rejected' | 'withdrawn';
  paymentStatus?: 'unpaid' | 'paid' | 'waived';
  paymentReference?: string;
  paymentDate?: string;
  paymentMethod?: 'online' | 'manual' | 'waived';
  payer?: {
    name: string;
    email: string;
    phone: string;
    relationship?: string;
  };
  rejectionReason?: string;
  entryDate: string;
}

export interface JuniorCategory {
  code: string;
  name: string;
  gender: 'male' | 'female';
  maxAge: number;
}

export interface EligibilityCheck {
  eligible: boolean;
  errors: string[];
  warnings: string[];
  info: {
    playerAge: number;
    tournamentYear: number;
    categoryCode: string;
    ageCalculationDate: string;
    suggestedCategory?: string;
  };
}

export interface EligibleCategoryInfo {
  categoryCode: string;
  categoryId: string | null;
  categoryName: string;
  eligible: boolean;
  suggested: boolean;
  ageOnDec31: number;
  reason: string;
  maxEntries: number | null;
  currentEntries: number;
  isFull: boolean;
}

// Finance interfaces
export interface BudgetLine {
  _id: string;
  category: string;
  type: 'income' | 'expense';
  description: string;
  budgetedAmount: number;
  notes?: string;
}

export interface ExpenseRecord {
  _id: string;
  category: string;
  description: string;
  amount: number;
  date: string;
  paidTo?: string;
  paymentMethod?: 'cash' | 'bank_transfer' | 'mobile_money' | 'cheque' | 'other';
  receiptReference?: string;
  recordedBy?: string;
  notes?: string;
}

export interface ManualIncomeRecord {
  _id: string;
  category: string;
  description: string;
  amount: number;
  date: string;
  receivedFrom?: string;
  paymentMethod?: 'cash' | 'bank_transfer' | 'mobile_money' | 'cheque' | 'other';
  receiptReference?: string;
  recordedBy?: string;
  notes?: string;
}

export interface EntryFeeIncomeSummary {
  byCategory: Array<{
    categoryId: string;
    categoryName: string;
    paid: { count: number; amount: number };
    waived: { count: number; amount: number };
    unpaid: { count: number; amount: number };
    total: { count: number; amount: number };
  }>;
  totals: {
    paid: number;
    waived: number;
    unpaid: number;
    total: number;
  };
}

export interface FinanceSummary {
  budgetedIncome: number;
  budgetedExpenses: number;
  projectedProfit: number;
  actualIncome: number;
  actualExpenses: number;
  actualProfit: number;
  incomeVariance: number;
  expenseVariance: number;
}

export interface TournamentFinanceData {
  budget: BudgetLine[];
  expenses: ExpenseRecord[];
  manualIncome: ManualIncomeRecord[];
  entryFeeIncome: EntryFeeIncomeSummary;
  summary: FinanceSummary;
}

export const tournamentService = {
  async getTournaments(): Promise<Tournament[]> {
    const response = await apiFetch('/tournaments');
    return response.data;
  },

  async getTournament(id: string): Promise<Tournament> {
    const response = await apiFetch(`/tournaments/${id}`);
    return response.data;
  },

  async createTournament(data: Partial<Tournament>): Promise<Tournament> {
    const response = await apiFetch('/tournaments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.data;
  },

  async updateTournament(id: string, data: Partial<Tournament>): Promise<Tournament> {
    const response = await apiFetch(`/tournaments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return response.data;
  },

  async registerForTournament(id: string, category: string): Promise<any> {
    const response = await apiFetch(`/tournaments/${id}/register`, {
      method: 'POST',
      body: JSON.stringify({ category }),
    });
    return response.data;
  },

  async deleteTournament(id: string): Promise<void> {
    await apiFetch(`/tournaments/${id}`, {
      method: 'DELETE',
    });
  },

  // Entry Management
  async submitEntry(
    tournamentId: string,
    categoryId: string,
    playerId: string
  ): Promise<{ data: TournamentEntry; warnings: string[] }> {
    const response = await apiFetch(
      `/tournaments/${tournamentId}/categories/${categoryId}/entries`,
      {
        method: 'POST',
        body: JSON.stringify({ playerId }),
      }
    );
    return response;
  },

  async updateEntryStatus(
    tournamentId: string,
    categoryId: string,
    entryId: string,
    data: {
      status: string;
      seed?: number;
      rejectionReason?: string;
    }
  ): Promise<any> {
    const response = await apiFetch(
      `/tournaments/${tournamentId}/categories/${categoryId}/entries/${entryId}`,
      {
        method: 'PUT',
        body: JSON.stringify(data),
      }
    );
    return response.data;
  },

  async autoSeedCategory(
    tournamentId: string,
    categoryId: string
  ): Promise<any> {
    const response = await apiFetch(
      `/tournaments/${tournamentId}/categories/${categoryId}/auto-seed`,
      {
        method: 'POST',
      }
    );
    return response.data;
  },

  // Bulk entry actions
  async bulkEntryAction(
    tournamentId: string,
    categoryId: string,
    entryIds: string[],
    action: 'APPROVE' | 'CONFIRM_PAYMENT' | 'WAIVE_PAYMENT'
  ): Promise<{ results: Array<{ entryId: string; success: boolean; error?: string; playerName?: string }>; succeeded: number; failed: number }> {
    const response = await apiFetch(
      `/tournaments/${tournamentId}/entries/bulk`,
      {
        method: 'POST',
        body: JSON.stringify({ entryIds, action, categoryId }),
      }
    );
    return response.data;
  },

  // Bulk update seeds
  async bulkUpdateSeeds(
    tournamentId: string,
    categoryId: string,
    seeds: Array<{ entryId: string; seedNumber: number }>
  ): Promise<any> {
    const response = await apiFetch(
      `/tournaments/${tournamentId}/categories/${categoryId}/seeds`,
      {
        method: 'PUT',
        body: JSON.stringify({ seeds }),
      }
    );
    return response;
  },

  // Finalize results
  async finalizeResults(
    tournamentId: string,
    categoryId: string
  ): Promise<any> {
    const response = await apiFetch(
      `/tournaments/${tournamentId}/categories/${categoryId}/results/finalize`,
      {
        method: 'POST',
      }
    );
    return response;
  },

  // Draw Management
  async generateDraw(
    tournamentId: string,
    categoryId: string,
    drawData: any
  ): Promise<any> {
    const response = await apiFetch(
      `/tournaments/${tournamentId}/categories/${categoryId}/draw`,
      {
        method: 'POST',
        body: JSON.stringify({ draw: drawData }),
      }
    );
    return response.data;
  },

  // Match Results
  async updateMatchResult(
    tournamentId: string,
    categoryId: string,
    matchId: string,
    result: {
      winner: string;
      score: string;
    }
  ): Promise<any> {
    const response = await apiFetch(
      `/tournaments/${tournamentId}/categories/${categoryId}/matches/${matchId}`,
      {
        method: 'PUT',
        body: JSON.stringify(result),
      }
    );
    return response.data;
  },

  // Eligibility Checking
  async checkEligibility(
    tournamentId: string,
    categoryId: string,
    playerId: string
  ): Promise<EligibilityCheck> {
    const response = await apiFetch(
      `/tournaments/${tournamentId}/categories/${categoryId}/check-eligibility/${playerId}`
    );
    return response.data;
  },

  async getPlayerEligibleCategories(
    tournamentId: string,
    playerId: string
  ): Promise<EligibleCategoryInfo[]> {
    const response = await apiFetch(
      `/tournaments/${tournamentId}/eligible-categories/${playerId}`
    );
    return response.data;
  },

  async getJuniorCategories(): Promise<JuniorCategory[]> {
    const response = await apiFetch('/tournaments/junior-categories');
    return response.data;
  },

  // Finance methods
  async getFinanceSummary(tournamentId: string): Promise<TournamentFinanceData> {
    const response = await apiFetch(`/tournaments/${tournamentId}/finance`);
    return response.data;
  },

  async addBudgetLine(tournamentId: string, data: Omit<BudgetLine, '_id'>): Promise<BudgetLine> {
    const response = await apiFetch(`/tournaments/${tournamentId}/finance/budget`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.data;
  },

  async updateBudgetLine(tournamentId: string, budgetLineId: string, data: Partial<BudgetLine>): Promise<BudgetLine> {
    const response = await apiFetch(`/tournaments/${tournamentId}/finance/budget/${budgetLineId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return response.data;
  },

  async deleteBudgetLine(tournamentId: string, budgetLineId: string): Promise<void> {
    await apiFetch(`/tournaments/${tournamentId}/finance/budget/${budgetLineId}`, {
      method: 'DELETE',
    });
  },

  async addExpense(tournamentId: string, data: Omit<ExpenseRecord, '_id'>): Promise<ExpenseRecord> {
    const response = await apiFetch(`/tournaments/${tournamentId}/finance/expenses`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.data;
  },

  async updateExpense(tournamentId: string, expenseId: string, data: Partial<ExpenseRecord>): Promise<ExpenseRecord> {
    const response = await apiFetch(`/tournaments/${tournamentId}/finance/expenses/${expenseId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return response.data;
  },

  async deleteExpense(tournamentId: string, expenseId: string): Promise<void> {
    await apiFetch(`/tournaments/${tournamentId}/finance/expenses/${expenseId}`, {
      method: 'DELETE',
    });
  },

  async addManualIncome(tournamentId: string, data: Omit<ManualIncomeRecord, '_id'>): Promise<ManualIncomeRecord> {
    const response = await apiFetch(`/tournaments/${tournamentId}/finance/income`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.data;
  },

  async updateManualIncome(tournamentId: string, incomeId: string, data: Partial<ManualIncomeRecord>): Promise<ManualIncomeRecord> {
    const response = await apiFetch(`/tournaments/${tournamentId}/finance/income/${incomeId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return response.data;
  },

  async deleteManualIncome(tournamentId: string, incomeId: string): Promise<void> {
    await apiFetch(`/tournaments/${tournamentId}/finance/income/${incomeId}`, {
      method: 'DELETE',
    });
  },

  // Mixer (Madalas) methods
  async updateMixerRatings(
    tournamentId: string,
    categoryId: string,
    ratings: Array<{ playerId: string; playerName: string; gender: string; rating: 'A' | 'B' }>
  ): Promise<any> {
    const response = await apiFetch(
      `/tournaments/${tournamentId}/categories/${categoryId}/mixer/ratings`,
      {
        method: 'PUT',
        body: JSON.stringify({ ratings }),
      }
    );
    return response.data;
  },

  async updateMixerCourtResult(
    tournamentId: string,
    categoryId: string,
    roundNumber: number,
    courtNumber: number,
    result: { pair1GamesWon: number; pair2GamesWon: number }
  ): Promise<any> {
    const response = await apiFetch(
      `/tournaments/${tournamentId}/categories/${categoryId}/mixer/rounds/${roundNumber}/courts/${courtNumber}`,
      {
        method: 'PUT',
        body: JSON.stringify(result),
      }
    );
    return response.data;
  }
};
