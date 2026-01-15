import CalendarEvent from '../models/CalendarEvent.js';

// @desc    Get all calendar events
// @route   GET /api/calendar
// @access  Public
export const getCalendarEvents = async (req, res) => {
  try {
    const { upcoming, type, limit } = req.query;

    let query = { published: true };

    // Filter for upcoming events only
    if (upcoming === 'true') {
      query.endDate = { $gte: new Date() };
    }

    // Filter by type
    if (type) {
      query.type = type;
    }

    let eventsQuery = CalendarEvent.find(query).sort({ startDate: 1 });

    // Limit results
    if (limit) {
      eventsQuery = eventsQuery.limit(parseInt(limit));
    }

    const events = await eventsQuery;

    res.status(200).json({
      success: true,
      count: events.length,
      data: events
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get all calendar events (admin - includes unpublished)
// @route   GET /api/calendar/admin
// @access  Private/Admin
export const getAdminCalendarEvents = async (req, res) => {
  try {
    const events = await CalendarEvent.find()
      .sort({ startDate: -1 })
      .populate('createdBy', 'firstName lastName');

    res.status(200).json({
      success: true,
      count: events.length,
      data: events
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get single calendar event
// @route   GET /api/calendar/:id
// @access  Public
export const getCalendarEventById = async (req, res) => {
  try {
    const event = await CalendarEvent.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Calendar event not found'
      });
    }

    res.status(200).json({
      success: true,
      data: event
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Create calendar event
// @route   POST /api/calendar
// @access  Private/Admin
export const createCalendarEvent = async (req, res) => {
  try {
    req.body.createdBy = req.user.id;

    // Validate dates
    const startDate = new Date(req.body.startDate);
    const endDate = new Date(req.body.endDate);

    if (endDate < startDate) {
      return res.status(400).json({
        success: false,
        message: 'End date must be after start date'
      });
    }

    const event = await CalendarEvent.create(req.body);

    res.status(201).json({
      success: true,
      data: event
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update calendar event
// @route   PUT /api/calendar/:id
// @access  Private/Admin
export const updateCalendarEvent = async (req, res) => {
  try {
    // Validate dates if provided
    if (req.body.startDate && req.body.endDate) {
      const startDate = new Date(req.body.startDate);
      const endDate = new Date(req.body.endDate);

      if (endDate < startDate) {
        return res.status(400).json({
          success: false,
          message: 'End date must be after start date'
        });
      }
    }

    const event = await CalendarEvent.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Calendar event not found'
      });
    }

    res.status(200).json({
      success: true,
      data: event
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete calendar event
// @route   DELETE /api/calendar/:id
// @access  Private/Admin
export const deleteCalendarEvent = async (req, res) => {
  try {
    const event = await CalendarEvent.findByIdAndDelete(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Calendar event not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Calendar event deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
