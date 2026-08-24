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
    <div className="flex flex-wrap items-center gap-2.5 pt-2">
      {/* Google Calendar Link Button */}
      <a
        href={googleUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="group flex items-center space-x-2 px-3.5 py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-xl text-xs font-bold transition-all shadow-sm hover:shadow-blue-500/10 active:scale-95"
      >
        <CalendarPlus className="w-4 h-4 text-blue-400 group-hover:scale-110 transition-transform" />
        <span>Add to Google Calendar</span>
        <ExternalLink className="w-3 h-3 text-blue-400/70 group-hover:text-blue-300 transition-colors" />
      </a>

      {/* Download .ics Invite Button */}
      <button
        type="button"
        onClick={handleDownload}
        className="group flex items-center space-x-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95"
      >
        <Download className="w-4 h-4 text-indigo-400 group-hover:translate-y-0.5 transition-transform" />
        <span>Download .ics Invite</span>
      </button>
    </div>
  );
}
