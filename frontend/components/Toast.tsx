'use client';

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { X, CheckCircle2, AlertCircle, AlertTriangle, Info } from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────────

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  exiting?: boolean;
}

interface ToastContextValue {
  toast: {
    success: (message: string) => void;
    error: (message: string) => void;
    warning: (message: string) => void;
    info: (message: string) => void;
  };
}

const ToastContext = createContext<ToastContextValue | null>(null);

// ── Icons & Colors ─────────────────────────────────────────────────────────────

const TOAST_CONFIG: Record<ToastType, { icon: typeof CheckCircle2; className: string }> = {
  success: { icon: CheckCircle2, className: 'toast-success' },
  error: { icon: AlertCircle, className: 'toast-error' },
  warning: { icon: AlertTriangle, className: 'toast-warning' },
  info: { icon: Info, className: 'toast-info' },
};

// ── Single Toast Component ─────────────────────────────────────────────────────

function ToastNotification({
  item,
  onDismiss,
}: {
  item: ToastItem;
  onDismiss: (id: string) => void;
}) {
  const { icon: Icon, className } = TOAST_CONFIG[item.type];
  const progressRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (progressRef.current) {
      // Trigger reflow then start animation
      progressRef.current.offsetHeight;
      progressRef.current.style.transform = 'scaleX(0)';
    }
  }, []);

  return (
    <div
      className={`toast-item ${className} ${item.exiting ? 'toast-exit' : 'toast-enter'}`}
      role="alert"
    >
      <div className="toast-icon">
        <Icon size={16} strokeWidth={2.5} />
      </div>
      <p className="toast-message">{item.message}</p>
      <button
        className="toast-close"
        onClick={() => onDismiss(item.id)}
        aria-label="Dismiss"
      >
        <X size={14} />
      </button>
      <div className="toast-progress">
        <div
          ref={progressRef}
          className={`toast-progress-bar ${className}`}
          style={{ transition: 'transform 4s linear', transform: 'scaleX(1)', transformOrigin: 'left' }}
        />
      </div>
    </div>
  );
}

// ── Provider ───────────────────────────────────────────────────────────────────

let toastCounter = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, exiting: true } : t))
    );
    // Remove after exit animation
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 280);
  }, []);

  const addToast = useCallback(
    (type: ToastType, message: string) => {
      const id = `toast-${++toastCounter}-${Date.now()}`;
      setToasts((prev) => [...prev, { id, type, message }]);
      // Auto dismiss after 4s
      setTimeout(() => dismiss(id), 4000);
    },
    [dismiss]
  );

  const toast = React.useMemo(
    () => ({
      success: (msg: string) => addToast('success', msg),
      error: (msg: string) => addToast('error', msg),
      warning: (msg: string) => addToast('warning', msg),
      info: (msg: string) => addToast('info', msg),
    }),
    [addToast]
  );

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {/* Toast Container */}
      <div className="toast-container" aria-live="polite">
        {toasts.map((t) => (
          <ToastNotification key={t.id} item={t} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// ── Hook ───────────────────────────────────────────────────────────────────────

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
