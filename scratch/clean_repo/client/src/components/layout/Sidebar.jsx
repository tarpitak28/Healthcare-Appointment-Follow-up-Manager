import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import CareConnectLogo from '../CareConnectLogo';
import SidebarPromoCard from './SidebarPromoCard';
import {
  LayoutDashboard,
  Search,
  CalendarCheck,
  Calendar,
  FileText,
  Pill,
  Bell,
  User,
  LogOut,
  Clock,
  Users,
  Stethoscope,
  Video,
} from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab, role = 'PATIENT' }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const patientNav = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'book', label: 'Find Doctors', icon: Search },
    { id: 'appointments', label: 'Appointments', icon: CalendarCheck },
    { id: 'calendar', label: 'Calendar', icon: Calendar },
    { id: 'records', label: 'Medical Records', icon: FileText },
    { id: 'prescriptions', label: 'Prescriptions', icon: Pill },
    { id: 'reminders', label: 'Notifications', icon: Bell },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  const doctorNav = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'appointments', label: 'Appointments', icon: CalendarCheck },
    { id: 'availability', label: 'My Availability', icon: Clock },
    { id: 'records', label: 'Patient Records', icon: Users },
    { id: 'consultations', label: 'My Consultations', icon: Stethoscope },
    { id: 'online', label: 'Online Consultation', icon: Video },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  const adminNav = [
    { id: 'command', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'leave', label: 'Doctor Leave', icon: Clock },
    { id: 'doctors', label: 'Registered Doctors', icon: Users },
    { id: 'audit', label: 'Audit Log', icon: FileText },
    { id: 'broadcast', label: 'Broadcasts', icon: Bell },
  ];

  const items = role === 'DOCTOR' ? doctorNav : role === 'ADMIN' ? adminNav : patientNav;

  return (
    <aside className="hidden lg:flex w-60 bg-white border-r border-[#E5E7EB] flex-col justify-between p-5 z-30 shadow-xs h-full flex-shrink-0">
      <div className="space-y-6">
        {/* Brand Header */}
        <div className="px-1">
          <CareConnectLogo size="small" />
        </div>

        {/* Navigation Items */}
        <nav className="space-y-1">
          {items.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-[#3FA3C3] text-white shadow-xs font-bold'
                    : 'text-[#6F7378] hover:bg-[#F7F9FA] hover:text-[#202124]'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-[#6F7378]'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Promotional Card & Logout */}
      <div className="space-y-4 pt-4 border-t border-[#E5E7EB]">
        {role === 'PATIENT' && <SidebarPromoCard />}

        <div className="bg-[#F7F9FA] p-3 rounded-xl border border-[#E5E7EB] flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-[#3FA3C3] text-white font-bold text-xs flex items-center justify-center">
            {user?.name?.charAt(0) || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-[#202124] truncate">{user?.name}</p>
            <p className="text-[10px] text-[#6F7378] font-semibold truncate capitalize">{role.toLowerCase()}</p>
          </div>
        </div>

        <button
          onClick={() => {
            logout();
            navigate('/login');
          }}
          className="w-full flex items-center justify-center space-x-2 px-3 py-2 bg-white hover:bg-[#FDF2F2] text-[#6F7378] hover:text-[#E46B6B] text-xs font-semibold rounded-xl border border-[#E5E7EB] hover:border-[#E46B6B]/30 transition"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
