const nodemailer = require('nodemailer');
const { createEvent } = require('ics');

const emailUser = process.env.EMAIL_USER || '';
const emailHost = process.env.EMAIL_HOST || 'smtp.gmail.com';
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

/**
 * Universal Mailer Utility
 * Sends emails via Nodemailer with optional interactive Google/Outlook Calendar invites (method=REQUEST).
 */
async function sendUniversalMail({ to, subject, html, text, eventDetails, calendarInvite }) {
  try {
    const fromAddress = process.env.EMAIL_USER
      ? `"CareConnect Platform" <${process.env.EMAIL_USER}>`
      : '"CareConnect Platform" <support@careconnect.app>';

    // Override recipient if sending to dummy test domains or in test mode
    const isDummyDomain = to && (to.endsWith('@example.com') || to.endsWith('.invalid') || to.endsWith('.test'));
    const fallbackTestRecipient = process.env.EMAIL_TEST_RECIPIENT || process.env.EMAIL_USER;

    const targetRecipient = (process.env.EMAIL_TEST_MODE === 'true' || isDummyDomain) && fallbackTestRecipient
      ? fallbackTestRecipient
      : to;

    const mailOptions = {
      from: fromAddress,
      to: targetRecipient,
      subject,
      text: text || '',
      html: html || `<p>${text || subject}</p>`,
      attachments: [],
    };

    // 1. Generate interactive .ics calendar event if eventDetails are provided
    if (eventDetails) {
      const {
        title = 'Medical Consultation — CareConnect',
        description = 'CareConnect Appointment',
        start, // Array: [YYYY, MM, DD, HH, mm]
        durationMinutes = 30,
        organizerName = 'CareConnect Healthcare Center',
        organizerEmail = process.env.SUPPORT_EMAIL || 'support@careconnect.app',
      } = eventDetails;

      if (Array.isArray(start) && start.length >= 5) {
        const { error, value } = createEvent({
          title,
          description,
          start,
          duration: { minutes: durationMinutes },
          organizer: { name: organizerName, email: organizerEmail },
          status: 'CONFIRMED',
          busyStatus: 'BUSY',
        });

        if (!error && value) {
          mailOptions.attachments.push({
            filename: 'invite.ics',
            content: value,
            contentType: 'text/calendar; method=REQUEST',
          });
        } else if (error) {
          console.warn('[UniversalMailer] ICS generation warning:', error);
        }
      }
    } else if (calendarInvite) {
      // Fallback raw .ics string attachment
      mailOptions.attachments.push({
        filename: 'appointment.ics',
        content: calendarInvite,
        contentType: 'text/calendar; method=REQUEST',
      });
    }

    const info = await transporter.sendMail(mailOptions);
    console.log('[UniversalMailer] Email sent successfully to %s (Message ID: %s)', targetRecipient, info.messageId);
    return true;
  } catch (error) {
    console.error('[UniversalMailer] Error sending email to %s:', to, error.message);
    return false;
  }
}

module.exports = { sendUniversalMail };
