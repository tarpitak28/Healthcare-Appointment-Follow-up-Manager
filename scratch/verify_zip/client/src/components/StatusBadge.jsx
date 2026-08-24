import React from 'react';

export default function StatusBadge({ status, className = '' }) {
  const normalized = (status || '').toUpperCase();

  let styles = 'bg-[#F7F9FA] text-[#6F7378] border-[#E5E7EB]';

  if (normalized === 'CONFIRMED' || normalized === 'BOOKED' || normalized === 'COMPLETED') {
    styles = 'bg-[#EBF7F1] text-[#3FAF7A] border-[#3FAF7A]/30 font-semibold';
  } else if (normalized === 'WAITING' || normalized === 'PENDING' || normalized.includes('REVIEW')) {
    styles = 'bg-[#FEF8EC] text-[#F2B84B] border-[#F2B84B]/40 font-semibold';
  } else if (normalized === 'CANCELLED' || normalized === 'FAILED') {
    styles = 'bg-[#FDF2F2] text-[#E46B6B] border-[#E46B6B]/30 font-semibold';
  } else if (normalized === 'HELD') {
    styles = 'bg-[#EAF7FA] text-[#3FA3C3] border-[#3FA3C3]/40 font-semibold';
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs border ${styles} ${className}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 opacity-80"></span>
      {normalized}
    </span>
  );
}
