import Flutterwave from 'flutterwave-node-v3';
import Donation from '../models/Donation.js';
import CoachListing from '../models/CoachListing.js';
import Coach from '../models/Coach.js';
import User from '../models/User.js';
import sendEmail from '../utils/sendEmail.js';

// Initialize Flutterwave (only if keys are configured)
let flw = null;
if (process.env.FLUTTERWAVE_PUBLIC_KEY && process.env.FLUTTERWAVE_SECRET_KEY) {
  flw = new Flutterwave(
    process.env.FLUTTERWAVE_PUBLIC_KEY,
    process.env.FLUTTERWAVE_SECRET_KEY
  );
}

// @desc    Initialize donation payment
// @route   POST /api/flutterwave/donations/initialize
// @access  Public
export const initializeDonation = async (req, res) => {
  try {
    // Check if Flutterwave is configured
    if (!flw) {
      return res.status(503).json({
        success: false,
        error: 'Payment service not configured. Please contact administrator.'
      });
    }

    const {
      amount,
      donorName,
      donorEmail,
      donorPhone,
      donationType,
      message,
      isAnonymous
    } = req.body

    // Validation
    if (!amount || amount < 1) {
      return res.status(400).json({ message: 'Invalid donation amount' })
    }
    if (!donorEmail) {
      return res.status(400).json({ message: 'Email is required' })
    }

    // Create donation record
    const donation = await Donation.create({
      donorName: donorName || 'Anonymous',
      donorEmail,
      donorPhone,
      amount,
      currency: 'ZMW',
      donationType: donationType || 'general',
      message,
      isAnonymous: isAnonymous || false,
      paymentGateway: 'flutterwave',
      status: 'pending',
      userId: req.user ? req.user.id : null
    })

    // Generate transaction reference
    const txRef = `ZTA-DON-${donation._id}-${Date.now()}`

    // Prepare payment payload
    const payload = {
      tx_ref: txRef,
      amount: amount,
      currency: 'ZMW',
      redirect_url: `${process.env.FRONTEND_URL}/donate/verify`,
      payment_options: 'card,mobilemoneyzambia,banktransfer,ussd',
      customer: {
        email: donorEmail,
        phonenumber: donorPhone,
        name: donorName || 'Anonymous Donor'
      },
      customizations: {
        title: 'Zambia Tennis Association',
        description: `Donation - ${donationType || 'General Support'}`,
        logo: `${process.env.FRONTEND_URL}/zta-logo.png`
      },
      meta: {
        donation_id: donation._id.toString(),
        donation_type: donationType
      }
    }

    // Initialize payment with Flutterwave
    const response = await flw.Charge.card(payload)

    // Update donation with transaction reference
    donation.paymentReference = txRef
    await donation.save()

    res.status(200).json({
      success: true,
      donationId: donation._id,
      paymentLink: response.data.link,
      transactionRef: txRef
    })
  } catch (error) {
    console.error('Donation initialization error:', error)
    res.status(500).json({
      message: 'Failed to initialize payment',
      error: error.message
    })
  }
}

// @desc    Verify donation payment
// @route   GET /api/flutterwave/donations/verify/:transactionId
// @access  Public
export const verifyDonation = async (req, res) => {
  try {
    // Check if Flutterwave is configured
    if (!flw) {
      return res.status(503).json({
        success: false,
        error: 'Payment service not configured. Please contact administrator.'
      });
    }

    const { transactionId } = req.params

    // Verify transaction with Flutterwave
    const response = await flw.Transaction.verify({ id: transactionId })

    if (response.data.status === 'successful' &&
        response.data.amount >= response.data.charged_amount &&
        response.data.currency === 'ZMW') {

      // Find donation by transaction reference
      const donation = await Donation.findOne({
        paymentReference: response.data.tx_ref
      })

      if (!donation) {
        return res.status(404).json({ message: 'Donation not found' })
      }

      // Check if already processed
      if (donation.status === 'completed') {
        return res.status(200).json({
          success: true,
          message: 'Payment already processed',
          donation
        })
      }

      // Update donation
      donation.status = 'completed'
      donation.flutterwaveTransactionId = transactionId
      donation.transactionId = response.data.flw_ref
      donation.paymentDate = new Date()
      donation.paymentMethod = response.data.payment_type
      donation.paymentProvider = response.data.card?.issuer || 'flutterwave'
      donation.metadata = response.data
      await donation.save()

      // Send thank you email
      if (!donation.thankYouEmailSent) {
        try {
          await sendEmail({
            email: donation.donorEmail,
            subject: 'Thank You for Your Donation - ZTA',
            html: `
              <h2>Thank You ${donation.isAnonymous ? '' : donation.donorName}!</h2>
              <p>Your generous donation of K${donation.amount.toFixed(2)} has been received.</p>
              <p><strong>Receipt Number:</strong> ${donation.receiptNumber}</p>
              <p><strong>Date:</strong> ${new Date(donation.paymentDate).toLocaleDateString()}</p>
              <p><strong>Purpose:</strong> ${donation.donationType.replace('_', ' ')}</p>
              ${donation.message ? `<p><strong>Your Message:</strong> ${donation.message}</p>` : ''}
              <p>Your support helps us develop tennis across Zambia. Thank you for making a difference!</p>
              <p>Best regards,<br>Zambia Tennis Association</p>
            `
          })
          donation.thankYouEmailSent = true
          await donation.save()
        } catch (emailError) {
          console.error('Thank you email error:', emailError)
        }
      }

      res.status(200).json({
        success: true,
        message: 'Payment verified successfully',
        donation
      })
    } else {
      // Payment failed
      const donation = await Donation.findOne({
        paymentReference: response.data.tx_ref
      })

      if (donation) {
        donation.status = 'failed'
        donation.metadata = response.data
        await donation.save()
      }

      res.status(400).json({
        success: false,
        message: 'Payment verification failed',
        data: response.data
      })
    }
  } catch (error) {
    console.error('Donation verification error:', error)
    res.status(500).json({
      message: 'Failed to verify payment',
      error: error.message
    })
  }
}

