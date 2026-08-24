import React from 'react';
import { Stethoscope } from 'lucide-react';

export default function EmptyState({
  icon: Icon = Stethoscope,
  title = 'No records found',
  description = 'There are currently no items available to display.',
  actionLabel,
  onAction,
}) {
  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-8 sm:p-12 text-center space-y-3 max-w-md mx-auto my-6 shadow-sm">
      <div className="w-14 h-14 bg-teal-50 text-teal-700 rounded-2xl flex items-center justify-center mx-auto mb-2 border border-teal-100">
        <Icon className="w-7 h-7" />
      </div>
      <h3 className="text-base font-bold text-slate-900">{title}</h3>
      <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
        {description}
      </p>
      {actionLabel && onAction && (
        <div className="pt-2">
          <button
            onClick={onAction}
            className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold rounded-xl shadow-sm transition"
          >
            {actionLabel}
          </button>
        </div>
      )}
    </div>
  );
}
