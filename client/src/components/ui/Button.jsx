import React from 'react';

export default function Button({
  children,
  variant = 'primary', // 'primary' | 'secondary' | 'danger' | 'ghost'
  size = 'md', // 'sm' | 'md' | 'lg'
  disabled = false,
  onClick,
  type = 'button',
  className = '',
}) {
  let baseStyles = 'inline-flex items-center justify-center font-semibold rounded-10 transition-all duration-150 outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed';

  let variantStyles = 'bg-[#3FA3C3] hover:bg-[#237C9A] text-white shadow-xs focus:ring-[#3FA3C3]/30';
  if (variant === 'secondary') {
    variantStyles = 'bg-white hover:bg-[#F7F9FA] text-[#202124] border border-[#E5E7EB] hover:border-[#CBD5E1] focus:ring-[#3FA3C3]/20';
  } else if (variant === 'danger') {
    variantStyles = 'bg-[#FDF2F2] hover:bg-[#FCE4E4] text-[#E46B6B] border border-[#E46B6B]/30 focus:ring-[#E46B6B]/20';
  } else if (variant === 'ghost') {
    variantStyles = 'bg-transparent hover:bg-[#F7F9FA] text-[#6F7378] hover:text-[#202124]';
  }

  let sizeStyles = 'px-4 py-2.5 text-xs';
  if (size === 'sm') sizeStyles = 'px-3 py-1.5 text-xs';
  if (size === 'lg') sizeStyles = 'px-6 py-3.5 text-sm';

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`${baseStyles} ${variantStyles} ${sizeStyles} ${className}`}
    >
      {children}
    </button>
  );
}
