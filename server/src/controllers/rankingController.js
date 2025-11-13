import Ranking from '../models/Ranking.js';

// @desc    Get all rankings
// @route   GET /api/rankings
// @access  Public
export const getRankings = async (req, res) => {
  try {
    const { category, ageGroup } = req.query;

    let query = {};
    if (category) query.category = category;
    if (ageGroup) query.ageGroup = ageGroup;

    const rankings = await Ranking.find(query).sort({ rank: 1 });

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

// @desc    Get rankings by category
// @route   GET /api/rankings/category/:category
// @access  Public
export const getRankingsByCategory = async (req, res) => {
  try {
    const rankings = await Ranking.find({ category: req.params.category }).sort({ rank: 1 });

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

// @desc    Create/Update ranking
// @route   POST /api/rankings
// @access  Private/Admin
export const createOrUpdateRanking = async (req, res) => {
  try {
    const { name, category, rank, points, club, ageGroup } = req.body;

    // Check if ranking exists
    let ranking = await Ranking.findOne({ name, category, ageGroup });

    if (ranking) {
      // Update existing ranking
      ranking.rank = rank;
      ranking.points = points;
      ranking.club = club;
      ranking.lastUpdated = Date.now();
      await ranking.save();
    } else {
      // Create new ranking
      ranking = await Ranking.create(req.body);
    }

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

// @desc    Delete ranking
// @route   DELETE /api/rankings/:id
// @access  Private/Admin
export const deleteRanking = async (req, res) => {
  try {
    const ranking = await Ranking.findByIdAndDelete(req.params.id);

    if (!ranking) {
      return res.status(404).json({
        success: false,
        message: 'Ranking not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Ranking deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Bulk update rankings
// @route   POST /api/rankings/bulk
// @access  Private/Admin
export const bulkUpdateRankings = async (req, res) => {
  try {
    const { rankings } = req.body;

    const operations = rankings.map(ranking => ({
      updateOne: {
        filter: { name: ranking.name, category: ranking.category, ageGroup: ranking.ageGroup },
        update: {
          $set: {
            rank: ranking.rank,
            points: ranking.points,
            club: ranking.club,
            lastUpdated: Date.now()
          }
        },
        upsert: true
      }
    }));

    await Ranking.bulkWrite(operations);

    res.status(200).json({
      success: true,
      message: 'Rankings updated successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
