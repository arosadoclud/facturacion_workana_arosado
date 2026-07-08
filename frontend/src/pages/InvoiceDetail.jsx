import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Download, Edit, Trash2, CheckCircle2, XCircle, Send, FileText } from 'lucide-react';
import api from '../api';
import { formatMoney, formatDate, STATUSES } from '../constants';
import { Button, Card, PageHeader, StatusChip, Select } from '../components/ui';
import { useToast } from '../components/Toast';

export default function InvoiceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [settings, setSettings] = useState(null);
  const toast = useToast();

  useEffect(() => {
    Promise.all([api.getInvoice(id), api.getSettings()]).then(([i, s]) => {
      setInvoice(i); setSettings(s);
    });
  }, [id]);

  async function changeStatus(newStatus) {
    try {
      const updated = await api.changeStatus(id, newStatus);
      setInvoice(updated);
      toast.success(`Factura marcada como ${newStatus}`, `${updated.number} · ${formatMoney(updated.total, updated.currency)}`);
    } catch (e) {
      toast.error('No se pudo cambiar el estado', e.message);
    }
  }

  async function handleDelete() {
    if (!window.confirm('¿Eliminar esta factura?')) return;
    try {
      await api.deleteInvoice(id);
      toast.success('Factura eliminada', `${invoice.number} se eliminó correctamente`);
      navigate('/facturas');
    } catch (e) {
      toast.error('No se pudo eliminar', e.message);
    }
  }

  if (!invoice || !settings) return <div className="skeleton h-64" />;

  const client = invoice.client || {};

  return (
    <div>
      <PageHeader
        eyebrow="Factura"
        title={invoice.number}
        description={<span>Emitida el {formatDate(invoice.issue_date)}{invoice.due_date ? ` · vence ${formatDate(invoice.due_date)}` : ''}</span>}
        actions={
          <>
            <Link to="/facturas">
              <Button variant="secondary"><ArrowLeft size={16} /> Volver</Button>
            </Link>
            <Link to={`/facturas/${id}/editar`}>
              <Button variant="secondary" data-testid="invoice-edit-btn"><Edit size={16} /> Editar</Button>
            </Link>
            <a href={api.invoicePdfUrl(id)} target="_blank" rel="noreferrer">
              <Button data-testid="invoice-download-pdf"><Download size={16} /> Descargar PDF</Button>
            </a>
          </>
        }
      />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Documento */}
        <Card className="xl:col-span-2">
          {/* Header emisor / número */}
          <div className="flex items-start justify-between pb-6 border-b border-line">
            <div>
              {settings.logo ? (
                <img src={settings.logo} alt="logo" className="h-12 w-auto mb-3" />
              ) : (
                <div className="w-12 h-12 rounded-md bg-ink text-white flex items-center justify-center font-display font-bold text-lg mb-3">
                  {(settings.business_name || 'F').charAt(0).toUpperCase()}
                </div>
              )}
              <div className="font-display font-bold text-lg">{settings.business_name || 'Tu negocio'}</div>
              <div className="text-xs text-ink-soft mt-1 space-y-0.5">
                {settings.tax_id && <div>{settings.tax_id_label}: {settings.tax_id}</div>}
                {(settings.address || settings.city || settings.country) && (
                  <div>{[settings.address, settings.city, settings.country].filter(Boolean).join(', ')}</div>
                )}
                {settings.phone && <div>Tel: {settings.phone}</div>}
                {settings.email && <div>{settings.email}</div>}
              </div>
            </div>
            <div className="text-right">
              <div className="font-display text-3xl font-bold tracking-tight">FACTURA</div>
              <div className="font-mono text-sm mt-1">{invoice.number}</div>
              <div className="mt-3"><StatusChip status={invoice.status} /></div>
            </div>
          </div>

          {/* Bloques cliente / fechas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-6 border-b border-line">
            <div>
              <div className="label-eyebrow mb-2">Facturar a</div>
              <div className="font-semibold">{client.name || '—'}</div>
              <div className="text-xs text-ink-soft mt-1 space-y-0.5">
                {client.tax_id && <div>{client.tax_id_label || 'ID Fiscal'}: {client.tax_id}</div>}
                {(client.address || client.city || client.country) && (
                  <div>{[client.address, client.city, client.country].filter(Boolean).join(', ')}</div>
                )}
                {client.phone && <div>Tel: {client.phone}</div>}
                {client.email && <div>{client.email}</div>}
              </div>
            </div>
            <div className="md:text-right space-y-2">
              <div>
                <div className="label-eyebrow">Emisión</div>
                <div className="font-mono text-sm">{formatDate(invoice.issue_date)}</div>
              </div>
              <div>
                <div className="label-eyebrow">Vencimiento</div>
                <div className="font-mono text-sm">{formatDate(invoice.due_date)}</div>
              </div>
              {invoice.payment_method && (
                <div>
                  <div className="label-eyebrow">Método de pago</div>
                  <div className="text-sm">{invoice.payment_method}</div>
                </div>
              )}
            </div>
          </div>

          {/* Items */}
          <div className="py-6">
            <div className="overflow-x-auto -mx-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-widest text-ink-soft border-b border-line">
                    <th className="py-2 px-6 font-semibold">Descripción</th>
                    <th className="py-2 px-2 font-semibold text-right">Cant.</th>
                    <th className="py-2 px-2 font-semibold text-right">Precio</th>
                    <th className="py-2 px-2 font-semibold text-right">Desc</th>
                    {invoice.apply_taxes && <th className="py-2 px-2 font-semibold text-right">Imp</th>}
                    <th className="py-2 px-6 font-semibold text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.items.map((it, i) => {
                    const line = Number(it.quantity) * Number(it.unit_price);
                    const disc = line * (Number(it.discount || 0) / 100);
                    const tax = invoice.apply_taxes ? (line - disc) * (Number(it.tax_rate || 0) / 100) : 0;
                    return (
                      <tr key={i} className="border-b border-line">
                        <td className="py-3 px-6">{it.description}</td>
                        <td className="py-3 px-2 text-right font-mono">{it.quantity}</td>
                        <td className="py-3 px-2 text-right font-mono">{formatMoney(it.unit_price, '').trim()}</td>
                        <td className="py-3 px-2 text-right font-mono text-ink-soft">{it.discount ? `${it.discount}%` : '—'}</td>
                        {invoice.apply_taxes && <td className="py-3 px-2 text-right font-mono text-ink-soft">{it.tax_rate ? `${it.tax_rate}%` : '—'}</td>}
                        <td className="py-3 px-6 text-right font-mono font-semibold">
                          {formatMoney(line - disc + tax, invoice.currency)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totales */}
          <div className="flex justify-end pb-4">
            <dl className="w-full md:w-80 space-y-2 font-mono text-sm">
              <div className="flex justify-between"><dt className="text-ink-soft">Subtotal</dt><dd>{formatMoney(invoice.subtotal, invoice.currency)}</dd></div>
              {invoice.total_discount > 0 && <div className="flex justify-between"><dt className="text-ink-soft">Descuentos</dt><dd>- {formatMoney(invoice.total_discount, invoice.currency)}</dd></div>}
              {invoice.apply_taxes && invoice.total_tax > 0 && <div className="flex justify-between"><dt className="text-ink-soft">Impuestos</dt><dd>{formatMoney(invoice.total_tax, invoice.currency)}</dd></div>}
              <div className="flex justify-between items-baseline pt-3 border-t border-ink mt-2">
                <dt className="font-sans text-xs uppercase tracking-widest">Total</dt>
                <dd className="font-mono text-2xl font-bold" data-testid="detail-total">{formatMoney(invoice.total, invoice.currency)}</dd>
              </div>
            </dl>
          </div>

          {(invoice.notes || invoice.terms || invoice.legal_footer || settings.legal_footer) && (
            <div className="pt-6 border-t border-line space-y-4 text-sm">
              {invoice.notes && (
                <div>
                  <div className="label-eyebrow mb-1">Notas</div>
                  <p className="text-ink-soft whitespace-pre-line">{invoice.notes}</p>
                </div>
              )}
              {invoice.terms && (
                <div>
                  <div className="label-eyebrow mb-1">Términos y condiciones</div>
                  <p className="text-ink-soft whitespace-pre-line">{invoice.terms}</p>
                </div>
              )}
              {(invoice.legal_footer || settings.legal_footer) && (
                <p className="text-xs text-ink-muted italic border-t border-line pt-4">
                  {invoice.legal_footer || settings.legal_footer}
                </p>
              )}
            </div>
          )}
        </Card>

        {/* Sidebar acciones */}
        <div>
          <Card className="sticky top-6">
            <div className="label-eyebrow mb-3">Acciones rápidas</div>

            <div className="space-y-2">
              <Button
                variant={invoice.status === 'pagada' ? 'secondary' : 'primary'}
                onClick={() => changeStatus('pagada')}
                className="w-full justify-center"
                data-testid="mark-paid-btn"
              >
                <CheckCircle2 size={16} /> Marcar como pagada
              </Button>
              <Button
                variant="secondary"
                onClick={() => changeStatus('enviada')}
                className="w-full justify-center"
                data-testid="mark-sent-btn"
              >
                <Send size={16} /> Marcar como enviada
              </Button>
              <Button
                variant="secondary"
                onClick={() => changeStatus('anulada')}
                className="w-full justify-center"
                data-testid="mark-void-btn"
              >
                <XCircle size={16} /> Anular
              </Button>
            </div>

            <div className="mt-6">
              <div className="label-eyebrow mb-2">Cambiar estado</div>
              <Select
                value={invoice.status}
                onChange={(e) => changeStatus(e.target.value)}
                data-testid="status-select"
              >
                {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </Select>
            </div>

            <div className="mt-6 pt-6 border-t border-line">
              <Button
                variant="danger"
                onClick={handleDelete}
                className="w-full justify-center"
                data-testid="delete-invoice-btn"
              >
                <Trash2 size={16} /> Eliminar factura
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
