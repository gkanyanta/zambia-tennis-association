import Tournament from '../models/Tournament.js';
import sendEmail from '../utils/sendEmail.js';

// @desc    Get all tournaments
// @route   GET /api/tournaments
// @access  Public
export const getTournaments = async (req, res) => {
  try {
    const tournaments = await Tournament.find().sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: tournaments.length,
      data: tournaments
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get single tournament
// @route   GET /api/tournaments/:id
// @access  Public
export const getTournament = async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id).populate('registrations.user', 'firstName lastName email');

    if (!tournament) {
      return res.status(404).json({
        success: false,
        message: 'Tournament not found'
      });
    }

    res.status(200).json({
      success: true,
      data: tournament
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Create tournament
// @route   POST /api/tournaments
// @access  Private/Admin
export const createTournament = async (req, res) => {
  try {
    const tournament = await Tournament.create(req.body);

    res.status(201).json({
      success: true,
      data: tournament
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update tournament
// @route   PUT /api/tournaments/:id
// @access  Private/Admin
export const updateTournament = async (req, res) => {
  try {
    const tournament = await Tournament.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    if (!tournament) {
      return res.status(404).json({
        success: false,
        message: 'Tournament not found'
      });
    }

    res.status(200).json({
      success: true,
      data: tournament
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Register for tournament
// @route   POST /api/tournaments/:id/register
// @access  Private
export const registerForTournament = async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id);

    if (!tournament) {
      return res.status(404).json({
        success: false,
        message: 'Tournament not found'
      });
    }

    // Check if already registered
    const alreadyRegistered = tournament.registrations.find(
      reg => reg.user.toString() === req.user.id
    );

    if (alreadyRegistered) {
      return res.status(400).json({
        success: false,
        message: 'Already registered for this tournament'
      });
    }

    // Check if tournament is full
    if (tournament.maxParticipants && tournament.registrations.length >= tournament.maxParticipants) {
      return res.status(400).json({
        success: false,
        message: 'Tournament is full'
      });
    }

    // Add registration
    tournament.registrations.push({
      user: req.user.id,
      category: req.body.category,
      amount: tournament.entryFee,
      paymentStatus: tournament.entryFee > 0 ? 'pending' : 'paid'
    });

    await tournament.save();

    // Send confirmation email
    try {
      await sendEmail({
        email: req.user.email,
        subject: `Tournament Registration - ${tournament.name}`,
        html: `
          <h1>Registration Confirmed!</h1>
          <p>Dear ${req.user.firstName},</p>
          <p>You have successfully registered for <strong>${tournament.name}</strong>.</p>
          <p><strong>Details:</strong></p>
          <ul>
            <li>Date: ${tournament.date}</li>
            <li>Location: ${tournament.location}</li>
            <li>Category: ${req.body.category}</li>
            ${tournament.entryFee > 0 ? `<li>Entry Fee: K${tournament.entryFee} (Payment ${tournament.entryFee > 0 ? 'Pending' : 'Not Required'})</li>` : ''}
          </ul>
          <p>See you at the tournament!</p>
        `
      });
    } catch (emailError) {
      console.error('Email sending failed:', emailError);
    }

    res.status(200).json({
      success: true,
      message: 'Successfully registered for tournament',
      data: tournament
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete tournament
// @route   DELETE /api/tournaments/:id
// @access  Private/Admin
export const deleteTournament = async (req, res) => {
  try {
    const tournament = await Tournament.findByIdAndDelete(req.params.id);

    if (!tournament) {
      return res.status(404).json({
        success: false,
        message: 'Tournament not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Tournament deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
