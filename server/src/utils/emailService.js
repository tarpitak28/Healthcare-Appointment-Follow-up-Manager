const { sendUniversalMail } = require('./universalMailer');

async function sendEmail({ to, subject, text, html, eventDetails, calendarInvite }) {
  return await sendUniversalMail({
    to,
    subject,
    text,
    html,
    eventDetails,
    calendarInvite,
  });
}

module.exports = { sendEmail, sendUniversalMail };
