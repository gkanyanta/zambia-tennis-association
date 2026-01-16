import mongoose from 'mongoose';

const membershipTypeSchema = new mongoose.Schema({
  // Basic info
  name: {
    type: String,
    required: [true, 'Membership type name is required'],
    trim: true
  },
  code: {
    type: String,
    required: [true, 'Membership type code is required'],
    unique: true,
    trim: true,
    lowercase: true
  },
  description: {
    type: String,
    trim: true
  },

  // Category: player (ZPIN) or club (affiliation)
  category: {
    type: String,
    required: true,
    enum: ['player', 'club'],
    index: true
  },

  // Pricing
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0, 'Amount must be positive']
  },
  currency: {
    type: String,
    default: 'ZMW'
  },

  // For display/sorting
  sortOrder: {
    type: Number,
    default: 0
  },

  // Status
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },

  // Additional settings
  requiresApproval: {
    type: Boolean,
    default: false
  },

  // Age restrictions for player memberships
  minAge: {
    type: Number,
    default: null
  },
  maxAge: {
    type: Number,
    default: null
  },

  // Benefits/features (for display)
  benefits: [{
    type: String
  }]
}, {
  timestamps: true
});

// Indexes
membershipTypeSchema.index({ category: 1, isActive: 1, sortOrder: 1 });

// Static method to get active membership types by category
membershipTypeSchema.statics.getActiveByCategory = function(category) {
  return this.find({ category, isActive: true }).sort({ sortOrder: 1 });
};

// Static method to get all active membership types
membershipTypeSchema.statics.getAllActive = function() {
  return this.find({ isActive: true }).sort({ category: 1, sortOrder: 1 });
};

export default mongoose.model('MembershipType', membershipTypeSchema);
