// Validation middleware for About page modules

// Helper function to validate URL format
const isValidUrl = (string) => {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
};

// Validate executive member data
export const validateExecutiveMember = (req, res, next) => {
  const { name, position, profileImage, email, bio } = req.body;

  // Validate name
  if (!name || name.trim().length < 2) {
    return res.status(400).json({
      success: false,
      error: 'Name must be at least 2 characters'
    });
  }

  // Validate position
  if (!position || position.trim().length < 2) {
    return res.status(400).json({
      success: false,
      error: 'Position is required and must be at least 2 characters'
    });
  }

  // Validate profile image URL
  if (profileImage && !isValidUrl(profileImage)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid profile image URL'
    });
  }

  // Validate email format if provided
  if (email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email format'
      });
    }
  }

  // Validate bio length
  if (bio && bio.length > 500) {
    return res.status(400).json({
      success: false,
      error: 'Bio cannot exceed 500 characters'
    });
  }

  next();
};

// Validate affiliation data
export const validateAffiliation = (req, res, next) => {
  const { name, acronym, logo, websiteUrl, description } = req.body;

  // Validate name
  if (!name || name.trim().length < 2) {
    return res.status(400).json({
      success: false,
      error: 'Organization name must be at least 2 characters'
    });
  }

  // Validate acronym
  if (!acronym || acronym.trim().length < 2) {
    return res.status(400).json({
      success: false,
      error: 'Acronym is required and must be at least 2 characters'
    });
  }

  // Validate logo URL
  if (logo && !isValidUrl(logo)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid logo URL'
    });
  }

  // Validate website URL
  if (websiteUrl && !isValidUrl(websiteUrl)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid website URL'
    });
  }

  // Validate description length
  if (description && description.length > 500) {
    return res.status(400).json({
      success: false,
      error: 'Description cannot exceed 500 characters'
    });
  }

  next();
};

// Validate about content data
export const validateAboutContent = (req, res, next) => {
  const { section, title, content } = req.body;

  // Validate section
  const validSections = ['mission', 'vision', 'history', 'objectives', 'about'];
  if (!section || !validSections.includes(section.toLowerCase())) {
    return res.status(400).json({
      success: false,
      error: `Section must be one of: ${validSections.join(', ')}`
    });
  }

  // Validate title
  if (!title || title.trim().length < 2) {
    return res.status(400).json({
      success: false,
      error: 'Title must be at least 2 characters'
    });
  }

  // Validate content
  if (!content || content.trim().length < 10) {
    return res.status(400).json({
      success: false,
      error: 'Content must be at least 10 characters'
    });
  }

  next();
};
