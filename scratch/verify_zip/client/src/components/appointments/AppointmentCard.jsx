import React from 'react';
import StatusBadge from '../StatusBadge';
import Button from '../ui/Button';
import CalendarActions from '../CalendarActions';
import { Clock, Video } from 'lucide-react';

export default function AppointmentCard({ appointment, onView, onCancel }) {
  const dateObj = new Date(appointment.appointmentDate);
  const dayNum = dateObj.getDate();
  const dayStr = dateObj.toLocaleDateString('en-US', { weekday: 'short' });

  const doctorName = appointment.doctorProfile?.user?.name || 'Doctor';
  const specialization = appointment.doctorProfile?.specialisation || 'General Physician';

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4 sm:p-5 shadow-xs hover:border-[#CBD5E1] transition space-y-4">
      {/* Desktop Horizontal / Mobile Vertical Layout */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
        <div className="flex items-start space-x-3.5 w-full sm:w-auto">
          {/* Date Block */}
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-[#EAF7FA] border border-[#3FA3C3]/30 flex flex-col items-center justify-center flex-shrink-0 text-center">
            <span className="text-sm sm:text-base font-black text-[#237C9A] leading-none">{dayNum}</span>
            <span className="text-[9px] sm:text-[10px] font-bold uppercase text-[#3FA3C3] mt-0.5">{dayStr}</span>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <h3 className="font-bold text-[#202124] text-sm sm:text-base truncate">
                Dr. {doctorName}
              </h3>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#EAF7FA] text-[#237C9A] border border-[#3FA3C3]/20">
                {specialization}
              </span>
            </div>

            <p className="text-xs text-[#6F7378] font-medium mt-1 flex flex-wrap items-center gap-2">
              <span className="flex items-center space-x-1">
                <Clock className="w-3.5 h-3.5 text-[#6F7378]" />
                <span>{appointment.startTime} – {appointment.endTime}</span>
              </span>
              <span className="hidden sm:inline">•</span>
              <span className="flex items-center space-x-1">
                <Video className="w-3 h-3 text-[#3FA3C3]" />
                <span>Video Consultation</span>
              </span>
            </p>
          </div>
        </div>

        <div className="self-start sm:self-center">
          <StatusBadge status={appointment.status} />
        </div>
      </div>

      {appointment.symptoms && (
        <div className="p-3 bg-[#F7F9FA] rounded-xl text-xs text-[#6F7378] border border-[#E5E7EB]">
          <strong className="text-[#202124]">Reason / Symptoms:</strong> {appointment.symptoms}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between pt-3 border-t border-[#E5E7EB] gap-2">
        <CalendarActions
          doctorName={doctorName}
          appointmentDate={appointment.appointmentDate}
          startTime={appointment.startTime}
          endTime={appointment.endTime}
          symptoms={appointment.symptoms}
        />

        <div className="flex items-center space-x-2 w-full sm:w-auto pt-1 sm:pt-0">
          {onView && (
            <Button variant="secondary" size="sm" className="w-full sm:w-auto min-h-[44px] sm:min-h-0" onClick={() => onView(appointment)}>
              View Details
            </Button>
          )}

          {appointment.status === 'BOOKED' && onCancel && (
            <Button variant="danger" size="sm" className="w-full sm:w-auto min-h-[44px] sm:min-h-0" onClick={() => onCancel(appointment)}>
              Cancel
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
