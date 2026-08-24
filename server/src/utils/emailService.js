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
      ? `"Healthcare Platform" <${process.env.EMAIL_USER}>`
      : '"Healthcare Platform" <support@healthcareportal.com>';

    const mailOptions = {
      from: fromAddress,
      to,
      subject,
      text,
      html: html || `<p>${text}</p>`,
    };

    // Optional: Attach calendar `.ics` file if provided
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
    console.log('[EmailService] Email sent successfully: %s', info.messageId);
    return true;
  } catch (error) {
    console.error('[EmailService] Error sending email:', error.message);
    return false;
  }
}

module.exports = { sendEmail };
