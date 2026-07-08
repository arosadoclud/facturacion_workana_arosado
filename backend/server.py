"""
Facturación PRO - Backend FastAPI
Sistema profesional de facturación para freelancers e internacionales.
"""
import os
import base64
import io
from datetime import datetime, timezone, date
from typing import Annotated, Optional, List, Any
from pathlib import Path

from bson import ObjectId
from dotenv import load_dotenv
from fastapi import FastAPI, APIRouter, HTTPException, Response, Query
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, BeforeValidator, ConfigDict, EmailStr, Field

from pdf_generator import build_invoice_pdf

# ---------------------------------------------------------------------------
# Configuración
# ---------------------------------------------------------------------------
ROOT = Path(__file__).parent
load_dotenv(ROOT / ".env")

MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

app = FastAPI(title="Facturación PRO API")
api = APIRouter(prefix="/api")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Modelos base (ObjectId <-> str)
# ---------------------------------------------------------------------------
def _validate_object_id(v: Any) -> str:
    if isinstance(v, ObjectId):
        return str(v)
    if isinstance(v, str) and ObjectId.is_valid(v):
        return v
    raise ValueError("ObjectId inválido")


PyObjectId = Annotated[str, BeforeValidator(_validate_object_id)]


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _from_mongo(doc: Optional[dict]) -> Optional[dict]:
    if doc is None:
        return None
    doc = dict(doc)
    doc["id"] = str(doc.pop("_id"))
    return doc


