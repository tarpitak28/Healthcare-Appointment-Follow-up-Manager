import React from 'react';
import { Sparkles } from 'lucide-react';

export default function SidebarPromoCard() {
  return (
    <div className="p-4 bg-[#EAF7FA] border border-[#3FA3C3]/30 rounded-2xl space-y-2">
      <div className="w-8 h-8 rounded-xl bg-[#3FA3C3] text-white flex items-center justify-center font-bold text-xs shadow-xs">
        <Sparkles className="w-4 h-4" />
      </div>
      <h4 className="font-bold text-xs text-[#202124] tracking-tight">
        Better healthcare, simplified.
      </h4>
      <p className="text-[11px] text-[#6F7378] leading-relaxed">
        Manage your appointments and health records with ease.
      </p>
    </div>
  );
}
