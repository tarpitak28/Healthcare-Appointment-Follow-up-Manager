import React, { useState } from 'react';
import { Search, Calendar, Clock } from 'lucide-react';
import StatusBadge from '../../../components/StatusBadge';
import Button from '../../../components/ui/Button';

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
    <div className="bg-white rounded-2xl border border-[#E5E7EB] p-4 sm:p-6 space-y-4 shadow-xs">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#E5E7EB] pb-4">
        <div>
          <h2 className="text-base font-bold text-[#202124] flex items-center space-x-2">
            <Calendar className="w-5 h-5 text-[#3FA3C3]" />
            <span>Global Appointment Audit Log</span>
          </h2>
          <p className="text-xs text-[#6F7378] font-medium">
            Real-time audit log of all patient consultations, doctor assignments, and cancellation statuses.
          </p>
        </div>

        {/* Search & Status Filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-[#6F7378] absolute left-3 top-3 sm:top-2.5" />
            <input
              type="text"
              placeholder="Search patient, doctor, symptoms..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 sm:py-2 bg-[#F7F9FA] border border-[#E5E7EB] rounded-xl text-xs text-[#202124] placeholder-[#6F7378]/60 outline-none focus:border-[#3FA3C3] min-h-[44px] sm:min-h-0"
            />
          </div>

          <div className="flex space-x-1 bg-[#F7F9FA] p-1 rounded-xl text-xs font-bold border border-[#E5E7EB] overflow-x-auto">
            {['ALL', 'BOOKED', 'COMPLETED', 'CANCELLED'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1.5 rounded-lg transition text-[11px] flex-shrink-0 ${
                  statusFilter === st
                    ? 'bg-[#3FA3C3] text-white font-bold shadow-xs'
                    : 'text-[#6F7378] hover:text-[#202124]'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* MOBILE CARD VIEW (<768px) (Section 30) */}
      <div className="block md:hidden space-y-3">
        {isLoading ? (
          [1, 2].map((n) => (
            <div key={n} className="p-4 bg-[#F7F9FA] border border-[#E5E7EB] rounded-xl animate-pulse space-y-2">
              <div className="w-1/2 h-4 bg-[#E5E7EB] rounded"></div>
              <div className="w-1/3 h-3 bg-[#E5E7EB] rounded"></div>
            </div>
          ))
        ) : filteredAppointments.length === 0 ? (
          <div className="text-center py-8 text-[#6F7378] text-xs font-medium">
            No system appointments found matching search criteria.
          </div>
        ) : (
          filteredAppointments.map((app) => (
            <div key={app.id} className="p-4 bg-[#F7F9FA] border border-[#E5E7EB] rounded-xl space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-bold text-xs text-[#202124]">{app.patient?.name}</h4>
                  <p className="text-[10px] text-[#6F7378]">{app.patient?.email}</p>
                </div>
                <StatusBadge status={app.status} />
              </div>

              <div className="text-xs space-y-1 text-[#6F7378] pt-1 border-t border-[#E5E7EB]">
                <p><strong>Doctor:</strong> Dr. {app.doctorProfile?.user?.name || 'Doctor'} ({app.doctorProfile?.specialisation})</p>
                <p className="flex items-center space-x-1">
                  <Clock className="w-3.5 h-3.5 text-[#6F7378]" />
                  <span>{new Date(app.appointmentDate).toLocaleDateString()} • {app.startTime} - {app.endTime}</span>
                </p>
                {app.symptoms && <p><strong>Symptoms:</strong> {app.symptoms}</p>}
              </div>

              {app.status === 'BOOKED' && (
                <Button variant="danger" size="sm" className="w-full min-h-[44px]" onClick={() => onCancelAppointment(app)}>
                  Cancel Booking
                </Button>
              )}
            </div>
          ))
        )}
      </div>

      {/* DESKTOP TABLE VIEW (>=768px) */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-[#E5E7EB] text-[10px] uppercase font-extrabold tracking-wider text-[#6F7378] bg-[#F7F9FA]">
              <th className="py-3 px-4">Patient</th>
              <th className="py-3 px-4">Assigned Doctor</th>
              <th className="py-3 px-4">Date & Time</th>
              <th className="py-3 px-4">Symptoms</th>
              <th className="py-3 px-4 text-center">Status</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E7EB]">
            {isLoading ? (
              [1, 2, 3, 4].map((n) => (
                <tr key={n} className="animate-pulse">
                  <td className="py-4 px-4"><div className="w-24 h-3 bg-[#E5E7EB] rounded"></div></td>
                  <td className="py-4 px-4"><div className="w-28 h-3 bg-[#E5E7EB] rounded"></div></td>
                  <td className="py-4 px-4"><div className="w-20 h-3 bg-[#E5E7EB] rounded"></div></td>
                  <td className="py-4 px-4"><div className="w-32 h-3 bg-[#E5E7EB] rounded"></div></td>
                  <td className="py-4 px-4 text-center"><div className="w-16 h-3 bg-[#E5E7EB] rounded mx-auto"></div></td>
                  <td className="py-4 px-4 text-right"><div className="w-16 h-3 bg-[#E5E7EB] rounded ml-auto"></div></td>
                </tr>
              ))
            ) : filteredAppointments.length === 0 ? (
              <tr>
                <td colSpan="6" className="text-center py-12 text-[#6F7378] font-medium">
                  No system appointments found matching search criteria.
                </td>
              </tr>
            ) : (
              filteredAppointments.map((app) => (
                <tr key={app.id} className="hover:bg-[#F7F9FA] transition">
                  <td className="py-3.5 px-4 font-bold text-[#202124]">
                    <div>{app.patient?.name}</div>
                    <div className="text-[10px] text-[#6F7378] font-normal">{app.patient?.email}</div>
                  </td>

                  <td className="py-3.5 px-4 text-[#202124]">
                    <div className="font-bold text-[#202124]">Dr. {app.doctorProfile?.user?.name || 'Doctor'}</div>
                    <div className="text-[10px] text-[#3FA3C3] font-semibold">{app.doctorProfile?.specialisation || 'General'}</div>
                  </td>

                  <td className="py-3.5 px-4 text-[#202124]">
                    <div>{new Date(app.appointmentDate).toLocaleDateString()}</div>
                    <div className="text-[10px] text-[#6F7378] flex items-center space-x-1 mt-0.5 font-medium">
                      <Clock className="w-3 h-3 text-[#6F7378]" />
                      <span>{app.startTime} - {app.endTime}</span>
                    </div>
                  </td>

                  <td className="py-3.5 px-4 text-[#6F7378] max-w-xs truncate">
                    {app.symptoms}
                  </td>

                  <td className="py-3.5 px-4 text-center">
                    <StatusBadge status={app.status} />
                  </td>

                  <td className="py-3.5 px-4 text-right">
                    {app.status === 'BOOKED' ? (
                      <Button variant="danger" size="sm" onClick={() => onCancelAppointment(app)}>
                        Cancel Booking
                      </Button>
                    ) : (
                      <span className="text-[10px] text-[#6F7378] font-bold uppercase">Archived</span>
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
