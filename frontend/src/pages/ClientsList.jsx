import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Users, Search, Trash2, Edit3, X } from 'lucide-react';
import api from '../api';
import { COUNTRIES, COUNTRY_TAX_PRESETS } from '../constants';
import { Button, Card, Field, Input, Textarea, Select, PageHeader, EmptyState, Skeleton } from '../components/ui';

const empty = {
  name: '', tax_id_label: 'ID Fiscal', tax_id: '',
  country: '', city: '', address: '', phone: '', email: '', notes: '',
};

export default function ClientsList() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(empty);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  function load() {
    setLoading(true);
    api.listClients().then(setClients).finally(() => setLoading(false));
  }

  useEffect(load, []);

  function openNew() {
    setEditingId(null); setForm(empty); setError(''); setShowForm(true);
  }
  function openEdit(c) {
    setEditingId(c.id);
    setForm({
      name: c.name || '', tax_id_label: c.tax_id_label || 'ID Fiscal', tax_id: c.tax_id || '',
      country: c.country || '', city: c.city || '', address: c.address || '',
      phone: c.phone || '', email: c.email || '', notes: c.notes || '',
    });
    setError(''); setShowForm(true);
  }

  function pickCountry(country) {
    const preset = COUNTRY_TAX_PRESETS[country];
    setForm((f) => ({
      ...f,
      country,
      tax_id_label: preset?.label || f.tax_id_label || 'ID Fiscal',
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!form.name) { setError('El nombre es obligatorio.'); return; }
    if (form.email && !/^\S+@\S+\.\S+$/.test(form.email)) { setError('Email inválido.'); return; }
    setSaving(true);
    try {
      if (editingId) await api.updateClient(editingId, form);
      else await api.createClient(form);
      setShowForm(false); setForm(empty); setEditingId(null);
      load();
    } catch (err) {
      setError(err.response?.data?.detail || err.message);
    } finally { setSaving(false); }
  }

  async function handleDelete(id, e) {
    e.stopPropagation();
    if (!window.confirm('¿Eliminar este cliente? Sus facturas no se eliminarán.')) return;
    await api.deleteClient(id);
    load();
  }

  const filtered = q
    ? clients.filter((c) =>
        [c.name, c.email, c.tax_id, c.country, c.city]
          .filter(Boolean).some((v) => v.toLowerCase().includes(q.toLowerCase())))
    : clients;

  return (
    <div>
      <PageHeader
        eyebrow="Directorio"
        title="Clientes"
        description="Guarda los datos fiscales de tus clientes una sola vez y factúrales sin esfuerzo."
        actions={
          <Button onClick={openNew} data-testid="new-client-btn">
            <Plus size={16} /> Nuevo cliente
          </Button>
        }
      />

      {showForm && (
        <Card className="mb-6" >
          <div className="flex items-start justify-between mb-4">
            <h3 className="font-display font-semibold text-lg">
              {editingId ? 'Editar cliente' : 'Nuevo cliente'}
            </h3>
            <button
              onClick={() => setShowForm(false)}
              className="p-2 rounded-md hover:bg-subtle text-ink-muted"
              data-testid="close-form-btn"
            >
              <X size={16} />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4" data-testid="client-form">
            <Field label="Nombre / Empresa *">
              <Input data-testid="client-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </Field>
            <Field label="Email">
              <Input data-testid="client-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </Field>
            <Field label="País" hint="Cambia automáticamente el label de ID fiscal">
              <Select data-testid="client-country" value={form.country} onChange={(e) => pickCountry(e.target.value)}>
                <option value="">—</option>
                {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </Select>
            </Field>
            <Field label="Ciudad">
              <Input data-testid="client-city" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            </Field>
            <Field label="Tipo de ID fiscal">
              <Input data-testid="client-tax-label" value={form.tax_id_label} onChange={(e) => setForm({ ...form, tax_id_label: e.target.value })} placeholder="Ej: RNC, NIF, RFC..." />
            </Field>
            <Field label="Número de ID fiscal">
              <Input data-testid="client-tax-id" value={form.tax_id} onChange={(e) => setForm({ ...form, tax_id: e.target.value })} />
            </Field>
            <Field label="Teléfono">
              <Input data-testid="client-phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </Field>
            <Field label="Dirección" className="md:col-span-1">
              <Input data-testid="client-address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </Field>
            <Field label="Notas internas" className="md:col-span-2">
              <Textarea data-testid="client-notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Solo visibles para ti." />
            </Field>

            {error && <div className="md:col-span-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md p-3">{error}</div>}

            <div className="md:col-span-2 flex items-center gap-2">
              <Button type="submit" disabled={saving} data-testid="save-client-btn">
                {saving ? 'Guardando...' : editingId ? 'Guardar cambios' : 'Crear cliente'}
              </Button>
              <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>Cancelar</Button>
            </div>
          </form>
        </Card>
      )}

      <Card className="mb-4">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
          <Input
            data-testid="clients-search"
            placeholder="Buscar clientes..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-9"
          />
        </div>
      </Card>

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title={clients.length === 0 ? 'Sin clientes todavía' : 'Sin resultados'}
          description={clients.length === 0 ? 'Agrega tu primer cliente para empezar a facturar.' : 'Prueba con otras palabras.'}
          action={clients.length === 0 && <Button onClick={openNew}><Plus size={16} />Crear cliente</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4" data-testid="clients-grid">
          {filtered.map((c) => (
            <Card key={c.id} className="hover-lift cursor-pointer" >
              <Link to={`/clientes/${c.id}`} className="block">
                <div className="flex items-start justify-between">
                  <div className="min-w-0">
                    <div className="font-display font-semibold text-lg truncate">{c.name}</div>
                    {c.email && <div className="text-xs text-ink-soft truncate mt-0.5">{c.email}</div>}
                  </div>
                  <div className="w-10 h-10 rounded-md bg-subtle flex items-center justify-center font-display font-bold text-ink text-sm flex-shrink-0 ml-3">
                    {c.name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase()}
                  </div>
                </div>

                <dl className="mt-4 space-y-1 text-xs text-ink-soft">
                  {c.tax_id && <div className="flex gap-2"><dt className="text-ink-muted">{c.tax_id_label}:</dt><dd className="font-mono">{c.tax_id}</dd></div>}
                  {(c.city || c.country) && <div className="flex gap-2"><dt className="text-ink-muted">Ubic.:</dt><dd>{[c.city, c.country].filter(Boolean).join(', ')}</dd></div>}
                  {c.phone && <div className="flex gap-2"><dt className="text-ink-muted">Tel.:</dt><dd className="font-mono">{c.phone}</dd></div>}
                </dl>
              </Link>

              <div className="flex items-center gap-1 mt-4 pt-4 border-t border-line">
                <button
                  onClick={(e) => { e.preventDefault(); openEdit(c); }}
                  className="flex-1 flex items-center justify-center gap-1 py-2 rounded-md text-xs font-semibold text-ink-soft hover:bg-subtle hover:text-ink"
                  data-testid={`edit-client-${c.name}`}
                >
                  <Edit3 size={13} /> Editar
                </button>
                <button
                  onClick={(e) => handleDelete(c.id, e)}
                  className="flex-1 flex items-center justify-center gap-1 py-2 rounded-md text-xs font-semibold text-ink-muted hover:bg-red-50 hover:text-red-600"
                  data-testid={`delete-client-${c.name}`}
                >
                  <Trash2 size={13} /> Eliminar
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
