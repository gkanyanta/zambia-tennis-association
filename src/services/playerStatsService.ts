import { apiFetch } from './api'

export interface MatchHistoryItem {
  tournamentId: string
  tournamentName: string
  tournamentStart?: string
  tournamentEnd?: string
  categoryId: string
  categoryName: string
  categoryFormat?: string
  matchId: string
  round: number
  roundName: string
  stage: string
  playerName: string
  opponent: {
    id: string
    name: string
    isWalkin: boolean
  }
  score: string
  won: boolean
  completedTime: string | null
}

export interface HeadToHeadSummary {
  opponentId: string | null
  opponentName: string
  isWalkin: boolean
  played: number
  wins: number
  losses: number
  lastPlayed: string | null
}

export interface PlayerMatchesResponse {
  playerId: string
  totalMatches: number
  wins: number
  losses: number
  winPercentage: number
  matches: MatchHistoryItem[]
  headToHead: HeadToHeadSummary[]
}

export interface HeadToHeadMatch {
  tournamentId: string
  tournamentName: string
  tournamentStart?: string
  tournamentEnd?: string
  categoryId: string
  categoryName: string
  categoryFormat?: string
  matchId: string
  round: number
  roundName: string
  stage: string
  playerAName: string
  playerBName: string
  score: string
  winner: string
  aWon: boolean
  completedTime: string | null
}

export interface HeadToHeadResponse {
  playerA: { id: string; name: string | null; zpin: string | null; club: string | null }
  playerB: { id: string; name: string | null; zpin: string | null; club: string | null }
  total: number
  aWins: number
  bWins: number
  matches: HeadToHeadMatch[]
}

export const playerStatsService = {
  async getPlayerMatches(playerId: string): Promise<PlayerMatchesResponse> {
    const response = await apiFetch(`/players/${playerId}/matches`)
    return response.data
  },

  async getHeadToHead(playerA: string, playerB: string): Promise<HeadToHeadResponse> {
    const response = await apiFetch(`/players/${playerA}/head-to-head/${playerB}`)
    return response.data
  },
}
