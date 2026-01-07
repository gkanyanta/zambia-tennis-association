import mongoose from 'mongoose';

// Set schema for tracking individual set scores
const setSchema = new mongoose.Schema({
  setNumber: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  homeGames: {
    type: Number,
    required: true,
    min: 0,
    max: 7
  },
  awayGames: {
    type: Number,
    required: true,
    min: 0,
    max: 7
  },
  tiebreak: {
    played: {
      type: Boolean,
      default: false
    },
    homePoints: {
      type: Number,
      min: 0
    },
    awayPoints: {
      type: Number,
      min: 0
    }
  }
}, { _id: false });

// Match result schema with set-by-set scoring
const matchResultSchema = new mongoose.Schema({
  matchType: {
    type: String,
    enum: ['singles1', 'singles2', 'singles3', 'doubles', 'doubles2'],
    required: true
  },
  // Player references for singles
  homePlayer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  awayPlayer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  // Player references for doubles
  homePlayers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  awayPlayers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  // Set-by-set scoring
  sets: [setSchema],
  // Match result summary
  homeSetsWon: {
    type: Number,
    default: 0,
    min: 0,
    max: 3
  },
  awaySetsWon: {
    type: Number,
    default: 0,
    min: 0,
    max: 3
  },
  winner: {
    type: String,
    enum: ['home', 'away', null],
    default: null
  },
  status: {
    type: String,
    enum: ['not_started', 'in_progress', 'completed', 'retired', 'walkover'],
    default: 'not_started'
  },
  duration: Number, // in minutes
  completedAt: Date,
  retirementReason: String,
  walkoverTeam: String // 'home' or 'away'
}, { _id: false });

const leagueFixtureSchema = new mongoose.Schema({
  league: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'League',
    required: true
  },
  round: {
    type: Number,
    required: true
  },
  roundName: String, // e.g., "Round 1", "Round 2"
  homeTeam: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Club',
    required: true
  },
  awayTeam: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Club',
    required: true
  },
  scheduledDate: {
    type: Date,
    required: true
  },
  scheduledTime: String,
  venue: {
    type: String,
    required: true
  },
  venueAddress: String,
  status: {
    type: String,
    enum: ['scheduled', 'in_progress', 'completed', 'cancelled', 'postponed', 'walkover'],
    default: 'scheduled'
  },
  matches: [matchResultSchema],
  overallScore: {
    homeWins: {
      type: Number,
      default: 0
    },
    awayWins: {
      type: Number,
      default: 0
    }
  },
  winner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Club'
  },
  isDraw: {
    type: Boolean,
    default: false
  },
  notes: String,
  referee: String,
  weather: String,
  completedAt: Date,
  postponementReason: String,
  walkoverTeam: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Club'
  },
  walkoverReason: String
}, {
  timestamps: true
});

// Helper function to calculate match winner from sets
const calculateMatchWinner = (match) => {
  if (!match.sets || match.sets.length === 0) {
    return { homeSetsWon: 0, awaySetsWon: 0, winner: null };
  }

  let homeSetsWon = 0;
  let awaySetsWon = 0;

  match.sets.forEach(set => {
    if (set.homeGames > set.awayGames) {
      homeSetsWon++;
    } else if (set.awayGames > set.homeGames) {
      awaySetsWon++;
    }
  });

  const winner = homeSetsWon > awaySetsWon ? 'home' :
                 awaySetsWon > homeSetsWon ? 'away' : null;

  return { homeSetsWon, awaySetsWon, winner };
};

// Calculate overall score before saving
leagueFixtureSchema.pre('save', function(next) {
  if (this.matches && this.matches.length > 0) {
    let homeWins = 0;
    let awayWins = 0;

    // Calculate each match result from sets
    this.matches.forEach(match => {
      if (match.sets && match.sets.length > 0) {
        const result = calculateMatchWinner(match);
        match.homeSetsWon = result.homeSetsWon;
        match.awaySetsWon = result.awaySetsWon;
        match.winner = result.winner;

        if (result.winner === 'home') {
          homeWins++;
        } else if (result.winner === 'away') {
          awayWins++;
        }
      }
    });

    this.overallScore.homeWins = homeWins;
    this.overallScore.awayWins = awayWins;

    // Determine fixture winner
    if (homeWins > awayWins) {
      this.winner = this.homeTeam;
      this.isDraw = false;
    } else if (awayWins > homeWins) {
      this.winner = this.awayTeam;
      this.isDraw = false;
    } else if (homeWins === awayWins) {
      // Equal wins = draw (regardless of completion status)
      this.isDraw = true;
      this.winner = null;
    }

    // Clear winner if fixture not completed
    if (this.status !== 'completed') {
      this.winner = null;
      this.isDraw = false;
    }
  }
  next();
});

// Index for faster queries
leagueFixtureSchema.index({ league: 1, round: 1 });
leagueFixtureSchema.index({ league: 1, status: 1 });
leagueFixtureSchema.index({ homeTeam: 1, awayTeam: 1 });
leagueFixtureSchema.index({ scheduledDate: 1 });

export default mongoose.model('LeagueFixture', leagueFixtureSchema);
