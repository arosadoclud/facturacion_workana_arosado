import { useEffect, useState } from 'react';
import { api } from '../api';

const emptyForm = { name: '', email: '', country: '', taxId: '', notes: '' };

function initials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}

export default function ClientsPage() {
  const [clients, setClients] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');

  function load() {
    api.getClients().then(setClients).catch((err) => setError(err.message));
  }

  useEffect(load, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      if (editingId) {
        await api.updateClient(editingId, form);
      } else {
        await api.createClient(form);
      }
      setForm(emptyForm);
      setEditingId(null);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  function handleEdit(client) {
    setEditingId(client._id);
    setForm({
      name: client.name || '',
      email: client.email || '',
      country: client.country || '',
      taxId: client.taxId || '',
      notes: client.notes || '',
    });
  }

  async function handleDelete(id) {
    if (!confirm('¿Eliminar este cliente?')) return;
    await api.deleteClient(id);
    load();
  }

  return (
    <div className="page">
      <h2>Clientes</h2>
      <form className="card" onSubmit={handleSubmit}>
        <h3>{editingId ? '✏️ Editar cliente' : '➕ Nuevo cliente'}</h3>
        {error && <p className="error">{error}</p>}
        <div className="grid">
          <input
            placeholder="Nombre *"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <input
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <input
            placeholder="País"
            value={form.country}
            onChange={(e) => setForm({ ...form, country: e.target.value })}
          />
          <input
            placeholder="ID fiscal"
            value={form.taxId}
            onChange={(e) => setForm({ ...form, taxId: e.target.value })}
          />
        </div>
        <textarea
          placeholder="Notas"
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
        />
        <div className="actions">
          <button type="submit">{editingId ? 'Guardar cambios' : 'Crear cliente'}</button>
          {editingId && (
            <button
              type="button"
              className="secondary"
              onClick={() => {
                setEditingId(null);
                setForm(emptyForm);
              }}
            >
              Cancelar
            </button>
          )}
        </div>
      </form>

      <div className="list">
        {clients.length === 0 && (
          <div className="empty-state">
            <div className="icon">👥</div>
            <p>No hay clientes todavía. ¡Agrega el primero arriba!</p>
          </div>
        )}
        {clients.map((client) => (
          <div className="row" key={client._id}>
            <div className="row-main">
              <span className="avatar">{initials(client.name)}</span>
              <div>
                <strong>{client.name}</strong>
                <div className="muted">
                  {[client.email, client.country, client.taxId].filter(Boolean).join(' · ')}
                </div>
              </div>
            </div>
            <div className="actions">
              <button className="secondary" onClick={() => handleEdit(client)}>
                Editar
              </button>
              <button className="danger" onClick={() => handleDelete(client._id)}>
                Eliminar
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
