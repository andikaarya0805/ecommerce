import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
  X,
  HelpCircle,
  AlertCircle,
  Sparkles,
} from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'primary' | 'success';
}

// Global emitter so any file, function, or non-React code can trigger toasts and confirm modals
class ToastEmitter {
  private toastListeners: Array<(toast: ToastItem) => void> = [];
  private confirmListener: ((options: ConfirmOptions) => Promise<boolean>) | null = null;

  subscribeToast(fn: (toast: ToastItem) => void) {
    this.toastListeners.push(fn);
    return () => {
      this.toastListeners = this.toastListeners.filter((l) => l !== fn);
    };
  }

  setConfirmHandler(fn: (options: ConfirmOptions) => Promise<boolean>) {
    this.confirmListener = fn;
    return () => {
      this.confirmListener = null;
    };
  }

  emit(toast: ToastItem) {
    this.toastListeners.forEach((fn) => fn(toast));
  }

  confirm(options: ConfirmOptions): Promise<boolean> {
    if (this.confirmListener) {
      return this.confirmListener(options);
    }
    // Fallback if provider is not yet mounted
    return Promise.resolve(window.confirm(`${options.title}\n\n${options.message}`));
  }
}

export const toastEmitter = new ToastEmitter();

export const toast = {
  success: (title: string, message?: string, duration = 4000) => {
    toastEmitter.emit({
      id: 't_' + Date.now() + Math.random().toString(36).substring(2, 6),
      type: 'success',
      title,
      message,
      duration,
    });
  },
  error: (title: string, message?: string, duration = 5000) => {
    toastEmitter.emit({
      id: 't_' + Date.now() + Math.random().toString(36).substring(2, 6),
      type: 'error',
      title,
      message,
      duration,
    });
  },
  warning: (title: string, message?: string, duration = 4500) => {
    toastEmitter.emit({
      id: 't_' + Date.now() + Math.random().toString(36).substring(2, 6),
      type: 'warning',
      title,
      message,
      duration,
    });
  },
  info: (title: string, message?: string, duration = 4000) => {
    toastEmitter.emit({
      id: 't_' + Date.now() + Math.random().toString(36).substring(2, 6),
      type: 'info',
      title,
      message,
      duration,
    });
  },
};

export const confirmModal = (options: ConfirmOptions): Promise<boolean> => {
  return toastEmitter.confirm(options);
};

interface ToastContextType {
  toast: typeof toast;
  confirmModal: typeof confirmModal;
}

const ToastContext = createContext<ToastContextType>({ toast, confirmModal });
export const useToast = () => useContext(ToastContext);

