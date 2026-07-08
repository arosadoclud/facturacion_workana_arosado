"""Generador de PDF profesional para facturas usando ReportLab.
Estilo: encabezado oscuro navy con acentos cyan (inspirado en dashboards modernos).
"""
import base64
import io
from typing import Optional

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas
from reportlab.platypus import Paragraph
from reportlab.lib.utils import ImageReader


# Paleta — Andy Rosado brand
NAVY = colors.HexColor("#0A1426")          # fondo del header
NAVY_SOFT = colors.HexColor("#152239")     # rayas / cajas secundarias
CYAN = colors.HexColor("#00E5FF")          # acento principal (Cian Eléctrico)
CYAN_DARK = colors.HexColor("#00B8D4")
INK = colors.HexColor("#0A0A0A")
INK_SOFT = colors.HexColor("#334155")
INK_MUTED = colors.HexColor("#64748B")
LINE = colors.HexColor("#E9EEF3")          # gris claro brand
BG_ALT = colors.HexColor("#F5F8FB")
WHITE = colors.white

STATUS_COLORS = {
    "borrador": colors.HexColor("#94A3B8"),
    "enviada":  colors.HexColor("#38BDF8"),
    "pagada":   colors.HexColor("#4ADE80"),
    "vencida":  colors.HexColor("#F87171"),
    "anulada":  colors.HexColor("#CBD5E1"),
    "pendiente": colors.HexColor("#FBBF24"),
}


def _fmt_money(v: float, currency: str) -> str:
    try:
        return f"{v:,.2f} {currency}"
    except Exception:
        return f"{v} {currency}"


def _decode_logo(data_uri: str) -> Optional[ImageReader]:
    if not data_uri or not data_uri.startswith("data:"):
        return None
    try:
        _, b64 = data_uri.split(",", 1)
        raw = base64.b64decode(b64)
        return ImageReader(io.BytesIO(raw))
    except Exception:
        return None


