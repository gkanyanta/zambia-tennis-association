import mongoose from 'mongoose';

const coachListingSchema = new mongoose.Schema({
  // Coach reference
  coach: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Coach',
    required: [true, 'Coach reference is required']
  },

  // Payment Details
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0, 'Amount must be positive']
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'bank_transfer', 'mobile_money', 'cheque', 'other'],
    default: 'cash'
  },
  transactionReference: {
    type: String,
    trim: true
  },

  // Listing Period
  validFrom: {
    type: Date,
    required: [true, 'Valid from date is required']
  },
  validUntil: {
    type: Date,
    required: [true, 'Valid until date is required']
  },
  duration: {
    type: Number,
    required: [true, 'Duration in months is required'],
    min: 1
  },

  // Payment Status
  paymentStatus: {
    type: String,
    enum: ['pending', 'completed', 'refunded', 'cancelled'],
    default: 'completed'
  },
  paymentDate: {
    type: Date,
    default: Date.now
  },

  // Who recorded this payment
  recordedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Recorded by is required']
  },

  // Refund information
  refundDate: {
    type: Date
  },
  refundAmount: {
    type: Number,
    min: 0
  },
  refundReason: {
    type: String,
    trim: true
  },
  refundedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // Optional notes
  notes: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Indexes for better query performance
coachListingSchema.index({ coach: 1 });
coachListingSchema.index({ paymentStatus: 1 });
coachListingSchema.index({ paymentDate: -1 });
coachListingSchema.index({ validUntil: 1 });

// Virtual to check if listing is currently active
coachListingSchema.virtual('isActive').get(function() {
  return this.paymentStatus === 'completed' &&
         new Date() >= this.validFrom &&
         new Date() < this.validUntil;
});

// Virtual to check if listing has expired
coachListingSchema.virtual('isExpired').get(function() {
  return new Date() >= this.validUntil;
});

// Method to check if listing is expiring soon
coachListingSchema.methods.isExpiringSoon = function(days = 30) {
  if (this.paymentStatus !== 'completed') return false;
  const daysUntilExpiry = Math.ceil((this.validUntil - new Date()) / (1000 * 60 * 60 * 24));
  return daysUntilExpiry > 0 && daysUntilExpiry <= days;
};

// Method to calculate remaining days
coachListingSchema.methods.getRemainingDays = function() {
  const now = new Date();
  if (now >= this.validUntil) return 0;
  return Math.ceil((this.validUntil - now) / (1000 * 60 * 60 * 24));
};

// Enable virtuals in JSON
coachListingSchema.set('toJSON', { virtuals: true });
coachListingSchema.set('toObject', { virtuals: true });

export default mongoose.model('CoachListing', coachListingSchema);
