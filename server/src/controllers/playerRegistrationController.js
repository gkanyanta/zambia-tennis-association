import PlayerRegistration from '../models/PlayerRegistration.js';
import User from '../models/User.js';
import MembershipType from '../models/MembershipType.js';
import Transaction from '../models/Transaction.js';
import { generateNextZPIN } from '../utils/generateZPIN.js';
import { generateReceipt } from '../utils/generateReceipt.js';
import sendEmail from '../utils/sendEmail.js';

const LENCO_PUBLIC_KEY = process.env.LENCO_PUBLIC_KEY;

// Helper: calculate age from DOB
const calculateAge = (dob) => {
  const birthDate = new Date(dob);
  const today = new Date();
  return Math.floor((today.getTime() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
};

// Helper: determine membership type from age + international
const determineMembershipType = async (age, isInternational) => {
  if (isInternational) {
    const mt = await MembershipType.findOne({ code: 'zpin_international', isActive: true });
    return mt || { code: 'zpin_international', name: 'International ZPIN', amount: 500 };
  }
  if (age < 18) {
    const mt = await MembershipType.findOne({ code: 'zpin_junior', isActive: true });
    return mt || { code: 'zpin_junior', name: 'Junior ZPIN', amount: 100 };
  }
  const mt = await MembershipType.findOne({ code: 'zpin_senior', isActive: true });
  return mt || { code: 'zpin_senior', name: 'Senior ZPIN', amount: 250 };
};

// Helper: generate payment reference
const generateReference = (prefix = 'REG') => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
};

// ==================== PUBLIC ENDPOINTS ====================

// @desc    Submit registration (pay later)
// @route   POST /api/player-registration/submit
// @access  Public
export const submitRegistration = async (req, res) => {
  try {
    const {
      firstName, lastName, dateOfBirth, gender, phone, email, club,
      isInternational, parentGuardianName, parentGuardianPhone,
      parentGuardianEmail, proofOfAgeDocument
    } = req.body;

    // Validate required fields
    if (!firstName || !lastName || !dateOfBirth || !gender || !phone) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields: firstName, lastName, dateOfBirth, gender, phone'
      });
    }

    const age = calculateAge(dateOfBirth);

    // Validate junior requirements
    if (age < 18) {
      if (!parentGuardianName || !parentGuardianPhone) {
        return res.status(400).json({
          success: false,
          message: 'Parent/guardian name and phone are required for players under 18'
        });
      }
      if (!proofOfAgeDocument || !proofOfAgeDocument.url) {
        return res.status(400).json({
          success: false,
          message: 'Proof of age document is required for players under 18'
        });
      }
    }

    // Determine membership type and amount
    const membershipType = await determineMembershipType(age, isInternational);

    const registration = new PlayerRegistration({
      firstName,
      lastName,
      dateOfBirth,
      gender,
      phone,
      email,
      club,
      isInternational: isInternational || false,
      parentGuardianName,
      parentGuardianPhone,
      parentGuardianEmail,
      proofOfAgeDocument: age < 18 ? proofOfAgeDocument : undefined,
      status: 'pending_payment',
      membershipTypeCode: membershipType.code,
      membershipTypeName: membershipType.name,
      membershipTypeAmount: membershipType.amount,
      paymentAmount: membershipType.amount
    });

    await registration.save();

    res.status(201).json({
      success: true,
      message: 'Registration submitted successfully. Please complete payment to proceed.',
      data: {
        referenceNumber: registration.referenceNumber,
        amount: membershipType.amount,
        membershipType: membershipType.name,
        status: registration.status
      }
    });
  } catch (error) {
    console.error('Submit registration error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to submit registration'
    });
  }
};

