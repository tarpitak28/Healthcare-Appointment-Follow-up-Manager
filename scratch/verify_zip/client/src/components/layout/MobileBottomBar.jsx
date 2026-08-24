import React from 'react';
import { LayoutDashboard, Search, CalendarCheck, User } from 'lucide-react';

export default function MobileBottomBar({ activeTab, setActiveTab }) {
  const items = [
    { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
    { id: 'book', label: 'Doctors', icon: Search },
    { id: 'appointments', label: 'Visits', icon: CalendarCheck },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-[#E5E7EB] px-4 py-2 flex items-center justify-around md:hidden shadow-lg">
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;
        return (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`flex flex-col items-center justify-center flex-1 py-1 rounded-xl transition-all min-h-[44px] ${
              isActive ? 'text-[#3FA3C3] font-bold' : 'text-[#6F7378] hover:text-[#202124]'
            }`}
          >
            <Icon className={`w-5 h-5 ${isActive ? 'text-[#3FA3C3]' : 'text-[#6F7378]'}`} />
            <span className="text-[10px] font-semibold mt-1">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}
