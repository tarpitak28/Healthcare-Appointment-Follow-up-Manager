import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  Clock,
  Pill,
  User,
  LogOut,
  HeartPulse,
  CalendarCheck,
  Sparkles,
  ShieldCheck,
  ExternalLink,
} from 'lucide-react';
import API from '../../api/axios';

export default function PatientLayout({ children, activeTab, setActiveTab, message, setMessage }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleConnectCalendar = async () => {
    try {
      const res = await API.get(`/calendar/auth-url?userId=${user?.id || ''}`);
      if (res.data && res.data.url) {
        window.location.href = res.data.url;
      }
    } catch (error) {
      console.error('Failed to initiate Google OAuth', error);
      alert('Google Calendar OAuth URL generation failed. Please verify server configuration.');
    }
  };

  const navItems = [
    { id: 'book', label: 'Book Appointment', icon: Calendar },
    { id: 'appointments', label: 'My Appointments', icon: CalendarCheck },
    { id: 'reminders', label: 'Medication Reminders', icon: Pill },
    { id: 'profile', label: 'My Profile', icon: User },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row font-sans selection:bg-indigo-500 selection:text-white">
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 bg-slate-900/90 border-b md:border-b-0 md:border-r border-slate-800 flex flex-col justify-between p-4 md:p-6 z-30">
        <div>
          {/* Logo & Brand Header */}
          <div className="flex items-center space-x-3 mb-8">
            <div className="w-10 h-10 bg-gradient-to-tr from-indigo-600 to-indigo-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
              <HeartPulse className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h1 className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-indigo-200 to-white bg-clip-text text-transparent">
                HealthPulse
              </h1>
              <span className="text-[10px] font-bold tracking-widest text-indigo-400 uppercase">
                Patient Portal
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 font-extrabold'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* User Card & Logout */}
        <div className="pt-6 border-t border-slate-800 space-y-3 mt-6 md:mt-0">
          <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/60 flex items-center space-x-3">
            <div className="w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-bold text-xs">
              {user?.name?.charAt(0) || 'P'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-white truncate">{user?.name}</p>
              <p className="text-[10px] text-slate-400 truncate">{user?.email}</p>
            </div>
          </div>

          <button
            onClick={() => {
              logout();
              navigate('/login');
            }}
            className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-bold rounded-xl border border-red-500/20 transition"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Bar */}
        <header className="h-16 bg-slate-900/60 border-b border-slate-800/80 px-6 flex items-center justify-between backdrop-blur-md sticky top-0 z-20">
          <div className="flex items-center space-x-2 text-xs font-bold text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Secure Patient Session Active</span>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleConnectCalendar}
              className="flex items-center space-x-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-600/20 transition"
            >
              <Calendar className="w-4 h-4" />
              <span>Connect Google Calendar</span>
              <ExternalLink className="w-3 h-3 ml-0.5" />
            </button>
          </div>
        </header>

        {/* Global Notice Alert */}
        {message && (
          <div className="m-6 mb-0 p-4 bg-indigo-950/80 border border-indigo-500/30 text-indigo-200 rounded-2xl flex justify-between items-center text-xs shadow-lg">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span className="font-semibold">{message}</span>
            </div>
            <button
              onClick={() => setMessage('')}
              className="text-indigo-400 hover:text-white font-bold ml-4"
            >
              ✕
            </button>
          </div>
        )}

        {/* Dynamic View Container */}
        <main className="flex-1 p-6 md:p-8 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
