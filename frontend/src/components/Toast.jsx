import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { CheckCircle2, AlertCircle, Info, X, AlertTriangle } from 'lucide-react';

const ToastContext = createContext(null);

let ID = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const remove = useCallback((id) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const push = useCallback((toast) => {
    const id = ++ID;
    const item = {
      id,
      variant: toast.variant || 'success',
      title: toast.title,
      description: toast.description,
      duration: toast.duration ?? 3800,
    };
    setToasts((t) => [...t, item]);
    if (item.duration > 0) {
      setTimeout(() => remove(id), item.duration);
    }
    return id;
  }, [remove]);

  const api = {
    success: (title, description) => push({ variant: 'success', title, description }),
    error: (title, description) => push({ variant: 'error', title, description, duration: 5000 }),
    info: (title, description) => push({ variant: 'info', title, description }),
    warn: (title, description) => push({ variant: 'warn', title, description }),
    push, remove,
  };

  return (
    <ToastContext.Provider value={api}>
      {children}
      <ToastViewport toasts={toasts} onRemove={remove} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast debe usarse dentro de ToastProvider');
  return ctx;
}

const VARIANT = {
  success: { icon: CheckCircle2, ring: 'ring-emerald-400/40', accent: 'bg-emerald-400', iconClass: 'text-emerald-400' },
  error:   { icon: AlertCircle, ring: 'ring-red-400/40',     accent: 'bg-red-400',     iconClass: 'text-red-400' },
  warn:    { icon: AlertTriangle, ring: 'ring-amber-400/40', accent: 'bg-amber-400',   iconClass: 'text-amber-400' },
  info:    { icon: Info,        ring: 'ring-cyan/40',         accent: 'bg-cyan',        iconClass: 'text-cyan' },
};

function ToastViewport({ toasts, onRemove }) {
  return (
    <div className="fixed top-4 right-4 z-[1000] flex flex-col gap-2 pointer-events-none" data-testid="toast-viewport">
      {toasts.map((t) => <ToastCard key={t.id} toast={t} onClose={() => onRemove(t.id)} />)}
    </div>
  );
}

function ToastCard({ toast, onClose }) {
  const v = VARIANT[toast.variant] || VARIANT.info;
  const Icon = v.icon;
  const [entered, setEntered] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(id);
  }, []);
  return (
    <div
      className={
        'pointer-events-auto min-w-[280px] max-w-sm bg-navy text-white border border-navy-soft rounded-xl shadow-pop ring-1 ' +
        v.ring +
        ' transition-all duration-300 ' +
        (entered ? 'translate-x-0 opacity-100' : 'translate-x-6 opacity-0')
      }
      data-testid={`toast-${toast.variant}`}
      role="status"
    >
      <div className="flex items-start gap-3 p-3.5 relative overflow-hidden">
        <div className={`absolute top-0 left-0 w-1 h-full ${v.accent}`} />
        <Icon size={18} className={`${v.iconClass} flex-shrink-0 mt-0.5`} />
        <div className="flex-1 min-w-0">
          {toast.title && <div className="font-semibold text-sm leading-tight">{toast.title}</div>}
          {toast.description && <div className="text-xs text-slate-300 mt-0.5 leading-relaxed">{toast.description}</div>}
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white transition-colors"
          aria-label="Cerrar"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
