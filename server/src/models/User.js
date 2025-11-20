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
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: 6,
    select: false
  },
  phone: {
    type: String,
    required: false
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
  role: {
    type: String,
    enum: ['player', 'club_official', 'admin', 'staff'],
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
    enum: ['active', 'expired', 'pending', null],
    default: null
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
  if (!this.isModified('password')) {
    next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare password method
userSchema.methods.comparePassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

export default mongoose.model('User', userSchema);
