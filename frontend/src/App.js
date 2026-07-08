import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import InvoicesList from './pages/InvoicesList';
import InvoiceForm from './pages/InvoiceForm';
import InvoiceDetail from './pages/InvoiceDetail';
import ClientsList from './pages/ClientsList';
import ClientDetail from './pages/ClientDetail';
import Reports from './pages/Reports';
import SettingsPage from './pages/Settings';

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/facturas" element={<InvoicesList />} />
        <Route path="/facturas/nueva" element={<InvoiceForm />} />
        <Route path="/facturas/:id" element={<InvoiceDetail />} />
        <Route path="/facturas/:id/editar" element={<InvoiceForm />} />
        <Route path="/clientes" element={<ClientsList />} />
        <Route path="/clientes/:id" element={<ClientDetail />} />
        <Route path="/reportes" element={<Reports />} />
        <Route path="/configuracion" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
