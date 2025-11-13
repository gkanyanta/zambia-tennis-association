import { apiFetch } from './api';

export interface Ranking {
  _id?: string;
  rank: number;
  name: string;
  club: string;
  points: number;
  category: string;
  ageGroup?: string;
}

export const rankingService = {
  async getRankings(category?: string, ageGroup?: string): Promise<Ranking[]> {
    let url = '/rankings';
    const params = new URLSearchParams();

    if (category) params.append('category', category);
    if (ageGroup) params.append('ageGroup', ageGroup);

    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    const response = await apiFetch(url);
    return response.data;
  },

  async getRankingsByCategory(category: string): Promise<Ranking[]> {
    const response = await apiFetch(`/rankings/category/${category}`);
    return response.data;
  },

  async createOrUpdateRanking(data: Partial<Ranking>): Promise<Ranking> {
    const response = await apiFetch('/rankings', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.data;
  },

  async bulkUpdateRankings(rankings: Partial<Ranking>[]): Promise<void> {
    await apiFetch('/rankings/bulk', {
      method: 'POST',
      body: JSON.stringify({ rankings }),
    });
  },

  async deleteRanking(id: string): Promise<void> {
    await apiFetch(`/rankings/${id}`, {
      method: 'DELETE',
    });
  }
};
