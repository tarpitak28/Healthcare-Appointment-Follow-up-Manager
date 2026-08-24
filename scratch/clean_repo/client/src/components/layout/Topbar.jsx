import React, { useState } from 'react';
import { Menu, Bell, Globe, ChevronDown, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import CareConnectLogo from '../CareConnectLogo';

export default function Topbar({ title, subtitle, onOpenDrawer }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showProfileMenu, setShowProfileMenu] = useState(false);

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
            onClick={() => setShowProfileMenu(!showProfileMenu)}
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
