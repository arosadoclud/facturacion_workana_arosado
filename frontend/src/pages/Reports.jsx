import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, Line, LineChart, Legend } from 'recharts';
import { Download, TrendingUp } from 'lucide-react';
import api from '../api';
import { formatMoney } from '../constants';
import { Button, Card, PageHeader, Skeleton } from '../components/ui';

const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

export default function Reports() {
  const [monthly, setMonthly] = useState(null);
  const [top, setTop] = useState([]);
  const [summary, setSummary] = useState(null);
  const [currency, setCurrency] = useState('USD');
  const [year, setYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([api.monthly(year), api.topClients(10), api.summary(), api.getSettings()])
      .then(([m, t, s, st]) => {
        setMonthly(m); setTop(t); setSummary(s);
        setCurrency(st.default_currency || 'USD');
      })
      .finally(() => setLoading(false));
  }, [year]);

  return (
    <div>
      <PageHeader
        eyebrow="Analítica"
        title="Reportes"
        description="Métricas mensuales, top clientes y exportación de datos."
        actions={
          <a href={api.exportCsvUrl()} download>
            <Button variant="secondary" data-testid="reports-export-csv"><Download size={16} /> Exportar CSV</Button>
          </a>
        }
      />

      <div className="flex items-center gap-3 mb-6">
        <span className="text-sm text-ink-soft">Año:</span>
        <div className="flex gap-1">
          {[year - 1, year, year + 1].map((y) => (
            <button
              key={y}
              onClick={() => setYear(y)}
              className={
                'px-3 py-1.5 text-sm rounded-md font-mono ' +
                (y === year ? 'bg-ink text-white' : 'bg-white border border-line text-ink-soft hover:bg-subtle')
              }
              data-testid={`year-${y}`}
            >
              {y}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <Skeleton className="h-80" /><Skeleton className="h-80" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
            <Card>
              <div className="label-eyebrow mb-1">Facturado vs cobrado</div>
              <h3 className="font-display text-xl font-semibold mb-4">{year}</h3>
              <div className="h-[280px]">
                <ResponsiveContainer>
                  <BarChart data={monthly?.months || []} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="2 4" vertical={false} stroke="#E5E5E0" />
                    <XAxis dataKey="month" tickFormatter={(m) => monthNames[m - 1]} tick={{ fontSize: 11, fill: '#737373' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#737373', fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} width={50} />
                    <Tooltip formatter={(v) => formatMoney(v, currency)} labelFormatter={(m) => monthNames[m - 1]} cursor={{ fill: '#F4F4F2' }} contentStyle={{ borderRadius: 8, border: '1px solid #E5E5E0', fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar name="Facturado" dataKey="invoiced" fill="#0A0A0A" radius={[4, 4, 0, 0]} maxBarSize={26} />
                    <Bar name="Pagado" dataKey="paid" fill="#4F46E5" radius={[4, 4, 0, 0]} maxBarSize={26} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card>
              <div className="label-eyebrow mb-1">Tendencia de facturación</div>
              <h3 className="font-display text-xl font-semibold mb-4">Cantidad de facturas por mes</h3>
              <div className="h-[280px]">
                <ResponsiveContainer>
                  <LineChart data={monthly?.months || []} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="2 4" vertical={false} stroke="#E5E5E0" />
                    <XAxis dataKey="month" tickFormatter={(m) => monthNames[m - 1]} tick={{ fontSize: 11, fill: '#737373' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#737373', fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} width={40} allowDecimals={false} />
                    <Tooltip labelFormatter={(m) => monthNames[m - 1]} contentStyle={{ borderRadius: 8, border: '1px solid #E5E5E0', fontSize: 12 }} />
                    <Line type="monotone" dataKey="count" stroke="#0A0A0A" strokeWidth={2} dot={{ r: 3, fill: '#0A0A0A' }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <Card className="xl:col-span-2">
              <div className="label-eyebrow mb-1">Ranking</div>
              <h3 className="font-display text-xl font-semibold mb-4">Mejores clientes</h3>
              {top.length === 0 ? (
                <p className="text-sm text-ink-muted py-6">Aún no hay datos.</p>
              ) : (
                <div className="overflow-x-auto -mx-6">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs uppercase tracking-widest text-ink-soft border-b border-line">
                        <th className="py-3 px-6 font-semibold w-12">#</th>
                        <th className="py-3 px-6 font-semibold">Cliente</th>
                        <th className="py-3 px-6 font-semibold text-right">Facturas</th>
                        <th className="py-3 px-6 font-semibold text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {top.map((c, i) => (
                        <tr key={c.client_id} className="border-b border-line hover:bg-subtle/40">
                          <td className="py-3 px-6 font-mono text-ink-muted">{i + 1}</td>
                          <td className="py-3 px-6 font-medium">{c.name}</td>
                          <td className="py-3 px-6 text-right font-mono">{c.count}</td>
                          <td className="py-3 px-6 text-right font-mono font-semibold">{formatMoney(c.total, currency)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>

            <Card>
              <div className="label-eyebrow mb-1">Resumen global</div>
              <h3 className="font-display text-xl font-semibold mb-4">Estado actual</h3>
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between"><dt className="text-ink-soft">Total facturado</dt><dd className="font-mono font-semibold">{formatMoney(summary?.total_invoiced || 0, currency)}</dd></div>
                <div className="flex justify-between"><dt className="text-ink-soft">Total cobrado</dt><dd className="font-mono font-semibold text-emerald-700">{formatMoney(summary?.total_paid || 0, currency)}</dd></div>
                <div className="flex justify-between"><dt className="text-ink-soft">Pendiente</dt><dd className="font-mono font-semibold text-amber-700">{formatMoney(summary?.total_pending || 0, currency)}</dd></div>
                <div className="flex justify-between"><dt className="text-ink-soft">Vencido</dt><dd className="font-mono font-semibold text-red-700">{formatMoney(summary?.total_overdue || 0, currency)}</dd></div>
                <div className="flex justify-between pt-3 border-t border-line"><dt className="text-ink-soft">Total facturas</dt><dd className="font-mono">{summary?.invoices_count || 0}</dd></div>
                <div className="flex justify-between"><dt className="text-ink-soft">Total clientes</dt><dd className="font-mono">{summary?.clients_count || 0}</dd></div>
              </dl>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
