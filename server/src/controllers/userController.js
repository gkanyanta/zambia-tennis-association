import User from '../models/User.js';
import bcrypt from 'bcryptjs';
import { generateNextZPIN, zpinExists } from '../utils/generateZPIN.js';

// @desc    Get all users (admin only)
// @route   GET /api/users?role=player
// @access  Private/Admin
export const getUsers = async (req, res) => {
  try {
    // Build query filter
    const filter = {};

    // Filter by role if provided
    if (req.query.role) {
      filter.role = req.query.role;
    }

    const users = await User.find(filter).select('-password').sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get single user
// @route   GET /api/users/:id
// @access  Private/Admin
export const getUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Create user (admin/staff only)
// @route   POST /api/users
// @access  Private/Admin
export const createUser = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      password,
      role,
      dateOfBirth,
      gender,
      phone,
      address,
      zpin,
      membershipType,
      membershipStatus,
      club,
      parentGuardianName,
      parentGuardianPhone,
      parentGuardianEmail
    } = req.body;

    // Custom validation: require at least one contact method
    if (!email && !phone) {
      return res.status(400).json({
        success: false,
        message: 'Please provide at least one contact method (email or phone)'
      });
    }

    // Validate parent/guardian info for juniors
    if (dateOfBirth) {
      const age = Math.floor((new Date() - new Date(dateOfBirth)) / (365.25 * 24 * 60 * 60 * 1000));
      if (age < 18) {
        if (!parentGuardianName || !parentGuardianPhone) {
          return res.status(400).json({
            success: false,
            message: 'Parent/guardian name and phone are required for players under 18 years old'
          });
        }
      }
    }

    // Check if user already exists (only if email provided and not placeholder)
    if (email && !email.includes('@noemail.zambiatennis.local')) {
      const userExists = await User.findOne({ email });

      if (userExists) {
        return res.status(400).json({
          success: false,
          message: 'User with this email already exists'
        });
      }
    }

    // Validate role - only admin can create admin/staff accounts
    if ((role === 'admin' || role === 'staff') && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can create admin or staff accounts'
      });
    }

    // Auto-generate ZPIN if not provided and user is a player with membership type
    let finalZpin = zpin;
    if (!finalZpin && role === 'player' && membershipType) {
      try {
        finalZpin = await generateNextZPIN(membershipType);
        console.log(`Auto-generated ZPIN: ${finalZpin} for ${membershipType} player`);
      } catch (error) {
        console.error('Failed to auto-generate ZPIN:', error);
        // Continue without ZPIN rather than failing the whole request
      }
    }

    // If ZPIN is provided, check for duplicates
    if (finalZpin) {
      const zpinInUse = await zpinExists(finalZpin);
      if (zpinInUse) {
        return res.status(400).json({
          success: false,
          message: `ZPIN ${finalZpin} is already in use. Please use a different ZPIN or leave blank to auto-generate.`
        });
      }
    }

    // Hash password only if provided
    let hashedPassword;
    if (password) {
      const salt = await bcrypt.genSalt(10);
      hashedPassword = await bcrypt.hash(password, salt);
    }

    // Create user
    const user = await User.create({
      firstName,
      lastName,
      email,
      ...(hashedPassword && { password: hashedPassword }),
      role: role || 'player',
      dateOfBirth,
      gender,
      phone,
      address,
      zpin: finalZpin,
      membershipType,
      membershipStatus,
      club,
      parentGuardianName,
      parentGuardianPhone,
      parentGuardianEmail
    });

    // Remove password from response
    const userResponse = user.toObject();
    delete userResponse.password;

    res.status(201).json({
      success: true,
      data: userResponse
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private/Admin
export const updateUser = async (req, res) => {
  try {
    const { role, ...updateData } = req.body;

    // Only admin can change roles
    if (role && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can change user roles'
      });
    }

    // Get existing user to check current values
    const existingUser = await User.findById(req.params.id);
    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Custom validation: require at least one contact method
    const finalEmail = updateData.email !== undefined ? updateData.email : existingUser.email;
    const finalPhone = updateData.phone !== undefined ? updateData.phone : existingUser.phone;

    if (!finalEmail && !finalPhone) {
      return res.status(400).json({
        success: false,
        message: 'Please provide at least one contact method (email or phone)'
      });
    }

    // Validate parent/guardian info for juniors if dateOfBirth is being updated or already exists
    const finalDateOfBirth = updateData.dateOfBirth !== undefined ? updateData.dateOfBirth : existingUser.dateOfBirth;

    if (finalDateOfBirth) {
      const age = Math.floor((new Date() - new Date(finalDateOfBirth)) / (365.25 * 24 * 60 * 60 * 1000));
      if (age < 18) {
        const finalParentName = updateData.parentGuardianName !== undefined ? updateData.parentGuardianName : existingUser.parentGuardianName;
        const finalParentPhone = updateData.parentGuardianPhone !== undefined ? updateData.parentGuardianPhone : existingUser.parentGuardianPhone;

        if (!finalParentName || !finalParentPhone) {
          return res.status(400).json({
            success: false,
            message: 'Parent/guardian name and phone are required for players under 18 years old'
          });
        }
      }
    }

    // If updating password, hash it; otherwise remove it from update data
    if (updateData.password) {
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(updateData.password, salt);
    } else {
      delete updateData.password;
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { ...updateData, ...(role && { role }) },
      {
        new: true,
        runValidators: true
      }
    ).select('-password');

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private/Admin
export const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Prevent deleting yourself
    if (user._id.toString() === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'You cannot delete your own account'
      });
    }

    await user.deleteOne();

    res.status(200).json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