# ---------------------------------------------------------------------------
# Modelos: Settings (perfil del emisor / freelancer)
# ---------------------------------------------------------------------------
class Settings(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    business_name: str = "Andy Rosado — Soluciones Digitales"
    tax_id_label: str = "ID Fiscal"  # RNC, NIF, RFC, CUIT, VAT, etc
    tax_id: str = ""
    country: str = ""
    city: str = ""
    address: str = ""
    phone: str = ""
    email: str = ""
    logo: str = ""  # base64 data-URI
    default_currency: str = "USD"
    default_tax_rate: float = 0.0
    default_tax_label: str = "IVA"
    apply_taxes: bool = False
    legal_footer: str = ""
    default_terms: str = ""
    invoice_prefix: str = "FAC-2026"
    next_invoice_number: int = 1


# ---------------------------------------------------------------------------
# Modelos: Cliente
# ---------------------------------------------------------------------------
class ClientBase(BaseModel):
    name: str
    tax_id_label: str = "ID Fiscal"
    tax_id: str = ""
    country: str = ""
    city: str = ""
    address: str = ""
    phone: str = ""
    email: str = ""
    notes: str = ""


class ClientCreate(ClientBase):
    pass


class ClientOut(ClientBase):
    id: str
    created_at: datetime
    updated_at: datetime


# ---------------------------------------------------------------------------
# Modelos: Factura
# ---------------------------------------------------------------------------
class InvoiceItem(BaseModel):
    description: str
    quantity: float = 1
    unit_price: float = 0
    discount: float = 0  # porcentaje 0-100 por línea
    tax_rate: float = 0  # porcentaje 0-100 por línea


class InvoiceBase(BaseModel):
    number: Optional[str] = None  # ej "FAC-0001", editable
    client_id: str
    issue_date: str  # ISO date "YYYY-MM-DD"
    due_date: Optional[str] = None
    currency: str = "USD"
    items: List[InvoiceItem] = []
    global_discount: float = 0  # descuento adicional en monto
    apply_taxes: bool = True
    status: str = "borrador"  # borrador, enviada, pagada, vencida, anulada
    payment_method: str = ""
    notes: str = ""
    terms: str = ""
    legal_footer: str = ""


class InvoiceCreate(InvoiceBase):
    pass


class InvoiceOut(InvoiceBase):
    id: str
    subtotal: float
    total_discount: float
    total_tax: float
    total: float
    client: Optional[dict] = None
    created_at: datetime
    updated_at: datetime


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _compute_totals(items: List[InvoiceItem], global_discount: float, apply_taxes: bool) -> dict:
    subtotal = 0.0
    total_discount = 0.0
    total_tax = 0.0
    for it in items:
        line = it.quantity * it.unit_price
        line_disc = line * (it.discount / 100.0)
        line_after_disc = line - line_disc
        line_tax = line_after_disc * (it.tax_rate / 100.0) if apply_taxes else 0.0
        subtotal += line
        total_discount += line_disc
        total_tax += line_tax
    total_discount += max(0.0, global_discount)
    total = subtotal - total_discount + total_tax
    return {
        "subtotal": round(subtotal, 2),
        "total_discount": round(total_discount, 2),
        "total_tax": round(total_tax, 2),
        "total": round(total, 2),
    }


async def _next_invoice_number() -> str:
    settings = await _get_settings()
    prefix = settings.get("invoice_prefix", "FAC")
    n = int(settings.get("next_invoice_number", 1))
    return f"{prefix}-{n:04d}"


async def _bump_invoice_number():
    await db.settings.update_one(
        {"_id": "singleton"},
        {"$inc": {"next_invoice_number": 1}},
        upsert=True,
    )


async def _get_settings() -> dict:
    doc = await db.settings.find_one({"_id": "singleton"})
    if not doc:
        default = Settings().model_dump()
        default["_id"] = "singleton"
        default["created_at"] = _now()
        default["updated_at"] = _now()
        await db.settings.insert_one(default)
        doc = default
    doc.pop("_id", None)
    return doc


def _mark_overdue_status(invoice: dict) -> dict:
    """Si la factura tiene fecha vencimiento pasada y no está pagada/anulada -> vencida (solo en respuesta, no persiste)."""
    if invoice.get("status") in ("pagada", "anulada", "borrador"):
        return invoice
    due = invoice.get("due_date")
    if due:
        try:
            due_d = datetime.strptime(due, "%Y-%m-%d").date()
            if due_d < date.today() and invoice.get("status") != "pagada":
                invoice = dict(invoice)
                invoice["status"] = "vencida"
        except Exception:
            pass
    return invoice


# ---------------------------------------------------------------------------
# Endpoints: Settings
# ---------------------------------------------------------------------------
@api.get("/settings")
async def get_settings():
    return await _get_settings()


@api.put("/settings")
async def update_settings(data: Settings):
    payload = data.model_dump()
    payload["updated_at"] = _now()
    await db.settings.update_one(
        {"_id": "singleton"},
        {"$set": payload, "$setOnInsert": {"created_at": _now()}},
        upsert=True,
    )
    return await _get_settings()


# ---------------------------------------------------------------------------
# Endpoints: Clientes
# ---------------------------------------------------------------------------
@api.get("/clients")
async def list_clients():
    docs = await db.clients.find().sort("name", 1).to_list(1000)
    return [_from_mongo(d) for d in docs]


@api.get("/clients/{client_id}")
async def get_client(client_id: str):
    if not ObjectId.is_valid(client_id):
        raise HTTPException(400, "ID inválido")
    doc = await db.clients.find_one({"_id": ObjectId(client_id)})
    if not doc:
        raise HTTPException(404, "Cliente no encontrado")
    result = _from_mongo(doc)
    # Historial de facturas
    invs = await db.invoices.find({"client_id": client_id}).sort("issue_date", -1).to_list(1000)
    result["invoices"] = [_mark_overdue_status(_from_mongo(i)) for i in invs]
    return result


@api.post("/clients")
async def create_client(data: ClientCreate):
    payload = data.model_dump()
    payload["created_at"] = _now()
    payload["updated_at"] = _now()
    r = await db.clients.insert_one(payload)
    doc = await db.clients.find_one({"_id": r.inserted_id})
    return _from_mongo(doc)


@api.put("/clients/{client_id}")
async def update_client(client_id: str, data: ClientCreate):
    if not ObjectId.is_valid(client_id):
        raise HTTPException(400, "ID inválido")
    payload = data.model_dump()
    payload["updated_at"] = _now()
    r = await db.clients.update_one({"_id": ObjectId(client_id)}, {"$set": payload})
    if r.matched_count == 0:
        raise HTTPException(404, "Cliente no encontrado")
    doc = await db.clients.find_one({"_id": ObjectId(client_id)})
    return _from_mongo(doc)


@api.delete("/clients/{client_id}")
async def delete_client(client_id: str):
    if not ObjectId.is_valid(client_id):
        raise HTTPException(400, "ID inválido")
    r = await db.clients.delete_one({"_id": ObjectId(client_id)})
    if r.deleted_count == 0:
        raise HTTPException(404, "Cliente no encontrado")
    return {"ok": True}


# ---------------------------------------------------------------------------
# Endpoints: Facturas
# ---------------------------------------------------------------------------
async def _hydrate_invoice(doc: dict) -> dict:
    inv = _from_mongo(doc)
    cid = inv.get("client_id")
    if cid and ObjectId.is_valid(cid):
        c = await db.clients.find_one({"_id": ObjectId(cid)})
        inv["client"] = _from_mongo(c) if c else None
    totals = _compute_totals(
        [InvoiceItem(**it) for it in inv.get("items", [])],
        inv.get("global_discount", 0),
        inv.get("apply_taxes", True),
    )
    inv.update(totals)
    return _mark_overdue_status(inv)


@api.get("/invoices")
async def list_invoices(
    status: Optional[str] = None,
    client_id: Optional[str] = None,
    q: Optional[str] = None,
):
    query: dict = {}
    if status:
        query["status"] = status
    if client_id:
        query["client_id"] = client_id
    if q:
        query["$or"] = [
            {"number": {"$regex": q, "$options": "i"}},
            {"notes": {"$regex": q, "$options": "i"}},
        ]
    docs = await db.invoices.find(query).sort("issue_date", -1).to_list(1000)
    return [await _hydrate_invoice(d) for d in docs]


@api.get("/invoices/{invoice_id}")
async def get_invoice(invoice_id: str):
    if not ObjectId.is_valid(invoice_id):
        raise HTTPException(400, "ID inválido")
    doc = await db.invoices.find_one({"_id": ObjectId(invoice_id)})
    if not doc:
        raise HTTPException(404, "Factura no encontrada")
    return await _hydrate_invoice(doc)


@api.post("/invoices")
async def create_invoice(data: InvoiceCreate):
    if not ObjectId.is_valid(data.client_id):
        raise HTTPException(400, "Cliente inválido")
    c = await db.clients.find_one({"_id": ObjectId(data.client_id)})
    if not c:
        raise HTTPException(400, "Cliente no existe")

    payload = data.model_dump()
    if not payload.get("number"):
        payload["number"] = await _next_invoice_number()
        await _bump_invoice_number()
    else:
        # Si el usuario proporcionó un número editado, no bump
        pass

    # Evitar duplicados de número
    existing = await db.invoices.find_one({"number": payload["number"]})
    if existing:
        raise HTTPException(400, f"El número de factura {payload['number']} ya existe")

    payload["created_at"] = _now()
    payload["updated_at"] = _now()
    r = await db.invoices.insert_one(payload)
    doc = await db.invoices.find_one({"_id": r.inserted_id})
    return await _hydrate_invoice(doc)


@api.put("/invoices/{invoice_id}")
async def update_invoice(invoice_id: str, data: InvoiceCreate):
    if not ObjectId.is_valid(invoice_id):
        raise HTTPException(400, "ID inválido")
    payload = data.model_dump()
    payload["updated_at"] = _now()

    # Si se cambia el número, validar unicidad
    if payload.get("number"):
        existing = await db.invoices.find_one({
            "number": payload["number"],
            "_id": {"$ne": ObjectId(invoice_id)},
        })
        if existing:
            raise HTTPException(400, f"El número {payload['number']} ya está en uso")

    r = await db.invoices.update_one({"_id": ObjectId(invoice_id)}, {"$set": payload})
    if r.matched_count == 0:
        raise HTTPException(404, "Factura no encontrada")
    doc = await db.invoices.find_one({"_id": ObjectId(invoice_id)})
    return await _hydrate_invoice(doc)


@api.patch("/invoices/{invoice_id}/status")
async def change_status(invoice_id: str, body: dict):
    if not ObjectId.is_valid(invoice_id):
        raise HTTPException(400, "ID inválido")
    status = body.get("status")
    if status not in ("borrador", "enviada", "pagada", "vencida", "anulada"):
        raise HTTPException(400, "Estado inválido")
    r = await db.invoices.update_one(
        {"_id": ObjectId(invoice_id)},
        {"$set": {"status": status, "updated_at": _now()}},
    )
    if r.matched_count == 0:
        raise HTTPException(404, "Factura no encontrada")
    doc = await db.invoices.find_one({"_id": ObjectId(invoice_id)})
    return await _hydrate_invoice(doc)


@api.delete("/invoices/{invoice_id}")
async def delete_invoice(invoice_id: str):
    if not ObjectId.is_valid(invoice_id):
        raise HTTPException(400, "ID inválido")
    r = await db.invoices.delete_one({"_id": ObjectId(invoice_id)})
    if r.deleted_count == 0:
        raise HTTPException(404, "Factura no encontrada")
    return {"ok": True}


@api.get("/invoices/{invoice_id}/pdf")
async def invoice_pdf(invoice_id: str):
    if not ObjectId.is_valid(invoice_id):
        raise HTTPException(400, "ID inválido")
    doc = await db.invoices.find_one({"_id": ObjectId(invoice_id)})
    if not doc:
        raise HTTPException(404, "Factura no encontrada")
    invoice = await _hydrate_invoice(doc)
    settings = await _get_settings()
    pdf_bytes = build_invoice_pdf(invoice, settings)
    number = invoice.get("number", "factura")
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{number}.pdf"'},
    )


