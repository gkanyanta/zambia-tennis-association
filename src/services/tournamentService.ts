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
  drawType: 'single_elimination' | 'round_robin' | 'feed_in';
  maxEntries: number;
  entryCount: number;
  entries: TournamentEntry[];
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
        body: JSON.stringify(drawData),
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
  }
};
