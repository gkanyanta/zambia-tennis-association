import League from '../models/League.js';
import Tie from '../models/Tie.js';
import User from '../models/User.js';
import Club from '../models/Club.js';
import CalendarEvent from '../models/CalendarEvent.js';
import LeagueRegistration from '../models/LeagueRegistration.js';

// Match format definitions (ITF-aligned)
export const MATCH_FORMATS = {
  '2s1d': [
    { rubberNumber: 1, type: 'singles1' },
    { rubberNumber: 2, type: 'singles2' },
    { rubberNumber: 3, type: 'doubles1' }
  ],
  '3s2d': [
    { rubberNumber: 1, type: 'singles1' },
    { rubberNumber: 2, type: 'singles2' },
    { rubberNumber: 3, type: 'singles3' },
    { rubberNumber: 4, type: 'doubles1' },
    { rubberNumber: 5, type: 'doubles2' }
  ],
  '4s1d': [
    { rubberNumber: 1, type: 'singles1' },
    { rubberNumber: 2, type: 'singles2' },
    { rubberNumber: 3, type: 'singles3' },
    { rubberNumber: 4, type: 'singles4' },
    { rubberNumber: 5, type: 'doubles1' }
  ]
};

// In-memory standings cache
const standingsCache = new Map();
const CACHE_TTL = 5 * 60 * 1000;

const getCacheKey = (leagueId) => `standings_${leagueId}`;

export const invalidateStandingsCache = (leagueId) => {
  standingsCache.delete(getCacheKey(leagueId));
};

// Allowed fields for League create/update
const LEAGUE_FIELDS = [
  'name', 'season', 'year', 'region', 'gender', 'description',
  'startDate', 'endDate', 'status', 'teams', 'settings',
  'organizer', 'contactEmail', 'contactPhone'
];

const pick = (obj, keys) => {
  const result = {};
  for (const key of keys) {
    if (obj[key] !== undefined) result[key] = obj[key];
  }
  return result;
};

// ─── League CRUD ────────────────────────────────────────────────

// GET /api/leagues
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

    res.json({ success: true, count: leagues.length, data: leagues });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// GET /api/leagues/:id
