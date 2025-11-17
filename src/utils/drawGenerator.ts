import type {
  Draw,
  Match,
  MatchPlayer,
  RoundRobinGroup,
  TournamentEntry,
  DrawType
} from '@/types/tournament'
import { getNextPowerOfTwo, getRoundName } from '@/types/tournament'

// Generate Single Elimination Draw
export function generateSingleEliminationDraw(entries: TournamentEntry[]): Draw {
  const acceptedEntries = entries.filter(e => e.status === 'accepted')
  const numPlayers = acceptedEntries.length
  const bracketSize = getNextPowerOfTwo(numPlayers)
  const numByes = bracketSize - numPlayers
  const numberOfRounds = Math.log2(bracketSize)

  // Sort entries by seed (seeded players first, then unseeded)
  const sortedEntries = [...acceptedEntries].sort((a, b) => {
    if (a.seed && b.seed) return a.seed - b.seed
    if (a.seed) return -1
    if (b.seed) return 1
    return 0
  })

  // Create players array with byes
  const players: (MatchPlayer | null)[] = []

  // Place seeded players according to standard seeding positions
  const seedingPositions = getSeedingPositions(bracketSize)

  sortedEntries.forEach((entry, index) => {
    const player: MatchPlayer = {
      id: entry.playerId,
      name: entry.playerName,
      seed: entry.seed
    }

    if (entry.seed && entry.seed <= seedingPositions.length) {
      const position = seedingPositions[entry.seed - 1]
      players[position] = player
    } else {
      // Fill first empty position for unseeded players
      const firstEmpty = players.findIndex(p => p === undefined)
      if (firstEmpty !== -1) {
        players[firstEmpty] = player
      } else {
        players.push(player)
      }
    }
  })

  // Fill remaining positions with byes
  while (players.length < bracketSize) {
    players.push(null)
  }

  // Generate first round matches
  const matches: Match[] = []
  let matchNumber = 1

  for (let i = 0; i < players.length; i += 2) {
    const player1 = players[i]
    const player2 = players[i + 1]

    const match: Match = {
      id: `match-${matchNumber}`,
      matchNumber,
      round: 1,
      roundName: getRoundName(1, numberOfRounds),
      player1: player1 ? player1 : { id: 'bye', name: 'BYE', isBye: true },
      player2: player2 ? player2 : { id: 'bye', name: 'BYE', isBye: true },
      status: (player1 && !player2) || (player2 && !player1) ? 'completed' : 'scheduled',
      winner: !player1 && player2 ? player2.id : player1 && !player2 ? player1.id : undefined
    }

    matches.push(match)
    matchNumber++
  }

  // Generate subsequent rounds (empty matches to be filled by winners)
  let previousRoundMatches = matches.length
  for (let round = 2; round <= numberOfRounds; round++) {
    const matchesInRound = previousRoundMatches / 2

    for (let i = 0; i < matchesInRound; i++) {
      matches.push({
        id: `match-${matchNumber}`,
        matchNumber,
        round,
        roundName: getRoundName(round, numberOfRounds),
        status: 'scheduled'
      })
      matchNumber++
    }

    previousRoundMatches = matchesInRound
  }

  return {
    type: 'single_elimination',
    matches,
    bracketSize,
    numberOfRounds,
    generatedAt: new Date().toISOString()
  }
}

// Generate Round Robin Draw
export function generateRoundRobinDraw(entries: TournamentEntry[]): Draw {
  const acceptedEntries = entries.filter(e => e.status === 'accepted')
  const numPlayers = acceptedEntries.length

  // Determine number of groups (typically 4-6 players per group)
  const numGroups = Math.ceil(numPlayers / 5)
  const playersPerGroup = Math.ceil(numPlayers / numGroups)

  // Shuffle and distribute players into groups
  const shuffled = [...acceptedEntries].sort(() => Math.random() - 0.5)
  const groups: RoundRobinGroup[] = []

  for (let g = 0; g < numGroups; g++) {
    const groupPlayers = shuffled.slice(g * playersPerGroup, (g + 1) * playersPerGroup)
    const groupName = String.fromCharCode(65 + g) // A, B, C, etc.

    const players: MatchPlayer[] = groupPlayers.map(entry => ({
      id: entry.playerId,
      name: entry.playerName,
      seed: entry.seed
    }))

    // Generate round-robin matches within the group
    const groupMatches: Match[] = []
    let matchNumber = 1

    for (let i = 0; i < players.length; i++) {
      for (let j = i + 1; j < players.length; j++) {
        groupMatches.push({
          id: `group-${groupName}-match-${matchNumber}`,
          matchNumber,
          round: 1,
          roundName: `Group ${groupName}`,
          player1: players[i],
          player2: players[j],
          status: 'scheduled'
        })
        matchNumber++
      }
    }

    groups.push({
      groupName: `Group ${groupName}`,
      players,
      matches: groupMatches
    })
  }

  return {
    type: 'round_robin',
    matches: groups.flatMap(g => g.matches),
    roundRobinGroups: groups,
    generatedAt: new Date().toISOString()
  }
}

