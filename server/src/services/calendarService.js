const { google } = require('googleapis');
const prisma = require('../config/db');

function createOAuthClient() {
	return new google.auth.OAuth2(
		process.env.GOOGLE_CLIENT_ID,
		process.env.GOOGLE_CLIENT_SECRET,
		process.env.GOOGLE_REDIRECT_URI
	);
}

async function getAuthenticatedClient(userId) {
	const tokenRecord = await prisma.googleToken.findUnique({
		where: { userId },
	});

	if (!tokenRecord) return null;

	const oauth2Client = createOAuthClient();
	oauth2Client.setCredentials({
		access_token: tokenRecord.accessToken,
		refresh_token: tokenRecord.refreshToken,
		expiry_date: new Date(tokenRecord.expiresAt).getTime(),
	});

	return oauth2Client;
}

async function createCalendarEvent(userId, appointmentDetails) {
	try {
		const auth = await getAuthenticatedClient(userId);
		if (!auth) {
			console.log(`[Calendar Mock] No Google Calendar token found for user ${userId}`);
			return null;
		}

		const calendar = google.calendar({ version: 'v3', auth });

		const { appointmentDate, startTime, endTime, doctorName, patientName, chiefComplaint } = appointmentDetails;

		const dateStr = new Date(appointmentDate).toISOString().split('T')[0];
		const startDateTime = new Date(`${dateStr}T${startTime}:00Z`);
		const endDateTime = new Date(`${dateStr}T${endTime}:00Z`);

		const event = {
			summary: `Medical Consultation with Dr. ${doctorName || 'Doctor'}`,
			description: `Patient: ${patientName}\nChief Complaint: ${chiefComplaint || 'N/A'}`,
			start: { dateTime: startDateTime.toISOString() },
			end: { dateTime: endDateTime.toISOString() },
			reminders: {
				useDefault: false,
				overrides: [
					{ method: 'email', minutes: 24 * 60 },
					{ method: 'popup', minutes: 30 },
				],
			},
		};

		const response = await calendar.events.insert({
			calendarId: 'primary',
			resource: event,
		});

		return response.data.id;
	} catch (error) {
		console.error('Google Calendar event creation failed:', error.message);
		return null;
	}
}

async function deleteCalendarEvent(userId, eventId) {
	try {
		const auth = await getAuthenticatedClient(userId);
		if (!auth || !eventId) return false;

		const calendar = google.calendar({ version: 'v3', auth });
		await calendar.events.delete({
			calendarId: 'primary',
			eventId: eventId,
		});
		return true;
	} catch (error) {
		console.error('Google Calendar event deletion failed:', error.message);
		return false;
	}
}

module.exports = {
	createCalendarEvent,
	deleteCalendarEvent,
};
