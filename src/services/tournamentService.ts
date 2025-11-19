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
    entryData: {
      playerId: string;
      playerName: string;
      playerZpin: string;
      dateOfBirth: string;
      gender: 'male' | 'female';
      clubName: string;
      ranking?: number;
    }
  ): Promise<any> {
    const response = await apiFetch(
      `/tournaments/${tournamentId}/categories/${categoryId}/entries`,
      {
        method: 'POST',
        body: JSON.stringify(entryData),
      }
    );
    return response.data;
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
  }
};
