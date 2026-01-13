import mongoose from 'mongoose';

const donationSchema = new mongoose.Schema({
  // Donor Information
  donorName: {
    type: String,
    required: true
  },
  donorEmail: {
    type: String,
    required: true,
    lowercase: true
  },
  donorPhone: {
    type: String
  },

  // If donor is a registered user
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // Payment Details
  amount: {
    type: Number,
    required: true,
    min: 1
  },
  currency: {
    type: String,
    default: 'ZMW',
    enum: ['ZMW', 'USD']
  },

  // Donation Type/Purpose
  donationType: {
    type: String,
    enum: ['general', 'youth_development', 'tournament_support', 'coach_education', 'infrastructure'],
    default: 'general'
  },
  message: {
    type: String,
    maxlength: 500
  },

  // Payment Gateway Details
  paymentGateway: {
    type: String,
    enum: ['lenco', 'flutterwave', 'stripe', 'manual', 'bank_transfer', 'mobile_money', 'cash'],
    required: true
  },
  transactionId: {
    type: String,
    unique: true,
    sparse: true
  },
  flutterwaveTransactionId: {
    type: String,
    unique: true,
    sparse: true
  },
  lencoReference: {
    type: String,
    unique: true,
    sparse: true
  },
  lencoTransactionId: {
    type: String,
    unique: true,
    sparse: true
  },
  paymentReference: {
    type: String
  },

  // Payment Status
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded', 'cancelled'],
    default: 'pending'
  },
  paymentDate: {
    type: Date
  },

  // Payment Method Details
  paymentMethod: {
    type: String,
    enum: ['card', 'mobile_money', 'bank_transfer', 'ussd', 'bank_account', 'cash', 'cheque']
  },
  paymentProvider: {
    type: String // e.g., 'mtn', 'airtel', 'zamtel', 'visa', 'mastercard'
  },

  // Refund Information
  refunded: {
    type: Boolean,
    default: false
  },
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
  },

  // Anonymous Donation
  isAnonymous: {
    type: Boolean,
    default: false
  },

  // Receipt
  receiptNumber: {
    type: String,
    unique: true,
    sparse: true
  },
  receiptGenerated: {
    type: Boolean,
    default: false
  },
  receiptUrl: {
    type: String
  },

  // Thank You Email
  thankYouEmailSent: {
    type: Boolean,
    default: false
  },

  // Admin Notes
  adminNotes: {
    type: String
  },
  recordedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // Metadata
  metadata: {
    type: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
})

// Indexes
donationSchema.index({ donorEmail: 1 })
donationSchema.index({ status: 1 })
donationSchema.index({ paymentDate: -1 })
donationSchema.index({ donationType: 1 })
donationSchema.index({ createdAt: -1 })

// Generate receipt number
donationSchema.pre('save', async function(next) {
  if (this.isNew && this.status === 'completed' && !this.receiptNumber) {
    const year = new Date().getFullYear()
    const count = await mongoose.model('Donation').countDocuments({
      status: 'completed',
      createdAt: {
        $gte: new Date(year, 0, 1),
        $lt: new Date(year + 1, 0, 1)
      }
    })
    this.receiptNumber = `ZTA-DON-${year}-${String(count + 1).padStart(5, '0')}`
  }
  next()
})

// Virtual for display name
donationSchema.virtual('displayName').get(function() {
  return this.isAnonymous ? 'Anonymous Donor' : this.donorName
})

// Method to check if donation is recent (within 30 days)
donationSchema.methods.isRecent = function() {
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  return this.createdAt >= thirtyDaysAgo
}

// Static method to get total donations
donationSchema.statics.getTotalDonations = async function(filters = {}) {
  const match = { status: 'completed', ...filters }
  const result = await this.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        total: { $sum: '$amount' },
        count: { $sum: 1 }
      }
    }
  ])
  return result[0] || { total: 0, count: 0 }
}

// Static method to get donations by type
donationSchema.statics.getDonationsByType = async function() {
  return await this.aggregate([
    { $match: { status: 'completed' } },
    {
      $group: {
        _id: '$donationType',
        total: { $sum: '$amount' },
        count: { $sum: 1 }
      }
    },
    { $sort: { total: -1 } }
  ])
}

export default mongoose.model('Donation', donationSchema);
