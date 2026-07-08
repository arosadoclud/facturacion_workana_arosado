export const CURRENCIES = [
  { code: 'USD', name: 'Dólar estadounidense', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'MXN', name: 'Peso mexicano', symbol: '$' },
  { code: 'ARS', name: 'Peso argentino', symbol: '$' },
  { code: 'COP', name: 'Peso colombiano', symbol: '$' },
  { code: 'CLP', name: 'Peso chileno', symbol: '$' },
  { code: 'PEN', name: 'Sol peruano', symbol: 'S/' },
  { code: 'DOP', name: 'Peso dominicano', symbol: 'RD$' },
  { code: 'BRL', name: 'Real brasileño', symbol: 'R$' },
  { code: 'GBP', name: 'Libra esterlina', symbol: '£' },
  { code: 'CAD', name: 'Dólar canadiense', symbol: 'C$' },
  { code: 'UYU', name: 'Peso uruguayo', symbol: '$U' },
  { code: 'VES', name: 'Bolívar venezolano', symbol: 'Bs.' },
  { code: 'GTQ', name: 'Quetzal guatemalteco', symbol: 'Q' },
  { code: 'CRC', name: 'Colón costarricense', symbol: '₡' },
  { code: 'BOB', name: 'Boliviano', symbol: 'Bs.' },
  { code: 'PYG', name: 'Guaraní paraguayo', symbol: '₲' },
  { code: 'HNL', name: 'Lempira hondureño', symbol: 'L' },
  { code: 'PAB', name: 'Balboa panameño', symbol: 'B/.' },
];

// País → sugerencia de label de ID fiscal y tasa impuesto típica
export const COUNTRY_TAX_PRESETS = {
  Argentina: { label: 'CUIT', tax_label: 'IVA', tax_rate: 21 },
  México: { label: 'RFC', tax_label: 'IVA', tax_rate: 16 },
  Mexico: { label: 'RFC', tax_label: 'IVA', tax_rate: 16 },
  España: { label: 'NIF', tax_label: 'IVA', tax_rate: 21 },
  Espana: { label: 'NIF', tax_label: 'IVA', tax_rate: 21 },
  Chile: { label: 'RUT', tax_label: 'IVA', tax_rate: 19 },
  Colombia: { label: 'NIT', tax_label: 'IVA', tax_rate: 19 },
  Perú: { label: 'RUC', tax_label: 'IGV', tax_rate: 18 },
  Peru: { label: 'RUC', tax_label: 'IGV', tax_rate: 18 },
  Uruguay: { label: 'RUT', tax_label: 'IVA', tax_rate: 22 },
  Brasil: { label: 'CNPJ', tax_label: 'ICMS', tax_rate: 18 },
  Ecuador: { label: 'RUC', tax_label: 'IVA', tax_rate: 12 },
  Venezuela: { label: 'RIF', tax_label: 'IVA', tax_rate: 16 },
  'República Dominicana': { label: 'RNC', tax_label: 'ITBIS', tax_rate: 18 },
  'Republica Dominicana': { label: 'RNC', tax_label: 'ITBIS', tax_rate: 18 },
  'Estados Unidos': { label: 'EIN', tax_label: 'Sales Tax', tax_rate: 0 },
  USA: { label: 'EIN', tax_label: 'Sales Tax', tax_rate: 0 },
  Reino_Unido: { label: 'VAT', tax_label: 'VAT', tax_rate: 20 },
  'Reino Unido': { label: 'VAT', tax_label: 'VAT', tax_rate: 20 },
  Alemania: { label: 'USt-IdNr', tax_label: 'VAT', tax_rate: 19 },
  Francia: { label: 'TVA', tax_label: 'TVA', tax_rate: 20 },
  Italia: { label: 'P.IVA', tax_label: 'IVA', tax_rate: 22 },
  Portugal: { label: 'NIF', tax_label: 'IVA', tax_rate: 23 },
  Costa_Rica: { label: 'Cédula', tax_label: 'IVA', tax_rate: 13 },
  'Costa Rica': { label: 'Cédula', tax_label: 'IVA', tax_rate: 13 },
  Guatemala: { label: 'NIT', tax_label: 'IVA', tax_rate: 12 },
  Panamá: { label: 'RUC', tax_label: 'ITBMS', tax_rate: 7 },
  Panama: { label: 'RUC', tax_label: 'ITBMS', tax_rate: 7 },
  Bolivia: { label: 'NIT', tax_label: 'IVA', tax_rate: 13 },
  Paraguay: { label: 'RUC', tax_label: 'IVA', tax_rate: 10 },
  Honduras: { label: 'RTN', tax_label: 'ISV', tax_rate: 15 },
};

export const COUNTRIES = Object.keys(COUNTRY_TAX_PRESETS).sort();

export const STATUSES = [
  { value: 'borrador', label: 'Borrador' },
  { value: 'enviada', label: 'Enviada' },
  { value: 'pagada', label: 'Pagada' },
  { value: 'vencida', label: 'Vencida' },
  { value: 'anulada', label: 'Anulada' },
];

export const STATUS_STYLES = {
  borrador: 'text-gray-700 bg-gray-100 border-gray-300',
  enviada: 'text-blue-800 bg-blue-100 border-blue-300',
  pagada: 'text-emerald-800 bg-emerald-100 border-emerald-400',
  vencida: 'text-red-800 bg-red-100 border-red-400',
  anulada: 'text-gray-800 bg-gray-200 border-gray-400',
};

export const PAYMENT_METHODS = [
  'Transferencia bancaria',
  'PayPal',
  'Stripe',
  'Wise',
  'Payoneer',
  'Efectivo',
  'Tarjeta de crédito',
  'Criptomoneda',
  'Otro',
];

export function formatMoney(value, currency = 'USD') {
  const n = Number(value || 0);
  return new Intl.NumberFormat('es-ES', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n) + ' ' + currency;
}

export function formatDate(iso) {
  if (!iso) return '—';
  try {
    // Soporta "YYYY-MM-DD" y ISO
    const d = iso.length === 10 ? new Date(iso + 'T00:00:00') : new Date(iso);
    return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return iso;
  }
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
