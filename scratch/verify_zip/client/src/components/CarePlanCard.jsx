import React, { useState } from 'react';
import { FileText, Pill, Bell, CheckCircle2, AlertTriangle, Sparkles, UserCheck } from 'lucide-react';
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
      {/* HUMAN REVIEW REQUIRED AMBER ALERT */}
      {appointment?.needsHumanReview && (
        <div className="p-4 bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl space-y-2 shadow-xs">
          <div className="flex items-center space-x-2 text-amber-800 font-bold text-xs">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span>⚠ Review Required</span>
          </div>
          <p className="text-xs leading-relaxed">
            This AI-generated summary contains information requiring physician review prior to final patient delivery.
          </p>
          {appointment.reviewReasons && (
            <p className="text-[11px] font-semibold text-amber-800">
              <strong>Reason:</strong> {Array.isArray(appointment.reviewReasons) ? appointment.reviewReasons.join(', ') : String(appointment.reviewReasons)}
            </p>
          )}
        </div>
      )}

      {/* AI POST-VISIT SUMMARY CARE PLAN CARD */}
      {summaryData && !appointment.needsHumanReview && (
        <div className="bg-white border border-slate-200 p-5 rounded-2xl space-y-3 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-teal-800 font-bold text-xs">
              <Sparkles className="w-4 h-4 text-teal-700" />
              <span>✦ AI-Assisted Summary</span>
            </div>
            <span className="text-[10px] font-bold text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full flex items-center space-x-1">
              <UserCheck className="w-3 h-3 text-teal-700" />
              <span>Reviewed by Dr. {appointment.doctorProfile?.user?.name || 'Doctor'}</span>
            </span>
          </div>

          <div className="text-xs text-slate-700 space-y-2 pt-1 leading-relaxed">
            <p>{summaryData.summary || String(appointment.postVisitSummary)}</p>

            {summaryData.followUp && summaryData.followUp !== 'Not specified by the doctor.' && (
              <p className="font-bold text-teal-900 pt-1">
                <strong>Follow-Up:</strong> {summaryData.followUp}
              </p>
            )}
          </div>

          <p className="text-[10px] text-slate-400 italic pt-1 border-t border-slate-100">
            AI-generated content is assistive and should be reviewed by the doctor.
          </p>
        </div>
      )}

      {/* PRESCRIPTION CARD WITH MEDICINE TABLE */}
      {prescription && (
        <div className="bg-white border border-slate-200 p-5 rounded-2xl space-y-3 shadow-xs">
          <div className="flex items-center space-x-2 text-slate-900 font-bold text-xs">
            <Pill className="w-4 h-4 text-teal-700" />
            <span>Prescribed Medications</span>
          </div>

          {prescription.diagnosis && (
            <p className="text-xs text-slate-700">
              <strong>Diagnosis:</strong> {prescription.diagnosis}
            </p>
          )}

          {prescription.medicines?.length > 0 && (
            <div className="space-y-2 pt-1">
              <div className="space-y-2">
                {prescription.medicines.map((med, idx) => (
                  <div
                    key={idx}
                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200 gap-2"
                  >
                    <div className="text-xs text-slate-700">
                      <strong className="text-slate-900 text-sm">{med.name}</strong>
                      <span className="text-slate-500 ml-2">
                        {med.dosage && `${med.dosage}`} {med.frequency && `(${med.frequency})`} {med.duration && `for ${med.duration}`}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleOpenReminder(med)}
                      className="flex items-center space-x-1.5 px-3 py-1.5 bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold rounded-lg shadow-xs transition"
                    >
                      <Bell className="w-3.5 h-3.5" />
                      <span>Set Reminder</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* MEDICATION REMINDER MODAL */}
      {showReminderModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md border border-slate-200 space-y-4 shadow-xl">
            <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
              <Bell className="w-5 h-5 text-teal-700" />
              <span>Configure Medication Reminder</span>
            </h3>

            {selectedMedicine && (
              <div className="bg-teal-50 p-3.5 rounded-xl border border-teal-200 text-xs text-teal-900 space-y-1 font-medium">
                <p className="font-bold text-slate-900 text-sm">{selectedMedicine.name}</p>
                <p>Dosage: {selectedMedicine.dosage || 'Standard'}</p>
                <p>Frequency: {selectedMedicine.frequency || 'Daily'}</p>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
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
                    className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-semibold flex-1 outline-none focus:border-teal-700"
                  />
                  {reminderTimes.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setReminderTimes(reminderTimes.filter((_, i) => i !== idx))}
                      className="text-red-600 px-2 font-bold hover:bg-red-50 rounded-lg"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() => setReminderTimes([...reminderTimes, '09:00'])}
                className="text-teal-700 text-xs font-bold hover:underline"
              >
                + Add dose time
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={reminderStartDate}
                  onChange={(e) => setReminderStartDate(e.target.value)}
                  className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 w-full text-xs text-slate-900 font-semibold outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={reminderEndDate}
                  onChange={(e) => setReminderEndDate(e.target.value)}
                  className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 w-full text-xs text-slate-900 font-semibold outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setShowReminderModal(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={handleSaveReminder}
                className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold rounded-xl shadow-xs transition disabled:opacity-50"
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
