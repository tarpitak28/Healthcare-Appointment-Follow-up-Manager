import React from 'react';
import { CalendarCheck, Download, CheckCircle2 } from 'lucide-react';
import { downloadICS } from '../utils/calendar';

export default function CalendarActions({ doctorName, appointmentDate, startTime, endTime, symptoms }) {
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
      {/* 100% Automated Live API Google Calendar Sync Badge */}
      <div className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-900 border border-emerald-300/60 rounded-xl text-xs font-bold shadow-2xs">
        <div className="relative flex items-center justify-center">
          <CalendarCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span>
        </div>
        <span>Google Calendar Sync</span>
        <span className="text-[10px] bg-emerald-200/80 text-emerald-950 px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider ml-1 flex items-center space-x-1">
          <CheckCircle2 className="w-2.5 h-2.5 text-emerald-700 inline" />
          <span>Auto</span>
        </span>
      </div>

      {/* Optional .ics File Backup Download */}
      <button
        type="button"
        onClick={handleDownload}
        className="group flex items-center space-x-1.5 px-2.5 py-1.5 bg-[#F7F9FA] hover:bg-slate-100 text-slate-700 border border-[#E5E7EB] rounded-xl text-xs font-semibold transition active:scale-95"
        title="Download .ics file for offline calendars"
      >
        <Download className="w-3.5 h-3.5 text-slate-500" />
        <span>.ics File</span>
      </button>
    </div>
  );
}