// Individual Toast Item with Timer Progress Bar
const ToastCard: React.FC<{
  item: ToastItem;
  onDismiss: (id: string) => void;
}> = ({ item, onDismiss }) => {
  const [progress, setProgress] = useState(100);
  const [isHovered, setIsHovered] = useState(false);
  const duration = item.duration || 4000;
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
        onDismiss(item.id);
      }
    }, 25);

    return () => {
      clearInterval(interval);
      remainingTimeRef.current = Math.max(0, remainingTimeRef.current - (Date.now() - startTimeRef.current));
    };
  }, [isHovered, duration, item.id, onDismiss]);

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
  }[item.type];

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
            {item.title}
          </h4>
          {item.message && (
            <p className="text-[11px] sm:text-xs text-neutral-300 mt-0.5 leading-relaxed break-words font-medium">
              {item.message}
            </p>
          )}
        </div>

        <button
          onClick={() => onDismiss(item.id)}
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

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    options: ConfirmOptions;
    resolve: ((val: boolean) => void) | null;
  }>({
    isOpen: false,
    options: { title: '', message: '' },
    resolve: null,
  });

  // Intercept window.alert with toast.info to prevent any native ugly alerts from showing
  useEffect(() => {
    const originalAlert = window.alert;
    window.alert = (msg?: any) => {
      toast.info('Pemberitahuan Sistem', String(msg || ''));
    };
    return () => {
      window.alert = originalAlert;
    };
  }, []);

  // Subscribe toast emitter
  useEffect(() => {
    const unsub = toastEmitter.subscribeToast((item) => {
      setToasts((prev) => [...prev, item]);
    });
    return unsub;
  }, []);

  // Register confirm modal handler
  useEffect(() => {
    const unsub = toastEmitter.setConfirmHandler((options) => {
      return new Promise<boolean>((resolve) => {
        setConfirmState({
          isOpen: true,
          options,
          resolve,
        });
      });
    });
    return unsub;
  }, []);

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const handleConfirmAction = (result: boolean) => {
    if (confirmState.resolve) {
      confirmState.resolve(result);
    }
    setConfirmState({
      isOpen: false,
      options: { title: '', message: '' },
      resolve: null,
    });
  };

  // Keyboard handler for confirm modal (Escape to cancel, Enter to confirm)
  useEffect(() => {
    if (!confirmState.isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleConfirmAction(false);
      } else if (e.key === 'Enter') {
        handleConfirmAction(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [confirmState.isOpen]);

  const confirmVariant = confirmState.options.variant || 'danger';

  return (
    <ToastContext.Provider value={{ toast, confirmModal }}>
      {children}

      {/* Floating Toast Notification Container */}
      <div className="fixed top-4 right-4 z-[99999] flex flex-col gap-2.5 pointer-events-none max-w-full sm:max-w-md w-full sm:w-auto px-4 sm:px-0">
        {toasts.map((item) => (
          <ToastCard key={item.id} item={item} onDismiss={dismissToast} />
        ))}
      </div>

      {/* Modern High-End Confirmation Modal */}
      {confirmState.isOpen && (
        <div className="fixed inset-0 z-[100000] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div
            className="relative w-full max-w-md rounded-2xl bg-neutral-900 border border-neutral-700/80 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] p-6 text-white overflow-hidden animate-in zoom-in-95 duration-150"
            role="dialog"
            aria-modal="true"
          >
            {/* Top decorative glow accent */}
            <div
              className={`absolute top-0 left-0 right-0 h-1 ${
                confirmVariant === 'danger'
                  ? 'bg-gradient-to-r from-red-600 via-[#E50914] to-red-600'
                  : confirmVariant === 'warning'
                  ? 'bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500'
                  : 'bg-gradient-to-r from-emerald-500 via-emerald-400 to-emerald-500'
              }`}
            />

            <div className="flex items-start gap-4">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                  confirmVariant === 'danger'
                    ? 'bg-red-500/15 text-[#E50914] border border-red-500/30 ring-8 ring-red-500/5'
                    : confirmVariant === 'warning'
                    ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30 ring-8 ring-amber-500/5'
                    : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 ring-8 ring-emerald-500/5'
                }`}
              >
                {confirmVariant === 'danger' ? (
                  <AlertCircle className="w-6 h-6" />
                ) : confirmVariant === 'warning' ? (
                  <AlertTriangle className="w-6 h-6" />
                ) : (
                  <HelpCircle className="w-6 h-6" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="text-base sm:text-lg font-black tracking-tight text-white leading-tight">
                  {confirmState.options.title || 'Konfirmasi Tindakan'}
                </h3>
                <p className="text-xs sm:text-sm text-neutral-300 mt-2 leading-relaxed">
                  {confirmState.options.message}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-neutral-800">
              <button
                type="button"
                onClick={() => handleConfirmAction(false)}
                className="px-4 py-2.5 rounded-xl border border-neutral-700 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white font-semibold text-xs sm:text-sm transition-all focus:outline-none focus:ring-2 focus:ring-neutral-600"
              >
                {confirmState.options.cancelText || 'Batal'}
              </button>

              <button
                type="button"
                onClick={() => handleConfirmAction(true)}
                className={`px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-white shadow-lg transition-all focus:outline-none focus:ring-2 ${
                  confirmVariant === 'danger'
                    ? 'bg-gradient-to-r from-red-600 to-[#E50914] hover:from-red-500 hover:to-red-600 shadow-red-950/50 focus:ring-red-500'
                    : confirmVariant === 'warning'
                    ? 'bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 shadow-amber-950/50 focus:ring-amber-500'
                    : 'bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 shadow-emerald-950/50 focus:ring-emerald-500'
                }`}
              >
                {confirmState.options.confirmText || 'Konfirmasi'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
};
