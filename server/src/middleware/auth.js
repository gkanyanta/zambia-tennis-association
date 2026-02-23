import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import LiveMatch from '../models/LiveMatch.js';

// Protect routes - verify JWT token
export const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id);

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route'
    });
  }
};

// Verify umpire is assigned to the match they're trying to score
// Admin/staff bypass this check
export const authorizeUmpire = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'User not authenticated' });
  }

  // Admin/staff can score any match
  if (req.user.role === 'admin' || req.user.role === 'staff') {
    return next();
  }

  // Umpires must be assigned to the match
  if (req.user.role === 'umpire') {
    try {
      const liveMatch = await LiveMatch.findById(req.params.id);
      if (!liveMatch) {
        return res.status(404).json({ success: false, message: 'Live match not found' });
      }

      if (liveMatch.umpireId !== req.user._id.toString()) {
        return res.status(403).json({ success: false, message: 'You are not assigned to this match' });
      }

      return next();
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  }

  return res.status(403).json({ success: false, message: 'Not authorized' });
};

// Grant access to specific roles
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role ${req.user.role} is not authorized to access this route`
      });
    }
    next();
  };
};