def build_invoice_pdf(invoice: dict, settings: dict) -> bytes:
    """Genera PDF profesional con header navy + acentos cyan."""
    buf = io.BytesIO()
    W, H = A4
    c = canvas.Canvas(buf, pagesize=A4)

    margin = 16 * mm
    x0 = margin
    right = W - margin

    currency = invoice.get("currency", "USD")
    client_data = invoice.get("client") or {}

    # =====================================================
    # HEADER navy (ocupa todo el ancho, altura fija)
    # =====================================================
    header_h = 46 * mm
    c.setFillColor(NAVY)
    c.rect(0, H - header_h, W, header_h, stroke=0, fill=1)

    # Franja cyan inferior del header
    c.setFillColor(CYAN)
    c.rect(0, H - header_h, W, 1.4 * mm, stroke=0, fill=1)

    # Logo box a la izquierda
    logo_size = 22 * mm
    logo_x = x0
    logo_y = H - header_h + (header_h - logo_size) / 2 + 2 * mm

    logo = _decode_logo(settings.get("logo", ""))

    # Marco cyan alrededor del logo
    c.setStrokeColor(CYAN)
    c.setLineWidth(1.4)
    c.setFillColor(NAVY_SOFT)
    c.roundRect(logo_x, logo_y, logo_size, logo_size, 4, stroke=1, fill=1)

    if logo:
        try:
            c.drawImage(
                logo, logo_x + 2, logo_y + 2,
                width=logo_size - 4, height=logo_size - 4,
                preserveAspectRatio=True, mask="auto",
            )
        except Exception:
            _draw_logo_placeholder(c, settings, logo_x, logo_y, logo_size)
    else:
        _draw_logo_placeholder(c, settings, logo_x, logo_y, logo_size)

    # Título FACTURA + número
    title_x = logo_x + logo_size + 8 * mm
    title_y = H - header_h + header_h - 12 * mm
    c.setFillColor(WHITE)
    c.setFont("Helvetica-Bold", 24)
    c.drawString(title_x, title_y, "Factura")

    c.setFillColor(CYAN)
    c.setFont("Helvetica-Bold", 11)
    c.drawString(title_x, title_y - 14, f"#{invoice.get('number', '—')}")

    # Fechas a la derecha (blanco)
    c.setFillColor(WHITE)
    c.setFont("Helvetica", 9.5)
    c.drawRightString(right, title_y - 2, f"Emitida: {invoice.get('issue_date') or '—'}")
    if invoice.get("due_date"):
        c.setFillColor(colors.HexColor("#CBD5E1"))
        c.drawRightString(right, title_y - 15, f"Vence: {invoice['due_date']}")

    # Estado (texto en color)
    status = invoice.get("status", "borrador")
    status_color = STATUS_COLORS.get(status, STATUS_COLORS["borrador"])
    c.setFillColor(status_color)
    c.setFont("Helvetica-Bold", 10)
    c.drawRightString(right, title_y - 28, status.upper())

    # Datos del emisor (línea inferior del header, en blanco pequeñito)
    c.setFillColor(colors.HexColor("#94A3B8"))
    c.setFont("Helvetica", 8)
    footer_top = H - header_h + 5 * mm
    biz = (settings.get("business_name") or "").upper()
    if biz:
        c.setFillColor(WHITE)
        c.setFont("Helvetica-Bold", 8.5)
        c.drawString(x0, footer_top + 4, biz)

    c.setFillColor(colors.HexColor("#94A3B8"))
    c.setFont("Helvetica", 7.8)
    parts = []
    if settings.get("tax_id"):
        parts.append(f"{settings.get('tax_id_label', 'ID')}: {settings['tax_id']}")
    addr = ", ".join([p for p in [settings.get("address", ""), settings.get("city", ""), settings.get("country", "")] if p])
    if addr:
        parts.append(addr)
    if settings.get("phone"):
        parts.append(f"Tel: {settings['phone']}")
    if settings.get("email"):
        parts.append(settings["email"])
    line = "  ·  ".join(parts)
    if line:
        c.drawString(x0, footer_top - 4, line[:130])

    # =====================================================
    # BLOQUE CLIENTE + BOX de resumen
    # =====================================================
    y = H - header_h - 16 * mm

    c.setFillColor(INK_MUTED)
    c.setFont("Helvetica-Bold", 7.5)
    c.drawString(x0, y, "FACTURAR A")

    c.setFillColor(INK)
    c.setFont("Helvetica-Bold", 12)
    c.drawString(x0, y - 14, client_data.get("name", "—"))

    c.setFont("Helvetica", 9)
    c.setFillColor(INK_SOFT)
    cy = y - 28
    if client_data.get("tax_id"):
        c.drawString(x0, cy, f"{client_data.get('tax_id_label', 'ID Fiscal')}: {client_data['tax_id']}")
        cy -= 11
    caddr = ", ".join([p for p in [client_data.get("address", ""), client_data.get("city", ""), client_data.get("country", "")] if p])
    if caddr:
        c.drawString(x0, cy, caddr)
        cy -= 11
    if client_data.get("phone"):
        c.drawString(x0, cy, f"Tel: {client_data['phone']}")
        cy -= 11
    if client_data.get("email"):
        c.drawString(x0, cy, client_data["email"])
        cy -= 11

    # Caja resumen a la derecha
    box_w = 68 * mm
    box_h = 42 * mm
    box_x = right - box_w
    box_y = y - box_h + 6

    c.setFillColor(BG_ALT)
    c.setStrokeColor(LINE)
    c.setLineWidth(0.6)
    c.roundRect(box_x, box_y, box_w, box_h, 4, stroke=1, fill=1)

    # Barra cyan izquierda
    c.setFillColor(CYAN)
    c.rect(box_x, box_y, 1.4 * mm, box_h, stroke=0, fill=1)

    c.setFillColor(INK_MUTED)
    c.setFont("Helvetica-Bold", 7)
    c.drawString(box_x + 6 * mm, box_y + box_h - 10, "EMISIÓN")
    c.drawString(box_x + box_w / 2 + 2, box_y + box_h - 10, "VENCIMIENTO")

    c.setFillColor(INK)
    c.setFont("Helvetica-Bold", 10)
    c.drawString(box_x + 6 * mm, box_y + box_h - 24, invoice.get("issue_date") or "—")
    c.drawString(box_x + box_w / 2 + 2, box_y + box_h - 24, invoice.get("due_date") or "—")

    if invoice.get("payment_method"):
        c.setFillColor(INK_MUTED)
        c.setFont("Helvetica-Bold", 7)
        c.drawString(box_x + 6 * mm, box_y + 14, "MÉTODO DE PAGO")
        c.setFillColor(INK)
        c.setFont("Helvetica", 9)
        c.drawString(box_x + 6 * mm, box_y + 4, invoice.get("payment_method")[:32])

    # =====================================================
    # TABLA DE ITEMS
    # =====================================================
    y_table = min(cy, box_y) - 8

    # Header con fondo navy
    c.setFillColor(NAVY)
    c.roundRect(x0, y_table - 20, right - x0, 20, 3, stroke=0, fill=1)

    c.setFillColor(WHITE)
    c.setFont("Helvetica-Bold", 7.5)

    col_desc = x0 + 6
    col_qty_r = x0 + 100 * mm
    col_price_r = x0 + 122 * mm
    col_disc_r = x0 + 140 * mm
    col_tax_r = x0 + 158 * mm
    col_total_r = right - 2

    c.drawString(col_desc, y_table - 13, "DESCRIPCIÓN")
    c.drawRightString(col_qty_r, y_table - 13, "CANT.")
    c.drawRightString(col_price_r, y_table - 13, "PRECIO")
    c.drawRightString(col_disc_r, y_table - 13, "DESC%")
    c.drawRightString(col_tax_r, y_table - 13, "IMP%")
    c.drawRightString(col_total_r, y_table - 13, "SUBTOTAL")

    yy = y_table - 20

    styles = getSampleStyleSheet()
    body_style = ParagraphStyle(
        "body", parent=styles["BodyText"],
        fontName="Helvetica", fontSize=9, leading=11, textColor=INK,
    )

    apply_taxes = invoice.get("apply_taxes", True)
    items = invoice.get("items", [])

    for idx, it in enumerate(items):
        qty = float(it.get("quantity", 0) or 0)
        price = float(it.get("unit_price", 0) or 0)
        disc = float(it.get("discount", 0) or 0)
        tax = float(it.get("tax_rate", 0) or 0) if apply_taxes else 0.0
        line = qty * price
        line_after = line - line * (disc / 100.0)
        line_final = line_after + line_after * (tax / 100.0)

        # Calcular altura real basada en descripción
        p = Paragraph(it.get("description", ""), body_style)
        pw = 88 * mm
        _, ph = p.wrap(pw, 60)
        row_h = max(20, ph + 8)

        # Zebra
        if idx % 2 == 1:
            c.setFillColor(BG_ALT)
            c.rect(x0, yy - row_h, right - x0, row_h, stroke=0, fill=1)

        p.drawOn(c, col_desc, yy - row_h + (row_h - ph) / 2)

        c.setFillColor(INK)
        c.setFont("Helvetica", 9)
        mid_y = yy - row_h / 2 - 3
        c.drawRightString(col_qty_r, mid_y, f"{qty:g}")
        c.drawRightString(col_price_r, mid_y, f"{price:,.2f}")
        c.setFillColor(INK_MUTED)
        c.drawRightString(col_disc_r, mid_y, f"{disc:g}%" if disc else "—")
        c.drawRightString(col_tax_r, mid_y, f"{tax:g}%" if tax else "—")
        c.setFillColor(INK)
        c.setFont("Helvetica-Bold", 9.5)
        c.drawRightString(col_total_r, mid_y, f"{line_final:,.2f}")

        yy -= row_h

    # Línea inferior tabla
    c.setStrokeColor(LINE)
    c.setLineWidth(0.5)
    c.line(x0, yy, right, yy)

    # =====================================================
    # TOTALES (caja lateral con acento cyan)
    # =====================================================
    ty = yy - 14
    label_x = right - 70 * mm
    val_x = right

    subtotal = float(invoice.get("subtotal", 0))
    total_discount = float(invoice.get("total_discount", 0))
    total_tax = float(invoice.get("total_tax", 0))
    total = float(invoice.get("total", 0))

    def _line(label, value, muted=False):
        nonlocal ty
        c.setFillColor(INK_MUTED if muted else INK_SOFT)
        c.setFont("Helvetica", 10)
        c.drawRightString(label_x, ty, label)
        c.setFillColor(INK)
        c.setFont("Helvetica", 10)
        c.drawRightString(val_x, ty, value)
        ty -= 14

    _line("Subtotal", _fmt_money(subtotal, currency))
    if total_discount:
        _line("Descuentos", f"- {_fmt_money(total_discount, currency)}", muted=True)
    if apply_taxes and total_tax:
        _line("Impuestos", _fmt_money(total_tax, currency), muted=True)

    # Caja TOTAL con fondo navy
    ty -= 4
    total_box_h = 18 * mm
    total_box_y = ty - total_box_h + 4
    total_box_x = label_x - 4
    total_box_w = val_x - total_box_x

    c.setFillColor(NAVY)
    c.roundRect(total_box_x, total_box_y, total_box_w, total_box_h, 4, stroke=0, fill=1)
    # Franja cyan
    c.setFillColor(CYAN)
    c.rect(total_box_x, total_box_y, 1.4 * mm, total_box_h, stroke=0, fill=1)

    c.setFillColor(colors.HexColor("#CBD5E1"))
    c.setFont("Helvetica-Bold", 8.5)
    c.drawString(total_box_x + 6 * mm, total_box_y + total_box_h - 9, "TOTAL")

    c.setFillColor(WHITE)
    c.setFont("Helvetica-Bold", 16)
    c.drawRightString(val_x - 6, total_box_y + 6, _fmt_money(total, currency))

    ty = total_box_y - 12

    # =====================================================
    # NOTAS / TÉRMINOS
    # =====================================================
    footer_y = ty
    if invoice.get("notes"):
        c.setFillColor(INK_MUTED)
        c.setFont("Helvetica-Bold", 7.5)
        c.drawString(x0, footer_y, "NOTAS")
        p = Paragraph(
            invoice["notes"].replace("\n", "<br/>"),
            ParagraphStyle("n", fontName="Helvetica", fontSize=9, leading=11.5, textColor=INK_SOFT),
        )
        _, h = p.wrap(right - x0, 100)
        p.drawOn(c, x0, footer_y - h - 4)
        footer_y -= h + 20

    if invoice.get("terms"):
        c.setFillColor(INK_MUTED)
        c.setFont("Helvetica-Bold", 7.5)
        c.drawString(x0, footer_y, "TÉRMINOS Y CONDICIONES")
        p = Paragraph(
            invoice["terms"].replace("\n", "<br/>"),
            ParagraphStyle("t", fontName="Helvetica", fontSize=8.5, leading=11, textColor=INK_SOFT),
        )
        _, h = p.wrap(right - x0, 120)
        p.drawOn(c, x0, footer_y - h - 4)
        footer_y -= h + 16

    # Franja cyan inferior + pie legal
    legal = invoice.get("legal_footer") or settings.get("legal_footer") or ""
    c.setFillColor(CYAN)
    c.rect(0, 8 * mm, W, 0.8 * mm, stroke=0, fill=1)
    if legal:
        c.setFillColor(INK_MUTED)
        c.setFont("Helvetica-Oblique", 7.8)
        c.drawCentredString(W / 2, 4 * mm, legal[:200])

    c.showPage()
    c.save()
    return buf.getvalue()


