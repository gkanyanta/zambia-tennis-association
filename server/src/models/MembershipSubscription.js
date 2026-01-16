import mongoose from 'mongoose';

const membershipSubscriptionSchema = new mongoose.Schema({
  // Entity reference (Player or Club)
  entityType: {
    type: String,
    required: true,
    enum: ['player', 'club'],
    index: true
  },
  entityId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'entityModel',
    index: true
  },
  entityModel: {
    type: String,
    required: true,
    enum: ['User', 'Club']
  },
  entityName: {
    type: String,
    required: true
  },

  // Membership type reference
  membershipType: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MembershipType',
    required: true
  },
  membershipTypeName: {
    type: String,
    required: true
  },
  membershipTypeCode: {
    type: String,
    required: true
  },

  // Subscription period - ALL memberships expire Dec 31 of current year
  year: {
    type: Number,
    required: true,
    index: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },

  // Status
  status: {
    type: String,
    enum: ['pending', 'active', 'expired', 'cancelled'],
    default: 'pending',
    index: true
  },

  // Payment details
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'ZMW'
  },
  paymentReference: {
    type: String,
    index: true
  },
  transactionId: {
    type: String
  },
  paymentDate: {
    type: Date
  },
  paymentMethod: {
    type: String,
    enum: ['online', 'bank_transfer', 'cash', 'mobile_money', 'other'],
    default: 'online'
  },

  // Receipt
  receiptNumber: {
    type: String,
    index: true
  },

  // ZPIN for player memberships
  zpin: {
    type: String,
    sparse: true,
    index: true
  },

  // Admin notes
  notes: {
    type: String
  },

  // Who processed this (for manual payments)
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // Renewal tracking
  isRenewal: {
    type: Boolean,
    default: false
  },
  previousSubscription: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MembershipSubscription'
  }
}, {
  timestamps: true
});

// Compound index for checking existing subscriptions
membershipSubscriptionSchema.index({ entityId: 1, year: 1, membershipType: 1 });
membershipSubscriptionSchema.index({ entityId: 1, status: 1 });

// Helper to get Dec 31 of current year
membershipSubscriptionSchema.statics.getYearEndDate = function(year = new Date().getFullYear()) {
  return new Date(year, 11, 31, 23, 59, 59, 999); // Dec 31, 23:59:59.999
};

// Helper to get current membership year
membershipSubscriptionSchema.statics.getCurrentYear = function() {
  return new Date().getFullYear();
};

// Check if entity has active subscription for current year
membershipSubscriptionSchema.statics.hasActiveSubscription = async function(entityId, entityType, year = null) {
  const currentYear = year || this.getCurrentYear();
  const subscription = await this.findOne({
    entityId,
    entityType,
    year: currentYear,
    status: 'active'
  });
  return !!subscription;
};

// Get active subscription for entity
membershipSubscriptionSchema.statics.getActiveSubscription = async function(entityId, entityType) {
  const currentYear = this.getCurrentYear();
  return this.findOne({
    entityId,
    entityType,
    year: currentYear,
    status: 'active'
  }).populate('membershipType');
};

// Create subscription with automatic Dec 31 expiry
membershipSubscriptionSchema.statics.createSubscription = async function(data) {
  const currentYear = this.getCurrentYear();
  const endDate = this.getYearEndDate(currentYear);

  // Check for existing active subscription
  const existing = await this.findOne({
    entityId: data.entityId,
    entityType: data.entityType,
    year: currentYear,
    status: { $in: ['active', 'pending'] }
  });

  if (existing && existing.status === 'active') {
    throw new Error('Entity already has an active subscription for this year');
  }

  // If pending exists, update it
  if (existing && existing.status === 'pending') {
    Object.assign(existing, data);
    existing.endDate = endDate;
    return existing.save();
  }

  // Check if this is a renewal
  const previousSub = await this.findOne({
    entityId: data.entityId,
    entityType: data.entityType,
    status: 'active'
  }).sort({ year: -1 });

  const subscription = new this({
    ...data,
    year: currentYear,
    startDate: new Date(),
    endDate,
    isRenewal: !!previousSub,
    previousSubscription: previousSub?._id
  });

  return subscription.save();
};

// Method to activate subscription after payment
membershipSubscriptionSchema.methods.activate = async function(paymentDetails) {
  this.status = 'active';
  this.paymentReference = paymentDetails.reference;
  this.transactionId = paymentDetails.transactionId;
  this.paymentDate = new Date();
  this.receiptNumber = paymentDetails.receiptNumber;

  return this.save();
};

// Virtual for checking if expired
membershipSubscriptionSchema.virtual('isExpired').get(function() {
  return new Date() > this.endDate;
});

// Virtual for days until expiry
membershipSubscriptionSchema.virtual('daysUntilExpiry').get(function() {
  const now = new Date();
  const diff = this.endDate - now;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
});

// Pre-save to ensure endDate is always Dec 31
membershipSubscriptionSchema.pre('save', function(next) {
  if (!this.endDate || this.isModified('year')) {
    this.endDate = mongoose.model('MembershipSubscription').getYearEndDate(this.year);
  }
  next();
});

export default mongoose.model('MembershipSubscription', membershipSubscriptionSchema);
