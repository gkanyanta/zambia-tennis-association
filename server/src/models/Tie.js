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
    played: { type: Boolean, default: false },
    homePoints: { type: Number, min: 0 },
    awayPoints: { type: Number, min: 0 }
  },
  isMatchTiebreak: {
    type: Boolean,
    default: false
  }
}, { _id: false });

// Rubber schema (individual singles/doubles contest within a tie)
const rubberSchema = new mongoose.Schema({
  rubberNumber: {
    type: Number,
    required: true
  },
  type: {
    type: String,
    enum: ['singles1', 'singles2', 'singles3', 'singles4', 'doubles1', 'doubles2'],
    required: true
  },
  homePlayer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  awayPlayer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  homePlayers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  awayPlayers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  sets: [setSchema],
  score: {
    homeSetsWon: { type: Number, default: 0, min: 0 },
    awaySetsWon: { type: Number, default: 0, min: 0 }
  },
  winner: {
    type: String,
    enum: ['home', 'away', null],
    default: null
  },
  status: {
    type: String,
    enum: ['not_started', 'in_progress', 'completed', 'retired', 'walkover', 'defaulted'],
    default: 'not_started'
  },
  duration: Number,
  completedAt: Date,
  retirementReason: String,
  walkoverTeam: String,
  defaultReason: String
}, { _id: false });

const tieSchema = new mongoose.Schema({
  league: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'League',
    required: true
  },
  round: {
    type: Number,
    required: true
  },
  roundName: String,
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
  rubbers: [rubberSchema],
  score: {
    home: { type: Number, default: 0 },
    away: { type: Number, default: 0 }
  },
  // Aggregated stats for ITF standings tiebreakers
  stats: {
    home: {
      rubbersWon: { type: Number, default: 0 },
      setsWon: { type: Number, default: 0 },
      gamesWon: { type: Number, default: 0 }
    },
    away: {
      rubbersWon: { type: Number, default: 0 },
      setsWon: { type: Number, default: 0 },
      gamesWon: { type: Number, default: 0 }
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
  completedAt: Date,
  postponementReason: String,
  walkoverTeam: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Club'
  },
  walkoverReason: String,
  calendarEvent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CalendarEvent'
  }
}, {
  timestamps: true
});

// Helper: calculate rubber winner from sets
const calculateRubberWinner = (rubber) => {
  if (!rubber.sets || rubber.sets.length === 0) {
    return { homeSetsWon: 0, awaySetsWon: 0, winner: null };
  }

  let homeSetsWon = 0;
  let awaySetsWon = 0;

  rubber.sets.forEach(set => {
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

// Pre-save: calculate all scores from sets upward
tieSchema.pre('save', function(next) {
  if (!this.rubbers || this.rubbers.length === 0) {
    return next();
  }

  let homeRubbersWon = 0;
  let awayRubbersWon = 0;
  let homeSetsWon = 0;
  let awaySetsWon = 0;
  let homeGamesWon = 0;
  let awayGamesWon = 0;

  this.rubbers.forEach(rubber => {
    // Handle walkovers: scored as 6-0 6-0 for stats
    if (rubber.status === 'walkover' || rubber.status === 'defaulted') {
      if (rubber.winner === 'home') {
        homeRubbersWon++;
        homeSetsWon += 2;
        homeGamesWon += 12;
      } else if (rubber.winner === 'away') {
        awayRubbersWon++;
        awaySetsWon += 2;
        awayGamesWon += 12;
      }
      return;
    }

    if (rubber.sets && rubber.sets.length > 0) {
      const result = calculateRubberWinner(rubber);
      rubber.score.homeSetsWon = result.homeSetsWon;
      rubber.score.awaySetsWon = result.awaySetsWon;
      rubber.winner = result.winner;

      homeSetsWon += result.homeSetsWon;
      awaySetsWon += result.awaySetsWon;

      // Count games from each set
      rubber.sets.forEach(set => {
        homeGamesWon += set.homeGames;
        awayGamesWon += set.awayGames;
      });

      if (result.winner === 'home') homeRubbersWon++;
      else if (result.winner === 'away') awayRubbersWon++;
    }
  });

  // Set tie score
  this.score.home = homeRubbersWon;
  this.score.away = awayRubbersWon;

  // Set aggregated stats for standings tiebreakers
  this.stats.home = { rubbersWon: homeRubbersWon, setsWon: homeSetsWon, gamesWon: homeGamesWon };
  this.stats.away = { rubbersWon: awayRubbersWon, setsWon: awaySetsWon, gamesWon: awayGamesWon };

  // Determine tie winner (only if completed)
  if (this.status === 'completed') {
    if (homeRubbersWon > awayRubbersWon) {
      this.winner = this.homeTeam;
      this.isDraw = false;
    } else if (awayRubbersWon > homeRubbersWon) {
      this.winner = this.awayTeam;
      this.isDraw = false;
    } else if (homeRubbersWon === awayRubbersWon && (homeRubbersWon + awayRubbersWon) > 0) {
      this.isDraw = true;
      this.winner = null;
    }
  } else {
    this.winner = null;
    this.isDraw = false;
  }

  next();
});

// Indexes
tieSchema.index({ league: 1, round: 1 });
tieSchema.index({ league: 1, status: 1 });
tieSchema.index({ homeTeam: 1, awayTeam: 1 });
tieSchema.index({ scheduledDate: 1 });
tieSchema.index({ calendarEvent: 1 });

export default mongoose.model('Tie', tieSchema);
