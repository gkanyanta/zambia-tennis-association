import mongoose from 'mongoose';

const commentSchema = new mongoose.Schema({
  targetType: {
    type: String,
    enum: ['news', 'tournament', 'rankings'],
    required: true,
    index: true
  },
  targetId: {
    type: String,
    required: true,
    index: true
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  body: {
    type: String,
    required: [true, 'Comment body is required'],
    trim: true,
    maxlength: [2000, 'Comment cannot exceed 2000 characters']
  },
  parentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment',
    default: null
  },
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  status: {
    type: String,
    enum: ['visible', 'hidden', 'flagged'],
    default: 'visible'
  },
  flaggedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }]
}, { timestamps: true });

commentSchema.index({ targetType: 1, targetId: 1, createdAt: -1 });

export default mongoose.model('Comment', commentSchema);
