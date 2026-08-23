const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
	host: process.env.EMAIL_HOST || 'smtp.mailtrap.io',
	port: process.env.EMAIL_PORT || 2525,
	auth: {
		user: process.env.EMAIL_USER || '',
		pass: process.env.EMAIL_PASS || '',
	},
});

async function sendEmail({ to, subject, html, text }) {
	try {
		if (!process.env.EMAIL_USER || process.env.EMAIL_USER === 'your_email_user') {
			console.log(`[Mock Email Sent] To: ${to} | Subject: ${subject}`);
			return true;
		}

		const info = await transporter.sendMail({
			from: '"Healthcare Platform" <no-reply@healthcare.com>',
			to,
			subject,
			text,
			html,
		});

		console.log('Email sent: %s', info.messageId);
		return true;
	} catch (error) {
		console.error('Email sending failed:', error);
		return false;
	}
}

module.exports = {
	sendEmail,
};
