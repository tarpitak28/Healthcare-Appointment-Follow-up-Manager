import React, { useState } from 'react';
import { Search, MapPin, Stethoscope, ArrowRight } from 'lucide-react';

export default function HeroBanner({ patientName = 'Patient', onSearch, onFindDoctor }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [location, setLocation] = useState('');

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (onSearch) onSearch({ searchTerm, location });
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Top Greeting Header */}
      <div>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-[#202124] tracking-tight">
          Good morning, {patientName}
        </h1>
        <p className="text-xs sm:text-sm text-[#6F7378] font-medium mt-0.5 sm:mt-1">
          Find the right doctor for your care
        </p>
      </div>

      {/* Responsive Search Component Bar (Sections 14) */}
      <form
        onSubmit={handleSearchSubmit}
        className="bg-white p-2.5 sm:p-3 rounded-2xl border border-[#E5E7EB] shadow-xs grid grid-cols-1 sm:grid-cols-12 gap-2"
      >
        <div className="sm:col-span-6 relative flex items-center">
          <Search className="w-4 h-4 text-[#6F7378] absolute left-3.5" />
          <input
            type="text"
            placeholder="Search doctors, specialties, symptoms..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-3 py-3 sm:py-2.5 bg-[#F7F9FA] border border-transparent focus:border-[#3FA3C3] focus:bg-white rounded-xl text-xs text-[#202124] font-medium outline-none transition min-h-[44px] sm:min-h-0"
          />
        </div>

        <div className="sm:col-span-4 relative flex items-center">
          <MapPin className="w-4 h-4 text-[#6F7378] absolute left-3.5" />
          <input
            type="text"
            placeholder="Location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="w-full pl-10 pr-3 py-3 sm:py-2.5 bg-[#F7F9FA] border border-transparent focus:border-[#3FA3C3] focus:bg-white rounded-xl text-xs text-[#202124] font-medium outline-none transition min-h-[44px] sm:min-h-0"
          />
        </div>

        <div className="sm:col-span-2">
          <button
            type="submit"
            className="w-full py-3 sm:py-2.5 bg-[#3FA3C3] hover:bg-[#237C9A] text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center space-x-1.5 min-h-[44px]"
          >
            <Search className="w-4 h-4" />
            <span>Search</span>
          </button>
        </div>
      </form>

      {/* Hero Card Banner (Section 13) */}
      <div className="bg-gradient-to-r from-[#EAF7FA] to-white p-5 sm:p-8 rounded-2xl border border-[#3FA3C3]/30 flex flex-col-reverse sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-6 relative overflow-hidden">
        <div className="space-y-2 max-w-lg z-10 w-full">
          <h2 className="text-lg sm:text-xl font-bold text-[#202124] leading-snug">
            Find trusted healthcare professionals
          </h2>
          <p className="text-xs sm:text-sm text-[#6F7378] leading-relaxed">
            Book appointments and manage your healthcare all in one place.
          </p>
          <div className="pt-2">
            <button
              onClick={onFindDoctor}
              className="w-full sm:w-auto px-5 py-3 sm:py-2.5 bg-[#3FA3C3] hover:bg-[#237C9A] text-white text-xs font-bold rounded-xl shadow-xs transition inline-flex items-center justify-center space-x-2 min-h-[44px]"
            >
              <span>Find a Doctor</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-2xl bg-[#3FA3C3]/10 border border-[#3FA3C3]/20 flex items-center justify-center text-[#3FA3C3] flex-shrink-0">
          <Stethoscope className="w-7 h-7 sm:w-10 sm:h-10" />
        </div>
      </div>
    </div>
  );
}