// @desc    Submit registration and pay now
// @route   POST /api/player-registration/submit-and-pay
// @access  Public
export const submitAndPay = async (req, res) => {
  try {
    const {
      firstName, lastName, dateOfBirth, gender, phone, email, club,
      isInternational, parentGuardianName, parentGuardianPhone,
      parentGuardianEmail, proofOfAgeDocument
    } = req.body;

    // Validate required fields
    if (!firstName || !lastName || !dateOfBirth || !gender || !phone) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields: firstName, lastName, dateOfBirth, gender, phone'
      });
    }

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required for online payment'
      });
    }

    const age = calculateAge(dateOfBirth);

    // Validate junior requirements
    if (age < 18) {
      if (!parentGuardianName || !parentGuardianPhone) {
        return res.status(400).json({
          success: false,
          message: 'Parent/guardian name and phone are required for players under 18'
        });
      }
      if (!proofOfAgeDocument || !proofOfAgeDocument.url) {
        return res.status(400).json({
          success: false,
          message: 'Proof of age document is required for players under 18'
        });
      }
    }

    // Determine membership type and amount
    const membershipType = await determineMembershipType(age, isInternational);

    // Generate payment reference
    const paymentReference = generateReference('REG');

    const registration = new PlayerRegistration({
      firstName,
      lastName,
      dateOfBirth,
      gender,
      phone,
      email,
      club,
      isInternational: isInternational || false,
      parentGuardianName,
      parentGuardianPhone,
      parentGuardianEmail,
      proofOfAgeDocument: age < 18 ? proofOfAgeDocument : undefined,
      status: 'pending_payment',
      paymentReference,
      membershipTypeCode: membershipType.code,
      membershipTypeName: membershipType.name,
      membershipTypeAmount: membershipType.amount,
      paymentAmount: membershipType.amount
    });

    await registration.save();

    res.status(201).json({
      success: true,
      data: {
        referenceNumber: registration.referenceNumber,
        paymentReference,
        amount: membershipType.amount,
        email,
        publicKey: LENCO_PUBLIC_KEY,
        currency: 'ZMW',
        membershipType: membershipType.name
      }
    });
  } catch (error) {
    console.error('Submit and pay error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to submit registration'
    });
  }
};

// @desc    Verify registration payment
// @route   POST /api/player-registration/verify-payment
// @access  Public
export const verifyRegistrationPayment = async (req, res) => {
  try {
    const { paymentReference } = req.body;

    if (!paymentReference) {
      return res.status(400).json({
        success: false,
        message: 'Payment reference is required'
      });
    }

    const registration = await PlayerRegistration.findOne({ paymentReference });

    if (!registration) {
      return res.status(404).json({
        success: false,
        message: 'Registration not found for this payment reference'
      });
    }

    if (registration.status === 'pending_approval' || registration.status === 'approved') {
      return res.status(200).json({
        success: true,
        message: 'Payment already recorded',
        data: {
          referenceNumber: registration.referenceNumber,
          status: registration.status
        }
      });
    }

    // Update status to pending_approval
    registration.status = 'pending_approval';
    registration.paymentDate = new Date();
    registration.paymentMethod = 'online';
    await registration.save();

    res.status(200).json({
      success: true,
      message: 'Payment verified. Your application is now pending admin approval.',
      data: {
        referenceNumber: registration.referenceNumber,
        status: registration.status
      }
    });
  } catch (error) {
    console.error('Verify registration payment error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to verify payment'
    });
  }
};

// @desc    Lookup registration by reference number
// @route   GET /api/player-registration/lookup/:referenceNumber
// @access  Public
export const getRegistrationByReference = async (req, res) => {
  try {
    const { referenceNumber } = req.params;

    const registration = await PlayerRegistration.findOne({ referenceNumber });

    if (!registration) {
      return res.status(404).json({
        success: false,
        message: 'Registration not found'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        referenceNumber: registration.referenceNumber,
        firstName: registration.firstName,
        lastName: registration.lastName,
        membershipTypeName: registration.membershipTypeName,
        paymentAmount: registration.paymentAmount,
        status: registration.status,
        email: registration.email,
        createdAt: registration.createdAt
      }
    });
  } catch (error) {
    console.error('Lookup registration error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to lookup registration'
    });
  }
};

