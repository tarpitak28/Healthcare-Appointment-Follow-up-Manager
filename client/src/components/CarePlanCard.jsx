import React, { useState } from 'react';
import { FileText, Pill, Bell, CheckCircle2, Clock, Calendar } from 'lucide-react';
import API from '../api/axios';

export default function CarePlanCard({ appointment, onReminderSaved }) {
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [selectedMedicine, setSelectedMedicine] = useState(null);
  const [reminderTimes, setReminderTimes] = useState(['09:00']);
  const [reminderStartDate, setReminderStartDate] = useState('');
  const [reminderEndDate, setReminderEndDate] = useState('');
  const [saving, setSaving] = useState(false);

  const summaryData = (() => {
    if (!appointment?.postVisitSummary) return null;
    let summaryObj = appointment.postVisitSummary;
    if (typeof summaryObj === 'string') {
      try {
        summaryObj = JSON.parse(summaryObj);
      } catch (e) {
        return { summary: summaryObj };
      }
    }
    return summaryObj;
  })();

  const prescription = appointment?.prescription;

  const handleOpenReminder = (medicine) => {
    setSelectedMedicine(medicine);
    setReminderStartDate(String(appointment?.appointmentDate || '').slice(0, 10));
    setReminderEndDate(String(appointment?.appointmentDate || '').slice(0, 10));
    setShowReminderModal(true);
  };

  const handleSaveReminder = async () => {
    if (!selectedMedicine || !reminderStartDate || !reminderEndDate) {
      alert('Please select start and end dates.');
      return;
    }

    setSaving(true);
    try {
      const response = await API.post('/medications', {
        appointmentId: appointment.id,
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

      alert('✅ Medication reminder saved successfully!');
      setShowReminderModal(false);
      setSelectedMedicine(null);
      setReminderTimes(['09:00']);
      if (onReminderSaved) onReminderSaved();
    } catch (error) {
      alert(error.response?.data?.message || error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* AI Post-Visit Summary Care Plan Card */}
      {summaryData && !appointment.needsHumanReview && (
        <div className="group bg-gradient-to-r from-emerald-950/40 to-slate-900 border border-emerald-500/30 p-5 rounded-2xl space-y-2 shadow-lg transition-all hover:border-emerald-500/50">
          <div className="flex items-center space-x-2 text-emerald-400">
            <FileText className="w-5 h-5 group-hover:scale-110 transition-transform" />
            <h4 className="font-extrabold text-sm text-white">AI Post-Visit Summary & Care Plan</h4>
          </div>

          <div className="text-xs text-emerald-200 space-y-1.5 pt-1">
            <p className="leading-relaxed">{summaryData.summary || String(appointment.postVisitSummary)}</p>

            {summaryData.followUp && summaryData.followUp !== 'Not specified by the doctor.' && (
              <p className="font-bold text-emerald-300 pt-1">
                <strong>Follow-Up Instructions:</strong> {summaryData.followUp}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Prescription Card with Medicine Table */}
      {prescription && (
        <div className="group bg-gradient-to-r from-blue-950/40 to-slate-900 border border-blue-500/30 p-5 rounded-2xl space-y-3 shadow-lg transition-all hover:border-blue-500/50">
          <div className="flex items-center space-x-2 text-blue-400">
            <Pill className="w-5 h-5 group-hover:rotate-12 transition-transform" />
            <h4 className="font-extrabold text-sm text-white">Doctor Prescription</h4>
          </div>

          {prescription.diagnosis && (
            <p className="text-xs text-blue-200">
              <strong>Diagnosis:</strong> {prescription.diagnosis}
            </p>
          )}

          {prescription.medicines?.length > 0 && (
            <div className="space-y-2 pt-1">
              <strong className="block text-xs text-blue-300 font-bold uppercase tracking-wider">
                Prescribed Medications
              </strong>

              <div className="space-y-2">
                {prescription.medicines.map((med, idx) => (
                  <div
                    key={idx}
                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-slate-950/90 p-3 rounded-xl border border-slate-800 gap-2 transition hover:border-blue-500/40"
                  >
                    <div className="text-xs text-slate-200">
                      <strong className="text-white text-sm">{med.name}</strong>
                      <span className="text-slate-400 ml-2">
                        {med.dosage && `${med.dosage}`} {med.frequency && `(${med.frequency})`} {med.duration && `for ${med.duration}`}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleOpenReminder(med)}
                      className="group/btn flex items-center space-x-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg shadow-md transition active:scale-95"
                    >
                      <Bell className="w-3.5 h-3.5 group-hover/btn:animate-bounce" />
                      <span>Set Reminder</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Medication Reminder Configuration Modal */}
      {showReminderModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-2xl p-6 w-full max-w-md border border-slate-800 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white flex items-center space-x-2">
              <Bell className="w-5 h-5 text-indigo-400" />
              <span>Configure Medication Reminder</span>
            </h3>

            {selectedMedicine && (
              <div className="bg-indigo-950/60 p-3.5 rounded-xl border border-indigo-500/30 text-xs text-indigo-200 space-y-1">
                <p className="font-bold text-white text-sm">{selectedMedicine.name}</p>
                <p>Dosage: {selectedMedicine.dosage || 'Standard'}</p>
                <p>Frequency: {selectedMedicine.frequency || 'Daily'}</p>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                Daily Dose Times
              </label>
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
                      className="text-red-400 px-2 font-bold hover:bg-red-500/10 rounded-lg"
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
                + Add dose time
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={reminderStartDate}
                  onChange={(e) => setReminderStartDate(e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 w-full text-xs text-white font-semibold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={reminderEndDate}
                  onChange={(e) => setReminderEndDate(e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 w-full text-xs text-white font-semibold"
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
                disabled={saving}
                onClick={handleSaveReminder}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-md transition disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Reminder Schedule'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
