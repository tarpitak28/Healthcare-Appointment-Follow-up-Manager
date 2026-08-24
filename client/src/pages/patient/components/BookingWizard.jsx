import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import API from '../../../api/axios';
import {
  Stethoscope,
  Calendar,
  Clock,
  Sparkles,
  CheckCircle2,
  Lock,
  AlertTriangle,
  ChevronRight,
  UserCheck,
} from 'lucide-react';

export default function BookingWizard({ onBookingSuccess, setMessage }) {
  const [step, setStep] = useState(1); // Step 1: Select Doctor, Step 2: Date & Slot, Step 3: Symptoms & Confirm
  const [selectedDoctor, setSelectedDoctor] = useState(null); // Doctor profile object
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [symptoms, setSymptoms] = useState('');
  const [bookingLoading, setBookingLoading] = useState(false);
  const [holdMessage, setHoldMessage] = useState('');

  const todayStr = new Date().toISOString().split('T')[0];

  // 1. Fetch Doctors via React Query
  const {
    data: doctors = [],
    isLoading: isLoadingDoctors,
    isError: isDoctorsError,
  } = useQuery({
    queryKey: ['doctors'],
    queryFn: async () => {
      const res = await API.get('/patient/doctors');
      return res.data.doctors || [];
    },
  });

  // 2. Fetch Available Slots via React Query
  const {
    data: slotData = { slots: [], isOnLeave: false },
    isLoading: isLoadingSlots,
  } = useQuery({
    queryKey: ['slots', selectedDoctor?.doctorProfile?.id, selectedDate],
    queryFn: async () => {
      if (!selectedDoctor?.doctorProfile?.id || !selectedDate) {
        return { slots: [], isOnLeave: false };
      }
      const res = await API.get(
        `/patient/doctors/${selectedDoctor.doctorProfile.id}/slots?date=${selectedDate}`
      );
      return res.data;
    },
    enabled: !!selectedDoctor?.doctorProfile?.id && !!selectedDate,
  });

  const handleSelectDoctor = (doc) => {
    setSelectedDoctor(doc);
    setSelectedSlot(null);
    setStep(2);
  };

  const handleSelectSlot = async (slot) => {
    if (!slot.isAvailable || !selectedDoctor || !selectedDate) return;
    setSelectedSlot(slot);
    setHoldMessage(`🔒 Slot ${slot.startTime} held for 5 minutes!`);

    try {
      await API.post(`/patient/doctors/${selectedDoctor.doctorProfile.id}/hold-slot`, {
        appointmentDate: selectedDate,
        startTime: slot.startTime,
      });
    } catch (err) {
      console.warn('Slot hold notice:', err.response?.data?.message || err.message);
    }
  };

  const handleConfirmBooking = async (e) => {
    e.preventDefault();
    if (!selectedDoctor || !selectedDate || !selectedSlot) return;

    setBookingLoading(true);
    try {
      await API.post('/patient/appointments', {
        doctorProfileId: selectedDoctor.doctorProfile.id,
        appointmentDate: selectedDate,
        startTime: selectedSlot.startTime,
        endTime: selectedSlot.endTime,
        symptoms: symptoms || 'General Consultation',
      });

      setMessage('✅ Appointment booked successfully with AI pre-visit analysis!');
      setSelectedSlot(null);
      setSymptoms('');
      setStep(1);
      if (onBookingSuccess) onBookingSuccess();
    } catch (err) {
      setMessage(err.response?.data?.message || 'Booking failed');
    } finally {
      setBookingLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Wizard Progress Bar */}
      <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span
            className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${
              step >= 1 ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-800 text-slate-500'
            }`}
          >
            1
          </span>
          <span className={`text-xs font-bold ${step >= 1 ? 'text-white' : 'text-slate-500'}`}>
            Select Doctor
          </span>
        </div>

        <ChevronRight className="w-4 h-4 text-slate-700" />

        <div className="flex items-center space-x-2">
          <span
            className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${
              step >= 2 ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-800 text-slate-500'
            }`}
          >
            2
          </span>
          <span className={`text-xs font-bold ${step >= 2 ? 'text-white' : 'text-slate-500'}`}>
            Date & Slot
          </span>
        </div>

        <ChevronRight className="w-4 h-4 text-slate-700" />

        <div className="flex items-center space-x-2">
          <span
            className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${
              step >= 3 ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-800 text-slate-500'
            }`}
          >
            3
          </span>
          <span className={`text-xs font-bold ${step >= 3 ? 'text-white' : 'text-slate-500'}`}>
            AI Symptoms & Confirm
          </span>
        </div>
      </div>

      {/* STEP 1: SELECT DOCTOR */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                <Stethoscope className="w-5 h-5 text-indigo-400" />
                <span>Step 1: Choose Your Doctor</span>
              </h2>
              <p className="text-xs text-slate-400">
                Select a verified specialist for your consultation.
              </p>
            </div>
          </div>

          {isLoadingDoctors ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((n) => (
                <div
                  key={n}
                  className="p-5 bg-slate-900/60 border border-slate-800 rounded-2xl animate-pulse space-y-3"
                >
                  <div className="w-1/2 h-4 bg-slate-800 rounded"></div>
                  <div className="w-1/3 h-3 bg-slate-800/60 rounded"></div>
                  <div className="w-2/3 h-3 bg-slate-800/40 rounded"></div>
                </div>
              ))}
            </div>
          ) : isDoctorsError ? (
            <div className="p-6 bg-red-500/10 border border-red-500/30 text-red-400 text-xs rounded-2xl text-center">
              Failed to load doctors. Please refresh.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {doctors.map((doc) => {
                const isSelected = selectedDoctor?.doctorProfile?.id === doc.doctorProfile?.id;
                return (
                  <div
                    key={doc.doctorProfile?.id}
                    onClick={() => handleSelectDoctor(doc)}
                    className={`p-5 rounded-2xl border-2 transition-all cursor-pointer relative ${
                      isSelected
                        ? 'bg-indigo-950/60 border-indigo-500 shadow-xl shadow-indigo-500/10 ring-2 ring-indigo-500/30'
                        : 'bg-slate-900/70 border-slate-800 hover:border-indigo-500/50 hover:bg-slate-800/80'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-sm">
                          👨‍⚕️
                        </div>
                        <div>
                          <h3 className="font-bold text-white text-base">
                            Dr. {doc.name || doc.user?.name}
                          </h3>
                          <span className="text-xs font-semibold text-indigo-400">
                            {doc.doctorProfile?.specialisation || 'General Physician'}
                          </span>
                        </div>
                      </div>

                      <ChevronRight className="w-5 h-5 text-slate-600" />
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                      <span className="flex items-center space-x-1">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        <span>{doc.doctorProfile?.slotDuration || 30} min slots</span>
                      </span>

                      <span className="text-slate-500">
                        {doc.doctorProfile?.workingHours?.start || '09:00'} -{' '}
                        {doc.doctorProfile?.workingHours?.end || '17:00'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* STEP 2: DATE & SLOT SELECTION */}
      {step === 2 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between bg-indigo-950/60 p-4 rounded-2xl border border-indigo-500/30">
            <div className="flex items-center space-x-3">
              <UserCheck className="w-5 h-5 text-indigo-400" />
              <div>
                <h3 className="font-bold text-white text-sm">
                  Dr. {selectedDoctor?.name || selectedDoctor?.user?.name}
                </h3>
                <p className="text-xs text-indigo-300">
                  {selectedDoctor?.doctorProfile?.specialisation}
                </p>
              </div>
            </div>

            <button
              onClick={() => setStep(1)}
              className="text-xs text-indigo-400 hover:text-white font-bold underline"
            >
              Change Doctor
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Date Picker */}
            <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 space-y-3">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
                <Calendar className="w-4 h-4 text-indigo-400" />
                <span>Select Appointment Date</span>
              </label>

              <input
                type="date"
                min={todayStr}
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  setSelectedSlot(null);
                }}
                className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm font-semibold outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/40"
              />
            </div>

            {/* Slots Grid */}
            <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 space-y-3">
              <div className="flex justify-between items-center">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
                  <Clock className="w-4 h-4 text-indigo-400" />
                  <span>Available Time Slots</span>
                </label>

                {holdMessage && (
                  <span className="text-[10px] font-bold text-emerald-400 flex items-center space-x-1">
                    <Lock className="w-3 h-3" />
                    <span>Hold Active</span>
                  </span>
                )}
              </div>

              {!selectedDate ? (
                <div className="text-center p-6 bg-slate-950 border border-dashed border-slate-800 rounded-xl text-slate-500 text-xs">
                  Select a date on the left to load slots.
                </div>
              ) : slotData.isOnLeave ? (
                <div className="p-4 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs rounded-xl flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>Doctor is on leave on this date. Please pick another date.</span>
                </div>
              ) : isLoadingSlots ? (
                <div className="grid grid-cols-3 gap-2">
                  {[1, 2, 3, 4, 5, 6].map((n) => (
                    <div key={n} className="h-9 bg-slate-950 rounded-xl animate-pulse"></div>
                  ))}
                </div>
              ) : slotData.slots?.length === 0 ? (
                <div className="text-center p-6 bg-slate-950 border border-dashed border-slate-800 rounded-xl text-slate-500 text-xs">
                  No slots available for this date.
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                  {slotData.slots.map((slot, idx) => {
                    const isSelected = selectedSlot?.startTime === slot.startTime;
                    return (
                      <button
                        key={idx}
                        type="button"
                        disabled={!slot.isAvailable}
                        onClick={() => handleSelectSlot(slot)}
                        className={`py-2 px-3 text-xs rounded-xl border font-bold transition-all ${
                          !slot.isAvailable
                            ? 'bg-slate-950 text-slate-600 border-slate-800 cursor-not-allowed line-through'
                            : isSelected
                            ? 'bg-indigo-600 text-white border-indigo-500 ring-4 ring-indigo-500/30 shadow-lg scale-105'
                            : 'bg-slate-950 text-indigo-300 border-indigo-500/30 hover:border-indigo-500 hover:bg-slate-800'
                        }`}
                      >
                        {slot.startTime}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-between items-center pt-2">
            <button
              onClick={() => setStep(1)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl"
            >
              Back
            </button>

            <button
              disabled={!selectedSlot || !selectedDate}
              onClick={() => setStep(3)}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg transition disabled:opacity-50"
            >
              Next: Describe Symptoms →
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: SYMPTOMS & CONFIRMATION */}
      {step === 3 && (
        <form onSubmit={handleConfirmBooking} className="space-y-6">
          <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex items-center space-x-2 text-indigo-400">
              <Sparkles className="w-5 h-5 animate-spin-slow" />
              <h3 className="font-bold text-white text-base">
                AI Pre-Visit Assessment & Symptom Submission
              </h3>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                Describe Your Symptoms
              </label>
              <textarea
                rows="4"
                className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/40"
                placeholder="Share your current symptoms, duration, and medical concerns for the AI pre-visit diagnostic summary..."
                value={symptoms}
                onChange={(e) => setSymptoms(e.target.value)}
              ></textarea>
            </div>

            <div className="p-4 bg-indigo-950/60 border border-indigo-500/30 rounded-xl text-xs text-indigo-200 space-y-1">
              <p className="font-bold flex items-center space-x-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Summary & Pre-Visit Triaging</span>
              </p>
              <p>
                Booking with Dr. <strong>{selectedDoctor?.name || selectedDoctor?.user?.name}</strong> on{' '}
                <strong>{selectedDate}</strong> at <strong>{selectedSlot?.startTime}</strong>.
              </p>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl"
            >
              Back
            </button>

            <button
              type="submit"
              disabled={bookingLoading}
              className="px-8 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-xl shadow-lg transition text-xs disabled:opacity-50"
            >
              {bookingLoading ? 'Confirming Appointment...' : 'Confirm Appointment Booking'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
