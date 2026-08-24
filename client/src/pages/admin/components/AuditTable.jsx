import React, { useState } from 'react';
import { Search, Filter, Calendar, Clock, AlertOctagon, CheckCircle2, XCircle } from 'lucide-react';

export default function AuditTable({ appointments = [], onCancelAppointment, isLoading }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const filteredAppointments = appointments.filter((app) => {
    const matchesStatus = statusFilter === 'ALL' || app.status === statusFilter;
    const patientName = app.patient?.name || '';
    const doctorName = app.doctorProfile?.user?.name || '';
    const symptoms = app.symptoms || '';
    const query = searchTerm.toLowerCase();

    const matchesSearch =
      patientName.toLowerCase().includes(query) ||
      doctorName.toLowerCase().includes(query) ||
      symptoms.toLowerCase().includes(query);

    return matchesStatus && matchesSearch;
  });

  return (
    <div className="bg-slate-900/80 rounded-2xl border border-slate-800 p-6 space-y-4 shadow-xl">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800/80 pb-4">
        <div>
          <h2 className="text-base font-bold text-white flex items-center space-x-2">
            <Calendar className="w-5 h-5 text-indigo-400" />
            <span>Global Appointment Audit Log</span>
          </h2>
          <p className="text-xs text-slate-400">
            Real-time audit log of all patient consultations, doctor assignments, and cancellation statuses.
          </p>
        </div>

        {/* Search & Status Filters */}
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          {/* Search Box */}
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search patient, doctor, symptoms..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 outline-none focus:border-indigo-500"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex space-x-1 bg-slate-950 p-1 rounded-xl text-xs font-bold border border-slate-800">
            {['ALL', 'BOOKED', 'COMPLETED', 'CANCELLED'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 rounded-lg transition text-[11px] ${
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
      </div>

      {/* Table Data Container */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-800 text-[10px] uppercase font-extrabold tracking-wider text-slate-400 bg-slate-950/60">
              <th className="py-3 px-4">Patient</th>
              <th className="py-3 px-4">Assigned Doctor</th>
              <th className="py-3 px-4">Date & Time</th>
              <th className="py-3 px-4">Symptoms</th>
              <th className="py-3 px-4 text-center">Status</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {isLoading ? (
              [1, 2, 3, 4, 5].map((n) => (
                <tr key={n} className="animate-pulse">
                  <td className="py-4 px-4"><div className="w-24 h-3 bg-slate-800 rounded"></div></td>
                  <td className="py-4 px-4"><div className="w-28 h-3 bg-slate-800 rounded"></div></td>
                  <td className="py-4 px-4"><div className="w-20 h-3 bg-slate-800 rounded"></div></td>
                  <td className="py-4 px-4"><div className="w-32 h-3 bg-slate-800 rounded"></div></td>
                  <td className="py-4 px-4 text-center"><div className="w-16 h-3 bg-slate-800 rounded mx-auto"></div></td>
                  <td className="py-4 px-4 text-right"><div className="w-16 h-3 bg-slate-800 rounded ml-auto"></div></td>
                </tr>
              ))
            ) : filteredAppointments.length === 0 ? (
              <tr>
                <td colSpan="6" className="text-center py-12 text-slate-500 font-medium">
                  No system appointments found matching search standards.
                </td>
              </tr>
            ) : (
              filteredAppointments.map((app) => (
                <tr key={app.id} className="hover:bg-slate-800/40 transition">
                  <td className="py-3.5 px-4 font-semibold text-white">
                    <div>{app.patient?.name}</div>
                    <div className="text-[10px] text-slate-400 font-normal">{app.patient?.email}</div>
                  </td>

                  <td className="py-3.5 px-4 text-slate-300">
                    <div className="font-semibold text-white">Dr. {app.doctorProfile?.user?.name || 'Doctor'}</div>
                    <div className="text-[10px] text-indigo-400 font-semibold">{app.doctorProfile?.specialisation || 'General'}</div>
                  </td>

                  <td className="py-3.5 px-4 text-slate-300">
                    <div>{new Date(app.appointmentDate).toLocaleDateString()}</div>
                    <div className="text-[10px] text-slate-400 flex items-center space-x-1 mt-0.5">
                      <Clock className="w-3 h-3 text-slate-500" />
                      <span>{app.startTime} - {app.endTime}</span>
                    </div>
                  </td>

                  <td className="py-3.5 px-4 text-slate-300 max-w-xs truncate">
                    {app.symptoms}
                  </td>

                  <td className="py-3.5 px-4 text-center">
                    <span
                      className={`inline-flex items-center space-x-1 px-2.5 py-0.5 text-[10px] font-extrabold rounded-full ${
                        app.status === 'BOOKED'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : app.status === 'COMPLETED'
                          ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                          : 'bg-red-500/20 text-red-400 border border-red-500/30'
                      }`}
                    >
                      {app.status === 'BOOKED' && <CheckCircle2 className="w-3 h-3" />}
                      {app.status === 'COMPLETED' && <CheckCircle2 className="w-3 h-3" />}
                      {app.status === 'CANCELLED' && <XCircle className="w-3 h-3" />}
                      <span>{app.status}</span>
                    </span>
                  </td>

                  <td className="py-3.5 px-4 text-right">
                    {app.status === 'BOOKED' ? (
                      <button
                        onClick={() => onCancelAppointment(app)}
                        className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-lg text-[11px] font-bold transition"
                      >
                        Cancel Booking
                      </button>
                    ) : (
                      <span className="text-[10px] text-slate-500 font-bold uppercase">Archived</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
