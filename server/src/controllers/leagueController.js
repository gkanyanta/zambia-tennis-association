import League from '../models/League.js';
import LeagueTeam from '../models/LeagueTeam.js';
import LeagueFixture from '../models/LeagueFixture.js';
import User from '../models/User.js';

// Simple in-memory cache for standings
const standingsCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Helper function to get cache key
const getStandingsCacheKey = (leagueId) => `standings_${leagueId}`;

// Helper function to invalidate standings cache
export const invalidateStandingsCache = (leagueId) => {
  const key = getStandingsCacheKey(leagueId);
  standingsCache.delete(key);
};

// @desc    Get all leagues
// @route   GET /api/leagues
// @access  Public
export const getLeagues = async (req, res) => {
  try {
    const { region, gender, season, year, status } = req.query;
    const filter = {};

    if (region) filter.region = region;
    if (gender) filter.gender = gender;
    if (season) filter.season = season;
    if (year) filter.year = parseInt(year);
    if (status) filter.status = status;

    const leagues = await League.find(filter)
      .populate('teams')
      .sort('-year -season');

    res.json({
      success: true,
      count: leagues.length,
      data: leagues
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Get single league
// @route   GET /api/leagues/:id
// @access  Public
export const getLeague = async (req, res) => {
  try {
    const league = await League.findById(req.params.id)
      .populate('teams');

    if (!league) {
      return res.status(404).json({
        success: false,
        error: 'League not found'
      });
    }

    res.json({
      success: true,
      data: league
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Create new league
// @route   POST /api/leagues
// @access  Private (Admin/Staff)
export const createLeague = async (req, res) => {
  try {
    const { name, season, year, region, gender, description, startDate, endDate,
      status, teams, settings, organizer, contactEmail, contactPhone } = req.body;
    const league = await League.create({
      name, season, year, region, gender, description, startDate, endDate,
      status, teams, settings, organizer, contactEmail, contactPhone
    });

    res.status(201).json({
      success: true,
      data: league
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Update league
// @route   PUT /api/leagues/:id
// @access  Private (Admin/Staff)
export const updateLeague = async (req, res) => {
  try {
    const { name, season, year, region, gender, description, startDate, endDate,
      status, teams, settings, organizer, contactEmail, contactPhone } = req.body;
    const league = await League.findByIdAndUpdate(
      req.params.id,
      { name, season, year, region, gender, description, startDate, endDate,
        status, teams, settings, organizer, contactEmail, contactPhone },
      { new: true, runValidators: true }
    ).populate('teams');

    if (!league) {
      return res.status(404).json({
        success: false,
        error: 'League not found'
      });
    }

    res.json({
      success: true,
      data: league
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Delete league
// @route   DELETE /api/leagues/:id
// @access  Private (Admin)
export const deleteLeague = async (req, res) => {
  try {
    const league = await League.findById(req.params.id);

    if (!league) {
      return res.status(404).json({
        success: false,
        error: 'League not found'
      });
    }

    // Delete all fixtures associated with this league
    await LeagueFixture.deleteMany({ league: req.params.id });

    await league.deleteOne();

    res.json({
      success: true,
      data: {}
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Get league standings
// @route   GET /api/leagues/:id/standings
// @access  Public
export const getLeagueStandings = async (req, res) => {
  try {
    const leagueId = req.params.id;
    const cacheKey = getStandingsCacheKey(leagueId);

    // Check cache first
    const cached = standingsCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return res.json({
        success: true,
        data: cached.data,
        cached: true
      });
    }

    const league = await League.findById(leagueId).populate('teams');

    if (!league) {
      return res.status(404).json({
        success: false,
        error: 'League not found'
      });
    }

    // Get all completed fixtures for this league
    const fixtures = await LeagueFixture.find({
      league: leagueId,
      status: 'completed'
    }).populate('homeTeam awayTeam');

    // Calculate standings (with null safety on settings)
    const settings = league.settings || {
      pointsForWin: 3,
      pointsForDraw: 1,
      pointsForLoss: 0
    };
    const standings = calculateStandings(league.teams, fixtures, settings);

    // Cache the result
    standingsCache.set(cacheKey, {
      data: standings,
      timestamp: Date.now()
    });

    res.json({
      success: true,
      data: standings,
      cached: false
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Get league fixtures
// @route   GET /api/leagues/:id/fixtures
// @access  Public
export const getLeagueFixtures = async (req, res) => {
  try {
    const { status, round } = req.query;
    const filter = { league: req.params.id };

    if (status) filter.status = status;
    if (round) filter.round = parseInt(round);

    const fixtures = await LeagueFixture.find(filter)
      .populate('homeTeam awayTeam winner')
      .sort('round scheduledDate');

    res.json({
      success: true,
      count: fixtures.length,
      data: fixtures
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Generate fixtures for league
// @route   POST /api/leagues/:id/fixtures/generate
// @access  Private (Admin/Staff)
export const generateFixtures = async (req, res) => {
  try {
    const league = await League.findById(req.params.id).populate('teams');

    if (!league) {
      return res.status(404).json({
        success: false,
        error: 'League not found'
      });
    }

    if (league.teams.length < 2) {
      return res.status(400).json({
        success: false,
        error: 'League must have at least 2 clubs'
      });
    }

    // Check if fixtures already exist
    const existingFixtures = await LeagueFixture.countDocuments({ league: req.params.id });
    if (existingFixtures > 0) {
      return res.status(400).json({
        success: false,
        error: 'Fixtures already exist for this league. Delete them first to regenerate.'
      });
    }

    const { startDate } = req.body;
    const fixtureStartDate = startDate ? new Date(startDate) : league.startDate;

    // Generate round-robin fixtures using clubs
    const fixtures = generateRoundRobinFixtures(
      league.teams,
      league.settings.numberOfRounds,
      fixtureStartDate
    );

    // Save fixtures with league reference
    const savedFixtures = await LeagueFixture.insertMany(
      fixtures.map(fixture => ({
        ...fixture,
        league: req.params.id
      }))
    );

    res.status(201).json({
      success: true,
      count: savedFixtures.length,
      data: savedFixtures
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Update fixture result
// @route   PUT /api/leagues/:leagueId/fixtures/:fixtureId
// @access  Private (Admin/Staff)
export const updateFixtureResult = async (req, res) => {
  try {
    const { matches, status, notes } = req.body;

    const fixture = await LeagueFixture.findOne({
      _id: req.params.fixtureId,
      league: req.params.leagueId
    });

    if (!fixture) {
      return res.status(404).json({
        success: false,
        error: 'Fixture not found'
      });
    }

    // Update matches
    if (matches) {
      // Convert simple format (homeScore/awayScore) to detailed format (sets array)
      const convertedMatches = matches.map(match => {
        // If simple format (has homeScore/awayScore but no sets), convert to sets
        if (match.homeScore !== undefined && match.awayScore !== undefined && (!match.sets || match.sets.length === 0)) {
          const sets = [];
          const homeSetsWon = match.homeScore;
          const awaySetsWon = match.awayScore;
          const totalSets = Math.max(homeSetsWon, awaySetsWon);

          for (let i = 0; i < totalSets; i++) {
            if (i < homeSetsWon) {
              // Home won this set
              sets.push({setNumber: i + 1, homeGames: 6, awayGames: 4});
            } else {
              // Away won this set
              sets.push({setNumber: i + 1, homeGames: 4, awayGames: 6});
            }
          }

          // Return match with sets array (remove homeScore/awayScore)
          const {homeScore, awayScore, ...restMatch} = match;
          return {
            ...restMatch,
            sets,
            status: 'completed',
            completedAt: new Date()
          };
        }

        // If already has sets or is detailed format, use as-is
        return {
          ...match,
          completedAt: new Date()
        };
      });

      fixture.matches = convertedMatches;
    }

    // Update status
    if (status) {
      fixture.status = status;
      if (status === 'completed') {
        fixture.completedAt = new Date();
      }
    }

    if (notes) {
      fixture.notes = notes;
    }

    await fixture.save(); // This will trigger the pre-save hook to calculate winner

    // Invalidate standings cache when fixture is completed
    if (status === 'completed') {
      invalidateStandingsCache(req.params.leagueId);
    }

    const updatedFixture = await LeagueFixture.findById(fixture._id)
      .populate('homeTeam awayTeam winner');

    res.json({
      success: true,
      data: updatedFixture
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Get all league teams
// @route   GET /api/league-teams
// @access  Public
export const getLeagueTeams = async (req, res) => {
  try {
    const { region, city, isActive } = req.query;
    const filter = {};

    if (region) filter.region = region;
    if (city) filter.city = city;
    if (isActive !== undefined) filter.isActive = isActive === 'true';

    const teams = await LeagueTeam.find(filter).sort('name');

    res.json({
      success: true,
      count: teams.length,
      data: teams
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Get single league team
// @route   GET /api/league-teams/:id
// @access  Public
export const getLeagueTeam = async (req, res) => {
  try {
    const team = await LeagueTeam.findById(req.params.id);

    if (!team) {
      return res.status(404).json({
        success: false,
        error: 'Team not found'
      });
    }

    res.json({
      success: true,
      data: team
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Create league team
// @route   POST /api/league-teams
// @access  Private (Admin/Staff)
export const createLeagueTeam = async (req, res) => {
  try {
    const { name, shortName, region, city, province, homeVenue, clubAffiliation,
      captain, coach, roster, contactEmail, contactPhone, logo, colors, founded, isActive } = req.body;
    const team = await LeagueTeam.create({
      name, shortName, region, city, province, homeVenue, clubAffiliation,
      captain, coach, roster, contactEmail, contactPhone, logo, colors, founded, isActive
    });

    res.status(201).json({
      success: true,
      data: team
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Update league team
// @route   PUT /api/league-teams/:id
// @access  Private (Admin/Staff)
export const updateLeagueTeam = async (req, res) => {
  try {
    const { name, shortName, region, city, province, homeVenue, clubAffiliation,
      captain, coach, roster, contactEmail, contactPhone, logo, colors, founded, isActive } = req.body;
    const team = await LeagueTeam.findByIdAndUpdate(
      req.params.id,
      { name, shortName, region, city, province, homeVenue, clubAffiliation,
        captain, coach, roster, contactEmail, contactPhone, logo, colors, founded, isActive },
      { new: true, runValidators: true }
    );

    if (!team) {
      return res.status(404).json({
        success: false,
        error: 'Team not found'
      });
    }

    res.json({
      success: true,
      data: team
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Delete league team
// @route   DELETE /api/league-teams/:id
// @access  Private (Admin)
export const deleteLeagueTeam = async (req, res) => {
  try {
    const team = await LeagueTeam.findById(req.params.id);

    if (!team) {
      return res.status(404).json({
        success: false,
        error: 'Team not found'
      });
    }

    // Check if team is in any active leagues
    const leaguesWithTeam = await League.find({
      teams: req.params.id,
      status: { $in: ['active', 'upcoming'] }
    });

    if (leaguesWithTeam.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete team that is participating in active or upcoming leagues',
        leagues: leaguesWithTeam.map(l => ({ id: l._id, name: l.name, status: l.status }))
      });
    }

    // Check if team has any fixtures
    const fixturesCount = await LeagueFixture.countDocuments({
      $or: [{ homeTeam: req.params.id }, { awayTeam: req.params.id }]
    });

    if (fixturesCount > 0) {
      return res.status(400).json({
        success: false,
        error: `Cannot delete team with ${fixturesCount} existing fixture(s). Consider marking team as inactive instead.`
      });
    }

    await team.deleteOne();

    res.json({
      success: true,
      data: {}
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Helper function to calculate standings
function calculateStandings(teams, fixtures, settings) {
  const standings = teams.map(team => ({
    team: team,
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    matchesFor: 0,
    matchesAgainst: 0,
    matchesDifference: 0,
    points: 0
  }));

  fixtures.forEach(fixture => {
    const homeTeamIndex = standings.findIndex(
      s => s.team._id.toString() === fixture.homeTeam._id.toString()
    );
    const awayTeamIndex = standings.findIndex(
      s => s.team._id.toString() === fixture.awayTeam._id.toString()
    );

    if (homeTeamIndex === -1 || awayTeamIndex === -1) return;

    const homeWins = fixture.overallScore.homeWins;
    const awayWins = fixture.overallScore.awayWins;

    // Update played
    standings[homeTeamIndex].played++;
    standings[awayTeamIndex].played++;

    // Update matches for/against
    standings[homeTeamIndex].matchesFor += homeWins;
    standings[homeTeamIndex].matchesAgainst += awayWins;
    standings[awayTeamIndex].matchesFor += awayWins;
    standings[awayTeamIndex].matchesAgainst += homeWins;

    // Determine winner and update points
    if (homeWins > awayWins) {
      standings[homeTeamIndex].won++;
      standings[homeTeamIndex].points += settings.pointsForWin;
      standings[awayTeamIndex].lost++;
      standings[awayTeamIndex].points += settings.pointsForLoss;
    } else if (awayWins > homeWins) {
      standings[awayTeamIndex].won++;
      standings[awayTeamIndex].points += settings.pointsForWin;
      standings[homeTeamIndex].lost++;
      standings[homeTeamIndex].points += settings.pointsForLoss;
    } else {
      standings[homeTeamIndex].drawn++;
      standings[awayTeamIndex].drawn++;
      standings[homeTeamIndex].points += settings.pointsForDraw;
      standings[awayTeamIndex].points += settings.pointsForDraw;
    }
  });

  // Calculate match difference
  standings.forEach(standing => {
    standing.matchesDifference = standing.matchesFor - standing.matchesAgainst;
  });

  // Sort standings
  standings.sort((a, b) => {
    // First by points
    if (b.points !== a.points) return b.points - a.points;
    // Then by match difference
    if (b.matchesDifference !== a.matchesDifference) return b.matchesDifference - a.matchesDifference;
    // Then by matches for
    return b.matchesFor - a.matchesFor;
  });

  return standings;
}

// @desc    Add player to team roster
// @route   POST /api/league-teams/:id/roster
// @access  Private (Admin/Staff)
export const addPlayerToRoster = async (req, res) => {
  try {
    const { playerId, playerName, gender, ranking, position } = req.body;

    if (!playerId || !playerName) {
      return res.status(400).json({
        success: false,
        error: 'Player ID and name are required'
      });
    }

    const team = await LeagueTeam.findById(req.params.id);

    if (!team) {
      return res.status(404).json({
        success: false,
        error: 'Team not found'
      });
    }

    // Check if player already in roster
    const existingPlayer = team.roster.find(p => p.playerId === playerId);
    if (existingPlayer) {
      return res.status(400).json({
        success: false,
        error: 'Player already in team roster'
      });
    }

    team.roster.push({
      playerId,
      playerName,
      gender,
      ranking,
      position,
      addedDate: new Date()
    });

    await team.save();

    res.json({
      success: true,
      data: team
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Remove player from team roster
// @route   DELETE /api/league-teams/:id/roster/:playerId
// @access  Private (Admin/Staff)
export const removePlayerFromRoster = async (req, res) => {
  try {
    const team = await LeagueTeam.findById(req.params.id);

    if (!team) {
      return res.status(404).json({
        success: false,
        error: 'Team not found'
      });
    }

    const playerIndex = team.roster.findIndex(p => p.playerId === req.params.playerId);

    if (playerIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Player not found in team roster'
      });
    }

    team.roster.splice(playerIndex, 1);
    await team.save();

    res.json({
      success: true,
      data: team
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Update player position in roster
// @route   PUT /api/league-teams/:id/roster/:playerId
// @access  Private (Admin/Staff)
export const updatePlayerPosition = async (req, res) => {
  try {
    const { position, ranking } = req.body;
    const team = await LeagueTeam.findById(req.params.id);

    if (!team) {
      return res.status(404).json({
        success: false,
        error: 'Team not found'
      });
    }

    const player = team.roster.find(p => p.playerId === req.params.playerId);

    if (!player) {
      return res.status(404).json({
        success: false,
        error: 'Player not found in team roster'
      });
    }

    if (position) player.position = position;
    if (ranking !== undefined) player.ranking = ranking;

    await team.save();

    res.json({
      success: true,
      data: team
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// Helper function to generate round-robin fixtures
function generateRoundRobinFixtures(clubs, numberOfRounds, startDate, fixtureIntervalDays = 7) {
  const fixtures = [];

  // Validate clubs array
  if (!clubs || clubs.length === 0) {
    throw new Error('No clubs provided for fixture generation');
  }

  // Check if clubs are populated objects or just IDs
  const isPopulated = clubs[0] && typeof clubs[0] === 'object' && clubs[0].name;

  if (!isPopulated) {
    throw new Error('Clubs must be populated to generate fixtures. Please ensure teams are populated when fetching the league.');
  }

  const clubIds = clubs.map(club => club._id);
  const n = clubIds.length;

  // If odd number of clubs, add a bye
  const hasBye = n % 2 === 1;
  const totalClubs = hasBye ? n + 1 : n;

  for (let round = 0; round < numberOfRounds; round++) {
    const roundOffset = round * (totalClubs - 1);

    for (let matchday = 0; matchday < totalClubs - 1; matchday++) {
      const actualMatchday = matchday + roundOffset;
      const fixtureDate = new Date(startDate);
      fixtureDate.setDate(fixtureDate.getDate() + actualMatchday * fixtureIntervalDays);

      for (let match = 0; match < totalClubs / 2; match++) {
        let home, away;

        if (matchday === 0) {
          home = match;
          away = totalClubs - 1 - match;
        } else {
          const offset = matchday;
          home = (match + offset) % (totalClubs - 1);
          away = (totalClubs - 1 - match + offset) % (totalClubs - 1);

          if (match === 0) {
            away = totalClubs - 1;
          }
        }

        // Skip if either club is a bye
        if (home >= n || away >= n) continue;

        const homeClub = clubs[home];
        const awayClub = clubs[away];

        // Validate club objects
        if (!homeClub || !awayClub) {
          throw new Error(`Invalid club data at indices ${home} or ${away}`);
        }

        // Alternate home/away for return rounds
        const isReturnRound = round % 2 === 1;
        const actualHome = isReturnRound ? awayClub : homeClub;
        const actualAway = isReturnRound ? homeClub : awayClub;

        fixtures.push({
          round: actualMatchday + 1,
          roundName: `Round ${actualMatchday + 1}`,
          homeTeam: actualHome._id,
          awayTeam: actualAway._id,
          scheduledDate: fixtureDate,
          venue: actualHome.name || 'TBD',
          venueAddress: actualHome.address || '',
          status: 'scheduled',
          matches: [],
          overallScore: { homeWins: 0, awayWins: 0 }
        });
      }
    }
  }

  return fixtures;
}

// @desc    Get available players for team selection
// @route   GET /api/leagues/:leagueId/fixtures/:fixtureId/available-players
// @access  Private (Admin/Staff)
export const getAvailablePlayers = async (req, res) => {
  try {
    const players = await User.find({
      role: 'player',
      membershipStatus: 'active'
    }).select('firstName lastName email gender zpin');

    res.json({
      success: true,
      count: players.length,
      data: players
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Update fixture players
// @route   PUT /api/leagues/:leagueId/fixtures/:fixtureId/players
// @access  Private (Admin/Staff)
export const updateFixturePlayers = async (req, res) => {
  try {
    const { matches } = req.body;

    const fixture = await LeagueFixture.findOne({
      _id: req.params.fixtureId,
      league: req.params.leagueId
    });

    if (!fixture) {
      return res.status(404).json({
        success: false,
        error: 'Fixture not found'
      });
    }

    // Initialize matches if not exists
    if (!fixture.matches || fixture.matches.length === 0) {
      fixture.matches = [
        { matchType: 'singles1', status: 'not_started', sets: [], homeSetsWon: 0, awaySetsWon: 0 },
        { matchType: 'singles2', status: 'not_started', sets: [], homeSetsWon: 0, awaySetsWon: 0 },
        { matchType: 'doubles', status: 'not_started', sets: [], homeSetsWon: 0, awaySetsWon: 0 }
      ];
    }

    // Update player assignments
    matches.forEach((match, index) => {
      if (fixture.matches[index]) {
        if (match.matchType === 'doubles') {
          fixture.matches[index].homePlayers = match.homePlayers || [];
          fixture.matches[index].awayPlayers = match.awayPlayers || [];
        } else {
          fixture.matches[index].homePlayer = match.homePlayer;
          fixture.matches[index].awayPlayer = match.awayPlayer;
        }
      }
    });

    await fixture.save();

    const updatedFixture = await LeagueFixture.findById(fixture._id)
      .populate('homeTeam awayTeam')
      .populate('matches.homePlayer matches.awayPlayer matches.homePlayers matches.awayPlayers');

    res.json({
      success: true,
      data: updatedFixture
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Update match score (set by set)
// @route   PUT /api/leagues/:leagueId/fixtures/:fixtureId/matches/:matchIndex/score
// @access  Private (Admin/Staff)
export const updateMatchScore = async (req, res) => {
  try {
    const { sets, status } = req.body;
    const matchIndex = parseInt(req.params.matchIndex);

    const fixture = await LeagueFixture.findOne({
      _id: req.params.fixtureId,
      league: req.params.leagueId
    });

    if (!fixture) {
      return res.status(404).json({
        success: false,
        error: 'Fixture not found'
      });
    }

    if (!fixture.matches[matchIndex]) {
      return res.status(404).json({
        success: false,
        error: 'Match not found'
      });
    }

    // Validate sets
    if (sets && sets.length > 0) {
      for (const set of sets) {
        // Validate tennis scores
        const homeGames = set.homeGames;
        const awayGames = set.awayGames;
        
        // Check for valid tennis scores
        if (homeGames < 0 || awayGames < 0) {
          return res.status(400).json({
            success: false,
            error: 'Games cannot be negative'
          });
        }

        if (homeGames > 7 || awayGames > 7) {
          return res.status(400).json({
            success: false,
            error: 'Maximum 7 games per set'
          });
        }

        // Validate winning conditions
        const diff = Math.abs(homeGames - awayGames);
        const winner = homeGames > awayGames ? homeGames : awayGames;
        
        if (winner === 6 && diff < 2 && diff !== 0) {
          return res.status(400).json({
            success: false,
            error: 'Must win by 2 games when score is 6'
          });
        }

        if (winner === 7 && (homeGames !== 7 || awayGames < 5) && (awayGames !== 7 || homeGames < 5)) {
          return res.status(400).json({
            success: false,
            error: 'Score 7 must be from 7-5 or 7-6 tiebreak'
          });
        }

        // Detect tiebreak
        if ((homeGames === 7 && awayGames === 6) || (awayGames === 7 && homeGames === 6)) {
          if (!set.tiebreak || !set.tiebreak.played) {
            return res.status(400).json({
              success: false,
              error: 'Tiebreak details required for 7-6 score'
            });
          }
        }
      }
    }

    // Update match
    fixture.matches[matchIndex].sets = sets;
    fixture.matches[matchIndex].status = status || 'in_progress';
    
    if (status === 'completed') {
      fixture.matches[matchIndex].completedAt = new Date();
    }

    // Check if all matches are completed
    const allCompleted = fixture.matches.every(m => m.status === 'completed');
    if (allCompleted) {
      fixture.status = 'completed';
      fixture.completedAt = new Date();
    }

    await fixture.save(); // This triggers pre-save hook to calculate winners

    // Invalidate standings cache if fixture is completed
    if (fixture.status === 'completed') {
      invalidateStandingsCache(req.params.leagueId);
    }

    const updatedFixture = await LeagueFixture.findById(fixture._id)
      .populate('homeTeam awayTeam winner')
      .populate('matches.homePlayer matches.awayPlayer matches.homePlayers matches.awayPlayers');

    res.json({
      success: true,
      data: updatedFixture
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Get single fixture with full details
// @route   GET /api/leagues/:leagueId/fixtures/:fixtureId
// @access  Public
export const getFixture = async (req, res) => {
  try {
    const fixture = await LeagueFixture.findOne({
      _id: req.params.fixtureId,
      league: req.params.leagueId
    })
      .populate('homeTeam awayTeam winner')
      .populate('matches.homePlayer matches.awayPlayer matches.homePlayers matches.awayPlayers');

    if (!fixture) {
      return res.status(404).json({
        success: false,
        error: 'Fixture not found'
      });
    }

    res.json({
      success: true,
      data: fixture
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