# ---------------------------------------------------------------------------
# Endpoints: Reportes / Dashboard
# ---------------------------------------------------------------------------
@api.get("/reports/summary")
async def report_summary():
    invoices = await db.invoices.find().to_list(5000)
    clients_count = await db.clients.count_documents({})

    total_invoiced = 0.0
    total_paid = 0.0
    total_pending = 0.0
    total_overdue = 0.0
    count_paid = 0
    count_pending = 0
    count_overdue = 0
    count_draft = 0

    today = date.today()
    for d in invoices:
        totals = _compute_totals(
            [InvoiceItem(**it) for it in d.get("items", [])],
            d.get("global_discount", 0),
            d.get("apply_taxes", True),
        )
        total = totals["total"]
        status = d.get("status", "borrador")
        # Detectar vencidas dinámicamente
        if status not in ("pagada", "anulada", "borrador"):
            due = d.get("due_date")
            if due:
                try:
                    if datetime.strptime(due, "%Y-%m-%d").date() < today:
                        status = "vencida"
                except Exception:
                    pass

        if status == "anulada":
            continue

        if status != "borrador":
            total_invoiced += total

        if status == "pagada":
            total_paid += total
            count_paid += 1
        elif status == "vencida":
            total_overdue += total
            count_overdue += 1
        elif status in ("enviada", "pendiente"):
            total_pending += total
            count_pending += 1
        elif status == "borrador":
            count_draft += 1

    return {
        "total_invoiced": round(total_invoiced, 2),
        "total_paid": round(total_paid, 2),
        "total_pending": round(total_pending, 2),
        "total_overdue": round(total_overdue, 2),
        "clients_count": clients_count,
        "invoices_count": len(invoices),
        "count_paid": count_paid,
        "count_pending": count_pending,
        "count_overdue": count_overdue,
        "count_draft": count_draft,
    }


