'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { cn } from './utils';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastContextValue {
  toasts: Toast[];
  showToast: (toast: Omit<Toast, 'id'>) => void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
  warning: (message: string, title?: string) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const showToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substring(7);
    const duration = toast.duration ?? 5000;

    setToasts(prev => [...prev, { ...toast, id }]);

    if (duration > 0) {
      setTimeout(() => {
        dismiss(id);
      }, duration);
    }
  }, [dismiss]);

  const success = useCallback((message: string, title?: string) => {
    showToast({ type: 'success', message, title });
  }, [showToast]);

  const error = useCallback((message: string, title?: string) => {
    showToast({ type: 'error', message, title });
  }, [showToast]);

  const info = useCallback((message: string, title?: string) => {
    showToast({ type: 'info', message, title });
  }, [showToast]);

  const warning = useCallback((message: string, title?: string) => {
    showToast({ type: 'warning', message, title });
  }, [showToast]);

  return (
    <ToastContext.Provider
      value={{ toasts, showToast, success, error, info, warning, dismiss }}
    >
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}

interface ToastContainerProps {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}

function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  return (
    <div
      className="fixed top-0 right-0 z-50 flex flex-col gap-2 p-4 sm:top-4 sm:right-4 max-w-md w-full pointer-events-none"
      role="region"
      aria-live="polite"
      aria-label="通知訊息"
    >
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

interface ToastItemProps {
  toast: Toast;
  onDismiss: (id: string) => void;
}

function ToastItem({ toast, onDismiss }: ToastItemProps) {
  const icons = {
    success: CheckCircle,
    error: AlertCircle,
    info: Info,
    warning: AlertTriangle,
  };

  const Icon = icons[toast.type];

  const styles = {
    success: 'bg-green-50 border-green-200 text-green-800',
    error: 'bg-red-50 border-red-200 text-red-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
  };

  const iconStyles = {
    success: 'text-green-600',
    error: 'text-red-600',
    info: 'text-blue-600',
    warning: 'text-yellow-600',
  };

  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-lg border p-4 shadow-lg pointer-events-auto animate-slide-in-right',
        styles[toast.type]
      )}
      role="alert"
      aria-atomic="true"
    >
      <Icon className={cn('h-5 w-5 flex-shrink-0 mt-0.5', iconStyles[toast.type])} aria-hidden="true" />
      
      <div className="flex-1 min-w-0">
        {toast.title && (
          <p className="text-sm font-semibold mb-1">{toast.title}</p>
        )}
        <p className="text-sm">{toast.message}</p>
        
        {toast.action && (
          <button
            onClick={() => {
              toast.action?.onClick();
              onDismiss(toast.id);
            }}
            className="mt-2 text-sm font-medium underline hover:no-underline focus:outline-none focus:ring-2 focus:ring-offset-2 rounded"
            aria-label={toast.action.label}
          >
            {toast.action.label}
          </button>
        )}
      </div>

      <button
        onClick={() => onDismiss(toast.id)}
        className="flex-shrink-0 rounded-md hover:bg-black/5 p-1 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2"
        aria-label="關閉通知"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}

// 添加動畫 CSS（需要在 global.css 或 tailwind.config.js 中配置）
export const toastAnimations = `
@keyframes slide-in-right {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.animate-slide-in-right {
  animation: slide-in-right 0.3s ease-out;
}
`;
