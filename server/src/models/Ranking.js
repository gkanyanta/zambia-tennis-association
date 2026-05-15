import mongoose from 'mongoose';

const tournamentResultSchema = new mongoose.Schema({
  tournamentName: { type: String, required: true },
  tournamentDate: { type: Date, required: true },
  points: { type: Number, required: true },
  position: { type: String },
  upsetBonus: { type: Number, default: 0 }, // +3 per seeded/ranked upset caused
  year: { type: Number, required: true }
}, { _id: true });

const rankingSchema = new mongoose.Schema({
  playerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  playerName: {
    type: String,
    required: true
  },
  playerZpin: {
    type: String
  },
  club: {
    type: String,
    default: ''
  },
  category: {
    type: String,
    required: true,
    enum: [
      'men_senior',
      'women_senior',
      'boys_10u',
      'boys_12u',
      'boys_14u',
      'boys_16u',
      'boys_18u',
      'girls_10u',
      'girls_12u',
      'girls_14u',
      'girls_16u',
      'girls_18u',
      'men_doubles',
      'women_doubles',
      'mixed_doubles',
      'madalas_overall',
      'madalas_ladies'
    ]
  },
  rank: {
    type: Number,
    required: true
  },
  previousRank: {
    type: Number
  },
  tournamentResults: [tournamentResultSchema],
  totalPoints: {
    type: Number,
    required: true,
    default: 0
  },
  rankingPeriod: {
    type: String,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
rankingSchema.index({ category: 1, rankingPeriod: 1, rank: 1 });
rankingSchema.index({ playerId: 1, category: 1 });
rankingSchema.index({ playerName: 1 });
rankingSchema.index({ isActive: 1 });
rankingSchema.index({ playerZpin: 1, category: 1, rankingPeriod: 1 });

// Compound index for common queries
rankingSchema.index({ category: 1, rankingPeriod: 1, isActive: 1 });

rankingSchema.methods.calculateTotalPoints = function () {
  this.totalPoints = this.tournamentResults.reduce((sum, r) => sum + (r.points || 0) + (r.upsetBonus || 0), 0);
};

rankingSchema.statics.updateRankings = async function (category, rankingPeriod) {
  const all = await this.find({ category, rankingPeriod, isActive: true }).sort({ totalPoints: -1 });
  // ITF standard: players with equal points share the same rank;
  // the next rank skips over the tied positions (1224 ranking).
  let rank = 1;
  for (let i = 0; i < all.length; i++) {
    if (i > 0 && all[i].totalPoints !== all[i - 1].totalPoints) {
      rank = i + 1;
    }
    all[i].previousRank = all[i].rank;
    all[i].rank = rank;
    await all[i].save();
  }
  return all;
};

export default mongoose.models.Ranking || mongoose.model('Ranking', rankingSchema);
