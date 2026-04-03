import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
  // Transaction identification
  reference: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  receiptNumber: {
    type: String,
    unique: true,
    sparse: true,
    index: true
  },
  transactionId: {
    type: String,
    sparse: true
  },

  // Transaction type
  type: {
    type: String,
    required: true,
    enum: ['donation', 'membership', 'tournament', 'coach_listing', 'registration'],
    index: true
  },

  // Amount details
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'ZMW'
  },

  // Payer information
  payerName: {
    type: String,
    required: true
  },
  payerEmail: {
    type: String
  },
  payerPhone: {
    type: String
  },

  // Status
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded'],
    default: 'pending',
    index: true
  },

  // Payment gateway
  paymentGateway: {
    type: String,
    default: 'lenco'
  },
  paymentMethod: {
    type: String,
    enum: ['card', 'online', 'mobile_money', 'bank_transfer', 'cash', 'cheque', 'other'],
    default: 'card'
  },

  // Related records
  relatedId: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'relatedModel'
  },
  relatedModel: {
    type: String,
    enum: ['Donation', 'User', 'Tournament', 'CoachListing', 'MembershipSubscription', 'PlayerRegistration']
  },

  // Additional details based on type
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },

  // Description for statements
  description: {
    type: String
  },

  // Timestamps
  paymentDate: {
    type: Date
  },
  receiptSentAt: {
    type: Date
  },
  receiptUrl: {
    type: String
  }
}, {
  timestamps: true
});

// Generate receipt number before saving
transactionSchema.pre('save', async function(next) {
  if (!this.receiptNumber && this.status === 'completed') {
    const prefixMap = {
      donation: 'DON',
      membership: 'MEM',
      tournament: 'TRN',
      coach_listing: 'COA',
      registration: 'REG'
    };
    const prefix = prefixMap[this.type] || 'TXN';
    const year = new Date().getFullYear();
    const yearStr = String(year);
    const yearPattern = `-${yearStr}-`;

    // Find the highest numeric suffix across ALL receipt prefixes for this year.
    // We must iterate and parse rather than relying on string sort, because
    // string sort orders by prefix (COA < DON < MEM < REG < TRN) before the
    // numeric suffix, which returns the wrong "max" when multiple prefixes exist.
    const allTxns = await mongoose.model('Transaction').find({
      receiptNumber: { $regex: `^ZTA-\\w+-${yearStr}-` }
    }).select('receiptNumber').lean();

    let maxNum = 0;
    for (const t of allTxns) {
      if (t.receiptNumber && t.receiptNumber.includes(yearPattern)) {
        const parts = t.receiptNumber.split('-');
        const num = parseInt(parts[parts.length - 1], 10);
        if (!isNaN(num) && num > maxNum) maxNum = num;
      }
    }

    this.receiptNumber = `ZTA-${prefix}-${year}-${String(maxNum + 1).padStart(5, '0')}`;
  }
  next();
});

// Index for reporting queries
transactionSchema.index({ status: 1, type: 1, createdAt: -1 });
transactionSchema.index({ paymentDate: -1 });

// Static method to get income summary
transactionSchema.statics.getIncomeSummary = async function(startDate, endDate) {
  const matchStage = {
    status: 'completed'
  };

  if (startDate || endDate) {
    matchStage.paymentDate = {};
    if (startDate) matchStage.paymentDate.$gte = new Date(startDate);
    if (endDate) matchStage.paymentDate.$lte = new Date(endDate);
  }

  const summary = await this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$type',
        totalAmount: { $sum: '$amount' },
        count: { $sum: 1 }
      }
    },
    {
      $project: {
        type: '$_id',
        totalAmount: 1,
        count: 1,
        _id: 0
      }
    }
  ]);

  const total = await this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalAmount: { $sum: '$amount' },
        count: { $sum: 1 }
      }
    }
  ]);

  return {
    byType: summary,
    total: total[0] || { totalAmount: 0, count: 0 }
  };
};

export default mongoose.model('Transaction', transactionSchema);
