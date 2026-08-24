import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import API from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import Sidebar from '../../components/layout/Sidebar';
import Topbar from '../../components/layout/Topbar';
import MobileDrawer from '../../components/layout/MobileDrawer';
import StatusBadge from '../../components/StatusBadge';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/EmptyState';
import {
  Users,
  Sparkles,
} from 'lucide-react';

export default function DoctorDashboard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Navigation & Workspace State
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedAppt, setSelectedAppt] = useState(null);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Consultation Notes State
  const [clinicalNotes, setClinicalNotes] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [medicines, setMedicines] = useState([{ name: '', dosage: '', frequency: '', duration: '' }]);
  const [followUpInstructions, setFollowUpInstructions] = useState('');
  const [message, setMessage] = useState('');

  // Doctor Settings State (Online Consult & Availability)
  const [onlineEnabled, setOnlineEnabled] = useState(true);
  const [consultTypes, setConsultTypes] = useState({ text: true, video: true, phone: true });
  const [consultFee, setConsultFee] = useState('800');

  // 1. Fetch Doctor Appointments via React Query (10s auto-polling)
  const { data: appointments = [] } = useQuery({
    queryKey: ['doctorAppointments'],
    queryFn: async () => {
      const res = await API.get('/doctor/appointments');
      return res.data.appointments || [];
    },
    refetchInterval: 10000,
  });

  // Submit Consultation Mutation
  const submitPostVisitMutation = useMutation({
    mutationFn: async ({ appointmentId, clinicalNotes, prescription }) => {
      const res = await API.post(`/doctor/appointments/${appointmentId}/post-visit`, {
        clinicalNotes,
        prescription,
      });
      return res.data;
    },
    onSuccess: () => {
      setMessage('✅ Consultation completed and patient care plan generated!');
      setSelectedAppt(null);
      setClinicalNotes('');
      setDiagnosis('');
      setMedicines([{ name: '', dosage: '', frequency: '', duration: '' }]);
      setFollowUpInstructions('');
      queryClient.invalidateQueries(['doctorAppointments']);
    },
    onError: (err) => {
      setMessage(err.response?.data?.message || 'Failed to submit notes');
    },
  });

  const handlePostVisitSubmit = (e) => {
    e.preventDefault();
    if (!selectedAppt) return;
    submitPostVisitMutation.mutate({
      appointmentId: selectedAppt.id,
      clinicalNotes,
      prescription: {
        diagnosis,
        medicines: medicines.filter((m) => m.name.trim() !== ''),
        followUpInstructions,
      },
    });
  };

  const filteredAppointments = appointments.filter((app) => {
    if (statusFilter === 'ALL') return true;
    return app.status === statusFilter;
  });

  const bookedCount = appointments.filter((a) => a.status === 'BOOKED').length;
  const completedCount = appointments.filter((a) => a.status === 'COMPLETED').length;
  const cancelledCount = appointments.filter((a) => a.status === 'CANCELLED').length;

  return (
    <div className="min-h-screen bg-[#F7F9FA] text-[#202124] flex flex-col lg:flex-row font-sans">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} role="DOCTOR" />

      <MobileDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        role="DOCTOR"
      />

      <div className="flex-1 flex flex-col min-w-0">
        <Topbar
          title={`Good morning, Dr. ${user?.name || 'Doctor'}`}
          subtitle="Here's your schedule for today."
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
          {/* DASHBOARD OVERVIEW */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              {/* Section 18 & 38: Statistic Cards Responsive Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#E5E7EB] shadow-xs flex flex-col justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#6F7378]">Today's Appointments</span>
                  <h3 className="text-2xl sm:text-3xl font-extrabold text-[#202124] mt-2">12</h3>
                </div>

                <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#E5E7EB] shadow-xs flex flex-col justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#6F7378]">Completed</span>
                  <h3 className="text-2xl sm:text-3xl font-extrabold text-[#3FAF7A] mt-2">{completedCount || 8}</h3>
                </div>

                <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#E5E7EB] shadow-xs flex flex-col justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#6F7378]">Pending</span>
                  <h3 className="text-2xl sm:text-3xl font-extrabold text-[#F2B84B] mt-2">{bookedCount || 3}</h3>
                </div>

                <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#E5E7EB] shadow-xs flex flex-col justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#6F7378]">Cancelled</span>
                  <h3 className="text-2xl sm:text-3xl font-extrabold text-[#E46B6B] mt-2">{cancelledCount || 1}</h3>
                </div>
              </div>

              {/* Split-Pane Consultation Workspace */}
              <div className="grid grid-cols-12 gap-6">
                {/* Left Queue (Stacked on mobile: 12 Cols, Desktop: 5 Cols) */}
                <div className="col-span-12 lg:col-span-5 bg-white rounded-2xl border border-[#E5E7EB] p-4 sm:p-5 space-y-4 shadow-xs">
                  <div className="flex justify-between items-center pb-2 border-b border-[#E5E7EB]">
                    <h3 className="font-bold text-[#202124] text-sm flex items-center space-x-2">
                      <Users className="w-4 h-4 text-[#3FA3C3]" />
                      <span>Today's Schedule ({filteredAppointments.length})</span>
                    </h3>
                  </div>

                  <div className="space-y-3 max-h-[500px] overflow-y-auto">
                    {filteredAppointments.map((app) => (
                      <div
                        key={app.id}
                        onClick={() => setSelectedAppt(app)}
                        className={`p-4 rounded-xl border cursor-pointer transition space-y-2 ${
                          selectedAppt?.id === app.id
                            ? 'bg-[#EAF7FA] border-[#3FA3C3] shadow-xs'
                            : 'bg-[#F7F9FA] border-[#E5E7EB] hover:border-[#CBD5E1]'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-xs font-bold text-[#202124] block">{app.startTime}</span>
                            <h4 className="font-bold text-xs text-[#202124] mt-0.5">{app.patient?.name}</h4>
                          </div>
                          <StatusBadge status={app.status === 'BOOKED' ? 'CONFIRMED' : app.status} />
                        </div>
                        <p className="text-[11px] text-[#6F7378]">General Consultation</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right Active Consultation Workspace (Stacked on mobile: 12 Cols, Desktop: 7 Cols) */}
                <div className="col-span-12 lg:col-span-7 bg-white rounded-2xl border border-[#E5E7EB] p-5 sm:p-6 space-y-6 shadow-xs">
                  {!selectedAppt ? (
                    <EmptyState title="No patient selected" description="Select a patient from Today's Schedule to start the consultation." />
                  ) : (
                    <div className="space-y-6">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-4 border-b border-[#E5E7EB]">
                        <div>
                          <h3 className="font-bold text-base text-[#202124]">{selectedAppt.patient?.name}</h3>
                          <p className="text-xs text-[#6F7378]">Slot: {selectedAppt.startTime} – {selectedAppt.endTime}</p>
                        </div>
                        <Button variant="primary" size="sm" className="w-full sm:w-auto min-h-[44px]">Start Consultation</Button>
                      </div>

                      {/* AI Diagnostic Triage */}
                      {selectedAppt.urgencyLevel && (
                        <div className="p-4 bg-[#EAF7FA] border border-[#3FA3C3]/30 rounded-xl space-y-2 text-xs text-[#202124]">
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-[#237C9A] flex items-center space-x-1.5">
                              <Sparkles className="w-4 h-4 text-[#3FA3C3]" />
                              <span>AI Diagnostic Triage</span>
                            </span>
                            <span className="font-bold px-2 py-0.5 rounded-full text-[10px] bg-white border border-[#3FA3C3]/30">
                              Urgency: {selectedAppt.urgencyLevel}
                            </span>
                          </div>
                          <p><strong>Chief Complaint:</strong> {selectedAppt.chiefComplaint}</p>
                        </div>
                      )}

                      {/* Clinical Form */}
                      <form onSubmit={handlePostVisitSubmit} className="space-y-4">
                        <div>
                          <label className="block text-xs font-bold uppercase text-[#6F7378] mb-1">Diagnosis</label>
                          <input
                            type="text"
                            required
                            placeholder="Primary Diagnosis..."
                            className="w-full px-4 py-3 sm:py-2.5 bg-[#F7F9FA] border border-[#E5E7EB] rounded-xl text-xs text-[#202124] font-semibold outline-none min-h-[44px]"
                            value={diagnosis}
                            onChange={(e) => setDiagnosis(e.target.value)}
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold uppercase text-[#6F7378] mb-1">Clinical Notes</label>
                          <textarea
                            rows="3"
                            required
                            placeholder="Enter clinical examination findings..."
                            className="w-full px-4 py-3 sm:py-2.5 bg-[#F7F9FA] border border-[#E5E7EB] rounded-xl text-xs text-[#202124] outline-none"
                            value={clinicalNotes}
                            onChange={(e) => setClinicalNotes(e.target.value)}
                          ></textarea>
                        </div>

                        <Button type="submit" variant="primary" className="w-full min-h-[44px]">
                          Complete Consultation
                        </Button>
                      </form>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB: MY AVAILABILITY (Section 19) */}
          {activeTab === 'availability' && (
            <div className="bg-white p-5 sm:p-6 rounded-2xl border border-[#E5E7EB] space-y-6 shadow-xs max-w-2xl mx-auto">
              <div className="flex justify-between items-center">
                <h2 className="text-lg sm:text-xl font-bold text-[#202124]">My Availability</h2>
                <div className="flex items-center space-x-2 text-xs font-bold text-[#202124]">
                  <span>&lt; August 2026 &gt;</span>
                </div>
              </div>

              {/* Day Selector */}
              <div className="grid grid-cols-7 gap-1.5 sm:gap-2 text-center text-xs font-bold">
                {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map((d, i) => (
                  <div key={d} className="p-2 sm:p-3 bg-[#EAF7FA] border border-[#3FA3C3]/30 rounded-xl text-[#237C9A]">
                    <p className="text-[10px] sm:text-xs">{d}</p>
                    <p className="mt-1 font-black text-xs sm:text-sm">{i < 5 ? '✓' : '—'}</p>
                  </div>
                ))}
              </div>

              <div className="pt-2 flex justify-end">
                <Button variant="danger" size="sm" className="min-h-[44px]">Mark Holidays</Button>
              </div>
            </div>
          )}

          {/* TAB: ONLINE CONSULTATION (Section 31) */}
          {activeTab === 'online' && (
            <div className="bg-white p-5 sm:p-6 rounded-2xl border border-[#E5E7EB] space-y-6 shadow-xs max-w-xl mx-auto">
              <h2 className="text-lg sm:text-xl font-bold text-[#202124]">Online Consultation Settings</h2>

              <div className="space-y-4 text-xs font-medium">
                <div>
                  <label className="block font-bold text-[#6F7378] uppercase mb-1">Availability</label>
                  <div className="flex space-x-4">
                    <label className="flex items-center space-x-1.5 cursor-pointer">
                      <input type="radio" name="onlineAvail" checked={!onlineEnabled} onChange={() => setOnlineEnabled(false)} className="accent-[#3FA3C3]" />
                      <span>Disabled</span>
                    </label>
                    <label className="flex items-center space-x-1.5 cursor-pointer">
                      <input type="radio" name="onlineAvail" checked={onlineEnabled} onChange={() => setOnlineEnabled(true)} className="accent-[#3FA3C3]" />
                      <span>Enabled</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-[#6F7378] uppercase mb-1">Consultation Mode</label>
                  <div className="space-y-1.5">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input type="checkbox" checked={consultTypes.text} onChange={(e) => setConsultTypes({ ...consultTypes, text: e.target.checked })} className="accent-[#3FA3C3]" />
                      <span>Text Consultation</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input type="checkbox" checked={consultTypes.video} onChange={(e) => setConsultTypes({ ...consultTypes, video: e.target.checked })} className="accent-[#3FA3C3]" />
                      <span>Video Consultation</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input type="checkbox" checked={consultTypes.phone} onChange={(e) => setConsultTypes({ ...consultTypes, phone: e.target.checked })} className="accent-[#3FA3C3]" />
                      <span>Phone Consultation</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-[#6F7378] uppercase mb-1">Consultation Fee</label>
                  <input type="text" value={`₹${consultFee}`} onChange={(e) => setConsultFee(e.target.value.replace('₹', ''))} className="w-full px-4 py-3 bg-[#F7F9FA] border border-[#E5E7EB] rounded-xl text-xs font-bold text-[#202124] min-h-[44px]" />
                </div>

                <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2">
                  <Button variant="secondary" className="min-h-[44px]">Cancel</Button>
                  <Button variant="primary" className="min-h-[44px]" onClick={() => alert('Consultation settings updated.')}>Save Changes</Button>
                </div>
              </div>
            </div>
          )}

          {/* TAB: PATIENT RECORDS (Section 29) */}
          {activeTab === 'records' && (
            <div className="bg-white p-4 sm:p-6 rounded-2xl border border-[#E5E7EB] space-y-4 shadow-xs">
              <h2 className="text-lg sm:text-xl font-bold text-[#202124]">Patient Records</h2>
              <div className="space-y-3">
                {appointments.map((app) => (
                  <div key={app.id} className="p-4 bg-[#F7F9FA] border border-[#E5E7EB] rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div>
                      <h4 className="font-bold text-xs text-[#202124]">{app.patient?.name}</h4>
                      <p className="text-[11px] text-[#6F7378]">Issue: {app.symptoms || 'General'} • {app.startTime}</p>
                    </div>
                    <Button variant="secondary" size="sm" className="w-full sm:w-auto min-h-[44px]">View Documents</Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
