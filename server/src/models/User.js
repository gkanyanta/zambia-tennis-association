import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true
  },
  email: {
    type: String,
    required: function() {
      // Email required if no phone provided
      return !this.phone;
    },
    unique: true,
    sparse: true,  // Allow multiple null values
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    minlength: 6,
    select: false
  },
  phone: {
    type: String,
    required: function() {
      // Phone required if no email provided or email is placeholder
      return !this.email || (this.email && this.email.includes('@noemail.zambiatennis.local'));
    }
  },
  club: {
    type: String,
    required: false
  },
  gender: {
    type: String,
    enum: ['male', 'female'],
    required: false
  },
  dateOfBirth: {
    type: Date,
    required: function() {
      return this.role === 'player';
    }
  },
  parentGuardianName: {
    type: String,
    required: function() {
      // Required for juniors under 18
      if (this.dateOfBirth) {
        const age = Math.floor((new Date() - new Date(this.dateOfBirth)) / (365.25 * 24 * 60 * 60 * 1000));
        return age < 18;
      }
      return this.membershipType === 'junior';
    },
    trim: true
  },
  parentGuardianPhone: {
    type: String,
    required: function() {
      // Required for juniors
      if (this.dateOfBirth) {
        const age = Math.floor((new Date() - new Date(this.dateOfBirth)) / (365.25 * 24 * 60 * 60 * 1000));
        return age < 18;
      }
      return this.membershipType === 'junior';
    }
  },
  parentGuardianEmail: {
    type: String,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid guardian email'],
    required: false
  },
  role: {
    type: String,
    enum: ['player', 'club_official', 'admin', 'staff', 'coach'],
    default: 'player'
  },
  zpin: {
    type: String,
    unique: true,
    sparse: true
  },
  membershipType: {
    type: String,
    enum: ['junior', 'adult', 'family', null],
    default: null
  },
  membershipStatus: {
    type: String,
    enum: ['active', 'inactive', 'expired', 'pending', null],
    default: 'inactive'
  },
  membershipExpiry: {
    type: Date
  },
  isInternational: {
    type: Boolean,
    default: false
  },
  lastPaymentDate: {
    type: Date
  },
  lastPaymentAmount: {
    type: Number,
    min: 0
  },
  lastPaymentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Payment'
  },
  outstandingBalance: {
    type: Number,
    default: 0,
    min: 0
  },
  arrears: [{
    year: Number,
    amount: Number,
    membershipType: String,
    addedOn: {
      type: Date,
      default: Date.now
    }
  }],
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  avatar: {
    type: String
  },
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password') || !this.password) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Auto-generate email for players without contact info
userSchema.pre('save', async function(next) {
  // If no email provided but phone exists, generate placeholder email
  if (!this.email && this.phone && this.zpin) {
    this.email = `${this.zpin}@noemail.zambiatennis.local`;
  }
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

export default mongoose.model('User', userSchema);
