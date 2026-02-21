/**
 * Tennis Scoring Engine - Pure functions, no side effects
 *
 * Handles: regular games, deuce/advantage, no-ad (sudden death at deuce),
 * tiebreaks at 6-6, match tiebreaks (10-pt deciding set), server alternation,
 * tiebreak server rotation, undo via snapshot history.
 */

/**
 * Create initial match state
 * @param {Object} settings - { bestOf: 3|5, tiebreakAt: 6, finalSetTiebreak: true, finalSetTiebreakTo: 10, noAd: false }
 * @param {0|1} firstServer - Who serves first (0 or 1)
 * @returns {Object} Initial match state
 */
export function createInitialState(settings = {}, firstServer = 0) {
  const defaults = {
    bestOf: 3,
    tiebreakAt: 6,
    finalSetTiebreak: true,
    finalSetTiebreakTo: 10,
    noAd: false
  };

  return {
    settings: { ...defaults, ...settings },
    sets: [{ games: [0, 0], winner: null }],
    currentGame: { points: [0, 0], isTiebreak: false, isMatchTiebreak: false },
    server: firstServer,
    pointHistory: [],
    winner: null,
    status: 'in_progress'
  };
}

/**
 * Deep clone state (without pointHistory to save memory in snapshots)
 */
function cloneStateForHistory(state) {
  return {
    settings: { ...state.settings },
    sets: state.sets.map(s => ({
      games: [...s.games],
      tiebreak: s.tiebreak ? [...s.tiebreak] : undefined,
      winner: s.winner
    })),
    currentGame: {
      points: [...state.currentGame.points],
      isTiebreak: state.currentGame.isTiebreak,
      isMatchTiebreak: state.currentGame.isMatchTiebreak
    },
    server: state.server,
    pointHistory: [], // Don't nest histories
    winner: state.winner,
    status: state.status
  };
}

/**
 * Deep clone full state
 */
function cloneState(state) {
  return {
    settings: { ...state.settings },
    sets: state.sets.map(s => ({
      games: [...s.games],
      tiebreak: s.tiebreak ? [...s.tiebreak] : undefined,
      winner: s.winner
    })),
    currentGame: {
      points: [...state.currentGame.points],
      isTiebreak: state.currentGame.isTiebreak,
      isMatchTiebreak: state.currentGame.isMatchTiebreak
    },
    server: state.server,
    pointHistory: [...state.pointHistory], // Keep history reference
    winner: state.winner,
    status: state.status
  };
}

/**
 * Check if this is the final (deciding) set
 */
function isFinalSet(state) {
  const setsToWin = Math.ceil(state.settings.bestOf / 2);
  const setsWon = [0, 0];
  state.sets.forEach(s => {
    if (s.winner !== null && s.winner !== undefined) setsWon[s.winner]++;
  });
  // It's the final set if one more set win would clinch the match
  return setsWon[0] === setsToWin - 1 && setsWon[1] === setsToWin - 1;
}

/**
 * Award a point to a player
 * @param {Object} state - Current match state
 * @param {0|1} playerIndex - Which player won the point
 * @returns {Object} New match state
 */
export function awardPoint(state, playerIndex) {
  if (state.status === 'completed') {
    return state;
  }

  // Save snapshot for undo
  const snapshot = cloneStateForHistory(state);
  const newState = cloneState(state);
  newState.pointHistory = [...state.pointHistory, snapshot];

  const { currentGame, sets } = newState;
  const currentSet = sets[sets.length - 1];

  if (currentGame.isMatchTiebreak) {
    return handleMatchTiebreakPoint(newState, playerIndex);
  }

  if (currentGame.isTiebreak) {
    return handleTiebreakPoint(newState, playerIndex);
  }

  return handleRegularPoint(newState, playerIndex);
}

/**
 * Handle a regular game point
 */
