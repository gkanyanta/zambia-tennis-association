import mongoose from 'mongoose';

const leagueSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  season: {
    type: String,
    required: true
  },
  year: {
    type: Number,
    required: true
  },
  region: {
    type: String,
    enum: ['northern', 'southern'],
    required: true
  },
  gender: {
    type: String,
    enum: ['men', 'women'],
    required: true
  },
  description: String,
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['upcoming', 'active', 'completed', 'cancelled'],
    default: 'upcoming'
  },
  teams: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Club'
  }],
  settings: {
    pointsForWin: {
      type: Number,
      default: 3
    },
    pointsForDraw: {
      type: Number,
      default: 1
    },
    pointsForLoss: {
      type: Number,
      default: 0
    },
    matchFormat: {
      type: String,
      enum: ['2s1d', '3s2d', '4s1d'],
      default: '2s1d'
    },
    numberOfRounds: {
      type: Number,
      default: 1
    },
    bestOfSets: {
      type: Number,
      enum: [3, 5],
      default: 3
    },
    matchTiebreak: {
      type: Boolean,
      default: true
    },
    noAdScoring: {
      type: Boolean,
      default: false
    }
  },
  organizer: {
    type: String,
    default: 'Zambia Tennis Association'
  },
  contactEmail: String,
  contactPhone: String
}, {
  timestamps: true
});

// Index for faster queries
leagueSchema.index({ season: 1, year: 1, region: 1, gender: 1 });
leagueSchema.index({ status: 1 });

export default mongoose.model('League', leagueSchema);
