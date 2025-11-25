import mongoose from 'mongoose';

const coachSchema = new mongoose.Schema({
  // User association (optional - coaches can exist without user accounts)
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    sparse: true
  },

  // Basic Info
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
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true
  },
  profileImage: {
    type: String
  },

  // Professional Details
  itfLevel: {
    type: String,
    enum: ['ITF Level 1', 'ITF Level 2', 'ITF Level 3', 'Other'],
    required: [true, 'ITF level is required']
  },
  certifications: [{
    name: {
      type: String,
      required: true
    },
    issuedBy: {
      type: String,
      required: true
    },
    dateObtained: {
      type: Date
    },
    expiryDate: {
      type: Date
    },
    certificateUrl: {
      type: String
    }
  }],
  specializations: [{
    type: String,
    trim: true
  }],
  experience: {
    type: Number,
    required: [true, 'Years of experience is required'],
    min: 0
  },
  bio: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  languages: [{
    type: String,
    trim: true
  }],

  // Club Validation (REQUIRED FOR LISTING)
  club: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Club',
    required: [true, 'Coach must belong to a valid club']
  },
  clubVerificationStatus: {
    type: String,
    enum: ['pending', 'verified', 'rejected'],
    default: 'pending'
  },
  clubVerifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  clubVerifiedAt: {
    type: Date
  },
  clubRejectionReason: {
    type: String,
    trim: true
  },

  // Listing & Payment Status
  listingStatus: {
    type: String,
    enum: ['pending', 'active', 'suspended', 'expired'],
    default: 'pending'
  },

  // Current listing subscription
  currentListingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CoachListing'
  },
  listingExpiryDate: {
    type: Date
  },

  // Contact Preferences
  preferredContactMethod: {
    type: String,
    enum: ['email', 'phone', 'both'],
    default: 'both'
  },
  availableForBooking: {
    type: Boolean,
    default: true
  },

  // Metadata
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Creator is required']
  },
  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  }
}, {
  timestamps: true
});

// Indexes for better query performance
coachSchema.index({ email: 1 });
coachSchema.index({ club: 1 });
coachSchema.index({ listingStatus: 1 });
coachSchema.index({ clubVerificationStatus: 1 });
coachSchema.index({ status: 1 });
coachSchema.index({ listingExpiryDate: 1 });

// Virtual for full name
coachSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Virtual to check if listing is active and not expired
coachSchema.virtual('isActivelyListed').get(function() {
  return this.listingStatus === 'active' &&
         this.clubVerificationStatus === 'verified' &&
         this.status === 'active' &&
         this.listingExpiryDate &&
         new Date() < this.listingExpiryDate;
});

// Method to check if listing is expiring soon
coachSchema.methods.isListingExpiringSoon = function(days = 30) {
  if (!this.listingExpiryDate) return false;
  const daysUntilExpiry = Math.ceil((this.listingExpiryDate - new Date()) / (1000 * 60 * 60 * 24));
  return daysUntilExpiry > 0 && daysUntilExpiry <= days;
};

// Method to check if club verification is pending
coachSchema.methods.isClubVerificationPending = function() {
  return this.clubVerificationStatus === 'pending';
};

// Enable virtuals in JSON
coachSchema.set('toJSON', { virtuals: true });
coachSchema.set('toObject', { virtuals: true });

export default mongoose.model('Coach', coachSchema);
