import mongoose from 'mongoose';

const gallerySchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please add a title'],
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  imageUrl: {
    type: String,
    required: [true, 'Please add an image']
  },
  category: {
    type: String,
    required: [true, 'Please add a category'],
    enum: ['Tournaments', 'Juniors', 'Infrastructure', 'Education', 'Development', 'Madalas', 'Training', 'Slideshow']
  },
  isSlideshow: {
    type: Boolean,
    default: false
  },
  focalPoint: {
    type: String,
    enum: ['top', 'center', 'bottom'],
    default: 'top'
  },
  order: {
    type: Number,
    default: 0
  },
  date: {
    type: String
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Index for efficient queries
gallerySchema.index({ category: 1, isSlideshow: 1 });
gallerySchema.index({ order: 1 });

export default mongoose.model('Gallery', gallerySchema);
