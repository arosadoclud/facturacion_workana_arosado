import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import ClientsPage from './pages/ClientsPage';
import InvoicesPage from './pages/InvoicesPage';
import NewInvoicePage from './pages/NewInvoicePage';
import logo from './assets/logo.png';
import './App.css';

export default function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <header className="topbar">
          <div className="brand">
            <img src={logo} alt="Logo" className="brand-logo" />
            <h1>Facturación Workana</h1>
          </div>
          <nav>
            <NavLink to="/facturas" className={({ isActive }) => (isActive ? 'active' : '')}>
              Facturas
            </NavLink>
            <NavLink to="/clientes" className={({ isActive }) => (isActive ? 'active' : '')}>
              Clientes
            </NavLink>
          </nav>
        </header>
        <main>
          <Routes>
            <Route path="/" element={<Navigate to="/facturas" replace />} />
            <Route path="/facturas" element={<InvoicesPage />} />
            <Route path="/facturas/nueva" element={<NewInvoicePage />} />
            <Route path="/clientes" element={<ClientsPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
