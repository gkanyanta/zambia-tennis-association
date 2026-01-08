import mongoose from 'mongoose';

const executiveMemberSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true
  },
  position: {
    type: String,
    required: [true, 'Position is required'],
    trim: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true
  },
  phone: String,
  profileImage: {
    type: String,
    required: [true, 'Profile image is required']
  },
  bio: {
    type: String,
    maxlength: [500, 'Bio cannot exceed 500 characters']
  },
  displayOrder: {
    type: Number,
    default: 0
  },
  region: {
    type: String,
    enum: ['national', 'northern', 'southern'],
    default: 'national'
  },
  // Organizational hierarchy fields
  hierarchyLevel: {
    type: Number,
    default: 0,
    min: 0,
    max: 10,
    comment: '0=President/CEO, 1=Vice President/Executive, 2=Directors, 3=Managers, etc.'
  },
  reportsTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ExecutiveMember',
    default: null,
    comment: 'Reference to the executive member this person reports to'
  },
  department: {
    type: String,
    trim: true,
    comment: 'Department or area of responsibility (e.g., Technical, Marketing, Finance)'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  socialMedia: {
    linkedin: String,
    twitter: String,
    facebook: String
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  endDate: Date
}, {
  timestamps: true
});

// Indexes for performance
executiveMemberSchema.index({ displayOrder: 1, isActive: 1 });
executiveMemberSchema.index({ position: 1 });
executiveMemberSchema.index({ region: 1 });

export default mongoose.model('ExecutiveMember', executiveMemberSchema);
