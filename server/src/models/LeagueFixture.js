import mongoose from 'mongoose';

const matchResultSchema = new mongoose.Schema({
  matchType: {
    type: String,
    enum: ['singles1', 'singles2', 'singles3', 'doubles', 'doubles2'],
    required: true
  },
  homeScore: {
    type: Number,
    required: true,
    min: 0,
    max: 3
  },
  awayScore: {
    type: Number,
    required: true,
    min: 0,
    max: 3
  },
  homePlayer: String,
  awayPlayer: String,
  homePlayers: [String], // For doubles
  awayPlayers: [String], // For doubles
  detailedScore: String, // e.g., "6-4, 3-6, 7-5"
  duration: Number, // in minutes
  completedAt: Date
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
    ref: 'LeagueTeam',
    required: true
  },
  awayTeam: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LeagueTeam',
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
    ref: 'LeagueTeam'
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
    ref: 'LeagueTeam'
  },
  walkoverReason: String
}, {
  timestamps: true
});

// Calculate overall score before saving
leagueFixtureSchema.pre('save', function(next) {
  if (this.matches && this.matches.length > 0) {
    let homeWins = 0;
    let awayWins = 0;

    this.matches.forEach(match => {
      if (match.homeScore > match.awayScore) {
        homeWins++;
      } else if (match.awayScore > match.homeScore) {
        awayWins++;
      }
    });

    this.overallScore.homeWins = homeWins;
    this.overallScore.awayWins = awayWins;

    // Determine winner
    if (homeWins > awayWins) {
      this.winner = this.homeTeam;
      this.isDraw = false;
    } else if (awayWins > homeWins) {
      this.winner = this.awayTeam;
      this.isDraw = false;
    } else if (homeWins === awayWins && this.status === 'completed') {
      this.isDraw = true;
      this.winner = null;
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
