import React, { useState, useEffect } from 'react';
import API from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { getGoogleCalendarUrl, downloadICS } from '../../utils/calendar';

export default function PatientDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Navigation Tabs (Flipkart / Amazon style)
  const [activeTab, setActiveTab] = useState('book'); // 'book', 'appointments', 'reminders', 'profile'
  const [appointmentFilter, setAppointmentFilter] = useState('ALL'); // 'ALL', 'BOOKED', 'COMPLETED', 'CANCELLED'

  // Data states
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

  const todayStr = getLocalDateString();

  useEffect(() => {
    fetchDoctors();
    fetchAppointments();
    fetchMedicationReminders();

    // Real-Time Automated Frontend Syncing (polls every 10 seconds)
    const syncInterval = setInterval(() => {
      fetchAppointments();
      fetchMedicationReminders();
    }, 10000);

    const searchParams = new URLSearchParams(window.location.search);
    const googleStatus = searchParams.get('google');
    if (googleStatus === 'connected') {
      setMessage('✅ Google Calendar connected successfully! Your appointments will sync automatically.');
    } else if (googleStatus === 'failed' || googleStatus === 'error') {
      setMessage('ℹ️ Note: Background Google Calendar OAuth requires production credentials. You can use the "📅 Add to Google Calendar" button or "📥 Download .ics Invite" button on any booked appointment!');
    }

    return () => clearInterval(syncInterval);
  }, []);

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

  const fetchMedicationReminders = async () => {
    try {
      const response = await API.get('/medications');
      if (response.data.success) {
        setMedicationReminders(response.data.reminders || []);
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
      setDoctors(res.data.doctors || []);
    } catch (err) {
      console.error('Error fetching doctors', err);
    }
  };

  const fetchAppointments = async () => {
    try {
      const res = await API.get('/patient/appointments');
      setAppointments(res.data.appointments || []);
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
        setLeaveNotice('⚠️ Doctor is on leave on this date. Please select another date.');
        setSlots([]);
        setSelectedSlot(null);
        return;
      }

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
    setMessage(`Selected slot ${slot.startTime} - ${slot.endTime}. Describe your symptoms below and click Confirm Booking.`);
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
      setMessage('✅ Profile updated successfully!');
      setIsEditing(false);
    } catch (err) {
      setMessage('Failed to update profile');
    }
  };

  const filteredAppointments = appointments.filter((app) => {
    if (appointmentFilter === 'ALL') return true;
    return app.status === appointmentFilter;
  });

  const bookedCount = appointments.filter((a) => a.status === 'BOOKED').length;
  const completedCount = appointments.filter((a) => a.status === 'COMPLETED').length;

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-900 pb-12">
      {/* Flipkart / Amazon Style Header */}
      <header className="bg-indigo-900 text-white shadow-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="bg-indigo-600 p-2 rounded-xl text-white font-black text-xl shadow-lg">
                🏥
              </div>
              <div>
                <span className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-blue-200 to-indigo-100 bg-clip-text text-transparent">
                  HealthCare Hub
                </span>
                <span className="block text-xs text-indigo-300 font-medium">Patient Portal</span>
              </div>
            </div>

            {/* Header Right Actions */}
            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={handleConnectCalendar}
                className="hidden sm:flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow-sm transition"
              >
                <span>📅</span>
                <span>Connect Google Calendar</span>
              </button>

              <div className="flex items-center space-x-2 bg-indigo-800/80 px-3 py-1.5 rounded-lg border border-indigo-700">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="text-xs font-semibold text-indigo-100">{user?.name}</span>
              </div>

              <button
                onClick={() => { logout(); navigate('/login'); }}
                className="px-3 py-1.5 bg-red-600/90 hover:bg-red-500 text-white text-xs font-bold rounded-lg transition"
              >
                Logout
              </button>
            </div>
          </div>
        </div>

        {/* E-Commerce Tab Navigation Bar */}
        <div className="bg-indigo-950 border-t border-indigo-800/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <nav className="flex space-x-2 sm:space-x-4 overflow-x-auto py-2 text-sm font-semibold scrollbar-none">
              <button
                onClick={() => setActiveTab('book')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition whitespace-nowrap ${
                  activeTab === 'book'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-indigo-200 hover:bg-indigo-900 hover:text-white'
                }`}
              >
                <span>🩺</span>
                <span>Book Appointment</span>
              </button>

              <button
                onClick={() => setActiveTab('appointments')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition whitespace-nowrap ${
                  activeTab === 'appointments'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-indigo-200 hover:bg-indigo-900 hover:text-white'
                }`}
              >
                <span>📅</span>
                <span>My Appointments</span>
                {bookedCount > 0 && (
                  <span className="bg-emerald-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
                    {bookedCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('reminders')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition whitespace-nowrap ${
                  activeTab === 'reminders'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-indigo-200 hover:bg-indigo-900 hover:text-white'
                }`}
              >
                <span>💊</span>
                <span>Medication Reminders</span>
                {medicationReminders.length > 0 && (
                  <span className="bg-blue-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
                    {medicationReminders.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('profile')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition whitespace-nowrap ${
                  activeTab === 'profile'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-indigo-200 hover:bg-indigo-900 hover:text-white'
                }`}
              >
                <span>👤</span>
                <span>My Profile</span>
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        {/* Banner Alert Message */}
        {message && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl shadow-sm flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <span className="text-lg">📢</span>
              <span className="text-sm font-medium">{message}</span>
            </div>
            <button onClick={() => setMessage('')} className="text-emerald-600 hover:text-emerald-900 text-xs font-bold">
              ✕ Dismiss
            </button>
          </div>
        )}

        {/* Overview Stats Widgets */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Upcoming Visits</p>
              <h3 className="text-2xl font-black text-slate-800 mt-1">{bookedCount}</h3>
            </div>
            <div className="bg-indigo-50 p-3 rounded-xl text-indigo-600 text-2xl">📅</div>
          </div>

          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Completed Consultations</p>
              <h3 className="text-2xl font-black text-slate-800 mt-1">{completedCount}</h3>
            </div>
            <div className="bg-emerald-50 p-3 rounded-xl text-emerald-600 text-2xl">✅</div>
          </div>

          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Active Reminders</p>
              <h3 className="text-2xl font-black text-slate-800 mt-1">{medicationReminders.length}</h3>
            </div>
            <div className="bg-blue-50 p-3 rounded-xl text-blue-600 text-2xl">🔔</div>
          </div>
        </div>

        {/* TAB 1: BOOK APPOINTMENT */}
        {activeTab === 'book' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Step 1: Select Doctor Card Grid */}
            <div className="lg:col-span-7 space-y-6">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/80">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h2 className="text-lg font-bold text-slate-800">1. Select Doctor</h2>
                    <p className="text-xs text-slate-500">Choose a specialist for your consultation.</p>
                  </div>
                  <span className="text-xs bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full font-bold">
                    {doctors.length} Doctors Available
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {doctors.map((doc) => {
                    const isSelected = selectedDoctor === doc.doctorProfile?.id;
                    return (
                      <div
                        key={doc.doctorProfile?.id}
                        onClick={() => handleFetchSlots(doc.doctorProfile?.id, selectedDate)}
                        className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                          isSelected
                            ? 'border-indigo-600 bg-indigo-50/60 shadow-md ring-2 ring-indigo-200'
                            : 'border-slate-200 hover:border-indigo-300 hover:shadow-sm bg-white'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-bold text-slate-900">
                              Dr. {doc.name || doc.user?.name}
                            </h3>
                            <span className="inline-block mt-1 text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                              👨‍⚕️ {doc.doctorProfile?.specialisation || 'General Physician'}
                            </span>
                          </div>
                          {isSelected && (
                            <span className="text-indigo-600 font-extrabold text-lg">✓</span>
                          )}
                        </div>

                        <div className="mt-3 text-xs text-slate-500 space-y-1">
                          <p>⏱️ Slot Duration: {doc.doctorProfile?.slotDuration || 30} mins</p>
                          <p>🕒 Working Hours: {doc.doctorProfile?.workingHours?.start || '09:00'} - {doc.doctorProfile?.workingHours?.end || '17:00'}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Step 2: Available Time Slots Grid */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/80">
                <h2 className="text-lg font-bold text-slate-800 mb-1">2. Select Time Slot</h2>
                <p className="text-xs text-slate-500 mb-4">Click an available slot below (ephemeral 5-min hold active on click).</p>

                {leaveNotice && (
                  <div className="p-3 mb-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-sm font-semibold">
                    {leaveNotice}
                  </div>
                )}

                {!selectedDoctor || !selectedDate ? (
                  <div className="text-center p-8 bg-slate-50 border border-dashed rounded-xl text-slate-500 text-sm">
                    👈 Select a doctor and date to view live available slots.
                  </div>
                ) : slots.length === 0 ? (
                  <div className="text-center p-8 bg-slate-50 border border-dashed rounded-xl text-slate-500 text-sm">
                    No available time slots found for the selected date.
                  </div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 max-h-56 overflow-y-auto p-1">
                    {slots.map((slot, idx) => {
                      const isSelected = selectedSlot?.startTime === slot.startTime;
                      return (
                        <button
                          key={idx}
                          type="button"
                          disabled={!slot.isAvailable}
                          onClick={() => handleSelectSlot(slot)}
                          className={`py-2.5 px-3 text-xs rounded-xl border font-bold transition-all ${
                            !slot.isAvailable
                              ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed line-through'
                              : isSelected
                              ? 'bg-indigo-600 text-white border-indigo-700 ring-4 ring-indigo-200 shadow-md scale-105'
                              : 'bg-white text-indigo-700 border-indigo-300 hover:bg-indigo-50 hover:border-indigo-500'
                          }`}
                        >
                          {slot.startTime}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Step 3: Date & Symptoms Form Column */}
            <div className="lg:col-span-5 space-y-6">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/80">
                <h2 className="text-lg font-bold text-slate-800 mb-4">3. Date & Pre-Visit Symptoms</h2>

                <form onSubmit={handleBook} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                      Consultation Date
                    </label>
                    <input
                      type="date"
                      min={todayStr}
                      className="w-full px-4 py-2.5 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-semibold"
                      value={selectedDate}
                      onChange={(e) => handleFetchSlots(selectedDoctor, e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                      Describe Symptoms (AI Pre-Visit Assessment)
                    </label>
                    <textarea
                      rows="4"
                      className="w-full px-4 py-2.5 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                      placeholder="Share your current symptoms, duration, and medical concerns for the AI pre-visit diagnostic summary..."
                      value={symptoms}
                      onChange={(e) => setSymptoms(e.target.value)}
                    ></textarea>
                  </div>

                  <div className="p-3 bg-indigo-50/80 rounded-xl text-xs text-indigo-800 space-y-1">
                    <p className="font-bold">✨ AI Pre-Visit Analysis Enabled</p>
                    <p>Submitting symptoms automatically generates an urgency assessment (Low/Medium/High) and diagnostic questions for your doctor.</p>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !selectedSlot || !selectedDoctor || !selectedDate}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md transition disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    {loading ? 'Booking Appointment...' : 'Confirm Appointment Booking'}
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: MY APPOINTMENTS */}
        {activeTab === 'appointments' && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/80">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <div>
                <h2 className="text-xl font-bold text-slate-800">My Consultation History</h2>
                <p className="text-xs text-slate-500">Track status, download invites, and view post-visit summaries.</p>
              </div>

              {/* Status Filter Buttons */}
              <div className="flex space-x-2 bg-slate-100 p-1 rounded-xl text-xs font-bold">
                {['ALL', 'BOOKED', 'COMPLETED', 'CANCELLED'].map((st) => (
                  <button
                    key={st}
                    onClick={() => setAppointmentFilter(st)}
                    className={`px-3 py-1.5 rounded-lg transition ${
                      appointmentFilter === st
                        ? 'bg-white text-indigo-600 shadow-sm font-extrabold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {filteredAppointments.length === 0 ? (
              <div className="text-center p-12 bg-slate-50 border border-dashed rounded-xl text-slate-500">
                No appointments found for filter standard.
              </div>
            ) : (
              <div className="space-y-4">
                {filteredAppointments.map((app) => (
                  <div
                    key={app.id}
                    className="p-5 border rounded-2xl bg-white hover:shadow-sm transition-all space-y-3"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="font-bold text-slate-900 text-base">
                            Dr. {app.doctorProfile?.user?.name || 'Doctor'}
                          </h3>
                          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700">
                            {app.doctorProfile?.specialisation || 'General'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          📅 {String(app.appointmentDate).split('T')[0].split('-').reverse().join('/')} | 🕒 {app.startTime} - {app.endTime}
                        </p>
                      </div>

                      <span
                        className={`px-3 py-1 text-xs font-extrabold rounded-full ${
                          app.status === 'BOOKED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : app.status === 'COMPLETED'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {app.status}
                      </span>
                    </div>

                    <div className="text-xs bg-slate-50 p-3 rounded-xl space-y-1 border border-slate-100">
                      <p><strong className="text-slate-700">Symptoms:</strong> {app.symptoms}</p>
                      {app.urgencyLevel && (
                        <p className="text-indigo-700">
                          <strong>AI Urgency Assessment:</strong> {app.urgencyLevel} | <strong>Chief Complaint:</strong> {app.chiefComplaint}
                        </p>
                      )}
                    </div>

                    {/* Post-Visit Summary */}
                    {app.postVisitSummary && !app.needsHumanReview && (
                      <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-xl text-xs text-emerald-900 space-y-1">
                        <strong className="block font-bold text-emerald-950">📋 AI Post-Visit Summary & Care Plan</strong>
                        {(() => {
                          let summaryObj = app.postVisitSummary;
                          if (typeof summaryObj === 'string') {
                            try { summaryObj = JSON.parse(summaryObj); } catch (e) {}
                          }
                          if (typeof summaryObj === 'object' && summaryObj !== null && summaryObj.summary) {
                            return (
                              <div className="space-y-1 mt-1">
                                <p>{summaryObj.summary}</p>
                                {summaryObj.followUp && summaryObj.followUp !== 'Not specified by the doctor.' && (
                                  <p className="font-semibold text-emerald-950"><strong>Follow-Up:</strong> {summaryObj.followUp}</p>
                                )}
                              </div>
                            );
                          }
                          return String(app.postVisitSummary);
                        })()}
                      </div>
                    )}

                    {/* Prescription Section */}
                    {app.prescription && (
                      <div className="p-4 bg-blue-50/80 border border-blue-200 rounded-xl text-xs text-blue-900 space-y-2">
                        <strong className="block font-bold text-blue-950">💊 Doctor Prescription</strong>
                        {app.prescription.diagnosis && (
                          <p><strong>Diagnosis:</strong> {app.prescription.diagnosis}</p>
                        )}

                        {app.prescription.medicines?.length > 0 && (
                          <div className="mt-2">
                            <strong className="block mb-1">Prescribed Medicines:</strong>
                            <div className="space-y-1.5">
                              {app.prescription.medicines.map((med, index) => (
                                <div key={index} className="flex items-center justify-between bg-white p-2.5 rounded-lg border border-blue-100 shadow-2xs">
                                  <span>
                                    <strong>{med.name}</strong> {med.dosage && `— ${med.dosage}`} {med.frequency && `(${med.frequency})`} {med.duration && `for ${med.duration}`}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedMedicine({
                                        ...med,
                                        appointmentId: app.id,
                                      });
                                      setReminderStartDate(String(app.appointmentDate || '').slice(0, 10) || '');
                                      setReminderEndDate(String(app.appointmentDate || '').slice(0, 10) || '');
                                      setShowReminderModal(true);
                                    }}
                                    className="px-2.5 py-1 text-xs bg-indigo-600 text-white font-bold rounded-md hover:bg-indigo-700 transition"
                                  >
                                    🔔 Set Reminder
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Calendar Links & Cancellation Action Bar */}
                    {app.status === 'BOOKED' && (
                      <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
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
                          className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-bold flex items-center space-x-1"
                        >
                          <span>📅</span>
                          <span>Add to Google Calendar</span>
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
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center space-x-1"
                        >
                          <span>📥</span>
                          <span>Download .ics Invite</span>
                        </button>

                        <button
                          type="button"
                          onClick={async () => {
                            const confirmed = window.confirm('Are you sure you want to cancel this appointment?');
                            if (!confirmed) return;
                            try {
                              await API.delete(`/patient/appointments/${app.id}`);
                              setMessage('✅ Appointment cancelled successfully.');
                              fetchAppointments();
                            } catch (err) {
                              setMessage(err.response?.data?.message || 'Failed to cancel appointment.');
                            }
                          }}
                          className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-xs font-bold"
                        >
                          Cancel Appointment
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: MEDICATION REMINDERS */}
        {activeTab === 'reminders' && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/80">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xl font-bold text-slate-800">My Medication Reminders</h2>
                <p className="text-xs text-slate-500">Automated notification schedule generated from your prescriptions.</p>
              </div>
              <span className="bg-blue-50 text-blue-700 text-xs font-bold px-3 py-1 rounded-full">
                {medicationReminders.length} Active Reminders
              </span>
            </div>

            {medicationReminders.length === 0 ? (
              <div className="text-center p-12 bg-slate-50 border border-dashed rounded-xl text-slate-500">
                No active medication reminders configured yet. Select an appointment with a prescription to set reminders!
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {medicationReminders.map((rem) => (
                  <div key={rem.id} className="p-4 border rounded-xl bg-slate-50 space-y-2">
                    <div className="flex justify-between items-center">
                      <h3 className="font-bold text-slate-900 text-base">{rem.medicineName}</h3>
                      <span className="bg-emerald-100 text-emerald-800 text-xs font-extrabold px-2.5 py-0.5 rounded-full">
                        ACTIVE
                      </span>
                    </div>
                    <p className="text-xs text-slate-600">Dosage: {rem.dosage || 'Standard'}</p>
                    <p className="text-xs text-slate-600">Schedule Times: {Array.isArray(rem.reminderTimes) ? rem.reminderTimes.join(', ') : String(rem.reminderTimes)}</p>
                    <p className="text-xs text-slate-500">Duration: {String(rem.startDate).slice(0, 10)} to {String(rem.endDate).slice(0, 10)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: MY PROFILE */}
        {activeTab === 'profile' && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/80 max-w-xl mx-auto">
            <h2 className="text-xl font-bold text-slate-800 mb-4">Patient Profile Details</h2>
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2.5 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-semibold"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2.5 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-semibold"
                  required
                />
              </div>

              <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-500">
                <p><strong>Account Role:</strong> PATIENT</p>
                <p><strong>User ID:</strong> {user?.id}</p>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md transition text-sm"
              >
                Save Profile Changes
              </button>
            </form>
          </div>
        )}
      </main>

      {/* Medication Reminder Modal */}
      {showReminderModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <h2 className="text-lg font-bold text-slate-900">Set Medication Reminder</h2>

            {selectedMedicine && (
              <div className="bg-indigo-50 p-3.5 rounded-xl text-xs text-indigo-900 space-y-1">
                <p className="font-bold text-slate-900">{selectedMedicine.name}</p>
                <p>Dosage: {selectedMedicine.dosage || 'N/A'}</p>
                <p>Frequency: {selectedMedicine.frequency || 'N/A'}</p>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Reminder Times</label>
              {reminderTimes.map((time, idx) => (
                <div key={idx} className="flex space-x-2 mb-2">
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => {
                      const updated = [...reminderTimes];
                      updated[idx] = e.target.value;
                      setReminderTimes(updated);
                    }}
                    className="border rounded-xl px-3 py-2 text-sm flex-1 font-semibold"
                  />
                  {reminderTimes.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setReminderTimes(reminderTimes.filter((_, i) => i !== idx))}
                      className="text-red-500 px-2 font-bold hover:bg-red-50 rounded-lg"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}

              <button
                type="button"
                onClick={() => setReminderTimes([...reminderTimes, '09:00'])}
                className="text-indigo-600 text-xs font-bold hover:underline"
              >
                + Add another time
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Start Date</label>
                <input
                  type="date"
                  value={reminderStartDate}
                  onChange={(e) => setReminderStartDate(e.target.value)}
                  className="border rounded-xl px-3 py-2 w-full text-xs font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">End Date</label>
                <input
                  type="date"
                  value={reminderEndDate}
                  onChange={(e) => setReminderEndDate(e.target.value)}
                  className="border rounded-xl px-3 py-2 w-full text-xs font-semibold"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setShowReminderModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveMedicationReminder}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm"
              >
                Save Reminder
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
