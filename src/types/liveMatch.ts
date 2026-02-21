export interface MatchSettings {
  bestOf: 3 | 5
  tiebreakAt: number // Games needed to win a set (6 for normal, 4 for short sets)
  finalSetTiebreak: boolean // Match tiebreak in deciding set
  finalSetTiebreakTo: number // Usually 10
  noAd: boolean // Sudden death at deuce
}

export interface GameScore {
  points: [number, number]
  isTiebreak: boolean
  isMatchTiebreak: boolean
}

export interface SetScore {
  games: [number, number]
  tiebreak?: [number, number]
  winner?: 0 | 1
}

export interface MatchState {
  settings: MatchSettings
  sets: SetScore[]
  currentGame: GameScore
  server: 0 | 1
  pointHistory: MatchState[]
  winner: 0 | 1 | null
  status: 'in_progress' | 'completed'
}

export interface DisplayScore {
  sets: [number, number][]
  currentGame: {
    display: [string, string]
    isTiebreak: boolean
    isMatchTiebreak: boolean
  }
  server: 0 | 1
  winner: 0 | 1 | null
  status: 'in_progress' | 'completed'
}

export interface LiveMatchPlayer {
  id: string
  name: string
  seed?: number
}

export interface LiveMatch {
  _id: string
  tournamentId: string
  categoryId: string
  matchId: string
  player1: LiveMatchPlayer
  player2: LiveMatchPlayer
  matchState: MatchState
  settings: MatchSettings
  court?: string
  umpireId?: string
  umpireName?: string
  tournamentName: string
  categoryName: string
  roundName: string
  status: 'warmup' | 'live' | 'suspended' | 'completed'
  startedAt?: string
  completedAt?: string
  createdAt: string
  updatedAt: string
}
