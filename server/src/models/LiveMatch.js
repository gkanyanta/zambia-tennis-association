import mongoose from 'mongoose';

const liveMatchSchema = new mongoose.Schema({
  tournamentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tournament',
    required: true
  },
  categoryId: {
    type: String,
    required: true
  },
  matchId: {
    type: String,
    required: true
  },
  player1: {
    id: { type: String, required: true },
    name: { type: String, required: true },
    seed: Number
  },
  player2: {
    id: { type: String, required: true },
    name: { type: String, required: true },
    seed: Number
  },
  matchState: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  settings: {
    bestOf: { type: Number, default: 3 },
    tiebreakAt: { type: Number, default: 6 },
    finalSetTiebreak: { type: Boolean, default: true },
    finalSetTiebreakTo: { type: Number, default: 10 },
    noAd: { type: Boolean, default: false }
  },
  court: String,
  umpireId: String,
  umpireName: String,
  tournamentName: {
    type: String,
    required: true
  },
  categoryName: {
    type: String,
    required: true
  },
  roundName: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['warmup', 'live', 'suspended', 'completed'],
    default: 'warmup'
  },
  startedAt: Date,
  completedAt: Date
}, {
  timestamps: true
});

liveMatchSchema.index({ status: 1 });
liveMatchSchema.index({ tournamentId: 1, status: 1 });

const LiveMatch = mongoose.model('LiveMatch', liveMatchSchema);

export default LiveMatch;
