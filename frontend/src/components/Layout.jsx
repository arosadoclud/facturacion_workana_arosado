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
import api from '../api';
import { LogoMark, LogoHorizontal } from './Logo';

const NAV = [
  { to: '/', label: 'Panel', icon: LayoutDashboard, exact: true, testid: 'nav-dashboard' },
  { to: '/facturas', label: 'Facturas', icon: FileText, testid: 'nav-invoices', badgeKey: 'overdue' },
  { to: '/clientes', label: 'Clientes', icon: Users, testid: 'nav-clients' },
  { to: '/reportes', label: 'Reportes', icon: BarChart3, testid: 'nav-reports' },
  { to: '/configuracion', label: 'Configuración', icon: SettingsIcon, testid: 'nav-settings' },
];

export default function Layout({ children }) {
  const [open, setOpen] = useState(false);
  const [overdue, setOverdue] = useState(0);
  const location = useLocation();

  useEffect(() => { setOpen(false); }, [location.pathname]);

  // Poll suave del contador de vencidas
  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const s = await api.summary();
        if (alive) setOverdue(s.count_overdue || 0);
      } catch (_) { /* silencioso */ }
    }
    load();
    const int = setInterval(load, 30000);
    return () => { alive = false; clearInterval(int); };
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-app text-ink">
      {/* Mobile top bar */}
      <div className="md:hidden sticky top-0 z-40 flex items-center justify-between bg-navy text-white border-b border-navy-soft px-4 h-14">
        <LogoHorizontal mark={28} showTagline={false} />
        <button
          data-testid="menu-toggle"
          onClick={() => setOpen(!open)}
          className="p-2 rounded-md hover:bg-navy-soft"
          aria-label="Abrir menú"
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Sidebar navy */}
      <aside
        className={
          'fixed z-30 top-0 left-0 h-screen w-64 bg-navy text-slate-300 border-r border-navy-soft ' +
          'transform transition-transform duration-200 ' +
          (open ? 'translate-x-0' : '-translate-x-full') +
          ' md:translate-x-0 flex flex-col'
        }
      >
        {/* Franja cyan izquierda */}
        <div className="absolute top-0 left-0 bottom-0 w-[3px] bg-cyan" />

        <div className="hidden md:flex items-center gap-3 px-5 h-20 border-b border-navy-soft">
          <LogoMark size={40} radius={10} />
          <div className="min-w-0">
            <div className="font-display font-bold text-[15px] tracking-tight leading-none text-white">
              ANDY <span className="text-cyan">ROSADO</span>
            </div>
            <div className="text-[9px] uppercase tracking-[0.18em] text-cyan mt-1.5">
              Soluciones Digitales
            </div>
          </div>
        </div>

        <nav className="p-3 flex flex-col gap-1 mt-2 md:mt-0 flex-1">
          <div className="text-[10px] uppercase tracking-[0.14em] font-bold px-3 py-2 text-slate-500">Menú</div>
          {NAV.map((it) => {
            const badge = it.badgeKey === 'overdue' && overdue > 0 ? overdue : null;
            return (
              <NavLink
                key={it.to}
                to={it.to}
                end={it.exact}
                data-testid={it.testid}
                className={({ isActive }) =>
                  'group relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ' +
                  (isActive
                    ? 'bg-navy-soft text-cyan font-semibold shadow-inner'
                    : 'text-slate-400 hover:bg-navy-soft hover:text-white')
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-cyan rounded-r-full" />}
                    <it.icon size={16} strokeWidth={1.8} className={isActive ? 'text-cyan' : 'group-hover:text-cyan transition-colors'} />
                    <span className="flex-1">{it.label}</span>
                    {badge && (
                      <span
                        className="min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center animate-pulse"
                        data-testid="nav-overdue-badge"
                        title={`${badge} facturas vencidas`}
                      >
                        {badge}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="p-6 border-t border-navy-soft">
          <div className="text-[10px] uppercase tracking-[0.14em] font-bold text-cyan">Tip</div>
          <p className="text-xs text-slate-400 mt-1 leading-relaxed">
            Configura tus datos fiscales una vez y factura sin volver a escribirlos.
          </p>
        </div>
      </aside>

      {/* Overlay mobile */}
      {open && (
        <div
          className="md:hidden fixed inset-0 bg-black/40 z-20"
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
