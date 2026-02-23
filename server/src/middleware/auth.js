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

// Verify user is admin/staff or assigned as umpire to the match
// Any user (including players) assigned as umpire can score their match
export const authorizeUmpire = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'User not authenticated' });
  }

  // Admin/staff can score any match
  if (req.user.role === 'admin' || req.user.role === 'staff') {
    return next();
  }

  // Any user assigned as umpire to this specific match can score it
  try {
    const liveMatch = await LiveMatch.findById(req.params.id);
    if (!liveMatch) {
      return res.status(404).json({ success: false, message: 'Live match not found' });
    }

    if (liveMatch.umpireId === req.user._id.toString()) {
      return next();
    }

    return res.status(403).json({ success: false, message: 'You are not assigned to this match' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
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
