import mongoose from 'mongoose';

const playerRegistrationSchema = new mongoose.Schema({
  // Reference number for tracking
  referenceNumber: {
    type: String,
    unique: true,
    index: true
  },

  // Personal information
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
  dateOfBirth: {
    type: Date,
    required: [true, 'Date of birth is required']
  },
  gender: {
    type: String,
    enum: ['male', 'female'],
    required: [true, 'Gender is required']
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required']
  },
  email: {
    type: String,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email']
  },
  club: {
    type: String,
    trim: true
  },
  isInternational: {
    type: Boolean,
    default: false
  },

  // Parent/Guardian information (required for juniors)
  parentGuardianName: {
    type: String,
    trim: true
  },
  parentGuardianPhone: {
    type: String
  },
  parentGuardianEmail: {
    type: String,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid guardian email']
  },

  // Proof of age document (for juniors)
  proofOfAgeDocument: {
    url: String,
    publicId: String,
    originalName: String,
    fileType: String
  },

  // Application status
  status: {
    type: String,
    enum: ['pending_payment', 'pending_approval', 'approved', 'rejected'],
    default: 'pending_payment',
    index: true
  },

  // Payment information
  paymentReference: {
    type: String,
    sparse: true,
    index: true
  },
  paymentAmount: {
    type: Number
  },
  paymentDate: {
    type: Date
  },
  paymentMethod: {
    type: String,
    enum: ['online', 'cash', 'bank_transfer', 'cheque', 'mobile_money', 'other']
  },

  // Auto-determined membership type
  membershipTypeCode: {
    type: String
  },
  membershipTypeName: {
    type: String
  },
  membershipTypeAmount: {
    type: Number
  },

  // Admin review
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewedAt: {
    type: Date
  },
  rejectionReason: {
    type: String
  },
  adminNotes: {
    type: String
  },

  // Reference to created user (after approval)
  createdUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Generate reference number before saving
playerRegistrationSchema.pre('save', function(next) {
  if (!this.referenceNumber) {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    this.referenceNumber = `REG-${timestamp}-${random}`;
  }
  next();
});

// Indexes
playerRegistrationSchema.index({ status: 1, createdAt: -1 });
playerRegistrationSchema.index({ firstName: 'text', lastName: 'text', phone: 'text', referenceNumber: 'text' });

export default mongoose.model('PlayerRegistration', playerRegistrationSchema);