// @desc    Initialize pay-later payment
// @route   POST /api/player-registration/pay-later
// @access  Public
export const initializePayLaterPayment = async (req, res) => {
  try {
    const { referenceNumber, email } = req.body;

    if (!referenceNumber) {
      return res.status(400).json({
        success: false,
        message: 'Reference number is required'
      });
    }

    const registration = await PlayerRegistration.findOne({ referenceNumber });

    if (!registration) {
      return res.status(404).json({
        success: false,
        message: 'Registration not found'
      });
    }

    if (registration.status !== 'pending_payment') {
      return res.status(400).json({
        success: false,
        message: `Registration is already ${registration.status.replace('_', ' ')}`
      });
    }

    // Generate new payment reference
    const paymentReference = generateReference('REG');
    const paymentEmail = email || registration.email;

    if (!paymentEmail) {
      return res.status(400).json({
        success: false,
        message: 'Email is required for online payment'
      });
    }

    // Update registration with payment reference and email
    registration.paymentReference = paymentReference;
    if (email) registration.email = email;
    await registration.save();

    res.status(200).json({
      success: true,
      data: {
        referenceNumber: registration.referenceNumber,
        paymentReference,
        amount: registration.paymentAmount,
        email: paymentEmail,
        publicKey: LENCO_PUBLIC_KEY,
        currency: 'ZMW',
        membershipType: registration.membershipTypeName
      }
    });
  } catch (error) {
    console.error('Initialize pay-later payment error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to initialize payment'
    });
  }
};

// ==================== ADMIN ENDPOINTS ====================

// @desc    Get all registrations (paginated, with filters)
// @route   GET /api/player-registration
// @access  Private (Admin)
export const getRegistrations = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, search } = req.query;

    const query = {};

    if (status) {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { referenceNumber: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const total = await PlayerRegistration.countDocuments(query);
    const registrations = await PlayerRegistration.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    // Get status counts
    const statusCounts = await PlayerRegistration.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    const counts = {
      pending_payment: 0,
      pending_approval: 0,
      approved: 0,
      rejected: 0
    };
    statusCounts.forEach(s => { counts[s._id] = s.count; });

    res.status(200).json({
      success: true,
      data: {
        registrations,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        },
        statusCounts: counts
      }
    });
  } catch (error) {
    console.error('Get registrations error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get registrations'
    });
  }
};

// @desc    Get single registration
// @route   GET /api/player-registration/:id
// @access  Private (Admin)
export const getRegistration = async (req, res) => {
  try {
    const registration = await PlayerRegistration.findById(req.params.id)
      .populate('reviewedBy', 'firstName lastName')
      .populate('createdUserId', 'firstName lastName zpin');

    if (!registration) {
      return res.status(404).json({
        success: false,
        message: 'Registration not found'
      });
    }

    res.status(200).json({
      success: true,
      data: registration
    });
  } catch (error) {
    console.error('Get registration error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get registration'
    });
  }
};

// @desc    Update registration details (admin fixing typos etc.)
// @route   PUT /api/player-registration/:id
// @access  Private (Admin)
export const updateRegistration = async (req, res) => {
  try {
    const allowedFields = [
      'firstName', 'lastName', 'dateOfBirth', 'gender', 'phone', 'email',
      'club', 'isInternational', 'parentGuardianName', 'parentGuardianPhone',
      'parentGuardianEmail', 'adminNotes'
    ];

    const updateData = {};
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });

    // If DOB or international status changed, recalculate membership type
    if (updateData.dateOfBirth || updateData.isInternational !== undefined) {
      const registration = await PlayerRegistration.findById(req.params.id);
      if (!registration) {
        return res.status(404).json({ success: false, message: 'Registration not found' });
      }

      const dob = updateData.dateOfBirth || registration.dateOfBirth;
      const isIntl = updateData.isInternational !== undefined ? updateData.isInternational : registration.isInternational;
      const age = calculateAge(dob);
      const membershipType = await determineMembershipType(age, isIntl);

      updateData.membershipTypeCode = membershipType.code;
      updateData.membershipTypeName = membershipType.name;
      updateData.membershipTypeAmount = membershipType.amount;
      updateData.paymentAmount = membershipType.amount;
    }

    const registration = await PlayerRegistration.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!registration) {
      return res.status(404).json({
        success: false,
        message: 'Registration not found'
      });
    }

    res.status(200).json({
      success: true,
      data: registration
    });
  } catch (error) {
    console.error('Update registration error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update registration'
    });
  }
};

