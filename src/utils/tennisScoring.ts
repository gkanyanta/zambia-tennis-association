/**
 * Tennis Scoring Engine - TypeScript mirror of server/src/utils/tennisScoring.js
 * Used for optimistic UI updates on the client.
 */

import type { MatchSettings, MatchState, DisplayScore } from '@/types/liveMatch'

export function createInitialState(
  settings: Partial<MatchSettings> = {},
  firstServer: 0 | 1 = 0
): MatchState {
  const defaults: MatchSettings = {
    bestOf: 3,
    tiebreakAt: 6,
    finalSetTiebreak: true,
    finalSetTiebreakTo: 10,
    noAd: false
  }

  return {
    settings: { ...defaults, ...settings },
    sets: [{ games: [0, 0], winner: undefined }],
    currentGame: { points: [0, 0], isTiebreak: false, isMatchTiebreak: false },
    server: firstServer,
    pointHistory: [],
    winner: null,
    status: 'in_progress'
  }
}

function cloneStateForHistory(state: MatchState): MatchState {
  return {
    settings: { ...state.settings },
    sets: state.sets.map(s => ({
      games: [...s.games] as [number, number],
      tiebreak: s.tiebreak ? [...s.tiebreak] as [number, number] : undefined,
      winner: s.winner
    })),
    currentGame: {
      points: [...state.currentGame.points] as [number, number],
      isTiebreak: state.currentGame.isTiebreak,
      isMatchTiebreak: state.currentGame.isMatchTiebreak
    },
    server: state.server,
    pointHistory: [],
    winner: state.winner,
    status: state.status
  }
}

function cloneState(state: MatchState): MatchState {
  return {
    settings: { ...state.settings },
    sets: state.sets.map(s => ({
      games: [...s.games] as [number, number],
      tiebreak: s.tiebreak ? [...s.tiebreak] as [number, number] : undefined,
      winner: s.winner
    })),
    currentGame: {
      points: [...state.currentGame.points] as [number, number],
      isTiebreak: state.currentGame.isTiebreak,
      isMatchTiebreak: state.currentGame.isMatchTiebreak
    },
    server: state.server,
    pointHistory: [...state.pointHistory],
    winner: state.winner,
    status: state.status
  }
}

function isFinalSet(state: MatchState): boolean {
  const setsToWin = Math.ceil(state.settings.bestOf / 2)
  const setsWon = [0, 0]
  state.sets.forEach(s => {
    if (s.winner !== null && s.winner !== undefined) setsWon[s.winner]++
  })
  return setsWon[0] === setsToWin - 1 && setsWon[1] === setsToWin - 1
}

export function awardPoint(state: MatchState, playerIndex: 0 | 1): MatchState {
  if (state.status === 'completed') return state

  const snapshot = cloneStateForHistory(state)
  const newState = cloneState(state)
  newState.pointHistory = [...state.pointHistory, snapshot]

  if (newState.currentGame.isMatchTiebreak) {
    return handleMatchTiebreakPoint(newState, playerIndex)
  }
  if (newState.currentGame.isTiebreak) {
    return handleTiebreakPoint(newState, playerIndex)
  }
  return handleRegularPoint(newState, playerIndex)
}

function handleRegularPoint(state: MatchState, playerIndex: 0 | 1): MatchState {
  const { currentGame, settings } = state
  const opponent = playerIndex === 0 ? 1 : 0

  currentGame.points[playerIndex]++
  const p = currentGame.points

  let gameWon = false

  if (settings.noAd) {
    if (p[playerIndex] >= 4) {
      if (p[opponent] < 3) {
        gameWon = true
      } else if (p[playerIndex] === 4 && p[opponent] === 3) {
        gameWon = true
      }
    }
  } else {
    if (p[playerIndex] >= 4 && p[playerIndex] - p[opponent] >= 2) {
      gameWon = true
    }
  }

  if (gameWon) return handleGameWon(state, playerIndex)
  return state
}

function handleTiebreakPoint(state: MatchState, playerIndex: 0 | 1): MatchState {
  const { currentGame } = state
  const opponent = playerIndex === 0 ? 1 : 0

  currentGame.points[playerIndex]++
  const p = currentGame.points
  const totalPoints = p[0] + p[1]

  if (totalPoints > 0 && (totalPoints === 1 || (totalPoints - 1) % 2 === 0)) {
    state.server = state.server === 0 ? 1 : 0
  }

  if (p[playerIndex] >= 7 && p[playerIndex] - p[opponent] >= 2) {
    const currentSet = state.sets[state.sets.length - 1]
    currentSet.tiebreak = [...p] as [number, number]
    return handleGameWon(state, playerIndex)
  }

  return state
}

