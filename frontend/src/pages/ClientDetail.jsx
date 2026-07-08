import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, FileText, Plus } from 'lucide-react';
import api from '../api';
import { formatMoney, formatDate } from '../constants';
import { Button, Card, PageHeader, StatusChip, EmptyState } from '../components/ui';

export default function ClientDetail() {
  const { id } = useParams();
  const [client, setClient] = useState(null);

  useEffect(() => { api.getClient(id).then(setClient); }, [id]);

  if (!client) return <div className="skeleton h-64" />;

  const invoices = client.invoices || [];
  const totalInvoiced = invoices
    .filter((i) => i.status !== 'anulada' && i.status !== 'borrador')
    .reduce((s, i) => s + (i.total || 0), 0);
  const totalPaid = invoices
    .filter((i) => i.status === 'pagada')
    .reduce((s, i) => s + (i.total || 0), 0);

  return (
    <div>
      <PageHeader
        eyebrow="Cliente"
        title={client.name}
        description={client.email || 'Detalle e historial de facturas'}
        actions={
          <>
            <Link to="/clientes">
              <Button variant="secondary"><ArrowLeft size={16} /> Volver</Button>
            </Link>
            <Link to="/facturas/nueva">
              <Button><Plus size={16} /> Nueva factura</Button>
            </Link>
          </>
        }
      />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card className="xl:col-span-1">
          <div className="label-eyebrow mb-3">Datos del cliente</div>
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-xs text-ink-muted uppercase tracking-widest">Nombre</dt>
              <dd className="font-semibold mt-0.5">{client.name}</dd>
            </div>
            {client.tax_id && (
              <div>
                <dt className="text-xs text-ink-muted uppercase tracking-widest">{client.tax_id_label || 'ID Fiscal'}</dt>
                <dd className="font-mono mt-0.5">{client.tax_id}</dd>
              </div>
            )}
            {client.email && (
              <div>
                <dt className="text-xs text-ink-muted uppercase tracking-widest">Email</dt>
                <dd className="mt-0.5">{client.email}</dd>
              </div>
            )}
            {client.phone && (
              <div>
                <dt className="text-xs text-ink-muted uppercase tracking-widest">Teléfono</dt>
                <dd className="mt-0.5 font-mono">{client.phone}</dd>
              </div>
            )}
            {(client.address || client.city || client.country) && (
              <div>
                <dt className="text-xs text-ink-muted uppercase tracking-widest">Ubicación</dt>
                <dd className="mt-0.5">{[client.address, client.city, client.country].filter(Boolean).join(', ')}</dd>
              </div>
            )}
            {client.notes && (
              <div>
                <dt className="text-xs text-ink-muted uppercase tracking-widest">Notas</dt>
                <dd className="mt-0.5 text-ink-soft whitespace-pre-line">{client.notes}</dd>
              </div>
            )}
          </dl>

          <div className="mt-6 pt-6 border-t border-line grid grid-cols-2 gap-4 text-center">
            <div>
              <div className="label-eyebrow">Facturado</div>
              <div className="font-mono text-lg font-bold mt-1">{formatMoney(totalInvoiced, invoices[0]?.currency || 'USD')}</div>
            </div>
            <div>
              <div className="label-eyebrow">Cobrado</div>
              <div className="font-mono text-lg font-bold mt-1 text-emerald-700">{formatMoney(totalPaid, invoices[0]?.currency || 'USD')}</div>
            </div>
          </div>
        </Card>

        <Card className="xl:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold text-lg">Historial de facturas</h3>
            <span className="text-xs text-ink-muted">{invoices.length} totales</span>
          </div>

          {invoices.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="Sin facturas aún"
              description="Emítele la primera factura a este cliente."
              action={<Link to="/facturas/nueva"><Button><Plus size={16} />Crear factura</Button></Link>}
            />
          ) : (
            <div className="overflow-x-auto -mx-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-widest text-ink-soft border-y border-line">
                    <th className="py-3 px-6 font-semibold">Número</th>
                    <th className="py-3 px-6 font-semibold">Emisión</th>
                    <th className="py-3 px-6 font-semibold">Estado</th>
                    <th className="py-3 px-6 font-semibold text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="border-b border-line hover:bg-subtle/50">
                      <td className="py-3 px-6 font-mono">
                        <Link to={`/facturas/${inv.id}`} className="hover:underline font-medium">{inv.number}</Link>
                      </td>
                      <td className="py-3 px-6 text-ink-soft">{formatDate(inv.issue_date)}</td>
                      <td className="py-3 px-6"><StatusChip status={inv.status} /></td>
                      <td className="py-3 px-6 text-right font-mono font-semibold">{formatMoney(inv.total, inv.currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
