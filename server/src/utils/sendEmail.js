import sgMail from '@sendgrid/mail';

const sendEmail = async (options) => {
  try {
    console.log('Attempting to send email via SendGrid...');
    console.log('From:', process.env.EMAIL_FROM);
    console.log('To:', options.email);
    console.log('Subject:', options.subject);

    // Set SendGrid API Key
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);

    const message = {
      to: options.email,
      from: process.env.EMAIL_FROM, // Must be a verified sender in SendGrid
      subject: options.subject,
      html: options.html
    };

    console.log('Sending email via SendGrid...');
    const response = await sgMail.send(message);
    console.log('Email sent successfully via SendGrid');
    console.log('Response status:', response[0].statusCode);

    return response;
  } catch (error) {
    console.error('SendGrid email error:', {
      message: error.message,
      code: error.code,
      response: error.response?.body
    });
    throw error;
  }
};

export default sendEmail;
