import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid,
} from 'recharts';
import {
  ArrowUpRight, TrendingUp, Clock, AlertTriangle, Users, Plus, ExternalLink,
} from 'lucide-react';
import api from '../api';
import { formatMoney, formatDate } from '../constants';
import { Button, Card, PageHeader, StatusChip, EmptyState, Skeleton } from '../components/ui';

function KPI({ eyebrow, value, secondary, icon: Icon, testid, accent = 'ink' }) {
  return (
    <Card className="flex flex-col gap-3 hover-lift" >
      <div className="flex items-center justify-between">
        <span className="label-eyebrow">{eyebrow}</span>
        <div className={`p-1.5 rounded-md ${accent === 'red' ? 'bg-red-50 text-red-700' : accent === 'green' ? 'bg-emerald-50 text-emerald-700' : accent === 'amber' ? 'bg-amber-50 text-amber-700' : 'bg-subtle text-ink'}`}>
          <Icon size={14} strokeWidth={2} />
        </div>
      </div>
      <div>
        <div className="font-mono text-3xl font-semibold text-ink tracking-tight" data-testid={testid}>
          {value}
        </div>
        {secondary && <div className="text-xs text-ink-soft mt-1">{secondary}</div>}
      </div>
    </Card>
  );
}

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [monthly, setMonthly] = useState(null);
  const [recent, setRecent] = useState([]);
  const [top, setTop] = useState([]);
  const [currency, setCurrency] = useState('USD');
  const [loading, setLoading] = useState(true);

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
      setTop(tc);
      setCurrency(st.default_currency || 'USD');
    }).finally(() => setLoading(false));
  }, []);

  const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

  return (
    <div>
      <PageHeader
        eyebrow="Vista general"
        title="Panel"
        description="Métricas y actividad reciente de tu facturación."
        actions={
          <Link to="/facturas/nueva">
            <Button data-testid="dashboard-new-invoice-btn">
              <Plus size={16} /> Nueva factura
            </Button>
          </Link>
        }
      />

      {/* KPIs */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6">
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
            />
            <KPI
              eyebrow="Cobrado"
              value={formatMoney(summary.total_paid, currency)}
              secondary={`${summary.count_paid} pagadas`}
              icon={ArrowUpRight}
              accent="green"
              testid="kpi-total-paid"
            />
            <KPI
              eyebrow="Pendiente"
              value={formatMoney(summary.total_pending, currency)}
              secondary={`${summary.count_pending} por cobrar`}
              icon={Clock}
              accent="amber"
              testid="kpi-total-pending"
            />
            <KPI
              eyebrow="Vencido"
              value={formatMoney(summary.total_overdue, currency)}
              secondary={`${summary.count_overdue} vencidas`}
              icon={AlertTriangle}
              accent="red"
              testid="kpi-total-overdue"
            />
          </>
        )}
      </section>

      {/* Grid principal */}
      <section className="grid grid-cols-1 xl:grid-cols-3 gap-4 md:gap-6 mt-6">
        {/* Gráfico */}
        <Card className="xl:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="label-eyebrow mb-1">Ingresos mensuales</div>
              <h2 className="font-display text-xl font-semibold">{monthly?.year || new Date().getFullYear()}</h2>
            </div>
            <span className="text-xs text-ink-muted">Moneda base: {currency}</span>
          </div>
          <div className="h-[280px]">
            {loading ? (
              <Skeleton className="w-full h-full" />
            ) : (
              <ResponsiveContainer>
                <BarChart data={monthly?.months || []} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="2 4" vertical={false} stroke="#E5E5E0" />
                  <XAxis
                    dataKey="month"
                    tickFormatter={(m) => monthNames[m - 1]}
                    tick={{ fontSize: 11, fill: '#737373' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#737373', fontFamily: 'JetBrains Mono' }}
                    axisLine={false}
                    tickLine={false}
                    width={50}
                  />
                  <Tooltip
                    formatter={(v) => formatMoney(v, currency)}
                    labelFormatter={(m) => monthNames[m - 1]}
                    cursor={{ fill: '#F4F4F2' }}
                    contentStyle={{ borderRadius: 8, border: '1px solid #E5E5E0', fontSize: 12 }}
                  />
                  <Bar dataKey="invoiced" fill="#0A0A0A" radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        {/* Top clientes */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="label-eyebrow mb-1">Mejores clientes</div>
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
                <li key={c.client_id} className="py-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="font-mono text-xs text-ink-muted w-4 text-right">{i + 1}</span>
                    <Link to={`/clientes/${c.client_id}`} className="font-medium text-sm truncate hover:underline">
                      {c.name}
                    </Link>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-sm">{formatMoney(c.total, currency)}</div>
                    <div className="text-[10px] text-ink-muted">{c.count} facturas</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>

      {/* Recientes */}
      <section className="mt-6">
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="label-eyebrow mb-1">Actividad</div>
              <h2 className="font-display text-xl font-semibold">Facturas recientes</h2>
            </div>
            <Link to="/facturas" className="text-sm text-ink-soft hover:text-ink flex items-center gap-1">
              Ver todas <ExternalLink size={13} />
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
                    <tr key={inv.id} className="border-b border-line hover:bg-subtle/50 transition-colors">
                      <td className="py-3 px-6 font-mono text-ink">
                        <Link to={`/facturas/${inv.id}`} className="hover:underline">{inv.number}</Link>
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
        </Card>
      </section>
    </div>
  );
}
