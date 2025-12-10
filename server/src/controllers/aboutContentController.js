import AboutContent from '../models/AboutContent.js';

// @desc    Get all about content sections
// @route   GET /api/about-content
// @access  Public
export const getAboutContent = async (req, res) => {
  try {
    const { section } = req.query;
    const filter = {};

    if (section) filter.section = section.toLowerCase();

    const content = await AboutContent.find(filter)
      .populate('lastUpdatedBy', 'name email')
      .lean();

    res.json({
      success: true,
      count: content.length,
      data: content
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Get content by section
// @route   GET /api/about-content/:section
// @access  Public
export const getContentBySection = async (req, res) => {
  try {
    const content = await AboutContent.findOne({
      section: req.params.section.toLowerCase()
    }).populate('lastUpdatedBy', 'name email');

    if (!content) {
      return res.status(404).json({
        success: false,
        error: 'Content section not found'
      });
    }

    res.json({
      success: true,
      data: content
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Create or update content section
// @route   PUT /api/about-content/:section
// @access  Private (Admin/Staff)
export const updateContentSection = async (req, res) => {
  try {
    const { title, content } = req.body;
    const section = req.params.section.toLowerCase();

    // Add the user who updated the content
    const updateData = {
      section,
      title,
      content,
      lastUpdatedBy: req.user._id
    };

    // Use findOneAndUpdate with upsert to create if doesn't exist
    const updatedContent = await AboutContent.findOneAndUpdate(
      { section },
      updateData,
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true
      }
    ).populate('lastUpdatedBy', 'name email');

    res.json({
      success: true,
      data: updatedContent
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Delete content section
// @route   DELETE /api/about-content/:section
// @access  Private (Admin)
export const deleteContentSection = async (req, res) => {
  try {
    const content = await AboutContent.findOne({
      section: req.params.section.toLowerCase()
    });

    if (!content) {
      return res.status(404).json({
        success: false,
        error: 'Content section not found'
      });
    }

    await content.deleteOne();

    res.json({
      success: true,
      data: {}
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
