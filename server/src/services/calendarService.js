const { google } = require('googleapis');
const prisma = require('../config/db');

function createOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/api/auth/google/callback'
  );
}

async function getAuthenticatedClient(userId) {
  if (!userId) return null;

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

  // Persist silently refreshed access tokens
  oauth2Client.on('tokens', async (tokens) => {
    if (tokens.access_token) {
      try {
        await prisma.googleToken.update({
          where: { userId },
          data: {
            accessToken: tokens.access_token,
            ...(tokens.expiry_date && { expiresAt: new Date(tokens.expiry_date) }),
            ...(tokens.refresh_token && { refreshToken: tokens.refresh_token }),
          },
        });
      } catch (err) {
        console.error(`Failed to persist refreshed Google token for user ${userId}:`, err.message);
      }
    }
  });

  return oauth2Client;
}

/**
 * 1. Create Dual-Synced Google Calendar Event
 * Delegates dual-sync to Google by placing both Patient and Doctor in the attendees array.
 */
async function createCalendarEvent(userId, appointmentDetails) {
  try {
    const auth = await getAuthenticatedClient(userId);
    if (!auth) {
      console.log(`[Google Calendar] No OAuth token found for user ${userId}. Skipping live Google Calendar creation.`);
      return null;
    }

    const calendar = google.calendar({ version: 'v3', auth });

    const {
      appointmentDate,
      startTime,
      endTime,
      doctorName,
      doctorEmail,
      patientName,
      patientEmail,
      symptoms,
    } = appointmentDetails;

    const dateStr = new Date(appointmentDate).toISOString().split('T')[0];
    const startDateTime = new Date(`${dateStr}T${startTime}:00Z`);
    const endDateTime = new Date(`${dateStr}T${endTime}:00Z`);

    const attendees = [];
    if (patientEmail) attendees.push({ email: patientEmail, displayName: patientName || 'Patient' });
    if (doctorEmail) attendees.push({ email: doctorEmail, displayName: doctorName ? `Dr. ${doctorName}` : 'Doctor' });

    const event = {
      summary: `Medical Consultation: Dr. ${doctorName || 'Doctor'} & ${patientName || 'Patient'}`,
      description: `HealthPulse Appointment\nPatient: ${patientName || 'N/A'}\nDoctor: Dr. ${doctorName || 'N/A'}\nSymptoms: ${symptoms || 'General Consultation'}`,
      start: { dateTime: startDateTime.toISOString() },
      end: { dateTime: endDateTime.toISOString() },
      attendees,
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
      sendUpdates: 'all',
    });

    console.log(`[Google Calendar] Created event ${response.data.id} with dual-sync attendees.`);
    return response.data.id;
  } catch (error) {
    console.error('[Google Calendar Error] Event creation failed:', error.message);
    return null;
  }
}

/**
 * 2. Delete Google Calendar Event
 */
async function deleteCalendarEvent(userId, eventId) {
  try {
    if (!eventId) return false;

    const auth = await getAuthenticatedClient(userId);
    if (!auth) return false;

    const calendar = google.calendar({ version: 'v3', auth });
    await calendar.events.delete({
      calendarId: 'primary',
      eventId: eventId,
      sendUpdates: 'all',
    });

    console.log(`[Google Calendar] Successfully deleted event ${eventId}`);
    return true;
  } catch (error) {
    console.error('[Google Calendar Error] Event deletion failed:', error.message);
    return false;
  }
}

/**
 * 3. Update / Reschedule Google Calendar Event
 */
async function updateCalendarEvent(userId, eventId, appointmentDetails) {
  try {
    if (!eventId) return false;

    const auth = await getAuthenticatedClient(userId);
    if (!auth) return false;

    const calendar = google.calendar({ version: 'v3', auth });

    const {
      appointmentDate,
      startTime,
      endTime,
      doctorName,
      doctorEmail,
      patientName,
      patientEmail,
      symptoms,
    } = appointmentDetails;

    const dateStr = new Date(appointmentDate).toISOString().split('T')[0];
    const startDateTime = new Date(`${dateStr}T${startTime}:00Z`);
    const endDateTime = new Date(`${dateStr}T${endTime}:00Z`);

    const attendees = [];
    if (patientEmail) attendees.push({ email: patientEmail });
    if (doctorEmail) attendees.push({ email: doctorEmail });

    const event = {
      summary: `Rescheduled Consultation: Dr. ${doctorName || 'Doctor'} & ${patientName || 'Patient'}`,
      description: `HealthPulse Rescheduled Appointment\nPatient: ${patientName || 'N/A'}\nDoctor: Dr. ${doctorName || 'N/A'}\nSymptoms: ${symptoms || 'N/A'}`,
      start: { dateTime: startDateTime.toISOString() },
      end: { dateTime: endDateTime.toISOString() },
      attendees,
    };

    await calendar.events.patch({
      calendarId: 'primary',
      eventId: eventId,
      resource: event,
      sendUpdates: 'all',
    });

    console.log(`[Google Calendar] Successfully updated event ${eventId}`);
    return true;
  } catch (error) {
    console.error('[Google Calendar Error] Event update failed:', error.message);
    return false;
  }
}

module.exports = {
  createCalendarEvent,
  deleteCalendarEvent,
  updateCalendarEvent,
};
