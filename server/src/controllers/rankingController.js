import Ranking from '../models/Ranking.js';
import User from '../models/User.js';

// @desc    Get rankings by category
// @route   GET /api/rankings/:category
// @access  Public
export const getRankingsByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const { period } = req.query;

    const query = { category, isActive: true };
    if (period) {
      query.rankingPeriod = period;
    }

    const rankings = await Ranking.find(query)
      .sort({ rank: 1 })
      .populate('playerId', 'firstName lastName email zpin');

    res.status(200).json({
      success: true,
      count: rankings.length,
      data: rankings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get all ranking categories
// @route   GET /api/rankings/categories/all
// @access  Public
export const getAllCategories = async (req, res) => {
  try {
    const categories = await Ranking.distinct('category');
    
    res.status(200).json({
      success: true,
      data: categories
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get player's ranking across all categories
// @route   GET /api/rankings/player/:playerId
// @access  Public
export const getPlayerRankings = async (req, res) => {
  try {
    const { playerId } = req.params;
    
    const rankings = await Ranking.find({ playerId, isActive: true })
      .sort({ category: 1 });

    res.status(200).json({
      success: true,
      count: rankings.length,
      data: rankings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Create or update ranking
// @route   POST /api/rankings
// @access  Private/Admin
export const createOrUpdateRanking = async (req, res) => {
  try {
    const {
      playerName,
      playerZpin,
      club,
      category,
      rank,
      tournamentResults,
      rankingPeriod
    } = req.body;

    // Try to find existing ranking
    let ranking = await Ranking.findOne({
      playerName,
      category,
      rankingPeriod,
      isActive: true
    });

    if (ranking) {
      // Update existing ranking
      ranking.club = club;
      ranking.rank = rank;
      ranking.tournamentResults = tournamentResults;
      ranking.calculateTotalPoints();
      ranking.lastUpdated = Date.now();
    } else {
      // Create new ranking
      ranking = new Ranking({
        playerName,
        playerZpin,
        club,
        category,
        rank,
        tournamentResults,
        rankingPeriod
      });
      ranking.calculateTotalPoints();
    }

    await ranking.save();

    res.status(201).json({
      success: true,
      data: ranking
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update tournament points for a player
// @route   PUT /api/rankings/:id/tournament
// @access  Private/Admin
export const updateTournamentPoints = async (req, res) => {
  try {
    const { id } = req.params;
    const { tournamentName, tournamentDate, points, position, year } = req.body;

    const ranking = await Ranking.findById(id);

    if (!ranking) {
      return res.status(404).json({
        success: false,
        message: 'Ranking not found'
      });
    }

    // Check if tournament result already exists
    const existingResultIndex = ranking.tournamentResults.findIndex(
      result => result.tournamentName === tournamentName && result.year === year
    );

    if (existingResultIndex >= 0) {
      // Update existing result
      ranking.tournamentResults[existingResultIndex] = {
        tournamentName,
        tournamentDate,
        points,
        position,
        year
      };
    } else {
      // Add new result
      ranking.tournamentResults.push({
        tournamentName,
        tournamentDate,
        points,
        position,
        year
      });
    }

    ranking.calculateTotalPoints();
    ranking.lastUpdated = Date.now();
    await ranking.save();

    // Recalculate rankings for the category
    await Ranking.updateRankings(ranking.category, ranking.rankingPeriod);

    res.status(200).json({
      success: true,
      data: ranking
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Bulk import rankings from CSV data
// @route   POST /api/rankings/import
// @access  Private/Admin
export const importRankings = async (req, res) => {
  try {
    const { category, rankingPeriod, data } = req.body;

    const results = {
      created: 0,
      updated: 0,
      errors: []
    };

    for (const row of data) {
      try {
        const ranking = await Ranking.findOneAndUpdate(
          {
            playerName: row.playerName,
            category,
            rankingPeriod,
            isActive: true
          },
          {
            playerName: row.playerName,
            playerZpin: row.playerZpin,
            club: row.club,
            category,
            rank: row.rank,
            tournamentResults: row.tournamentResults,
            totalPoints: row.totalPoints,
            rankingPeriod,
            lastUpdated: Date.now()
          },
          {
            upsert: true,
            new: true,
            setDefaultsOnInsert: true
          }
        );

        if (ranking.createdAt === ranking.updatedAt) {
          results.created++;
        } else {
          results.updated++;
        }
      } catch (error) {
        results.errors.push({
          player: row.playerName,
          error: error.message
        });
      }
    }

    res.status(200).json({
      success: true,
      message: `Import completed: ${results.created} created, ${results.updated} updated`,
      results
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete ranking
// @route   DELETE /api/rankings/:id
// @access  Private/Admin
export const deleteRanking = async (req, res) => {
  try {
    const ranking = await Ranking.findById(req.params.id);

    if (!ranking) {
      return res.status(404).json({
        success: false,
        message: 'Ranking not found'
      });
    }

    ranking.isActive = false;
    await ranking.save();

    res.status(200).json({
      success: true,
      message: 'Ranking archived successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Recalculate rankings for a category
// @route   POST /api/rankings/recalculate/:category
// @access  Private/Admin
export const recalculateRankings = async (req, res) => {
  try {
    const { category } = req.params;
    const { rankingPeriod } = req.body;

    const rankings = await Ranking.updateRankings(category, rankingPeriod);

    res.status(200).json({
      success: true,
      message: 'Rankings recalculated successfully',
      data: rankings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
