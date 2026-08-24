import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import API from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import AdminStatsRow from './components/AdminStatsRow';
import AuditTable from './components/AuditTable';
import {
  ShieldCheck,
  Calendar,
  UserCheck,
  AlertTriangle,
  LogOut,
  User,
  Sparkles,
  Users,
  Clock,
  Plus,
} from 'lucide-react';

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Navigation & Form State
  const [activeTab, setActiveTab] = useState('command'); // 'command', 'leave', 'doctors', 'audit', 'profile'
  const [selectedDocId, setSelectedDocId] = useState('');
  const [leaveStartDate, setLeaveStartDate] = useState('');
  const [leaveEndDate, setLeaveEndDate] = useState('');
  const [message, setMessage] = useState('');

  // Profile Edit State
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [showProfileModal, setShowProfileModal] = useState(false);

  const todayStr = new Date().toISOString().split('T')[0];

  // 1. Fetch Registered Doctors via React Query with 10s Background Auto-Polling
  const {
    data: doctors = [],
    isLoading: isLoadingDoctors,
  } = useQuery({
    queryKey: ['adminDoctors'],
    queryFn: async () => {
      const res = await API.get('/admin/doctors');
      return res.data.doctors || [];
    },
    refetchInterval: 10000,
  });

  // 2. Fetch System Appointments via React Query with 10s Background Auto-Polling
  const {
    data: appointments = [],
    isLoading: isLoadingAppointments,
  } = useQuery({
    queryKey: ['adminAppointments'],
    queryFn: async () => {
      const res = await API.get('/admin/appointments');
      return res.data.appointments || [];
    },
    refetchInterval: 10000,
  });

  // 3. Mark Leave Mutation
  const markLeaveMutation = useMutation({
    mutationFn: async ({ doctorProfileId, startDate, endDate }) => {
      const res = await API.post(`/admin/doctors/${doctorProfileId}/leave`, {
        startDate,
        endDate: endDate || startDate,
        reason: 'Scheduled Leave',
      });
      return res.data;
    },
    onSuccess: (data) => {
      setMessage(`✅ Doctor leave enforced successfully! ${data.affectedAppointmentsCount} conflicting patient bookings were automatically cancelled with email alerts dispatched.`);
      setSelectedDocId('');
      setLeaveStartDate('');
      setLeaveEndDate('');
      queryClient.invalidateQueries(['adminDoctors']);
      queryClient.invalidateQueries(['adminAppointments']);
    },
    onError: (err) => {
      setMessage(err.response?.data?.message || 'Failed to mark leave');
    },
  });

  // 4. Cancel Appointment Mutation
  const cancelApptMutation = useMutation({
    mutationFn: async (appointmentId) => {
      const res = await API.post(`/admin/appointments/${appointmentId}/cancel`);
      return res.data;
    },
    onSuccess: () => {
      setMessage('✅ Appointment cancelled successfully.');
      queryClient.invalidateQueries(['adminAppointments']);
    },
    onError: (err) => {
      setMessage(err.response?.data?.message || 'Failed to cancel appointment.');
    },
  });

  const handleMarkLeave = (e) => {
    e.preventDefault();
    if (!selectedDocId || !leaveStartDate) return;
    markLeaveMutation.mutate({
      doctorProfileId: selectedDocId,
      startDate: leaveStartDate,
      endDate: leaveEndDate,
    });
  };

  const handleCancelAppointment = (appointment) => {
    const confirmed = window.confirm(
      `Cancel appointment for ${appointment.patient?.name} with Dr. ${appointment.doctorProfile?.user?.name}?`
    );
    if (!confirmed) return;
    cancelApptMutation.mutate(appointment.id);
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    try {
      await API.put('/auth/me', { name, email });
      setMessage('✅ Admin profile updated successfully!');
      setShowProfileModal(false);
    } catch (err) {
      setMessage('Failed to update profile');
    }
  };

  const bookedCount = appointments.filter((a) => a.status === 'BOOKED').length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500 selection:text-white pb-12">
      {/* Top Navigation Header */}
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-600/30 font-black">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h1 className="font-extrabold text-base tracking-tight text-white flex items-center space-x-2">
                  <span>Hospital Admin Command Center</span>
                  <span className="text-[10px] font-extrabold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 px-2 py-0.5 rounded-full uppercase">
                    System Control
                  </span>
                </h1>
                <p className="text-[11px] text-slate-400 font-medium">
                  Administrator ({user?.name}) • High-Density Operational Console
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowProfileModal(true)}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl flex items-center space-x-1.5 transition"
              >
                <User className="w-3.5 h-3.5" />
                <span>Profile</span>
              </button>

              <button
                onClick={() => {
                  logout();
                  navigate('/login');
                }}
                className="px-3.5 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-bold rounded-xl border border-red-500/20 transition flex items-center space-x-1.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>

        {/* E-Commerce Tab Navigation */}
        <div className="bg-slate-950 border-t border-slate-800/80">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <nav className="flex space-x-2 py-2 text-xs font-bold overflow-x-auto">
              <button
                onClick={() => setActiveTab('command')}
                className={`px-4 py-2 rounded-xl transition whitespace-nowrap ${
                  activeTab === 'command'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:bg-slate-900 hover:text-white'
                }`}
              >
                📊 Command Center Overview
              </button>

              <button
                onClick={() => setActiveTab('leave')}
                className={`px-4 py-2 rounded-xl transition whitespace-nowrap ${
                  activeTab === 'leave'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:bg-slate-900 hover:text-white'
                }`}
              >
                🏖️ Doctor Leave Manager
              </button>

              <button
                onClick={() => setActiveTab('doctors')}
                className={`px-4 py-2 rounded-xl transition whitespace-nowrap ${
                  activeTab === 'doctors'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:bg-slate-900 hover:text-white'
                }`}
              >
                👨‍⚕️ Registered Doctors ({doctors.length})
              </button>

              <button
                onClick={() => setActiveTab('audit')}
                className={`px-4 py-2 rounded-xl transition whitespace-nowrap ${
                  activeTab === 'audit'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:bg-slate-900 hover:text-white'
                }`}
              >
                📋 Audit Log ({appointments.length})
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Command Center Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 space-y-6">
        {/* Banner Alert Bar */}
        {message && (
          <div className="p-4 bg-indigo-950/80 border border-indigo-500/30 text-indigo-200 rounded-2xl flex justify-between items-center text-xs shadow-lg">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span className="font-semibold">{message}</span>
            </div>
            <button onClick={() => setMessage('')} className="text-indigo-400 font-bold hover:text-white">
              ✕
            </button>
          </div>
        )}

        {/* TASK 4 DELIVERABLE 1: KPI STATS HEADER ROW */}
        <AdminStatsRow
          doctorsCount={doctors.length}
          bookedCount={bookedCount}
          totalCount={appointments.length}
        />

        {/* OVERVIEW TAB */}
        {activeTab === 'command' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Leave Console Card */}
            <div className="lg:col-span-5 space-y-6">
              <div className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 space-y-4 shadow-xl">
                <h2 className="text-base font-bold text-white flex items-center space-x-2">
                  <Calendar className="w-5 h-5 text-indigo-400" />
                  <span>Enforce Doctor Leave</span>
                </h2>

                <form onSubmit={handleMarkLeave} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                      Select Doctor Profile
                    </label>
                    <select
                      className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs font-semibold outline-none focus:border-indigo-500"
                      value={selectedDocId}
                      onChange={(e) => setSelectedDocId(e.target.value)}
                      required
                    >
                      <option value="">Choose Doctor...</option>
                      {doctors.map((doc) => (
                        <option key={doc.doctorProfile?.id} value={doc.doctorProfile?.id}>
                          Dr. {doc.name} ({doc.doctorProfile?.specialisation || 'General'})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                        Start Date
                      </label>
                      <input
                        type="date"
                        min={todayStr}
                        className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs font-semibold outline-none focus:border-indigo-500"
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
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                        End Date
                      </label>
                      <input
                        type="date"
                        min={leaveStartDate || todayStr}
                        className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs font-semibold outline-none focus:border-indigo-500"
                        value={leaveEndDate}
                        onChange={(e) => setLeaveEndDate(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  {/* TASK 4 DELIVERABLE 2: PROMINENT RED WARNING TEXT */}
                  <div className="p-4 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl text-xs space-y-1 font-medium">
                    <p className="font-bold flex items-center space-x-1.5 text-red-300">
                      <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
                      <span>Warning: Critical Action</span>
                    </p>
                    <p>
                      Enforcing leave will instantly cancel conflicting bookings and trigger email notifications to affected patients.
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={markLeaveMutation.isLoading}
                    className="w-full py-3 bg-red-600 hover:bg-red-500 text-white font-extrabold rounded-xl shadow-lg transition text-xs disabled:opacity-50"
                  >
                    {markLeaveMutation.isLoading
                      ? 'Enforcing Leave & Cancelling Conflicts...'
                      : 'Enforce Doctor Leave & Dispatches Alerts'}
                  </button>
                </form>
              </div>
            </div>

            {/* Right: Quick Audit Preview Table */}
            <div className="lg:col-span-7">
              <AuditTable
                appointments={appointments}
                onCancelAppointment={handleCancelAppointment}
                isLoading={isLoadingAppointments}
              />
            </div>
          </div>
        )}

        {/* LEAVE MANAGEMENT TAB */}
        {activeTab === 'leave' && (
          <div className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 max-w-2xl mx-auto space-y-4 shadow-xl">
            <h2 className="text-lg font-bold text-white flex items-center space-x-2">
              <Calendar className="w-5 h-5 text-indigo-400" />
              <span>Doctor Leave Management Console</span>
            </h2>

            <form onSubmit={handleMarkLeave} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Select Doctor Profile
                </label>
                <select
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs font-semibold outline-none"
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    min={todayStr}
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs font-semibold outline-none"
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
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    min={leaveStartDate || todayStr}
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs font-semibold outline-none"
                    value={leaveEndDate}
                    onChange={(e) => setLeaveEndDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* WARNING TEXT DELIVERABLE */}
              <div className="p-4 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl text-xs space-y-1 font-medium">
                <p className="font-bold text-red-300">
                  Warning: Enforcing leave will instantly cancel conflicting bookings and trigger email notifications.
                </p>
              </div>

              <button
                type="submit"
                disabled={markLeaveMutation.isLoading}
                className="w-full py-3.5 bg-red-600 hover:bg-red-500 text-white font-extrabold rounded-xl shadow-lg transition text-xs disabled:opacity-50"
              >
                Enforce Doctor Leave
              </button>
            </form>
          </div>
        )}

        {/* REGISTERED DOCTORS TAB */}
        {activeTab === 'doctors' && (
          <div className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 space-y-4 shadow-xl">
            <h2 className="text-lg font-bold text-white flex items-center space-x-2">
              <UserCheck className="w-5 h-5 text-indigo-400" />
              <span>Registered Doctor Profiles</span>
            </h2>

            {isLoadingDoctors ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="p-5 bg-slate-950 rounded-2xl border border-slate-800 animate-pulse space-y-2">
                    <div className="w-1/2 h-4 bg-slate-800 rounded"></div>
                    <div className="w-1/3 h-3 bg-slate-800/60 rounded"></div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {doctors.map((doc) => (
                  <div key={doc.id} className="p-5 bg-slate-950 border border-slate-800 rounded-2xl space-y-2">
                    <div className="flex justify-between items-start">
                      <h3 className="font-bold text-white">Dr. {doc.name}</h3>
                      <span className="text-[10px] bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 px-2 py-0.5 rounded-full font-bold">
                        {doc.doctorProfile?.specialisation || 'General'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">Email: {doc.email}</p>
                    <p className="text-xs text-slate-500">Slot Duration: {doc.doctorProfile?.slotDuration || 30} mins</p>
                    <p className="text-xs text-slate-500">Working Hours: {doc.doctorProfile?.workingHours?.start || '09:00'} - {doc.doctorProfile?.workingHours?.end || '17:00'}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* AUDIT LOG TAB */}
        {activeTab === 'audit' && (
          <AuditTable
            appointments={appointments}
            onCancelAppointment={handleCancelAppointment}
            isLoading={isLoadingAppointments}
          />
        )}
      </main>

      {/* Profile Edit Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-2xl p-6 w-full max-w-md border border-slate-800 space-y-4 shadow-2xl">
            <h2 className="text-base font-bold text-white">Admin Profile Settings</h2>
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Admin Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm font-semibold outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm font-semibold outline-none"
                  required
                />
              </div>
              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowProfileModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 text-xs font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl"
                >
                  Save Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
