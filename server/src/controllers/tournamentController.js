import Tournament from '../models/Tournament.js';
import User from '../models/User.js';
import sendEmail from '../utils/sendEmail.js';
import {
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

    // Calculate age on December 31st for junior categories
    const tournamentYear = new Date(tournament.startDate).getFullYear();
    const ageOnDec31 = calculateAgeOnDec31(player.dateOfBirth, tournamentYear);
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
    if (seed !== undefined) entry.seed = seed;
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

      // Calculate ages
      const tournamentYear = new Date(tournament.startDate).getFullYear();
      const ageOnDec31 = calculateAgeOnDec31(playerData.dateOfBirth, tournamentYear);
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

    // Send confirmation email
    if (results.length > 0) {
      try {
        const entriesList = results.map(r => `- ${r.playerName}: ${r.categoryName}`).join('\n');
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
            <p>Status: ${payNow ? 'Payment Pending' : 'Pay Later - Entry will be confirmed upon payment'}</p>
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
