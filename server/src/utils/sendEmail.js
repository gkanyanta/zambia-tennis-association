import nodemailer from 'nodemailer';

const sendEmail = async (options) => {
  try {
    console.log('Attempting to send email...');
    console.log('SMTP Host:', process.env.SMTP_HOST);
    console.log('SMTP Port:', process.env.SMTP_PORT);
    console.log('SMTP User:', process.env.SMTP_USER);

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT),
      secure: true, // true for 465 (SSL), false for 587 (TLS)
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      },
      connectionTimeout: 10000, // 10 second timeout
      greetingTimeout: 10000,
      socketTimeout: 15000
    });

    // Verify connection
    console.log('Verifying SMTP connection...');
    await transporter.verify();
    console.log('SMTP connection verified successfully');

    const message = {
      from: `${process.env.EMAIL_FROM} <${process.env.SMTP_USER}>`,
      to: options.email,
      subject: options.subject,
      html: options.html
    };

    console.log('Sending email to:', options.email);
    const info = await transporter.sendMail(message);
    console.log('Message sent successfully:', info.messageId);
    return info;
  } catch (error) {
    console.error('Email sending error details:', {
      message: error.message,
      code: error.code,
      command: error.command,
      response: error.response
    });
    throw error;
  }
};

export default sendEmail;
