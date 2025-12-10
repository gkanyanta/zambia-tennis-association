import League from '../models/League.js';
import LeagueTeam from '../models/LeagueTeam.js';

// Validate that team region and gender match league requirements
export const validateTeamForLeague = async (req, res, next) => {
  try {
    const leagueId = req.params.id || req.params.leagueId;
    const { teams } = req.body;

    if (!teams || !Array.isArray(teams)) {
      return next();
    }

    const league = await League.findById(leagueId);
    if (!league) {
      return res.status(404).json({
        success: false,
        error: 'League not found'
      });
    }

    // Validate each team
    for (const teamId of teams) {
      const team = await LeagueTeam.findById(teamId);
      if (!team) {
        return res.status(404).json({
          success: false,
          error: `Team with ID ${teamId} not found`
        });
      }

      if (team.region !== league.region) {
        return res.status(400).json({
          success: false,
          error: `Team ${team.name} is from ${team.region} region but league is for ${league.region} region`
        });
      }
    }

    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Validate league dates
export const validateLeagueDates = (req, res, next) => {
  const { startDate, endDate } = req.body;

  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start >= end) {
      return res.status(400).json({
        success: false,
        error: 'End date must be after start date'
      });
    }

    if (start < new Date()) {
      return res.status(400).json({
        success: false,
        error: 'Start date cannot be in the past'
      });
    }
  }

  next();
};

// Validate fixture dates are within league dates
export const validateFixtureDates = async (req, res, next) => {
  try {
    const leagueId = req.params.id || req.params.leagueId;
    const { scheduledDate } = req.body;

    if (!scheduledDate) {
      return next();
    }

    const league = await League.findById(leagueId);
    if (!league) {
      return res.status(404).json({
        success: false,
        error: 'League not found'
      });
    }

    const fixtureDate = new Date(scheduledDate);
    const leagueStart = new Date(league.startDate);
    const leagueEnd = new Date(league.endDate);

    if (fixtureDate < leagueStart || fixtureDate > leagueEnd) {
      return res.status(400).json({
        success: false,
        error: `Fixture date must be between ${leagueStart.toDateString()} and ${leagueEnd.toDateString()}`
      });
    }

    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Validate match scores
export const validateMatchScores = (req, res, next) => {
  const { matches } = req.body;

  if (!matches || !Array.isArray(matches)) {
    return next();
  }

  for (const match of matches) {
    const { homeScore, awayScore, matchType } = match;

    if (typeof homeScore !== 'number' || typeof awayScore !== 'number') {
      return res.status(400).json({
        success: false,
        error: 'Match scores must be numbers'
      });
    }

    if (homeScore < 0 || homeScore > 3 || awayScore < 0 || awayScore > 3) {
      return res.status(400).json({
        success: false,
        error: 'Match scores must be between 0 and 3 (best of 3 sets)'
      });
    }

    if (!['singles1', 'singles2', 'singles3', 'doubles', 'doubles2'].includes(matchType)) {
      return res.status(400).json({
        success: false,
        error: `Invalid match type: ${matchType}`
      });
    }
  }

  next();
};
