import React from 'react';
import { UserCheck, CalendarCheck, Activity, Users } from 'lucide-react';

export default function AdminStatsRow({ doctorsCount = 0, bookedCount = 0, totalCount = 0 }) {
  const stats = [
    {
      title: 'Registered Doctors',
      value: doctorsCount,
      icon: UserCheck,
      color: 'from-indigo-600 to-indigo-500',
      textColor: 'text-indigo-400',
      bgColor: 'bg-indigo-500/10',
      borderColor: 'border-indigo-500/20',
    },
    {
      title: 'Active Bookings',
      value: bookedCount,
      icon: CalendarCheck,
      color: 'from-emerald-600 to-emerald-500',
      textColor: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
      borderColor: 'border-emerald-500/20',
    },
    {
      title: 'Total System Appointments',
      value: totalCount,
      icon: Activity,
      color: 'from-blue-600 to-blue-500',
      textColor: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/20',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {stats.map((stat, idx) => {
        const Icon = stat.icon;
        return (
          <div
            key={idx}
            className={`p-5 rounded-2xl bg-slate-900/80 border ${stat.borderColor} flex items-center justify-between shadow-lg hover:shadow-xl transition-all`}
          >
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                {stat.title}
              </p>
              <h3 className="text-3xl font-black text-white mt-1 tracking-tight">
                {stat.value}
              </h3>
            </div>

            <div className={`w-12 h-12 rounded-2xl ${stat.bgColor} ${stat.textColor} flex items-center justify-center border ${stat.borderColor}`}>
              <Icon className="w-6 h-6 animate-pulse" />
            </div>
          </div>
        );
      })}
    </div>
  );
}
