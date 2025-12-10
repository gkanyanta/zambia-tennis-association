import ExecutiveMember from '../models/ExecutiveMember.js';

// @desc    Get all executive members
// @route   GET /api/executive-members
// @access  Public
export const getExecutiveMembers = async (req, res) => {
  try {
    const { isActive, region } = req.query;
    const filter = {};

    if (isActive !== undefined) filter.isActive = isActive === 'true';
    if (region) filter.region = region;

    const members = await ExecutiveMember.find(filter)
      .sort('displayOrder')
      .lean();

    res.json({
      success: true,
      count: members.length,
      data: members
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Get single executive member
// @route   GET /api/executive-members/:id
// @access  Public
export const getExecutiveMember = async (req, res) => {
  try {
    const member = await ExecutiveMember.findById(req.params.id);

    if (!member) {
      return res.status(404).json({
        success: false,
        error: 'Executive member not found'
      });
    }

    res.json({
      success: true,
      data: member
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Create executive member
// @route   POST /api/executive-members
// @access  Private (Admin/Staff)
export const createExecutiveMember = async (req, res) => {
  try {
    const member = await ExecutiveMember.create(req.body);

    res.status(201).json({
      success: true,
      data: member
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Update executive member
// @route   PUT /api/executive-members/:id
// @access  Private (Admin/Staff)
export const updateExecutiveMember = async (req, res) => {
  try {
    const member = await ExecutiveMember.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!member) {
      return res.status(404).json({
        success: false,
        error: 'Executive member not found'
      });
    }

    res.json({
      success: true,
      data: member
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Delete executive member
// @route   DELETE /api/executive-members/:id
// @access  Private (Admin)
export const deleteExecutiveMember = async (req, res) => {
  try {
    const member = await ExecutiveMember.findById(req.params.id);

    if (!member) {
      return res.status(404).json({
        success: false,
        error: 'Executive member not found'
      });
    }

    await member.deleteOne();

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

// @desc    Reorder executive members
// @route   PATCH /api/executive-members/reorder
// @access  Private (Admin/Staff)
export const reorderExecutiveMembers = async (req, res) => {
  try {
    const { orders } = req.body; // Array of { id, displayOrder }

    if (!Array.isArray(orders)) {
      return res.status(400).json({
        success: false,
        error: 'Orders must be an array'
      });
    }

    // Update display order for each member
    const updatePromises = orders.map(({ id, displayOrder }) =>
      ExecutiveMember.findByIdAndUpdate(id, { displayOrder }, { new: true })
    );

    await Promise.all(updatePromises);

    res.json({
      success: true,
      message: 'Executive members reordered successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};
