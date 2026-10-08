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
// Seeds, byes and unseeded players are placed per the ITF draw regulations
// (see placeItfDraw below).
export function generateSingleEliminationDraw(entries: TournamentEntry[]): Draw {
  const acceptedEntries = entries.filter(e => e.status === 'accepted')
  const numPlayers = acceptedEntries.length
  const bracketSize = getNextPowerOfTwo(numPlayers)
  const numberOfRounds = Math.log2(bracketSize)

  const { players, byePositions } = placeItfDraw(acceptedEntries, bracketSize)

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
/**
 * Round robin. `maxPlayersPerGroup` caps the group size — pass the entry
 * count (or a large number) to keep everyone in a single group so that
 * everyone plays everyone, which is what small categories usually want.
 */
export function generateRoundRobinDraw(entries: TournamentEntry[], maxPlayersPerGroup = 5): Draw {
  const acceptedEntries = entries.filter(e => e.status === 'accepted')
  const numPlayers = acceptedEntries.length

  // Determine number of groups from the requested group size
  const groupCap = Math.max(2, Math.min(maxPlayersPerGroup || 5, numPlayers || 2))
  const numGroups = Math.max(1, Math.ceil(numPlayers / groupCap))
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

// Shuffle an array using Fisher-Yates (used for every "drawn by lot" step)
function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// ITF seed lines for a 64 draw (ITF WTT Juniors Regulations, Reg. 49 b i),
// 1-based, one array per seed group: 1 | 2 | 3-4 | 5-8 | 9-12 | 13-16.
// Seeds within a group are drawn by lot onto that group's lines.
const ITF_SEED_LINES_64: number[][] = [
  [1], [64], [17, 48], [16, 32, 33, 49], [9, 25, 40, 56], [8, 24, 41, 57]
]
const SEED_GROUP_UPPER = [1, 2, 4, 8, 12, 16] // highest seed number in each group

/**
 * ITF seed lines for any power-of-two draw. The ITF tables for 16/32/64/128
 * are the same pattern scaled: halving a draw maps line L to ceil(L/2), and
 * doubling maps L to 2L-1 (odd) or 2L (even). Groups that would need more
 * seeds than the draw has lines are dropped.
 */
export function getItfSeedLines(drawSize: number): number[][] {
  let groups = ITF_SEED_LINES_64.map(g => [...g])
  for (let size = 64; size > drawSize; size /= 2) {
    groups = groups.map(g => g.map(l => Math.ceil(l / 2)))
  }
  for (let size = 64; size < drawSize; size *= 2) {
    groups = groups.map(g => g.map(l => (l % 2 ? 2 * l - 1 : 2 * l)))
  }
  return groups.filter((_, i) => SEED_GROUP_UPPER[i] <= drawSize)
}

/** Maximum number of seeds the ITF table supports for a draw size. */
export function maxItfSeeds(drawSize: number): number {
  return Math.min(16, drawSize)
}

function seedGroupIndex(seed: number): number {
  return SEED_GROUP_UPPER.findIndex(upper => seed <= upper)
}

/**
 * Place entries into a bracket following the ITF regulations:
 *  1. Seed 1 on line 1, seed 2 on the last line; seeds 3-4, 5-8, 9-12 and
 *     13-16 drawn by lot onto their group's lines.
 *  2. Byes go to the highest seeds first; any remaining byes are drawn by
 *     lot, spread as evenly as possible across the sections of the draw.
 *  3. Unseeded players are drawn by lot into the remaining lines.
 * Seeds above the table's limit for the draw size are placed as unseeded.
 * Returns 0-based bracket positions.
 */
export function placeItfDraw(
  entries: TournamentEntry[],
  bracketSize: number
): { players: (MatchPlayer | null)[]; byePositions: Set<number> } {
  const players: (MatchPlayer | null)[] = new Array(bracketSize).fill(null)
  const byePositions = new Set<number>()
  const toPlayer = (e: TournamentEntry): MatchPlayer => ({ id: e.playerId, name: e.playerName, seed: e.seed })

  // 1. Seeds
  const groupLines = getItfSeedLines(bracketSize).map(g => shuffleArray(g))
  const maxSeed = maxItfSeeds(bracketSize)
  const bySeed = [...entries]
    .filter(e => e.seed && e.seed > 0 && e.seed <= maxSeed)
    .sort((a, b) => a.seed! - b.seed!)
  const placedSeeds: number[] = [] // 0-based positions, in seed order
  const placedIds = new Set<TournamentEntry>()
  for (const entry of bySeed) {
    const line = groupLines[seedGroupIndex(entry.seed!)]?.shift()
    if (line === undefined) continue // e.g. duplicate seed number: draw as unseeded
    players[line - 1] = toPlayer(entry)
    placedSeeds.push(line - 1)
    placedIds.add(entry)
  }

  // 2. Byes: highest seeds first, then by lot spread evenly across sections
  let byesLeft = bracketSize - entries.length
  const partner = (pos: number) => (pos % 2 === 0 ? pos + 1 : pos - 1)
  for (const pos of placedSeeds) {
    if (byesLeft === 0) break
    if (players[partner(pos)]) continue // two seeds in one pair: no bye to give
    byePositions.add(partner(pos))
    byesLeft--
  }
  if (byesLeft > 0) {
    const numPairs = bracketSize / 2
    const pairHasBye = (p: number) => byePositions.has(2 * p) || byePositions.has(2 * p + 1)
    const eligible = (p: number) => !pairHasBye(p) && !players[2 * p] && !players[2 * p + 1]
    for (const p of allocateByePairs(0, numPairs, byesLeft, eligible, pairHasBye)) {
      byePositions.add(2 * p + (Math.random() < 0.5 ? 0 : 1))
    }
  }

  // 3. Unseeded players (and any seed beyond the table) drawn by lot
  const open: number[] = []
  for (let i = 0; i < bracketSize; i++) {
    if (!players[i] && !byePositions.has(i)) open.push(i)
  }
  const rest = shuffleArray(entries.filter(e => !placedIds.has(e)))
  rest.forEach((entry, i) => {
    if (i < open.length) players[open[i]] = toPlayer(entry)
  })

  return { players, byePositions }
}

/**
 * Choose `count` first-round pairs in [lo, hi) to receive a bye, splitting
 * recursively so each half of every section ends up with as equal a share
 * of the total byes as possible. Ties are broken by lot.
 */
function allocateByePairs(
  lo: number,
  hi: number,
  count: number,
  eligible: (p: number) => boolean,
  hasBye: (p: number) => boolean
): number[] {
  if (count <= 0) return []
  const candidates: number[] = []
  for (let p = lo; p < hi; p++) if (eligible(p)) candidates.push(p)
  if (count >= candidates.length) return candidates
  if (hi - lo === 1) return candidates.slice(0, count)

  const mid = (lo + hi) / 2
  const countIn = (a: number, b: number, f: (p: number) => boolean) => {
    let n = 0
    for (let p = a; p < b; p++) if (f(p)) n++
    return n
  }
  const existL = countIn(lo, mid, hasBye)
  const existR = countIn(mid, hi, hasBye)
  const capL = countIn(lo, mid, eligible)
  const capR = countIn(mid, hi, eligible)

  const total = existL + existR + count
  const targetL = Math.floor(total / 2) + (total % 2 && Math.random() < 0.5 ? 1 : 0)
  let needL = Math.min(capL, Math.max(0, targetL - existL), count)
  let needR = count - needL
  if (needR > capR) {
    needR = capR
    needL = count - needR
  }
  return [
    ...allocateByePairs(lo, mid, needL, eligible, hasBye),
    ...allocateByePairs(mid, hi, needR, eligible, hasBye)
  ]
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
