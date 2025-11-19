import Tournament from '../models/Tournament.js';
import sendEmail from '../utils/sendEmail.js';

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
    const tournament = await Tournament.findById(req.params.id).populate('registrations.user', 'firstName lastName email');

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
    const tournament = await Tournament.create(req.body);

    res.status(201).json({
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
    const entryData = req.body;

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

    // Check if entries are still open
    if (tournament.status === 'entries_closed' || tournament.status === 'in_progress' || tournament.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Entries are closed for this tournament'
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
    const existingEntry = category.entries.find(e => e.playerZpin === entryData.playerZpin);
    if (existingEntry) {
      return res.status(400).json({
        success: false,
        message: 'Player already entered in this category'
      });
    }

    // Add entry
    category.entries.push(entryData);
    await tournament.save();

    res.status(201).json({
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

// @desc    Update entry status (accept/reject)
// @route   PUT /api/tournaments/:tournamentId/categories/:categoryId/entries/:entryId
// @access  Private (Admin only)
export const updateEntryStatus = async (req, res) => {
  try {
    const { tournamentId, categoryId, entryId } = req.params;
    const { status, rejectionReason, seed } = req.body;

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
    entry.status = status;
    if (rejectionReason) entry.rejectionReason = rejectionReason;
    if (seed !== undefined) entry.seed = seed;

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
