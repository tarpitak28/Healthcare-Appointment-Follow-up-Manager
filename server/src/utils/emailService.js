const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.ethereal.email',
  port: process.env.EMAIL_PORT || 587,
  auth: {
    user: process.env.EMAIL_USER || 'your_test_user',
    pass: process.env.EMAIL_PASS || 'your_test_password',
  },
});

async function sendEmail({ to, subject, text, html, calendarInvite }) {
  try {
    const mailOptions = {
      from: '"Healthcare Platform" <support@healthcareportal.com>',
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
    console.log('Email sent: %s', info.messageId);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
}

module.exports = { sendEmail };
