import type {
  Draw,
  Match,
  MatchPlayer,
  RoundRobinGroup,
  TournamentEntry,
  MixerRound,
  MixerStanding,
  MixerRating,
  MixerCourt
} from '@/types/tournament'
import { getNextPowerOfTwo, getRoundName } from '@/types/tournament'

// Generate Single Elimination Draw
// BYEs are assigned to top seeds first (seed 1 gets BYE, then seed 2, etc.)
export function generateSingleEliminationDraw(entries: TournamentEntry[]): Draw {
  const acceptedEntries = entries.filter(e => e.status === 'accepted')
  const numPlayers = acceptedEntries.length
  const bracketSize = getNextPowerOfTwo(numPlayers)
  const numberOfRounds = Math.log2(bracketSize)
  const numByes = bracketSize - numPlayers

  // Sort entries by seed (seeded players first, then unseeded)
  const sortedEntries = [...acceptedEntries].sort((a, b) => {
    if (a.seed && b.seed) return a.seed - b.seed
    if (a.seed) return -1
    if (b.seed) return 1
    return 0
  })

  // Standard seeding positions for the bracket
  const seedingPositions = getSeedingPositions(bracketSize)

  // Initialize bracket positions
  const players: (MatchPlayer | null)[] = new Array(bracketSize).fill(null)

  // Place seeded players at their standard positions
  const seededEntries = sortedEntries.filter(e => e.seed)
  const unseededEntries = sortedEntries.filter(e => !e.seed)

  seededEntries.forEach((entry) => {
    const player: MatchPlayer = {
      id: entry.playerId,
      name: entry.playerName,
      seed: entry.seed
    }
    if (entry.seed! <= seedingPositions.length) {
      const position = seedingPositions[entry.seed! - 1]
      players[position] = player
    }
  })

  // Determine which positions get BYEs.
  // BYEs should go to the top seeds first.
  // In a standard bracket, seed 1 is at position 0 and faces position 1,
  // seed 2 is at the opposite end, etc. The BYE goes opposite the seed.
  const byePositions = new Set<number>()

  if (numByes > 0) {
    // For each BYE, assign it opposite the highest seeds first
    for (let i = 0; i < numByes && i < seedingPositions.length; i++) {
      const seedPos = seedingPositions[i]
      // The opponent position is the other half of the same first-round match
      const opponentPos = seedPos % 2 === 0 ? seedPos + 1 : seedPos - 1
      byePositions.add(opponentPos)
    }

    // If we have more BYEs than seeds, assign remaining BYEs to unfilled positions
    if (byePositions.size < numByes) {
      for (let i = 0; i < bracketSize && byePositions.size < numByes; i++) {
        if (!players[i] && !byePositions.has(i)) {
          byePositions.add(i)
        }
      }
    }
  }

  // Place unseeded players in remaining non-BYE positions
  const availablePositions: number[] = []
  for (let i = 0; i < bracketSize; i++) {
    if (!players[i] && !byePositions.has(i)) {
      availablePositions.push(i)
    }
  }

  unseededEntries.forEach((entry, idx) => {
    if (idx < availablePositions.length) {
      players[availablePositions[idx]] = {
        id: entry.playerId,
        name: entry.playerName,
        seed: entry.seed
      }
    }
  })

  // Generate first round matches
  const matches: Match[] = []
  let matchNumber = 1

  for (let i = 0; i < bracketSize; i += 2) {
    const player1 = players[i]
    const player2 = byePositions.has(i + 1) ? null : players[i + 1]
    const isByeP1 = byePositions.has(i)

    const p1: MatchPlayer = isByeP1
      ? { id: 'bye', name: 'BYE', isBye: true }
      : player1 ? player1 : { id: 'bye', name: 'BYE', isBye: true }

    const p2: MatchPlayer = byePositions.has(i + 1)
      ? { id: 'bye', name: 'BYE', isBye: true }
      : player2 ? player2 : { id: 'bye', name: 'BYE', isBye: true }

    const hasBye = p1.isBye || p2.isBye
    const realPlayer = p1.isBye ? (p2.isBye ? undefined : p2) : p1

    const match: Match = {
      id: `match-${matchNumber}`,
      matchNumber,
      round: 1,
      roundName: getRoundName(1, numberOfRounds),
      player1: p1,
      player2: p2,
      status: hasBye && realPlayer ? 'completed' : 'scheduled',
      winner: hasBye && realPlayer ? realPlayer.id : undefined
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

  // Auto-advance BYE winners into round 2
  const round1Matches = matches.filter(m => m.round === 1)
  const round2Matches = matches.filter(m => m.round === 2)

  round1Matches.forEach((m, idx) => {
    if (m.winner && m.status === 'completed') {
      const nextMatchIdx = Math.floor(idx / 2)
      const isFirstPlayer = idx % 2 === 0
      const winner = m.player1?.id === m.winner ? m.player1 : m.player2

      if (winner && round2Matches[nextMatchIdx]) {
        const r2Match = round2Matches[nextMatchIdx]
        const r2FullIdx = matches.findIndex(x => x.id === r2Match.id)
        if (isFirstPlayer) {
          matches[r2FullIdx].player1 = { ...winner, isBye: undefined }
        } else {
          matches[r2FullIdx].player2 = { ...winner, isBye: undefined }
        }
      }
    }
  })

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

// Generate Mixer Draw (for madalas social doubles)
// Circle-method rotation: A players stay, B players rotate
export function generateMixerDraw(
  entries: TournamentEntry[],
  mixerRatings: MixerRating[]
): Draw {
  // Build rated player lists
  const ratingMap = new Map(mixerRatings.map(r => [r.playerId, r]))
  const acceptedEntries = entries.filter(e => e.status === 'accepted')

  const aPlayers: { playerId: string; playerName: string; gender: 'male' | 'female' }[] = []
  const bPlayers: { playerId: string; playerName: string; gender: 'male' | 'female' }[] = []

  for (const entry of acceptedEntries) {
    const rating = ratingMap.get(entry.playerId)
    if (!rating) continue
    const player = { playerId: entry.playerId, playerName: entry.playerName, gender: entry.gender }
    if (rating.rating === 'A') aPlayers.push(player)
    else bPlayers.push(player)
  }

  // Shuffle both lists
  const shuffle = <T>(arr: T[]): T[] => {
    const a = [...arr]
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[a[i], a[j]] = [a[j], a[i]]
    }
    return a
  }

  const shuffledA = shuffle(aPlayers)
  const shuffledB = shuffle(bPlayers)

  const numPairs = Math.min(shuffledA.length, shuffledB.length)
  if (numPairs < 2) {
    // Not enough pairs — return minimal draw
    return {
      type: 'mixer',
      matches: [],
      mixerRounds: [],
      mixerStandings: [],
      generatedAt: new Date().toISOString()
    }
  }

  // Generate rounds using circle method
  // numPairs - 1 rounds (or numPairs if odd, but we handle bye separately)
  const numRounds = numPairs - 1
  const rounds: MixerRound[] = []

  for (let r = 0; r < numRounds; r++) {
    // In round r, A[i] pairs with B[(i + r) % numPairs]
    const pairs: { a: typeof shuffledA[0]; b: typeof shuffledB[0] }[] = []
    for (let i = 0; i < numPairs; i++) {
      pairs.push({
        a: shuffledA[i],
        b: shuffledB[(i + r) % numPairs]
      })
    }

    // Group consecutive pairs onto courts (2 pairs per court)
    const courts: MixerCourt[] = []
    let courtNum = 1
    for (let i = 0; i < pairs.length - 1; i += 2) {
      courts.push({
        courtNumber: courtNum++,
        pair1A: { playerId: pairs[i].a.playerId, playerName: pairs[i].a.playerName },
        pair1B: { playerId: pairs[i].b.playerId, playerName: pairs[i].b.playerName },
        pair2A: { playerId: pairs[i + 1].a.playerId, playerName: pairs[i + 1].a.playerName },
        pair2B: { playerId: pairs[i + 1].b.playerId, playerName: pairs[i + 1].b.playerName },
        pair1GamesWon: null,
        pair2GamesWon: null,
        status: 'scheduled'
      })
    }

    rounds.push({
      roundNumber: r + 1,
      courts
    })
  }

  // Initialize standings for all paired players
  const standings: MixerStanding[] = []
  const addedPlayers = new Set<string>()

  for (let i = 0; i < numPairs; i++) {
    const a = shuffledA[i]
    const b = shuffledB[i]
    if (!addedPlayers.has(a.playerId)) {
      standings.push({
        playerId: a.playerId,
        playerName: a.playerName,
        gender: a.gender,
        rating: 'A',
        roundsPlayed: 0,
        totalGamesWon: 0,
        totalGamesLost: 0
      })
      addedPlayers.add(a.playerId)
    }
    if (!addedPlayers.has(b.playerId)) {
      standings.push({
        playerId: b.playerId,
        playerName: b.playerName,
        gender: b.gender,
        rating: 'B',
        roundsPlayed: 0,
        totalGamesWon: 0,
        totalGamesLost: 0
      })
      addedPlayers.add(b.playerId)
    }
  }

  return {
    type: 'mixer',
    matches: [],
    mixerRounds: rounds,
    mixerStandings: standings,
    generatedAt: new Date().toISOString()
  }
}

// Compute mixer standings from completed courts
export function computeMixerStandings(draw: Draw): MixerStanding[] {
  if (!draw.mixerRounds || !draw.mixerStandings) return []

  // Reset standings
  const standingsMap = new Map<string, MixerStanding>()
  for (const s of draw.mixerStandings) {
    standingsMap.set(s.playerId, {
      ...s,
      roundsPlayed: 0,
      totalGamesWon: 0,
      totalGamesLost: 0
    })
  }

  for (const round of draw.mixerRounds) {
    for (const court of round.courts) {
      if (court.status !== 'completed' || court.pair1GamesWon === null || court.pair2GamesWon === null) continue

      const p1Games = court.pair1GamesWon
      const p2Games = court.pair2GamesWon

      // Pair 1 players (A and B) each get pair1's games won
      for (const player of [court.pair1A, court.pair1B]) {
        const s = standingsMap.get(player.playerId)
        if (s) {
          s.roundsPlayed++
          s.totalGamesWon += p1Games
          s.totalGamesLost += p2Games
        }
      }

      // Pair 2 players
      for (const player of [court.pair2A, court.pair2B]) {
        const s = standingsMap.get(player.playerId)
        if (s) {
          s.roundsPlayed++
          s.totalGamesWon += p2Games
          s.totalGamesLost += p1Games
        }
      }
    }
  }

  return Array.from(standingsMap.values()).sort((a, b) => b.totalGamesWon - a.totalGamesWon)
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
      const nextRound = match.round + 1

      // Find this match's position WITHIN its round (not global matchNumber)
      const currentRoundMatches = updatedMatches
        .filter(m => m.round === match.round)
        .sort((a, b) => a.matchNumber - b.matchNumber)
      const positionInRound = currentRoundMatches.findIndex(m => m.id === match.id)
      const nextMatchIndex = Math.floor(positionInRound / 2)
      const isFirstPlayer = positionInRound % 2 === 0

      const nextMatches = updatedMatches
        .filter(m => m.round === nextRound)
        .sort((a, b) => a.matchNumber - b.matchNumber)
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
