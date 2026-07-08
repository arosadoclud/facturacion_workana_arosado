# Facturación PRO — PRD

## Problema original
Mejorar el sistema de facturación existente (que estaba en Node/Express + Vite) y convertirlo en una plataforma profesional, limpia y funcional para freelancers, autónomos y pequeños prestadores de servicios, con soporte fiscal internacional y PDF profesional.

## Arquitectura implementada (Ene 2026)
- **Backend**: FastAPI (Python 3.11) + Motor async + MongoDB. Puerto 8001. Todos los endpoints bajo `/api`.
- **Frontend**: React 18 (CRA con CRACO) + Tailwind CSS + React Router 6 + Recharts + Lucide icons + Axios. Puerto 3000.
- **PDF**: ReportLab (backend) — estética navy con acentos cyan (referencia visual del usuario).
- **Sin autenticación** (app de un solo usuario). Idioma español.
- El sistema anterior (`/app/server` + `/app/client`) fue migrado al stack estándar de la plataforma; se mantuvieron y ampliaron todas las funcionalidades.

## Personas
- **Freelancer/autónomo internacional**: emite facturas a clientes de distintos países con IDs fiscales variables (RNC, RFC, NIF, CUIT, VAT, RUT, RUC, etc.) y monedas múltiples.

## Requisitos core (estáticos)
1. Perfil del emisor con datos fiscales, logo, moneda default, textos legales y prefijo de factura.
2. Gestión de clientes con datos fiscales internacionales e historial.
3. Facturas profesionales con número auto-editable, fechas, items con desc/precio/descuento/impuestos, estados (borrador/enviada/pagada/vencida/anulada), método de pago, notas, T&C.
4. Multi-moneda (19 monedas) y país (30+ con presets automáticos de tax label y tasa).
5. Dashboard con KPIs (facturado/cobrado/pendiente/vencido, gráfico mensual, top clientes, actividad reciente).
6. PDF descargable profesional con logo, header navy + cyan, tabla de items, totales destacados, notas, T&C, pie legal.
7. Reportes con gráfico dual (facturado vs cobrado), tendencia mensual, ranking clientes, exportar CSV.

## Implementado
- [x] `PUT/GET /api/settings` — perfil del emisor
- [x] CRUD clientes con historial (`/api/clients`)
- [x] CRUD facturas con auto-numbering y validación de unicidad (`/api/invoices`)
- [x] Cálculo de totales por línea (desc %, impuesto %) + descuento global (monto)
- [x] Detección dinámica de facturas vencidas (basada en due_date < hoy)
- [x] `PATCH /api/invoices/{id}/status` cambio de estado
- [x] `GET /api/invoices/{id}/pdf` — PDF con ReportLab (header navy + acentos cyan, estado colorizado, caja resumen, caja TOTAL destacada)
- [x] `GET /api/reports/summary|monthly|top-clients|export-csv`
- [x] Frontend con Sidebar persistente + 5 secciones (Panel, Facturas, Clientes, Reportes, Configuración)
- [x] Formulario de factura con items dinámicos, cálculos live y sidebar de resumen sticky
- [x] Autocompletado de tax_id_label y tasa impuestos por país
- [x] Upload de logo (base64 data URI)
- [x] Filtros y búsqueda en Facturas (por estado, número, cliente, notas)
- [x] Diseño profesional Swiss/Editorial: fondo `#F9F9F8`, tipografía Cabinet Grotesk + Satoshi + JetBrains Mono, layout asimétrico, hover-lift micro-animaciones
- [x] Data-testid en todos los elementos interactivos
- [x] Testing agent: 19/19 backend tests pasando; flujos frontend core verificados
- [x] PDF con color (encabezado navy oscuro + acentos cyan estilo dashboard, estado en color)

## Backlog / Próximos pasos sugeridos (P1)
- Envío de factura por email (con SendGrid/Resend integración)
- Recordatorios automáticos de facturas vencidas
- Múltiples plantillas de PDF seleccionables por el usuario
- Recibos de pago separados
- Multi-usuario con auth (si el freelancer contrata asistente)
- Adjuntar comprobantes de pago
- Firma electrónica del emisor en el PDF

## Backlog / P2
- Presupuestos convertibles a facturas
- Recurrencia (facturas mensuales automáticas)
- Integración con contabilidad (exportar a QuickBooks/Xero)
- App móvil / PWA
- Facturación electrónica local por país (SUNAT, DGII, AFIP, SAT)

## Notas técnicas
- MongoDB: `_id` mapeado a `id` (string) en respuestas. Nunca se serializa `ObjectId` crudo.
- Timezones: `datetime.now(timezone.utc)` en todos los timestamps.
- Estado "vencida" NO se persiste automáticamente: se calcula al leer para no bloquear cambios manuales del usuario.
- `next_invoice_number` es un contador atómico (`$inc` en Mongo) por prefijo.
- Sin secretos hardcoded. Variables desde `.env`.
