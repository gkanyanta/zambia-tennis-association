import Contact from '../models/Contact.js';
import sendEmail from '../utils/sendEmail.js';

// @desc    Submit contact form
// @route   POST /api/contact
// @access  Public
export const submitContactForm = async (req, res) => {
  try {
    const { name, email, phone, subject, message } = req.body;

    // Create contact submission in database
    const contact = await Contact.create({
      name,
      email,
      phone,
      subject,
      message
    });

    // Send email to info@zambiatennis.com
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c5282;">New Contact Form Submission</h2>
        <div style="background-color: #f7fafc; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          ${phone ? `<p><strong>Phone:</strong> ${phone}</p>` : ''}
          <p><strong>Subject:</strong> ${subject}</p>
          <p><strong>Message:</strong></p>
          <p style="white-space: pre-wrap;">${message}</p>
        </div>
        <p style="color: #718096; font-size: 12px;">
          Submission ID: ${contact._id}<br>
          Submitted: ${new Date(contact.createdAt).toLocaleString()}
        </p>
      </div>
    `;

    // Send to info email
    await sendEmail({
      email: process.env.INFO_EMAIL || 'info@zambiatennis.com',
      subject: `Contact Form: ${subject}`,
      html: emailHtml
    });

    // Send confirmation to user
    const confirmationHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c5282;">Thank You for Contacting Zambia Tennis Association</h2>
        <p>Dear ${name},</p>
        <p>We have received your message and will get back to you as soon as possible.</p>
        <div style="background-color: #f7fafc; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Your Message:</strong></p>
          <p><strong>Subject:</strong> ${subject}</p>
          <p style="white-space: pre-wrap;">${message}</p>
        </div>
        <p>Best regards,<br>
        Zambia Tennis Association</p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
        <p style="color: #718096; font-size: 12px;">
          Olympic Youth Development Centre<br>
          Independence Avenue, Lusaka, Zambia<br>
          Email: info@zambiatennis.com
        </p>
      </div>
    `;

    await sendEmail({
      email: email,
      subject: 'We received your message - Zambia Tennis Association',
      html: confirmationHtml
    });

    res.status(201).json({
      success: true,
      message: 'Your message has been sent successfully. We will get back to you soon.',
      data: contact
    });
  } catch (error) {
    console.error('Contact form error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send your message. Please try again later.',
      error: error.message
    });
  }
};

// @desc    Get all contact submissions (admin)
// @route   GET /api/contact
// @access  Private/Admin
export const getContactSubmissions = async (req, res) => {
  try {
    const { status, limit = 50, page = 1 } = req.query;

    const query = status ? { status } : {};

    const contacts = await Contact.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Contact.countDocuments(query);

    res.status(200).json({
      success: true,
      count: contacts.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      data: contacts
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update contact submission status (admin)
// @route   PUT /api/contact/:id
// @access  Private/Admin
export const updateContactStatus = async (req, res) => {
  try {
    const { status } = req.body;

    const contact = await Contact.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    );

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact submission not found'
      });
    }

    res.status(200).json({
      success: true,
      data: contact
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
