import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';

const emptyItem = { description: '', quantity: 1, unitPrice: 0 };

function initials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}

export default function NewInvoicePage() {
  const navigate = useNavigate();
  const [clients, setClients] = useState([]);
  const [clientId, setClientId] = useState('');
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState([{ ...emptyItem }]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.getClients().then(setClients).catch((err) => setError(err.message));
  }, []);

  function updateItem(index, field, value) {
    const next = [...items];
    next[index] = { ...next[index], [field]: value };
    setItems(next);
  }

  function addItem() {
    setItems([...items, { ...emptyItem }]);
  }

  function removeItem(index) {
    setItems(items.filter((_, i) => i !== index));
  }

  const total = items.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.unitPrice || 0), 0);
  const selectedClient = clients.find((c) => c._id === clientId);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!clientId) {
      setError('Selecciona un cliente');
      return;
    }
    setSaving(true);
    try {
      await api.createInvoice({
        client: clientId,
        issueDate,
        dueDate: dueDate || undefined,
        currency,
        notes,
        items: items.map((item) => ({
          description: item.description,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
        })),
      });
      navigate('/facturas');
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  return (
    <div className="page">
      <h2>Nueva factura</h2>
      <div className="two-col">
        <form className="card" onSubmit={handleSubmit}>
          {error && <p className="error">{error}</p>}

          <h3>👤 Cliente</h3>
          {clients.length === 0 ? (
            <p className="muted">No tienes clientes todavía. Crea uno primero en la sección Clientes.</p>
          ) : (
            <div className="client-picker">
              {clients.map((c) => (
                <button
                  type="button"
                  key={c._id}
                  className={`client-chip ${clientId === c._id ? 'selected' : ''}`}
                  onClick={() => setClientId(c._id)}
                >
                  <span className="avatar" style={{ width: 28, height: 28, fontSize: 12 }}>
                    {initials(c.name)}
                  </span>
                  <span>{c.name}</span>
                </button>
              ))}
            </div>
          )}

          <div className="grid">
            <select value={currency} onChange={(e) => setCurrency(e.target.value)}>
              <option value="USD">USD — Dólar</option>
              <option value="EUR">EUR — Euro</option>
            </select>
            <label>
              Fecha emisión
              <input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
            </label>
            <label>
              Fecha vencimiento
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </label>
          </div>

          <h3>🧾 Ítems</h3>
          {items.map((item, index) => (
            <div className="item-row" key={index}>
              <input
                placeholder="Descripción del trabajo"
                value={item.description}
                onChange={(e) => updateItem(index, 'description', e.target.value)}
                required
              />
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="Cant."
                value={item.quantity}
                onChange={(e) => updateItem(index, 'quantity', e.target.value)}
              />
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="Precio"
                value={item.unitPrice}
                onChange={(e) => updateItem(index, 'unitPrice', e.target.value)}
              />
              <span className="subtotal">
                {(Number(item.quantity || 0) * Number(item.unitPrice || 0)).toFixed(2)}
              </span>
              {items.length > 1 && (
                <button type="button" className="danger" onClick={() => removeItem(index)}>
                  ✕
                </button>
              )}
            </div>
          ))}
          <button type="button" className="secondary" onClick={addItem}>
            + Agregar ítem
          </button>

          <textarea placeholder="Notas (opcional)" value={notes} onChange={(e) => setNotes(e.target.value)} />

          <div className="actions">
            <button type="submit" disabled={saving}>
              {saving ? 'Creando...' : 'Crear factura'}
            </button>
          </div>
        </form>

        <div className="preview-card">
          <h3>Vista previa</h3>
          <div className="preview-header">
            <div>
              <div className="muted">Factura para</div>
              <strong>{selectedClient ? selectedClient.name : 'Selecciona un cliente'}</strong>
            </div>
            <div className="num">#{'nueva'}</div>
          </div>
          <div className="preview-items">
            {items
              .filter((i) => i.description)
              .map((item, i) => (
                <div className="preview-item" key={i}>
                  <span>
                    {item.description} × {item.quantity || 0}
                  </span>
                  <span>{(Number(item.quantity || 0) * Number(item.unitPrice || 0)).toFixed(2)}</span>
                </div>
              ))}
            {items.every((i) => !i.description) && <p className="muted">Agrega ítems para verlos aquí.</p>}
          </div>
          <div className="preview-total">
            <span>Total</span>
            <span className="amount">
              {total.toFixed(2)} {currency}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
