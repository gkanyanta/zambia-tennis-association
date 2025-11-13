import express from 'express';
import {
  getNews,
  getNewsById,
  createNews,
  updateNews,
  deleteNews
} from '../controllers/newsController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.get('/', getNews);
router.get('/:id', getNewsById);
router.post('/', protect, authorize('admin', 'staff'), createNews);
router.put('/:id', protect, authorize('admin', 'staff'), updateNews);
router.delete('/:id', protect, authorize('admin', 'staff'), deleteNews);

export default router;
