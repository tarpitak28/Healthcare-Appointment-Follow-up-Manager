import React, { useState, useEffect } from 'react';
import API from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Navigation Tabs (Flipkart / Amazon Style)
  const [activeTab, setActiveTab] = useState('leave'); // 'leave', 'doctors', 'appointments', 'profile'
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Data states
  const [doctors, setDoctors] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [leaveStartDate, setLeaveStartDate] = useState('');
  const [leaveEndDate, setLeaveEndDate] = useState('');
  const [selectedDocId, setSelectedDocId] = useState('');
  const [message, setMessage] = useState('');

  // Profile edit state
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');

  const todayStr = new Date().toISOString().split('T')[0];

  useEffect(() => {
    fetchDoctors();
    fetchAppointments();

    // Real-Time Automated Frontend Syncing for Admin Dashboard (polls every 10 seconds)
    const syncInterval = setInterval(() => {
      fetchDoctors();
      fetchAppointments();
    }, 10000);
    return () => clearInterval(syncInterval);
  }, []);

  const fetchDoctors = async () => {
    try {
      const res = await API.get('/admin/doctors');
      setDoctors(res.data.doctors || []);
    } catch (err) {
      console.error('Error fetching doctors', err);
    }
  };

  const fetchAppointments = async () => {
    try {
      const res = await API.get('/admin/appointments');
      setAppointments(res.data.appointments || []);
    } catch (err) {
      console.error('Error fetching appointments', err);
    }
  };

  const handleCancelAppointment = async (appointment) => {
    const confirmed = window.confirm(
      `Cancel the appointment with ${appointment.patient?.name} and Dr. ${appointment.doctorProfile?.user?.name}?`
    );

    if (!confirmed) return;

    try {
      await API.post(`/admin/appointments/${appointment.id}/cancel`);
      setMessage('✅ Appointment cancelled successfully.');
      fetchAppointments();
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to cancel appointment.');
    }
  };

  const handleMarkLeave = async (e) => {
    e.preventDefault();
    if (!selectedDocId || !leaveStartDate) return;
    try {
      const res = await API.post(`/admin/doctors/${selectedDocId}/leave`, {
        startDate: leaveStartDate,
        endDate: leaveEndDate || leaveStartDate,
        reason: 'Scheduled Leave',
      });
      setMessage(`✅ Leave marked successfully! ${res.data.affectedAppointmentsCount} conflicting bookings were automatically cancelled with email alerts sent to affected patients.`);
      setLeaveStartDate('');
      setLeaveEndDate('');
      fetchDoctors();
      fetchAppointments();
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to mark leave');
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    try {
      await API.put('/auth/me', { name, email });
      setMessage('✅ Admin profile updated successfully!');
      setIsEditing(false);
    } catch (err) {
      setMessage('Failed to update profile');
    }
  };

  const filteredAppointments = appointments.filter((app) => {
    if (statusFilter === 'ALL') return true;
    return app.status === statusFilter;
  });

  const bookedCount = appointments.filter((a) => a.status === 'BOOKED').length;

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-900 pb-12">
      {/* Top Navigation Header */}
      <header className="bg-slate-900 text-white shadow-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="bg-indigo-600 p-2 rounded-xl text-white font-black text-xl shadow-lg">
                🛡️
              </div>
              <div>
                <span className="text-xl font-extrabold tracking-tight text-slate-100">
                  Clinic Admin Portal
                </span>
                <span className="block text-xs text-slate-400 font-medium">System Administrator ({user?.name})</span>
              </div>
            </div>

            <button
              onClick={() => { logout(); navigate('/login'); }}
              className="px-3 py-1.5 bg-red-600/90 hover:bg-red-500 text-white text-xs font-bold rounded-lg transition"
            >
              Logout
            </button>
          </div>
        </div>

        {/* E-Commerce Tab Navigation */}
        <div className="bg-slate-950 border-t border-slate-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <nav className="flex space-x-2 sm:space-x-4 py-2 text-sm font-semibold">
              <button
                onClick={() => setActiveTab('leave')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition ${
                  activeTab === 'leave'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-300 hover:bg-slate-900 hover:text-white'
                }`}
              >
                <span>🏖️</span>
                <span>Doctor Leave Management</span>
              </button>

              <button
                onClick={() => setActiveTab('doctors')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition ${
                  activeTab === 'doctors'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-300 hover:bg-slate-900 hover:text-white'
                }`}
              >
                <span>👨‍⚕️</span>
                <span>Registered Doctors ({doctors.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('appointments')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition ${
                  activeTab === 'appointments'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-300 hover:bg-slate-900 hover:text-white'
                }`}
              >
                <span>📋</span>
                <span>All Appointments</span>
                {bookedCount > 0 && (
                  <span className="bg-emerald-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                    {bookedCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('profile')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition ${
                  activeTab === 'profile'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-300 hover:bg-slate-900 hover:text-white'
                }`}
              >
                <span>👤</span>
                <span>Profile Settings</span>
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        {/* Alert Banner */}
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

        {/* System Overview Widgets */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Registered Doctors</p>
              <h3 className="text-2xl font-black text-slate-800 mt-1">{doctors.length}</h3>
            </div>
            <div className="bg-indigo-50 p-3 rounded-xl text-indigo-600 text-2xl">👨‍⚕️</div>
          </div>

          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Active Bookings</p>
              <h3 className="text-2xl font-black text-slate-800 mt-1">{bookedCount}</h3>
            </div>
            <div className="bg-emerald-50 p-3 rounded-xl text-emerald-600 text-2xl">📋</div>
          </div>

          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Total System Appointments</p>
              <h3 className="text-2xl font-black text-slate-800 mt-1">{appointments.length}</h3>
            </div>
            <div className="bg-blue-50 p-3 rounded-xl text-blue-600 text-2xl">📊</div>
          </div>
        </div>

        {/* TAB 1: DOCTOR LEAVE MANAGEMENT */}
        {activeTab === 'leave' && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/80 max-w-2xl mx-auto">
            <h2 className="text-xl font-bold text-slate-800 mb-1">Mark Doctor Leave</h2>
            <p className="text-xs text-slate-500 mb-6">
              Mark single or multi-day leave. Overlapping patient bookings are automatically cancelled and patient email alerts dispatched.
            </p>

            <form onSubmit={handleMarkLeave} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Select Doctor</label>
                <select
                  className="w-full px-4 py-2.5 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-semibold"
                  value={selectedDocId}
                  onChange={(e) => setSelectedDocId(e.target.value)}
                  required
                >
                  <option value="">Choose Doctor Profile...</option>
                  {doctors.map((doc) => (
                    <option key={doc.doctorProfile?.id} value={doc.doctorProfile?.id}>
                      Dr. {doc.name} ({doc.doctorProfile?.specialisation || 'General'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Start Date</label>
                  <input
                    type="date"
                    min={todayStr}
                    className="w-full px-4 py-2.5 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-semibold"
                    value={leaveStartDate}
                    onChange={(e) => {
                      setLeaveStartDate(e.target.value);
                      if (!leaveEndDate || e.target.value > leaveEndDate) {
                        setLeaveEndDate(e.target.value);
                      }
                    }}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">End Date</label>
                  <input
                    type="date"
                    min={leaveStartDate || todayStr}
                    className="w-full px-4 py-2.5 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-semibold"
                    value={leaveEndDate}
                    onChange={(e) => setLeaveEndDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="p-3 bg-amber-50 rounded-xl text-xs text-amber-900">
                <p className="font-bold">⚠️ Automatic Conflict Resolution Active</p>
                <p>Submitting leave automatically transitions any booked appointments on selected dates to CANCELLED and dispatches priority email alerts.</p>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md transition text-sm"
              >
                Mark Leave & Cancel Conflicts
              </button>
            </form>
          </div>
        )}

        {/* TAB 2: REGISTERED DOCTORS */}
        {activeTab === 'doctors' && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/80">
            <h2 className="text-xl font-bold text-slate-800 mb-4">Registered Doctor Profiles</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {doctors.map((doc) => (
                <div key={doc.id} className="p-5 border rounded-2xl bg-slate-50 space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-slate-900 text-base">Dr. {doc.name}</h3>
                      <span className="text-xs bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded font-semibold">
                        {doc.doctorProfile?.specialisation || 'General Physician'}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-600">Email: {doc.email}</p>
                  <p className="text-xs text-slate-500">Slot Duration: {doc.doctorProfile?.slotDuration || 30} mins</p>
                  <p className="text-xs text-slate-500">Working Hours: {doc.doctorProfile?.workingHours?.start || '09:00'} - {doc.doctorProfile?.workingHours?.end || '17:00'}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: ALL APPOINTMENTS */}
        {activeTab === 'appointments' && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/80">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <div>
                <h2 className="text-xl font-bold text-slate-800">System Appointment Directory</h2>
                <p className="text-xs text-slate-500">Global audit log of all booked, completed, and cancelled appointments.</p>
              </div>

              {/* Status Filter */}
              <div className="flex space-x-2 bg-slate-100 p-1 rounded-xl text-xs font-bold">
                {['ALL', 'BOOKED', 'COMPLETED', 'CANCELLED'].map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-3 py-1.5 rounded-lg transition ${
                      statusFilter === st
                        ? 'bg-white text-indigo-600 shadow-sm font-extrabold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              {filteredAppointments.map((app) => (
                <div
                  key={app.id}
                  className="p-4 border rounded-2xl bg-white hover:shadow-2xs transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <p className="font-bold text-slate-900">Patient: {app.patient?.name}</p>
                      <span className="text-xs text-slate-500">({app.patient?.email})</span>
                    </div>

                    <p className="text-xs text-slate-600">
                      Doctor: Dr. {app.doctorProfile?.user?.name || 'Doctor'} | Date: {new Date(app.appointmentDate).toLocaleDateString()} ({app.startTime} - {app.endTime})
                    </p>

                    <p className="text-xs text-slate-500">Symptoms: {app.symptoms}</p>
                  </div>

                  <div>
                    {app.status === 'BOOKED' ? (
                      <button
                        onClick={() => handleCancelAppointment(app)}
                        className="px-3.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold rounded-xl transition"
                      >
                        Cancel Appointment
                      </button>
                    ) : (
                      <span
                        className={`px-3 py-1 text-xs font-extrabold rounded-full ${
                          app.status === 'COMPLETED'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {app.status}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: PROFILE */}
        {activeTab === 'profile' && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/80 max-w-xl mx-auto">
            <h2 className="text-xl font-bold text-slate-800 mb-4">Admin Profile Settings</h2>
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Admin Name</label>
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
    </div>
  );
}
