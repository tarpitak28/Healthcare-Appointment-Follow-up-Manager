import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import CareConnectLogo from '../CareConnectLogo';
import {
  X,
  LayoutDashboard,
  Search,
  CalendarCheck,
  Calendar,
  FileText,
  Pill,
  Bell,
  User,
  HelpCircle,
  LogOut,
  Clock,
  Users,
  Stethoscope,
  Video,
} from 'lucide-react';

export default function MobileDrawer({ isOpen, onClose, activeTab, setActiveTab, role = 'PATIENT' }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Close drawer on ESC key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

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

  const handleNavClick = (id) => {
    setActiveTab(id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex lg:hidden">
      {/* Dark Overlay Backdrop */}
      <div
        className="fixed inset-0 bg-[#202124]/50 backdrop-blur-xs transition-opacity duration-200"
        onClick={onClose}
      />

      {/* Slide-over Left Drawer Panel */}
      <div className="relative w-[85%] max-w-xs bg-white h-full shadow-2xl flex flex-col justify-between p-5 z-10 overflow-y-auto">
        <div className="space-y-6">
          {/* Header with Close Button */}
          <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB]">
            <CareConnectLogo size="small" />
            <button
              onClick={onClose}
              aria-label="Close navigation menu"
              className="w-9 h-9 rounded-xl bg-[#F7F9FA] border border-[#E5E7EB] flex items-center justify-center text-[#6F7378] hover:text-[#202124] transition active:scale-95 min-h-[44px] min-w-[44px]"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Items */}
          <nav className="space-y-1">
            {items.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full flex items-center space-x-3.5 px-4 py-3 rounded-xl text-xs font-bold transition-all active:scale-[0.98] min-h-[44px] ${
                    isActive
                      ? 'bg-[#3FA3C3] text-white shadow-xs'
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

        {/* User Card & Logout */}
        <div className="space-y-3 pt-4 border-t border-[#E5E7EB]">
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
              onClose();
              logout();
              navigate('/login');
            }}
            className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-[#FDF2F2] text-[#E46B6B] text-xs font-bold rounded-xl border border-[#E46B6B]/30 transition min-h-[44px]"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout Account</span>
          </button>
        </div>
      </div>
    </div>
  );
}