function handleRegularPoint(state, playerIndex) {
  const { currentGame, sets, settings } = state;
  const currentSet = sets[sets.length - 1];
  const opponent = playerIndex === 0 ? 1 : 0;

  currentGame.points[playerIndex]++;

  const p = currentGame.points;

  // Check for game win
  let gameWon = false;

  if (settings.noAd) {
    // No-ad scoring: first to 4 points, at 3-3 it's sudden death (receiver chooses side)
    if (p[playerIndex] >= 4) {
      if (p[opponent] < 3) {
        gameWon = true;
      } else if (p[playerIndex] === 4 && p[opponent] === 3) {
        // 40-40 was played, and this player won the sudden death point
        gameWon = true;
      }
    }
  } else {
    // Standard ad scoring: need 4+ points and 2+ point lead
    if (p[playerIndex] >= 4 && p[playerIndex] - p[opponent] >= 2) {
      gameWon = true;
    }
  }

  if (gameWon) {
    return handleGameWon(state, playerIndex);
  }

  return state;
}

/**
 * Handle tiebreak point (standard tiebreak)
 */
function handleTiebreakPoint(state, playerIndex) {
  const { currentGame } = state;
  const opponent = playerIndex === 0 ? 1 : 0;

  currentGame.points[playerIndex]++;

  const p = currentGame.points;
  const totalPoints = p[0] + p[1];

  // Tiebreak server rotation: after first point, then every 2 points
  if (totalPoints > 0 && (totalPoints === 1 || (totalPoints - 1) % 2 === 0)) {
    state.server = state.server === 0 ? 1 : 0;
  }

  // Win tiebreak: first to 7 with 2+ lead
  if (p[playerIndex] >= 7 && p[playerIndex] - p[opponent] >= 2) {
    const currentSet = state.sets[state.sets.length - 1];
    currentSet.tiebreak = [...p];
    return handleGameWon(state, playerIndex);
  }

  return state;
}

/**
 * Handle match tiebreak point (deciding set super tiebreak)
 */
function handleMatchTiebreakPoint(state, playerIndex) {
  const { currentGame, settings } = state;
  const opponent = playerIndex === 0 ? 1 : 0;

  currentGame.points[playerIndex]++;

  const p = currentGame.points;
  const totalPoints = p[0] + p[1];
  const target = settings.finalSetTiebreakTo || 10;

  // Same server rotation as regular tiebreak
  if (totalPoints > 0 && (totalPoints === 1 || (totalPoints - 1) % 2 === 0)) {
    state.server = state.server === 0 ? 1 : 0;
  }

  // Win match tiebreak: first to target with 2+ lead
  if (p[playerIndex] >= target && p[playerIndex] - p[opponent] >= 2) {
    const currentSet = state.sets[state.sets.length - 1];
    currentSet.tiebreak = [...p];
    return handleGameWon(state, playerIndex);
  }

  return state;
}

/**
 * Handle a game being won - update set score, check for set/match win
 */
function handleGameWon(state, playerIndex) {
  const { sets, settings, currentGame } = state;
  const currentSet = sets[sets.length - 1];
  const opponent = playerIndex === 0 ? 1 : 0;

  currentSet.games[playerIndex]++;

  // Check for set win
  const g = currentSet.games;
  let setWon = false;

  if (currentGame.isTiebreak || currentGame.isMatchTiebreak) {
    // Tiebreak game won means set is won
    setWon = true;
  } else if (g[playerIndex] >= 6 && g[playerIndex] - g[opponent] >= 2) {
    // Regular set win: 6+ games with 2+ lead
    setWon = true;
  } else if (g[playerIndex] === 6 && g[opponent] === 6) {
    // 6-6: start tiebreak
    const finalSet = isFinalSet(state);
    if (finalSet && settings.finalSetTiebreak) {
      // Match tiebreak in deciding set
      state.currentGame = { points: [0, 0], isTiebreak: false, isMatchTiebreak: true };
      // Server stays as whoever would serve next
      if (!currentGame.isTiebreak) {
        state.server = state.server === 0 ? 1 : 0;
      }
      return state;
    }
    // Regular tiebreak
    state.currentGame = { points: [0, 0], isTiebreak: true, isMatchTiebreak: false };
    // Server stays as whoever would serve next (alternation handled in tiebreak)
    if (!currentGame.isTiebreak) {
      state.server = state.server === 0 ? 1 : 0;
    }
    return state;
  }

  if (setWon) {
    currentSet.winner = playerIndex;

    // Check for match win
    const setsToWin = Math.ceil(settings.bestOf / 2);
    const setsWon = sets.filter(s => s.winner === playerIndex).length;

    if (setsWon >= setsToWin) {
      // Match won!
      state.winner = playerIndex;
      state.status = 'completed';
      state.currentGame = { points: [0, 0], isTiebreak: false, isMatchTiebreak: false };
      return state;
    }

    // Start new set
    sets.push({ games: [0, 0], winner: null });
    state.currentGame = { points: [0, 0], isTiebreak: false, isMatchTiebreak: false };

    // After tiebreak, the player who received first in the tiebreak serves the new set
    // After regular game, alternate server
    if (!currentGame.isTiebreak && !currentGame.isMatchTiebreak) {
      state.server = state.server === 0 ? 1 : 0;
    } else {
      state.server = state.server === 0 ? 1 : 0;
    }

    return state;
  }

  // No set won - new game, alternate server
  state.currentGame = { points: [0, 0], isTiebreak: false, isMatchTiebreak: false };
  state.server = state.server === 0 ? 1 : 0;

  return state;
}

