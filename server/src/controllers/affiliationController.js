import Affiliation from '../models/Affiliation.js';

// @desc    Get all affiliations
// @route   GET /api/affiliations
// @access  Public
export const getAffiliations = async (req, res) => {
  try {
    const { isActive, category } = req.query;
    const filter = {};

    if (isActive !== undefined) filter.isActive = isActive === 'true';
    if (category) filter.category = category;

    const affiliations = await Affiliation.find(filter)
      .sort('displayOrder')
      .lean();

    res.json({
      success: true,
      count: affiliations.length,
      data: affiliations
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Get single affiliation
// @route   GET /api/affiliations/:id
// @access  Public
export const getAffiliation = async (req, res) => {
  try {
    const affiliation = await Affiliation.findById(req.params.id);

    if (!affiliation) {
      return res.status(404).json({
        success: false,
        error: 'Affiliation not found'
      });
    }

    res.json({
      success: true,
      data: affiliation
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Create affiliation
// @route   POST /api/affiliations
// @access  Private (Admin/Staff)
export const createAffiliation = async (req, res) => {
  try {
    const affiliation = await Affiliation.create(req.body);

    res.status(201).json({
      success: true,
      data: affiliation
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Update affiliation
// @route   PUT /api/affiliations/:id
// @access  Private (Admin/Staff)
export const updateAffiliation = async (req, res) => {
  try {
    const affiliation = await Affiliation.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!affiliation) {
      return res.status(404).json({
        success: false,
        error: 'Affiliation not found'
      });
    }

    res.json({
      success: true,
      data: affiliation
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Delete affiliation
// @route   DELETE /api/affiliations/:id
// @access  Private (Admin)
export const deleteAffiliation = async (req, res) => {
  try {
    const affiliation = await Affiliation.findById(req.params.id);

    if (!affiliation) {
      return res.status(404).json({
        success: false,
        error: 'Affiliation not found'
      });
    }

    await affiliation.deleteOne();

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

// @desc    Reorder affiliations
// @route   PATCH /api/affiliations/reorder
// @access  Private (Admin/Staff)
export const reorderAffiliations = async (req, res) => {
  try {
    const { orders } = req.body; // Array of { id, displayOrder }

    if (!Array.isArray(orders)) {
      return res.status(400).json({
        success: false,
        error: 'Orders must be an array'
      });
    }

    // Update display order for each affiliation
    const updatePromises = orders.map(({ id, displayOrder }) =>
      Affiliation.findByIdAndUpdate(id, { displayOrder }, { new: true })
    );

    await Promise.all(updatePromises);

    res.json({
      success: true,
      message: 'Affiliations reordered successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};
