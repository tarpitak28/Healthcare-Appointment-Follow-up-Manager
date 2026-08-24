import React from 'react';

/**
 * CareConnect Brand Logo Component
 * Concept: Medical Cross + Heart + Connected Nodes
 */
export default function CareConnectLogo({ variant = 'full', size = 'medium', className = '' }) {
  const iconSize = size === 'small' ? 'w-6 h-6' : size === 'large' ? 'w-10 h-10' : 'w-8 h-8';
  const textSize = size === 'small' ? 'text-sm' : size === 'large' ? 'text-2xl' : 'text-lg';

  const iconMarkup = (
    <div className={`relative flex items-center justify-center bg-[#3FA3C3] text-white rounded-xl shadow-xs ${iconSize}`}>
      <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
        {/* Medical Cross + Connected Node Paths */}
        <path d="M19 10.5h-4.5V6a1.5 1.5 0 0 0-3 0v4.5H7a1.5 1.5 0 0 0 0 3h4.5V18a1.5 1.5 0 0 0 3 0v-4.5H19a1.5 1.5 0 0 0 0-3z" />
      </svg>
      <div className="absolute -top-1 -right-1 w-3 h-3 bg-[#E46B6B] rounded-full border-2 border-white flex items-center justify-center">
        <span className="text-[8px] font-bold text-white">♥</span>
      </div>
    </div>
  );

  if (variant === 'icon') {
    return <div className={className}>{iconMarkup}</div>;
  }

  return (
    <div className={`flex items-center space-x-2.5 ${className}`}>
      {iconMarkup}
      <div>
        <span className={`font-extrabold tracking-tight text-[#202124] ${textSize}`}>
          Care<span className="text-[#3FA3C3]">Connect</span>
        </span>
        {size !== 'small' && (
          <p className="text-[10px] font-medium text-[#6F7378] leading-none mt-0.5">
            Healthcare Appointment & Patient Management
          </p>
        )}
      </div>
    </div>
  );
}