/**
 * Undo the last point
 * @param {Object} state - Current match state
 * @returns {Object} Previous match state (or same if no history)
 */
export function undoPoint(state) {
  if (!state.pointHistory || state.pointHistory.length === 0) {
    return state;
  }

  const previousState = state.pointHistory[state.pointHistory.length - 1];
  previousState.pointHistory = state.pointHistory.slice(0, -1);
  return previousState;
}

/**
 * Get display-friendly score
 * @param {Object} state - Current match state
 * @returns {Object} Display score
 */
export function getDisplayScore(state) {
  const pointNames = ['0', '15', '30', '40'];

  const currentGame = state.currentGame;
  let gameDisplay;

  if (currentGame.isTiebreak || currentGame.isMatchTiebreak) {
    gameDisplay = {
      display: [String(currentGame.points[0]), String(currentGame.points[1])],
      isTiebreak: currentGame.isTiebreak,
      isMatchTiebreak: currentGame.isMatchTiebreak
    };
  } else {
    const p = currentGame.points;

    if (p[0] >= 3 && p[1] >= 3) {
      // Deuce territory
      if (p[0] === p[1]) {
        gameDisplay = {
          display: ['40', '40'],
          isTiebreak: false,
          isMatchTiebreak: false
        };
      } else if (state.settings.noAd) {
        gameDisplay = {
          display: ['40', '40'],
          isTiebreak: false,
          isMatchTiebreak: false
        };
      } else {
        const leader = p[0] > p[1] ? 0 : 1;
        const display = ['40', '40'];
        display[leader] = 'AD';
        gameDisplay = {
          display,
          isTiebreak: false,
          isMatchTiebreak: false
        };
      }
    } else {
      gameDisplay = {
        display: [
          pointNames[Math.min(p[0], 3)] || String(p[0]),
          pointNames[Math.min(p[1], 3)] || String(p[1])
        ],
        isTiebreak: false,
        isMatchTiebreak: false
      };
    }
  }

  return {
    sets: state.sets.map(s => [s.games[0], s.games[1]]),
    currentGame: gameDisplay,
    server: state.server,
    winner: state.winner,
    status: state.status
  };
}

/**
 * Get final score string for a completed match
 * @param {Object} state - Match state
 * @returns {string} Score string like "6-4 3-6 10-8"
 */
export function getScoreString(state) {
  if (state.winner === null) return '';

  return state.sets
    .filter(s => s.winner !== null && s.winner !== undefined)
    .map(s => {
      let score = `${s.games[0]}-${s.games[1]}`;
      if (s.tiebreak) {
        const loserTBPoints = Math.min(s.tiebreak[0], s.tiebreak[1]);
        score += `(${loserTBPoints})`;
      }
      return score;
    })
    .join(' ');
}
