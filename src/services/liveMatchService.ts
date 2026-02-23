import { apiFetch } from './api'
import type { LiveMatch, MatchSettings } from '@/types/liveMatch'

interface ApiResponse<T> {
  success: boolean
  data: T
  message?: string
}

export const liveMatchService = {
  // Public endpoints
  getLiveMatches: (): Promise<ApiResponse<LiveMatch[]>> =>
    apiFetch('/live-matches'),

  getLiveMatch: (id: string): Promise<ApiResponse<LiveMatch>> =>
    apiFetch(`/live-matches/${id}`),

  getLiveMatchesByTournament: (tournamentId: string): Promise<ApiResponse<LiveMatch[]>> =>
    apiFetch(`/live-matches/tournament/${tournamentId}`),

  // Protected endpoints
  getMyMatches: (): Promise<ApiResponse<LiveMatch[]>> =>
    apiFetch('/live-matches/my-matches'),

  startLiveMatch: (data: {
    tournamentId: string
    categoryId: string
    matchId: string
    settings?: Partial<MatchSettings>
    court?: string
    firstServer?: 0 | 1
    umpireId?: string
  }): Promise<ApiResponse<LiveMatch>> =>
    apiFetch('/live-matches', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  awardPoint: (id: string, playerIndex: 0 | 1): Promise<ApiResponse<LiveMatch>> =>
    apiFetch(`/live-matches/${id}/point`, {
      method: 'POST',
      body: JSON.stringify({ playerIndex })
    }),

  undoPoint: (id: string): Promise<ApiResponse<LiveMatch>> =>
    apiFetch(`/live-matches/${id}/undo`, {
      method: 'POST'
    }),

  suspendMatch: (id: string): Promise<ApiResponse<LiveMatch>> =>
    apiFetch(`/live-matches/${id}/suspend`, {
      method: 'PUT'
    }),

  resumeMatch: (id: string): Promise<ApiResponse<LiveMatch>> =>
    apiFetch(`/live-matches/${id}/resume`, {
      method: 'PUT'
    }),

  endMatch: (id: string, data: { winnerId: string; reason?: string }): Promise<ApiResponse<LiveMatch>> =>
    apiFetch(`/live-matches/${id}/end`, {
      method: 'PUT',
      body: JSON.stringify(data)
    })
}
