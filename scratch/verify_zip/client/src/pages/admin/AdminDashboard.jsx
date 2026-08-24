import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import API from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import Sidebar from '../../components/layout/Sidebar';
import Topbar from '../../components/layout/Topbar';
import MobileDrawer from '../../components/layout/MobileDrawer';
import AdminStatsRow from './components/AdminStatsRow';
import AuditTable from './components/AuditTable';
import BroadcastConsole from './components/BroadcastConsole';
import Button from '../../components/ui/Button';
import { Calendar, AlertTriangle, Sparkles } from 'lucide-react';

export default function AdminDashboard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState('command');
  const [selectedDocId, setSelectedDocId] = useState('');
  const [leaveStartDate, setLeaveStartDate] = useState('');
  const [leaveEndDate, setLeaveEndDate] = useState('');
  const [message, setMessage] = useState('');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const todayStr = new Date().toISOString().split('T')[0];

  // 1. Fetch Registered Doctors
  const { data: doctors = [] } = useQuery({
    queryKey: ['adminDoctors'],
    queryFn: async () => {
      const res = await API.get('/admin/doctors');
      return res.data.doctors || [];
    },
    refetchInterval: 10000,
  });

  // 2. Fetch System Appointments
  const { data: appointments = [], isLoading: isLoadingAppointments } = useQuery({
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
        reason: 'Scheduled Doctor Leave',
      });
      return res.data;
    },
    onSuccess: (data) => {
      setMessage(`✅ Doctor leave enforced successfully! ${data.affectedAppointmentsCount} conflicting bookings auto-cancelled with email alerts.`);
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

  const bookedCount = appointments.filter((a) => a.status === 'BOOKED').length;

  return (
    <div className="min-h-screen bg-[#F7F9FA] text-[#202124] flex flex-col lg:flex-row font-sans">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} role="ADMIN" />

      <MobileDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        role="ADMIN"
      />

      <div className="flex-1 flex flex-col min-w-0">
        <Topbar
          title="Hospital Admin Command Center"
          subtitle={`Administrator (${user?.name})`}
          onOpenDrawer={() => setIsDrawerOpen(true)}
        />

        {message && (
          <div className="m-4 sm:m-6 mb-0 p-4 bg-[#EAF7FA] border border-[#3FA3C3]/30 text-[#237C9A] rounded-2xl flex justify-between items-center text-xs font-semibold shadow-xs">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-[#3FA3C3] flex-shrink-0" />
              <span>{message}</span>
            </div>
            <button onClick={() => setMessage('')} className="text-[#3FA3C3] font-bold ml-4">
              ✕
            </button>
          </div>
        )}

        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto space-y-6">
          <AdminStatsRow
            doctorsCount={doctors.length}
            bookedCount={bookedCount}
            totalCount={appointments.length}
          />

          {activeTab === 'command' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-5 bg-white p-5 sm:p-6 rounded-2xl border border-[#E5E7EB] space-y-4 shadow-xs">
                <h2 className="text-base font-bold text-[#202124] flex items-center space-x-2">
                  <Calendar className="w-5 h-5 text-[#3FA3C3]" />
                  <span>Enforce Doctor Leave</span>
                </h2>

                <form onSubmit={handleMarkLeave} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase text-[#6F7378] mb-1">Doctor Profile</label>
                    <select
                      className="w-full px-4 py-3 sm:py-2.5 bg-[#F7F9FA] border border-[#E5E7EB] rounded-xl text-xs font-semibold text-[#202124] outline-none min-h-[44px]"
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

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold uppercase text-[#6F7378] mb-1">Start Date</label>
                      <input
                        type="date"
                        min={todayStr}
                        className="w-full px-3.5 py-3 sm:py-2 bg-[#F7F9FA] border border-[#E5E7EB] rounded-xl text-xs text-[#202124] min-h-[44px]"
                        value={leaveStartDate}
                        onChange={(e) => {
                          setLeaveStartDate(e.target.value);
                          if (!leaveEndDate || e.target.value > leaveEndDate) setLeaveEndDate(e.target.value);
                        }}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase text-[#6F7378] mb-1">End Date</label>
                      <input
                        type="date"
                        min={leaveStartDate || todayStr}
                        className="w-full px-3.5 py-3 sm:py-2 bg-[#F7F9FA] border border-[#E5E7EB] rounded-xl text-xs text-[#202124] min-h-[44px]"
                        value={leaveEndDate}
                        onChange={(e) => setLeaveEndDate(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="p-4 bg-[#FDF2F2] border border-[#E46B6B]/30 text-[#E46B6B] rounded-xl text-xs space-y-1 font-medium">
                    <p className="font-bold flex items-center space-x-1.5">
                      <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                      <span>Warning: Critical Action</span>
                    </p>
                    <p>Cancels all affected bookings & notifies patients automatically.</p>
                  </div>

                  <Button type="submit" variant="danger" size="lg" disabled={markLeaveMutation.isLoading} className="w-full min-h-[44px]">
                    {markLeaveMutation.isLoading ? 'Enforcing Leave...' : 'Enforce Doctor Leave'}
                  </Button>
                </form>
              </div>

              <div className="lg:col-span-7">
                <AuditTable
                  appointments={appointments}
                  onCancelAppointment={(app) => cancelApptMutation.mutate(app.id)}
                  isLoading={isLoadingAppointments}
                />
              </div>
            </div>
          )}

          {activeTab === 'audit' && (
            <AuditTable
              appointments={appointments}
              onCancelAppointment={(app) => cancelApptMutation.mutate(app.id)}
              isLoading={isLoadingAppointments}
            />
          )}

          {activeTab === 'broadcast' && <BroadcastConsole />}
        </main>
      </div>
    </div>
  );
}
