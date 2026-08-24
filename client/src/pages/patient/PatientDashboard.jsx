import React, { useState, useEffect } from 'react';
import API from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { getGoogleCalendarUrl, downloadICS } from '../../utils/calendar';

export default function PatientDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [doctors, setDoctors] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [symptoms, setSymptoms] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [leaveNotice, setLeaveNotice] = useState('');

  // Profile edit state
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');

  const handleConnectCalendar = async () => {
    try {
      const res = await API.get(`/calendar/auth-url?userId=${user?.id || ''}`);
      if (res.data && res.data.url) {
        window.location.href = res.data.url;
      }
    } catch (error) {
      console.error('Failed to initiate Google OAuth', error);
      alert('Google Calendar OAuth URL generation failed. Please verify server configuration.');
    }
  };

  // Medication reminder state
  const [medicationReminders, setMedicationReminders] = useState([]);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [selectedMedicine, setSelectedMedicine] = useState(null);

  const [reminderTimes, setReminderTimes] = useState(['09:00']);
  const [reminderStartDate, setReminderStartDate] = useState('');
  const [reminderEndDate, setReminderEndDate] = useState('');

  const getLocalDateString = (date = new Date()) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  };

  const formatAppointmentDate = (dateValue) => {
    if (!dateValue) return '';

    // PostgreSQL DATE may come as "2026-08-26T00:00:00.000Z"
    // We only want the calendar date, without timezone conversion.
    const datePart = String(dateValue).split('T')[0];

    const [year, month, day] = datePart.split('-');

    return `${day}/${month}/${year}`;
  };

  const todayStr = getLocalDateString();

  useEffect(() => {
    fetchDoctors();
    fetchAppointments();
    fetchMedicationReminders();

    const searchParams = new URLSearchParams(window.location.search);
    const googleStatus = searchParams.get('google');
    if (googleStatus === 'connected') {
      setMessage('✅ Google Calendar connected successfully! Your appointments will sync automatically.');
    } else if (googleStatus === 'failed' || googleStatus === 'error') {
      setMessage('ℹ️ Note: Automated background Google Calendar OAuth sync requires production GOOGLE_CLIENT_ID & GOOGLE_CLIENT_SECRET in server/.env. You can use the "📅 Add to Google Calendar" button or "📥 Download .ics Invite" button on any booked appointment below!');
    }
  }, []);

  const fetchMedicationReminders = async () => {
    try {
      const response = await API.get('/medications');

      if (response.data.success) {
        setMedicationReminders(response.data.reminders);
      }
    } catch (error) {
      console.error('Failed to fetch medication reminders:', error);
    }
  };

  const saveMedicationReminder = async () => {
    if (!selectedMedicine) return;

    if (!reminderStartDate || !reminderEndDate) {
      alert('Please select start and end dates.');
      return;
    }

    try {
      const response = await API.post('/medications', {
        appointmentId: selectedMedicine.appointmentId,
        medicineName: selectedMedicine.name,
        dosage: selectedMedicine.dosage,
        frequency: selectedMedicine.frequency,
        reminderTimes,
        startDate: reminderStartDate,
        endDate: reminderEndDate,
      });

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to save reminder');
      }

      alert('Medication reminder saved successfully!');

      setShowReminderModal(false);

      // Reset form
      setSelectedMedicine(null);
      setReminderTimes(['09:00']);

      fetchMedicationReminders();
    } catch (error) {
      console.error('Save reminder error:', error);
      alert(error.response?.data?.message || error.message);
    }
  };

  const fetchDoctors = async () => {
    try {
      const res = await API.get('/patient/doctors');
      setDoctors(res.data.doctors);
    } catch (err) {
      console.error('Error fetching doctors', err);
    }
  };

  const fetchAppointments = async () => {
    try {
      const res = await API.get('/patient/appointments');
      setAppointments(res.data.appointments);
    } catch (err) {
      console.error('Error fetching appointments', err);
    }
  };

  const handleFetchSlots = async (docId, date) => {
    setSelectedDoctor(docId);
    setSelectedDate(date);
    setLeaveNotice('');
    if (!docId || !date) {
      setSlots([]);
      setSelectedSlot(null);
      return;
    }
    try {
      const res = await API.get(`/patient/doctors/${docId}/slots?date=${date}`);

      if (res.data.isOnLeave) {
        setLeaveNotice('Doctor is on leave on this date. Please choose another date.');
        setSlots([]);
        setSelectedSlot(null);
        return;
      }

      // Filter out past time slots if selected date is today
      let fetchedSlots = res.data.slots || [];
      if (date === todayStr) {
        const now = new Date();
        const currentTimeMinutes = now.getHours() * 60 + now.getMinutes();

        fetchedSlots = fetchedSlots.map((slot) => {
          const [sHour, sMin] = slot.startTime.split(':').map(Number);
          const slotTimeMinutes = sHour * 60 + sMin;
          if (slotTimeMinutes <= currentTimeMinutes) {
            return { ...slot, isAvailable: false };
          }
          return slot;
        });
      }

      setSelectedSlot(null);
      setSlots(fetchedSlots);
    } catch (err) {
      console.error('Error fetching slots', err);
    }
  };

  const handleSelectSlot = async (slot) => {
    if (!slot.isAvailable || !selectedDoctor || !selectedDate) return;
    setSelectedSlot(slot);
    setMessage(`Selected slot ${slot.startTime} - ${slot.endTime}. Enter symptoms below and click Confirm Booking.`);
    try {
      await API.post(`/patient/doctors/${selectedDoctor}/hold-slot`, {
        appointmentDate: selectedDate,
        startTime: slot.startTime,
      });
    } catch (err) {
      console.warn('Slot hold notice:', err.response?.data?.message || err.message);
    }
  };

  const handleBook = async (e) => {
    e.preventDefault();
    if (!selectedSlot || !selectedDate || !selectedDoctor) {
      setMessage('Please select a doctor, appointment date, and available time slot.');
      return;
    }
    setLoading(true);
    setMessage('');
    try {
      await API.post('/patient/appointments', {
        doctorProfileId: selectedDoctor,
        appointmentDate: selectedDate,
        startTime: selectedSlot.startTime,
        endTime: selectedSlot.endTime,
        symptoms: symptoms || 'General Consultation',
      });
      setMessage('✅ Appointment booked successfully with AI pre-visit analysis!');
      setSymptoms('');
      setSelectedSlot(null);
      fetchAppointments();
      handleFetchSlots(selectedDoctor, selectedDate);
    } catch (err) {
      setMessage(err.response?.data?.message || 'Booking failed');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    try {
      await API.put('/auth/me', { name, email });
      setMessage('Profile updated successfully!');
      setIsEditing(false);
    } catch (err) {
      setMessage('Failed to update profile');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Welcome, {user?.name} (Patient)</h1>
            <p className="text-sm text-slate-600">Search doctors, check live slots, and book consultations.</p>
          </div>
          <div className="flex gap-3">
            <button 
              type="button" 
              onClick={handleConnectCalendar} 
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 flex items-center gap-1.5"
            >
              <span>📅</span> Connect Google Calendar
            </button>
            <button onClick={() => setIsEditing(!isEditing)} className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg font-medium hover:bg-indigo-100">
              {isEditing ? 'Cancel Edit' : 'Edit Profile'}
            </button>
            <button onClick={() => { logout(); navigate('/login'); }} className="px-4 py-2 bg-red-50 text-red-600 rounded-lg font-medium hover:bg-red-100">
              Logout
            </button>
          </div>
        </div>

        {message && <div className="mb-6 p-4 bg-emerald-50 text-emerald-700 rounded-lg">{message}</div>}

        {isEditing && (
          <div className="bg-white p-6 rounded-xl shadow-sm mb-6">
            <h2 className="text-lg font-bold text-slate-800 mb-4">Edit Profile Details</h2>
            <form onSubmit={handleUpdateProfile} className="space-y-4 max-w-md">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-4 py-2 border rounded-lg outline-none" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-2 border rounded-lg outline-none" required />
              </div>
              <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700">Save Changes</button>
            </form>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Booking Section */}
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <h2 className="text-lg font-bold text-slate-800 mb-4">Book an Appointment</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Select Doctor</label>
                <select
                  className="w-full px-4 py-2 border rounded-lg outline-none"
                  onChange={(e) => handleFetchSlots(e.target.value, selectedDate)}
                >
                  <option value="">Choose Doctor...</option>
                  {doctors.map((doc) => (
                    <option key={doc.doctorProfile?.id} value={doc.doctorProfile?.id}>
                      Dr. {doc.name || doc.user?.name} ({doc.doctorProfile?.specialisation})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Appointment Date</label>
                <input
                  type="date"
                  min={todayStr}
                  className="w-full px-4 py-2 border rounded-lg outline-none"
                  value={selectedDate}
                  onChange={(e) => handleFetchSlots(selectedDoctor, e.target.value)}
                />
              </div>

              {leaveNotice && (
                <div className="p-3 bg-amber-50 text-amber-700 rounded-lg text-sm font-medium">
                  {leaveNotice}
                </div>
              )}

              {slots.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Available Slots</label>
                  <div className="grid grid-cols-3 gap-2 max-h-40 overflow-y-auto">
                    {slots.map((slot, idx) => (
                      <button
                        key={idx}
                        type="button"
                        disabled={!slot.isAvailable}
                        onClick={() => handleSelectSlot(slot)}
                        className={`py-2 text-sm rounded-lg border font-medium transition-all ${
                          !slot.isAvailable
                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed line-through'
                            : selectedSlot?.startTime === slot.startTime
                            ? 'bg-indigo-600 text-white border-indigo-700 ring-2 ring-indigo-500 shadow-md font-bold scale-105'
                            : 'bg-white text-indigo-600 border-indigo-300 hover:bg-indigo-50 hover:border-indigo-500'
                        }`}
                      >
                        {slot.startTime}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Describe Symptoms</label>
                <textarea
                  rows="3"
                  className="w-full px-4 py-2 border rounded-lg outline-none"
                  placeholder="Share symptoms for AI pre-visit assessment..."
                  value={symptoms}
                  onChange={(e) => setSymptoms(e.target.value)}
                ></textarea>
              </div>

              <button
                onClick={handleBook}
                disabled={loading || !selectedSlot}
                className="w-full py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition disabled:opacity-50"
              >
                {loading ? 'Booking...' : 'Confirm Booking'}
              </button>
            </div>
          </div>

          {/* Appointments History */}
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <h2 className="text-lg font-bold text-slate-800 mb-4">My Appointments</h2>
            <div className="space-y-4 max-h-[500px] overflow-y-auto">
              {appointments.length === 0 ? (
                <p className="text-sm text-slate-500">No appointments booked yet.</p>
              ) : (
                appointments.map((app) => (
                  <div key={app.id} className="p-4 border rounded-lg space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-slate-800">Date: {String(app.appointmentDate).split('T')[0].split('-').reverse().join('/')}</span>
                      <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                        app.status === 'BOOKED'
                          ? 'bg-emerald-50 text-emerald-600'
                          : app.status === 'COMPLETED'
                          ? 'bg-blue-50 text-blue-600'
                          : 'bg-red-50 text-red-600'
                      }`}>
                        {app.status}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600">Time: {app.startTime} - {app.endTime}</p>
                    <p className="text-sm text-slate-600">Symptoms: {app.symptoms}</p>
                    {app.urgencyLevel && (
                      <div className="text-xs bg-indigo-50 text-indigo-700 p-2 rounded">
                        <strong>AI Urgency:</strong> {app.urgencyLevel} | <strong>Chief Complaint:</strong> {app.chiefComplaint}
                      </div>
                    )}
                    {app.postVisitSummary && !app.needsHumanReview && (
                      <div className="text-xs bg-emerald-50 text-emerald-800 p-3 rounded-lg border border-emerald-200 mt-2">
                        <strong className="block text-emerald-900 font-semibold mb-1">Post-Visit Summary</strong>
                        {(() => {
                          let summaryObj = app.postVisitSummary;
                          if (typeof summaryObj === 'string') {
                            try { summaryObj = JSON.parse(summaryObj); } catch (e) {}
                          }
                          if (typeof summaryObj === 'object' && summaryObj !== null && summaryObj.summary) {
                            return (
                              <div className="space-y-1">
                                <p>{summaryObj.summary}</p>
                                {summaryObj.followUp && summaryObj.followUp !== 'Not specified by the doctor.' && (
                                  <p className="font-medium text-emerald-900"><strong>Follow-Up:</strong> {summaryObj.followUp}</p>
                                )}
                              </div>
                            );
                          }
                          return String(app.postVisitSummary);
                        })()}
                      </div>
                    )}

                    {app.prescription && (
                      <div className="mt-3 p-3 bg-blue-50 text-blue-800 rounded-lg text-sm">
                        <strong>Prescription</strong>

                        {app.prescription.diagnosis && (
                          <p className="mt-2">
                            <strong>Diagnosis:</strong> {app.prescription.diagnosis}
                          </p>
                        )}

                        {app.prescription.medicines?.length > 0 && (
                          <div className="mt-2">
                            <strong>Medicines:</strong>

                            <ul className="divide-y divide-blue-100 mt-1">
                              {app.prescription.medicines.map((med, index) => (
                                <li
                                  key={index}
                                  className="flex items-center justify-between gap-3 py-2"
                                >
                                  <span>
                                    {med.name} {med.dosage && `— ${med.dosage}`} {med.frequency && `— ${med.frequency}`} {med.duration && `— ${med.duration}`}
                                  </span>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedMedicine({
                                        ...med,
                                        appointmentId: app.id,
                                      });

                                      setReminderStartDate(
                                        String(app.appointmentDate || '').slice(0, 10) || ''
                                      );

                                      setReminderEndDate(
                                        String(app.appointmentDate || '').slice(0, 10) || ''
                                      );

                                      setShowReminderModal(true);
                                    }}
                                    className="px-3 py-1 text-sm bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 font-medium"
                                  >
                                    🔔 Set Reminder
                                  </button>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {app.prescription.followUpInstructions && (
                          <p className="mt-2">
                            <strong>Follow-up:</strong>{' '}
                            {app.prescription.followUpInstructions}
                          </p>
                        )}
                      </div>
                    )}
                    {app.status === 'BOOKED' && (
                      <div className="flex flex-wrap gap-2 pt-2">
                        <a
                          href={getGoogleCalendarUrl(
                            app.doctorProfile?.user?.name || 'Doctor',
                            app.appointmentDate,
                            app.startTime,
                            app.endTime,
                            app.symptoms
                          )}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-semibold hover:bg-blue-100 flex items-center gap-1"
                        >
                          📅 Add to Google Calendar
                        </a>

                        <button
                          type="button"
                          onClick={() =>
                            downloadICS(
                              app.doctorProfile?.user?.name || 'Doctor',
                              app.appointmentDate,
                              app.startTime,
                              app.endTime,
                              app.symptoms
                            )
                          }
                          className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-200 flex items-center gap-1"
                        >
                          📥 Download .ics Invite
                        </button>

                        <button
                          type="button"
                          onClick={async () => {
                            const confirmed = window.confirm(
                              `Cancel your appointment on ${String(app.appointmentDate).split('T')[0].split('-').reverse().join('/')} at ${app.startTime}?`
                            );

                            if (!confirmed) return;

                            try {
                              await API.delete(
                                `/patient/appointments/${app.id}`
                              );

                              setMessage('Appointment cancelled successfully.');

                              // Refresh appointments and slots
                              fetchAppointments();

                              if (selectedDoctor && selectedDate) {
                                handleFetchSlots(selectedDoctor, selectedDate);
                              }
                            } catch (err) {
                              setMessage(
                                err.response?.data?.message ||
                                  'Failed to cancel appointment.'
                              );
                            }
                          }}
                          className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-semibold hover:bg-red-100"
                        >
                          Cancel Appointment
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {showReminderModal && (
            <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
                <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">

                    <h2 className="text-xl font-bold mb-4">
                        Medication Reminder
                    </h2>

                    {selectedMedicine && (
                        <div className="bg-indigo-50 p-3 rounded-lg mb-4">
                            <p className="font-semibold">
                                {selectedMedicine.name}
                            </p>
                            <p className="text-sm text-gray-600">
                                {selectedMedicine.dosage}
                            </p>
                            <p className="text-sm text-gray-600">
                                {selectedMedicine.frequency}
                            </p>
                        </div>
                    )}

                    <label className="block text-sm font-medium mb-1">
                        Reminder Time
                    </label>

                    {reminderTimes.map((time, index) => (
                        <div key={index} className="flex gap-2 mb-2">
                            <input
                                type="time"
                                value={time}
                                onChange={(e) => {
                                    const updated = [...reminderTimes];
                                    updated[index] = e.target.value;
                                    setReminderTimes(updated);
                                }}
                                className="border rounded-lg px-3 py-2 flex-1"
                            />

                            {reminderTimes.length > 1 && (
                                <button
                                    type="button"
                                    onClick={() =>
                                        setReminderTimes(
                                            reminderTimes.filter(
                                                (_, i) => i !== index
                                            )
                                        )
                                    }
                                    className="text-red-500 px-2"
                                >
                                    ✕
                                </button>
                            )}
                        </div>
                    ))}

                    <button
                        type="button"
                        onClick={() =>
                            setReminderTimes([
                                ...reminderTimes,
                                '09:00',
                            ])
                        }
                        className="text-indigo-600 text-sm mb-4"
                    >
                        + Add another time
                    </button>

                    <label className="block text-sm font-medium mb-1">
                        Start Date
                    </label>

                    <input
                        type="date"
                        value={reminderStartDate}
                        onChange={(e) =>
                            setReminderStartDate(e.target.value)
                        }
                        className="border rounded-lg px-3 py-2 w-full mb-4"
                    />

                    <label className="block text-sm font-medium mb-1">
                        End Date
                    </label>

                    <input
                        type="date"
                        value={reminderEndDate}
                        onChange={(e) =>
                            setReminderEndDate(e.target.value)
                        }
                        className="border rounded-lg px-3 py-2 w-full mb-5"
                    />

                    <div className="flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={() => setShowReminderModal(false)}
                            className="px-4 py-2 bg-gray-100 rounded-lg"
                        >
                            Cancel
                        </button>

                        <button
                            type="button"
                            onClick={saveMedicationReminder}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
                        >
                            Save Reminder
                        </button>
                    </div>
                </div>
            </div>
        )}
      </div>
    </div>
  );
}
