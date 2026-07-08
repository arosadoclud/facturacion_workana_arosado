"""
Backend tests for Facturación PRO.
Covers: settings, clients CRUD, invoices CRUD + auto-number + totals + status,
overdue dynamic detection, PDF endpoint, reports (summary, monthly, top-clients, export-csv).
"""
import os
import io
from datetime import date, timedelta

import pytest
import requests

BASE = os.environ.get("REACT_APP_BACKEND_URL") or os.environ.get("BACKEND_URL")
if not BASE:
    # fallback to frontend .env (declared for the same public host)
    from pathlib import Path
    envp = Path("/app/frontend/.env")
    if envp.exists():
        for line in envp.read_text().splitlines():
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE = line.split("=", 1)[1].strip()
                break
BASE = (BASE or "").rstrip("/")
API = f"{BASE}/api"


@pytest.fixture(scope="session")
def http():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# -------- Settings --------
class TestSettings:
    def test_get_settings_default_singleton(self, http):
        r = http.get(f"{API}/settings")
        assert r.status_code == 200
        data = r.json()
        assert "business_name" in data
        assert "invoice_prefix" in data
        assert "next_invoice_number" in data
        assert isinstance(data["next_invoice_number"], int)

    def test_put_settings_persists(self, http):
        payload = {
            "business_name": "TEST_Freelancer SRL",
            "tax_id_label": "RNC",
            "tax_id": "1-30-99999-9",
            "country": "República Dominicana",
            "city": "Santo Domingo",
            "address": "Av. Winston Churchill 100",
            "phone": "+18095551234",
            "email": "test@freelancer.do",
            "logo": "",
            "default_currency": "DOP",
            "default_tax_rate": 18.0,
            "default_tax_label": "ITBIS",
            "apply_taxes": True,
            "legal_footer": "Emitido conforme la Norma 06-18 de la DGII",
            "default_terms": "Pago a 15 días.",
            "invoice_prefix": "TEST",
            "next_invoice_number": 1,
        }
        r = http.put(f"{API}/settings", json=payload)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["business_name"] == "TEST_Freelancer SRL"
        assert d["tax_id_label"] == "RNC"
        assert d["country"] == "República Dominicana"
        assert d["default_currency"] == "DOP"
        assert d["apply_taxes"] is True
        assert d["invoice_prefix"] == "TEST"
        assert int(d["next_invoice_number"]) == 1

        # GET to confirm persistence
        r2 = http.get(f"{API}/settings")
        assert r2.status_code == 200
        d2 = r2.json()
        assert d2["business_name"] == "TEST_Freelancer SRL"
        assert d2["invoice_prefix"] == "TEST"


# -------- Clients --------
@pytest.fixture(scope="session")
def created_client_id(http):
    payload = {
        "name": "TEST_Cliente Internacional",
        "tax_id_label": "RNC",
        "tax_id": "1-01-12345-6",
        "country": "República Dominicana",
        "city": "Santiago",
        "address": "Calle del Sol 25",
        "phone": "+18095550000",
        "email": "TEST_client@example.com",
        "notes": "Cliente de prueba",
    }
    r = http.post(f"{API}/clients", json=payload)
    assert r.status_code == 200, r.text
    d = r.json()
    assert "id" in d and d["name"] == payload["name"]
    yield d["id"]
    # teardown: delete
    http.delete(f"{API}/clients/{d['id']}")


