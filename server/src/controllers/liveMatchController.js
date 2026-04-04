import LiveMatch from '../models/LiveMatch.js';
import Tournament from '../models/Tournament.js';
import User from '../models/User.js';
import { createInitialState, awardPoint, undoPoint, getDisplayScore, getScoreString } from '../utils/tennisScoring.js';
import { postMatchEvent } from '../services/socialMediaService.js';

// @desc    Start a new live scoring session
// @route   POST /api/live-matches
// @access  Private (Admin/Staff)
export const startLiveMatch = async (req, res) => {
  try {
    const { tournamentId, categoryId, matchId, settings, court, firstServer, umpireId } = req.body;

    // Verify tournament and match exist
    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) {
      return res.status(404).json({ success: false, message: 'Tournament not found' });
    }

    const category = tournament.categories.id(categoryId);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    if (!category.draw) {
      return res.status(400).json({ success: false, message: 'Draw not generated yet' });
    }

    // Search draw.matches, roundRobinGroups, then knockoutStage
    let match = category.draw.matches.id(matchId);
    if (!match && category.draw.roundRobinGroups) {
      for (const group of category.draw.roundRobinGroups) {
        match = group.matches.id(matchId);
        if (match) break;
      }
    }
    if (!match && category.draw.knockoutStage?.matches) {
      match = category.draw.knockoutStage.matches.id(matchId);
    }
    if (!match) {
      return res.status(404).json({ success: false, message: 'Match not found' });
    }

    if (!match.player1 || !match.player2 || match.player1.isBye || match.player2.isBye) {
      return res.status(400).json({ success: false, message: 'Both players must be assigned' });
    }

    // Check if a live match already exists for this match
    const existing = await LiveMatch.findOne({
      tournamentId,
      categoryId,
      matchId,
      status: { $ne: 'completed' }
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'A live scoring session already exists for this match',
        data: existing
      });
    }

    // Create initial scoring state
    const matchSettings = {
      bestOf: settings?.bestOf || 3,
      tiebreakAt: settings?.tiebreakAt || 6,
      finalSetTiebreak: settings?.finalSetTiebreak !== false,
      finalSetTiebreakTo: settings?.finalSetTiebreakTo || 10,
      noAd: settings?.noAd || false
    };

    const initialState = createInitialState(matchSettings, firstServer || 0);

    // Determine umpire: use provided umpireId if given, otherwise fall back to current user
    let resolvedUmpireId = req.user?._id?.toString();
    let resolvedUmpireName = req.user ? `${req.user.firstName} ${req.user.lastName}` : undefined;

    if (umpireId) {
      const umpireUser = await User.findById(umpireId);
      if (umpireUser) {
        resolvedUmpireId = umpireUser._id.toString();
        resolvedUmpireName = `${umpireUser.firstName} ${umpireUser.lastName}`;
      }
    }

    const liveMatch = await LiveMatch.create({
      tournamentId,
      categoryId,
      matchId,
      player1: {
        id: match.player1.id,
        name: match.player1.name,
        seed: match.player1.seed
      },
      player2: {
        id: match.player2.id,
        name: match.player2.name,
        seed: match.player2.seed
      },
      matchState: initialState,
      settings: matchSettings,
      court: court || match.court,
      umpireId: resolvedUmpireId,
      umpireName: resolvedUmpireName,
      tournamentName: tournament.name,
      categoryName: category.name,
      roundName: match.roundName || `Round ${match.round}`,
      status: 'warmup'
    });

    // Update tournament match status
    match.status = 'live';
    await tournament.save();

    // Emit socket event
    const io = req.app.locals.io;
    if (io) {
      io.to('scoreboard').emit('match:started', {
        liveMatch: formatLiveMatchForClient(liveMatch)
      });
    }

    // Social media post
    postMatchEvent('matchStarted', {
      player1: liveMatch.player1.name,
      player2: liveMatch.player2.name,
      tournamentName: liveMatch.tournamentName,
      categoryName: liveMatch.categoryName,
      roundName: liveMatch.roundName,
      court: liveMatch.court
    }).catch(() => {});

    res.status(201).json({ success: true, data: liveMatch });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Set first server (umpire picks who serves first before scoring begins)