// @desc    Initialize coach listing payment
// @route   POST /api/flutterwave/coach-listings/initialize
// @access  Protected (Admin/Staff)
export const initializeCoachListingPayment = async (req, res) => {
  try {
    // Check if Flutterwave is configured
    if (!flw) {
      return res.status(503).json({
        success: false,
        error: 'Payment service not configured. Please contact administrator.'
      });
    }

    const { coachId, amount, duration, paymentMethod } = req.body

    // Validation
    if (!coachId || !amount || !duration) {
      return res.status(400).json({ message: 'Missing required fields' })
    }

    // Get coach
    const coach = await Coach.findById(coachId).populate('club')
    if (!coach) {
      return res.status(404).json({ message: 'Coach not found' })
    }

    // Create listing record
    const listing = await CoachListing.create({
      coach: coachId,
      amount,
      duration,
      paymentMethod: paymentMethod || 'flutterwave',
      paymentStatus: 'pending',
      recordedBy: req.user.id
    })

    // Generate transaction reference
    const txRef = `ZTA-COACH-${listing._id}-${Date.now()}`

    // Prepare payment payload
    const payload = {
      tx_ref: txRef,
      amount: amount,
      currency: 'ZMW',
      redirect_url: `${process.env.FRONTEND_URL}/admin/coaches/verify`,
      payment_options: 'card,mobilemoneyzambia,banktransfer',
      customer: {
        email: coach.email,
        phonenumber: coach.phone,
        name: `${coach.firstName} ${coach.lastName}`
      },
      customizations: {
        title: 'Zambia Tennis Association',
        description: `Coach Listing - ${duration} months`,
        logo: `${process.env.FRONTEND_URL}/zta-logo.png`
      },
      meta: {
        listing_id: listing._id.toString(),
        coach_id: coachId,
        duration: duration
      }
    }

    // Initialize payment
    const response = await flw.Charge.card(payload)

    // Update listing with transaction reference
    listing.transactionReference = txRef
    await listing.save()

    res.status(200).json({
      success: true,
      listingId: listing._id,
      paymentLink: response.data.link,
      transactionRef: txRef
    })
  } catch (error) {
    console.error('Coach listing payment initialization error:', error)
    res.status(500).json({
      message: 'Failed to initialize payment',
      error: error.message
    })
  }
}

// @desc    Verify coach listing payment
// @route   GET /api/flutterwave/coach-listings/verify/:transactionId
// @access  Protected (Admin/Staff)
export const verifyCoachListingPayment = async (req, res) => {
  try {
    // Check if Flutterwave is configured
    if (!flw) {
      return res.status(503).json({
        success: false,
        error: 'Payment service not configured. Please contact administrator.'
      });
    }

    const { transactionId } = req.params

    // Verify transaction with Flutterwave
    const response = await flw.Transaction.verify({ id: transactionId })

    if (response.data.status === 'successful' &&
        response.data.amount >= response.data.charged_amount &&
        response.data.currency === 'ZMW') {

      // Find listing by transaction reference
      const listing = await CoachListing.findOne({
        transactionReference: response.data.tx_ref
      }).populate('coach')

      if (!listing) {
        return res.status(404).json({ message: 'Listing not found' })
      }

      // Check if already processed
      if (listing.paymentStatus === 'completed') {
        return res.status(200).json({
          success: true,
          message: 'Payment already processed',
          listing
        })
      }

      // Calculate validity dates
      const validFrom = new Date()
      const validUntil = new Date()
      validUntil.setMonth(validUntil.getMonth() + listing.duration)

      // Update listing
      listing.paymentStatus = 'completed'
      listing.paymentDate = new Date()
      listing.validFrom = validFrom
      listing.validUntil = validUntil
      await listing.save()

      // Update coach listing status to active
      await Coach.findByIdAndUpdate(listing.coach._id, {
        listingStatus: 'active',
        currentListingExpiry: validUntil
      })

      res.status(200).json({
        success: true,
        message: 'Payment verified successfully',
        listing
      })
    } else {
      // Payment failed
      const listing = await CoachListing.findOne({
        transactionReference: response.data.tx_ref
      })

      if (listing) {
        listing.paymentStatus = 'failed'
        await listing.save()
      }

      res.status(400).json({
        success: false,
        message: 'Payment verification failed'
      })
    }
  } catch (error) {
    console.error('Coach listing verification error:', error)
    res.status(500).json({
      message: 'Failed to verify payment',
      error: error.message
    })
  }
}

