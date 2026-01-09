import { apiFetch } from './api';

export interface Stats {
  activeMembers: number;
  tournamentsYearly: number;
  yearsOfExcellence: number;
  growingClubs: number;
}

export const statsService = {
  getStats: async (): Promise<Stats> => {
    const response = await apiFetch('/stats');
    return response;
  }
};
