import mongoose from 'mongoose';

const aboutContentSchema = new mongoose.Schema({
  section: {
    type: String,
    required: [true, 'Section is required'],
    unique: true,
    enum: ['mission', 'vision', 'history', 'objectives', 'about'],
    lowercase: true
  },
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true
  },
  content: {
    type: String,
    required: [true, 'Content is required']
  },
  lastUpdatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Index for faster queries
aboutContentSchema.index({ section: 1 });

export default mongoose.model('AboutContent', aboutContentSchema);