// @desc    Handle Flutterwave webhook
// @route   POST /api/flutterwave/webhook
// @access  Public (Webhook)
export const handleWebhook = async (req, res) => {
  try {
    const secretHash = process.env.FLUTTERWAVE_SECRET_HASH

    // Check if Flutterwave webhook is configured
    if (!secretHash) {
      return res.status(503).json({
        success: false,
        error: 'Payment webhook not configured. Please contact administrator.'
      });
    }

    const signature = req.headers['verif-hash']

    if (!signature || signature !== secretHash) {
      return res.status(401).json({ message: 'Invalid signature' })
    }

    const payload = req.body

    // Handle successful payment
    if (payload.event === 'charge.completed' && payload.data.status === 'successful') {
      const { tx_ref, id, amount, currency } = payload.data

      // Check if it's a donation
      if (tx_ref.includes('DON')) {
        const donation = await Donation.findOne({ paymentReference: tx_ref })
        if (donation && donation.status === 'pending') {
          donation.status = 'completed'
          donation.flutterwaveTransactionId = id
          donation.paymentDate = new Date()
          await donation.save()
        }
      }

      // Check if it's a coach listing payment
      if (tx_ref.includes('COACH')) {
        const listing = await CoachListing.findOne({ transactionReference: tx_ref })
        if (listing && listing.paymentStatus === 'pending') {
          listing.paymentStatus = 'completed'
          listing.paymentDate = new Date()
          const validFrom = new Date()
          const validUntil = new Date()
          validUntil.setMonth(validUntil.getMonth() + listing.duration)
          listing.validFrom = validFrom
          listing.validUntil = validUntil
          await listing.save()

          // Update coach status
          await Coach.findByIdAndUpdate(listing.coach, {
            listingStatus: 'active',
            currentListingExpiry: validUntil
          })
        }
      }
    }

    res.status(200).json({ success: true })
  } catch (error) {
    console.error('Webhook error:', error)
    res.status(500).json({ message: 'Webhook processing failed' })
  }
}

// @desc    Get all donations (Admin)
// @route   GET /api/flutterwave/donations
// @access  Protected (Admin)
export const getDonations = async (req, res) => {
  try {
    const { status, donationType, startDate, endDate } = req.query
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 50
    const skip = (page - 1) * limit

    // Build filter
    const filter = {}
    if (status) filter.status = status
    if (donationType) filter.donationType = donationType
    if (startDate || endDate) {
      filter.createdAt = {}
      if (startDate) filter.createdAt.$gte = new Date(startDate)
      if (endDate) filter.createdAt.$lte = new Date(endDate)
    }

    const donations = await Donation.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('userId', 'firstName lastName email')
      .populate('recordedBy', 'firstName lastName')

    const total = await Donation.countDocuments(filter)

    res.status(200).json({
      success: true,
      donations,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Get donations error:', error)
    res.status(500).json({ message: 'Failed to retrieve donations' })
  }
}

// @desc    Get donation statistics
// @route   GET /api/flutterwave/donations/stats
// @access  Protected (Admin)
export const getDonationStats = async (req, res) => {
  try {
    const totalStats = await Donation.getTotalDonations()
    const byType = await Donation.getDonationsByType()

    // Get monthly donations for current year
    const year = new Date().getFullYear()
    const monthlyDonations = await Donation.aggregate([
      {
        $match: {
          status: 'completed',
          createdAt: {
            $gte: new Date(year, 0, 1),
            $lt: new Date(year + 1, 0, 1)
          }
        }
      },
      {
        $group: {
          _id: { $month: '$createdAt' },
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ])

    res.status(200).json({
      success: true,
      totalDonations: totalStats.total,
      totalCount: totalStats.count,
      byType,
      monthlyDonations
    })
  } catch (error) {
    console.error('Get donation stats error:', error)
    res.status(500).json({ message: 'Failed to retrieve statistics' })
  }
}
