import React from 'react';
import { CheckCircle, Sparkles, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  title: string;
  message?: string;
  type?: 'success' | 'info';
}

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-24 right-4 z-50 flex flex-col gap-2 max-w-sm pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto flex items-start gap-2.5 p-3 rounded-xl bg-neutral-900/95 border border-red-600/60 shadow-xl shadow-red-950/30 text-white backdrop-blur-md animate-in slide-in-from-top-2 fade-in duration-200"
        >
          <div className="w-5 h-5 rounded-full bg-[#E50914]/20 border border-[#E50914] flex items-center justify-center flex-shrink-0 mt-0.5">
            <CheckCircle className="w-3 h-3 text-[#E50914]" />
          </div>
          <div className="flex-1 pr-1">
            <h5 className="text-xs font-bold text-white leading-tight">
              {toast.title}
            </h5>
            {toast.message && (
              <p className="text-[11px] text-neutral-400 mt-0.5">
                {toast.message}
              </p>
            )}
          </div>
          <button
            onClick={() => onDismiss(toast.id)}
            className="text-neutral-500 hover:text-white p-0.5"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
};
