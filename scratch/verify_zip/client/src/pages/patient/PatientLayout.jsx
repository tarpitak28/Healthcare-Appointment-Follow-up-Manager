import React, { useState } from 'react';
import Sidebar from '../../components/layout/Sidebar';
import Topbar from '../../components/layout/Topbar';
import MobileDrawer from '../../components/layout/MobileDrawer';
import MobileBottomBar from '../../components/layout/MobileBottomBar';
import { useAuth } from '../../context/AuthContext';
import { Sparkles } from 'lucide-react';

export default function PatientLayout({ children, activeTab, setActiveTab, message, setMessage }) {
  const { user } = useAuth();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#F7F9FA] text-[#202124] flex flex-col lg:flex-row font-sans relative pb-16 md:pb-0">
      {/* Desktop Sidebar (lg: 1024px+) */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} role="PATIENT" />

      {/* Mobile Navigation Drawer (<1024px) */}
      <MobileDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        role="PATIENT"
      />

      {/* Main Content Workspace Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar
          title={`Hi, ${user?.name || 'Patient'}`}
          subtitle="CareConnect Patient Workspace"
          onOpenDrawer={() => setIsDrawerOpen(true)}
        />

        {/* Global Notice Banner */}
        {message && (
          <div className="m-4 sm:m-6 mb-0 p-3.5 sm:p-4 bg-[#EAF7FA] border border-[#3FA3C3]/30 text-[#237C9A] rounded-2xl flex justify-between items-center text-xs font-semibold shadow-xs">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-[#3FA3C3] flex-shrink-0" />
              <span>{message}</span>
            </div>
            <button onClick={() => setMessage('')} className="text-[#3FA3C3] font-bold ml-4">
              ✕
            </button>
          </div>
        )}

        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">{children}</main>
      </div>

      {/* Mobile Bottom Navigation Bar (<768px) */}
      <MobileBottomBar activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  );
}