// @route   PUT /api/live-matches/:id/first-server
// @access  Private (umpire or admin/staff)
export const setFirstServer = async (req, res) => {
  try {
    const { id } = req.params;
    const { firstServer } = req.body;

    if (firstServer !== 0 && firstServer !== 1) {
      return res.status(400).json({ success: false, message: 'firstServer must be 0 or 1' });
    }

    const liveMatch = await LiveMatch.findById(id);
    if (!liveMatch) {
      return res.status(404).json({ success: false, message: 'Live match not found' });
    }

    if (liveMatch.status !== 'warmup') {
      return res.status(400).json({ success: false, message: 'First server can only be set during warmup' });
    }

    if (liveMatch.matchState.pointHistory && liveMatch.matchState.pointHistory.length > 0) {
      return res.status(400).json({ success: false, message: 'Cannot change first server after points have been scored' });
    }

    liveMatch.matchState.server = firstServer;
    liveMatch.markModified('matchState');
    await liveMatch.save();

    res.status(200).json({ success: true, data: liveMatch });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Award a point
// @route   POST /api/live-matches/:id/point
// @access  Private (Admin/Staff)
export const awardPointHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const { playerIndex } = req.body;

    if (playerIndex !== 0 && playerIndex !== 1) {
      return res.status(400).json({ success: false, message: 'playerIndex must be 0 or 1' });
    }

    const liveMatch = await LiveMatch.findById(id);
    if (!liveMatch) {
      return res.status(404).json({ success: false, message: 'Live match not found' });
    }

    if (liveMatch.status === 'completed') {
      return res.status(400).json({ success: false, message: 'Match already completed' });
    }

    // Set status to live on first point
    if (liveMatch.status === 'warmup') {
      liveMatch.status = 'live';
      liveMatch.startedAt = new Date();
    }

    // Run scoring engine
    const currentState = liveMatch.matchState;
    const newState = awardPoint(currentState, playerIndex);
    liveMatch.matchState = newState;
    liveMatch.markModified('matchState');

    // Check if match is completed
    if (newState.status === 'completed') {
      liveMatch.status = 'completed';
      liveMatch.completedAt = new Date();

      // Update tournament draw
      await updateTournamentDraw(liveMatch, newState);
    }

    await liveMatch.save();

    // Emit socket events
    const io = req.app.locals.io;
    if (io) {
      const payload = {
        liveMatchId: liveMatch._id,
        matchState: newState,
        displayScore: getDisplayScore(newState),
        status: liveMatch.status
      };

      // Only broadcast to public scoreboard if not hidden
      if (!liveMatch.hiddenFromScoreboard) {
        io.to('scoreboard').emit('match:scoreUpdate', payload);
      }
      // Always send to the specific match room (umpire/admin views)
      io.to(`match:${liveMatch._id}`).emit('match:scoreUpdate', payload);

      if (newState.status === 'completed') {
        const scoreString = getScoreString(newState);
        if (!liveMatch.hiddenFromScoreboard) {
          io.to('scoreboard').emit('match:completed', {
            liveMatchId: liveMatch._id,
            liveMatch: formatLiveMatchForClient(liveMatch),
            scoreString
          });
        }
        io.to(`match:${liveMatch._id}`).emit('match:completed', {
          liveMatchId: liveMatch._id,
          liveMatch: formatLiveMatchForClient(liveMatch),
          scoreString
        });

        // Social media post for match completion
        const winnerName = newState.winner === 0 ? liveMatch.player1.name : liveMatch.player2.name;
        postMatchEvent('matchCompleted', {
          winner: winnerName,
          player1: liveMatch.player1.name,
          player2: liveMatch.player2.name,
          scoreString,
          tournamentName: liveMatch.tournamentName,
          categoryName: liveMatch.categoryName,
          roundName: liveMatch.roundName
        }).catch(() => {});
      }
    }

    res.status(200).json({ success: true, data: liveMatch });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Undo last point
// @route   POST /api/live-matches/:id/undo
// @access  Private (Admin/Staff)
export const undoPointHandler = async (req, res) => {
  try {
    const { id } = req.params;

    const liveMatch = await LiveMatch.findById(id);
    if (!liveMatch) {
      return res.status(404).json({ success: false, message: 'Live match not found' });
    }

    const currentState = liveMatch.matchState;
    const newState = undoPoint(currentState);

    // If match was completed and we're undoing, revert status
    if (liveMatch.status === 'completed' && newState.status === 'in_progress') {
      liveMatch.status = 'live';
      liveMatch.completedAt = null;
    }

    liveMatch.matchState = newState;
    liveMatch.markModified('matchState');
    await liveMatch.save();

    // Emit socket event
    const io = req.app.locals.io;
    if (io) {
      const payload = {
        liveMatchId: liveMatch._id,
        matchState: newState,
        displayScore: getDisplayScore(newState),
        status: liveMatch.status
      };
      io.to('scoreboard').emit('match:scoreUpdate', payload);
      io.to(`match:${liveMatch._id}`).emit('match:scoreUpdate', payload);
    }

    res.status(200).json({ success: true, data: liveMatch });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Suspend a live match
// @route   PUT /api/live-matches/:id/suspend
// @access  Private (Admin/Staff)
export const suspendMatch = async (req, res) => {
  try {
    const { id } = req.params;

    const liveMatch = await LiveMatch.findById(id);
    if (!liveMatch) {
      return res.status(404).json({ success: false, message: 'Live match not found' });
    }

    liveMatch.status = 'suspended';
    await liveMatch.save();

    const io = req.app.locals.io;
    if (io) {
      io.to('scoreboard').emit('match:scoreUpdate', {
        liveMatchId: liveMatch._id,
        matchState: liveMatch.matchState,
        displayScore: getDisplayScore(liveMatch.matchState),
        status: 'suspended'
      });
    }

    res.status(200).json({ success: true, data: liveMatch });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Resume a suspended match
// @route   PUT /api/live-matches/:id/resume
// @access  Private (Admin/Staff)
export const resumeMatch = async (req, res) => {
  try {
    const { id } = req.params;

    const liveMatch = await LiveMatch.findById(id);
    if (!liveMatch) {
      return res.status(404).json({ success: false, message: 'Live match not found' });
    }

    if (liveMatch.status !== 'suspended') {
      return res.status(400).json({ success: false, message: 'Match is not suspended' });
    }

    liveMatch.status = 'live';
    await liveMatch.save();

    const io = req.app.locals.io;
    if (io) {
      io.to('scoreboard').emit('match:scoreUpdate', {
        liveMatchId: liveMatch._id,
        matchState: liveMatch.matchState,
        displayScore: getDisplayScore(liveMatch.matchState),
        status: 'live'
      });
    }

    res.status(200).json({ success: true, data: liveMatch });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Toggle match visibility on the public scoreboard
// @route   PUT /api/live-matches/:id/toggle-visibility
// @access  Private (Admin/Staff/Umpire)
export const toggleVisibility = async (req, res) => {
  try {
    const liveMatch = await LiveMatch.findById(req.params.id);
    if (!liveMatch) {
      return res.status(404).json({ success: false, message: 'Live match not found' });
    }

    liveMatch.hiddenFromScoreboard = !liveMatch.hiddenFromScoreboard;
    await liveMatch.save();

    const io = req.app.locals.io;
    if (io) {
      if (liveMatch.hiddenFromScoreboard) {
        // Tell scoreboard clients to remove this match
        io.to('scoreboard').emit('match:hidden', { liveMatchId: liveMatch._id });
      } else {
        // Tell scoreboard clients to add this match back
        io.to('scoreboard').emit('match:started', {
          liveMatch: formatLiveMatchForClient(liveMatch)
        });
      }
    }

    res.status(200).json({
      success: true,
      message: liveMatch.hiddenFromScoreboard ? 'Match hidden from scoreboard' : 'Match visible on scoreboard',
      data: liveMatch
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    End a match (retirement/walkover/manual completion)
// @route   PUT /api/live-matches/:id/end
// @access  Private (Admin/Staff)
export const endMatch = async (req, res) => {
  try {
    const { id } = req.params;
    const { winnerId, reason } = req.body; // reason: 'retirement', 'walkover', 'default'

    const liveMatch = await LiveMatch.findById(id);
    if (!liveMatch) {
      return res.status(404).json({ success: false, message: 'Live match not found' });
    }

    if (!winnerId) {
      return res.status(400).json({ success: false, message: 'winnerId is required' });
    }

    liveMatch.status = 'completed';
    liveMatch.completedAt = new Date();

    // Determine winner index
    const winnerIndex = liveMatch.player1.id === winnerId ? 0 : 1;

    // Update match state
    const state = liveMatch.matchState;
    state.winner = winnerIndex;
    state.status = 'completed';
    liveMatch.matchState = state;
    liveMatch.markModified('matchState');

    await liveMatch.save();

    // Build score string with reason
    let scoreString = getScoreString(state);
    if (reason === 'retirement') {
      scoreString = scoreString ? `${scoreString} ret.` : 'ret.';
    } else if (reason === 'walkover') {
      scoreString = 'w/o';
    } else if (reason === 'default') {
      scoreString = 'def.';
    }

    // Update tournament draw
    const tournament = await Tournament.findById(liveMatch.tournamentId);
    if (tournament) {
      const category = tournament.categories.id(liveMatch.categoryId);
      if (category && category.draw) {
        let match = category.draw.matches.id(liveMatch.matchId);
        let matchGroup = null;
        let isKnockout = false;
        if (!match && category.draw.roundRobinGroups) {
          for (const group of category.draw.roundRobinGroups) {
            match = group.matches.id(liveMatch.matchId);
            if (match) { matchGroup = group; break; }
          }
        }
        if (!match && category.draw.knockoutStage?.matches) {
          match = category.draw.knockoutStage.matches.id(liveMatch.matchId);
          if (match) isKnockout = true;
        }
        if (match) {
          match.winner = winnerId;
          match.score = scoreString;
          match.status = reason === 'walkover' ? 'walkover' : 'completed';
          match.completedTime = new Date();

          // Advance winner in bracket
          if (isKnockout) {
            advanceKnockoutWinner(category.draw.knockoutStage, match);
          } else {
            advanceWinnerInBracket(category, match);
          }
          // Recompute round-robin standings
          if (matchGroup) recomputeRoundRobinStandings(matchGroup);
          await tournament.save();
        }
      }
    }

    // Emit socket events
    const io = req.app.locals.io;
    if (io) {
      io.to('scoreboard').emit('match:completed', {
        liveMatchId: liveMatch._id,
        liveMatch: formatLiveMatchForClient(liveMatch),
        scoreString
      });
      io.to(`match:${liveMatch._id}`).emit('match:completed', {
        liveMatchId: liveMatch._id,
        liveMatch: formatLiveMatchForClient(liveMatch),
        scoreString
      });
    }

    res.status(200).json({ success: true, data: liveMatch });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get matches assigned to the authenticated umpire
// @route   GET /api/live-matches/my-matches
// @access  Private (authenticated)
export const getMyMatches = async (req, res) => {
  try {
    const matches = await LiveMatch.find({
      umpireId: req.user._id.toString(),
      status: { $in: ['warmup', 'live', 'suspended'] }
    }).sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: matches });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all live/warmup matches
// @route   GET /api/live-matches
// @access  Public
export const getLiveMatches = async (req, res) => {
  try {
    const matches = await LiveMatch.find({
      status: { $in: ['warmup', 'live', 'suspended'] },
      hiddenFromScoreboard: { $ne: true }
    }).sort({ startedAt: -1 });

    // Filter out matches whose tournament no longer exists (deleted)
    const validMatches = [];
    for (const match of matches) {
      const tournament = await Tournament.findById(match.tournamentId);
      if (tournament) {
        validMatches.push(match);
      } else {
        // Clean up orphaned live match from deleted tournament
        match.status = 'completed';
        match.completedAt = new Date();
        await match.save();
      }
    }

    res.status(200).json({ success: true, data: validMatches });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get a single live match
// @route   GET /api/live-matches/:id
// @access  Public
export const getLiveMatch = async (req, res) => {
  try {
    const liveMatch = await LiveMatch.findById(req.params.id);
    if (!liveMatch) {
      return res.status(404).json({ success: false, message: 'Live match not found' });
    }

    res.status(200).json({ success: true, data: liveMatch });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get live matches for a tournament
// @route   GET /api/live-matches/tournament/:tournamentId
// @access  Public
export const getLiveMatchesByTournament = async (req, res) => {
  try {
    const matches = await LiveMatch.find({
      tournamentId: req.params.tournamentId,
      status: { $in: ['warmup', 'live', 'suspended'] },
      hiddenFromScoreboard: { $ne: true }
    }).sort({ startedAt: -1 });

    res.status(200).json({ success: true, data: matches });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Update tournament draw when a match completes via live scoring
 */
async function updateTournamentDraw(liveMatch, matchState) {
  try {
    const tournament = await Tournament.findById(liveMatch.tournamentId);
    if (!tournament) return;

    const category = tournament.categories.id(liveMatch.categoryId);
    if (!category || !category.draw) return;

    // Search draw.matches, roundRobinGroups, then knockoutStage
    let match = category.draw.matches.id(liveMatch.matchId);
    let matchGroup = null;
    let isKnockout = false;

    if (!match && category.draw.roundRobinGroups) {
      for (const group of category.draw.roundRobinGroups) {
        match = group.matches.id(liveMatch.matchId);
        if (match) {
          matchGroup = group;
          break;
        }
      }
    }

    if (!match && category.draw.knockoutStage?.matches) {
      match = category.draw.knockoutStage.matches.id(liveMatch.matchId);
      if (match) isKnockout = true;
    }

    if (!match) return;

    const winnerId = matchState.winner === 0 ? liveMatch.player1.id : liveMatch.player2.id;

    match.winner = winnerId;
    match.score = getScoreString(matchState);
    match.status = 'completed';
    match.completedTime = new Date();

    // Advance winner in bracket
    if (isKnockout) {
      advanceKnockoutWinner(category.draw.knockoutStage, match);
    } else {
      advanceWinnerInBracket(category, match);
    }

    // Recompute round-robin standings
    if (matchGroup) {
      recomputeRoundRobinStandings(matchGroup);
    }

    await tournament.save();
  } catch (error) {
    console.error('Error updating tournament draw:', error);
  }
}

/**
 * Recompute round-robin group standings from match results.
 */
function recomputeRoundRobinStandings(group) {
  const standings = {};
  group.players.forEach(p => {
    standings[p.id] = { playerId: p.id, playerName: p.name, played: 0, won: 0, lost: 0, points: 0 };
  });

  group.matches.forEach(m => {
    if (m.winner && m.player1 && m.player2) {
      if (standings[m.player1.id]) { standings[m.player1.id].played++; }
      if (standings[m.player2.id]) { standings[m.player2.id].played++; }
      if (standings[m.winner]) {
        standings[m.winner].won++;
        standings[m.winner].points += 2;
      }
      const loserId = m.player1.id === m.winner ? m.player2.id : m.player1.id;
      if (standings[loserId]) { standings[loserId].lost++; }
    }
  });

  group.standings = Object.values(standings).sort((a, b) => b.points - a.points || b.won - a.won);
}

/**
 * Advance winner to next round in knockout stage bracket
 */
function advanceKnockoutWinner(knockoutStage, match) {
  if (!knockoutStage?.matches) return;
  const koMatches = knockoutStage.matches;
  const nextRound = match.round + 1;
  const currentRoundMatches = koMatches
    .filter(m => m.round === match.round)
    .sort((a, b) => a.matchNumber - b.matchNumber);
  const positionInRound = currentRoundMatches.findIndex(
    m => m._id.toString() === match._id.toString()
  );
  const nextMatchIndex = Math.floor(positionInRound / 2);
  const isFirstPlayer = positionInRound % 2 === 0;
  const nextMatches = koMatches
    .filter(m => m.round === nextRound)
    .sort((a, b) => a.matchNumber - b.matchNumber);
  if (nextMatches[nextMatchIndex]) {
    const winnerPlayer = match.player1.id === match.winner ? match.player1 : match.player2;
    if (isFirstPlayer) nextMatches[nextMatchIndex].player1 = winnerPlayer;
    else nextMatches[nextMatchIndex].player2 = winnerPlayer;
  }
}

/**
 * Advance winner to next round in single elimination bracket
 * (Same logic as tournamentController.js lines 811-835)
 */
function advanceWinnerInBracket(category, match) {
  if (category.draw.type !== 'single_elimination') return;

  const nextRound = match.round + 1;

  const currentRoundMatches = category.draw.matches
    .filter(m => m.round === match.round)
    .sort((a, b) => a.matchNumber - b.matchNumber);

  const positionInRound = currentRoundMatches.findIndex(
    m => m._id.toString() === match._id.toString()
  );

  const nextMatchIndex = Math.floor(positionInRound / 2);
  const isFirstPlayer = positionInRound % 2 === 0;

  const nextMatches = category.draw.matches
    .filter(m => m.round === nextRound)
    .sort((a, b) => a.matchNumber - b.matchNumber);

  if (nextMatches[nextMatchIndex]) {
    const winnerPlayer = match.player1.id === match.winner ? match.player1 : match.player2;

    if (isFirstPlayer) {
      nextMatches[nextMatchIndex].player1 = winnerPlayer;
    } else {
      nextMatches[nextMatchIndex].player2 = winnerPlayer;
    }
  }
}

// @desc    Re-sync all completed live match results back into tournament draws
// @route   POST /api/live-matches/resync
// @access  Private (Admin)
export const resyncCompletedResults = async (req, res) => {
  try {
    const liveMatches = await LiveMatch.find({ status: 'completed' }).sort({ completedAt: -1 });

    const results = [];
    let synced = 0;
    let alreadySynced = 0;
    let notFound = 0;

    // Group by tournament to batch saves
    const tournamentCache = {};

    for (const lm of liveMatches) {
      const tid = lm.tournamentId.toString();
      if (!tournamentCache[tid]) {
        tournamentCache[tid] = await Tournament.findById(tid);
      }
      const tournament = tournamentCache[tid];
      if (!tournament) continue;

      const state = lm.matchState;
      const scoreString = getScoreString(state);
      const winnerIndex = state.winner;
      if (winnerIndex === null || winnerIndex === undefined) continue;

      const winnerId = winnerIndex === 0 ? lm.player1.id : lm.player2.id;
      const winnerName = winnerIndex === 0 ? lm.player1.name : lm.player2.name;

      const category = tournament.categories.id(lm.categoryId);
      if (!category || !category.draw) continue;

      // Search draw.matches and roundRobinGroups
      let match = category.draw.matches.id(lm.matchId);
      let matchGroup = null;
      if (!match && category.draw.roundRobinGroups) {
        for (const group of category.draw.roundRobinGroups) {
          match = group.matches.id(lm.matchId);
          if (match) { matchGroup = group; break; }
        }
      }

      if (!match) {
        notFound++;
        continue;
      }

      const entry = {
        tournament: lm.tournamentName,
        category: lm.categoryName,
        round: lm.roundName,
        player1: lm.player1.name,
        player2: lm.player2.name,
        score: scoreString,
        winner: winnerName,
        status: (match.winner && match.score) ? 'already_synced' : 'synced'
      };
      results.push(entry);

      if (match.winner && match.score) {
        alreadySynced++;
        continue;
      }

      match.winner = winnerId;
      match.score = scoreString;
      match.status = 'completed';
      match.completedTime = lm.completedAt || new Date();

      // Advance winner in single elimination bracket
      if (category.draw.type === 'single_elimination') {
        const nextRound = match.round + 1;
        const currentRoundMatches = category.draw.matches
          .filter(m => m.round === match.round)
          .sort((a, b) => a.matchNumber - b.matchNumber);
        const positionInRound = currentRoundMatches.findIndex(
          m => m._id.toString() === match._id.toString()
        );
        const nextMatchIndex = Math.floor(positionInRound / 2);
        const isFirstPlayer = positionInRound % 2 === 0;
        const nextMatches = category.draw.matches
          .filter(m => m.round === nextRound)
          .sort((a, b) => a.matchNumber - b.matchNumber);
        if (nextMatches[nextMatchIndex]) {
          const winnerPlayer = match.player1.id === match.winner ? match.player1 : match.player2;
          if (isFirstPlayer) nextMatches[nextMatchIndex].player1 = winnerPlayer;
          else nextMatches[nextMatchIndex].player2 = winnerPlayer;
        }
      }

      // Recompute round-robin standings
      if (matchGroup) {
        recomputeRoundRobinStandings(matchGroup);
      }

      synced++;
    }

    // Save all modified tournaments
    for (const tournament of Object.values(tournamentCache)) {
      if (tournament) await tournament.save();
    }

    res.status(200).json({
      success: true,
      message: `Synced ${synced} results, ${alreadySynced} already synced, ${notFound} matches not found in draw`,
      data: { synced, alreadySynced, notFound, results }
    });
  } catch (error) {
    console.error('Resync error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Format live match data for socket emission
 */
function formatLiveMatchForClient(liveMatch) {
  return {
    _id: liveMatch._id,
    tournamentId: liveMatch.tournamentId,
    categoryId: liveMatch.categoryId,
    matchId: liveMatch.matchId,
    player1: liveMatch.player1,
    player2: liveMatch.player2,
    matchState: liveMatch.matchState,
    displayScore: getDisplayScore(liveMatch.matchState),
    settings: liveMatch.settings,
    court: liveMatch.court,
    umpireName: liveMatch.umpireName,
    tournamentName: liveMatch.tournamentName,
    categoryName: liveMatch.categoryName,
    roundName: liveMatch.roundName,
    status: liveMatch.status,
    startedAt: liveMatch.startedAt,
    completedAt: liveMatch.completedAt
  };
}
