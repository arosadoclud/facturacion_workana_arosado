import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Search, FileText, Trash2, Download, Filter } from 'lucide-react';
import api from '../api';
import { formatMoney, formatDate, STATUSES } from '../constants';
import { Button, Card, PageHeader, StatusChip, EmptyState, Input, Select, Skeleton } from '../components/ui';
import { useToast } from '../components/Toast';

export default function InvoicesList() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const navigate = useNavigate();
  const toast = useToast();

  function load() {
    setLoading(true);
    api.listInvoices({ status: status || undefined, q: q || undefined })
      .then(setInvoices)
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [status]);

  async function handleDelete(id, number, e) {
    e.stopPropagation();
    e.preventDefault();
    if (!window.confirm('¿Eliminar esta factura? Esta acción no se puede deshacer.')) return;
    try {
      await api.deleteInvoice(id);
      toast.success('Factura eliminada', `${number} se eliminó correctamente`);
      load();
    } catch (err) {
      toast.error('No se pudo eliminar', err.message);
    }
  }

  const filtered = useMemo(() => {
    if (!q) return invoices;
    const t = q.toLowerCase();
    return invoices.filter(
      (i) =>
        i.number?.toLowerCase().includes(t) ||
        i.client?.name?.toLowerCase().includes(t) ||
        i.notes?.toLowerCase().includes(t)
    );
  }, [invoices, q]);

  return (
    <div>
      <PageHeader
        eyebrow="Facturación"
        title="Facturas"
        description="Gestiona tus facturas: crea, edita, cambia el estado y descarga en PDF."
        actions={
          <>
            <a href={api.exportCsvUrl()} download>
              <Button variant="secondary" data-testid="export-csv-btn">
                <Download size={16} /> Exportar CSV
              </Button>
            </a>
            <Link to="/facturas/nueva">
              <Button data-testid="new-invoice-btn">
                <Plus size={16} /> Nueva factura
              </Button>
            </Link>
          </>
        }
      />

      <Card className="mb-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
            <Input
              data-testid="invoices-search"
              placeholder="Buscar por número, cliente o notas..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-ink-muted" />
            <Select
              data-testid="invoices-status-filter"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="min-w-[160px]"
            >
              <option value="">Todos los estados</option>
              {STATUSES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </Select>
          </div>
        </div>
      </Card>

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14" />)}</div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={invoices.length === 0 ? 'No hay facturas todavía' : 'Sin resultados'}
          description={invoices.length === 0 ? 'Comienza creando tu primera factura profesional.' : 'Prueba con otros filtros o palabras clave.'}
          action={invoices.length === 0 && (
            <Link to="/facturas/nueva">
              <Button><Plus size={16} /> Crear factura</Button>
            </Link>
          )}
        />
      ) : (
        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="invoices-table">
              <thead>
                <tr className="text-left text-xs uppercase tracking-widest text-ink-soft border-b border-line bg-app/50">
                  <th className="py-3 px-5 font-semibold">Número</th>
                  <th className="py-3 px-5 font-semibold">Cliente</th>
                  <th className="py-3 px-5 font-semibold">Emisión</th>
                  <th className="py-3 px-5 font-semibold">Vencimiento</th>
                  <th className="py-3 px-5 font-semibold">Estado</th>
                  <th className="py-3 px-5 font-semibold text-right">Total</th>
                  <th className="py-3 px-5"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((inv) => (
                  <tr
                    key={inv.id}
                    className="border-b border-line hover:bg-subtle/50 transition-colors cursor-pointer"
                    onClick={() => navigate(`/facturas/${inv.id}`)}
                    data-testid={`invoice-row-${inv.number}`}
                  >
                    <td className="py-4 px-5 font-mono font-medium">{inv.number}</td>
                    <td className="py-4 px-5 truncate max-w-[240px]">{inv.client?.name || '—'}</td>
                    <td className="py-4 px-5 text-ink-soft">{formatDate(inv.issue_date)}</td>
                    <td className="py-4 px-5 text-ink-soft">{formatDate(inv.due_date)}</td>
                    <td className="py-4 px-5"><StatusChip status={inv.status} /></td>
                    <td className="py-4 px-5 text-right font-mono font-semibold">{formatMoney(inv.total, inv.currency)}</td>
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-1 justify-end" onClick={(e) => e.stopPropagation()}>
                        <a href={api.invoicePdfUrl(inv.id)} target="_blank" rel="noreferrer"
                           className="p-2 rounded-md hover:bg-subtle text-ink-soft hover:text-ink" title="Descargar PDF"
                           data-testid={`invoice-pdf-${inv.number}`}>
                          <Download size={15} />
                        </a>
                        <button
                          onClick={(e) => handleDelete(inv.id, inv.number, e)}
                          className="p-2 rounded-md hover:bg-red-50 text-ink-muted hover:text-red-600"
                          title="Eliminar"
                          data-testid={`invoice-delete-${inv.number}`}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
