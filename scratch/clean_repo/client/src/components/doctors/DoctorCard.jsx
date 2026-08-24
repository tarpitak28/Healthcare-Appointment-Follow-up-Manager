import React from 'react';
import { Star, Award } from 'lucide-react';
import Button from '../ui/Button';

export default function DoctorCard({ doctor, onBook }) {
  const doctorName = doctor.name || doctor.user?.name || 'Doctor';
  const specialisation = doctor.doctorProfile?.specialisation || 'General Physician';

  return (
    <div className="bg-white border border-[#E5E7EB] hover:border-[#CBD5E1] rounded-2xl p-4 sm:p-5 shadow-xs transition-all duration-200 flex flex-col justify-between space-y-4">
      <div className="space-y-3">
        {/* Doctor Header */}
        <div className="flex items-start space-x-3">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-[#EAF7FA] text-[#3FA3C3] border border-[#3FA3C3]/20 flex items-center justify-center font-bold text-base sm:text-lg flex-shrink-0">
            👨‍⚕️
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-[#202124] text-sm sm:text-base truncate">
                Dr. {doctorName}
              </h3>
              <span className="flex items-center text-[11px] font-bold text-[#F2B84B] bg-[#FEF8EC] border border-[#F2B84B]/30 px-2 py-0.5 rounded-full ml-2 flex-shrink-0">
                <Star className="w-3 h-3 fill-current mr-1 text-[#F2B84B]" />
                4.8
              </span>
            </div>

            <p className="text-xs font-semibold text-[#3FA3C3] mt-0.5 truncate">
              {specialisation}
            </p>

            <p className="text-[11px] text-[#6F7378] font-medium mt-1 flex items-center space-x-1.5">
              <Award className="w-3.5 h-3.5 text-[#6F7378]" />
              <span>12 years experience</span>
            </p>
          </div>
        </div>

        {/* Specialty Tag Badge */}
        <div>
          <span className="inline-block px-2.5 py-1 bg-[#EAF7FA] text-[#237C9A] border border-[#3FA3C3]/20 rounded-lg text-xs font-semibold">
            {specialisation}
          </span>
        </div>

        {/* Details List */}
        <div className="space-y-1.5 text-xs text-[#6F7378] pt-2 border-t border-[#E5E7EB]">
          <div className="flex justify-between items-center">
            <span className="font-medium text-[#6F7378]">Available:</span>
            <span className="font-semibold text-[#202124]">Mon, Wed, Fri</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="font-medium text-[#6F7378]">Consultation Fee:</span>
            <span className="font-bold text-[#202124]">₹800 <span className="text-[10px] font-normal text-[#6F7378]">Starting</span></span>
          </div>
        </div>
      </div>

      {/* Book Button (Full width on mobile) */}
      <div className="pt-1">
        <Button
          variant="primary"
          className="w-full py-3 sm:py-2.5 text-xs min-h-[44px]"
          onClick={() => onBook(doctor)}
        >
          Book Appointment
        </Button>
      </div>
    </div>
  );
}
