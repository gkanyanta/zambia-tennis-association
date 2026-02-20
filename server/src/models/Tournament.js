import mongoose from 'mongoose';

// Entry schema for individual player entries
const entrySchema = new mongoose.Schema({
  playerId: {
    type: String,
    required: false // Optional for new players without ZPIN
  },
  playerName: {
    type: String,
    required: true
  },
  playerZpin: {
    type: String,
    required: false // Optional for new players, will be 'PENDING'
  },
  dateOfBirth: {
    type: Date,
    required: true
  },
  age: {
    type: Number,
    required: true
  },
  ageOnDec31: {
    type: Number,
    required: true
  },
  gender: {
    type: String,
    enum: ['male', 'female'],
    required: true
  },
  clubName: {
    type: String,
    required: true
  },
  ranking: Number,
  seed: Number,
  eligibilityCheck: {
    eligible: {
      type: Boolean,
      required: true
    },
    reason: String,
    suggestedCategory: String,
    warnings: [String]
  },
  status: {
    type: String,
    enum: ['pending_payment', 'pending', 'accepted', 'rejected', 'withdrawn'],
    default: 'pending_payment'
  },
  paymentStatus: {
    type: String,
    enum: ['unpaid', 'paid', 'waived'],
    default: 'unpaid'
  },
  paymentReference: String,
  paymentDate: Date,
  paymentMethod: {
    type: String,
    enum: ['online', 'manual', 'waived']
  },
  rejectionReason: String,
  entryDate: {
    type: Date,
    default: Date.now
  },
  // Payer information for public registrations
  payer: {
    name: String,
    email: String,
    phone: String,
    relationship: String
  },
  // Contact info for new players (without ZPIN)
  newPlayerContact: {
    phone: String,
    email: String
  },
  // Per-entry fee (may include surcharge for non-ZPIN players)
  entryFee: { type: Number },
  // Whether player had a paid-up ZPIN at time of entry
  zpinPaidUp: { type: Boolean, default: false },
  // Whether the 50% surcharge for non-ZPIN players was waived by admin
  surchargeWaived: { type: Boolean, default: false }
});

// Match schema
const matchSchema = new mongoose.Schema({
  matchNumber: Number,
  round: Number,
  roundName: String,
  player1: {
    id: String,
    name: String,
    seed: Number,
    isBye: Boolean
  },
  player2: {
    id: String,
    name: String,
    seed: Number,
    isBye: Boolean
  },
  winner: String,
  score: String,
  status: {
    type: String,
    enum: ['scheduled', 'in_progress', 'completed', 'walkover'],
    default: 'scheduled'
  },
  court: String,
  scheduledTime: Date,
  completedTime: Date
});

// Round robin group schema
const roundRobinGroupSchema = new mongoose.Schema({
  groupName: String,
  players: [{
    id: String,
    name: String,
    seed: Number
  }],
  matches: [matchSchema],
  standings: [{
    playerId: String,
    playerName: String,
    played: Number,
    won: Number,
    lost: Number,
    setsWon: Number,
    setsLost: Number,
    gamesWon: Number,
    gamesLost: Number,
    points: Number
  }]
});

// Mixer court schema (for madalas social doubles)
const mixerCourtSchema = new mongoose.Schema({
  courtNumber: Number,
  pair1A: { playerId: String, playerName: String },
  pair1B: { playerId: String, playerName: String },
  pair2A: { playerId: String, playerName: String },
  pair2B: { playerId: String, playerName: String },
  pair1GamesWon: { type: Number, min: 0, max: 4, default: null },
  pair2GamesWon: { type: Number, min: 0, max: 4, default: null },
  status: { type: String, enum: ['scheduled', 'completed'], default: 'scheduled' }
});

const mixerRoundSchema = new mongoose.Schema({
  roundNumber: Number,
  courts: [mixerCourtSchema]
});

const mixerStandingSchema = new mongoose.Schema({
  playerId: String,
  playerName: String,
  gender: { type: String, enum: ['male', 'female'] },
  rating: { type: String, enum: ['A', 'B'] },
  roundsPlayed: { type: Number, default: 0 },
  totalGamesWon: { type: Number, default: 0 },
  totalGamesLost: { type: Number, default: 0 }
});

