"""Tests for Federated Healthcare Provider Applications and Adapters (Phase 8)."""
import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_list_patients_for_all_six_providers():
    """Verify each of the 6 providers has local patient directory."""
    providers = ["HOSPITAL_A", "LAB_C", "HOSPITAL_B", "HOSPITAL_D", "LAB_E", "CLINIC_F"]
    for prov in providers:
        resp = client.get(f"/api/v1/providers/{prov}/patients")
        assert resp.status_code == 200
        patients = resp.json()
        assert len(patients) >= 1, f"Provider {prov} should have registered synthetic patient"


import uuid

def test_register_local_patient_at_hospital_a():
    """Register a new patient at City Hospital 1."""
    rand_id = f"CH1-{uuid.uuid4().hex[:5].upper()}"
    payload = {
        "local_patient_id": rand_id,
        "full_name": "Murugan Shanmugam",
        "dob": "1990-01-01",
        "gender": "MALE",
        "created_at": "2026-10-28T10:00:00Z",
        "active": True,
    }
    resp = client.post("/api/v1/providers/HOSPITAL_A/patients", json=payload)
    assert resp.status_code == 201
    assert resp.json()["local_patient_id"] == rand_id


def test_create_and_list_clinical_records():
    """Add a clinical record locally at Central Laboratory."""
    payload = {
        "local_patient_id": "CL-7821",
        "category": "LABORATORY",
        "test_name": "Serum Potassium",
        "value": 4.1,
        "unit": "mmol/L",
        "specimen": "blood",
        "interpretation": "Normal",
    }
    resp = client.post("/api/v1/providers/LAB_C/records", json=payload)
    assert resp.status_code == 201
    created = resp.json()
    assert created["test_name"] == "Serum Potassium"

    # List records
    resp_list = client.get("/api/v1/providers/LAB_C/records?local_patient_id=CL-7821")
    assert resp_list.status_code == 200
    test_names = [r["test_name"] for r in resp_list.json()]
    assert "Serum Potassium" in test_names


from datetime import datetime, timezone
from app.schemas.gateway import (
    AbdmConsentArtefact,
    ConsentActor,
    ConsentDateRange,
    ConsentPatient,
    ConsentPermission,
    ConsentPurpose,
    ConsentRecord,
)
from app.services.consent_service import ConsentService


def make_provider_test_consent(consent_id: str, status: str = "GRANTED") -> str:
    now_iso = datetime.now(timezone.utc).isoformat()
    record = ConsentRecord(
        artefact=AbdmConsentArtefact(
            consent_id=consent_id,
            status=status,
            created_at=now_iso,
            patient=ConsentPatient(id="CH1-1042"),
            purpose=ConsentPurpose(code="CAREMGT", text="Care Management Consultation"),
            hip=ConsentActor(id="HOSPITAL_A", name="City Hospital 1"),
            hiu=ConsentActor(id="HOSPITAL_B", name="Metro Hospital"),
            permission=ConsentPermission(
                access_mode="VIEW",
                date_range=ConsentDateRange(
                    from_date="2026-01-01T00:00:00Z",
                    to_date="2026-12-31T23:59:59Z",
                ),
                data_erase_at="2027-01-01T00:00:00Z",
            ),
            consent_expiry="2026-12-31T23:59:59Z",
            hi_types=["DiagnosticReport"],
            signature=f"TEST_SIG_{consent_id}",
        ),
        registered_at=now_iso,
        last_updated_at=now_iso,
    )
    ConsentService.register_consent(record)
    return consent_id


def test_adapter_retrieval_with_granted_consent():
    """Middleware retrieves records via provider adapter when valid consent exists."""
    cid = make_provider_test_consent("CONSENT-PROV-TEST-001", status="GRANTED")
    resp = client.get(
        f"/api/v1/providers/HOSPITAL_A/adapter/records/CH1-1042?consent_id={cid}"
    )
    assert resp.status_code == 200
    records = resp.json()
    assert len(records) >= 1
    assert any("Glucose" in r["test_name"] for r in records)


def test_adapter_retrieval_rejected_if_consent_revoked():
    """Adapter rejects retrieval if consent is revoked."""
    cid = make_provider_test_consent("CONSENT-PROV-TEST-REVOKED", status="REVOKED")
    resp = client.get(
        f"/api/v1/providers/HOSPITAL_A/adapter/records/CH1-1042?consent_id={cid}"
    )
    assert resp.status_code == 403
    assert resp.status_code == 403
