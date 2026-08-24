import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import API from '../../../api/axios';
import DoctorCard from '../../../components/doctors/DoctorCard';
import Button from '../../../components/ui/Button';
import {
  Stethoscope,
  Calendar,
  Clock,
  CheckCircle2,
  Lock,
  AlertTriangle,
  ChevronRight,
  UserCheck,
  Video,
  Phone,
  User,
} from 'lucide-react';

export default function BookingWizard({ onBookingSuccess, setMessage }) {
  const [step, setStep] = useState(1); // 1: Doctor, 2: Date & Time, 3: Details & Mode, 4: Confirm
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [consultationMode, setConsultationMode] = useState('Video'); // 'Video', 'Audio', 'In-Person'
  const [symptoms, setSymptoms] = useState('');
  const [bookingLoading, setBookingLoading] = useState(false);
  const [holdTimer, setHoldTimer] = useState(300);
  const [isHoldActive, setIsHoldActive] = useState(false);

  const todayStr = new Date().toISOString().split('T')[0];

  useEffect(() => {
    let interval = null;
    if (isHoldActive && holdTimer > 0) {
      interval = setInterval(() => setHoldTimer((prev) => prev - 1), 1000);
    } else if (holdTimer === 0) {
      setIsHoldActive(false);
      setSelectedSlot(null);
    }
    return () => clearInterval(interval);
  }, [isHoldActive, holdTimer]);

  const formatTimer = (seconds) => {
    const mins = String(Math.floor(seconds / 60)).padStart(2, '0');
    const secs = String(seconds % 60).padStart(2, '0');
    return `${mins}:${secs}`;
  };

  // 1. Fetch Doctors via React Query
  const { data: doctors = [], isLoading: isLoadingDoctors } = useQuery({
    queryKey: ['doctors'],
    queryFn: async () => {
      const res = await API.get('/patient/doctors');
      return res.data.doctors || [];
    },
  });

  // 2. Fetch Available Slots via React Query
  const { data: slotData = { slots: [], isOnLeave: false }, isLoading: isLoadingSlots } = useQuery({
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
    setIsHoldActive(false);
    setStep(2);
  };

  const handleSelectSlot = async (slot) => {
    if (!slot.isAvailable || !selectedDoctor || !selectedDate) return;
    setSelectedSlot(slot);
    setHoldTimer(300);
    setIsHoldActive(true);

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
        symptoms: `[Mode: ${consultationMode}] ${symptoms || 'General Consultation'}`,
      });

      setMessage('✅ Appointment booked successfully!');
      setSelectedSlot(null);
      setSymptoms('');
      setIsHoldActive(false);
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
      {/* Responsive Progress Stepper (Section 21) */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-[#E5E7EB] shadow-xs">
        {/* Mobile Stepper Header (<640px) */}
        <div className="flex sm:hidden justify-between items-center text-xs font-bold text-[#202124]">
          <span className="text-[#3FA3C3]">Step {step} of 4</span>
          <span>
            {step === 1 && 'Choose Doctor'}
            {step === 2 && 'Select Date & Time'}
            {step === 3 && 'Details & Mode'}
            {step === 4 && 'Confirmation'}
          </span>
        </div>

        {/* Desktop Stepper Bar (>=640px) */}
        <div className="hidden sm:flex items-center justify-between">
          {[
            { num: 1, label: 'Choose Doctor' },
            { num: 2, label: 'Select Date & Time' },
            { num: 3, label: 'Details & Mode' },
            { num: 4, label: 'Confirmation' },
          ].map((st, idx) => {
            const isDone = step > st.num;
            const isCurrent = step === st.num;
            return (
              <React.Fragment key={st.num}>
                <div className="flex items-center space-x-2">
                  <span
                    className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs ${
                      isDone
                        ? 'bg-[#3FA3C3] text-white'
                        : isCurrent
                        ? 'bg-[#3FA3C3] text-white shadow-xs'
                        : 'bg-[#F7F9FA] text-[#6F7378]'
                    }`}
                  >
                    {isDone ? '✓' : st.num}
                  </span>
                  <span
                    className={`text-xs font-bold ${
                      isCurrent ? 'text-[#202124]' : isDone ? 'text-[#237C9A]' : 'text-[#6F7378]'
                    }`}
                  >
                    {st.label}
                  </span>
                </div>
                {idx < 3 && <ChevronRight className="w-4 h-4 text-[#E5E7EB]" />}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* STEP 1: DOCTOR DISCOVERY */}
      {step === 1 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-[#202124] flex items-center space-x-2">
              <Stethoscope className="w-5 h-5 text-[#3FA3C3]" />
              <span>Step 1: Choose Your Doctor</span>
            </h2>
            <p className="text-xs text-[#6F7378]">
              Select a verified specialist for your consultation.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {doctors.map((doc) => (
              <DoctorCard
                key={doc.id || doc.doctorProfile?.id}
                doctor={doc}
                onBook={() => handleSelectDoctor(doc)}
              />
            ))}
          </div>
        </div>
      )}

      {/* STEP 2: SELECT DATE & TIME (Section 20) */}
      {step === 2 && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-[#EAF7FA] p-4 rounded-2xl border border-[#3FA3C3]/30 gap-2">
            <div className="flex items-center space-x-3">
              <UserCheck className="w-5 h-5 text-[#3FA3C3] flex-shrink-0" />
              <div>
                <h3 className="font-bold text-[#202124] text-sm">
                  Dr. {selectedDoctor?.name || selectedDoctor?.user?.name}
                </h3>
                <p className="text-xs text-[#237C9A] font-semibold">
                  {selectedDoctor?.doctorProfile?.specialisation} • 30 minutes • ₹800
                </p>
              </div>
            </div>

            <button
              onClick={() => setStep(1)}
              className="text-xs text-[#3FA3C3] hover:underline font-bold"
            >
              Change Doctor
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Calendar / Date Picker */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#E5E7EB] space-y-3 shadow-xs">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#6F7378] flex items-center space-x-1.5">
                <Calendar className="w-4 h-4 text-[#3FA3C3]" />
                <span>Select Appointment Date</span>
              </label>

              <input
                type="date"
                min={todayStr}
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  setSelectedSlot(null);
                  setIsHoldActive(false);
                }}
                className="w-full px-4 py-3 bg-[#F7F9FA] border border-[#E5E7EB] rounded-xl text-[#202124] text-sm font-semibold outline-none focus:border-[#3FA3C3] min-h-[44px]"
              />
            </div>

            {/* Slots Grid */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#E5E7EB] space-y-3 shadow-xs">
              <div className="flex justify-between items-center">
                <label className="block text-xs font-bold uppercase tracking-wider text-[#6F7378] flex items-center space-x-1.5">
                  <Clock className="w-4 h-4 text-[#3FA3C3]" />
                  <span>Available Time Slots</span>
                </label>

                {isHoldActive && (
                  <span className="text-[11px] font-bold text-[#237C9A] bg-[#EAF7FA] border border-[#3FA3C3]/30 px-2 py-0.5 rounded-full flex items-center space-x-1">
                    <Lock className="w-3 h-3 text-[#3FA3C3]" />
                    <span>Slot Held</span>
                  </span>
                )}
              </div>

              {!selectedDate ? (
                <div className="text-center p-6 bg-[#F7F9FA] border border-dashed border-[#E5E7EB] rounded-xl text-[#6F7378] text-xs font-medium">
                  Select a date on the left to load available time slots.
                </div>
              ) : slotData.isOnLeave ? (
                <div className="p-4 bg-[#FEF8EC] border border-[#F2B84B]/40 text-[#F2B84B] text-xs rounded-xl flex items-center space-x-2 font-medium">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>Doctor is on leave on this date. Please pick another date.</span>
                </div>
              ) : isLoadingSlots ? (
                <div className="grid grid-cols-3 gap-2">
                  {[1, 2, 3, 4, 5, 6].map((n) => (
                    <div key={n} className="h-11 bg-[#F7F9FA] rounded-xl animate-pulse"></div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                  {slotData.slots.map((slot, idx) => {
                    const isSelected = selectedSlot?.startTime === slot.startTime;
                    return (
                      <button
                        key={idx}
                        type="button"
                        disabled={!slot.isAvailable}
                        onClick={() => handleSelectSlot(slot)}
                        className={`py-3 px-3 text-xs rounded-xl border font-bold transition min-h-[44px] ${
                          !slot.isAvailable
                            ? 'bg-[#F7F9FA] text-[#6F7378]/50 border-[#E5E7EB] cursor-not-allowed line-through'
                            : isSelected
                            ? 'bg-[#3FA3C3] text-white border-[#237C9A] shadow-xs'
                            : 'bg-[#EAF7FA] text-[#237C9A] border-[#3FA3C3]/30 hover:bg-[#3FA3C3] hover:text-white'
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

          {/* Slot Hold Banner */}
          {selectedSlot && (
            <div className="p-4 bg-[#EAF7FA] border border-[#3FA3C3]/30 text-[#202124] rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs font-medium">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-[#3FA3C3] flex-shrink-0" />
                <span>
                  <strong>✓ Slot reserved for you</strong> — You have <strong>{formatTimer(holdTimer)}</strong> remaining to complete booking.
                </span>
              </div>
            </div>
          )}

          <div className="flex flex-col-reverse sm:flex-row justify-between items-stretch sm:items-center gap-2 pt-2">
            <Button variant="secondary" className="min-h-[44px]" onClick={() => setStep(1)}>Back</Button>
            <Button variant="primary" className="min-h-[44px]" disabled={!selectedSlot || !selectedDate} onClick={() => setStep(3)}>
              Continue to Details →
            </Button>
          </div>
        </div>
      )}

      {/* STEP 3: DETAILS & CONSULTATION MODE (Section 22) */}
      {step === 3 && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Appointment Summary Accordion/Card */}
            <div className="lg:col-span-4 bg-[#F7F9FA] p-4 sm:p-5 rounded-2xl border border-[#E5E7EB] space-y-3">
              <h3 className="font-bold text-xs uppercase tracking-wider text-[#6F7378]">
                Appointment Summary
              </h3>

              <div className="space-y-2 text-xs text-[#202124]">
                <p><strong>Doctor:</strong> Dr. {selectedDoctor?.name || selectedDoctor?.user?.name}</p>
                <p><strong>Specialty:</strong> {selectedDoctor?.doctorProfile?.specialisation}</p>
                <p><strong>Date:</strong> {selectedDate}</p>
                <p><strong>Time:</strong> {selectedSlot?.startTime} – {selectedSlot?.endTime}</p>
                <p><strong>Consultation Fee:</strong> ₹800</p>
              </div>
            </div>

            {/* Enter Appointment Details Form */}
            <div className="lg:col-span-8 bg-white p-4 sm:p-6 rounded-2xl border border-[#E5E7EB] space-y-4 shadow-xs">
              <h3 className="font-bold text-[#202124] text-base">
                Enter Appointment Details
              </h3>

              {/* Consultation Type Selector */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#6F7378] mb-2">
                  Consultation Mode
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {[
                    { mode: 'Video', icon: Video, label: 'Video Consultation' },
                    { mode: 'Audio', icon: Phone, label: 'Audio Call' },
                    { mode: 'In-Person', icon: User, label: 'In-Person Clinic Visit' },
                  ].map((item) => {
                    const Icon = item.icon;
                    const isSelected = consultationMode === item.mode;
                    return (
                      <button
                        key={item.mode}
                        type="button"
                        onClick={() => setConsultationMode(item.mode)}
                        className={`p-3.5 rounded-xl border flex items-center sm:flex-col justify-start sm:justify-center space-x-3 sm:space-x-0 sm:space-y-1.5 transition text-xs font-semibold min-h-[44px] ${
                          isSelected
                            ? 'bg-[#EAF7FA] border-[#3FA3C3] text-[#237C9A] font-bold shadow-xs'
                            : 'bg-[#F7F9FA] border-[#E5E7EB] text-[#6F7378] hover:border-[#CBD5E1]'
                        }`}
                      >
                        <Icon className="w-4 h-4 flex-shrink-0" />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#6F7378] mb-1">
                  Reason for Visit & Symptoms / Notes
                </label>
                <textarea
                  rows="4"
                  className="w-full px-4 py-3 bg-[#F7F9FA] border border-[#E5E7EB] rounded-xl text-[#202124] text-xs outline-none focus:border-[#3FA3C3] focus:bg-white"
                  placeholder="Share your current symptoms, duration, and medical concerns..."
                  value={symptoms}
                  onChange={(e) => setSymptoms(e.target.value)}
                ></textarea>
              </div>
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-between items-stretch sm:items-center gap-2">
            <Button variant="secondary" className="min-h-[44px]" onClick={() => setStep(2)}>Back</Button>
            <Button variant="primary" className="min-h-[44px]" onClick={() => setStep(4)}>Continue →</Button>
          </div>
        </div>
      )}

      {/* STEP 4: CONFIRMATION */}
      {step === 4 && (
        <form onSubmit={handleConfirmBooking} className="space-y-6 max-w-xl mx-auto">
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-[#E5E7EB] space-y-4 shadow-xs">
            <h3 className="font-bold text-[#202124] text-base sm:text-lg">
              Confirm Appointment Booking
            </h3>

            <div className="p-4 bg-[#EAF7FA] border border-[#3FA3C3]/30 rounded-xl text-xs text-[#202124] space-y-2 font-medium">
              <p><strong>Doctor:</strong> Dr. {selectedDoctor?.name || selectedDoctor?.user?.name} ({selectedDoctor?.doctorProfile?.specialisation})</p>
              <p><strong>Date & Time:</strong> {selectedDate} at {selectedSlot?.startTime} – {selectedSlot?.endTime}</p>
              <p><strong>Consultation Mode:</strong> {consultationMode}</p>
              <p><strong>Symptoms Submitted:</strong> {symptoms || 'General Consultation'}</p>
              <p><strong>Fee:</strong> ₹800</p>
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-between items-stretch sm:items-center gap-2">
            <Button variant="secondary" className="min-h-[44px]" onClick={() => setStep(3)}>Back</Button>
            <Button type="submit" variant="primary" size="lg" className="min-h-[44px]" disabled={bookingLoading}>
              {bookingLoading ? 'Confirming Appointment...' : 'Confirm Booking'}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
