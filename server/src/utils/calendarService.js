function generateIcsFile({ title, description, startTime, endTime, date, location }) {
  const startDateTime = new Date(`${date.toISOString().split('T')[0]}T${startTime}:00`).toISOString().replace(/-|:|\.\d\d\d/g, '');
  const endDateTime = new Date(`${date.toISOString().split('T')[0]}T${endTime}:00`).toISOString().replace(/-|:|\.\d\d\d/g, '');

  return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Healthcare Portal//Appointment Schedule//EN
BEGIN:VEVENT
UID:${Date.now()}@healthcareportal.com
DTSTAMP:${new Date().toISOString().replace(/-|:|\.\d\d\d/g, '')}
DTSTART:${startDateTime}
DTEND:${endDateTime}
SUMMARY:${title}
DESCRIPTION:${description}
LOCATION:${location || 'Online / Hospital Clinic'}
END:VEVENT
END:VCALENDAR`;
}

module.exports = { generateIcsFile };
