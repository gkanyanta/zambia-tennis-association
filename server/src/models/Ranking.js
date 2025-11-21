import mongoose from 'mongoose';

// Tournament result schema - tracks points from individual tournaments
const tournamentResultSchema = new mongoose.Schema({
  tournamentName: {
    type: String,
    required: true
  },
  tournamentDate: {
    type: Date,
    required: true
  },
  points: {
    type: Number,
    default: 0
  },
  position: String, // e.g., "Winner", "Runner-up", "Semi-finalist"
  year: Number
});

// Main ranking schema
const rankingSchema = new mongoose.Schema({
  // Player information
  playerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  playerName: {
    type: String,
    required: true
  },
  playerZpin: String,
  club: String,

  // Category information
  category: {
    type: String,
    required: true,
    enum: [
      'men_senior', 'women_senior',
      'boys_10u', 'boys_12u', 'boys_14u', 'boys_16u', 'boys_18u',
      'girls_10u', 'girls_12u', 'girls_14u', 'girls_16u', 'girls_18u',
      'men_doubles', 'women_doubles', 'mixed_doubles'
    ]
  },

  // Ranking information
  rank: {
    type: Number,
    required: true
  },
  previousRank: Number,

  // Points breakdown
  tournamentResults: [tournamentResultSchema],
  totalPoints: {
    type: Number,
    default: 0
  },

  // Metadata
  rankingPeriod: {
    type: String, // e.g., "2025", "2024-2025"
    required: true
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
rankingSchema.index({ category: 1, rank: 1 });
rankingSchema.index({ playerId: 1, category: 1 });
rankingSchema.index({ playerName: 1 });
rankingSchema.index({ rankingPeriod: 1, category: 1 });

// Method to calculate total points
rankingSchema.methods.calculateTotalPoints = function() {
  this.totalPoints = this.tournamentResults.reduce((sum, result) => sum + result.points, 0);
  return this.totalPoints;
};

// Static method to update rankings for a category
rankingSchema.statics.updateRankings = async function(category, rankingPeriod) {
  const rankings = await this.find({ category, rankingPeriod, isActive: true })
    .sort({ totalPoints: -1, playerName: 1 });

  for (let i = 0; i < rankings.length; i++) {
    rankings[i].previousRank = rankings[i].rank;
    rankings[i].rank = i + 1;
    await rankings[i].save();
  }

  return rankings;
};

export default mongoose.model('Ranking', rankingSchema);