// @desc    Approve registration (create User)
// @route   POST /api/player-registration/:id/approve
// @access  Private (Admin)
export const approveRegistration = async (req, res) => {
  try {
    const { adminNotes } = req.body;

    const registration = await PlayerRegistration.findById(req.params.id);

    if (!registration) {
      return res.status(404).json({
        success: false,
        message: 'Registration not found'
      });
    }

    if (registration.status === 'approved') {
      return res.status(400).json({
        success: false,
        message: 'Registration has already been approved'
      });
    }

    if (registration.status !== 'pending_approval' && registration.status !== 'pending_payment') {
      return res.status(400).json({
        success: false,
        message: 'Registration must be in pending_payment or pending_approval status to approve. Current status: ' + registration.status
      });
    }

    // Determine whether payment has been made
    const hasPaid = registration.status === 'pending_approval' || !!registration.paymentDate;

    // Determine the user's membership type for ZPIN generation
    const age = calculateAge(registration.dateOfBirth);
    const membershipType = age < 18 ? 'junior' : 'adult';

    // Generate ZPIN
    const zpin = await generateNextZPIN(membershipType);

    // Create User record — if unpaid, membership is expired so player can pay later
    const userData = {
      firstName: registration.firstName,
      lastName: registration.lastName,
      dateOfBirth: registration.dateOfBirth,
      gender: registration.gender,
      phone: registration.phone,
      email: registration.email || undefined,
      club: registration.club || undefined,
      isInternational: registration.isInternational,
      parentGuardianName: registration.parentGuardianName || undefined,
      parentGuardianPhone: registration.parentGuardianPhone || undefined,
      parentGuardianEmail: registration.parentGuardianEmail || undefined,
      role: 'player',
      zpin,
      membershipType,
      membershipStatus: hasPaid ? 'active' : 'expired',
      ...(hasPaid ? {
        membershipExpiry: new Date(new Date().getFullYear() + 1, 0, 31), // End of next Jan
        lastPaymentDate: registration.paymentDate,
        lastPaymentAmount: registration.paymentAmount
      } : {})
    };

    const user = new User(userData);
    await user.save();

    // Update registration
    registration.status = 'approved';
    registration.reviewedBy = req.user._id;
    registration.reviewedAt = new Date();
    registration.createdUserId = user._id;
    if (adminNotes) registration.adminNotes = adminNotes;
    await registration.save();

    // Send confirmation email if email exists
    if (registration.email) {
      try {
        const statusText = hasPaid ? 'Active' : 'Expired (Payment Pending)';
        const nextSteps = hasPaid
          ? '<p>You can now participate in ZTA-sanctioned tournaments and activities.</p>'
          : `<p>Your registration has been approved but your membership is not yet active. To activate your ZPIN, please complete your membership payment of <strong>K${registration.paymentAmount}</strong> on our website.</p>`;

        await sendEmail({
          email: registration.email,
          subject: 'ZPIN Registration Approved - Zambia Tennis Association',
          html: `
            <h2>Registration Approved!</h2>
            <p>Dear ${registration.firstName},</p>
            <p>Your player registration has been approved by the Zambia Tennis Association.</p>
            <p><strong>Your Details:</strong></p>
            <ul>
              <li>ZPIN: <strong>${zpin}</strong></li>
              <li>Name: ${registration.firstName} ${registration.lastName}</li>
              <li>Membership Type: ${registration.membershipTypeName}</li>
              <li>Status: ${statusText}</li>
            </ul>
            ${nextSteps}
            <p>Best regards,<br>Zambia Tennis Association</p>
          `
        });
      } catch (emailError) {
        console.error('Failed to send approval email:', emailError);
      }
    }

    res.status(200).json({
      success: true,
      message: hasPaid
        ? 'Registration approved and player created successfully'
        : 'Registration approved. Player created with expired membership — awaiting ZPIN payment.',
      data: {
        registration,
        user: {
          _id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          zpin: user.zpin,
          membershipType: user.membershipType,
          membershipStatus: user.membershipStatus
        }
      }
    });
  } catch (error) {
    console.error('Approve registration error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to approve registration'
    });
  }
};

