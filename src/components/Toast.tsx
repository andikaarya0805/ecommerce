import React, { useEffect, useState, useRef } from 'react';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
  X,
} from 'lucide-react';
export { toast, confirmModal, useToast, ToastProvider } from '../context/ToastContext';

export interface ToastMessage {
  id: string;
  title: string;
  message?: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

const ToastCardItem: React.FC<{
  toast: ToastMessage;
  onDismiss: (id: string) => void;
}> = ({ toast, onDismiss }) => {
  const [progress, setProgress] = useState(100);
  const [isHovered, setIsHovered] = useState(false);
  const type = toast.type || 'success';
  const duration = toast.duration || 3500;
  const startTimeRef = useRef(Date.now());
  const remainingTimeRef = useRef(duration);

  useEffect(() => {
    if (isHovered) return;

    startTimeRef.current = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const left = remainingTimeRef.current - elapsed;
      const pct = Math.max(0, (left / duration) * 100);
      setProgress(pct);

      if (left <= 0) {
        clearInterval(interval);
        onDismiss(toast.id);
      }
    }, 25);

    return () => {
      clearInterval(interval);
      remainingTimeRef.current = Math.max(0, remainingTimeRef.current - (Date.now() - startTimeRef.current));
    };
  }, [isHovered, duration, toast.id, onDismiss]);

  const config = {
    success: {
      badge: 'BERHASIL',
      badgeBg: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
      border: 'border-emerald-500/50',
      shadow: 'shadow-[0_12px_40px_-5px_rgba(16,185,129,0.35)]',
      bgGradient: 'from-neutral-900/95 via-neutral-900/95 to-emerald-950/40',
      iconBox: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 ring-4 ring-emerald-500/10',
      barColor: 'bg-gradient-to-r from-emerald-500 to-emerald-400',
      Icon: CheckCircle2,
    },
    error: {
      badge: 'GAGAL',
      badgeBg: 'bg-red-500/10 text-red-400 border border-red-500/20',
      border: 'border-red-500/60',
      shadow: 'shadow-[0_12px_40px_-5px_rgba(229,9,20,0.4)]',
      bgGradient: 'from-neutral-900/95 via-neutral-900/95 to-red-950/40',
      iconBox: 'bg-red-500/20 text-[#E50914] border border-red-500/40 ring-4 ring-red-500/10',
      barColor: 'bg-gradient-to-r from-[#E50914] to-red-600',
      Icon: XCircle,
    },
    warning: {
      badge: 'PERINGATAN',
      badgeBg: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
      border: 'border-amber-500/50',
      shadow: 'shadow-[0_12px_40px_-5px_rgba(245,158,11,0.35)]',
      bgGradient: 'from-neutral-900/95 via-neutral-900/95 to-amber-950/40',
      iconBox: 'bg-amber-500/20 text-amber-400 border border-amber-500/40 ring-4 ring-amber-500/10',
      barColor: 'bg-gradient-to-r from-amber-500 to-amber-400',
      Icon: AlertTriangle,
    },
    info: {
      badge: 'INFORMASI',
      badgeBg: 'bg-sky-500/10 text-sky-400 border border-sky-500/20',
      border: 'border-sky-500/50',
      shadow: 'shadow-[0_12px_40px_-5px_rgba(14,165,233,0.35)]',
      bgGradient: 'from-neutral-900/95 via-neutral-900/95 to-sky-950/40',
      iconBox: 'bg-sky-500/20 text-sky-400 border border-sky-500/40 ring-4 ring-sky-500/10',
      barColor: 'bg-gradient-to-r from-sky-500 to-sky-400',
      Icon: Info,
    },
  }[type];

  const { Icon } = config;

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`pointer-events-auto relative overflow-hidden rounded-2xl bg-gradient-to-br ${config.bgGradient} border ${config.border} ${config.shadow} backdrop-blur-xl p-3.5 sm:p-4 text-white min-w-[300px] max-w-[420px] transition-all duration-300 animate-in slide-in-from-top-3 fade-in duration-200 select-none`}
    >
      <div className="flex items-start gap-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${config.iconBox}`}>
          <Icon className="w-5 h-5" />
        </div>

        <div className="flex-1 min-w-0 pr-1">
          <div className="flex items-center gap-1.5 mb-1">
            <span className={`text-[9px] font-black tracking-wider px-2 py-0.5 rounded-full ${config.badgeBg}`}>
              {config.badge}
            </span>
          </div>
          <h4 className="text-xs sm:text-sm font-bold text-white leading-snug break-words">
            {toast.title}
          </h4>
          {toast.message && (
            <p className="text-[11px] sm:text-xs text-neutral-300 mt-0.5 leading-relaxed break-words font-medium">
              {toast.message}
            </p>
          )}
        </div>

        <button
          onClick={() => onDismiss(toast.id)}
          className="text-neutral-400 hover:text-white p-1 rounded-lg hover:bg-neutral-800/80 transition-colors shrink-0"
          aria-label="Tutup notifikasi"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Progress countdown bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-neutral-800/60 overflow-hidden">
        <div
          className={`h-full ${config.barColor} transition-all duration-75 ease-linear`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};

export const ToastContainer: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[99999] flex flex-col gap-2.5 pointer-events-none max-w-full sm:max-w-md w-full sm:w-auto px-4 sm:px-0">
      {toasts.map((toast) => (
        <ToastCardItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
};