class TestClients:
    def test_list_clients_includes_created(self, http, created_client_id):
        r = http.get(f"{API}/clients")
        assert r.status_code == 200
        ids = [c["id"] for c in r.json()]
        assert created_client_id in ids

    def test_get_client_with_history(self, http, created_client_id):
        r = http.get(f"{API}/clients/{created_client_id}")
        assert r.status_code == 200
        d = r.json()
        assert d["id"] == created_client_id
        assert d["tax_id_label"] == "RNC"
        assert d["country"] == "República Dominicana"
        assert "invoices" in d
        assert isinstance(d["invoices"], list)

    def test_update_client(self, http, created_client_id):
        payload = {
            "name": "TEST_Cliente Internacional",
            "tax_id_label": "RNC",
            "tax_id": "1-01-12345-6",
            "country": "República Dominicana",
            "city": "Puerto Plata",  # cambiado
            "address": "Nueva dirección 100",
            "phone": "+18095550000",
            "email": "TEST_client@example.com",
            "notes": "Actualizado",
        }
        r = http.put(f"{API}/clients/{created_client_id}", json=payload)
        assert r.status_code == 200
        assert r.json()["city"] == "Puerto Plata"

    def test_get_invalid_client_returns_404(self, http):
        # Valid ObjectId format but non-existent
        r = http.get(f"{API}/clients/507f1f77bcf86cd799439011")
        assert r.status_code == 404


# -------- Invoices --------
@pytest.fixture(scope="session")
def invoice_setup(http, created_client_id):
    """Reset invoice prefix/next_number so auto-numbering starts from 1 under 'TEST'."""
    # Ensure clean settings for prefix/number
    settings_payload = {
        "business_name": "TEST_Freelancer SRL",
        "tax_id_label": "RNC",
        "tax_id": "1-30-99999-9",
        "country": "República Dominicana",
        "city": "Santo Domingo",
        "address": "Av. Winston Churchill 100",
        "phone": "+18095551234",
        "email": "test@freelancer.do",
        "logo": "",
        "default_currency": "DOP",
        "default_tax_rate": 18.0,
        "default_tax_label": "ITBIS",
        "apply_taxes": True,
        "legal_footer": "",
        "default_terms": "",
        "invoice_prefix": "TESTINV",
        "next_invoice_number": 9001,  # to avoid conflicts across runs
    }
    http.put(f"{API}/settings", json=settings_payload)
    return {"client_id": created_client_id}


