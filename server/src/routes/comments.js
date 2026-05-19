import express from 'express';
import Comment from '../models/Comment.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// GET /api/comments?targetType=news&targetId=xxx
router.get('/', async (req, res) => {
  try {
    const { targetType, targetId } = req.query;
    if (!targetType || !targetId) {
      return res.status(400).json({ success: false, message: 'targetType and targetId are required' });
    }

    const comments = await Comment.find({ targetType, targetId, status: { $ne: 'hidden' } })
      .populate('author', 'firstName lastName role')
      .sort({ createdAt: 1 })
      .lean();

    res.json({ success: true, data: comments });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/comments
router.post('/', protect, async (req, res) => {
  try {
    const { targetType, targetId, body, parentId } = req.body;
    if (!targetType || !targetId || !body) {
      return res.status(400).json({ success: false, message: 'targetType, targetId, and body are required' });
    }

    if (parentId) {
      const parent = await Comment.findById(parentId);
      if (!parent || parent.parentId) {
        return res.status(400).json({ success: false, message: 'Can only reply to top-level comments' });
      }
    }

    const comment = await Comment.create({
      targetType,
      targetId,
      body,
      parentId: parentId || null,
      author: req.user._id
    });

    await comment.populate('author', 'firstName lastName role');
    res.status(201).json({ success: true, data: comment });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/comments/:id/like — toggle like
router.post('/:id/like', protect, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment || comment.status === 'hidden') {
      return res.status(404).json({ success: false, message: 'Comment not found' });
    }

    const userId = req.user._id;
    const liked = comment.likes.some(id => id.equals(userId));
    if (liked) {
      comment.likes.pull(userId);
    } else {
      comment.likes.push(userId);
    }
    await comment.save();

    res.json({ success: true, liked: !liked, likeCount: comment.likes.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/comments/:id/flag — flag for moderation
router.post('/:id/flag', protect, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment || comment.status === 'hidden') {
      return res.status(404).json({ success: false, message: 'Comment not found' });
    }

    const userId = req.user._id;
    if (!comment.flaggedBy.some(id => id.equals(userId))) {
      comment.flaggedBy.push(userId);
    }
    // Auto-hide after 3 flags
    if (comment.flaggedBy.length >= 3) {
      comment.status = 'flagged';
    }
    await comment.save();

    res.json({ success: true, message: 'Comment flagged for review' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/comments/:id — own comment or admin
router.delete('/:id', protect, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) {
      return res.status(404).json({ success: false, message: 'Comment not found' });
    }

    const isOwner = comment.author.equals(req.user._id);
    const isAdmin = req.user.role === 'admin' || req.user.role === 'staff';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    await comment.deleteOne();
    res.json({ success: true, message: 'Comment deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PATCH /api/comments/:id/status — admin only (hide/restore)
router.patch('/:id/status', protect, authorize('admin', 'staff'), async (req, res) => {
  try {
    const { status } = req.body;
    if (!['visible', 'hidden', 'flagged'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const comment = await Comment.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    if (!comment) return res.status(404).json({ success: false, message: 'Comment not found' });

    res.json({ success: true, data: comment });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
