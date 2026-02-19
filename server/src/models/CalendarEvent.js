import mongoose from 'mongoose';

const calendarEventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  startDate: {
    type: Date,
    required: [true, 'Start date is required']
  },
  endDate: {
    type: Date,
    required: [true, 'End date is required']
  },
  location: {
    type: String,
    trim: true
  },
  type: {
    type: String,
    enum: ['tournament', 'league', 'education', 'meeting', 'social', 'other'],
    default: 'other'
  },
  published: {
    type: Boolean,
    default: true
  },
  league: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'League'
  },
  tournament: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tournament'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Index for efficient date queries
calendarEventSchema.index({ startDate: 1 });
calendarEventSchema.index({ endDate: 1 });

export default mongoose.model('CalendarEvent', calendarEventSchema);
