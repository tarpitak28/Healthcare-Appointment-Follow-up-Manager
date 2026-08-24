import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import API from '../../api/axios';
import PatientLayout from './PatientLayout';
import BookingWizard from './components/BookingWizard';
import CarePlanCard from '../../components/CarePlanCard';
import CalendarActions from '../../components/CalendarActions';
import {
  Calendar,
  Clock,
  Pill,
  CheckCircle2,
  FileText,
  Bell,
  Activity,
} from 'lucide-react';

export default function PatientDashboard() {
  const [activeTab, setActiveTab] = useState('book'); // 'book', 'appointments', 'reminders', 'profile'
  const [appointmentFilter, setAppointmentFilter] = useState('ALL');
  const [message, setMessage] = useState('');
  const queryClient = useQueryClient();

  // Profile Edit State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  // Medication Reminder Modal State
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [selectedMedicine, setSelectedMedicine] = useState(null);
  const [reminderTimes, setReminderTimes] = useState(['09:00']);
  const [reminderStartDate, setReminderStartDate] = useState('');
  const [reminderEndDate, setReminderEndDate] = useState('');

  // 1. Fetch Appointments via React Query with 10s Background Auto-Polling
  const {
    data: appointments = [],
    isLoading: isLoadingAppointments,
    refetch: refetchAppointments,
  } = useQuery({
    queryKey: ['patientAppointments'],
    queryFn: async () => {
      const res = await API.get('/patient/appointments');
      return res.data.appointments || [];
    },
    refetchInterval: 10000,
  });

  // 2. Fetch Medication Reminders via React Query with 10s Auto-Polling
  const {
    data: medicationReminders = [],
    refetch: refetchReminders,
  } = useQuery({
    queryKey: ['medicationReminders'],
    queryFn: async () => {
      const res = await API.get('/medications');
      return res.data.reminders || [];
    },
    refetchInterval: 10000,
  });

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
      refetchReminders();
    } catch (error) {
      console.error('Save reminder error:', error);
      alert(error.response?.data?.message || error.message);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    try {
      await API.put('/auth/me', { name, email });
      setMessage('✅ Profile updated successfully!');
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
    <PatientLayout
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      message={message}
      setMessage={setMessage}
    >
      {/* Overview Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 flex items-center justify-between shadow-lg">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
              Upcoming Visits
            </p>
            <h3 className="text-2xl font-black text-white mt-1">{bookedCount}</h3>
          </div>
          <div className="w-12 h-12 bg-indigo-500/10 text-indigo-400 rounded-xl flex items-center justify-center">
            <Calendar className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 flex items-center justify-between shadow-lg">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
              Completed Visits
            </p>
            <h3 className="text-2xl font-black text-white mt-1">{completedCount}</h3>
          </div>
          <div className="w-12 h-12 bg-emerald-500/10 text-emerald-400 rounded-xl flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 flex items-center justify-between shadow-lg">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
              Active Reminders
            </p>
            <h3 className="text-2xl font-black text-white mt-1">{medicationReminders.length}</h3>
          </div>
          <div className="w-12 h-12 bg-blue-500/10 text-blue-400 rounded-xl flex items-center justify-center">
            <Bell className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* TAB 1: BOOK APPOINTMENT WIZARD */}
      {activeTab === 'book' && (
        <BookingWizard
          onBookingSuccess={() => {
            queryClient.invalidateQueries(['patientAppointments']);
            setActiveTab('appointments');
          }}
          setMessage={setMessage}
        />
      )}

      {/* TAB 2: MY APPOINTMENTS */}
      {activeTab === 'appointments' && (
        <div className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-lg font-bold text-white">Consultation History & Care Plans</h2>
              <p className="text-xs text-slate-400">
                Track status, access AI summaries, and download calendar invites.
              </p>
            </div>

            <div className="flex space-x-2 bg-slate-950 p-1 rounded-xl text-xs font-bold border border-slate-800">
              {['ALL', 'BOOKED', 'COMPLETED', 'CANCELLED'].map((st) => (
                <button
                  key={st}
                  onClick={() => setAppointmentFilter(st)}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    appointmentFilter === st
                      ? 'bg-indigo-600 text-white font-extrabold shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {isLoadingAppointments ? (
            <div className="space-y-4">
              {[1, 2, 3].map((n) => (
                <div key={n} className="p-5 bg-slate-950/60 rounded-2xl border border-slate-800 animate-pulse space-y-3">
                  <div className="w-1/3 h-4 bg-slate-800 rounded"></div>
                  <div className="w-1/4 h-3 bg-slate-800/60 rounded"></div>
                </div>
              ))}
            </div>
          ) : filteredAppointments.length === 0 ? (
            <div className="text-center p-12 bg-slate-950 border border-dashed border-slate-800 rounded-2xl text-slate-500 text-xs">
              No appointments found for filter standard.
            </div>
          ) : (
            <div className="space-y-4">
              {filteredAppointments.map((app) => (
                <div
                  key={app.id}
                  className="p-5 border border-slate-800 rounded-2xl bg-slate-950/70 hover:border-slate-700 transition space-y-4"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="font-bold text-white text-base">
                          Dr. {app.doctorProfile?.user?.name || 'Doctor'}
                        </h3>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                          {app.doctorProfile?.specialisation || 'General'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1 flex items-center space-x-2">
                        <span>📅 {String(app.appointmentDate).split('T')[0].split('-').reverse().join('/')}</span>
                        <span>•</span>
                        <span>🕒 {app.startTime} - {app.endTime}</span>
                      </p>
                    </div>

                    <span
                      className={`px-3 py-1 text-xs font-extrabold rounded-full ${
                        app.status === 'BOOKED'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : app.status === 'COMPLETED'
                          ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                          : 'bg-red-500/20 text-red-400 border border-red-500/30'
                      }`}
                    >
                      {app.status}
                    </span>
                  </div>

                  <div className="p-3.5 bg-slate-900 rounded-xl text-xs text-slate-300 border border-slate-800">
                    <p><strong className="text-slate-200">Symptoms:</strong> {app.symptoms}</p>
                    {app.urgencyLevel && (
                      <p className="text-indigo-400 mt-1 font-semibold">
                        <strong>AI Urgency Assessment:</strong> {app.urgencyLevel} | <strong>Chief Complaint:</strong> {app.chiefComplaint}
                      </p>
                    )}
                  </div>

                  {/* Care Plan Card Component */}
                  <CarePlanCard appointment={app} onReminderSaved={refetchReminders} />

                  {/* Calendar Actions Bar & Cancel Action */}
                  {app.status === 'BOOKED' && (
                    <div className="flex flex-wrap items-center justify-between pt-2 border-t border-slate-800 gap-2">
                      <CalendarActions
                        doctorName={app.doctorProfile?.user?.name || 'Doctor'}
                        appointmentDate={app.appointmentDate}
                        startTime={app.startTime}
                        endTime={app.endTime}
                        symptoms={app.symptoms}
                      />

                      <button
                        type="button"
                        onClick={async () => {
                          const confirmed = window.confirm('Cancel this appointment?');
                          if (!confirmed) return;
                          try {
                            await API.delete(`/patient/appointments/${app.id}`);
                            setMessage('✅ Appointment cancelled successfully.');
                            refetchAppointments();
                          } catch (err) {
                            setMessage(err.response?.data?.message || 'Failed to cancel appointment.');
                          }
                        }}
                        className="px-3.5 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl text-xs font-bold border border-red-500/20 active:scale-95 transition"
                      >
                        Cancel Booking
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: REMINDERS */}
      {activeTab === 'reminders' && (
        <div className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 space-y-4">
          <h2 className="text-lg font-bold text-white">Active Medication Reminders</h2>
          {medicationReminders.length === 0 ? (
            <div className="text-center p-12 bg-slate-950 border border-dashed border-slate-800 rounded-2xl text-slate-500 text-xs">
              No active medication reminders configured yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {medicationReminders.map((rem) => (
                <div key={rem.id} className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                  <div className="flex justify-between items-center">
                    <h3 className="font-bold text-white">{rem.medicineName}</h3>
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
                      ACTIVE
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">Dosage: {rem.dosage || 'Standard'}</p>
                  <p className="text-xs text-slate-400">Schedule: {Array.isArray(rem.reminderTimes) ? rem.reminderTimes.join(', ') : rem.reminderTimes}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: PROFILE */}
      {activeTab === 'profile' && (
        <div className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 max-w-md mx-auto space-y-4">
          <h2 className="text-lg font-bold text-white">Patient Profile</h2>
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Full Name</label>
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
            <button
              type="submit"
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg transition text-xs"
            >
              Save Profile Changes
            </button>
          </form>
        </div>
      )}

      {/* Medication Reminder Modal */}
      {showReminderModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-2xl p-6 w-full max-w-md border border-slate-800 space-y-4 shadow-2xl">
            <h2 className="text-base font-bold text-white">Set Medication Reminder</h2>
            {selectedMedicine && (
              <div className="bg-indigo-950/60 p-3 rounded-xl border border-indigo-500/30 text-xs text-indigo-200">
                <p className="font-bold text-white">{selectedMedicine.name}</p>
                <p>Dosage: {selectedMedicine.dosage || 'N/A'}</p>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Reminder Times</label>
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
                    className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-semibold flex-1"
                  />
                  {reminderTimes.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setReminderTimes(reminderTimes.filter((_, i) => i !== idx))}
                      className="text-red-400 px-2 font-bold"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() => setReminderTimes([...reminderTimes, '09:00'])}
                className="text-indigo-400 text-xs font-bold hover:underline"
              >
                + Add time
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Start Date</label>
                <input
                  type="date"
                  value={reminderStartDate}
                  onChange={(e) => setReminderStartDate(e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 w-full text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">End Date</label>
                <input
                  type="date"
                  value={reminderEndDate}
                  onChange={(e) => setReminderEndDate(e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 w-full text-xs text-white"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setShowReminderModal(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 text-xs font-bold rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveMedicationReminder}
                className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl"
              >
                Save Reminder
              </button>
            </div>
          </div>
        </div>
      )}
    </PatientLayout>
  );
}
