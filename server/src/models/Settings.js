import mongoose from 'mongoose';

const settingsSchema = new mongoose.Schema({
  // Singleton pattern - only one settings document
  singleton: {
    type: String,
    unique: true,
    default: 'settings',
    immutable: true
  },

  // Membership Fee Structure
  membershipFees: {
    junior: {
      type: Number,
      default: 100,
      min: 0
    },
    adult: {
      type: Number,
      default: 250,
      min: 0
    },
    international: {
      type: Number,
      default: 500,
      min: 0
    }
  },

  // Club Affiliation Fee
  clubAffiliationFee: {
    type: Number,
    default: 500,
    min: 0
  },

  // Membership validity period in days
  membershipValidityDays: {
    type: Number,
    default: 365,  // 1 year
    min: 1
  },

  // Grace period after expiry (in days)
  gracePeriodDays: {
    type: Number,
    default: 30,
    min: 0
  },

  // Auto-update settings
  autoUpdateStatus: {
    enabled: {
      type: Boolean,
      default: true
    },
    scheduleTime: {
      type: String,
      default: '00:00'  // Midnight
    }
  },

  // Organization details
  organizationName: {
    type: String,
    default: 'Zambia Tennis Association'
  },

  currency: {
    type: String,
    default: 'ZMW'  // Zambian Kwacha
  },

  // Last updated info
  lastUpdatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Static method to get or create settings (singleton)
settingsSchema.statics.getSettings = async function() {
  let settings = await this.findOne({ singleton: 'settings' });

  if (!settings) {
    // Create default settings if none exist
    settings = await this.create({ singleton: 'settings' });
  }

  return settings;
};

// Method to update settings
settingsSchema.statics.updateSettings = async function(updates, userId) {
  let settings = await this.getSettings();

  Object.assign(settings, updates);
  settings.lastUpdatedBy = userId;
  settings.updatedAt = new Date();

  await settings.save();
  return settings;
};

export default mongoose.model('Settings', settingsSchema);
