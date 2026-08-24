import React, { useState, useEffect } from 'react';
import API from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function DoctorDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Navigation Tabs (Amazon / Flipkart Style)
  const [activeTab, setActiveTab] = useState('appointments'); // 'appointments', 'notes', 'profile'
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL', 'BOOKED', 'COMPLETED'

  // Data states
  const [appointments, setAppointments] = useState([]);
  const [activeAppt, setActiveAppt] = useState(null);
  const [clinicalNotes, setClinicalNotes] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [medicines, setMedicines] = useState([
    {
      name: '',
      dosage: '',
      frequency: '',
      duration: '',
    },
  ]);
  const [followUpInstructions, setFollowUpInstructions] = useState('');
  const [message, setMessage] = useState('');

  // Profile edit states
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');

  useEffect(() => {
    fetchAppointments();
    // Real-Time Automated Frontend Syncing for Doctor Consultations (polls every 10 seconds)
    const syncInterval = setInterval(() => {
      fetchAppointments();
    }, 10000);
    return () => clearInterval(syncInterval);
  }, []);

  const fetchAppointments = async () => {
    try {
      const res = await API.get('/doctor/appointments');
      setAppointments(res.data.appointments || []);
    } catch (err) {
      console.error('Error fetching doctor appointments', err);
    }
  };

  const handleMedicineChange = (index, field, value) => {
    setMedicines((prev) =>
      prev.map((medicine, i) =>
        i === index ? { ...medicine, [field]: value } : medicine
      )
    );
  };

  const addMedicine = () => {
    setMedicines((prev) => [
      ...prev,
      { name: '', dosage: '', frequency: '', duration: '' },
    ]);
  };

  const removeMedicine = (index) => {
    setMedicines((prev) => prev.filter((_, i) => i !== index));
  };

  const handlePostVisitSubmit = async (e) => {
    e.preventDefault();
    if (!activeAppt) return;

    try {
      const prescription = {
        diagnosis,
        medicines: medicines.filter((medicine) => medicine.name.trim() !== ''),
        followUpInstructions,
      };

      await API.post(`/doctor/appointments/${activeAppt.id}/post-visit`, {
        clinicalNotes,
        prescription,
      });

      setMessage('✅ Post-visit notes submitted and AI summary generated successfully!');
      setActiveAppt(null);
      setClinicalNotes('');
      setDiagnosis('');
      setMedicines([{ name: '', dosage: '', frequency: '', duration: '' }]);
      setFollowUpInstructions('');
      setActiveTab('appointments');
      fetchAppointments();
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to submit post-visit notes');
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    try {
      await API.put('/auth/me', { name, email });
      setMessage('✅ Doctor profile updated successfully!');
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
  const completedCount = appointments.filter((a) => a.status === 'COMPLETED').length;

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-900 pb-12">
      {/* Top Header Bar */}
      <header className="bg-slate-900 text-white shadow-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="bg-indigo-600 p-2 rounded-xl text-white font-black text-xl shadow-lg">
                👨‍⚕️
              </div>
              <div>
                <span className="text-xl font-extrabold tracking-tight text-slate-100">
                  Dr. {user?.name}
                </span>
                <span className="block text-xs text-slate-400 font-medium">Physician & Specialist Portal</span>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2 bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="text-xs font-semibold text-slate-200">Online</span>
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

        {/* E-Commerce Tab Navigation */}
        <div className="bg-slate-950 border-t border-slate-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <nav className="flex space-x-2 sm:space-x-4 py-2 text-sm font-semibold">
              <button
                onClick={() => setActiveTab('appointments')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition ${
                  activeTab === 'appointments'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-300 hover:bg-slate-900 hover:text-white'
                }`}
              >
                <span>📋</span>
                <span>Patient Consultations</span>
                {bookedCount > 0 && (
                  <span className="bg-emerald-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                    {bookedCount}
                  </span>
                )}
              </button>

              {activeAppt && (
                <button
                  onClick={() => setActiveTab('notes')}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition ${
                    activeTab === 'notes'
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'text-slate-300 hover:bg-slate-900 hover:text-white'
                  }`}
                >
                  <span>✍️</span>
                  <span>Active Visit Notes</span>
                </button>
              )}

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
        {/* Banner Alert */}
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

        {/* Overview Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Scheduled Today</p>
              <h3 className="text-2xl font-black text-slate-800 mt-1">{bookedCount}</h3>
            </div>
            <div className="bg-indigo-50 p-3 rounded-xl text-indigo-600 text-2xl">📋</div>
          </div>

          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Completed Visits</p>
              <h3 className="text-2xl font-black text-slate-800 mt-1">{completedCount}</h3>
            </div>
            <div className="bg-emerald-50 p-3 rounded-xl text-emerald-600 text-2xl">✅</div>
          </div>

          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Active Consultation</p>
              <h3 className="text-sm font-bold text-indigo-600 mt-1">
                {activeAppt ? activeAppt.patient?.name : 'None Selected'}
              </h3>
            </div>
            <div className="bg-blue-50 p-3 rounded-xl text-blue-600 text-2xl">🩺</div>
          </div>
        </div>

        {/* TAB 1: PATIENT CONSULTATIONS */}
        {activeTab === 'appointments' && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/80">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <div>
                <h2 className="text-xl font-bold text-slate-800">Patient Appointments & AI Summaries</h2>
                <p className="text-xs text-slate-500">Inspect patient symptoms prior to visit and complete clinical summaries.</p>
              </div>

              {/* Filters */}
              <div className="flex space-x-2 bg-slate-100 p-1 rounded-xl text-xs font-bold">
                {['ALL', 'BOOKED', 'COMPLETED'].map((st) => (
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

            {filteredAppointments.length === 0 ? (
              <div className="text-center p-12 bg-slate-50 border border-dashed rounded-xl text-slate-500">
                No patient appointments found.
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
                            Patient: {app.patient?.name}
                          </h3>
                          <span className="text-xs text-slate-500 font-medium">({app.patient?.email})</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          📅 Date: {new Date(app.appointmentDate).toLocaleDateString()} | 🕒 Time: {app.startTime} - {app.endTime}
                        </p>
                      </div>

                      <span
                        className={`px-3 py-1 text-xs font-extrabold rounded-full ${
                          app.status === 'BOOKED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {app.status}
                      </span>
                    </div>

                    {/* Patient Symptoms */}
                    <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-700">
                      <strong>Patient Symptoms:</strong> {app.symptoms}
                    </div>

                    {/* AI Pre-Visit Symptom Summary Card */}
                    {app.urgencyLevel && (
                      <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-amber-950">✨ AI Pre-Visit Assessment</span>
                          <span
                            className={`px-2.5 py-0.5 text-xs font-black rounded-full uppercase ${
                              app.urgencyLevel === 'HIGH'
                                ? 'bg-red-600 text-white'
                                : app.urgencyLevel === 'MEDIUM'
                                ? 'bg-amber-600 text-white'
                                : 'bg-emerald-600 text-white'
                            }`}
                          >
                            Urgency: {app.urgencyLevel}
                          </span>
                        </div>

                        <p><strong>Chief Complaint:</strong> {app.chiefComplaint}</p>

                        {app.suggestedQuestions?.length > 0 && (
                          <div>
                            <strong className="block mb-1">Suggested Diagnostic Questions:</strong>
                            <ul className="list-disc list-inside space-y-0.5 pl-1">
                              {app.suggestedQuestions.map((q, idx) => (
                                <li key={idx}>{q}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Action Bar */}
                    <div className="flex justify-end space-x-3 pt-2">
                      {app.status === 'BOOKED' ? (
                        <button
                          onClick={() => {
                            setActiveAppt(app);
                            setActiveTab('notes');
                          }}
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm transition"
                        >
                          ✍️ Complete Visit & Write Notes
                        </button>
                      ) : (
                        <span className="text-xs text-emerald-600 font-bold">
                          ✓ Consultation Summary Complete
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: ACTIVE VISIT NOTES FORM */}
        {activeTab === 'notes' && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/80 max-w-3xl mx-auto space-y-6">
            <div className="flex justify-between items-center border-b pb-4">
              <div>
                <h2 className="text-xl font-bold text-slate-800">
                  Clinical Notes & Prescription — {activeAppt?.patient?.name}
                </h2>
                <p className="text-xs text-slate-500">
                  Submitting will automatically generate a patient-friendly AI summary.
                </p>
              </div>

              <button
                onClick={() => setActiveTab('appointments')}
                className="px-3 py-1.5 bg-slate-100 text-slate-700 text-xs font-bold rounded-lg hover:bg-slate-200"
              >
                Back to Appointments
              </button>
            </div>

            <form onSubmit={handlePostVisitSubmit} className="space-y-6">
              {/* Diagnosis */}
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                  Diagnosis
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Acute Typhoid Fever, Mild Hypertension"
                  className="w-full px-4 py-2.5 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-semibold"
                  value={diagnosis}
                  onChange={(e) => setDiagnosis(e.target.value)}
                />
              </div>

              {/* Clinical Notes */}
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                  Clinical Notes & Observation
                </label>
                <textarea
                  rows="4"
                  required
                  placeholder="Enter detailed clinical findings, vital stats, and treatment observations..."
                  className="w-full px-4 py-2.5 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  value={clinicalNotes}
                  onChange={(e) => setClinicalNotes(e.target.value)}
                ></textarea>
              </div>

              {/* Medicines Prescriber */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="block text-xs font-bold uppercase text-slate-600">
                    Prescribed Medications
                  </label>
                  <button
                    type="button"
                    onClick={addMedicine}
                    className="text-xs bg-indigo-50 text-indigo-600 font-bold px-3 py-1 rounded-lg hover:bg-indigo-100"
                  >
                    + Add Medication
                  </button>
                </div>

                {medicines.map((med, idx) => (
                  <div key={idx} className="p-4 border rounded-xl bg-slate-50 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-700">Medicine #{idx + 1}</span>
                      {medicines.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeMedicine(idx)}
                          className="text-xs text-red-500 font-bold hover:underline"
                        >
                          Remove
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                      <input
                        type="text"
                        placeholder="Medicine Name"
                        className="px-3 py-2 border rounded-lg text-xs font-semibold"
                        value={med.name}
                        onChange={(e) => handleMedicineChange(idx, 'name', e.target.value)}
                      />
                      <input
                        type="text"
                        placeholder="Dosage (e.g., 500mg)"
                        className="px-3 py-2 border rounded-lg text-xs"
                        value={med.dosage}
                        onChange={(e) => handleMedicineChange(idx, 'dosage', e.target.value)}
                      />
                      <input
                        type="text"
                        placeholder="Frequency (e.g., Twice daily)"
                        className="px-3 py-2 border rounded-lg text-xs"
                        value={med.frequency}
                        onChange={(e) => handleMedicineChange(idx, 'frequency', e.target.value)}
                      />
                      <input
                        type="text"
                        placeholder="Duration (e.g., 5 days)"
                        className="px-3 py-2 border rounded-lg text-xs"
                        value={med.duration}
                        onChange={(e) => handleMedicineChange(idx, 'duration', e.target.value)}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Follow Up Instructions */}
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                  Follow-Up Instructions
                </label>
                <input
                  type="text"
                  placeholder="e.g. Return for follow-up review in 7 days."
                  className="w-full px-4 py-2.5 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  value={followUpInstructions}
                  onChange={(e) => setFollowUpInstructions(e.target.value)}
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md transition text-sm"
              >
                Submit Notes & Generate AI Post-Visit Summary
              </button>
            </form>
          </div>
        )}

        {/* TAB 3: DOCTOR PROFILE */}
        {activeTab === 'profile' && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/80 max-w-xl mx-auto">
            <h2 className="text-xl font-bold text-slate-800 mb-4">Doctor Profile Settings</h2>
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Doctor Name</label>
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
