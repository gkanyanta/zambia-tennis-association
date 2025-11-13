import mongoose from 'mongoose';

const rankingSchema = new mongoose.Schema({
  rank: {
    type: Number,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  club: {
    type: String,
    required: true
  },
  points: {
    type: Number,
    required: true,
    default: 0
  },
  category: {
    type: String,
    enum: ['mens-singles', 'womens-singles', 'juniors-boys', 'juniors-girls'],
    required: true
  },
  ageGroup: {
    type: String,
    enum: ['U10', 'U12', 'U14', 'U16', 'U18', 'Open', null],
    default: null
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Compound index for efficient querying
rankingSchema.index({ category: 1, rank: 1 });

export default mongoose.model('Ranking', rankingSchema);
