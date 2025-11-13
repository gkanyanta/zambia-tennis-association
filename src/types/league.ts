export type Region = 'northern' | 'southern'
export type Gender = 'men' | 'women'
export type MatchType = 'singles1' | 'singles2' | 'doubles'
export type MatchStatus = 'scheduled' | 'completed' | 'cancelled'

export interface Team {
  id: number
  name: string
  region: Region
  city: string
}

export interface MatchResult {
  matchType: MatchType
  homeScore: number
  awayScore: number
  homePlayer?: string
  awayPlayer?: string
  homePlayers?: string[] // For doubles
  awayPlayers?: string[] // For doubles
}

export interface Fixture {
  id: number
  round: number
  homeTeam: Team
  awayTeam: Team
  date: string
  venue: string
  status: MatchStatus
  results?: MatchResult[]
}

export interface LeagueStanding {
  team: Team
  played: number
  won: number
  lost: number
  matchesFor: number // Total matches won
  matchesAgainst: number // Total matches lost
  points: number
}

export interface League {
  region: Region
  gender: Gender
  teams: Team[]
  fixtures: Fixture[]
  standings: LeagueStanding[]
}
