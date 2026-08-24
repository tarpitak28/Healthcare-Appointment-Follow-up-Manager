import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import API from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  Stethoscope,
  Users,
  Clock,
  Sparkles,
  CheckCircle2,
  FileText,
  Plus,
  Trash2,
  LogOut,
  User,
  Activity,
  AlertCircle,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react';

export default function DoctorDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // State management
  const [selectedAppt, setSelectedAppt] = useState(null);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [clinicalNotes, setClinicalNotes] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [medicines, setMedicines] = useState([
    { name: '', dosage: '', frequency: '', duration: '' },
  ]);
  const [followUpInstructions, setFollowUpInstructions] = useState('');
  const [message, setMessage] = useState('');

  // Profile Edit State
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [showProfileModal, setShowProfileModal] = useState(false);

  // 1. Fetch Doctor Appointments via React Query with 10s Background Auto-Polling
  const {
    data: appointments = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['doctorAppointments'],
    queryFn: async () => {
      const res = await API.get('/doctor/appointments');
      return res.data.appointments || [];
    },
    refetchInterval: 10000,
  });

  const handleMedicineChange = (index, field, value) => {
    setMedicines((prev) =>
      prev.map((medicine, i) => (i === index ? { ...medicine, [field]: value } : medicine))
    );
  };

  const addMedicine = () => {
    setMedicines((prev) => [...prev, { name: '', dosage: '', frequency: '', duration: '' }]);
  };

  const removeMedicine = (index) => {
    setMedicines((prev) => prev.filter((_, i) => i !== index));
  };

  // 2. Submit Consultation Mutation
  const submitPostVisitMutation = useMutation({
    mutationFn: async ({ appointmentId, clinicalNotes, prescription }) => {
      const res = await API.post(`/doctor/appointments/${appointmentId}/post-visit`, {
        clinicalNotes,
        prescription,
      });
      return res.data;
    },
    onSuccess: () => {
      setMessage('✅ Post-visit notes submitted and AI summary generated successfully!');
      setSelectedAppt(null);
      setClinicalNotes('');
      setDiagnosis('');
      setMedicines([{ name: '', dosage: '', frequency: '', duration: '' }]);
      setFollowUpInstructions('');
      queryClient.invalidateQueries(['doctorAppointments']);
    },
    onError: (err) => {
      setMessage(err.response?.data?.message || 'Failed to submit post-visit notes');
    },
  });

  const handlePostVisitSubmit = (e) => {
    e.preventDefault();
    if (!selectedAppt) return;

    const prescription = {
      diagnosis,
      medicines: medicines.filter((m) => m.name.trim() !== ''),
      followUpInstructions,
    };

    submitPostVisitMutation.mutate({
      appointmentId: selectedAppt.id,
      clinicalNotes,
      prescription,
    });
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    try {
      await API.put('/auth/me', { name, email });
      setMessage('✅ Doctor profile updated successfully!');
      setShowProfileModal(false);
    } catch (err) {
      setMessage('Failed to update profile');
    }
  };

  const filteredAppointments = appointments.filter((app) => {
    if (statusFilter === 'ALL') return true;
    return app.status === statusFilter;
  });

  const bookedCount = appointments.filter((a) => a.status === 'BOOKED').length;
  const completedCount = appointments.filter((a) => a.status === 'COMPLETED').length;

  return (
    <div className="h-screen bg-slate-950 text-slate-100 flex flex-col font-sans overflow-hidden selection:bg-indigo-500 selection:text-white">
      {/* Top Fixed Header Bar */}
      <header className="h-16 bg-slate-900 border-b border-slate-800 px-6 flex items-center justify-between flex-shrink-0 z-30">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-600/30">
            <Stethoscope className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-extrabold text-base tracking-tight text-white flex items-center space-x-2">
              <span>Dr. {user?.name}</span>
              <span className="text-[10px] font-extrabold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 px-2 py-0.5 rounded-full uppercase">
                Clinical Workspace
              </span>
            </h1>
            <p className="text-[11px] text-slate-400 font-medium">
              High-Density Split-Pane Patient Queue & Pre-Visit AI Triaging
            </p>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center space-x-3">
          <div className="hidden sm:flex items-center space-x-4 bg-slate-950 px-4 py-1.5 rounded-xl border border-slate-800 text-xs">
            <span className="text-slate-400">
              Today's Queue: <strong className="text-white">{bookedCount}</strong>
            </span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-400">
              Completed: <strong className="text-emerald-400">{completedCount}</strong>
            </span>
          </div>

          <button
            onClick={() => setShowProfileModal(true)}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl flex items-center space-x-1.5 transition"
          >
            <User className="w-3.5 h-3.5" />
            <span>Profile</span>
          </button>

          <button
            onClick={() => {
              logout();
              navigate('/login');
            }}
            className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-bold rounded-xl border border-red-500/20 transition flex items-center space-x-1.5"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* Global Alert Bar */}
      {message && (
        <div className="bg-indigo-950 border-b border-indigo-500/30 px-6 py-2 flex justify-between items-center text-xs text-indigo-200 flex-shrink-0">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <span className="font-semibold">{message}</span>
          </div>
          <button onClick={() => setMessage('')} className="text-indigo-400 font-bold hover:text-white">
            ✕
          </button>
        </div>
      )}

      {/* Split-Pane Main Layout Container (h-full overflow-hidden) */}
      <div className="flex-1 grid grid-cols-12 overflow-hidden min-h-0">
        {/* LEFT PANE: PATIENT QUEUE (4 Columns) */}
        <aside className="col-span-12 lg:col-span-4 border-r border-slate-800 bg-slate-900/60 flex flex-col min-h-0 overflow-hidden">
          {/* Queue Filter Bar */}
          <div className="p-4 border-b border-slate-800/80 bg-slate-900 flex justify-between items-center flex-shrink-0">
            <div className="flex items-center space-x-2">
              <Users className="w-4 h-4 text-indigo-400" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Patient Queue ({filteredAppointments.length})
              </h2>
            </div>

            <div className="flex space-x-1 bg-slate-950 p-1 rounded-xl text-[10px] font-bold border border-slate-800">
              {['ALL', 'BOOKED', 'COMPLETED'].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1 rounded-lg transition ${
                    statusFilter === st
                      ? 'bg-indigo-600 text-white font-extrabold shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Scrollable Patient Queue List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((n) => (
                  <div key={n} className="p-4 bg-slate-900 border border-slate-800 rounded-2xl animate-pulse space-y-2">
                    <div className="w-1/2 h-3.5 bg-slate-800 rounded"></div>
                    <div className="w-1/3 h-2.5 bg-slate-800/60 rounded"></div>
                  </div>
                ))}
              </div>
            ) : filteredAppointments.length === 0 ? (
              <div className="text-center p-8 bg-slate-950 border border-dashed border-slate-800 rounded-2xl text-slate-500 text-xs">
                No patient appointments found.
              </div>
            ) : (
              filteredAppointments.map((app) => {
                const isSelected = selectedAppt?.id === app.id;
                return (
                  <div
                    key={app.id}
                    onClick={() => {
                      setSelectedAppt(app);
                      setClinicalNotes(app.clinicalNotes || '');
                      setDiagnosis(app.prescription?.diagnosis || '');
                      setMedicines(
                        app.prescription?.medicines?.length > 0
                          ? app.prescription.medicines
                          : [{ name: '', dosage: '', frequency: '', duration: '' }]
                      );
                      setFollowUpInstructions(app.prescription?.followUpInstructions || '');
                    }}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-2 ${
                      isSelected
                        ? 'bg-indigo-950/70 border-indigo-500 shadow-lg ring-2 ring-indigo-500/30'
                        : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-white text-sm">
                          {app.patient?.name}
                        </h3>
                        <p className="text-[11px] text-slate-400">{app.patient?.email}</p>
                      </div>

                      <span
                        className={`px-2.5 py-0.5 text-[10px] font-extrabold rounded-full uppercase ${
                          app.status === 'BOOKED'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                        }`}
                      >
                        {app.status}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                      <span className="flex items-center space-x-1">
                        <Clock className="w-3 h-3 text-slate-500" />
                        <span>{app.startTime} - {app.endTime}</span>
                      </span>

                      {app.urgencyLevel && (
                        <span
                          className={`font-black px-2 py-0.5 rounded text-[9px] uppercase ${
                            app.urgencyLevel === 'HIGH'
                              ? 'bg-red-600 text-white'
                              : app.urgencyLevel === 'MEDIUM'
                              ? 'bg-amber-600 text-white'
                              : 'bg-emerald-600 text-white'
                          }`}
                        >
                          Urgency: {app.urgencyLevel}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </aside>

        {/* RIGHT PANE: ACTIVE CONSULTATION WORKSPACE (8 Columns) */}
        <main className="col-span-12 lg:col-span-8 bg-slate-950 flex flex-col min-h-0 overflow-hidden">
          {!selectedAppt ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold">
                👈
              </div>
              <h3 className="font-bold text-white text-base">No Patient Selected</h3>
              <p className="text-xs text-slate-400 max-w-sm">
                Select a patient from the Left Queue to inspect AI pre-visit symptoms and open the clinical prescription workspace.
              </p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Patient Header Banner */}
              <div className="bg-slate-900/90 p-5 rounded-2xl border border-slate-800 flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-bold text-white">
                    Patient Consultation: {selectedAppt.patient?.name}
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Email: {selectedAppt.patient?.email} | Slot: {selectedAppt.startTime} - {selectedAppt.endTime}
                  </p>
                </div>

                <span
                  className={`px-3 py-1 text-xs font-extrabold rounded-full ${
                    selectedAppt.status === 'BOOKED'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  }`}
                >
                  {selectedAppt.status}
                </span>
              </div>

              {/* AI Pre-Visit Triage Card */}
              {selectedAppt.urgencyLevel && (
                <div className="bg-amber-950/40 border border-amber-500/30 p-5 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-200 text-xs flex items-center space-x-1.5">
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      <span>AI Pre-Visit Diagnostic Triage</span>
                    </span>

                    <span
                      className={`px-2.5 py-0.5 text-xs font-black rounded-full uppercase ${
                        selectedAppt.urgencyLevel === 'HIGH'
                          ? 'bg-red-600 text-white shadow-md shadow-red-600/30'
                          : selectedAppt.urgencyLevel === 'MEDIUM'
                          ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
                          : 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                      }`}
                    >
                      Urgency Level: {selectedAppt.urgencyLevel}
                    </span>
                  </div>

                  <div className="text-xs text-amber-100 space-y-1.5">
                    <p>
                      <strong>Chief Complaint:</strong> {selectedAppt.chiefComplaint}
                    </p>
                    <p className="text-slate-300">
                      <strong>Raw Symptoms:</strong> {selectedAppt.symptoms}
                    </p>

                    {selectedAppt.suggestedQuestions?.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-amber-500/20">
                        <strong className="block text-amber-300 mb-1">
                          Suggested Diagnostic Questions for Doctor:
                        </strong>
                        <ul className="list-disc list-inside space-y-0.5 text-slate-300 pl-1">
                          {selectedAppt.suggestedQuestions.map((q, idx) => (
                            <li key={idx}>{q}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Clinical Notes & Prescription Form */}
              <form onSubmit={handlePostVisitSubmit} className="space-y-6">
                {/* Clinical Notes Section */}
                <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 space-y-4">
                  <h3 className="font-bold text-white text-sm flex items-center space-x-2">
                    <FileText className="w-4 h-4 text-indigo-400" />
                    <span>1. Clinical Observations & Diagnosis</span>
                  </h3>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                      Primary Diagnosis
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Acute Typhoid Fever, Mild Hypertension"
                      className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm font-semibold outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/40"
                      value={diagnosis}
                      onChange={(e) => setDiagnosis(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                      Clinical Notes & Examination Findings
                    </label>
                    <textarea
                      rows="4"
                      required
                      placeholder="Enter detailed clinical findings, vital stats, and treatment observations..."
                      className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/40"
                      value={clinicalNotes}
                      onChange={(e) => setClinicalNotes(e.target.value)}
                    ></textarea>
                  </div>
                </div>

                {/* Digital Prescriber Section */}
                <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="font-bold text-white text-sm flex items-center space-x-2">
                      <Stethoscope className="w-4 h-4 text-indigo-400" />
                      <span>2. Digital Medication Prescriber</span>
                    </h3>

                    <button
                      type="button"
                      onClick={addMedicine}
                      className="flex items-center space-x-1 text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-3 py-1.5 rounded-xl shadow-sm transition"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Medicine</span>
                    </button>
                  </div>

                  <div className="space-y-3">
                    {medicines.map((med, idx) => (
                      <div key={idx} className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                        <div className="flex justify-between items-center text-xs font-bold text-slate-400">
                          <span>Medication #{idx + 1}</span>
                          {medicines.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeMedicine(idx)}
                              className="text-red-400 hover:text-red-300 font-bold flex items-center space-x-1"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>Remove</span>
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                          <input
                            type="text"
                            placeholder="Medicine Name"
                            className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs font-semibold text-white outline-none focus:border-indigo-500"
                            value={med.name}
                            onChange={(e) => handleMedicineChange(idx, 'name', e.target.value)}
                          />
                          <input
                            type="text"
                            placeholder="Dosage (500mg)"
                            className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white outline-none focus:border-indigo-500"
                            value={med.dosage}
                            onChange={(e) => handleMedicineChange(idx, 'dosage', e.target.value)}
                          />
                          <input
                            type="text"
                            placeholder="Frequency (Twice daily)"
                            className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white outline-none focus:border-indigo-500"
                            value={med.frequency}
                            onChange={(e) => handleMedicineChange(idx, 'frequency', e.target.value)}
                          />
                          <input
                            type="text"
                            placeholder="Duration (5 days)"
                            className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white outline-none focus:border-indigo-500"
                            value={med.duration}
                            onChange={(e) => handleMedicineChange(idx, 'duration', e.target.value)}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                      Follow-Up Instructions
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Return for follow-up evaluation in 7 days."
                      className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm outline-none focus:border-indigo-500"
                      value={followUpInstructions}
                      onChange={(e) => setFollowUpInstructions(e.target.value)}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitPostVisitMutation.isLoading}
                  className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold rounded-xl shadow-lg transition text-sm disabled:opacity-50"
                >
                  {submitPostVisitMutation.isLoading
                    ? 'Submitting Notes & Generating AI Summary...'
                    : 'Submit Notes & Generate Patient Care Summary'}
                </button>
              </form>
            </div>
          )}
        </main>
      </div>

      {/* Profile Edit Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-2xl p-6 w-full max-w-md border border-slate-800 space-y-4 shadow-2xl">
            <h2 className="text-base font-bold text-white">Doctor Profile Settings</h2>
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Doctor Name</label>
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
