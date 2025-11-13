import News from '../models/News.js';

// @desc    Get all news articles
// @route   GET /api/news
// @access  Public
export const getNews = async (req, res) => {
  try {
    const news = await News.find({ published: true }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: news.length,
      data: news
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get single news article
// @route   GET /api/news/:id
// @access  Public
export const getNewsById = async (req, res) => {
  try {
    const news = await News.findById(req.params.id);

    if (!news) {
      return res.status(404).json({
        success: false,
        message: 'News article not found'
      });
    }

    // Increment views
    news.views += 1;
    await news.save();

    res.status(200).json({
      success: true,
      data: news
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Create news article
// @route   POST /api/news
// @access  Private/Admin
export const createNews = async (req, res) => {
  try {
    req.body.createdBy = req.user.id;
    const news = await News.create(req.body);

    res.status(201).json({
      success: true,
      data: news
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update news article
// @route   PUT /api/news/:id
// @access  Private/Admin
export const updateNews = async (req, res) => {
  try {
    const news = await News.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    if (!news) {
      return res.status(404).json({
        success: false,
        message: 'News article not found'
      });
    }

    res.status(200).json({
      success: true,
      data: news
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete news article
// @route   DELETE /api/news/:id
// @access  Private/Admin
export const deleteNews = async (req, res) => {
  try {
    const news = await News.findByIdAndDelete(req.params.id);

    if (!news) {
      return res.status(404).json({
        success: false,
        message: 'News article not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'News article deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
