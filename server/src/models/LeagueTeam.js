import mongoose from 'mongoose';

const leagueTeamSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  shortName: {
    type: String,
    required: true
  },
  region: {
    type: String,
    enum: ['northern', 'southern'],
    required: true
  },
  city: {
    type: String,
    required: true
  },
  province: String,
  homeVenue: {
    name: {
      type: String,
      required: true
    },
    address: String,
    numberOfCourts: Number,
    courtSurface: {
      type: String,
      enum: ['hard', 'clay', 'grass', 'carpet']
    }
  },
  clubAffiliation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Club'
  },
  captain: {
    name: String,
    email: String,
    phone: String
  },
  coach: {
    name: String,
    email: String,
    phone: String
  },
  roster: [{
    playerId: {
      type: String,
      required: true
    },
    playerName: {
      type: String,
      required: true
    },
    gender: {
      type: String,
      enum: ['male', 'female']
    },
    ranking: Number,
    position: {
      type: String,
      enum: ['singles1', 'singles2', 'doubles', 'reserve']
    },
    addedDate: {
      type: Date,
      default: Date.now
    }
  }],
  contactEmail: String,
  contactPhone: String,
  logo: String,
  colors: {
    primary: String,
    secondary: String
  },
  founded: Date,
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for faster queries
leagueTeamSchema.index({ region: 1, city: 1 });
leagueTeamSchema.index({ isActive: 1 });

export default mongoose.model('LeagueTeam', leagueTeamSchema);