// Generate Feed-in/Compass Draw
export function generateFeedInDraw(entries: TournamentEntry[]): Draw {
  const acceptedEntries = entries.filter(e => e.status === 'accepted')

  // Main draw (single elimination)
  const mainDraw = generateSingleEliminationDraw(acceptedEntries)

  // Consolation draw - losers from first round feed into consolation bracket
  // This is a simplified version - full compass draw would have multiple consolation levels
  const consolationMatches: Match[] = []
  const firstRoundMatches = mainDraw.matches.filter(m => m.round === 1)

  let matchNumber = mainDraw.matches.length + 1

  // Group first round losers for consolation
  for (let i = 0; i < firstRoundMatches.length; i += 2) {
    if (i + 1 < firstRoundMatches.length) {
      consolationMatches.push({
        id: `consolation-match-${matchNumber}`,
        matchNumber,
        round: 1,
        roundName: 'Consolation Round 1',
        status: 'scheduled'
      })
      matchNumber++
    }
  }

  return {
    type: 'feed_in',
    matches: [...mainDraw.matches, ...consolationMatches],
    bracketSize: mainDraw.bracketSize,
    numberOfRounds: mainDraw.numberOfRounds,
    generatedAt: new Date().toISOString()
  }
}

// Standard seeding positions for different draw sizes
function getSeedingPositions(drawSize: number): number[] {
  // ITF standard seeding positions
  const positions: Record<number, number[]> = {
    4: [0, 3, 1, 2],
    8: [0, 7, 3, 4, 1, 6, 2, 5],
    16: [0, 15, 7, 8, 3, 12, 4, 11, 1, 14, 6, 9, 2, 13, 5, 10],
    32: [0, 31, 15, 16, 7, 24, 8, 23, 3, 28, 12, 19, 4, 27, 11, 20,
         1, 30, 14, 17, 6, 25, 9, 22, 2, 29, 13, 18, 5, 26, 10, 21],
    64: generateSeedingPositions64(),
    128: generateSeedingPositions128()
  }

  return positions[drawSize] || []
}

function generateSeedingPositions64(): number[] {
  // Standard 64-draw seeding
  const base = [0, 63, 31, 32, 15, 48, 16, 47, 7, 56, 24, 39, 8, 55, 23, 40,
                3, 60, 28, 35, 12, 51, 19, 44, 4, 59, 27, 36, 11, 52, 20, 43]
  return [...base, ...base.map(n => 63 - n)]
}

function generateSeedingPositions128(): number[] {
  // Standard 128-draw seeding (simplified)
  const positions: number[] = []
  for (let i = 0; i < 128; i++) {
    positions.push(i)
  }
  return positions
}

// Update match result and advance winner
export function updateMatchResult(
  draw: Draw,
  matchId: string,
  winnerId: string,
  score: string
): Draw {
  const updatedMatches = [...draw.matches]
  const matchIndex = updatedMatches.findIndex(m => m.id === matchId)

  if (matchIndex === -1) return draw

  // Update match with result
  updatedMatches[matchIndex] = {
    ...updatedMatches[matchIndex],
    winner: winnerId,
    score,
    status: 'completed',
    completedTime: new Date().toISOString()
  }

  // For single elimination, advance winner to next round
  if (draw.type === 'single_elimination') {
    const match = updatedMatches[matchIndex]
    const winner = match.player1?.id === winnerId ? match.player1 : match.player2

    if (winner) {
      // Find next match (winner should advance to)
      const nextRound = match.round + 1
      const matchPosition = match.matchNumber - 1
      const nextMatchIndex = Math.floor(matchPosition / 2)
      const isFirstPlayer = matchPosition % 2 === 0

      const nextMatches = updatedMatches.filter(m => m.round === nextRound)
      if (nextMatches[nextMatchIndex]) {
        const nextMatchId = nextMatches[nextMatchIndex].id
        const nextMatchFullIndex = updatedMatches.findIndex(m => m.id === nextMatchId)

        if (isFirstPlayer) {
          updatedMatches[nextMatchFullIndex].player1 = winner
        } else {
          updatedMatches[nextMatchFullIndex].player2 = winner
        }
      }
    }
  }

  return {
    ...draw,
    matches: updatedMatches
  }
}
