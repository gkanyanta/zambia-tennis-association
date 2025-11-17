import mongoose from 'mongoose';

// Entry schema for individual player entries
const entrySchema = new mongoose.Schema({
  playerId: {
    type: String,
    required: true
  },
  playerName: {
    type: String,
    required: true
  },
  playerZpin: {
    type: String,
    required: true
  },
  dateOfBirth: {
    type: Date,
    required: true
  },
  age: {
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
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected', 'withdrawn'],
    default: 'pending'
  },
  rejectionReason: String,
  entryDate: {
    type: Date,
    default: Date.now
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
    enum: ['U10', 'U12', 'U14', 'U16', 'U18', 'Open']
  },
  minAge: Number,
  maxAge: Number,
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
  specialRules: [String]
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
  prizes: String
}, {
  timestamps: true
});

export default mongoose.model('Tournament', tournamentSchema);