// @desc    Reject registration
// @route   POST /api/player-registration/:id/reject
// @access  Private (Admin)
export const rejectRegistration = async (req, res) => {
  try {
    const { rejectionReason } = req.body;

    if (!rejectionReason) {
      return res.status(400).json({
        success: false,
        message: 'Rejection reason is required'
      });
    }

    const registration = await PlayerRegistration.findById(req.params.id);

    if (!registration) {
      return res.status(404).json({
        success: false,
        message: 'Registration not found'
      });
    }

    if (registration.status === 'approved') {
      return res.status(400).json({
        success: false,
        message: 'Cannot reject an already approved registration'
      });
    }

    registration.status = 'rejected';
    registration.rejectionReason = rejectionReason;
    registration.reviewedBy = req.user._id;
    registration.reviewedAt = new Date();
    await registration.save();

    // Send rejection email if email exists
    if (registration.email) {
      try {
        await sendEmail({
          email: registration.email,
          subject: 'ZPIN Registration Update - Zambia Tennis Association',
          html: `
            <h2>Registration Update</h2>
            <p>Dear ${registration.firstName},</p>
            <p>We regret to inform you that your player registration application has not been approved.</p>
            <p><strong>Reason:</strong> ${rejectionReason}</p>
            <p>If you believe this is an error or would like to resubmit, please contact us.</p>
            <p>Best regards,<br>Zambia Tennis Association</p>
          `
        });
      } catch (emailError) {
        console.error('Failed to send rejection email:', emailError);
      }
    }

    res.status(200).json({
      success: true,
      message: 'Registration rejected',
      data: registration
    });
  } catch (error) {
    console.error('Reject registration error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to reject registration'
    });
  }
};

// @desc    Record manual/offline payment for a registration
// @route   POST /api/player-registration/:id/record-payment
// @access  Private (Admin)
export const recordManualPaymentForRegistration = async (req, res) => {
  try {
    const { paymentMethod, paymentReference, adminNotes } = req.body;

    if (!paymentMethod) {
      return res.status(400).json({
        success: false,
        message: 'Payment method is required'
      });
    }

    const registration = await PlayerRegistration.findById(req.params.id);

    if (!registration) {
      return res.status(404).json({
        success: false,
        message: 'Registration not found'
      });
    }

    if (registration.status !== 'pending_payment') {
      return res.status(400).json({
        success: false,
        message: 'Payment can only be recorded for registrations with pending_payment status'
      });
    }

    registration.status = 'pending_approval';
    registration.paymentMethod = paymentMethod;
    registration.paymentDate = new Date();
    if (paymentReference) registration.paymentReference = paymentReference;
    if (adminNotes) registration.adminNotes = adminNotes;
    await registration.save();

    // Create a transaction record for manual payment
    try {
      const transaction = new Transaction({
        reference: paymentReference || `MANUAL-REG-${registration.referenceNumber}`,
        type: 'registration',
        amount: registration.paymentAmount,
        currency: 'ZMW',
        payerName: `${registration.firstName} ${registration.lastName}`,
        payerEmail: registration.email,
        payerPhone: registration.phone,
        status: 'completed',
        paymentGateway: 'manual',
        paymentMethod: paymentMethod === 'mobile_money' ? 'mobile_money' : paymentMethod,
        relatedId: registration._id,
        relatedModel: 'PlayerRegistration',
        description: `Player Registration - ${registration.membershipTypeName} (Manual)`,
        metadata: {
          registrationRef: registration.referenceNumber,
          membershipType: registration.membershipTypeCode
        },
        paymentDate: new Date()
      });
      await transaction.save();
    } catch (txError) {
      console.error('Failed to create transaction for manual registration payment:', txError);
    }

    res.status(200).json({
      success: true,
      message: 'Payment recorded. Registration is now pending approval.',
      data: registration
    });
  } catch (error) {
    console.error('Record manual payment error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to record payment'
    });
  }
};
