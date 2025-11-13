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
  }
};
