import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import API from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import PatientLayout from './PatientLayout';
import BookingWizard from './components/BookingWizard';
import CarePlanCard from '../../components/CarePlanCard';
import HeroBanner from '../../components/dashboard/HeroBanner';
import DoctorCard from '../../components/doctors/DoctorCard';
import AppointmentCard from '../../components/appointments/AppointmentCard';
import StatusBadge from '../../components/StatusBadge';
import EmptyState from '../../components/EmptyState';
import Button from '../../components/ui/Button';
import {
  Calendar,
  ChevronRight,
} from 'lucide-react';

export default function PatientDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [appointmentFilter, setAppointmentFilter] = useState('ALL');
  const [message, setMessage] = useState('');
  const queryClient = useQueryClient();

  // Profile Edit State
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');

  // 1. Fetch Doctors via React Query
  const { data: doctors = [], isLoading: isLoadingDoctors } = useQuery({
    queryKey: ['patientDoctors'],
    queryFn: async () => {
      const res = await API.get('/patient/doctors');
      return res.data.doctors || [];
    },
  });

  // 2. Fetch Appointments via React Query (10s auto-polling)
  const { data: appointments = [], isLoading: isLoadingAppointments, refetch: refetchAppointments } = useQuery({
    queryKey: ['patientAppointments'],
    queryFn: async () => {
      const res = await API.get('/patient/appointments');
      return res.data.appointments || [];
    },
    refetchInterval: 10000,
  });

  // 3. Fetch Medication Reminders via React Query
  const { data: medicationReminders = [], refetch: refetchReminders } = useQuery({
    queryKey: ['medicationReminders'],
    queryFn: async () => {
      const res = await API.get('/medications');
      return res.data.reminders || [];
    },
    refetchInterval: 10000,
  });

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

  const upcomingAppointment = appointments.find((a) => a.status === 'BOOKED');

  return (
    <PatientLayout
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      message={message}
      setMessage={setMessage}
    >
      {/* DASHBOARD TAB */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6 sm:space-y-8">
          {/* Section 7 & 13 Hero Banner */}
          <HeroBanner
            patientName={user?.name || 'Patient'}
            onSearch={() => setActiveTab('book')}
            onFindDoctor={() => setActiveTab('book')}
          />

          {/* Grid Layout: Main Feed (8 Cols) vs Upcoming Card (4 Cols) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Nearby & Recommended Doctors (8 Cols) */}
            <div className="lg:col-span-8 space-y-6">
              {/* Nearby Doctors Section (Section 9 & 15) */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-base sm:text-lg font-bold text-[#202124]">Nearby Doctors</h2>
                  <button
                    onClick={() => setActiveTab('book')}
                    className="text-xs font-bold text-[#3FA3C3] hover:underline flex items-center space-x-1"
                  >
                    <span>View All</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {isLoadingDoctors ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[1, 2].map((n) => (
                      <div key={n} className="p-5 bg-white border border-[#E5E7EB] rounded-2xl animate-pulse space-y-3">
                        <div className="w-1/2 h-4 bg-[#F7F9FA] rounded"></div>
                        <div className="w-1/3 h-3 bg-[#F7F9FA] rounded"></div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {doctors.slice(0, 2).map((doc) => (
                      <DoctorCard
                        key={doc.id || doc.doctorProfile?.id}
                        doctor={doc}
                        onBook={() => setActiveTab('book')}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Recommended Doctors 3-Card Grid (Section 10 & 15) */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-base sm:text-lg font-bold text-[#202124]">Recommended Doctors</h2>
                  <button
                    onClick={() => setActiveTab('book')}
                    className="text-xs font-bold text-[#3FA3C3] hover:underline flex items-center space-x-1"
                  >
                    <span>View All</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {doctors.slice(0, 3).map((doc) => (
                    <DoctorCard
                      key={doc.id || doc.doctorProfile?.id}
                      doctor={doc}
                      onBook={() => setActiveTab('book')}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Right: Upcoming Appointments Widget (4 Cols) */}
            <div className="lg:col-span-4 space-y-6">
              <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4 sm:p-5 space-y-4 shadow-xs">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-[#202124] text-base">
                    Upcoming Appointments
                  </h3>
                  <button
                    onClick={() => setActiveTab('appointments')}
                    className="text-xs font-bold text-[#3FA3C3] hover:underline"
                  >
                    View All
                  </button>
                </div>

                {upcomingAppointment ? (
                  <AppointmentCard
                    appointment={upcomingAppointment}
                    onView={() => setActiveTab('appointments')}
                  />
                ) : (
                  <EmptyState
                    title="No upcoming visits"
                    description="You don't have any appointments scheduled for today."
                    actionLabel="Find a Doctor"
                    onAction={() => setActiveTab('book')}
                  />
                )}
              </div>

              {/* Active Prescriptions Summary Widget */}
              <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4 sm:p-5 space-y-3 shadow-xs">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-[#202124] text-sm">Active Prescriptions</h3>
                  <span className="text-xs font-bold text-[#3FA3C3]">{medicationReminders.length} Active</span>
                </div>
                <p className="text-xs text-[#6F7378]">
                  Track dosage schedules and set daily medication alarms.
                </p>
                <Button variant="secondary" size="sm" className="w-full min-h-[44px]" onClick={() => setActiveTab('prescriptions')}>
                  View Prescriptions
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 1: FIND DOCTORS / BOOKING WIZARD */}
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
        <div className="bg-white p-4 sm:p-6 rounded-2xl border border-[#E5E7EB] space-y-6 shadow-xs">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-[#202124]">My Appointments</h2>
              <p className="text-xs text-[#6F7378]">
                Review appointment history, access AI summaries, and download calendar invites.
              </p>
            </div>

            {/* Scrollable Filter Tabs (Section 17) */}
            <div className="flex space-x-1 bg-[#F7F9FA] p-1 rounded-xl text-xs font-bold border border-[#E5E7EB] overflow-x-auto w-full sm:w-auto">
              {['ALL', 'BOOKED', 'COMPLETED', 'CANCELLED'].map((st) => (
                <button
                  key={st}
                  onClick={() => setAppointmentFilter(st)}
                  className={`px-3 py-1.5 rounded-lg transition flex-shrink-0 ${
                    appointmentFilter === st
                      ? 'bg-[#3FA3C3] text-white font-bold shadow-xs'
                      : 'text-[#6F7378] hover:text-[#202124]'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {isLoadingAppointments ? (
            <div className="space-y-4">
              {[1, 2].map((n) => (
                <div key={n} className="p-5 bg-[#F7F9FA] rounded-2xl border border-[#E5E7EB] animate-pulse space-y-3">
                  <div className="w-1/3 h-4 bg-[#E5E7EB] rounded"></div>
                  <div className="w-1/4 h-3 bg-[#E5E7EB]/60 rounded"></div>
                </div>
              ))}
            </div>
          ) : filteredAppointments.length === 0 ? (
            <EmptyState
              icon={Calendar}
              title="No appointments found"
              description="No appointment records match your current filter standard."
              actionLabel="Book New Appointment"
              onAction={() => setActiveTab('book')}
            />
          ) : (
            <div className="space-y-4">
              {filteredAppointments.map((app) => (
                <AppointmentCard
                  key={app.id}
                  appointment={app}
                  onCancel={async () => {
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
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: CALENDAR */}
      {activeTab === 'calendar' && (
        <div className="bg-white p-4 sm:p-6 rounded-2xl border border-[#E5E7EB] space-y-4 shadow-xs">
          <h2 className="text-lg sm:text-xl font-bold text-[#202124]">My Health Calendar</h2>
          <p className="text-xs text-[#6F7378]">Visual schedule of consultations, follow-ups, and medication reminders.</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            {appointments.map((app) => (
              <AppointmentCard key={app.id} appointment={app} />
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: MEDICAL RECORDS (Section 28) */}
      {activeTab === 'records' && (
        <div className="bg-white p-4 sm:p-6 rounded-2xl border border-[#E5E7EB] space-y-6 shadow-xs">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-[#202124]">Medical Documents</h2>
              <p className="text-xs text-[#6F7378]">Secure digital repository for lab reports, clinical notes, and scans.</p>
            </div>
            <Button variant="primary" size="sm" className="w-full sm:w-auto min-h-[44px]" onClick={() => alert('Document upload modal initiated.')}>
              + Upload Document
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { title: 'Blood Test Report', date: '14 Aug 2026', type: 'PDF Report' },
              { title: 'Cardiology ECG Summary', date: '02 Aug 2026', type: 'Clinical Scan' },
              { title: 'Prescription Records', date: '20 Jul 2026', type: 'Physician Note' },
            ].map((doc, idx) => (
              <div key={idx} className="border border-[#E5E7EB] rounded-2xl p-4 bg-[#F7F9FA] space-y-3">
                <div className="h-28 sm:h-32 bg-white rounded-xl border border-[#E5E7EB] flex items-center justify-center text-[#3FA3C3] font-bold text-xs">
                  PDF Preview
                </div>
                <div>
                  <h4 className="font-bold text-xs text-[#202124]">{doc.title}</h4>
                  <p className="text-[10px] text-[#6F7378]">{doc.date} • {doc.type}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: PRESCRIPTIONS */}
      {activeTab === 'prescriptions' && (
        <div className="bg-white p-4 sm:p-6 rounded-2xl border border-[#E5E7EB] space-y-4 shadow-xs">
          <h2 className="text-lg sm:text-xl font-bold text-[#202124]">Prescribed Medications</h2>
          {appointments.filter((a) => a.prescription).length === 0 ? (
            <EmptyState title="No prescriptions found" description="Physician-prescribed care plans will appear here following consultation completion." />
          ) : (
            <div className="space-y-4">
              {appointments.filter((a) => a.prescription).map((app) => (
                <CarePlanCard key={app.id} appointment={app} onReminderSaved={refetchReminders} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 6: NOTIFICATIONS */}
      {activeTab === 'reminders' && (
        <div className="bg-white p-4 sm:p-6 rounded-2xl border border-[#E5E7EB] space-y-4 shadow-xs max-w-2xl mx-auto">
          <h2 className="text-lg sm:text-xl font-bold text-[#202124]">Notifications & Reminders</h2>
          {medicationReminders.length === 0 ? (
            <EmptyState title="No active notifications" description="All caught up! Notifications and medication alarms will appear here." />
          ) : (
            <div className="space-y-3">
              {medicationReminders.map((rem) => (
                <div key={rem.id} className="p-3.5 sm:p-4 bg-[#F7F9FA] border border-[#E5E7EB] rounded-xl flex justify-between items-center">
                  <div>
                    <h4 className="font-bold text-xs text-[#202124]">{rem.medicineName}</h4>
                    <p className="text-[11px] text-[#6F7378]">Dosage: {rem.dosage || 'Standard'} • Schedule: {Array.isArray(rem.reminderTimes) ? rem.reminderTimes.join(', ') : rem.reminderTimes}</p>
                  </div>
                  <StatusBadge status="CONFIRMED" />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 7: PROFILE (Section 26) */}
      {activeTab === 'profile' && (
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-[#E5E7EB] max-w-lg mx-auto space-y-6 shadow-xs">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 rounded-2xl bg-[#3FA3C3] text-white font-bold text-xl flex items-center justify-center mx-auto shadow-xs">
              {user?.name?.charAt(0) || 'P'}
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-[#202124]">{user?.name}</h2>
            <p className="text-xs text-[#6F7378]">Patient Persona • Mumbai, India</p>
          </div>

          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase text-[#6F7378] mb-1">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 sm:py-2.5 bg-[#F7F9FA] border border-[#E5E7EB] rounded-xl text-[#202124] text-xs font-semibold outline-none focus:border-[#3FA3C3] min-h-[44px]"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-[#6F7378] mb-1">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 sm:py-2.5 bg-[#F7F9FA] border border-[#E5E7EB] rounded-xl text-[#202124] text-xs font-semibold outline-none focus:border-[#3FA3C3] min-h-[44px]"
                required
              />
            </div>
            <Button type="submit" variant="primary" className="w-full min-h-[44px]">
              Save Profile Changes
            </Button>
          </form>
        </div>
      )}
    </PatientLayout>
  );
}
