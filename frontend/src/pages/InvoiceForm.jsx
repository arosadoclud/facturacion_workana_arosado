import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Plus, Trash2, ArrowLeft, Save, ChevronDown, ChevronUp } from 'lucide-react';
import api from '../api';
import {
  CURRENCIES, STATUSES, PAYMENT_METHODS, formatMoney, todayISO,
} from '../constants';
import { Button, Card, Field, Input, Select, Textarea, PageHeader } from '../components/ui';
import { useToast } from '../components/Toast';

function emptyItem() {
  return { description: '', quantity: 1, unit_price: 0, discount: 0, tax_rate: 0 };
}

export default function InvoiceForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const toast = useToast();

  const [settings, setSettings] = useState(null);
  const [clients, setClients] = useState([]);
  const [form, setForm] = useState({
    number: '',
    client_id: '',
    issue_date: todayISO(),
    due_date: '',
    currency: 'USD',
    items: [emptyItem()],
    global_discount: 0,
    apply_taxes: false,
    status: 'borrador',
    payment_method: '',
    notes: '',
    terms: '',
    legal_footer: '',
  });
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([api.getSettings(), api.listClients()]).then(([s, cs]) => {
      setSettings(s);
      setClients(cs);
      if (!isEdit) {
        setForm((f) => ({
          ...f,
          currency: s.default_currency || 'USD',
          apply_taxes: !!s.apply_taxes,
          terms: s.default_terms || '',
          legal_footer: s.legal_footer || '',
          items: [{ ...emptyItem(), tax_rate: s.apply_taxes ? Number(s.default_tax_rate || 0) : 0 }],
        }));
      }
    });
  }, [isEdit]);

  useEffect(() => {
    if (!isEdit) return;
    api.getInvoice(id).then((inv) => {
      setForm({
        number: inv.number || '',
        client_id: inv.client_id,
        issue_date: inv.issue_date || todayISO(),
        due_date: inv.due_date || '',
        currency: inv.currency || 'USD',
        items: inv.items?.length ? inv.items : [emptyItem()],
        global_discount: inv.global_discount || 0,
        apply_taxes: !!inv.apply_taxes,
        status: inv.status || 'borrador',
        payment_method: inv.payment_method || '',
        notes: inv.notes || '',
        terms: inv.terms || '',
        legal_footer: inv.legal_footer || '',
      });
    });
  }, [id, isEdit]);

  const totals = useMemo(() => {
    let subtotal = 0, disc = 0, tax = 0;
    for (const it of form.items) {
      const line = Number(it.quantity || 0) * Number(it.unit_price || 0);
      const ld = line * (Number(it.discount || 0) / 100);
      const lt = form.apply_taxes ? (line - ld) * (Number(it.tax_rate || 0) / 100) : 0;
      subtotal += line; disc += ld; tax += lt;
    }
    disc += Math.max(0, Number(form.global_discount || 0));
    return {
      subtotal, discount: disc, tax, total: subtotal - disc + tax,
    };
  }, [form.items, form.global_discount, form.apply_taxes]);

  function setItem(i, field, value) {
    const items = [...form.items];
    items[i] = { ...items[i], [field]: value };
    setForm({ ...form, items });
  }
  function addItem() {
    setForm({ ...form, items: [...form.items, { ...emptyItem(), tax_rate: form.apply_taxes ? Number(settings?.default_tax_rate || 0) : 0 }] });
  }
  function removeItem(i) {
    if (form.items.length === 1) return;
    setForm({ ...form, items: form.items.filter((_, idx) => idx !== i) });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!form.client_id) { setError('Debes seleccionar un cliente.'); return; }
    if (!form.issue_date) { setError('La fecha de emisión es obligatoria.'); return; }
    if (form.items.length === 0 || form.items.every((i) => !i.description)) {
      setError('Agrega al menos un ítem con descripción.'); return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        global_discount: Number(form.global_discount || 0),
        items: form.items
          .filter((i) => i.description)
          .map((i) => ({
            description: i.description,
            quantity: Number(i.quantity || 0),
            unit_price: Number(i.unit_price || 0),
            discount: Number(i.discount || 0),
            tax_rate: Number(i.tax_rate || 0),
          })),
      };
      const saved = isEdit
        ? await api.updateInvoice(id, payload)
        : await api.createInvoice(payload);
      toast.success(
        isEdit ? 'Factura actualizada' : 'Factura creada',
        `${saved.number} · ${formatMoney(saved.total, saved.currency)}`,
      );
      navigate(`/facturas/${saved.id}`);
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Error al guardar';
      setError(msg);
      toast.error('No se pudo guardar', msg);
      setSaving(false);
    }
  }

  const selectedClient = clients.find((c) => c.id === form.client_id);

  return (
    <div>
      <PageHeader
        eyebrow={isEdit ? 'Editar' : 'Nueva'}
        title={isEdit ? `Editar ${form.number || 'factura'}` : 'Nueva factura'}
        actions={
          <Link to="/facturas">
            <Button variant="secondary"><ArrowLeft size={16} /> Volver</Button>
          </Link>
        }
      />

      {clients.length === 0 && (
        <Card className="mb-6 border-amber-300 bg-amber-50">
          <p className="text-sm text-amber-800">
            Aún no tienes clientes.{' '}
            <Link to="/clientes" className="underline font-semibold">Crea uno primero</Link>{' '}
            para poder facturarle.
          </p>
        </Card>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 xl:grid-cols-3 gap-6" data-testid="invoice-form">
        {/* Columna principal */}
        <div className="xl:col-span-2 flex flex-col gap-6">
          <Card>
            <h3 className="font-display font-semibold text-lg mb-4">Información</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Número de factura" hint="Se genera automáticamente. Puedes editarlo.">
                <Input
                  data-testid="invoice-number-input"
                  value={form.number}
                  onChange={(e) => setForm({ ...form, number: e.target.value })}
                  placeholder="FAC-0001"
                />
              </Field>
              <Field label="Cliente *">
                <Select
                  data-testid="invoice-client-select"
                  value={form.client_id}
                  onChange={(e) => setForm({ ...form, client_id: e.target.value })}
                  required
                >
                  <option value="">Selecciona un cliente</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Fecha de emisión *">
                <Input
                  type="date"
                  data-testid="invoice-issue-date"
                  value={form.issue_date}
                  onChange={(e) => setForm({ ...form, issue_date: e.target.value })}
                  required
                />
              </Field>
              <Field label="Fecha de vencimiento">
                <Input
                  type="date"
                  data-testid="invoice-due-date"
                  value={form.due_date}
                  onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                />
              </Field>
              <Field label="Moneda">
                <Select
                  data-testid="invoice-currency"
                  value={form.currency}
                  onChange={(e) => setForm({ ...form, currency: e.target.value })}
                >
                  {CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>{c.code} — {c.name}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Estado">
                <Select
                  data-testid="invoice-status"
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                >
                  {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </Select>
              </Field>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-semibold text-lg">Ítems</h3>
              <label className="flex items-center gap-2 text-sm text-ink-soft cursor-pointer">
                <input
                  type="checkbox"
                  data-testid="invoice-apply-taxes"
                  checked={form.apply_taxes}
                  onChange={(e) => setForm({ ...form, apply_taxes: e.target.checked })}
                  className="w-4 h-4 accent-ink"
                />
                Aplicar impuestos
              </label>
            </div>

            <div className="space-y-3">
              {form.items.map((it, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-end p-3 bg-subtle/50 border border-line rounded-lg" data-testid={`item-row-${i}`}>
                  <div className="col-span-12 md:col-span-5">
                    <Field label={i === 0 ? 'Descripción' : ''}>
                      <Input
                        data-testid={`item-desc-${i}`}
                        placeholder="Ej: Diseño de landing page"
                        value={it.description}
                        onChange={(e) => setItem(i, 'description', e.target.value)}
                        required
                      />
                    </Field>
                  </div>
                  <div className="col-span-4 md:col-span-1">
                    <Field label={i === 0 ? 'Cant.' : ''}>
                      <Input
                        type="number" min="0" step="0.01"
                        data-testid={`item-qty-${i}`}
                        value={it.quantity}
                        onChange={(e) => setItem(i, 'quantity', e.target.value)}
                      />
                    </Field>
                  </div>
                  <div className="col-span-8 md:col-span-2">
                    <Field label={i === 0 ? 'Precio' : ''}>
                      <Input
                        type="number" min="0" step="0.01"
                        data-testid={`item-price-${i}`}
                        value={it.unit_price}
                        onChange={(e) => setItem(i, 'unit_price', e.target.value)}
                      />
                    </Field>
                  </div>
                  <div className="col-span-4 md:col-span-1">
                    <Field label={i === 0 ? 'Desc %' : ''}>
                      <Input
                        type="number" min="0" max="100" step="0.01"
                        data-testid={`item-disc-${i}`}
                        value={it.discount}
                        onChange={(e) => setItem(i, 'discount', e.target.value)}
                      />
                    </Field>
                  </div>
                  <div className="col-span-4 md:col-span-1">
                    <Field label={i === 0 ? 'Imp %' : ''}>
                      <Input
                        type="number" min="0" max="100" step="0.01"
                        data-testid={`item-tax-${i}`}
                        value={it.tax_rate}
                        onChange={(e) => setItem(i, 'tax_rate', e.target.value)}
                        disabled={!form.apply_taxes}
                      />
                    </Field>
                  </div>
                  <div className="col-span-3 md:col-span-1 text-right font-mono text-sm font-semibold">
                    {formatMoney(Number(it.quantity || 0) * Number(it.unit_price || 0) * (1 - Number(it.discount || 0) / 100) * (1 + (form.apply_taxes ? Number(it.tax_rate || 0) / 100 : 0)), form.currency).replace(' ' + form.currency, '')}
                  </div>
                  <div className="col-span-1 flex justify-end">
                    {form.items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(i)}
                        className="p-2 rounded-md text-ink-muted hover:text-red-600 hover:bg-red-50"
                        data-testid={`item-remove-${i}`}
                        title="Eliminar ítem"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <Button variant="secondary" type="button" onClick={addItem} className="mt-4" data-testid="add-item-btn">
              <Plus size={16} /> Agregar ítem
            </Button>
          </Card>

          <Card>
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full flex items-center justify-between text-left"
              data-testid="toggle-advanced"
            >
              <h3 className="font-display font-semibold text-lg">Notas, términos y ajustes</h3>
              {showAdvanced ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>
            {showAdvanced && (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Método de pago">
                  <Select
                    value={form.payment_method}
                    onChange={(e) => setForm({ ...form, payment_method: e.target.value })}
                    data-testid="invoice-payment-method"
                  >
                    <option value="">—</option>
                    {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                  </Select>
                </Field>
                <Field label="Descuento global (monto)">
                  <Input
                    type="number" min="0" step="0.01"
                    data-testid="invoice-global-discount"
                    value={form.global_discount}
                    onChange={(e) => setForm({ ...form, global_discount: e.target.value })}
                  />
                </Field>
                <Field label="Notas" className="md:col-span-2">
                  <Textarea
                    data-testid="invoice-notes"
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    placeholder="Detalles adicionales visibles en el PDF..."
                  />
                </Field>
                <Field label="Términos y condiciones" className="md:col-span-2">
                  <Textarea
                    data-testid="invoice-terms"
                    value={form.terms}
                    onChange={(e) => setForm({ ...form, terms: e.target.value })}
                    placeholder="Términos comerciales, plazos, etc."
                  />
                </Field>
                <Field label="Pie legal (personalizado)" className="md:col-span-2">
                  <Textarea
                    data-testid="invoice-legal-footer"
                    value={form.legal_footer}
                    onChange={(e) => setForm({ ...form, legal_footer: e.target.value })}
                    placeholder="Texto legal opcional al pie de la factura."
                  />
                </Field>
              </div>
            )}
          </Card>
        </div>

        {/* Sidebar: resumen */}
        <div className="xl:col-span-1">
          <Card className="sticky top-6">
            <div className="label-eyebrow mb-3">Resumen</div>

            {selectedClient && (
              <div className="pb-4 mb-4 border-b border-line">
                <div className="text-xs text-ink-muted">Facturar a</div>
                <div className="font-semibold mt-1">{selectedClient.name}</div>
                {selectedClient.tax_id && (
                  <div className="text-xs text-ink-soft mt-1">
                    {selectedClient.tax_id_label || 'ID Fiscal'}: {selectedClient.tax_id}
                  </div>
                )}
              </div>
            )}

            <dl className="space-y-2 font-mono text-sm">
              <div className="flex justify-between text-ink-soft">
                <dt>Subtotal</dt>
                <dd data-testid="totals-subtotal">{formatMoney(totals.subtotal, form.currency)}</dd>
              </div>
              {totals.discount > 0 && (
                <div className="flex justify-between text-ink-soft">
                  <dt>Descuento</dt>
                  <dd data-testid="totals-discount">- {formatMoney(totals.discount, form.currency)}</dd>
                </div>
              )}
              {form.apply_taxes && totals.tax > 0 && (
                <div className="flex justify-between text-ink-soft">
                  <dt>Impuestos</dt>
                  <dd data-testid="totals-tax">{formatMoney(totals.tax, form.currency)}</dd>
                </div>
              )}
              <div className="flex justify-between items-baseline pt-3 border-t border-line mt-3">
                <dt className="font-sans text-xs uppercase tracking-widest text-ink-soft">Total</dt>
                <dd className="font-mono text-2xl font-bold text-ink" data-testid="totals-total">
                  {formatMoney(totals.total, form.currency)}
                </dd>
              </div>
            </dl>

            {error && <div className="mt-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md p-3" data-testid="form-error">{error}</div>}

            <Button
              type="submit"
              className="w-full mt-6 justify-center"
              disabled={saving}
              data-testid="invoice-save-btn"
            >
              <Save size={16} /> {saving ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear factura'}
            </Button>
          </Card>
        </div>
      </form>
    </div>
  );
}
