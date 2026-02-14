'use client';

import { Check, X } from 'lucide-react';

export function Toast({
  message,
  type,
  onClose,
}: {
  message: string;
  type: 'success' | 'error';
  onClose: () => void;
}) {
  return (
    <div
      className={`fixed top-4 right-4 z-50 flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium shadow-lg transition-all ${
        type === 'success'
          ? 'bg-green-50 text-green-800 border border-green-200'
          : 'bg-red-50 text-red-800 border border-red-200'
      }`}
    >
      {type === 'success' ? (
        <Check className="h-4 w-4" />
      ) : (
        <X className="h-4 w-4" />
      )}
      <span>{message}</span>
      <button
        type="button"
        onClick={onClose}
        className="ml-2 opacity-60 hover:opacity-100"
        aria-label="關閉"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
