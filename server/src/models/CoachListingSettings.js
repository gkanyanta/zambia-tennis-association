import mongoose from 'mongoose';

const coachListingSettingsSchema = new mongoose.Schema({
  // Pricing Tiers
  pricingPlans: [{
    duration: {
      type: Number,
      required: true,
      min: 1
    },
    price: {
      type: Number,
      required: true,
      min: 0
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    isActive: {
      type: Boolean,
      default: true
    }
  }],

  // Current active plan defaults
  defaultDuration: {
    type: Number,
    default: 12,
    min: 1
  },
  defaultPrice: {
    type: Number,
    default: 500,
    min: 0
  },

  // Business Rules
  requireClubVerification: {
    type: Boolean,
    default: true
  },
  autoApproveListings: {
    type: Boolean,
    default: false
  },
  maxListingDuration: {
    type: Number,
    default: 24,
    min: 1
  },
  minListingDuration: {
    type: Number,
    default: 1,
    min: 1
  },

  // Grace Period
  gracePeriodDays: {
    type: Number,
    default: 7,
    min: 0
  },

  // Notifications
  expiryReminderDays: {
    type: Number,
    default: 30,
    min: 0
  },
  sendExpiryReminders: {
    type: Boolean,
    default: true
  },

  // Additional Settings
  allowMultipleClubs: {
    type: Boolean,
    default: false
  },
  requireCertificationUpload: {
    type: Boolean,
    default: false
  },

  // Last updated
  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Method to get active pricing plans
coachListingSettingsSchema.methods.getActivePricingPlans = function() {
  return this.pricingPlans.filter(plan => plan.isActive);
};

// Method to get price for a specific duration
coachListingSettingsSchema.methods.getPriceForDuration = function(duration) {
  const plan = this.pricingPlans.find(p => p.duration === duration && p.isActive);
  return plan ? plan.price : this.defaultPrice;
};

// Method to validate duration
coachListingSettingsSchema.methods.isValidDuration = function(duration) {
  return duration >= this.minListingDuration && duration <= this.maxListingDuration;
};

// Static method to get or create settings (singleton pattern)
coachListingSettingsSchema.statics.getSettings = async function() {
  let settings = await this.findOne();

  if (!settings) {
    // Create default settings if none exist
    settings = await this.create({
      pricingPlans: [
        {
          duration: 3,
          price: 150,
          name: 'Quarterly',
          description: '3 months listing',
          isActive: true
        },
        {
          duration: 6,
          price: 280,
          name: 'Semi-Annual',
          description: '6 months listing (Save 7%)',
          isActive: true
        },
        {
          duration: 12,
          price: 500,
          name: 'Annual',
          description: '12 months listing (Save 17%)',
          isActive: true
        }
      ],
      defaultDuration: 12,
      defaultPrice: 500,
      requireClubVerification: true,
      autoApproveListings: false,
      maxListingDuration: 24,
      minListingDuration: 1,
      gracePeriodDays: 7,
      expiryReminderDays: 30,
      sendExpiryReminders: true,
      allowMultipleClubs: false,
      requireCertificationUpload: false
    });
  }

  return settings;
};

// Ensure only one settings document exists
coachListingSettingsSchema.index({}, { unique: true });

export default mongoose.model('CoachListingSettings', coachListingSettingsSchema);
