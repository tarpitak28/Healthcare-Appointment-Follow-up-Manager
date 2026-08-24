export const getGoogleCalendarUrl = (doctorName, date, startTime, endTime, symptoms) => {
  try {
    const dateStr = String(date).split('T')[0];
    const formatTime = (timeStr) => {
      const d = new Date(`${dateStr}T${timeStr}:00.000Z`);
      return d.toISOString().replace(/-|:|\.\d\d\d/g, '');
    };

    const start = formatTime(startTime);
    const end = formatTime(endTime);
    const title = encodeURIComponent(`Consultation with Dr. ${doctorName || 'Doctor'}`);
    const details = encodeURIComponent(`Symptoms: ${symptoms || 'N/A'}\n\nPlease arrive 5 minutes early.`);

    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${start}/${end}&details=${details}&location=Healthcare+Clinic`;
  } catch (err) {
    return 'https://calendar.google.com';
  }
};

export const downloadICS = (doctorName, date, startTime, endTime, symptoms) => {
  try {
    const dateStr = String(date).split('T')[0];
    const formatTime = (timeStr) => {
      const d = new Date(`${dateStr}T${timeStr}:00.000Z`);
      return d.toISOString().replace(/-|:|\.\d\d\d/g, '');
    };

    const icsData = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Healthcare Portal//Appointment Schedule//EN
BEGIN:VEVENT
UID:${Date.now()}@healthcareportal.com
DTSTAMP:${new Date().toISOString().replace(/-|:|\.\d\d\d/g, '')}
DTSTART:${formatTime(startTime)}
DTEND:${formatTime(endTime)}
SUMMARY:Consultation with Dr. ${doctorName || 'Doctor'}
DESCRIPTION:Symptoms: ${symptoms || 'N/A'}
LOCATION:Healthcare Clinic
END:VEVENT
END:VCALENDAR`;

    const blob = new Blob([icsData], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute('download', `appointment_dr_${String(doctorName || 'Doctor').replace(/\s+/g, '_')}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (err) {
    console.error('Failed to download .ics invite:', err);
  }
};
