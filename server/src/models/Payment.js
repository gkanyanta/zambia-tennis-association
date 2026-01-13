import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
  // Entity type (player or club)
  entityType: {
    type: String,
    enum: ['player', 'club'],
    required: [true, 'Entity type is required']
  },

  // Reference to User or Club
  entityId: {
    type: mongoose.Schema.Types.ObjectId,
    required: [true, 'Entity ID is required'],
    refPath: 'entityModel'
  },

  // Dynamic model reference
  entityModel: {
    type: String,
    required: true,
    enum: ['User', 'Club']
  },

  // Cached entity name for quick lookup
  entityName: {
    type: String,
    required: [true, 'Entity name is required']
  },

  // Payment details
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0, 'Amount must be positive']
  },

  membershipType: {
    type: String,
    enum: ['junior', 'adult', 'international', 'club_affiliation'],
    required: [true, 'Membership type is required']
  },

  paymentMethod: {
    type: String,
    enum: ['cash', 'bank_transfer', 'mobile_money', 'cheque', 'lenco', 'other'],
    default: 'cash'
  },

  transactionReference: {
    type: String,
    trim: true
  },

  // Lenco payment gateway fields
  lencoReference: {
    type: String,
    unique: true,
    sparse: true,
    trim: true
  },

  lencoTransactionId: {
    type: String,
    unique: true,
    sparse: true,
    trim: true
  },

  // Payment date (when payment was made)
  paymentDate: {
    type: Date,
    required: [true, 'Payment date is required'],
    default: Date.now
  },

  // Subscription validity period
  validFrom: {
    type: Date,
    required: [true, 'Valid from date is required']
  },

  validUntil: {
    type: Date,
    required: [true, 'Valid until date is required']
  },

  // Admin who recorded the payment
  recordedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Recorded by is required']
  },

  // Optional notes
  notes: {
    type: String,
    trim: true
  },

  // Payment status
  status: {
    type: String,
    enum: ['completed', 'pending', 'refunded', 'cancelled'],
    default: 'completed'
  },

  // Refund information
  refundDate: {
    type: Date
  },

  refundAmount: {
    type: Number
  },

  refundReason: {
    type: String
  },

  refundedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Indexes for better query performance
paymentSchema.index({ entityType: 1, entityId: 1 });
paymentSchema.index({ paymentDate: -1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ membershipType: 1 });
paymentSchema.index({ validUntil: 1 });

// Virtual for checking if payment is still valid
paymentSchema.virtual('isActive').get(function() {
  return this.status === 'completed' && new Date() < this.validUntil;
});

// Method to check if payment is expiring soon (within days)
paymentSchema.methods.isExpiringSoon = function(days = 30) {
  const daysUntilExpiry = Math.ceil((this.validUntil - new Date()) / (1000 * 60 * 60 * 24));
  return daysUntilExpiry > 0 && daysUntilExpiry <= days;
};

export default mongoose.model('Payment', paymentSchema);
