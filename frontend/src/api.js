import axios from 'axios';

const BASE = process.env.REACT_APP_BACKEND_URL;
export const API = `${BASE}/api`;

const http = axios.create({ baseURL: API, headers: { 'Content-Type': 'application/json' } });

export const api = {
  // Settings
  getSettings: () => http.get('/settings').then((r) => r.data),
  saveSettings: (data) => http.put('/settings', data).then((r) => r.data),

  // Clients
  listClients: () => http.get('/clients').then((r) => r.data),
  getClient: (id) => http.get(`/clients/${id}`).then((r) => r.data),
  createClient: (data) => http.post('/clients', data).then((r) => r.data),
  updateClient: (id, data) => http.put(`/clients/${id}`, data).then((r) => r.data),
  deleteClient: (id) => http.delete(`/clients/${id}`).then((r) => r.data),

  // Invoices
  listInvoices: (params = {}) => http.get('/invoices', { params }).then((r) => r.data),
  getInvoice: (id) => http.get(`/invoices/${id}`).then((r) => r.data),
  createInvoice: (data) => http.post('/invoices', data).then((r) => r.data),
  updateInvoice: (id, data) => http.put(`/invoices/${id}`, data).then((r) => r.data),
  changeStatus: (id, status) => http.patch(`/invoices/${id}/status`, { status }).then((r) => r.data),
  deleteInvoice: (id) => http.delete(`/invoices/${id}`).then((r) => r.data),
  invoicePdfUrl: (id) => `${API}/invoices/${id}/pdf`,

  // Reports
  summary: () => http.get('/reports/summary').then((r) => r.data),
  monthly: (year) => http.get('/reports/monthly', { params: { year } }).then((r) => r.data),
  topClients: (limit = 5) => http.get('/reports/top-clients', { params: { limit } }).then((r) => r.data),
  exportCsvUrl: () => `${API}/reports/export-csv`,
};

export default api;
