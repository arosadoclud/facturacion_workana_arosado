import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  Users,
  BarChart3,
  Settings as SettingsIcon,
  Menu,
  X,
} from 'lucide-react';
import { useState, useEffect } from 'react';

const NAV = [
  { to: '/', label: 'Panel', icon: LayoutDashboard, exact: true, testid: 'nav-dashboard' },
  { to: '/facturas', label: 'Facturas', icon: FileText, testid: 'nav-invoices' },
  { to: '/clientes', label: 'Clientes', icon: Users, testid: 'nav-clients' },
  { to: '/reportes', label: 'Reportes', icon: BarChart3, testid: 'nav-reports' },
  { to: '/configuracion', label: 'Configuración', icon: SettingsIcon, testid: 'nav-settings' },
];

export default function Layout({ children }) {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  useEffect(() => { setOpen(false); }, [location.pathname]);

  return (
    <div className="min-h-screen bg-app text-ink">
      {/* Mobile top bar */}
      <div className="md:hidden sticky top-0 z-40 flex items-center justify-between bg-white border-b border-line px-4 h-14">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-ink flex items-center justify-center">
            <span className="text-white font-display font-bold text-sm">F</span>
          </div>
          <span className="font-display font-bold tracking-tight">Facturación PRO</span>
        </div>
        <button
          data-testid="menu-toggle"
          onClick={() => setOpen(!open)}
          className="p-2 rounded-md hover:bg-subtle"
          aria-label="Abrir menú"
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Sidebar */}
      <aside
        className={
          'fixed z-30 top-0 left-0 h-screen w-64 bg-app border-r border-line ' +
          'transform transition-transform duration-200 ' +
          (open ? 'translate-x-0' : '-translate-x-full') +
          ' md:translate-x-0'
        }
      >
        <div className="hidden md:flex items-center gap-3 px-6 h-16 border-b border-line">
          <div className="w-9 h-9 rounded-md bg-ink flex items-center justify-center">
            <span className="text-white font-display font-bold text-lg">F</span>
          </div>
          <div>
            <div className="font-display font-bold text-lg tracking-tight leading-none">Facturación</div>
            <div className="text-[10px] uppercase tracking-[0.16em] text-ink-muted">PRO / v1.0</div>
          </div>
        </div>

        <nav className="p-3 flex flex-col gap-1 mt-2 md:mt-0">
          <div className="label-eyebrow px-3 py-2">Menú</div>
          {NAV.map((it) => (
            <NavLink
              key={it.to}
              to={it.to}
              end={it.exact}
              data-testid={it.testid}
              className={({ isActive }) =>
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ' +
                (isActive
                  ? 'bg-white text-ink font-semibold shadow-sm ring-1 ring-line'
                  : 'text-ink-soft hover:bg-subtle hover:text-ink')
              }
            >
              <it.icon size={16} strokeWidth={1.8} />
              <span>{it.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="absolute bottom-4 left-0 right-0 px-6">
          <div className="border-t border-line pt-4">
            <div className="label-eyebrow">Tip</div>
            <p className="text-xs text-ink-soft mt-1 leading-relaxed">
              Configura tus datos fiscales una sola vez en{' '}
              <span className="font-semibold">Configuración</span> y factura sin volver a escribirlos.
            </p>
          </div>
        </div>
      </aside>

      {/* Overlay mobile */}
      {open && (
        <div
          className="md:hidden fixed inset-0 bg-black/30 z-20"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Main */}
      <main className="md:pl-64 min-h-screen">
        <div className="max-w-7xl mx-auto px-4 md:px-10 py-6 md:py-10 animate-in-page">
          {children}
        </div>
      </main>
    </div>
  );
}
