import React, { useEffect, useRef, useState } from 'react';
import { Save, Upload, CheckCircle2, Trash2 } from 'lucide-react';
import api from '../api';
import { CURRENCIES, COUNTRIES, COUNTRY_TAX_PRESETS } from '../constants';
import { Button, Card, Field, Input, Textarea, Select, PageHeader } from '../components/ui';
import { useToast } from '../components/Toast';

export default function SettingsPage() {
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef(null);
  const toast = useToast();

  useEffect(() => { api.getSettings().then(setForm); }, []);

  function set(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  function pickCountry(country) {
    const preset = COUNTRY_TAX_PRESETS[country];
    setForm((f) => ({
      ...f,
      country,
      tax_id_label: preset?.label || f.tax_id_label || 'ID Fiscal',
      default_tax_label: preset?.tax_label || f.default_tax_label,
      default_tax_rate: preset?.tax_rate ?? f.default_tax_rate,
    }));
  }

  async function handleLogo(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 500 * 1024) {
      setError('El logo debe pesar menos de 500 KB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => set('logo', reader.result);
    reader.readAsDataURL(file);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(''); setSaving(true); setSaved(false);
    try {
      if (form.email && !/^\S+@\S+\.\S+$/.test(form.email)) {
        setError('Email inválido.'); setSaving(false); return;
      }
      const saved = await api.saveSettings({
        business_name: form.business_name || '',
        tax_id_label: form.tax_id_label || 'ID Fiscal',
        tax_id: form.tax_id || '',
        country: form.country || '',
        city: form.city || '',
        address: form.address || '',
        phone: form.phone || '',
        email: form.email || '',
        logo: form.logo || '',
        default_currency: form.default_currency || 'USD',
        default_tax_rate: Number(form.default_tax_rate || 0),
        default_tax_label: form.default_tax_label || 'IVA',
        apply_taxes: !!form.apply_taxes,
        legal_footer: form.legal_footer || '',
        default_terms: form.default_terms || '',
        invoice_prefix: form.invoice_prefix || 'FAC',
        next_invoice_number: Number(form.next_invoice_number || 1),
      });
      setForm(saved);
      setSaved(true);
      toast.success('Configuración guardada', 'Los cambios se aplicarán a las próximas facturas.');
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      const msg = err.response?.data?.detail || err.message;
      setError(msg);
      toast.error('No se pudo guardar', msg);
    } finally { setSaving(false); }
  }

  if (!form) return <div className="skeleton h-64" />;

  return (
    <div>
      <PageHeader
        eyebrow="Perfil"
        title="Configuración"
        description="Estos datos aparecerán en todas tus facturas y en el PDF descargable."
      />

      <form onSubmit={handleSubmit} className="grid grid-cols-1 xl:grid-cols-3 gap-6" data-testid="settings-form">
        <div className="xl:col-span-2 space-y-6">
          <Card>
            <h3 className="font-display font-semibold text-lg mb-4">Datos del emisor</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Nombre / Marca" className="md:col-span-2">
                <Input data-testid="settings-business-name" value={form.business_name || ''} onChange={(e) => set('business_name', e.target.value)} placeholder="Tu nombre o nombre comercial" />
              </Field>
              <Field label="País" hint="Al elegir país se sugieren automáticamente los tipos de impuestos e ID">
                <Select data-testid="settings-country" value={form.country || ''} onChange={(e) => pickCountry(e.target.value)}>
                  <option value="">—</option>
                  {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </Select>
              </Field>
              <Field label="Ciudad">
                <Input data-testid="settings-city" value={form.city || ''} onChange={(e) => set('city', e.target.value)} />
              </Field>
              <Field label="Tipo de ID fiscal">
                <Input data-testid="settings-tax-label" value={form.tax_id_label || ''} onChange={(e) => set('tax_id_label', e.target.value)} placeholder="RNC, NIF, RFC, CUIT, VAT..." />
              </Field>
              <Field label="Número de ID fiscal">
                <Input data-testid="settings-tax-id" value={form.tax_id || ''} onChange={(e) => set('tax_id', e.target.value)} />
              </Field>
              <Field label="Dirección" className="md:col-span-2">
                <Input data-testid="settings-address" value={form.address || ''} onChange={(e) => set('address', e.target.value)} />
              </Field>
              <Field label="Teléfono">
                <Input data-testid="settings-phone" value={form.phone || ''} onChange={(e) => set('phone', e.target.value)} />
              </Field>
              <Field label="Email">
                <Input data-testid="settings-email" type="email" value={form.email || ''} onChange={(e) => set('email', e.target.value)} />
              </Field>
            </div>
          </Card>

          <Card>
            <h3 className="font-display font-semibold text-lg mb-4">Facturación</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Moneda principal">
                <Select data-testid="settings-currency" value={form.default_currency || 'USD'} onChange={(e) => set('default_currency', e.target.value)}>
                  {CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.code} — {c.name}</option>)}
                </Select>
              </Field>
              <Field label="Prefijo de facturas" hint="Ej: FAC, INV, 2026-">
                <Input data-testid="settings-invoice-prefix" value={form.invoice_prefix || ''} onChange={(e) => set('invoice_prefix', e.target.value)} />
              </Field>
              <Field label="Siguiente número">
                <Input type="number" min="1" data-testid="settings-next-number" value={form.next_invoice_number || 1} onChange={(e) => set('next_invoice_number', e.target.value)} />
              </Field>
              <Field label="Aplicar impuestos por defecto">
                <label className="flex items-center gap-2 mt-2 text-sm">
                  <input
                    type="checkbox"
                    checked={!!form.apply_taxes}
                    onChange={(e) => set('apply_taxes', e.target.checked)}
                    className="w-4 h-4 accent-ink"
                    data-testid="settings-apply-taxes"
                  />
                  Activar impuestos en nuevas facturas
                </label>
              </Field>
              <Field label="Etiqueta impuesto">
                <Input data-testid="settings-tax-name" value={form.default_tax_label || ''} onChange={(e) => set('default_tax_label', e.target.value)} placeholder="IVA, VAT, ITBIS..." />
              </Field>
              <Field label="Tasa impuesto (%)">
                <Input type="number" step="0.01" data-testid="settings-tax-rate" value={form.default_tax_rate ?? 0} onChange={(e) => set('default_tax_rate', e.target.value)} />
              </Field>
            </div>
          </Card>

          <Card>
            <h3 className="font-display font-semibold text-lg mb-4">Textos legales</h3>
            <div className="space-y-4">
              <Field label="Términos y condiciones por defecto" hint="Se copian a cada nueva factura y aparecen en el PDF">
                <Textarea data-testid="settings-terms" value={form.default_terms || ''} onChange={(e) => set('default_terms', e.target.value)} placeholder="Ej: Pago a 15 días. Se aplican recargos por mora del 2% mensual." />
              </Field>
              <Field label="Pie legal">
                <Textarea data-testid="settings-legal-footer" value={form.legal_footer || ''} onChange={(e) => set('legal_footer', e.target.value)} placeholder="Ej: Gracias por su preferencia. Documento emitido conforme a la ley XX." />
              </Field>
            </div>
          </Card>
        </div>

        {/* Logo + acciones */}
        <div className="space-y-6">
          <Card>
            <h3 className="font-display font-semibold text-lg mb-4">Logo</h3>
            <div className="border border-dashed border-line rounded-lg p-6 text-center bg-subtle/50">
              {form.logo ? (
                <img src={form.logo} alt="logo" className="max-h-24 max-w-full mx-auto object-contain" data-testid="settings-logo-preview" />
              ) : (
                <div className="text-xs text-ink-muted">Sin logo</div>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleLogo} data-testid="settings-logo-input" />
            <div className="flex gap-2 mt-4">
              <Button type="button" variant="secondary" onClick={() => fileRef.current?.click()} className="flex-1 justify-center">
                <Upload size={14} /> Subir imagen
              </Button>
              {form.logo && (
                <Button type="button" variant="ghost" onClick={() => set('logo', '')} data-testid="settings-logo-clear">
                  <Trash2 size={14} />
                </Button>
              )}
            </div>
            <p className="text-xs text-ink-muted mt-3">PNG o JPG, hasta 500 KB. Aparecerá en la esquina superior del PDF.</p>
          </Card>

          <Card>
            <div className="label-eyebrow mb-3">Guardar cambios</div>
            {error && <div className="mb-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md p-3">{error}</div>}
            {saved && (
              <div className="mb-3 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md p-3 flex items-center gap-2" data-testid="settings-saved-notice">
                <CheckCircle2 size={16} /> Configuración guardada
              </div>
            )}
            <Button type="submit" className="w-full justify-center" disabled={saving} data-testid="settings-save-btn">
              <Save size={16} /> {saving ? 'Guardando...' : 'Guardar configuración'}
            </Button>
          </Card>
        </div>
      </form>
    </div>
  );
}
