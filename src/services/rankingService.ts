import { apiFetch } from './api';

export interface TournamentResult {
  _id: string;
  tournamentName: string;
  tournamentDate: string;
  points: number;
  position?: string;
  year: number;
}

export interface Ranking {
  _id: string;
  playerId?: string;
  playerName: string;
  playerZpin?: string;
  club?: string;
  category: string;
  rank: number;
  previousRank?: number;
  tournamentResults: TournamentResult[];
  totalPoints: number;
  rankingPeriod: string;
  lastUpdated: string;
  isActive: boolean;
}

export interface RankingCategory {
  value: string;
  label: string;
  type: 'senior' | 'junior' | 'doubles' | 'madalas';
}

export const rankingCategories: RankingCategory[] = [
  { value: 'men_senior', label: 'Men Senior', type: 'senior' },
  { value: 'women_senior', label: 'Women Senior', type: 'senior' },
  { value: 'boys_10u', label: 'Boys 10 & Under', type: 'junior' },
  { value: 'boys_12u', label: 'Boys 12 & Under', type: 'junior' },
  { value: 'boys_14u', label: 'Boys 14 & Under', type: 'junior' },
  { value: 'boys_16u', label: 'Boys 16 & Under', type: 'junior' },
  { value: 'boys_18u', label: 'Boys 18 & Under', type: 'junior' },
  { value: 'girls_10u', label: 'Girls 10 & Under', type: 'junior' },
  { value: 'girls_12u', label: 'Girls 12 & Under', type: 'junior' },
  { value: 'girls_14u', label: 'Girls 14 & Under', type: 'junior' },
  { value: 'girls_16u', label: 'Girls 16 & Under', type: 'junior' },
  { value: 'girls_18u', label: 'Girls 18 & Under', type: 'junior' },
  { value: 'men_doubles', label: 'Men Senior Doubles', type: 'doubles' },
  { value: 'women_doubles', label: 'Women Senior Doubles', type: 'doubles' },
  { value: 'mixed_doubles', label: 'Mixed Doubles', type: 'doubles' },
  { value: 'madalas_overall', label: 'Madalas Overall', type: 'madalas' },
  { value: 'madalas_ladies', label: 'Madalas Ladies', type: 'madalas' }
];

export const rankingService = {
  async getRankingsByCategory(category: string, period?: string): Promise<Ranking[]> {
    const url = period 
      ? `/rankings/${category}?period=${period}`
      : `/rankings/${category}`;
    const response = await apiFetch(url);
    return response.data;
  },

  async getAllCategories(): Promise<string[]> {
    const response = await apiFetch('/rankings/categories/all');
    return response.data;
  },

  async getPlayerRankings(playerId: string): Promise<Ranking[]> {
    const response = await apiFetch(`/rankings/player/${playerId}`);
    return response.data;
  },

  async createOrUpdateRanking(data: Partial<Ranking>): Promise<Ranking> {
    const response = await apiFetch('/rankings', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.data;
  },

  async updateTournamentPoints(
    rankingId: string,
    tournamentData: Omit<TournamentResult, '_id'>
  ): Promise<Ranking> {
    const response = await apiFetch(`/rankings/${rankingId}/tournament`, {
      method: 'PUT',
      body: JSON.stringify(tournamentData),
    });
    return response.data;
  },

  async importRankings(
    category: string,
    rankingPeriod: string,
    data: any[]
  ): Promise<any> {
    const response = await apiFetch('/rankings/import', {
      method: 'POST',
      body: JSON.stringify({ category, rankingPeriod, data }),
    });
    return response;
  },

  async recalculateRankings(category: string, rankingPeriod: string): Promise<Ranking[]> {
    const response = await apiFetch(`/rankings/recalculate/${category}`, {
      method: 'POST',
      body: JSON.stringify({ rankingPeriod }),
    });
    return response.data;
  },

  async deleteRanking(rankingId: string): Promise<void> {
    await apiFetch(`/rankings/${rankingId}`, {
      method: 'DELETE',
    });
  },
  
  getCategoryLabel(category: string): string {
    const cat = rankingCategories.find(c => c.value === category);
    return cat ? cat.label : category;
  }
};