function handleMatchTiebreakPoint(state: MatchState, playerIndex: 0 | 1): MatchState {
  const { currentGame, settings } = state
  const opponent = playerIndex === 0 ? 1 : 0

  currentGame.points[playerIndex]++
  const p = currentGame.points
  const totalPoints = p[0] + p[1]
  const target = settings.finalSetTiebreakTo || 10

  if (totalPoints > 0 && (totalPoints === 1 || (totalPoints - 1) % 2 === 0)) {
    state.server = state.server === 0 ? 1 : 0
  }

  if (p[playerIndex] >= target && p[playerIndex] - p[opponent] >= 2) {
    const currentSet = state.sets[state.sets.length - 1]
    currentSet.tiebreak = [...p] as [number, number]
    return handleGameWon(state, playerIndex)
  }

  return state
}

function handleGameWon(state: MatchState, playerIndex: 0 | 1): MatchState {
  const { sets, settings, currentGame } = state
  const currentSet = sets[sets.length - 1]
  const opponent = playerIndex === 0 ? 1 : 0

  currentSet.games[playerIndex]++

  const g = currentSet.games
  let setWon = false

  const gamesForSet = settings.tiebreakAt || 6
  if (currentGame.isTiebreak || currentGame.isMatchTiebreak) {
    setWon = true
  } else if (g[playerIndex] >= gamesForSet && g[playerIndex] - g[opponent] >= 2) {
    setWon = true
  } else if (g[playerIndex] === gamesForSet && g[opponent] === gamesForSet) {
    const finalSet = isFinalSet(state)
    if (finalSet && settings.finalSetTiebreak) {
      state.currentGame = { points: [0, 0], isTiebreak: false, isMatchTiebreak: true }
      if (!currentGame.isTiebreak) {
        state.server = state.server === 0 ? 1 : 0
      }
      return state
    }
    state.currentGame = { points: [0, 0], isTiebreak: true, isMatchTiebreak: false }
    if (!currentGame.isTiebreak) {
      state.server = state.server === 0 ? 1 : 0
    }
    return state
  }

  if (setWon) {
    currentSet.winner = playerIndex

    const setsToWin = Math.ceil(settings.bestOf / 2)
    const setsWonCount = sets.filter(s => s.winner === playerIndex).length

    if (setsWonCount >= setsToWin) {
      state.winner = playerIndex
      state.status = 'completed'
      state.currentGame = { points: [0, 0], isTiebreak: false, isMatchTiebreak: false }
      return state
    }

    sets.push({ games: [0, 0], winner: undefined })
    state.currentGame = { points: [0, 0], isTiebreak: false, isMatchTiebreak: false }
    state.server = state.server === 0 ? 1 : 0
    return state
  }

  state.currentGame = { points: [0, 0], isTiebreak: false, isMatchTiebreak: false }
  state.server = state.server === 0 ? 1 : 0
  return state
}

export function undoPoint(state: MatchState): MatchState {
  if (!state.pointHistory || state.pointHistory.length === 0) return state

  const previousState = state.pointHistory[state.pointHistory.length - 1]
  previousState.pointHistory = state.pointHistory.slice(0, -1)
  return previousState
}

export function getDisplayScore(state: MatchState): DisplayScore {
  const pointNames = ['0', '15', '30', '40']
  const currentGame = state.currentGame
  let gameDisplay: DisplayScore['currentGame']

  if (currentGame.isTiebreak || currentGame.isMatchTiebreak) {
    gameDisplay = {
      display: [String(currentGame.points[0]), String(currentGame.points[1])],
      isTiebreak: currentGame.isTiebreak,
      isMatchTiebreak: currentGame.isMatchTiebreak
    }
  } else {
    const p = currentGame.points
    if (p[0] >= 3 && p[1] >= 3) {
      if (p[0] === p[1]) {
        gameDisplay = { display: ['40', '40'], isTiebreak: false, isMatchTiebreak: false }
      } else if (state.settings.noAd) {
        gameDisplay = { display: ['40', '40'], isTiebreak: false, isMatchTiebreak: false }
      } else {
        const leader = p[0] > p[1] ? 0 : 1
        const display: [string, string] = ['40', '40']
        display[leader] = 'AD'
        gameDisplay = { display, isTiebreak: false, isMatchTiebreak: false }
      }
    } else {
      gameDisplay = {
        display: [
          pointNames[Math.min(p[0], 3)] || String(p[0]),
          pointNames[Math.min(p[1], 3)] || String(p[1])
        ],
        isTiebreak: false,
        isMatchTiebreak: false
      }
    }
  }

  return {
    sets: state.sets.map(s => [s.games[0], s.games[1]] as [number, number]),
    currentGame: gameDisplay,
    server: state.server,
    winner: state.winner,
    status: state.status
  }
}

export function getScoreString(state: MatchState): string {
  if (state.winner === null) return ''

  return state.sets
    .filter(s => s.winner !== null && s.winner !== undefined)
    .map(s => {
      let score = `${s.games[0]}-${s.games[1]}`
      if (s.tiebreak) {
        const loserTBPoints = Math.min(s.tiebreak[0], s.tiebreak[1])
        score += `(${loserTBPoints})`
      }
      return score
    })
    .join(' ')
}
