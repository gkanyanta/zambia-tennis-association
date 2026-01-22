export type DrawType = 'single_elimination' | 'round_robin' | 'feed_in'
export type CategoryType = 'junior' | 'senior' | 'madalas'
export type Gender = 'boys' | 'girls' | 'mens' | 'womens' | 'mixed'
export type AgeGroup = 'U10' | 'U12' | 'U14' | 'U16' | 'U18' | 'Open' | '35+' | '45+' | '55+' | '65+'

export interface TournamentCategory {
  id: string
  name: string
  categoryCode?: string
  type: CategoryType
  gender: Gender
  ageGroup?: AgeGroup
  minAge?: number
  maxAge?: number
  ageCalculationDate?: string
  drawType: DrawType
  maxEntries: number
  entries: TournamentEntry[]
  draw?: Draw
  specialRules?: string[] // e.g., "Outside top 20 in rankings"
}

export interface TournamentEntry {
  id: string
  playerId: string
  playerName: string
  playerZpin: string
  dateOfBirth: string
  age: number
  gender: 'male' | 'female'
  clubName: string
  ranking?: number
  seed?: number
  status: 'pending_payment' | 'pending' | 'accepted' | 'rejected' | 'withdrawn'
  paymentStatus?: 'unpaid' | 'paid' | 'waived'
  paymentReference?: string
  paymentDate?: string
  paymentMethod?: 'online' | 'manual' | 'waived'
  payer?: {
    name: string
    email: string
    phone: string
    relationship?: string
  }
  rejectionReason?: string
  entryDate: string
}

export interface Match {
  id: string
  matchNumber: number
  round: number
  roundName: string // "Round 1", "Quarter Finals", etc.
  player1?: MatchPlayer
  player2?: MatchPlayer
  winner?: string // player ID
  score?: string
  status: 'scheduled' | 'in_progress' | 'completed' | 'walkover'
  court?: string
  scheduledTime?: string
  completedTime?: string
}

export interface MatchPlayer {
  id: string
  name: string
  seed?: number
  isBye?: boolean
}

export interface Draw {
  type: DrawType
  matches: Match[]
  roundRobinGroups?: RoundRobinGroup[]
  bracketSize?: number // 4, 8, 16, 32, 64, 128
  numberOfRounds?: number
  generatedAt: string
}

export interface RoundRobinGroup {
  groupName: string // "Group A", "Group B", etc.
  players: MatchPlayer[]
  matches: Match[]
  standings?: RoundRobinStanding[]
}

export interface RoundRobinStanding {
  playerId: string
  playerName: string
  played: number
  won: number
  lost: number
  setsWon: number
  setsLost: number
  gamesWon: number
  gamesLost: number
  points: number
}

export interface Tournament {
  id: string
  name: string
  description: string
  startDate: string
  endDate: string
  venue: string
  city: string
  province: string
  entryDeadline: string
  entryFee: number
  categories: TournamentCategory[]
  status: 'upcoming' | 'entries_open' | 'entries_closed' | 'in_progress' | 'completed'
  organizer: string
  contactEmail: string
  contactPhone: string
  maxParticipants?: number
  rules?: string
  prizes?: string
  tournamentLevel?: 'club' | 'regional' | 'national' | 'international'
  allowPublicRegistration?: boolean
  allowMultipleCategories?: boolean
  requirePaymentUpfront?: boolean
  createdAt: string
  updatedAt: string
}

// Helper function to calculate age from date of birth
export function calculateAge(dateOfBirth: string): number {
  const today = new Date()
  const birthDate = new Date(dateOfBirth)
  let age = today.getFullYear() - birthDate.getFullYear()
  const monthDiff = today.getMonth() - birthDate.getMonth()

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--
  }

  return age
}

// Eligibility validation functions
export function validateJuniorEligibility(
  age: number,
  ageGroup: AgeGroup
): { eligible: boolean; reason?: string } {
  const maxAges: Record<AgeGroup, number> = {
    'U10': 10,
    'U12': 12,
    'U14': 14,
    'U16': 16,
    'U18': 18,
    'Open': 999,
    '35+': 999,
    '45+': 999,
    '55+': 999,
    '65+': 999
  }

  const maxAge = maxAges[ageGroup]

  if (age > maxAge) {
    return {
      eligible: false,
      reason: `Player is ${age} years old, maximum age for ${ageGroup} is ${maxAge}`
    }
  }

  return { eligible: true }
}

export function validateSeniorEligibility(
  age: number
): { eligible: boolean; reason?: string } {
  if (age < 14) {
    return {
      eligible: false,
      reason: 'Player must be at least 14 years old for senior categories'
    }
  }

  return { eligible: true }
}

export function validateMadalasEligibility(
  age: number,
  gender: 'male' | 'female',
  ranking?: number
): { eligible: boolean; reason?: string } {
  // For women: 16+ years
  if (gender === 'female') {
    if (age < 16) {
      return {
        eligible: false,
        reason: 'Female player must be at least 16 years old for Madalas'
      }
    }
    return { eligible: true }
  }

  // For men: 35+ years AND outside top 20
  if (gender === 'male') {
    if (age < 35) {
      return {
        eligible: false,
        reason: 'Male player must be at least 35 years old for Madalas'
      }
    }

    if (ranking !== undefined && ranking <= 20) {
      return {
        eligible: false,
        reason: 'Male player must be outside top 20 in rankings for Madalas'
      }
    }

    return { eligible: true }
  }

  return { eligible: false, reason: 'Invalid gender' }
}

// Draw size calculation
export function getNextPowerOfTwo(entries: number): number {
  const sizes = [4, 8, 16, 32, 64, 128]
  return sizes.find(size => size >= entries) || 128
}

// Round names for single elimination
export function getRoundName(round: number, totalRounds: number): string {
  const roundsFromEnd = totalRounds - round

  switch (roundsFromEnd) {
    case 0:
      return 'Final'
    case 1:
      return 'Semi Finals'
    case 2:
      return 'Quarter Finals'
    case 3:
      return 'Round of 16'
    case 4:
      return 'Round of 32'
    case 5:
      return 'Round of 64'
    case 6:
      return 'Round of 128'
    default:
      return `Round ${round}`
  }
}
