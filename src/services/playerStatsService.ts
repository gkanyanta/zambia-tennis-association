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
  partnerId: string | null
  partnerName: string | null
  opponent: {
    id: string
    name: string
    isWalkin: boolean
    partnerId: string | null
    partnerName: string | null
  }
  score: string
  won: boolean
  completedTime: string | null
}

export interface HeadToHeadSummary {
  opponentId: string | null
  opponentName: string
  opponentPartnerName: string | null
  isWalkin: boolean
  isDoubles: boolean
  played: number
  wins: number
  losses: number
  lastPlayed: string | null
}

export interface PlayerMatchesResponse {
  playerId: string
  hasActiveSubscription: boolean
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
  playerAPartnerName: string | null
  playerBPartnerName: string | null
  score: string
  winner: string
  aWon: boolean
  completedTime: string | null
}

export interface HeadToHeadResponse {
  playerA: { id: string; name: string | null; zpin: string | null; club: string | null }
  playerB: { id: string; name: string | null; zpin: string | null; club: string | null }
  hasActiveSubscription: boolean
  playerAActive?: boolean
  playerBActive?: boolean
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
