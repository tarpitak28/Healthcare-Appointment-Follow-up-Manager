import React, { useState, useEffect } from 'react';
import API from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

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

  const todayStr = new Date().toISOString().split('T')[0];

  useEffect(() => {
    fetchDoctors();
    fetchAppointments();
  }, []);

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

  const handleBook = async (e) => {
    e.preventDefault();
    if (!selectedSlot || !selectedDate || !selectedDoctor) return;
    setLoading(true);
    setMessage('');
    try {
      await API.post('/patient/appointments', {
        doctorProfileId: selectedDoctor,
        appointmentDate: selectedDate,
        startTime: selectedSlot.startTime,
        endTime: selectedSlot.endTime,
        symptoms,
      });
      setMessage('Appointment booked successfully with AI pre-visit analysis!');
      setSymptoms('');
      setSelectedSlot(null);
      fetchAppointments();
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
          <div className="flex space-x-2">
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
                        onClick={() => setSelectedSlot(slot)}
                        className={`py-2 text-sm rounded-lg border font-medium ${
                          !slot.isAvailable
                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed line-through'
                            : selectedSlot?.startTime === slot.startTime
                            ? 'bg-indigo-600 text-white'
                            : 'bg-white text-indigo-600 border-indigo-600 hover:bg-indigo-50'
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
                      <span className="font-semibold text-slate-800">Date: {new Date(app.appointmentDate).toLocaleDateString()}</span>
                      <span className={`px-2 py-1 text-xs rounded-full font-medium ${app.status === 'BOOKED' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-600'}`}>
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
                    {app.postVisitSummary && (
                      <div className="text-xs bg-emerald-50 text-emerald-700 p-2 rounded">
                        <strong>Post-Visit Summary:</strong> {app.postVisitSummary}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
