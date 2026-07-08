import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid,
} from 'recharts';
import {
  ArrowUpRight, TrendingUp, Clock, AlertTriangle, Users, Plus, ExternalLink,
  Activity, Sparkles, ArrowRight, Zap,
} from 'lucide-react';
import api from '../api';
import { formatMoney, formatDate } from '../constants';
import { Button, PageHeader, StatusChip, EmptyState, Skeleton } from '../components/ui';
import { useToast } from '../components/Toast';

// KPI compacto — light card con línea cyan y hover interactivo
function KPI({ eyebrow, value, secondary, icon: Icon, testid, accent = 'ink', to }) {
  const accents = {
    ink: 'bg-navy text-cyan',
    red: 'bg-red-50 text-red-700',
    green: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
  };
  const border = {
    ink: 'hover:border-navy',
    red: 'hover:border-red-300',
    green: 'hover:border-emerald-300',
    amber: 'hover:border-amber-300',
  };
  const barColor = {
    ink: 'bg-cyan',
    red: 'bg-red-400',
    green: 'bg-emerald-400',
    amber: 'bg-amber-400',
  };
  const Wrap = to ? Link : 'div';
  const wrapProps = to ? { to } : {};
  return (
    <Wrap
      {...wrapProps}
      className={
        'group relative overflow-hidden bg-white border border-line rounded-card shadow-card p-6 ' +
        'flex flex-col gap-3 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lift ' +
        border[accent] +
        (to ? ' cursor-pointer' : '')
      }
      data-testid={testid + '-card'}
    >
      {/* barra superior de acento */}
      <div className={`absolute top-0 left-0 right-0 h-[2px] ${barColor[accent]} scale-x-0 group-hover:scale-x-100 origin-left transition-transform duration-500`} />
      <div className="flex items-center justify-between">
        <span className="label-eyebrow">{eyebrow}</span>
        <div className={`p-2 rounded-lg ${accents[accent]} transition-transform group-hover:scale-110`}>
          <Icon size={14} strokeWidth={2} />
        </div>
      </div>
      <div>
        <div className="font-mono text-3xl font-semibold text-ink tracking-tight" data-testid={testid}>
          {value}
        </div>
        {secondary && <div className="text-xs text-ink-soft mt-1 flex items-center gap-1">
          {secondary}
          {to && <ArrowRight size={11} className="opacity-0 group-hover:opacity-100 transition-all -translate-x-1 group-hover:translate-x-0" />}
        </div>}
      </div>
    </Wrap>
  );
}

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [monthly, setMonthly] = useState(null);
  const [recent, setRecent] = useState([]);
  const [top, setTop] = useState([]);
  const [overdue, setOverdue] = useState([]);
  const [currency, setCurrency] = useState('USD');
  const [businessName, setBusinessName] = useState('');
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    Promise.all([
      api.summary(),
      api.monthly(),
      api.listInvoices(),
      api.topClients(5),
      api.getSettings(),
    ]).then(([s, m, invs, tc, st]) => {
      setSummary(s);
      setMonthly(m);
      setRecent(invs.slice(0, 5));
      setOverdue(invs.filter((i) => i.status === 'vencida').slice(0, 3));
      setTop(tc);
      setCurrency(st.default_currency || 'USD');
      setBusinessName(st.business_name || '');
    }).finally(() => setLoading(false));
  }, []);

  // Alerta al cargar si hay vencidas
  useEffect(() => {
    if (!loading && summary?.count_overdue > 0) {
      toast.warn(
        `${summary.count_overdue} factura${summary.count_overdue > 1 ? 's vencidas' : ' vencida'}`,
        `Tienes ${formatMoney(summary.total_overdue, currency)} pendientes de cobro. Revísalas cuanto antes.`
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

  const bestMonth = useMemo(() => {
    if (!monthly?.months) return null;
    return [...monthly.months].sort((a, b) => b.invoiced - a.invoiced)[0];
  }, [monthly]);

  return (
    <div>
      {/* Hero: navy card con acentos cyan */}
      <div className="relative overflow-hidden rounded-2xl bg-navy text-white p-6 md:p-10 mb-8 shadow-lift">
        {/* Grid decorativo */}
        <div className="absolute inset-0 opacity-30 pointer-events-none"
             style={{
               backgroundImage:
                 'radial-gradient(circle at 20% 0%, rgba(34,211,238,0.25), transparent 40%), radial-gradient(circle at 80% 100%, rgba(79,70,229,0.18), transparent 45%)',
             }} />
        {/* Franja cyan inferior */}
        <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-cyan" />

        <div className="relative flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-cyan text-xs uppercase tracking-[0.2em] font-bold mb-3">
              <Sparkles size={13} /> Vista general
            </div>
            <h1 className="font-display text-3xl md:text-5xl font-bold tracking-tight">
              {businessName ? <>Hola, <span className="text-cyan">{businessName.split(' ')[0]}</span></> : 'Panel de control'}
            </h1>
            <p className="text-slate-300 text-sm md:text-base mt-3 max-w-lg">
              {loading
                ? 'Cargando actividad reciente...'
                : summary?.invoices_count
                ? <>Has emitido <span className="text-white font-semibold">{summary.invoices_count}</span> facturas por un total de <span className="text-cyan font-mono font-semibold">{formatMoney(summary.total_invoiced, currency)}</span>.</>
                : 'Comienza creando tu primera factura profesional en menos de un minuto.'}
            </p>
          </div>
          <Link to="/facturas/nueva">
            <button
              className="group relative inline-flex items-center gap-2 bg-cyan text-navy px-5 py-3 rounded-lg font-bold text-sm hover:bg-white transition-all shadow-lg hover:shadow-cyan/40 hover:scale-105"
              data-testid="dashboard-new-invoice-btn"
            >
              <Plus size={16} strokeWidth={2.5} />
              Nueva factura
              <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
            </button>
          </Link>
        </div>
      </div>

      {/* Alertas de vencidas */}
      {!loading && overdue.length > 0 && (
        <div className="mb-6 rounded-card border border-red-200 bg-gradient-to-r from-red-50 to-white p-5" data-testid="overdue-alert">
          <div className="flex items-start gap-4">
            <div className="p-2.5 rounded-lg bg-red-100 text-red-700 flex-shrink-0">
              <AlertTriangle size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-display font-semibold text-red-900">
                Tienes {summary.count_overdue} factura{summary.count_overdue > 1 ? 's' : ''} vencida{summary.count_overdue > 1 ? 's' : ''}
              </h3>
              <p className="text-sm text-red-700 mt-1">
                Total pendiente: <span className="font-mono font-semibold">{formatMoney(summary.total_overdue, currency)}</span>. Envía un recordatorio a tus clientes.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {overdue.map((inv) => (
                  <Link
                    key={inv.id}
                    to={`/facturas/${inv.id}`}
                    className="inline-flex items-center gap-2 bg-white border border-red-200 hover:border-red-400 hover:bg-red-50 rounded-md px-2.5 py-1.5 text-xs transition-all"
                    data-testid={`overdue-link-${inv.number}`}
                  >
                    <span className="font-mono font-semibold text-red-800">{inv.number}</span>
                    <span className="text-ink-soft truncate max-w-[140px]">{inv.client?.name}</span>
                    <span className="font-mono text-red-700">{formatMoney(inv.total, inv.currency)}</span>
                  </Link>
                ))}
              </div>
            </div>
            <Link to="/facturas?estado=vencida" className="hidden md:block">
              <button className="text-xs font-semibold text-red-700 hover:text-red-900 flex items-center gap-1">
                Ver todas <ArrowRight size={12} />
              </button>
            </Link>
          </div>
        </div>
      )}

      {/* KPIs */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-5">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[120px]" />)
        ) : (
          <>
            <KPI
              eyebrow="Total facturado"
              value={formatMoney(summary.total_invoiced, currency)}
              secondary={`${summary.invoices_count} facturas emitidas`}
              icon={TrendingUp}
              testid="kpi-total-invoiced"
              to="/facturas"
            />
            <KPI
              eyebrow="Cobrado"
              value={formatMoney(summary.total_paid, currency)}
              secondary={`${summary.count_paid} pagadas`}
              icon={ArrowUpRight}
              accent="green"
              testid="kpi-total-paid"
              to="/facturas?estado=pagada"
            />
            <KPI
              eyebrow="Pendiente"
              value={formatMoney(summary.total_pending, currency)}
              secondary={`${summary.count_pending} por cobrar`}
              icon={Clock}
              accent="amber"
              testid="kpi-total-pending"
              to="/facturas?estado=enviada"
            />
            <KPI
              eyebrow="Vencido"
              value={formatMoney(summary.total_overdue, currency)}
              secondary={`${summary.count_overdue} vencidas`}
              icon={AlertTriangle}
              accent="red"
              testid="kpi-total-overdue"
              to="/facturas?estado=vencida"
            />
          </>
        )}
      </section>

      {/* Grid principal */}
      <section className="grid grid-cols-1 xl:grid-cols-3 gap-4 md:gap-6 mt-6">
        {/* Gráfico — navy card con acentos cyan */}
        <div className="xl:col-span-2 relative overflow-hidden rounded-card bg-navy text-white p-6 shadow-lift group">
          {/* Franja cyan izq */}
          <div className="absolute top-0 left-0 bottom-0 w-1 bg-cyan" />
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="text-cyan text-xs uppercase tracking-[0.18em] font-bold mb-1 flex items-center gap-1.5">
                <Activity size={12} /> Ingresos mensuales
              </div>
              <h2 className="font-display text-2xl font-semibold">{monthly?.year || new Date().getFullYear()}</h2>
              {bestMonth && bestMonth.invoiced > 0 && (
                <div className="text-xs text-slate-400 mt-1">
                  Mejor mes: <span className="text-white font-mono">{monthNames[bestMonth.month - 1]}</span> · {formatMoney(bestMonth.invoiced, currency)}
                </div>
              )}
            </div>
            <span className="text-xs text-slate-400 font-mono">{currency}</span>
          </div>
          <div className="h-[280px]">
            {loading ? (
              <Skeleton className="w-full h-full" />
            ) : (
              <ResponsiveContainer>
                <BarChart data={monthly?.months || []} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="barCyan" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#22D3EE" stopOpacity={1} />
                      <stop offset="100%" stopColor="#0891B2" stopOpacity={0.6} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="2 4" vertical={false} stroke="#334155" />
                  <XAxis
                    dataKey="month"
                    tickFormatter={(m) => monthNames[m - 1]}
                    tick={{ fontSize: 11, fill: '#94A3B8' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#94A3B8', fontFamily: 'JetBrains Mono' }}
                    axisLine={false}
                    tickLine={false}
                    width={50}
                  />
                  <Tooltip
                    formatter={(v) => formatMoney(v, currency)}
                    labelFormatter={(m) => monthNames[m - 1]}
                    cursor={{ fill: 'rgba(34,211,238,0.08)' }}
                    contentStyle={{ borderRadius: 8, border: '1px solid #334155', background: '#0B1120', color: '#fff', fontSize: 12 }}
                    labelStyle={{ color: '#22D3EE' }}
                  />
                  <Bar dataKey="invoiced" fill="url(#barCyan)" radius={[6, 6, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Top clientes */}
        <div className="bg-white border border-line rounded-card shadow-card p-6 hover:shadow-lift transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="label-eyebrow mb-1 flex items-center gap-1.5"><Zap size={11} /> Mejores clientes</div>
              <h2 className="font-display text-xl font-semibold">Ranking</h2>
            </div>
            <Users size={16} className="text-ink-muted" />
          </div>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10" />)}
            </div>
          ) : top.length === 0 ? (
            <p className="text-sm text-ink-muted py-6">Aún no hay datos suficientes.</p>
          ) : (
            <ul className="divide-y divide-line" data-testid="top-clients-list">
              {top.map((c, i) => (
                <li key={c.client_id} className="py-3 flex items-center justify-between gap-3 group">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={
                      'font-mono text-xs w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 transition-colors ' +
                      (i === 0 ? 'bg-navy text-cyan font-bold' : 'bg-subtle text-ink-soft group-hover:bg-navy group-hover:text-cyan')
                    }>{i + 1}</span>
                    <Link to={`/clientes/${c.client_id}`} className="font-medium text-sm truncate hover:underline group-hover:text-navy transition-colors">
                      {c.name}
                    </Link>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-sm font-semibold">{formatMoney(c.total, currency)}</div>
                    <div className="text-[10px] text-ink-muted">{c.count} facturas</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Recientes */}
      <section className="mt-6">
        <div className="bg-white border border-line rounded-card shadow-card p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="label-eyebrow mb-1">Actividad</div>
              <h2 className="font-display text-xl font-semibold">Facturas recientes</h2>
            </div>
            <Link to="/facturas" className="text-sm text-ink-soft hover:text-navy flex items-center gap-1 group">
              Ver todas <ExternalLink size={13} className="group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>

          {loading ? (
            <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
          ) : recent.length === 0 ? (
            <EmptyState
              title="Todavía no hay facturas"
              description="Crea tu primera factura profesional en menos de un minuto."
              action={<Link to="/facturas/nueva"><Button><Plus size={16}/>Crear factura</Button></Link>}
            />
          ) : (
            <div className="overflow-x-auto -mx-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-widest text-ink-soft border-y border-line">
                    <th className="py-3 px-6 font-semibold">Número</th>
                    <th className="py-3 px-6 font-semibold">Cliente</th>
                    <th className="py-3 px-6 font-semibold">Emisión</th>
                    <th className="py-3 px-6 font-semibold">Estado</th>
                    <th className="py-3 px-6 font-semibold text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((inv) => (
                    <tr key={inv.id} className="border-b border-line group hover:bg-subtle/60 transition-colors cursor-pointer">
                      <td className="py-3 px-6 font-mono text-ink">
                        <Link to={`/facturas/${inv.id}`} className="hover:text-navy hover:underline">{inv.number}</Link>
                      </td>
                      <td className="py-3 px-6 truncate max-w-[220px]">{inv.client?.name || '—'}</td>
                      <td className="py-3 px-6 text-ink-soft">{formatDate(inv.issue_date)}</td>
                      <td className="py-3 px-6"><StatusChip status={inv.status} /></td>
                      <td className="py-3 px-6 text-right font-mono font-semibold">
                        {formatMoney(inv.total, inv.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
