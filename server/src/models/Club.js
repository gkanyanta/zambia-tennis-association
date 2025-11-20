import mongoose from 'mongoose';

const clubSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Club name is required'],
    trim: true,
    unique: true
  },
  city: {
    type: String,
    trim: true
  },
  province: {
    type: String,
    trim: true
  },
  contactPerson: {
    type: String,
    trim: true
  },
  email: {
    type: String,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email']
  },
  phone: {
    type: String,
    trim: true
  },
  address: {
    type: String,
    trim: true
  },
  established: {
    type: Number
  },
  description: {
    type: String
  },
  logo: {
    type: String
  },
  facilities: [String],
  website: {
    type: String
  },
  memberCount: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  },
  affiliationFee: {
    type: Number,
    default: 0,
    min: 0
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
  affiliationExpiry: {
    type: Date
  },
  outstandingBalance: {
    type: Number,
    default: 0,
    min: 0
  },
  arrears: [{
    year: Number,
    amount: Number,
    addedOn: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

export default mongoose.model('Club', clubSchema);
