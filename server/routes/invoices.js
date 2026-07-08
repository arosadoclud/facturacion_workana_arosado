import express from 'express';
import PDFDocument from 'pdfkit';
import path from 'path';
import { fileURLToPath } from 'url';
import Invoice from '../models/Invoice.js';
import Client from '../models/Client.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOGO_PATH = path.join(__dirname, '..', 'assets', 'logo.png');

const ACCENT = '#0891b2';
const ACCENT_DARK = '#0f172a';
const TEXT_MUTED = '#64748b';

const router = express.Router();

router.get('/', async (req, res) => {
  const invoices = await Invoice.find().populate('client').sort({ number: -1 });
  res.json(invoices);
});

router.get('/:id', async (req, res) => {
  const invoice = await Invoice.findById(req.params.id).populate('client');
  if (!invoice) return res.status(404).json({ error: 'Factura no encontrada' });
  res.json(invoice);
});

router.post('/', async (req, res) => {
  try {
    const client = await Client.findById(req.body.client);
    if (!client) return res.status(400).json({ error: 'Cliente inválido' });

    const last = await Invoice.findOne().sort({ number: -1 });
    const nextNumber = last ? last.number + 1 : 1;

    const invoice = await Invoice.create({ ...req.body, number: nextNumber });
    const populated = await invoice.populate('client');
    res.status(201).json(populated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { number, ...updates } = req.body;
    if (updates.client) {
      const client = await Client.findById(updates.client);
      if (!client) return res.status(400).json({ error: 'Cliente inválido' });
    }
    const invoice = await Invoice.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    }).populate('client');
    if (!invoice) return res.status(404).json({ error: 'Factura no encontrada' });
    res.json(invoice);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  const invoice = await Invoice.findByIdAndDelete(req.params.id);
  if (!invoice) return res.status(404).json({ error: 'Factura no encontrada' });
  res.json({ ok: true });
});

router.get('/:id/pdf', async (req, res) => {
  const invoice = await Invoice.findById(req.params.id).populate('client');
  if (!invoice) return res.status(404).json({ error: 'Factura no encontrada' });

  const doc = new PDFDocument({ margin: 0, size: 'A4' });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=factura-${invoice.number}.pdf`);
  doc.pipe(res);

  const pageWidth = doc.page.width;
  const marginX = 50;
  const total = invoice.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

  // Header band
  doc.rect(0, 0, pageWidth, 130).fill(ACCENT_DARK);
  try {
    doc.image(LOGO_PATH, marginX, 30, { width: 60, height: 60 });
  } catch {
    // logo opcional
  }
  doc
    .fillColor('#ffffff')
    .fontSize(22)
    .text('Factura', marginX + 75, 38, { width: 250 });
  doc
    .fillColor(ACCENT)
    .fontSize(13)
    .text(`#${String(invoice.number).padStart(4, '0')}`, marginX + 75, 66, { width: 250 });

  doc
    .fillColor('#ffffff')
    .fontSize(10)
    .text(`Emitida: ${new Date(invoice.issueDate).toLocaleDateString()}`, pageWidth - marginX - 200, 45, {
      width: 200,
      align: 'right',
    });
  if (invoice.dueDate) {
    doc
      .fillColor('#cbd5e1')
      .text(`Vence: ${new Date(invoice.dueDate).toLocaleDateString()}`, pageWidth - marginX - 200, 62, {
        width: 200,
        align: 'right',
      });
  }
  doc
    .fillColor(invoice.status === 'pagada' ? '#4ade80' : '#fbbf24')
    .fontSize(11)
    .text(invoice.status.toUpperCase(), pageWidth - marginX - 200, 82, { width: 200, align: 'right' });

  // Client card
  const cardTop = 160;
  doc.fillColor(TEXT_MUTED).fontSize(9).text('FACTURAR A', marginX, cardTop);
  doc
    .fillColor(ACCENT_DARK)
    .fontSize(13)
    .text(invoice.client.name, marginX, cardTop + 14);
  let clientY = cardTop + 32;
  doc.fillColor(TEXT_MUTED).fontSize(10);
  if (invoice.client.email) {
    doc.text(invoice.client.email, marginX, clientY);
    clientY += 14;
  }
  if (invoice.client.country) {
    doc.text(invoice.client.country, marginX, clientY);
    clientY += 14;
  }
  if (invoice.client.taxId) {
    doc.text(`ID fiscal: ${invoice.client.taxId}`, marginX, clientY);
    clientY += 14;
  }

  // Items table
  const tableTop = clientY + 30;
  doc.rect(marginX, tableTop, pageWidth - marginX * 2, 26).fill(ACCENT);
  doc
    .fillColor('#ffffff')
    .fontSize(10)
    .text('DESCRIPCIÓN', marginX + 12, tableTop + 8, { width: 220 })
    .text('CANT.', marginX + 240, tableTop + 8, { width: 60, align: 'right' })
    .text('PRECIO UNIT.', marginX + 300, tableTop + 8, { width: 90, align: 'right' })
    .text('SUBTOTAL', marginX + 390, tableTop + 8, { width: 105, align: 'right' });

  let y = tableTop + 26;
  invoice.items.forEach((item, i) => {
    const rowHeight = 26;
    if (i % 2 === 1) {
      doc.rect(marginX, y, pageWidth - marginX * 2, rowHeight).fill('#f1f5f9');
    }
    const subtotal = item.quantity * item.unitPrice;
    doc
      .fillColor(ACCENT_DARK)
      .fontSize(10)
      .text(item.description, marginX + 12, y + 8, { width: 220 })
      .fillColor('#334155')
      .text(String(item.quantity), marginX + 240, y + 8, { width: 60, align: 'right' })
      .text(item.unitPrice.toFixed(2), marginX + 300, y + 8, { width: 90, align: 'right' })
      .fillColor(ACCENT_DARK)
      .text(subtotal.toFixed(2), marginX + 390, y + 8, { width: 105, align: 'right' });
    y += rowHeight;
  });

  // Total
  y += 15;
  doc.moveTo(marginX + 240, y).lineTo(pageWidth - marginX, y).strokeColor('#e2e8f0').stroke();
  y += 12;
  doc
    .fillColor(TEXT_MUTED)
    .fontSize(11)
    .text('TOTAL', marginX + 300, y, { width: 90, align: 'right' });
  doc
    .fillColor(ACCENT)
    .fontSize(16)
    .text(`${total.toFixed(2)} ${invoice.currency}`, marginX + 300, y + 14, { width: 195, align: 'right' });

  if (invoice.notes) {
    y += 60;
    doc.fillColor(TEXT_MUTED).fontSize(9).text('NOTAS', marginX, y);
    doc.fillColor('#334155').fontSize(10).text(invoice.notes, marginX, y + 14, { width: pageWidth - marginX * 2 });
  }

  doc
    .fillColor('#94a3b8')
    .fontSize(8)
    .text('Generado con Facturación Workana', marginX, doc.page.height - 40, {
      width: pageWidth - marginX * 2,
      align: 'center',
    });

  doc.end();
});

export default router;
