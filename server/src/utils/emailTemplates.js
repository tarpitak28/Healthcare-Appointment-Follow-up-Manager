/**
 * HealthPulse Universal HTML Email Template Builder
 * Generates responsive, enterprise-grade HTML email cards with brand header, structured metadata, and CTAs.
 */

// Base Layout Wrapper
function wrapInBaseLayout({ title, contentHtml }) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { margin: 0; padding: 0; background-color: #0f172a; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; -webkit-font-smoothing: antialiased; }
    .container { max-width: 600px; margin: 20px auto; background: #1e293b; border-radius: 16px; overflow: hidden; border: 1px solid #334155; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5); }
    .header { background: linear-gradient(135deg, #4f46e5 0%, #3730a3 100%); padding: 32px 24px; text-align: center; }
    .header h1 { margin: 0; color: #ffffff; font-size: 24px; font-weight: 800; tracking-tight; }
    .header p { margin: 6px 0 0 0; color: #c7d2fe; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1.5px; }
    .content { padding: 32px 24px; color: #e2e8f0; }
    .card { background: #0f172a; border: 1px solid #334155; border-radius: 12px; padding: 20px; margin: 20px 0; }
    .meta-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #1e293b; font-size: 13px; }
    .meta-row:last-child { border-bottom: none; }
    .meta-label { color: #94a3b8; font-weight: 600; }
    .meta-value { color: #f8fafc; font-weight: 700; text-align: right; }
    .badge-emerald { background: rgba(16, 185, 129, 0.2); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3); padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: 800; display: inline-block; }
    .badge-amber { background: rgba(245, 158, 11, 0.2); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.3); padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: 800; display: inline-block; }
    .badge-red { background: rgba(239, 68, 68, 0.2); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.3); padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: 800; display: inline-block; }
    .btn-primary { display: inline-block; background: #4f46e5; color: #ffffff !important; text-decoration: none; font-weight: 700; font-size: 13px; padding: 12px 24px; border-radius: 10px; box-shadow: 0 4px 12px rgba(79, 70, 229, 0.4); margin-top: 16px; }
    .footer { background: #090d16; padding: 24px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #1e293b; }
    .footer a { color: #818cf8; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🏥 HealthPulse</h1>
      <p>Healthcare & Clinical Follow-Up Platform</p>
    </div>
    <div class="content">
      ${contentHtml}
    </div>
    <div class="footer">
      <p style="margin: 0 0 6px 0;"><strong>HealthPulse Hospital & Care Center</strong></p>
      <p style="margin: 0 0 10px 0;">Automated Transactional Notification • Support: <a href="mailto:support@healthpulse.app">support@healthpulse.app</a></p>
      <p style="margin: 0; font-size: 10px; color: #475569;">This email contains confidential medical appointment details intended solely for the recipient.</p>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * 1. Booking Confirmation Email (Patient Version)
 */
function bookingConfirmationPatient({ patientName, doctorName, specialization, appointmentDate, startTime, endTime, symptoms }) {
  const contentHtml = `
    <h2 style="color: #ffffff; font-size: 18px; margin-top: 0;">Appointment Confirmed! 🎉</h2>
    <p style="color: #cbd5e1; font-size: 14px; line-height: 1.5;">
      Hello <strong>${patientName}</strong>, your medical consultation has been successfully booked and confirmed.
    </p>

    <div class="card">
      <div style="margin-bottom: 12px;">
        <span class="badge-emerald">Status: CONFIRMED</span>
      </div>

      <div class="meta-row">
        <span class="meta-label">Doctor</span>
        <span class="meta-value">Dr. ${doctorName}</span>
      </div>
      <div class="meta-row">
        <span class="meta-label">Specialization</span>
        <span class="meta-value">${specialization || 'General Physician'}</span>
      </div>
      <div class="meta-row">
        <span class="meta-label">Date</span>
        <span class="meta-value">${appointmentDate}</span>
      </div>
      <div class="meta-row">
        <span class="meta-label">Time Slot</span>
        <span class="meta-value">${startTime} – ${endTime}</span>
      </div>
      <div class="meta-row">
        <span class="meta-label">Symptoms Submitted</span>
        <span class="meta-value">${symptoms || 'General Consultation'}</span>
      </div>
    </div>

    <p style="color: #94a3b8; font-size: 12px;">
      ℹ️ <strong>Google Calendar Sync:</strong> An interactive calendar invite file (<code>invite.ics</code>) is attached to this email. You can accept it directly in your inbox or add it to your calendar.
    </p>
  `;

  return wrapInBaseLayout({ title: 'Appointment Confirmation — HealthPulse', contentHtml });
}

/**
 * 2. Booking Notification Email (Doctor Version)
 */
function bookingConfirmationDoctor({ doctorName, patientName, appointmentDate, startTime, endTime, chiefComplaint, symptoms, urgencyLevel }) {
  const urgencyBadge = urgencyLevel === 'HIGH'
    ? '<span class="badge-red">Urgency: HIGH</span>'
    : urgencyLevel === 'MEDIUM'
    ? '<span class="badge-amber">Urgency: MEDIUM</span>'
    : '<span class="badge-emerald">Urgency: LOW</span>';

  const contentHtml = `
    <h2 style="color: #ffffff; font-size: 18px; margin-top: 0;">New Patient Booking Notification 👨‍⚕️</h2>
    <p style="color: #cbd5e1; font-size: 14px; line-height: 1.5;">
      Hello <strong>Dr. ${doctorName}</strong>, a new patient has booked a consultation slot in your schedule.
    </p>

    <div class="card">
      <div style="margin-bottom: 12px;">
        ${urgencyBadge}
      </div>

      <div class="meta-row">
        <span class="meta-label">Patient Name</span>
        <span class="meta-value">${patientName}</span>
      </div>
      <div class="meta-row">
        <span class="meta-label">Appointment Date</span>
        <span class="meta-value">${appointmentDate}</span>
      </div>
      <div class="meta-row">
        <span class="meta-label">Consultation Time</span>
        <span class="meta-value">${startTime} – ${endTime}</span>
      </div>
      <div class="meta-row">
        <span class="meta-label">Chief Complaint</span>
        <span class="meta-value">${chiefComplaint || 'N/A'}</span>
      </div>
      <div class="meta-row">
        <span class="meta-label">Raw Symptoms</span>
        <span class="meta-value">${symptoms || 'None specified'}</span>
      </div>
    </div>

    <p style="color: #94a3b8; font-size: 12px;">
      Log in to your <strong>Doctor Clinical Workspace</strong> to review AI pre-visit diagnostic question suggestions prior to the session.
    </p>
  `;

  return wrapInBaseLayout({ title: 'New Patient Booking — HealthPulse', contentHtml });
}

/**
 * 3. Appointment Cancellation Email
 */
function appointmentCancellation({ recipientName, doctorName, patientName, appointmentDate, startTime, reason }) {
  const contentHtml = `
    <h2 style="color: #f87171; font-size: 18px; margin-top: 0;">Appointment Cancelled ⚠️</h2>
    <p style="color: #cbd5e1; font-size: 14px; line-height: 1.5;">
      Hello <strong>${recipientName}</strong>, the following scheduled appointment has been cancelled.
    </p>

    <div class="card" style="border-color: rgba(239, 68, 68, 0.3);">
      <div style="margin-bottom: 12px;">
        <span class="badge-red">Status: CANCELLED</span>
      </div>

      <div class="meta-row">
        <span class="meta-label">Doctor</span>
        <span class="meta-value">Dr. ${doctorName}</span>
      </div>
      <div class="meta-row">
        <span class="meta-label">Patient</span>
        <span class="meta-value">${patientName}</span>
      </div>
      <div class="meta-row">
        <span class="meta-label">Date & Time</span>
        <span class="meta-value">${appointmentDate} at ${startTime}</span>
      </div>
      <div class="meta-row">
        <span class="meta-label">Reason</span>
        <span class="meta-value">${reason || 'Patient/Doctor cancellation request'}</span>
      </div>
    </div>

    <p style="color: #94a3b8; font-size: 12px;">
      If you need to select another date or doctor, please log in to the <strong>HealthPulse Patient Portal</strong>.
    </p>
  `;

  return wrapInBaseLayout({ title: 'Appointment Cancelled Notice — HealthPulse', contentHtml });
}

/**
 * 4. Doctor Leave Conflict Email (Patient Alert)
 */
function doctorLeaveConflict({ patientName, doctorName, appointmentDate, startTime, startDate, endDate }) {
  const contentHtml = `
    <h2 style="color: #fbbf24; font-size: 18px; margin-top: 0;">Urgent: Doctor Leave Reschedule Notice 🏖️</h2>
    <p style="color: #cbd5e1; font-size: 14px; line-height: 1.5;">
      Hello <strong>${patientName}</strong>, Dr. <strong>${doctorName}</strong> is unavailable from <strong>${startDate}</strong> to <strong>${endDate}</strong> due to scheduled hospital leave.
    </p>

    <div class="card" style="border-color: rgba(245, 158, 11, 0.3);">
      <div style="margin-bottom: 12px;">
        <span class="badge-amber">Status: CANCELLED DUE TO DOCTOR LEAVE</span>
      </div>

      <div class="meta-row">
        <span class="meta-label">Cancelled Appointment Date</span>
        <span class="meta-value">${appointmentDate}</span>
      </div>
      <div class="meta-row">
        <span class="meta-label">Cancelled Slot Time</span>
        <span class="meta-value">${startTime}</span>
      </div>
      <div class="meta-row">
        <span class="meta-label">Doctor</span>
        <span class="meta-value">Dr. ${doctorName}</span>
      </div>
    </div>

    <p style="color: #e2e8f0; font-size: 13px; font-weight: 600;">
      Please log in to your patient dashboard to choose an alternative doctor or date slot. We apologize for any inconvenience.
    </p>
  `;

  return wrapInBaseLayout({ title: 'Doctor Leave Cancellation — HealthPulse', contentHtml });
}

/**
 * 5. Daily Medication Reminder Email
 */
function medicationReminder({ patientName, medicineName, dosage, frequency, scheduledTime }) {
  const contentHtml = `
    <h2 style="color: #818cf8; font-size: 18px; margin-top: 0;">Medication Reminder 🔔</h2>
    <p style="color: #cbd5e1; font-size: 14px; line-height: 1.5;">
      Hello <strong>${patientName}</strong>, this is your scheduled reminder to take your prescribed medication.
    </p>

    <div class="card" style="border-color: rgba(129, 140, 248, 0.3);">
      <div class="meta-row">
        <span class="meta-label">Medication Name</span>
        <span class="meta-value">${medicineName}</span>
      </div>
      <div class="meta-row">
        <span class="meta-label">Prescribed Dosage</span>
        <span class="meta-value">${dosage || 'Standard Dosage'}</span>
      </div>
      <div class="meta-row">
        <span class="meta-label">Frequency</span>
        <span class="meta-value">${frequency || 'Daily'}</span>
      </div>
      <div class="meta-row">
        <span class="meta-label">Scheduled Time</span>
        <span class="meta-value">${scheduledTime}</span>
      </div>
    </div>

    <p style="color: #94a3b8; font-size: 12px;">
      Please follow the dosage instructions provided by your doctor.
    </p>
  `;

  return wrapInBaseLayout({ title: `Medication Reminder: ${medicineName} — HealthPulse`, contentHtml });
}

module.exports = {
  bookingConfirmationPatient,
  bookingConfirmationDoctor,
  appointmentCancellation,
  doctorLeaveConflict,
  medicationReminder,
};
