import League from '../models/League.js';
import Tie from '../models/Tie.js';
import User from '../models/User.js';

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

    const startDate = req.body.startDate ? new Date(req.body.startDate) : league.startDate;
    const format = MATCH_FORMATS[league.settings.matchFormat] || MATCH_FORMATS['2s1d'];

    const tieData = generateRoundRobin(league.teams, league.settings.numberOfRounds, startDate, format);

    const saved = await Tie.insertMany(
      tieData.map(t => ({ ...t, league: req.params.id }))
    );

    res.status(201).json({ success: true, count: saved.length, data: saved });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

function generateRoundRobin(clubs, numberOfRounds, startDate, format, intervalDays = 7) {
  if (!clubs || clubs.length === 0) {
    throw new Error('No clubs provided for tie generation');
  }

  const n = clubs.length;
  const hasBye = n % 2 === 1;
  const total = hasBye ? n + 1 : n;
  const ties = [];

  // Create empty rubber slots from the match format
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

// ─── Player selection ───────────────────────────────────────────

// GET /api/leagues/:leagueId/ties/:tieId/available-players
export const getAvailablePlayers = async (req, res) => {
  try {
    const tie = await Tie.findOne({
      _id: req.params.tieId,
      league: req.params.leagueId
    });
    if (!tie) {
      return res.status(404).json({ success: false, error: 'Tie not found' });
    }

    const league = await League.findById(req.params.leagueId);

    // Filter players by club membership (home and away teams in this tie)
    const teamIds = [tie.homeTeam, tie.awayTeam];
    const filter = { club: { $in: teamIds } };

    // Filter by gender based on league
    if (league?.gender === 'men') filter.gender = 'male';
    else if (league?.gender === 'women') filter.gender = 'female';

    const players = await User.find(filter)
      .select('firstName lastName email gender zpin club')
      .populate('club', 'name');

    res.json({ success: true, count: players.length, data: players });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// PUT /api/leagues/:leagueId/ties/:tieId/players
export const updateTiePlayers = async (req, res) => {
  try {
    const { rubbers } = req.body;

    const tie = await Tie.findOne({ _id: req.params.tieId, league: req.params.leagueId });
    if (!tie) {
      return res.status(404).json({ success: false, error: 'Tie not found' });
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

    const tie = await Tie.findOne({ _id: req.params.tieId, league: req.params.leagueId });
    if (!tie) {
      return res.status(404).json({ success: false, error: 'Tie not found' });
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