// Draw schema
const drawSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['single_elimination', 'round_robin', 'feed_in', 'mixer'],
    required: true
  },
  matches: [matchSchema],
  roundRobinGroups: [roundRobinGroupSchema],
  bracketSize: Number,
  numberOfRounds: Number,
  generatedAt: {
    type: Date,
    default: Date.now
  },
  finalized: {
    type: Boolean,
    default: false
  },
  finalizedAt: Date,
  standings: {
    type: mongoose.Schema.Types.Mixed
  },
  mixerRounds: [mixerRoundSchema],
  mixerStandings: [mixerStandingSchema]
});

// Tournament category schema
const categorySchema = new mongoose.Schema({
  categoryCode: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['junior', 'senior', 'madalas'],
    required: true
  },
  gender: {
    type: String,
    enum: ['boys', 'girls', 'mens', 'womens', 'mixed'],
    required: true
  },
  ageGroup: {
    type: String,
    enum: ['U10', 'U12', 'U14', 'U16', 'U18', 'Open', '35+', '45+', '55+', '65+']
  },
  minAge: Number,
  maxAge: Number,
  ageCalculationDate: {
    type: Date,
    required: function() {
      return this.type === 'junior';
    }
  },
  drawType: {
    type: String,
    enum: ['single_elimination', 'round_robin', 'feed_in', 'mixer'],
    required: true
  },
  maxEntries: {
    type: Number,
    default: 32
  },
  entries: [entrySchema],
  draw: drawSchema,
  specialRules: [String],
  entryCount: {
    type: Number,
    default: 0
  },
  mixerRatings: [{
    playerId: String,
    playerName: String,
    gender: String,
    rating: { type: String, enum: ['A', 'B'] }
  }]
});

// Budget line schema for pre-tournament budget planning
const budgetLineSchema = new mongoose.Schema({
  category: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['income', 'expense'],
    required: true
  },
  description: {
    type: String,
    required: true
  },
  budgetedAmount: {
    type: Number,
    required: true
  },
  notes: String
});

// Expense record schema for tracking actual expenses
const expenseRecordSchema = new mongoose.Schema({
  category: {
    type: String,
    enum: ['venue', 'balls', 'trophies', 'umpires', 'transport', 'meals', 'accommodation', 'printing', 'medical', 'equipment', 'marketing', 'administration', 'other_expense'],
    required: true
  },
  description: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  date: {
    type: Date,
    default: Date.now
  },
  paidTo: String,
  paymentMethod: {
    type: String,
    enum: ['cash', 'bank_transfer', 'mobile_money', 'cheque', 'other']
  },
  receiptReference: String,
  recordedBy: String,
  notes: String
});

// Manual income record schema for non-entry-fee income
const manualIncomeSchema = new mongoose.Schema({
  category: {
    type: String,
    enum: ['entry_fees', 'sponsorship', 'food_sales', 'merchandise', 'other_income'],
    required: true
  },
  description: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  date: {
    type: Date,
    default: Date.now
  },
  receivedFrom: String,
  paymentMethod: {
    type: String,
    enum: ['cash', 'bank_transfer', 'mobile_money', 'cheque', 'other']
  },
  receiptReference: String,
  recordedBy: String,
  notes: String
});

const tournamentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  venue: {
    type: String,
    required: true
  },
  city: {
    type: String,
    required: true
  },
  province: {
    type: String,
    required: true
  },
  entryDeadline: {
    type: Date,
    required: true
  },
  entryFee: {
    type: Number,
    default: 0
  },
  categories: [categorySchema],
  status: {
    type: String,
    enum: ['upcoming', 'entries_open', 'entries_closed', 'in_progress', 'completed'],
    default: 'upcoming'
  },
  organizer: {
    type: String,
    required: true
  },
  contactEmail: {
    type: String,
    required: true
  },
  contactPhone: {
    type: String,
    required: true
  },
  maxParticipants: Number,
  rules: String,
  prizes: String,
  // Registration settings
  tournamentLevel: {
    type: String,
    enum: ['club', 'regional', 'national', 'international'],
    default: 'regional'
  },
  allowPublicRegistration: {
    type: Boolean,
    default: true
  },
  allowMultipleCategories: {
    type: Boolean,
    default: false
  },
  requirePaymentUpfront: {
    type: Boolean,
    default: false
  },
  // Finance module
  budget: [budgetLineSchema],
  expenses: [expenseRecordSchema],
  manualIncome: [manualIncomeSchema]
}, {
  timestamps: true
});

export default mongoose.model('Tournament', tournamentSchema);
