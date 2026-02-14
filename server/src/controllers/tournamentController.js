import jwt from 'jsonwebtoken';
import Tournament from '../models/Tournament.js';
import User from '../models/User.js';
import sendEmail from '../utils/sendEmail.js';
import {
  calculateTennisAge,
  calculateAgeOnDec31,
  checkCategoryEligibility,
  getEligibleCategories,
  validateTournamentEntry,
  getCategoryDetails,
  getAllJuniorCategories
} from '../utils/tournamentEligibility.js';

// @desc    Get all tournaments
// @route   GET /api/tournaments
// @access  Public
export const getTournaments = async (req, res) => {
  try {
    const tournaments = await Tournament.find().sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: tournaments.length,
      data: tournaments
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get single tournament
// @route   GET /api/tournaments/:id
// @access  Public
export const getTournament = async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id);

    if (!tournament) {
      return res.status(404).json({
        success: false,
        message: 'Tournament not found'
      });
    }

    res.status(200).json({
      success: true,
      data: tournament
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Create tournament
// @route   POST /api/tournaments
// @access  Private/Admin
export const createTournament = async (req, res) => {
  try {
    console.log('=== CREATE TOURNAMENT REQUEST ===');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    console.log('Body keys:', Object.keys(req.body));

    const tournament = await Tournament.create(req.body);

    res.status(201).json({
      success: true,
      data: tournament
    });
  } catch (error) {
    console.error('Tournament creation error:', error.message);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update tournament
// @route   PUT /api/tournaments/:id
// @access  Private/Admin
export const updateTournament = async (req, res) => {
  try {
    const tournament = await Tournament.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    if (!tournament) {
      return res.status(404).json({
        success: false,
        message: 'Tournament not found'
      });
    }

    res.status(200).json({
      success: true,
      data: tournament
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Register for tournament
// @route   POST /api/tournaments/:id/register
// @access  Private
export const registerForTournament = async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id);

    if (!tournament) {
      return res.status(404).json({
        success: false,
        message: 'Tournament not found'
      });
    }

    // Check if already registered
    const alreadyRegistered = tournament.registrations.find(
      reg => reg.user.toString() === req.user.id
    );

    if (alreadyRegistered) {
      return res.status(400).json({
        success: false,
        message: 'Already registered for this tournament'
      });
    }

    // Check if tournament is full
    if (tournament.maxParticipants && tournament.registrations.length >= tournament.maxParticipants) {
      return res.status(400).json({
        success: false,
        message: 'Tournament is full'
      });
    }

    // Add registration
    tournament.registrations.push({
      user: req.user.id,
      category: req.body.category,
      amount: tournament.entryFee,
      paymentStatus: tournament.entryFee > 0 ? 'pending' : 'paid'
    });

    await tournament.save();

    // Send confirmation email
    try {
      await sendEmail({
        email: req.user.email,
        subject: `Tournament Registration - ${tournament.name}`,
        html: `
          <h1>Registration Confirmed!</h1>
          <p>Dear ${req.user.firstName},</p>
          <p>You have successfully registered for <strong>${tournament.name}</strong>.</p>
          <p><strong>Details:</strong></p>
          <ul>
            <li>Date: ${tournament.date}</li>
            <li>Location: ${tournament.location}</li>
            <li>Category: ${req.body.category}</li>
            ${tournament.entryFee > 0 ? `<li>Entry Fee: K${tournament.entryFee} (Payment ${tournament.entryFee > 0 ? 'Pending' : 'Not Required'})</li>` : ''}
          </ul>
          <p>See you at the tournament!</p>
        `
      });
    } catch (emailError) {
      console.error('Email sending failed:', emailError);
    }

    res.status(200).json({
      success: true,
      message: 'Successfully registered for tournament',
      data: tournament
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete tournament
// @route   DELETE /api/tournaments/:id
// @access  Private/Admin
export const deleteTournament = async (req, res) => {
  try {
    const tournament = await Tournament.findByIdAndDelete(req.params.id);

    if (!tournament) {
      return res.status(404).json({
        success: false,
        message: 'Tournament not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Tournament deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Submit entry for tournament category
// @route   POST /api/tournaments/:tournamentId/categories/:categoryId/entries
// @access  Private
export const submitEntry = async (req, res) => {
  try {
    const { tournamentId, categoryId } = req.params;
    const { playerId } = req.body;

    const tournament = await Tournament.findById(tournamentId);

    if (!tournament) {
      return res.status(404).json({
        success: false,
        message: 'Tournament not found'
      });
    }

    const category = tournament.categories.id(categoryId);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    // Get player information
    const player = await User.findById(playerId);

    if (!player) {
      return res.status(404).json({
        success: false,
        message: 'Player not found'
      });
    }

    // Check if player has required fields
    if (!player.dateOfBirth) {
      return res.status(400).json({
        success: false,
        message: 'Player date of birth is required for tournament entry'
      });
    }

    if (!player.gender) {
      return res.status(400).json({
        success: false,
        message: 'Player gender is required for tournament entry'
      });
    }

    // Check if entries are still open
    if (tournament.status === 'entries_closed' || tournament.status === 'in_progress' || tournament.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Entries are closed for this tournament'
      });
    }

    // Check entry deadline
    if (new Date() > new Date(tournament.entryDeadline)) {
      return res.status(400).json({
        success: false,
        message: 'Entry deadline has passed'
      });
    }

    // Check if category is full
    if (category.entries.length >= category.maxEntries) {
      return res.status(400).json({
        success: false,
        message: 'This category is full'
      });
    }

    // Check if player already entered
    const existingEntry = category.entries.find(e => e.playerZpin === player.zpin);
    if (existingEntry) {
      return res.status(400).json({
        success: false,
        message: 'Player already entered in this category'
      });
    }

    // Validate tournament entry eligibility for junior categories
    let eligibilityCheck = { eligible: true, reason: 'Eligible', warnings: [], errors: [] };

    if (category.type === 'junior' && category.categoryCode) {
      const validation = validateTournamentEntry(player, category.categoryCode, tournament.startDate);

      if (!validation.eligible) {
        return res.status(400).json({
          success: false,
          message: 'Player is not eligible for this category',
          errors: validation.errors,
          info: validation.info
        });
      }

      eligibilityCheck = {
        eligible: validation.eligible,
        reason: validation.info.ageCalculationDate
          ? `Player will be ${validation.info.playerAge} years old on ${validation.info.ageCalculationDate}`
          : 'Eligible',
        suggestedCategory: validation.info.suggestedCategory,
        warnings: validation.warnings
      };
    }

    // Calculate tennis age (year subtraction — official Dec 31 rule)
    const tournamentYear = new Date(tournament.startDate).getFullYear();
    const ageOnDec31 = calculateTennisAge(player.dateOfBirth, tournamentYear);
    const currentAge = Math.floor((new Date() - new Date(player.dateOfBirth)) / (365.25 * 24 * 60 * 60 * 1000));

    // Create entry data
    const entryData = {
      playerId: player._id.toString(),
      playerName: `${player.firstName} ${player.lastName}`,
      playerZpin: player.zpin,
      dateOfBirth: player.dateOfBirth,
      age: currentAge,
      ageOnDec31,
      gender: player.gender,
      clubName: player.club || 'Independent',
      eligibilityCheck,
      status: 'pending'
    };

    // Add entry
    category.entries.push(entryData);
    category.entryCount = category.entries.length;
    await tournament.save();

    res.status(201).json({
      success: true,
      message: 'Entry submitted successfully',
      data: entryData,
      warnings: eligibilityCheck.warnings
    });
  } catch (error) {
    console.error('Submit entry error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Bulk entry actions (approve, confirm payment, waive payment)
// @route   POST /api/tournaments/:tournamentId/entries/bulk
// @access  Private (Admin/Staff)
export const bulkEntryAction = async (req, res) => {
  try {
    const { tournamentId } = req.params;
    const { entryIds, action, categoryId } = req.body;

    if (!entryIds || !Array.isArray(entryIds) || entryIds.length === 0) {
      return res.status(400).json({ success: false, message: 'entryIds array is required' });
    }

    const validActions = ['APPROVE', 'CONFIRM_PAYMENT', 'WAIVE_PAYMENT'];
    if (!validActions.includes(action)) {
      return res.status(400).json({ success: false, message: `action must be one of: ${validActions.join(', ')}` });
    }

    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) {
      return res.status(404).json({ success: false, message: 'Tournament not found' });
    }

    const category = tournament.categories.id(categoryId);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    const results = [];

    for (const entryId of entryIds) {
      const entry = category.entries.id(entryId);
      if (!entry) {
        results.push({ entryId, success: false, error: 'Entry not found' });
        continue;
      }

      try {
        switch (action) {
          case 'APPROVE':
            if (entry.status !== 'pending') {
              results.push({ entryId, success: false, error: `Cannot approve entry with status "${entry.status}"` });
              continue;
            }
            entry.status = 'accepted';
            break;

          case 'CONFIRM_PAYMENT':
            if (entry.status !== 'pending_payment') {
              results.push({ entryId, success: false, error: `Cannot confirm payment for entry with status "${entry.status}"` });
              continue;
            }
            entry.paymentStatus = 'paid';
            entry.paymentDate = new Date();
            entry.paymentMethod = 'manual';
            entry.status = 'pending';
            break;

          case 'WAIVE_PAYMENT':
            if (entry.status !== 'pending_payment') {
              results.push({ entryId, success: false, error: `Cannot waive payment for entry with status "${entry.status}"` });
              continue;
            }
            entry.paymentStatus = 'waived';
            entry.paymentDate = new Date();
            entry.paymentMethod = 'waived';
            entry.status = 'pending';
            break;
        }

        results.push({ entryId, success: true, playerName: entry.playerName });
      } catch (err) {
        results.push({ entryId, success: false, error: err.message });
      }
    }

    await tournament.save();

    const succeeded = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    res.status(200).json({
      success: true,
      message: `${succeeded} entries updated, ${failed} failed`,
      data: { results, succeeded, failed }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update entry status (accept/reject)
// @route   PUT /api/tournaments/:tournamentId/categories/:categoryId/entries/:entryId
// @access  Private (Admin only)
export const updateEntryStatus = async (req, res) => {
  try {
    const { tournamentId, categoryId, entryId } = req.params;
    const { status, rejectionReason, seed, paymentStatus, paymentReference } = req.body;

    const tournament = await Tournament.findById(tournamentId);

    if (!tournament) {
      return res.status(404).json({
        success: false,
        message: 'Tournament not found'
      });
    }

    const category = tournament.categories.id(categoryId);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    const entry = category.entries.id(entryId);

    if (!entry) {
      return res.status(404).json({
        success: false,
        message: 'Entry not found'
      });
    }

    // Update entry
    if (status) entry.status = status;
    if (rejectionReason) entry.rejectionReason = rejectionReason;
    if (seed !== undefined) {
      if (seed === null || seed === 0) {
        entry.seed = undefined;
      } else if (Number.isInteger(seed) && seed >= 1) {
        entry.seed = seed;
      }
    }
    if (paymentStatus) {
      entry.paymentStatus = paymentStatus;
      entry.paymentDate = new Date();
      entry.paymentMethod = paymentStatus === 'waived' ? 'waived' : 'manual';
    }
    if (paymentReference) entry.paymentReference = paymentReference;

    await tournament.save();

    res.status(200).json({
      success: true,
      data: entry
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Bulk update seeds for a category
// @route   PUT /api/tournaments/:tournamentId/categories/:categoryId/seeds
// @access  Private (Admin/Staff)
export const bulkUpdateSeeds = async (req, res) => {
  try {
    const { tournamentId, categoryId } = req.params;
    const { seeds } = req.body;

    if (!seeds || !Array.isArray(seeds)) {
      return res.status(400).json({ success: false, message: 'seeds array is required' });
    }

    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) {
      return res.status(404).json({ success: false, message: 'Tournament not found' });
    }

    const category = tournament.categories.id(categoryId);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    // Validate: no duplicate seed numbers (ignore 0/null/undefined which mean "unseed")
    const seedNumbers = seeds.filter(s => s.seedNumber != null && s.seedNumber > 0).map(s => s.seedNumber);
    const uniqueSeeds = new Set(seedNumbers);
    if (uniqueSeeds.size !== seedNumbers.length) {
      return res.status(400).json({ success: false, message: 'Duplicate seed numbers are not allowed' });
    }

    // Validate: seed range — must be integer >= 1, or 0/null/undefined to unseed
    const acceptedCount = category.entries.filter(e => e.status === 'accepted').length;
    const maxSeed = Math.min(32, acceptedCount);
    for (const { seedNumber } of seeds) {
      // 0, null, undefined all mean "remove seed" — skip validation
      if (seedNumber == null || seedNumber === 0) continue;
      // Must be positive integer in range
      if (!Number.isInteger(seedNumber) || seedNumber < 1 || seedNumber > maxSeed) {
        return res.status(400).json({ success: false, message: `Seed numbers must be between 1 and ${maxSeed}` });
      }
    }

    const errors = [];

    // Clear existing seeds first
    category.entries.forEach(entry => {
      if (entry.status === 'accepted') {
        entry.seed = undefined;
      }
    });

    // Apply new seeds
    for (const { entryId, seedNumber } of seeds) {
      const entry = category.entries.id(entryId);
      if (!entry) {
        errors.push({ entryId, error: 'Entry not found' });
        continue;
      }
      if (entry.status !== 'accepted') {
        errors.push({ entryId, error: 'Only accepted entries can be seeded' });
        continue;
      }
      if (seedNumber > 0) {
        entry.seed = seedNumber;
      }
    }

    await tournament.save();

    res.status(200).json({
      success: true,
      message: `Seeds updated${errors.length > 0 ? ` (${errors.length} errors)` : ''}`,
      data: category,
      errors
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Auto-seed category based on rankings
// @route   POST /api/tournaments/:tournamentId/categories/:categoryId/auto-seed
// @access  Private (Admin only)
export const autoSeedCategory = async (req, res) => {
  try {
    const { tournamentId, categoryId } = req.params;

    const tournament = await Tournament.findById(tournamentId);

    if (!tournament) {
      return res.status(404).json({
        success: false,
        message: 'Tournament not found'
      });
    }

    const category = tournament.categories.id(categoryId);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    // Get accepted entries with rankings
    const acceptedEntries = category.entries.filter(
      e => e.status === 'accepted' && e.ranking
    );

    if (acceptedEntries.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No accepted entries with rankings to seed'
      });
    }

    // Sort by ranking (lower number = better player)
    acceptedEntries.sort((a, b) => a.ranking - b.ranking);

    // Assign seeds to top players (typically top 8, 16, or 32 depending on draw size)
    const maxSeeds = Math.min(32, Math.pow(2, Math.ceil(Math.log2(acceptedEntries.length))));
    const numSeeds = Math.min(acceptedEntries.length, maxSeeds);

    for (let i = 0; i < numSeeds; i++) {
      acceptedEntries[i].seed = i + 1;
    }

    await tournament.save();

    res.status(200).json({
      success: true,
      message: `Successfully seeded top ${numSeeds} players`,
      data: category
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Generate draw for category
// @route   POST /api/tournaments/:tournamentId/categories/:categoryId/draw
// @access  Private (Admin only)
export const generateDraw = async (req, res) => {
  try {
    const { tournamentId, categoryId } = req.params;
    const { draw } = req.body;

    const tournament = await Tournament.findById(tournamentId);

    if (!tournament) {
      return res.status(404).json({
        success: false,
        message: 'Tournament not found'
      });
    }

    const category = tournament.categories.id(categoryId);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    // Check if there are accepted entries
    const acceptedEntries = category.entries.filter(e => e.status === 'accepted');
    if (acceptedEntries.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No accepted entries to generate draw'
      });
    }

    // Set the draw
    category.draw = draw;
    await tournament.save();

    res.status(200).json({
      success: true,
      data: category
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update match result
// @route   PUT /api/tournaments/:tournamentId/categories/:categoryId/matches/:matchId
// @access  Private (Admin only)
export const updateMatchResult = async (req, res) => {
  try {
    const { tournamentId, categoryId, matchId } = req.params;
    const { winner, score, status } = req.body;

    const tournament = await Tournament.findById(tournamentId);

    if (!tournament) {
      return res.status(404).json({
        success: false,
        message: 'Tournament not found'
      });
    }

    const category = tournament.categories.id(categoryId);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    if (!category.draw) {
      return res.status(400).json({
        success: false,
        message: 'Draw not generated yet'
      });
    }

    // Find and update match
    const match = category.draw.matches.id(matchId);

    if (!match) {
      return res.status(404).json({
        success: false,
        message: 'Match not found'
      });
    }

    match.winner = winner;
    match.score = score;
    match.status = status || 'completed';
    match.completedTime = new Date();

    // For single elimination, advance winner to next round
    if (category.draw.type === 'single_elimination') {
      const nextRound = match.round + 1;
      const matchPosition = match.matchNumber - 1;
      const nextMatchIndex = Math.floor(matchPosition / 2);
      const isFirstPlayer = matchPosition % 2 === 0;

      const nextMatches = category.draw.matches.filter(m => m.round === nextRound);
      if (nextMatches[nextMatchIndex]) {
        const winner = match.player1.id === match.winner ? match.player1 : match.player2;

        if (isFirstPlayer) {
          nextMatches[nextMatchIndex].player1 = winner;
        } else {
          nextMatches[nextMatchIndex].player2 = winner;
        }
      }
    }

    await tournament.save();

    res.status(200).json({
      success: true,
      data: match
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Finalize draw results — lock matches, compute standings
// @route   POST /api/tournaments/:tournamentId/categories/:categoryId/results/finalize
// @access  Private (Admin/Staff)
export const finalizeResults = async (req, res) => {
  try {
    const { tournamentId, categoryId } = req.params;

    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) {
      return res.status(404).json({ success: false, message: 'Tournament not found' });
    }

    const category = tournament.categories.id(categoryId);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    if (!category.draw) {
      return res.status(400).json({ success: false, message: 'No draw to finalize' });
    }

    if (category.draw.finalized) {
      return res.status(400).json({ success: false, message: 'Results already finalized' });
    }

    // For single elimination, check the final is completed
    if (category.draw.type === 'single_elimination') {
      const finalMatch = category.draw.matches
        .filter(m => m.round === category.draw.numberOfRounds)
        .find(m => m.status !== 'completed');

      if (finalMatch) {
        return res.status(400).json({ success: false, message: 'All matches must be completed before finalizing' });
      }

      // Compute standings
      const finalRound = category.draw.matches.filter(m => m.round === category.draw.numberOfRounds);
      const semiRound = category.draw.matches.filter(m => m.round === category.draw.numberOfRounds - 1);

      const champion = finalRound[0]?.winner;
      const championPlayer = finalRound[0]?.player1?.id === champion ? finalRound[0].player1 : finalRound[0]?.player2;
      const runnerUp = finalRound[0]?.player1?.id === champion ? finalRound[0].player2 : finalRound[0]?.player1;

      // Semi-final losers
      const semiLosers = semiRound
        .filter(m => m.winner)
        .map(m => m.player1?.id === m.winner ? m.player2 : m.player1)
        .filter(Boolean);

      category.draw.standings = {
        champion: championPlayer ? { id: championPlayer.id, name: championPlayer.name } : null,
        runnerUp: runnerUp ? { id: runnerUp.id, name: runnerUp.name } : null,
        semiFinalists: semiLosers.map(p => ({ id: p.id, name: p.name }))
      };
    }

    // For round robin, compute from group standings
    if (category.draw.type === 'round_robin' && category.draw.roundRobinGroups) {
      for (const group of category.draw.roundRobinGroups) {
        const incompleteMatch = group.matches.find(m => m.status !== 'completed');
        if (incompleteMatch) {
          return res.status(400).json({
            success: false,
            message: `${group.groupName} has incomplete matches`
          });
        }

        // Compute standings for this group
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
    }

    category.draw.finalized = true;
    category.draw.finalizedAt = new Date();
    await tournament.save();

    res.status(200).json({
      success: true,
      message: 'Results finalized successfully',
      data: category.draw
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Check player eligibility for a category
// @route   GET /api/tournaments/:tournamentId/categories/:categoryId/check-eligibility/:playerId
// @access  Public
export const checkEligibility = async (req, res) => {
  try {
    const { tournamentId, categoryId, playerId } = req.params;

    const tournament = await Tournament.findById(tournamentId);

    if (!tournament) {
      return res.status(404).json({
        success: false,
        message: 'Tournament not found'
      });
    }

    const category = tournament.categories.id(categoryId);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    const player = await User.findById(playerId);

    if (!player) {
      return res.status(404).json({
        success: false,
        message: 'Player not found'
      });
    }

    // Validate eligibility
    const validation = validateTournamentEntry(player, category.categoryCode, tournament.startDate);

    res.status(200).json({
      success: true,
      data: {
        eligible: validation.eligible,
        errors: validation.errors,
        warnings: validation.warnings,
        info: validation.info
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get all eligible categories for a player in a tournament
// @route   GET /api/tournaments/:tournamentId/eligible-categories/:playerId
// @access  Public
export const getPlayerEligibleCategories = async (req, res) => {
  try {
    const { tournamentId, playerId } = req.params;

    const tournament = await Tournament.findById(tournamentId);

    if (!tournament) {
      return res.status(404).json({
        success: false,
        message: 'Tournament not found'
      });
    }

    const player = await User.findById(playerId);

    if (!player) {
      return res.status(404).json({
        success: false,
        message: 'Player not found'
      });
    }

    if (!player.dateOfBirth) {
      return res.status(400).json({
        success: false,
        message: 'Player date of birth is required'
      });
    }

    if (!player.gender) {
      return res.status(400).json({
        success: false,
        message: 'Player gender is required'
      });
    }

    // Get available category codes
    const availableCategoryCodes = tournament.categories
      .filter(cat => cat.type === 'junior')
      .map(cat => cat.categoryCode);

    const tournamentYear = new Date(tournament.startDate).getFullYear();

    // Get eligible categories
    const eligibleCategories = getEligibleCategories(
      player.dateOfBirth,
      player.gender,
      availableCategoryCodes,
      tournamentYear
    );

    // Map to full category details
    const categoriesWithDetails = eligibleCategories.map(eligCat => {
      const category = tournament.categories.find(cat => cat.categoryCode === eligCat.categoryCode);
      return {
        ...eligCat,
        categoryId: category ? category._id : null,
        categoryName: category ? category.name : eligCat.categoryCode,
        maxEntries: category ? category.maxEntries : null,
        currentEntries: category ? category.entries.length : 0,
        isFull: category ? category.entries.length >= category.maxEntries : false
      };
    });

    res.status(200).json({
      success: true,
      data: categoriesWithDetails
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get all standard junior categories
// @route   GET /api/tournaments/junior-categories
// @access  Public
export const getJuniorCategories = async (req, res) => {
  try {
    const categories = getAllJuniorCategories();

    res.status(200).json({
      success: true,
      count: categories.length,
      data: categories
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Public tournament registration (no login required)
// @route   POST /api/tournaments/:id/public-register
// @access  Public
export const publicRegister = async (req, res) => {
  try {
    const { entries, payer, payNow } = req.body;

    if (!entries || !Array.isArray(entries) || entries.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one entry is required'
      });
    }

    if (!payer || !payer.name || !payer.email || !payer.phone) {
      return res.status(400).json({
        success: false,
        message: 'Payer name, email, and phone are required'
      });
    }

    const tournament = await Tournament.findById(req.params.id);

    if (!tournament) {
      return res.status(404).json({
        success: false,
        message: 'Tournament not found'
      });
    }

    // Check if public registration is allowed
    if (!tournament.allowPublicRegistration) {
      return res.status(400).json({
        success: false,
        message: 'Public registration is not allowed for this tournament'
      });
    }

    // Check if entries are still open
    if (tournament.status === 'entries_closed' || tournament.status === 'in_progress' || tournament.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Entries are closed for this tournament'
      });
    }

    // Check entry deadline
    if (new Date() > new Date(tournament.entryDeadline)) {
      return res.status(400).json({
        success: false,
        message: 'Entry deadline has passed'
      });
    }

    const results = [];
    const errors = [];

    // Process each entry
    for (const entry of entries) {
      const { playerId, categoryId, isNewPlayer, newPlayerData } = entry;

      // Get the category first
      const category = tournament.categories.id(categoryId);
      if (!category) {
        errors.push({ playerId, error: 'Category not found' });
        continue;
      }

      // Check if category is full
      if (category.entries.length >= category.maxEntries) {
        errors.push({ playerId, playerName: isNewPlayer ? `${newPlayerData?.firstName} ${newPlayerData?.lastName}` : 'Unknown', error: 'Category is full' });
        continue;
      }

      let playerData;
      let isNewPlayerEntry = false;

      if (isNewPlayer && newPlayerData) {
        // Handle new player registration
        if (!newPlayerData.firstName || !newPlayerData.lastName || !newPlayerData.dateOfBirth || !newPlayerData.gender) {
          errors.push({
            playerId: 'new',
            playerName: `${newPlayerData.firstName || ''} ${newPlayerData.lastName || ''}`.trim() || 'Unknown',
            error: 'New player requires first name, last name, date of birth, and gender'
          });
          continue;
        }

        playerData = {
          firstName: newPlayerData.firstName,
          lastName: newPlayerData.lastName,
          dateOfBirth: new Date(newPlayerData.dateOfBirth),
          gender: newPlayerData.gender,
          club: newPlayerData.club || 'Independent',
          phone: newPlayerData.phone,
          email: newPlayerData.email,
          zpin: null // Will be assigned upon approval
        };
        isNewPlayerEntry = true;
      } else {
        // Get existing player
        const player = await User.findById(playerId);
        if (!player) {
          errors.push({ playerId, error: 'Player not found' });
          continue;
        }

        // Check if player has required fields
        if (!player.dateOfBirth) {
          errors.push({ playerId, playerName: `${player.firstName} ${player.lastName}`, error: 'Player date of birth is required' });
          continue;
        }

        if (!player.gender) {
          errors.push({ playerId, playerName: `${player.firstName} ${player.lastName}`, error: 'Player gender is required' });
          continue;
        }

        // Check if player already entered
        const existingEntry = category.entries.find(e => e.playerZpin === player.zpin);
        if (existingEntry) {
          errors.push({ playerId, playerName: `${player.firstName} ${player.lastName}`, error: 'Player already entered in this category' });
          continue;
        }

        playerData = {
          _id: player._id,
          firstName: player.firstName,
          lastName: player.lastName,
          dateOfBirth: player.dateOfBirth,
          gender: player.gender,
          club: player.club || 'Independent',
          zpin: player.zpin
        };
      }

      // Validate eligibility for junior categories (skip for new players without full validation)
      let eligibilityCheck = { eligible: true, reason: isNewPlayerEntry ? 'Pending verification' : 'Eligible', warnings: [], errors: [] };

      if (!isNewPlayerEntry && category.type === 'junior' && category.categoryCode) {
        const player = await User.findById(playerId);
        const validation = validateTournamentEntry(player, category.categoryCode, tournament.startDate);

        if (!validation.eligible) {
          errors.push({
            playerId,
            playerName: `${playerData.firstName} ${playerData.lastName}`,
            error: `Not eligible for ${category.name}: ${validation.errors.join(', ')}`
          });
          continue;
        }

        eligibilityCheck = {
          eligible: validation.eligible,
          reason: validation.info.ageCalculationDate
            ? `Player will be ${validation.info.playerAge} years old on ${validation.info.ageCalculationDate}`
            : 'Eligible',
          suggestedCategory: validation.info.suggestedCategory,
          warnings: validation.warnings
        };
      }

      // Calculate tennis age (year subtraction — official Dec 31 rule)
      const tournamentYear = new Date(tournament.startDate).getFullYear();
      const ageOnDec31 = calculateTennisAge(playerData.dateOfBirth, tournamentYear);
      const currentAge = Math.floor((new Date() - new Date(playerData.dateOfBirth)) / (365.25 * 24 * 60 * 60 * 1000));

      // Create entry data
      const entryData = {
        playerId: isNewPlayerEntry ? null : playerData._id.toString(),
        playerName: `${playerData.firstName} ${playerData.lastName}`,
        playerZpin: playerData.zpin || 'PENDING',
        dateOfBirth: playerData.dateOfBirth,
        age: currentAge,
        ageOnDec31,
        gender: playerData.gender,
        clubName: playerData.club,
        eligibilityCheck,
        status: isNewPlayerEntry ? 'pending_payment' : 'pending_payment',
        paymentStatus: 'unpaid',
        payer: {
          name: payer.name,
          email: payer.email,
          phone: payer.phone,
          relationship: payer.relationship || 'self'
        },
        entryDate: new Date(),
        // Store new player contact info for ZPIN creation
        newPlayerContact: isNewPlayerEntry ? {
          phone: newPlayerData.phone,
          email: newPlayerData.email
        } : null
      };

      // Add entry
      category.entries.push(entryData);
      category.entryCount = category.entries.length;

      results.push({
        playerId: isNewPlayerEntry ? 'new' : playerId,
        playerName: `${playerData.firstName} ${playerData.lastName}`,
        categoryName: category.name,
        status: isNewPlayerEntry ? 'pending_approval' : 'registered',
        isNewPlayer: isNewPlayerEntry
      });
    }

    await tournament.save();

    // Calculate total fee
    const totalFee = results.length * (tournament.entryFee || 0);

    // If payNow is true and there's a fee, return payment info
    let paymentInfo = null;
    if (payNow && totalFee > 0) {
      paymentInfo = {
        amount: totalFee,
        entriesCount: results.length,
        // Payment link will be generated by frontend
      };
    }

    // Generate pay-later token and link if not paying now and there's a fee
    let payLaterLink = '';
    if (!payNow && totalFee > 0) {
      const payLaterToken = jwt.sign(
        { tournamentId: tournament._id, purpose: 'PAY_LATER', payerEmail: payer.email, amount: totalFee },
        process.env.JWT_SECRET,
        { expiresIn: '72h' }
      );
      const webBaseUrl = process.env.WEB_BASE_URL || 'https://zambiatennisassociation.com';
      payLaterLink = `${webBaseUrl}/pay/complete?token=${payLaterToken}`;
    }

    // Send confirmation email
    if (results.length > 0) {
      try {
        await sendEmail({
          email: payer.email,
          subject: `Tournament Registration - ${tournament.name}`,
          html: `
            <h1>Registration Submitted</h1>
            <p>Dear ${payer.name},</p>
            <p>Your registration for <strong>${tournament.name}</strong> has been submitted.</p>
            <p><strong>Registered Players:</strong></p>
            <ul>
              ${results.map(r => `<li>${r.playerName} - ${r.categoryName}</li>`).join('')}
            </ul>
            <p><strong>Tournament Details:</strong></p>
            <ul>
              <li>Date: ${new Date(tournament.startDate).toLocaleDateString()} - ${new Date(tournament.endDate).toLocaleDateString()}</li>
              <li>Venue: ${tournament.venue}</li>
              <li>City: ${tournament.city}</li>
            </ul>
            ${totalFee > 0 ? `
            <p><strong>Payment:</strong></p>
            <p>Total Entry Fee: K${totalFee}</p>
            ${payNow
              ? '<p>Status: Payment Pending</p>'
              : `<p>Status: Pay Later — Entry will be confirmed upon payment</p>
                 <p><a href="${payLaterLink}" style="display:inline-block;padding:12px 24px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px;font-weight:bold;">Complete Payment Now</a></p>
                 <p style="font-size:12px;color:#666;">This link expires in 72 hours.</p>`
            }
            ` : ''}
            ${errors.length > 0 ? `
            <p><strong>Note:</strong> Some entries could not be processed:</p>
            <ul>
              ${errors.map(e => `<li>${e.playerName || e.playerId}: ${e.error}</li>`).join('')}
            </ul>
            ` : ''}
            <p>Thank you for registering!</p>
          `
        });
      } catch (emailError) {
        console.error('Email sending failed:', emailError);
      }
    }

    res.status(201).json({
      success: true,
      message: `Successfully registered ${results.length} entries`,
      data: {
        registered: results,
        errors: errors,
        totalFee,
        paymentInfo,
        tournamentName: tournament.name
      }
    });
  } catch (error) {
    console.error('Public registration error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Verify pay-later token and return payment info
// @route   GET /api/tournaments/pay-later/verify
// @access  Public
export const verifyPayLaterToken = async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({ success: false, message: 'Token is required' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ success: false, message: 'Payment link has expired. Please contact the organizer.' });
      }
      return res.status(401).json({ success: false, message: 'Invalid payment link' });
    }

    if (decoded.purpose !== 'PAY_LATER') {
      return res.status(400).json({ success: false, message: 'Invalid token purpose' });
    }

    const tournament = await Tournament.findById(decoded.tournamentId);
    if (!tournament) {
      return res.status(404).json({ success: false, message: 'Tournament not found' });
    }

    // Check if entries with pending_payment exist for this payer
    const pendingEntries = [];
    for (const category of tournament.categories) {
      for (const entry of category.entries) {
        if (entry.status === 'pending_payment' && entry.payer?.email === decoded.payerEmail) {
          pendingEntries.push({
            entryId: entry._id,
            categoryId: category._id,
            categoryName: category.name,
            playerName: entry.playerName,
            status: entry.status,
            paymentStatus: entry.paymentStatus
          });
        }
      }
    }

    if (pendingEntries.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'All entries are already paid or no longer pending'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        tournamentId: tournament._id,
        tournamentName: tournament.name,
        amount: decoded.amount,
        payerEmail: decoded.payerEmail,
        entries: pendingEntries,
        entryFee: tournament.entryFee
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
