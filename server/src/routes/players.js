import express from 'express';
import User from '../models/User.js';
import { protect, authorize } from '../middleware/auth.js';
import xlsx from 'xlsx';
import { generateNextZPIN } from '../utils/generateZPIN.js';

const router = express.Router();

// @desc    Get all players (public)
// @route   GET /api/players
// @access  Public
router.get('/', async (req, res) => {
  try {
    const players = await User.find({ role: 'player' })
      .select('-password')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: players.length,
      data: players
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @desc    Get next available ZPIN for a membership type
// @route   GET /api/players/next-zpin/:membershipType
// @access  Private (admin, staff)
router.get('/next-zpin/:membershipType', protect, authorize('admin', 'staff'), async (req, res) => {
  try {
    const { membershipType } = req.params;

    if (!['junior', 'adult', 'family'].includes(membershipType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid membership type. Must be junior, adult, or family'
      });
    }

    const nextZpin = await generateNextZPIN(membershipType);

    res.status(200).json({
      success: true,
      data: {
        zpin: nextZpin,
        membershipType
      }
    });
  } catch (error) {
    console.error('Get next ZPIN error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate next ZPIN',
      error: error.message
    });
  }
});

// @desc    Export all players to Excel
// @route   GET /api/players/export/excel
// @access  Private (admin, staff)
router.get('/export/excel', protect, authorize('admin', 'staff'), async (req, res) => {
  try {
    // Fetch all players from database
    const players = await User.find({ role: 'player' })
      .select('-password -resetPasswordToken -resetPasswordExpire -__v -avatar -lastPaymentId')
      .sort({ lastName: 1, firstName: 1 });

    // Format data for Excel
    const excelData = players.map(player => {
      // Calculate age from date of birth
      const age = player.dateOfBirth
        ? Math.floor((new Date() - new Date(player.dateOfBirth)) / (365.25 * 24 * 60 * 60 * 1000))
        : '';

      // Filter out auto-generated emails
      const displayEmail = player.email && !player.email.includes('@noemail.zambiatennis.local')
        ? player.email
        : '';

      // Format arrears as text
      const arrearsText = player.arrears && player.arrears.length > 0
        ? player.arrears.map(a => `${a.year}: K${a.amount}`).join('; ')
        : '';

      return {
        'ZPIN': player.zpin || '',
        'First Name': player.firstName || '',
        'Last Name': player.lastName || '',
        'Email': displayEmail,
        'Phone': player.phone || '',
        'Gender': player.gender || '',
        'Date of Birth': player.dateOfBirth ? new Date(player.dateOfBirth).toLocaleDateString() : '',
        'Age': age,
        'Parent/Guardian Name': player.parentGuardianName || '',
        'Parent/Guardian Phone': player.parentGuardianPhone || '',
        'Parent/Guardian Email': player.parentGuardianEmail || '',
        'Club': player.club || '',
        'Membership Type': player.membershipType || '',
        'Membership Status': player.membershipStatus || '',
        'Membership Expiry': player.membershipExpiry ? new Date(player.membershipExpiry).toLocaleDateString() : '',
        'Last Payment Date': player.lastPaymentDate ? new Date(player.lastPaymentDate).toLocaleDateString() : '',
        'Last Payment Amount': player.lastPaymentAmount || '',
        'Outstanding Balance': player.outstandingBalance || 0,
        'Arrears': arrearsText,
        'International Player': player.isInternational ? 'Yes' : 'No',
        'Email Verified': player.isEmailVerified ? 'Yes' : 'No',
        'Account Created': player.createdAt ? new Date(player.createdAt).toLocaleDateString() : ''
      };
    });

    // Create workbook and worksheet
    const workbook = xlsx.utils.book_new();
    const worksheet = xlsx.utils.json_to_sheet(excelData);

    // Set column widths for better readability
    const columnWidths = [
      { wch: 12 }, // ZPIN
      { wch: 15 }, // First Name
      { wch: 15 }, // Last Name
      { wch: 25 }, // Email
      { wch: 15 }, // Phone
      { wch: 10 }, // Gender
      { wch: 15 }, // Date of Birth
      { wch: 8 },  // Age
      { wch: 20 }, // Parent/Guardian Name
      { wch: 18 }, // Parent/Guardian Phone
      { wch: 25 }, // Parent/Guardian Email
      { wch: 20 }, // Club
      { wch: 15 }, // Membership Type
      { wch: 18 }, // Membership Status
      { wch: 18 }, // Membership Expiry
      { wch: 18 }, // Last Payment Date
      { wch: 18 }, // Last Payment Amount
      { wch: 18 }, // Outstanding Balance
      { wch: 30 }, // Arrears
      { wch: 18 }, // International Player
      { wch: 15 }, // Email Verified
      { wch: 15 }  // Account Created
    ];
    worksheet['!cols'] = columnWidths;

    // Add worksheet to workbook
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Players');

    // Generate buffer
    const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // Set response headers
    const filename = `ZTA_Players_Export_${new Date().toISOString().split('T')[0]}.xlsx`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

    // Send file
    res.send(buffer);
  } catch (error) {
    console.error('Excel export error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export players to Excel',
      error: error.message
    });
  }
});

export default router;
