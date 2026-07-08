import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';

function initials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState([]);
  const [error, setError] = useState('');

  function load() {
    api.getInvoices().then(setInvoices).catch((err) => setError(err.message));
  }

  useEffect(load, []);

  async function toggleStatus(invoice) {
    const status = invoice.status === 'pagada' ? 'pendiente' : 'pagada';
    await api.updateInvoice(invoice._id, { status });
    load();
  }

  async function handleDelete(id) {
    if (!confirm('¿Eliminar esta factura?')) return;
    await api.deleteInvoice(id);
    load();
  }

  const totalFacturado = invoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
  const totalPendiente = invoices
    .filter((inv) => inv.status === 'pendiente')
    .reduce((sum, inv) => sum + (inv.total || 0), 0);

  return (
    <div className="page">
      <div className="page-header">
        <h2>Facturas</h2>
        <Link to="/facturas/nueva" className="button-link">
          + Nueva factura
        </Link>
      </div>

      {error && <p className="error">{error}</p>}

      <div className="summary">
        <div className="summary-card">
          <span className="muted">Total facturado</span>
          <strong>{totalFacturado.toFixed(2)}</strong>
        </div>
        <div className="summary-card">
          <span className="muted">Pendiente de cobro</span>
          <strong>{totalPendiente.toFixed(2)}</strong>
        </div>
      </div>

      <div className="list">
        {invoices.length === 0 && (
          <div className="empty-state">
            <div className="icon">🧾</div>
            <p>No hay facturas todavía. ¡Crea la primera!</p>
          </div>
        )}
        {invoices.map((invoice) => (
          <div className="row" key={invoice._id}>
            <div className="row-main">
              <span className="avatar">{initials(invoice.client?.name)}</span>
              <div>
                <strong>#{String(invoice.number).padStart(4, '0')} — {invoice.client?.name}</strong>
                <div className="muted">
                  {new Date(invoice.issueDate).toLocaleDateString()} · {invoice.total?.toFixed(2)}{' '}
                  {invoice.currency}
                </div>
              </div>
            </div>
            <div className="actions">
              <span className={`badge ${invoice.status}`}>{invoice.status}</span>
              <button className="secondary" onClick={() => toggleStatus(invoice)}>
                Marcar {invoice.status === 'pagada' ? 'pendiente' : 'pagada'}
              </button>
              <a
                className="button-link"
                href={api.invoicePdfUrl(invoice._id)}
                target="_blank"
                rel="noreferrer"
              >
                PDF
              </a>
              <button className="danger" onClick={() => handleDelete(invoice._id)}>
                Eliminar
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