def _draw_logo_placeholder(c, settings, x, y, size):
    """Dibuja una letra 'A' estilo Andy Rosado (cyan sobre navy) si no hay logo subido."""
    # Fondo ya dibujado (roundRect navy_soft). Dibujamos la 'A' geométrica en cyan.
    from reportlab.lib.units import mm as _mm
    cx = x + size / 2
    cy_bottom = y + size * 0.15
    cy_top = y + size * 0.85
    # Trazo: triángulo "A" con corte diagonal moderno
    p = c.beginPath()
    p.moveTo(cx, cy_top)                                # ápice
    p.lineTo(x + size * 0.85, cy_bottom)                # base derecha
    p.lineTo(x + size * 0.68, cy_bottom)                # esquina inferior derecha interna
    p.lineTo(x + size * 0.60, y + size * 0.35)          # arranque diagonal
    p.lineTo(x + size * 0.40, y + size * 0.35)          # diagonal a la izq
    p.lineTo(x + size * 0.32, cy_bottom)                # esquina inf izq interna
    p.lineTo(x + size * 0.15, cy_bottom)                # base izquierda
    p.close()
    c.setFillColor(CYAN)
    c.setStrokeColor(CYAN)
    c.drawPath(p, fill=1, stroke=0)
    # Hueco central de la A (triangulito)
    p2 = c.beginPath()
    p2.moveTo(cx, y + size * 0.72)
    p2.lineTo(x + size * 0.44, y + size * 0.48)
    p2.lineTo(x + size * 0.56, y + size * 0.48)
    p2.close()
    c.setFillColor(NAVY_SOFT)
    c.drawPath(p2, fill=1, stroke=0)
