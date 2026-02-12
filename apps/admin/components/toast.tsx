'use client';

import { createContext, useCallback, useContext, useState } from 'react';
import { cn } from '@/lib/utils';
import { CheckCircle2, XCircle, AlertTriangle, X, Info } from 'lucide-react';

// ── Types ───────────────────────────────────────────────

type ToastVariant = 'success' | 'error' | 'warning' | 'info';

interface ToastItem {
  id: number;
  message: string;
  variant: ToastVariant;
}

interface ToastContextType {
  success: (message: string) => void;
  error: (message: string) => void;
  warning: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextType>({
  success: () => {},
  error: () => {},
  warning: () => {},
  info: () => {},
});

export function useToast() {
  return useContext(ToastContext);
}

// ── Provider ────────────────────────────────────────────

let nextId = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = useCallback((message: string, variant: ToastVariant) => {
    const id = ++nextId;
    setToasts((prev) => [...prev, { id, message, variant }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const ctx: ToastContextType = {
    success: (msg) => addToast(msg, 'success'),
    error: (msg) => addToast(msg, 'error'),
    warning: (msg) => addToast(msg, 'warning'),
    info: (msg) => addToast(msg, 'info'),
  };

  return (
    <ToastContext.Provider value={ctx}>
      {children}
      {/* Toast container */}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
        {toasts.map((toast) => (
          <ToastMessage key={toast.id} toast={toast} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// ── Single Toast ────────────────────────────────────────

const variantConfig: Record<ToastVariant, { icon: typeof CheckCircle2; bg: string; border: string; text: string }> = {
  success: { icon: CheckCircle2, bg: 'bg-green-50 dark:bg-green-950', border: 'border-green-200 dark:border-green-800', text: 'text-green-800 dark:text-green-200' },
  error:   { icon: XCircle,      bg: 'bg-red-50 dark:bg-red-950',     border: 'border-red-200 dark:border-red-800',     text: 'text-red-800 dark:text-red-200' },
  warning: { icon: AlertTriangle, bg: 'bg-yellow-50 dark:bg-yellow-950', border: 'border-yellow-200 dark:border-yellow-800', text: 'text-yellow-800 dark:text-yellow-200' },
  info:    { icon: Info,          bg: 'bg-blue-50 dark:bg-blue-950',    border: 'border-blue-200 dark:border-blue-800',    text: 'text-blue-800 dark:text-blue-200' },
};

function ToastMessage({ toast, onDismiss }: { toast: ToastItem; onDismiss: (id: number) => void }) {
  const config = variantConfig[toast.variant];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-lg border px-4 py-3 shadow-lg',
        'animate-in slide-in-from-right-full fade-in-0 duration-300',
        'min-w-[320px] max-w-[420px]',
        config.bg,
        config.border,
      )}
    >
      <Icon className={cn('h-5 w-5 shrink-0', config.text)} />
      <p className={cn('flex-1 text-sm font-medium', config.text)}>{toast.message}</p>
      <button
        onClick={() => onDismiss(toast.id)}
        className={cn('shrink-0 rounded p-0.5 hover:bg-black/5', config.text)}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
