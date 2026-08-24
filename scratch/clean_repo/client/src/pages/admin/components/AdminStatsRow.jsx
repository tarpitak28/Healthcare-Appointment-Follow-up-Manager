import React from 'react';
import { UserCheck, CalendarCheck, Activity } from 'lucide-react';

export default function AdminStatsRow({ doctorsCount = 0, bookedCount = 0, totalCount = 0 }) {
  const stats = [
    {
      title: 'Registered Doctors',
      value: doctorsCount,
      icon: UserCheck,
      textColor: 'text-[#3FA3C3]',
      bgColor: 'bg-[#EAF7FA]',
      borderColor: 'border-[#3FA3C3]/30',
    },
    {
      title: 'Active Bookings',
      value: bookedCount,
      icon: CalendarCheck,
      textColor: 'text-[#3FAF7A]',
      bgColor: 'bg-[#EBF7F1]',
      borderColor: 'border-[#3FAF7A]/30',
    },
    {
      title: 'Total System Appointments',
      value: totalCount,
      icon: Activity,
      textColor: 'text-[#237C9A]',
      bgColor: 'bg-[#EAF7FA]',
      borderColor: 'border-[#237C9A]/30',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {stats.map((stat, idx) => {
        const Icon = stat.icon;
        return (
          <div
            key={idx}
            className="p-5 rounded-2xl bg-white border border-[#E5E7EB] flex items-center justify-between shadow-xs transition hover:border-[#CBD5E1]"
          >
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#6F7378]">
                {stat.title}
              </p>
              <h3 className="text-3xl font-extrabold text-[#202124] mt-1 tracking-tight">
                {stat.value}
              </h3>
            </div>

            <div className={`w-12 h-12 rounded-2xl ${stat.bgColor} ${stat.textColor} flex items-center justify-center border ${stat.borderColor}`}>
              <Icon className="w-6 h-6" />
            </div>
          </div>
        );
      })}
    </div>
  );
}
