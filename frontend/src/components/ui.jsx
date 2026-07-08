import React from 'react';
import { STATUS_STYLES } from '../constants';

export function Button({ variant = 'primary', className = '', children, ...props }) {
  const base = 'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed';
  const styles = {
    primary: 'bg-ink text-white hover:bg-brand-hover hover-lift',
    secondary: 'bg-white text-ink border border-line hover:bg-subtle',
    ghost: 'text-ink hover:bg-subtle',
    danger: 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100',
    outline: 'border border-ink text-ink hover:bg-ink hover:text-white',
  };
  return (
    <button className={`${base} ${styles[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}

export function Input({ className = '', ...props }) {
  return (
    <input
      className={
        'w-full bg-white border border-line rounded-md px-3 py-2 text-sm text-ink placeholder:text-ink-muted ' +
        'focus:outline-none focus:border-ink focus:ring-1 focus:ring-ink transition-all ' + className
      }
      {...props}
    />
  );
}

export function Textarea({ className = '', ...props }) {
  return (
    <textarea
      className={
        'w-full bg-white border border-line rounded-md px-3 py-2 text-sm text-ink placeholder:text-ink-muted ' +
        'focus:outline-none focus:border-ink focus:ring-1 focus:ring-ink transition-all min-h-[80px] resize-y ' + className
      }
      {...props}
    />
  );
}

export function Select({ className = '', children, ...props }) {
  return (
    <select
      className={
        'w-full bg-white border border-line rounded-md px-3 py-2 text-sm text-ink ' +
        'focus:outline-none focus:border-ink focus:ring-1 focus:ring-ink transition-all ' + className
      }
      {...props}
    >
      {children}
    </select>
  );
}

export function Field({ label, children, hint, error, className = '' }) {
  return (
    <label className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <span className="text-[11px] uppercase tracking-widest font-bold text-ink-soft">
          {label}
        </span>
      )}
      {children}
      {hint && !error && <span className="text-xs text-ink-muted">{hint}</span>}
      {error && <span className="text-xs text-red-600">{error}</span>}
    </label>
  );
}

export function Card({ className = '', children }) {
  return (
    <div className={`bg-white border border-line rounded-card shadow-card p-6 ${className}`}>
      {children}
    </div>
  );
}

export function StatusChip({ status, className = '' }) {
  const cls = STATUS_STYLES[status] || STATUS_STYLES.borrador;
  return (
    <span className={`chip border ${cls} ${className}`} data-testid={`status-${status}`}>
      <span className="chip-dot" />
      {status}
    </span>
  );
}

export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="text-center py-16 px-6 border border-dashed border-line rounded-card bg-white">
      {Icon && <Icon size={32} className="mx-auto text-ink-muted mb-3" strokeWidth={1.5} />}
      <h3 className="font-display font-semibold text-lg text-ink">{title}</h3>
      {description && <p className="text-sm text-ink-soft mt-1 max-w-md mx-auto">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function PageHeader({ eyebrow, title, description, actions }) {
  return (
    <header className="flex items-start justify-between gap-4 mb-8 md:mb-10">
      <div>
        {eyebrow && <div className="label-eyebrow mb-2">{eyebrow}</div>}
        <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight text-ink">
          {title}
        </h1>
        {description && (
          <p className="text-sm text-ink-soft mt-2 max-w-2xl">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
    </header>
  );
}

export function Skeleton({ className = '' }) {
  return <div className={`skeleton ${className}`} />;
}
