const nodemailer = require('nodemailer');

const emailUser = process.env.EMAIL_USER || '';
const emailHost = process.env.EMAIL_HOST || 'smtp.ethereal.email';
const isGmail = emailHost.includes('gmail') || emailUser.endsWith('@gmail.com');

const transportConfig = isGmail
  ? {
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    }
  : {
      host: emailHost,
      port: parseInt(process.env.EMAIL_PORT || '587', 10),
      secure: parseInt(process.env.EMAIL_PORT || '587', 10) === 465,
      auth: {
        user: process.env.EMAIL_USER || 'your_test_user',
        pass: process.env.EMAIL_PASS || 'your_test_password',
      },
    };

const transporter = nodemailer.createTransport(transportConfig);

async function sendEmail({ to, subject, text, html, calendarInvite }) {
  try {
    const fromAddress = process.env.EMAIL_USER
      ? `"HealthPulse Platform" <${process.env.EMAIL_USER}>`
      : '"HealthPulse Platform" <support@healthpulse.app>';

    // Override recipient if sending to dummy domains (e.g. example.com) or in test mode
    const isDummyDomain = to && (to.endsWith('@example.com') || to.endsWith('.invalid') || to.endsWith('.test'));
    const fallbackTestRecipient = process.env.EMAIL_TEST_RECIPIENT || process.env.EMAIL_USER;

    const targetRecipient = (process.env.EMAIL_TEST_MODE === 'true' || isDummyDomain) && fallbackTestRecipient
      ? fallbackTestRecipient
      : to;

    const mailOptions = {
      from: fromAddress,
      to: targetRecipient,
      subject,
      text,
      html: html || `<p>${text}</p>`,
    };

    // Attach calendar .ics file if provided
    if (calendarInvite) {
      mailOptions.attachments = [
        {
          filename: 'appointment.ics',
          content: calendarInvite,
          contentType: 'text/calendar',
        },
      ];
    }

    const info = await transporter.sendMail(mailOptions);
    console.log('[EmailService] Email sent successfully to %s (Message ID: %s)', targetRecipient, info.messageId);
    return true;
  } catch (error) {
    console.error('[EmailService] Error sending email to %s:', to, error.message);
    return false;
  }
}

module.exports = { sendEmail };
