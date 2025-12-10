import mongoose from 'mongoose';

const affiliationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Organization name is required'],
    trim: true
  },
  acronym: {
    type: String,
    required: [true, 'Acronym is required'],
    uppercase: true,
    trim: true
  },
  description: {
    type: String,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  logo: {
    type: String,
    required: [true, 'Logo is required']
  },
  websiteUrl: {
    type: String,
    required: [true, 'Website URL is required']
  },
  category: {
    type: String,
    enum: ['international', 'continental', 'national'],
    default: 'international'
  },
  displayOrder: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes for performance
affiliationSchema.index({ displayOrder: 1, isActive: 1 });
affiliationSchema.index({ category: 1 });

export default mongoose.model('Affiliation', affiliationSchema);
