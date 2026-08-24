import React from 'react';
import { CalendarPlus, Download, ExternalLink } from 'lucide-react';
import { getGoogleCalendarUrl, downloadICS } from '../utils/calendar';

export default function CalendarActions({ doctorName, appointmentDate, startTime, endTime, symptoms }) {
  const googleUrl = getGoogleCalendarUrl(
    doctorName || 'Doctor',
    appointmentDate,
    startTime,
    endTime,
    symptoms
  );

  const handleDownload = () => {
    downloadICS(
      doctorName || 'Doctor',
      appointmentDate,
      startTime,
      endTime,
      symptoms
    );
  };

  return (
    <div className="flex flex-wrap items-center gap-2 pt-1">
      {/* Google Calendar Link Button */}
      <a
        href={googleUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="group flex items-center space-x-1.5 px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 rounded-xl text-xs font-bold transition shadow-xs"
      >
        <CalendarPlus className="w-3.5 h-3.5 text-teal-700" />
        <span>Add to Google Calendar</span>
        <ExternalLink className="w-3 h-3 text-teal-600" />
      </a>

      {/* Download .ics Invite Button */}
      <button
        type="button"
        onClick={handleDownload}
        className="group flex items-center space-x-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition shadow-xs"
      >
        <Download className="w-3.5 h-3.5 text-slate-600" />
        <span>Download .ics</span>
      </button>
    </div>
  );
}
