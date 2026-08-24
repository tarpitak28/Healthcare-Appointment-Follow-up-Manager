import React, { useState, useEffect } from 'react';
import { Menu, Bell, Globe, ChevronDown, LogOut, Calendar, CalendarCheck, Check, Unlink, RefreshCw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import CareConnectLogo from '../CareConnectLogo';
import API from '../../api/axios';

export default function Topbar({ title, subtitle, onOpenDrawer }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showCalendarMenu, setShowCalendarMenu] = useState(false);
  const [isCalendarConnected, setIsCalendarConnected] = useState(false);
  const [calendarLoading, setCalendarLoading] = useState(false);

  // Check Calendar connection status on mount / user change / URL query change
  useEffect(() => {
    if (!user) return;

    const checkCalendarStatus = async () => {
      try {
        const res = await API.get('/calendar/status');
        if (res.data && res.data.connected) {
          setIsCalendarConnected(true);
        } else {
          setIsCalendarConnected(false);
        }
      } catch (err) {
        console.error('Failed to check calendar status:', err);
      }
    };

    // Handle OAuth callback URL parameter ?google=connected
    const searchParams = new URLSearchParams(location.search);
    if (searchParams.get('google') === 'connected') {
      setIsCalendarConnected(true);
      // Clean up URL query parameters without reloading
      window.history.replaceState({}, document.title, window.location.pathname);
    } else {
      checkCalendarStatus();
    }
  }, [user, location.search]);

  const handleConnectCalendar = async () => {
    try {
      setCalendarLoading(true);
      const userId = user?.id || '';
      const returnPath = location.pathname || '/';
      const res = await API.get(`/calendar/auth-url?userId=${userId}&returnPath=${encodeURIComponent(returnPath)}`);
      if (res.data && res.data.url) {
        window.location.href = res.data.url;
      }
    } catch (err) {
      console.error('Error initiating Google Calendar connection:', err);
    } finally {
      setCalendarLoading(false);
    }
  };

  const handleDisconnectCalendar = async () => {
    try {
      setCalendarLoading(true);
      await API.post('/calendar/disconnect');
      setIsCalendarConnected(false);
      setShowCalendarMenu(false);
    } catch (err) {
      console.error('Error disconnecting Google Calendar:', err);
    } finally {
      setCalendarLoading(false);
    }
  };

  return (
    <header className="h-16 bg-white border-b border-[#E5E7EB] px-4 sm:px-6 flex items-center justify-between sticky top-0 z-20 shadow-xs">
      {/* Left: Mobile Hamburger Trigger + Logo on Mobile, Title on Desktop */}
      <div className="flex items-center space-x-3 min-w-0">
        {onOpenDrawer && (
          <button
            onClick={onOpenDrawer}
            aria-label="Open navigation menu"
            className="lg:hidden w-10 h-10 rounded-xl bg-[#F7F9FA] border border-[#E5E7EB] flex items-center justify-center text-[#202124] hover:text-[#3FA3C3] transition active:scale-95 min-h-[44px] min-w-[44px]"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        {/* Mobile Logo Display */}
        <div className="lg:hidden flex items-center">
          <CareConnectLogo size="small" />
        </div>

        {/* Desktop Greeting Title */}
        <div className="hidden lg:block">
          <h1 className="text-base font-bold text-[#202124] truncate">
            {title || `Hi, ${user?.name || 'User'}`}
          </h1>
          {subtitle && (
            <p className="text-[11px] text-[#6F7378] font-medium leading-none mt-0.5 truncate">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center space-x-2 sm:space-x-3">
        {/* Google Calendar Sync Widget */}
        <div className="relative">
          {isCalendarConnected ? (
            <button
              onClick={() => setShowCalendarMenu(!showCalendarMenu)}
              disabled={calendarLoading}
              title="Google Calendar Connected"
              className="calendar-glowing-badge flex items-center space-x-2 px-3 py-1.5 bg-gradient-to-r from-emerald-50 to-teal-50 hover:from-emerald-100 hover:to-teal-100 text-emerald-900 border border-emerald-500 rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
            >
              <div className="relative flex items-center justify-center">
                <CalendarCheck className="w-4 h-4 text-emerald-600" />
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-500 rounded-full animate-ping"></span>
              </div>
              <span className="hidden sm:inline">Calendar Connected</span>
              <span className="sm:hidden">Connected</span>
              <ChevronDown className="w-3.5 h-3.5 text-emerald-700" />
            </button>
          ) : (
            <button
              onClick={handleConnectCalendar}
              disabled={calendarLoading}
              title="Click to Connect Google Calendar"
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#F7F9FA] hover:bg-teal-50 text-[#6F7378] hover:text-[#3FA3C3] border border-[#E5E7EB] hover:border-[#3FA3C3] rounded-xl text-xs font-semibold transition active:scale-95"
            >
              {calendarLoading ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#3FA3C3]" />
              ) : (
                <Calendar className="w-3.5 h-3.5" />
              )}
              <span className="hidden sm:inline">Connect Calendar</span>
              <span className="sm:hidden">Sync</span>
            </button>
          )}

          {/* Calendar Dropdown Popover */}
          {showCalendarMenu && isCalendarConnected && (
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl border border-emerald-200 shadow-xl py-3 px-4 z-50 text-xs animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                <div className="flex items-center space-x-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                    <CalendarCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 leading-tight">Google Calendar</h4>
                    <p className="text-[10px] text-emerald-600 font-semibold flex items-center space-x-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
                      <span>Live Sync Active</span>
                    </p>
                  </div>
                </div>
              </div>

              <div className="py-2.5 text-gray-600 text-[11px] leading-relaxed">
                Your appointments and follow-up schedules are automatically synchronized with your Google Calendar.
              </div>

              <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                <button
                  onClick={handleDisconnectCalendar}
                  disabled={calendarLoading}
                  className="w-full py-1.5 px-3 bg-red-50 hover:bg-red-100 text-red-700 font-semibold rounded-lg flex items-center justify-center space-x-1.5 transition text-xs border border-red-200"
                >
                  <Unlink className="w-3.5 h-3.5" />
                  <span>Disconnect Calendar</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Language Selector */}
        <div className="hidden sm:flex items-center space-x-1 text-xs font-semibold text-[#6F7378] bg-[#F7F9FA] px-2.5 py-1.5 rounded-lg border border-[#E5E7EB]">
          <Globe className="w-3.5 h-3.5" />
          <span>EN</span>
          <ChevronDown className="w-3 h-3" />
        </div>

        {/* Notification Bell Trigger */}
        <div className="relative cursor-pointer w-9 h-9 sm:w-8 sm:h-8 rounded-xl bg-[#F7F9FA] border border-[#E5E7EB] flex items-center justify-center text-[#6F7378] hover:text-[#202124] transition min-h-[44px] sm:min-h-0 min-w-[44px] sm:min-w-0">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 sm:top-1 sm:right-1 w-2 h-2 bg-[#3FA3C3] rounded-full"></span>
        </div>

        {/* Profile Dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              setShowProfileMenu(!showProfileMenu);
              setShowCalendarMenu(false);
            }}
            className="flex items-center space-x-2 bg-[#F7F9FA] p-1.5 sm:pr-3 rounded-xl border border-[#E5E7EB] hover:border-[#CBD5E1] transition min-h-[44px] sm:min-h-0"
          >
            <div className="w-7 h-7 rounded-lg bg-[#3FA3C3] text-white font-bold text-xs flex items-center justify-center">
              {user?.name?.charAt(0) || 'U'}
            </div>
            <span className="text-xs font-semibold text-[#202124] hidden sm:inline truncate max-w-[100px]">
              {user?.name}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-[#6F7378] hidden sm:inline" />
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl border border-[#E5E7EB] shadow-lg py-1 z-50 text-xs">
              <div className="px-4 py-2 border-b border-[#E5E7EB]">
                <p className="font-bold text-[#202124] truncate">{user?.name}</p>
                <p className="text-[10px] text-[#6F7378] truncate">{user?.email}</p>
              </div>
              <button
                onClick={() => {
                  setShowProfileMenu(false);
                  logout();
                  navigate('/login');
                }}
                className="w-full text-left px-4 py-2 text-[#E46B6B] hover:bg-[#FDF2F2] font-semibold flex items-center space-x-2"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