@api.get("/reports/monthly")
async def report_monthly(year: Optional[int] = None):
    y = year or datetime.now().year
    invoices = await db.invoices.find().to_list(5000)
    months = {i: {"month": i, "invoiced": 0.0, "paid": 0.0, "count": 0} for i in range(1, 13)}
    for d in invoices:
        if d.get("status") == "anulada":
            continue
        iss = d.get("issue_date")
        if not iss:
            continue
        try:
            dt = datetime.strptime(iss, "%Y-%m-%d")
        except Exception:
            continue
        if dt.year != y:
            continue
        totals = _compute_totals(
            [InvoiceItem(**it) for it in d.get("items", [])],
            d.get("global_discount", 0),
            d.get("apply_taxes", True),
        )
        m = months[dt.month]
        m["invoiced"] += totals["total"]
        m["count"] += 1
        if d.get("status") == "pagada":
            m["paid"] += totals["total"]

    return {"year": y, "months": [
        {**months[i], "invoiced": round(months[i]["invoiced"], 2), "paid": round(months[i]["paid"], 2)}
        for i in range(1, 13)
    ]}


@api.get("/reports/top-clients")
async def report_top_clients(limit: int = 5):
    invoices = await db.invoices.find().to_list(5000)
    by_client: dict = {}
    for d in invoices:
        if d.get("status") == "anulada":
            continue
        cid = d.get("client_id")
        totals = _compute_totals(
            [InvoiceItem(**it) for it in d.get("items", [])],
            d.get("global_discount", 0),
            d.get("apply_taxes", True),
        )
        if cid not in by_client:
            by_client[cid] = {"client_id": cid, "total": 0.0, "count": 0}
        by_client[cid]["total"] += totals["total"]
        by_client[cid]["count"] += 1

    # Enriquecer con nombre
    result = []
    for cid, agg in by_client.items():
        if ObjectId.is_valid(cid):
            c = await db.clients.find_one({"_id": ObjectId(cid)})
            if c:
                result.append({
                    "client_id": cid,
                    "name": c.get("name", "—"),
                    "total": round(agg["total"], 2),
                    "count": agg["count"],
                })
    result.sort(key=lambda x: x["total"], reverse=True)
    return result[:limit]


