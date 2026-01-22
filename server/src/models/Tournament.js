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
  }
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

// Draw schema
const drawSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['single_elimination', 'round_robin', 'feed_in'],
    required: true
  },
  matches: [matchSchema],
  roundRobinGroups: [roundRobinGroupSchema],
  bracketSize: Number,
  numberOfRounds: Number,
  generatedAt: {
    type: Date,
    default: Date.now
  }
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
    enum: ['single_elimination', 'round_robin', 'feed_in'],
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
  }
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
  }
}, {
  timestamps: true
});

export default mongoose.model('Tournament', tournamentSchema);