export const getLeague = async (req, res) => {
  try {
    const league = await League.findById(req.params.id).populate('teams');
    if (!league) {
      return res.status(404).json({ success: false, error: 'League not found' });
    }
    res.json({ success: true, data: league });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// POST /api/leagues
export const createLeague = async (req, res) => {
  try {
    const league = await League.create(pick(req.body, LEAGUE_FIELDS));
    res.status(201).json({ success: true, data: league });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// PUT /api/leagues/:id
export const updateLeague = async (req, res) => {
  try {
    const league = await League.findByIdAndUpdate(
      req.params.id,
      pick(req.body, LEAGUE_FIELDS),
      { new: true, runValidators: true }
    ).populate('teams');

    if (!league) {
      return res.status(404).json({ success: false, error: 'League not found' });
    }
    res.json({ success: true, data: league });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// DELETE /api/leagues/:id
export const deleteLeague = async (req, res) => {
  try {
    const league = await League.findById(req.params.id);
    if (!league) {
      return res.status(404).json({ success: false, error: 'League not found' });
    }
    await Tie.deleteMany({ league: req.params.id });
    await league.deleteOne();
    res.json({ success: true, data: {} });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ─── Standings (ITF tiebreakers) ────────────────────────────────

// GET /api/leagues/:id/standings
export const getLeagueStandings = async (req, res) => {
  try {
    const leagueId = req.params.id;
    const cacheKey = getCacheKey(leagueId);

    const cached = standingsCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return res.json({ success: true, data: cached.data, cached: true });
    }

    const league = await League.findById(leagueId).populate('teams');
    if (!league) {
      return res.status(404).json({ success: false, error: 'League not found' });
    }

    const ties = await Tie.find({ league: leagueId, status: 'completed' })
      .populate('homeTeam awayTeam');

    const settings = league.settings || { pointsForWin: 3, pointsForDraw: 1, pointsForLoss: 0 };
    const standings = calculateStandings(league.teams, ties, settings);

    standingsCache.set(cacheKey, { data: standings, timestamp: Date.now() });

    res.json({ success: true, data: standings, cached: false });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

function calculateStandings(teams, ties, settings) {
  const standings = teams.map(team => ({
    team,
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    rubbersFor: 0,
    rubbersAgainst: 0,
    setsFor: 0,
    setsAgainst: 0,
    gamesFor: 0,
    gamesAgainst: 0,
    points: 0
  }));

  // Build team index for fast lookup
  const teamIndex = {};
  standings.forEach((s, i) => { teamIndex[s.team._id.toString()] = i; });

  // Build head-to-head map: h2h[teamA][teamB] = { wins, losses, draws }
  const h2h = {};

  ties.forEach(tie => {
    const homeId = tie.homeTeam._id.toString();
    const awayId = tie.awayTeam._id.toString();
    const hi = teamIndex[homeId];
    const ai = teamIndex[awayId];
    if (hi === undefined || ai === undefined) return;

    const home = standings[hi];
    const away = standings[ai];

    home.played++;
    away.played++;

    // Rubbers, sets, games from aggregated stats
    home.rubbersFor += tie.stats.home.rubbersWon;
    home.rubbersAgainst += tie.stats.away.rubbersWon;
    away.rubbersFor += tie.stats.away.rubbersWon;
    away.rubbersAgainst += tie.stats.home.rubbersWon;

    home.setsFor += tie.stats.home.setsWon;
    home.setsAgainst += tie.stats.away.setsWon;
    away.setsFor += tie.stats.away.setsWon;
    away.setsAgainst += tie.stats.home.setsWon;

    home.gamesFor += tie.stats.home.gamesWon;
    home.gamesAgainst += tie.stats.away.gamesWon;
    away.gamesFor += tie.stats.away.gamesWon;
    away.gamesAgainst += tie.stats.home.gamesWon;

    // Points
    const homeScore = tie.score.home;
    const awayScore = tie.score.away;

    // Init h2h entries
    if (!h2h[homeId]) h2h[homeId] = {};
    if (!h2h[awayId]) h2h[awayId] = {};
    if (!h2h[homeId][awayId]) h2h[homeId][awayId] = { wins: 0, losses: 0, draws: 0 };
    if (!h2h[awayId][homeId]) h2h[awayId][homeId] = { wins: 0, losses: 0, draws: 0 };

    if (homeScore > awayScore) {
      home.won++;
      home.points += settings.pointsForWin;
      away.lost++;
      away.points += settings.pointsForLoss;
      h2h[homeId][awayId].wins++;
      h2h[awayId][homeId].losses++;
    } else if (awayScore > homeScore) {
      away.won++;
      away.points += settings.pointsForWin;
      home.lost++;
      home.points += settings.pointsForLoss;
      h2h[awayId][homeId].wins++;
      h2h[homeId][awayId].losses++;
    } else {
      home.drawn++;
      away.drawn++;
      home.points += settings.pointsForDraw;
      away.points += settings.pointsForDraw;
      h2h[homeId][awayId].draws++;
      h2h[awayId][homeId].draws++;
    }
  });

  // Sort with ITF tiebreaker hierarchy
  standings.sort((a, b) => {
    // 1. Points
    if (b.points !== a.points) return b.points - a.points;

    // 2. Head-to-head (only when exactly 2 teams tied)
    const aId = a.team._id.toString();
    const bId = b.team._id.toString();
    const record = h2h[aId]?.[bId];
    if (record) {
      const netWins = record.wins - record.losses;
      if (netWins !== 0) return -netWins; // positive netWins means a beats b
    }

    // 3. Rubber difference, then rubbers for
    const rubberDiffA = a.rubbersFor - a.rubbersAgainst;
    const rubberDiffB = b.rubbersFor - b.rubbersAgainst;
    if (rubberDiffB !== rubberDiffA) return rubberDiffB - rubberDiffA;
    if (b.rubbersFor !== a.rubbersFor) return b.rubbersFor - a.rubbersFor;

    // 4. Set difference, then sets for
    const setDiffA = a.setsFor - a.setsAgainst;
    const setDiffB = b.setsFor - b.setsAgainst;
    if (setDiffB !== setDiffA) return setDiffB - setDiffA;
    if (b.setsFor !== a.setsFor) return b.setsFor - a.setsFor;

    // 5. Game difference, then games for
    const gameDiffA = a.gamesFor - a.gamesAgainst;
    const gameDiffB = b.gamesFor - b.gamesAgainst;
    if (gameDiffB !== gameDiffA) return gameDiffB - gameDiffA;
    return b.gamesFor - a.gamesFor;
  });

  return standings;
}

// ─── Ties (fixtures) ────────────────────────────────────────────

// GET /api/leagues/:id/ties
export const getLeagueTies = async (req, res) => {
  try {
    const { status, round } = req.query;
    const filter = { league: req.params.id };
    if (status) filter.status = status;
    if (round) filter.round = parseInt(round);

    const ties = await Tie.find(filter)
      .populate('homeTeam awayTeam winner')
      .sort('round scheduledDate');

    res.json({ success: true, count: ties.length, data: ties });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// GET /api/leagues/:leagueId/ties/:tieId
export const getTie = async (req, res) => {
  try {
    const tie = await Tie.findOne({
      _id: req.params.tieId,
      league: req.params.leagueId
    })
      .populate('homeTeam awayTeam winner')
      .populate('rubbers.homePlayer rubbers.awayPlayer rubbers.homePlayers rubbers.awayPlayers');

    if (!tie) {
      return res.status(404).json({ success: false, error: 'Tie not found' });
    }
    res.json({ success: true, data: tie });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// POST /api/leagues/:id/ties/generate
export const generateTies = async (req, res) => {
  try {
    const league = await League.findById(req.params.id).populate('teams');
    if (!league) {
      return res.status(404).json({ success: false, error: 'League not found' });
    }
    if (league.teams.length < 2) {
      return res.status(400).json({ success: false, error: 'League must have at least 2 clubs' });
    }

    const existing = await Tie.countDocuments({ league: req.params.id });
    if (existing > 0) {
      return res.status(400).json({
        success: false,
        error: 'Ties already exist for this league. Delete them first to regenerate.'
      });
    }

    const format = MATCH_FORMATS[league.settings.matchFormat] || MATCH_FORMATS['2s1d'];

    // Fetch league match dates from calendar (optional)
    const leagueDates = await CalendarEvent.find({
      type: 'league',
      startDate: { $gte: league.startDate, $lte: league.endDate }
    }).sort('startDate');

    // Check if opposite-gender league exists in same region for coordinated scheduling
    const oppositeGender = league.gender === 'men' ? 'women' : 'men';
    const siblingLeague = await League.findOne({
      region: league.region,
      gender: oppositeGender,
      year: league.year,
      status: { $in: ['upcoming', 'active'] },
      _id: { $ne: league._id }
    }).populate('teams');

    // Check if sibling league already has ties (use its matchup order)
    let siblingTies = [];
    if (siblingLeague) {
      siblingTies = await Tie.find({ league: siblingLeague._id }).sort('round scheduledDate').populate('homeTeam awayTeam');
    }

    let tieData;
    const startDate = req.body.startDate ? new Date(req.body.startDate) : league.startDate;

    if (siblingTies.length > 0) {
      // Mirror sibling league matchups: same clubs play each other on same dates
      tieData = generateMirroredTies(league.teams, siblingTies, leagueDates.length > 0 ? leagueDates : null, format);
    } else if (leagueDates.length > 0) {
      // Use calendar dates
      tieData = generateRoundRobin(league.teams, league.settings.numberOfRounds, leagueDates, format);
    } else {
      // Fallback: use weekly intervals from start date
      tieData = generateRoundRobinByInterval(league.teams, league.settings.numberOfRounds, startDate, format);
    }

    const saved = await Tie.insertMany(
      tieData.map(t => ({ ...t, league: req.params.id }))
    );

    res.status(201).json({ success: true, count: saved.length, data: saved });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

/**
 * Generate round-robin ties using calendar dates instead of fixed intervals.
 * Each matchday maps to a calendar league date.
 */
function generateRoundRobin(clubs, numberOfRounds, leagueDates, format) {
  if (!clubs || clubs.length === 0) {
    throw new Error('No clubs provided for tie generation');
  }

  const n = clubs.length;
  const hasBye = n % 2 === 1;
  const total = hasBye ? n + 1 : n;
  const matchdaysNeeded = (total - 1) * numberOfRounds;

  if (leagueDates.length < matchdaysNeeded) {
    throw new Error(
      `Not enough league dates on calendar. Need ${matchdaysNeeded} match days but only ${leagueDates.length} found. Please add more "League Match Day" events to the calendar.`
    );
  }

  const ties = [];
  const emptyRubbers = format.map(f => ({
    rubberNumber: f.rubberNumber,
    type: f.type,
    sets: [],
    score: { homeSetsWon: 0, awaySetsWon: 0 },
    status: 'not_started'
  }));

  for (let round = 0; round < numberOfRounds; round++) {
    const roundOffset = round * (total - 1);

    for (let matchday = 0; matchday < total - 1; matchday++) {
      const actualMatchday = matchday + roundOffset;
      const date = leagueDates[actualMatchday].startDate;

      for (let m = 0; m < total / 2; m++) {
        let home, away;

        if (matchday === 0) {
          home = m;
          away = total - 1 - m;
        } else {
          home = (m + matchday) % (total - 1);
          away = (total - 1 - m + matchday) % (total - 1);
          if (m === 0) away = total - 1;
        }

        if (home >= n || away >= n) continue;

        const isReturn = round % 2 === 1;
        const homeClub = isReturn ? clubs[away] : clubs[home];
        const awayClub = isReturn ? clubs[home] : clubs[away];

        ties.push({
          round: actualMatchday + 1,
          roundName: `Round ${actualMatchday + 1}`,
          homeTeam: homeClub._id,
          awayTeam: awayClub._id,
          scheduledDate: date,
          venue: homeClub.name || 'TBD',
          venueAddress: homeClub.address || '',
          status: 'scheduled',
          rubbers: emptyRubbers.map(r => ({ ...r })),
          calendarEvent: leagueDates[actualMatchday]._id
        });
      }
    }
  }

  return ties;
}

/**
 * Fallback: generate round-robin ties using weekly intervals (no calendar required).
 */
function generateRoundRobinByInterval(clubs, numberOfRounds, startDate, format, intervalDays = 7) {
  if (!clubs || clubs.length === 0) {
    throw new Error('No clubs provided for tie generation');
  }

  const n = clubs.length;
  const hasBye = n % 2 === 1;
  const total = hasBye ? n + 1 : n;
  const ties = [];
  const emptyRubbers = format.map(f => ({
    rubberNumber: f.rubberNumber,
    type: f.type,
    sets: [],
    score: { homeSetsWon: 0, awaySetsWon: 0 },
    status: 'not_started'
  }));

  for (let round = 0; round < numberOfRounds; round++) {
    const roundOffset = round * (total - 1);

    for (let matchday = 0; matchday < total - 1; matchday++) {
      const actualMatchday = matchday + roundOffset;
      const date = new Date(startDate);
      date.setDate(date.getDate() + actualMatchday * intervalDays);

      for (let m = 0; m < total / 2; m++) {
        let home, away;

        if (matchday === 0) {
          home = m;
          away = total - 1 - m;
        } else {
          home = (m + matchday) % (total - 1);
          away = (total - 1 - m + matchday) % (total - 1);
          if (m === 0) away = total - 1;
        }

        if (home >= n || away >= n) continue;

        const isReturn = round % 2 === 1;
        const homeClub = isReturn ? clubs[away] : clubs[home];
        const awayClub = isReturn ? clubs[home] : clubs[away];

        ties.push({
          round: actualMatchday + 1,
          roundName: `Round ${actualMatchday + 1}`,
          homeTeam: homeClub._id,
          awayTeam: awayClub._id,
          scheduledDate: date,
          venue: homeClub.name || 'TBD',
          venueAddress: homeClub.address || '',
          status: 'scheduled',
          rubbers: emptyRubbers.map(r => ({ ...r }))
        });
      }
    }
  }

  return ties;
}

/**
 * Generate ties that mirror an existing sibling league's schedule.
 * Maps club names between leagues so the same clubs play on the same dates.
 * If calendar dates are provided, uses those; otherwise uses sibling tie dates.
 */
function generateMirroredTies(clubs, siblingTies, leagueDates, format) {
  const ties = [];
  const emptyRubbers = format.map(f => ({
    rubberNumber: f.rubberNumber,
    type: f.type,
    sets: [],
    score: { homeSetsWon: 0, awaySetsWon: 0 },
    status: 'not_started'
  }));

  // Build map from club name to this league's club object
  const clubByName = {};
  clubs.forEach(c => { clubByName[c.name.toLowerCase()] = c; });

  // Group sibling ties by round
  const siblingByRound = {};
  siblingTies.forEach(t => {
    if (!siblingByRound[t.round]) siblingByRound[t.round] = [];
    siblingByRound[t.round].push(t);
  });

  const rounds = Object.keys(siblingByRound).sort((a, b) => a - b);

  for (let i = 0; i < rounds.length; i++) {
    const round = rounds[i];
    const roundTies = siblingByRound[round];
    // Use calendar date if available, otherwise use sibling tie's date
    const date = (leagueDates && leagueDates[i]) ? leagueDates[i].startDate : roundTies[0].scheduledDate;

    for (const sibTie of roundTies) {
      // Find corresponding clubs in this league by name
      const homeClub = clubByName[sibTie.homeTeam.name?.toLowerCase()];
      const awayClub = clubByName[sibTie.awayTeam.name?.toLowerCase()];

      // Skip if this league doesn't have the corresponding club
      if (!homeClub || !awayClub) continue;

      ties.push({
        round: parseInt(round),
        roundName: `Round ${round}`,
        homeTeam: homeClub._id,
        awayTeam: awayClub._id,
        scheduledDate: date,
        venue: homeClub.name || 'TBD',
        venueAddress: homeClub.address || '',
        status: 'scheduled',
        rubbers: emptyRubbers.map(r => ({ ...r })),
        calendarEvent: (leagueDates && leagueDates[i]) ? leagueDates[i]._id : undefined
      });
    }
  }

  return ties;
}

// PUT /api/leagues/:leagueId/ties/:tieId
export const updateTie = async (req, res) => {
  try {
    const { status, notes, scheduledDate, scheduledTime, venue, venueAddress, postponementReason } = req.body;

    const tie = await Tie.findOne({ _id: req.params.tieId, league: req.params.leagueId });
    if (!tie) {
      return res.status(404).json({ success: false, error: 'Tie not found' });
    }

    if (status) {
      tie.status = status;
      if (status === 'completed') tie.completedAt = new Date();
    }
    if (notes !== undefined) tie.notes = notes;
    if (scheduledDate) tie.scheduledDate = scheduledDate;
    if (scheduledTime !== undefined) tie.scheduledTime = scheduledTime;
    if (venue) tie.venue = venue;
    if (venueAddress !== undefined) tie.venueAddress = venueAddress;
    if (postponementReason !== undefined) tie.postponementReason = postponementReason;

    await tie.save();

    if (status === 'completed') {
      invalidateStandingsCache(req.params.leagueId);
    }

    const updated = await Tie.findById(tie._id)
      .populate('homeTeam awayTeam winner');

    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// ─── Club official access check ─────────────────────────────────

/**
 * Check if a club_official user has access to a tie (their club is involved).
 * Admin/staff always have access. Returns false if club_official's club
 * does not match either home or away team.
 */
async function checkTieAccess(user, tie) {
  if (user.role === 'admin' || user.role === 'staff') return true;
  if (user.role !== 'club_official' || !user.club) return false;

  // Populate team names if not already populated
  const populatedTie = tie.homeTeam?.name ? tie : await Tie.findById(tie._id).populate('homeTeam awayTeam');
  const userClub = user.club.toLowerCase();
  return (
    populatedTie.homeTeam.name.toLowerCase() === userClub ||
    populatedTie.awayTeam.name.toLowerCase() === userClub
  );
}

// ─── Player selection ───────────────────────────────────────────

// GET /api/leagues/:leagueId/ties/:tieId/available-players
export const getAvailablePlayers = async (req, res) => {
  try {
    const tie = await Tie.findOne({
      _id: req.params.tieId,
      league: req.params.leagueId
    }).populate('homeTeam awayTeam');
    if (!tie) {
      return res.status(404).json({ success: false, error: 'Tie not found' });
    }

    if (!(await checkTieAccess(req.user, tie))) {
      return res.status(403).json({ success: false, error: 'You can only manage ties involving your club' });
    }

    const league = await League.findById(req.params.leagueId);

    // Use populated team names (User.club stores name as string)
    const clubs = [tie.homeTeam, tie.awayTeam];
    const clubNames = clubs.map(c => c.name);

    const filter = {
      role: 'player',
      club: { $in: clubNames.map(name => new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i')) }
    };

    // Filter by gender based on league
    if (league?.gender === 'men') filter.gender = 'male';
    else if (league?.gender === 'women') filter.gender = 'female';

    // Filter by tennis age: 14+ years old
    const cutoffDate = new Date();
    cutoffDate.setFullYear(cutoffDate.getFullYear() - 14);
    filter.dateOfBirth = { $lte: cutoffDate };

    const players = await User.find(filter)
      .select('firstName lastName email gender zpin club dateOfBirth')
      .sort('club lastName firstName');

    // Attach club ObjectId so frontend can group by team
    const clubNameToId = {};
    clubs.forEach(c => { clubNameToId[c.name.toLowerCase()] = c._id; });

    const playersWithClubId = players.map(p => {
      const obj = p.toObject();
      obj.clubId = clubNameToId[p.club?.toLowerCase()] || null;
      return obj;
    });

    res.json({ success: true, count: playersWithClubId.length, data: playersWithClubId });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// PUT /api/leagues/:leagueId/ties/:tieId/players
export const updateTiePlayers = async (req, res) => {
  try {
    const { rubbers } = req.body;

    const tie = await Tie.findOne({ _id: req.params.tieId, league: req.params.leagueId }).populate('homeTeam awayTeam');
    if (!tie) {
      return res.status(404).json({ success: false, error: 'Tie not found' });
    }

    if (!(await checkTieAccess(req.user, tie))) {
      return res.status(403).json({ success: false, error: 'You can only manage ties involving your club' });
    }

    rubbers.forEach((rubber, index) => {
      if (!tie.rubbers[index]) return;
      const isDoubles = tie.rubbers[index].type.startsWith('doubles');

      if (isDoubles) {
        tie.rubbers[index].homePlayers = rubber.homePlayers || [];
        tie.rubbers[index].awayPlayers = rubber.awayPlayers || [];
      } else {
        tie.rubbers[index].homePlayer = rubber.homePlayer;
        tie.rubbers[index].awayPlayer = rubber.awayPlayer;
      }
    });

    await tie.save();

    const updated = await Tie.findById(tie._id)
      .populate('homeTeam awayTeam')
      .populate('rubbers.homePlayer rubbers.awayPlayer rubbers.homePlayers rubbers.awayPlayers');

    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// ─── Rubber scoring ─────────────────────────────────────────────

// PUT /api/leagues/:leagueId/ties/:tieId/rubbers/:rubberIndex/score
export const updateRubberScore = async (req, res) => {
  try {
    const { sets, status } = req.body;
    const rubberIndex = parseInt(req.params.rubberIndex);

    const tie = await Tie.findOne({ _id: req.params.tieId, league: req.params.leagueId }).populate('homeTeam awayTeam');
    if (!tie) {
      return res.status(404).json({ success: false, error: 'Tie not found' });
    }

    if (!(await checkTieAccess(req.user, tie))) {
      return res.status(403).json({ success: false, error: 'You can only score ties involving your club' });
    }
    if (!tie.rubbers[rubberIndex]) {
      return res.status(404).json({ success: false, error: 'Rubber not found' });
    }

    // Validate tennis set scores
    if (sets && sets.length > 0) {
      for (const set of sets) {
        const { homeGames, awayGames } = set;

        if (homeGames < 0 || awayGames < 0) {
          return res.status(400).json({ success: false, error: 'Games cannot be negative' });
        }
        if (homeGames > 7 || awayGames > 7) {
          return res.status(400).json({ success: false, error: 'Maximum 7 games per set' });
        }

        const high = Math.max(homeGames, awayGames);
        const diff = Math.abs(homeGames - awayGames);

        if (high === 6 && diff < 2 && diff !== 0) {
          return res.status(400).json({ success: false, error: 'Must win by 2 games at 6' });
        }
        if (high === 7 && ![5, 6].includes(Math.min(homeGames, awayGames))) {
          return res.status(400).json({ success: false, error: 'Score of 7 must be 7-5 or 7-6' });
        }
        if ((homeGames === 7 && awayGames === 6) || (awayGames === 7 && homeGames === 6)) {
          if (!set.tiebreak || !set.tiebreak.played) {
            return res.status(400).json({ success: false, error: 'Tiebreak details required for 7-6' });
          }
        }
      }
    }

    tie.rubbers[rubberIndex].sets = sets;
    tie.rubbers[rubberIndex].status = status || 'in_progress';
    if (status === 'completed') {
      tie.rubbers[rubberIndex].completedAt = new Date();
    }

    // Auto-complete tie when all rubbers are done
    const allDone = tie.rubbers.every(r =>
      ['completed', 'retired', 'walkover', 'defaulted'].includes(r.status)
    );
    if (allDone) {
      tie.status = 'completed';
      tie.completedAt = new Date();
    }

    await tie.save(); // pre-save hook calculates scores

    if (tie.status === 'completed') {
      invalidateStandingsCache(req.params.leagueId);
    }

    const updated = await Tie.findById(tie._id)
      .populate('homeTeam awayTeam winner')
      .populate('rubbers.homePlayer rubbers.awayPlayer rubbers.homePlayers rubbers.awayPlayers');

    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// ─── Walkover handling ──────────────────────────────────────────

// POST /api/leagues/:leagueId/ties/:tieId/walkover
export const recordWalkover = async (req, res) => {
  try {
    const { walkoverTeam, reason, rubberIndex } = req.body;

    const tie = await Tie.findOne({ _id: req.params.tieId, league: req.params.leagueId });
    if (!tie) {
      return res.status(404).json({ success: false, error: 'Tie not found' });
    }

    if (rubberIndex !== undefined) {
      // Single rubber walkover
      if (!tie.rubbers[rubberIndex]) {
        return res.status(404).json({ success: false, error: 'Rubber not found' });
      }
      const winner = walkoverTeam === tie.homeTeam.toString() ? 'away' : 'home';
      tie.rubbers[rubberIndex].status = 'walkover';
      tie.rubbers[rubberIndex].winner = winner;
      tie.rubbers[rubberIndex].walkoverTeam = walkoverTeam === tie.homeTeam.toString() ? 'home' : 'away';
    } else {
      // Full tie walkover — score all rubbers as walkover
      const winner = walkoverTeam === tie.homeTeam.toString() ? 'away' : 'home';
      tie.rubbers.forEach(rubber => {
        rubber.status = 'walkover';
        rubber.winner = winner;
        rubber.walkoverTeam = walkoverTeam === tie.homeTeam.toString() ? 'home' : 'away';
      });
      tie.status = 'walkover';
      tie.walkoverTeam = walkoverTeam;
      tie.walkoverReason = reason;
      tie.completedAt = new Date();
    }

    // Auto-complete if all rubbers resolved
    const allDone = tie.rubbers.every(r =>
      ['completed', 'retired', 'walkover', 'defaulted'].includes(r.status)
    );
    if (allDone && tie.status === 'scheduled') {
      tie.status = 'completed';
      tie.completedAt = new Date();
    }

    await tie.save();
    invalidateStandingsCache(req.params.leagueId);

    const updated = await Tie.findById(tie._id).populate('homeTeam awayTeam winner');
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// ─── League Registration ────────────────────────────────────────

// POST /api/leagues/:id/register
export const registerForLeague = async (req, res) => {
  try {
    const leagueId = req.params.id;
    const league = await League.findById(leagueId);
    if (!league) {
      return res.status(404).json({ success: false, error: 'League not found' });
    }

    if (league.status !== 'upcoming') {
      return res.status(400).json({ success: false, error: 'Registration is only open for upcoming leagues' });
    }

    // Find the club matching the user's club name
    if (!req.user.club) {
      return res.status(400).json({ success: false, error: 'You must be associated with a club to register' });
    }

    const club = await Club.findOne({
      name: { $regex: new RegExp(`^${req.user.club.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
    });
    if (!club) {
      return res.status(400).json({ success: false, error: 'Your club was not found in the system' });
    }

    // Check for existing registration
    const existing = await LeagueRegistration.findOne({ league: leagueId, club: club._id });
    if (existing) {
      return res.status(400).json({ success: false, error: `Your club has already ${existing.status === 'pending' ? 'applied' : 'been ' + existing.status} for this league` });
    }

    const registration = await LeagueRegistration.create({
      league: leagueId,
      club: club._id,
      registeredBy: req.user._id,
      notes: req.body.notes || ''
    });

    const populated = await LeagueRegistration.findById(registration._id)
      .populate('club', 'name city province')
      .populate('registeredBy', 'firstName lastName');

    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, error: 'Your club has already registered for this league' });
    }
    res.status(400).json({ success: false, error: error.message });
  }
};

// GET /api/leagues/:id/registrations
export const getLeagueRegistrations = async (req, res) => {
  try {
    const registrations = await LeagueRegistration.find({ league: req.params.id })
      .populate('club', 'name city province')
      .populate('registeredBy', 'firstName lastName email')
      .populate('reviewedBy', 'firstName lastName')
      .sort('-createdAt');

    res.json({ success: true, count: registrations.length, data: registrations });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// PUT /api/leagues/:id/registrations/:registrationId
export const reviewRegistration = async (req, res) => {
  try {
    const { status, rejectionReason } = req.body;
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Status must be approved or rejected' });
    }

    const registration = await LeagueRegistration.findOne({
      _id: req.params.registrationId,
      league: req.params.id
    });
    if (!registration) {
      return res.status(404).json({ success: false, error: 'Registration not found' });
    }

    registration.status = status;
    registration.reviewedBy = req.user._id;
    registration.reviewedAt = new Date();
    if (rejectionReason) registration.rejectionReason = rejectionReason;
    await registration.save();

    // If approved, add club to league teams
    if (status === 'approved') {
      await League.findByIdAndUpdate(req.params.id, {
        $addToSet: { teams: registration.club }
      });
    }

    const populated = await LeagueRegistration.findById(registration._id)
      .populate('club', 'name city province')
      .populate('registeredBy', 'firstName lastName email')
      .populate('reviewedBy', 'firstName lastName');

    res.json({ success: true, data: populated });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// ─── Playoffs ───────────────────────────────────────────────────

// POST /api/leagues/:id/playoffs/generate
export const generatePlayoffs = async (req, res) => {
  try {
    const league = await League.findById(req.params.id).populate('teams');
    if (!league) {
      return res.status(404).json({ success: false, error: 'League not found' });
    }

    // Check if playoff ties already exist
    const existingPlayoffs = await Tie.countDocuments({ league: req.params.id, roundName: /Semi|Final/ });
    if (existingPlayoffs > 0) {
      return res.status(400).json({ success: false, error: 'Playoff ties already exist. Delete them first to regenerate.' });
    }

    // Find the sibling league (opposite gender, same region, same year)
    const oppositeGender = league.gender === 'men' ? 'women' : 'men';
    const siblingLeague = await League.findOne({
      region: league.region === 'northern' ? 'southern' : 'northern',
      gender: league.gender,
      year: league.year,
      status: { $in: ['active', 'completed'] }
    }).populate('teams');

    if (!siblingLeague) {
      return res.status(400).json({
        success: false,
        error: `No ${league.region === 'northern' ? 'southern' : 'northern'} region ${league.gender} league found for ${league.year}`
      });
    }

    // Get standings for both regions
    const thisTies = await Tie.find({ league: req.params.id, status: 'completed' }).populate('homeTeam awayTeam');
    const siblingTies = await Tie.find({ league: siblingLeague._id, status: 'completed' }).populate('homeTeam awayTeam');

    const settings = league.settings || { pointsForWin: 3, pointsForDraw: 1, pointsForLoss: 0 };
    const thisStandings = calculateStandings(league.teams, thisTies, settings);
    const siblingStandings = calculateStandings(siblingLeague.teams, siblingTies, siblingLeague.settings || settings);

    if (thisStandings.length < 2) {
      return res.status(400).json({ success: false, error: `${league.region} region needs at least 2 teams with standings` });
    }
    if (siblingStandings.length < 2) {
      return res.status(400).json({ success: false, error: `${siblingLeague.region} region needs at least 2 teams with standings` });
    }

    // Determine teams: this region's 1st & 2nd, other region's 1st & 2nd
    const thisFirst = thisStandings[0].team;
    const thisSecond = thisStandings[1].team;
    const otherFirst = siblingStandings[0].team;
    const otherSecond = siblingStandings[1].team;

    // Get playoff dates from calendar
    const playoffDates = await CalendarEvent.find({
      type: 'league',
      startDate: { $gte: new Date() }
    }).sort('startDate').limit(2);

    const format = MATCH_FORMATS[league.settings.matchFormat] || MATCH_FORMATS['2s1d'];
    const emptyRubbers = format.map(f => ({
      rubberNumber: f.rubberNumber,
      type: f.type,
      sets: [],
      score: { homeSetsWon: 0, awaySetsWon: 0 },
      status: 'not_started'
    }));

    const semiDate = playoffDates[0]?.startDate || new Date();
    const finalDate = playoffDates[1]?.startDate || new Date(semiDate.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Determine which region is "this" vs "other" for naming
    const thisRegionLabel = league.region.charAt(0).toUpperCase() + league.region.slice(1);
    const otherRegionLabel = siblingLeague.region.charAt(0).toUpperCase() + siblingLeague.region.slice(1);

    // Semi-finals: Region1 1st vs Region2 2nd, Region2 1st vs Region1 2nd
    const playoffTies = [
      {
        league: req.params.id,
        round: 100,
        roundName: `Semi-Final 1`,
        homeTeam: thisFirst._id,
        awayTeam: otherSecond._id,
        scheduledDate: semiDate,
        venue: thisFirst.name || 'TBD',
        venueAddress: thisFirst.address || '',
        status: 'scheduled',
        rubbers: emptyRubbers.map(r => ({ ...r })),
        notes: `${thisRegionLabel} 1st vs ${otherRegionLabel} 2nd`,
        calendarEvent: playoffDates[0]?._id || undefined
      },
      {
        league: req.params.id,
        round: 100,
        roundName: `Semi-Final 2`,
        homeTeam: otherFirst._id,
        awayTeam: thisSecond._id,
        scheduledDate: semiDate,
        venue: otherFirst.name || 'TBD',
        venueAddress: otherFirst.address || '',
        status: 'scheduled',
        rubbers: emptyRubbers.map(r => ({ ...r })),
        notes: `${otherRegionLabel} 1st vs ${thisRegionLabel} 2nd`,
        calendarEvent: playoffDates[0]?._id || undefined
      },
      {
        league: req.params.id,
        round: 200,
        roundName: 'Final',
        homeTeam: thisFirst._id, // Placeholder — updated after semis
        awayTeam: otherFirst._id, // Placeholder — updated after semis
        scheduledDate: finalDate,
        venue: 'TBD',
        status: 'scheduled',
        rubbers: emptyRubbers.map(r => ({ ...r })),
        notes: 'Winner SF1 vs Winner SF2 — teams updated after semi-finals',
        calendarEvent: playoffDates[1]?._id || undefined
      }
    ];

    const saved = await Tie.insertMany(playoffTies);

    res.status(201).json({
      success: true,
      count: saved.length,
      data: saved,
      bracket: {
        semiFinal1: { home: `${thisRegionLabel} 1st: ${thisFirst.name}`, away: `${otherRegionLabel} 2nd: ${otherSecond.name}` },
        semiFinal2: { home: `${otherRegionLabel} 1st: ${otherFirst.name}`, away: `${thisRegionLabel} 2nd: ${thisSecond.name}` },
        final: 'Winner SF1 vs Winner SF2'
      }
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// GET /api/leagues/:id/playoffs
export const getPlayoffBracket = async (req, res) => {
  try {
    const playoffTies = await Tie.find({
      league: req.params.id,
      round: { $gte: 100 }
    })
      .populate('homeTeam awayTeam winner')
      .populate('rubbers.homePlayer rubbers.awayPlayer rubbers.homePlayers rubbers.awayPlayers')
      .sort('round roundName');

    res.json({ success: true, count: playoffTies.length, data: playoffTies });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