@api.get("/reports/export-csv")
async def export_csv():
    invoices = await db.invoices.find().sort("issue_date", -1).to_list(5000)
    rows = ["Número,Cliente,Fecha emisión,Fecha vencimiento,Estado,Moneda,Subtotal,Descuento,Impuestos,Total"]
    for d in invoices:
        cid = d.get("client_id")
        cname = ""
        if cid and ObjectId.is_valid(cid):
            c = await db.clients.find_one({"_id": ObjectId(cid)})
            if c:
                cname = c.get("name", "")
        totals = _compute_totals(
            [InvoiceItem(**it) for it in d.get("items", [])],
            d.get("global_discount", 0),
            d.get("apply_taxes", True),
        )
        rows.append(",".join([
            f'"{d.get("number", "")}"',
            f'"{cname}"',
            d.get("issue_date", ""),
            d.get("due_date", "") or "",
            d.get("status", ""),
            d.get("currency", ""),
            f'{totals["subtotal"]:.2f}',
            f'{totals["total_discount"]:.2f}',
            f'{totals["total_tax"]:.2f}',
            f'{totals["total"]:.2f}',
        ]))
    csv = "\n".join(rows)
    return Response(
        content=csv,
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="facturas.csv"'},
    )


@api.get("/")
async def root():
    return {"app": "Facturación PRO", "status": "ok"}


app.include_router(api)


@app.on_event("shutdown")
async def shutdown():
    client.close()