class TestInvoices:
    def test_create_invoice_auto_number_and_totals(self, http, invoice_setup):
        payload = {
            "client_id": invoice_setup["client_id"],
            "issue_date": date.today().isoformat(),
            "due_date": (date.today() + timedelta(days=30)).isoformat(),
            "currency": "DOP",
            "items": [
                {"description": "Servicio A", "quantity": 1, "unit_price": 25000, "discount": 0, "tax_rate": 18},
                {"description": "Servicio B", "quantity": 5, "unit_price": 3500, "discount": 10, "tax_rate": 18},
            ],
            "global_discount": 0,
            "apply_taxes": True,
            "status": "borrador",
        }
        r = http.post(f"{API}/invoices", json=payload)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["number"].startswith("TESTINV-")
        assert d["number"] == "TESTINV-9001"
        # Totals expected: item1=29500 (25000+18%), item2 line=17500, disc=1750, after=15750, +18%=18585 -> total=48085
        assert d["subtotal"] == 42500.0
        assert d["total_discount"] == 1750.0
        # tax = 25000*0.18 + 15750*0.18 = 4500 + 2835 = 7335
        assert d["total_tax"] == 7335.0
        assert d["total"] == 48085.0
        # cleanup: keep for other tests via fixture below
        TestInvoices.invoice_id = d["id"]

    def test_next_invoice_number_incremented(self, http, invoice_setup):
        r = http.get(f"{API}/settings")
        assert r.status_code == 200
        assert int(r.json()["next_invoice_number"]) == 9002

    def test_duplicate_custom_number_rejected(self, http, invoice_setup):
        payload = {
            "client_id": invoice_setup["client_id"],
            "number": "TESTINV-9001",  # already exists
            "issue_date": date.today().isoformat(),
            "currency": "DOP",
            "items": [{"description": "X", "quantity": 1, "unit_price": 10, "discount": 0, "tax_rate": 0}],
            "apply_taxes": False,
            "status": "borrador",
        }
        r = http.post(f"{API}/invoices", json=payload)
        assert r.status_code == 400
        assert "existe" in r.text.lower() or "duplic" in r.text.lower()

    def test_overdue_dynamic_status(self, http, invoice_setup):
        # Create invoice due yesterday, status 'enviada'
        payload = {
            "client_id": invoice_setup["client_id"],
            "issue_date": (date.today() - timedelta(days=20)).isoformat(),
            "due_date": (date.today() - timedelta(days=1)).isoformat(),
            "currency": "DOP",
            "items": [{"description": "Vencida", "quantity": 1, "unit_price": 1000, "discount": 0, "tax_rate": 0}],
            "apply_taxes": False,
            "status": "enviada",
        }
        r = http.post(f"{API}/invoices", json=payload)
        assert r.status_code == 200, r.text
        d = r.json()
        # Response should dynamically mark as vencida
        assert d["status"] == "vencida", f"Expected 'vencida', got {d['status']}"
        # cleanup
        http.delete(f"{API}/invoices/{d['id']}")

    def test_list_invoices_with_filters(self, http, invoice_setup):
        # by client
        r = http.get(f"{API}/invoices", params={"client_id": invoice_setup["client_id"]})
        assert r.status_code == 200
        assert isinstance(r.json(), list)
        # by search
        r = http.get(f"{API}/invoices", params={"q": "TESTINV"})
        assert r.status_code == 200
        assert any("TESTINV" in (inv.get("number") or "") for inv in r.json())

    def test_change_status_to_pagada(self, http):
        inv_id = getattr(TestInvoices, "invoice_id", None)
        assert inv_id, "prev test must have set invoice_id"
        r = http.patch(f"{API}/invoices/{inv_id}/status", json={"status": "pagada"})
        assert r.status_code == 200
        assert r.json()["status"] == "pagada"

    def test_change_status_invalid(self, http):
        inv_id = getattr(TestInvoices, "invoice_id", None)
        r = http.patch(f"{API}/invoices/{inv_id}/status", json={"status": "invalido"})
        assert r.status_code == 400

    def test_pdf_endpoint(self, http):
        inv_id = getattr(TestInvoices, "invoice_id", None)
        r = http.get(f"{API}/invoices/{inv_id}/pdf")
        assert r.status_code == 200
        assert r.headers.get("content-type", "").startswith("application/pdf")
        assert r.content[:4] == b"%PDF"

    def test_delete_invoice(self, http):
        inv_id = getattr(TestInvoices, "invoice_id", None)
        r = http.delete(f"{API}/invoices/{inv_id}")
        assert r.status_code == 200
        # verify gone
        r2 = http.get(f"{API}/invoices/{inv_id}")
        assert r2.status_code == 404


# -------- Reports --------
class TestReports:
    def test_summary(self, http):
        r = http.get(f"{API}/reports/summary")
        assert r.status_code == 200
        d = r.json()
        for k in ("total_invoiced", "total_paid", "total_pending", "total_overdue",
                  "clients_count", "invoices_count"):
            assert k in d
        assert isinstance(d["clients_count"], int)
        assert isinstance(d["invoices_count"], int)

    def test_monthly(self, http):
        y = date.today().year
        r = http.get(f"{API}/reports/monthly", params={"year": y})
        assert r.status_code == 200
        d = r.json()
        assert d["year"] == y
        assert isinstance(d["months"], list) and len(d["months"]) == 12
        for m in d["months"]:
            assert "month" in m and "invoiced" in m and "paid" in m and "count" in m

    def test_top_clients(self, http):
        r = http.get(f"{API}/reports/top-clients")
        assert r.status_code == 200
        d = r.json()
        assert isinstance(d, list)
        for row in d:
            assert "client_id" in row and "name" in row and "total" in row and "count" in row

    def test_export_csv(self, http):
        r = http.get(f"{API}/reports/export-csv")
        assert r.status_code == 200
        ct = r.headers.get("content-type", "")
        assert "text/csv" in ct
        text = r.text
        assert "Número" in text.split("\n")[0]
