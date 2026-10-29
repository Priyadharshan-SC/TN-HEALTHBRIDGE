"""Tests for Universal Patient Identity (UPID) and Provider Mapping (Phase 4)."""
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services.patient_identity_service import PatientIdentityService

client = TestClient(app)


def test_list_patients_and_mappings():
    """Verify default universal patients exist and have provider mappings."""
    resp = client.get("/api/v1/identity/patients")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) >= 3
    upids = {p["universal_patient_id"] for p in data}
    assert "UPID-ARUN-001" in upids


def test_get_patient_by_upid():
    """Retrieve Arun Kumar's universal identity profile."""
    resp = client.get("/api/v1/identity/patients/UPID-ARUN-001")
    assert resp.status_code == 200
    patient = resp.json()
    assert patient["full_name"] == "Arun Kumar"
    assert len(patient["mappings"]) >= 3
    providers = {m["provider_id"] for m in patient["mappings"]}
    assert "HOSPITAL_A" in providers
    assert "HOSPITAL_B" in providers


def test_create_new_universal_patient():
    """Register a new universal patient with a generated UPID."""
    payload = {
        "full_name": "Meera Krishnan",
        "dob": "1995-08-12",
        "gender": "FEMALE",
        "abha_address": "meera.k@abdm",
        "phone_masked": "+91 96*** **789",
    }
    resp = client.post("/api/v1/identity/patients", json=payload)
    assert resp.status_code == 201
    created = resp.json()
    assert created["universal_patient_id"].startswith("UPID-")
    assert created["full_name"] == "Meera Krishnan"


def test_add_provider_mapping_uniqueness_enforced():
    """Enforces global uniqueness: (provider_id, local_patient_id) cannot be mapped to another patient."""
    # Attempt to assign Arun's CH1-1042 to Priya (UPID-PRIYA-002)
    payload = {
        "universal_patient_id": "UPID-PRIYA-002",
        "provider_id": "HOSPITAL_A",
        "local_patient_id": "CH1-1042",
        "verification_status": "VERIFIED",
    }
    resp = client.post("/api/v1/identity/mappings", json=payload)
    assert resp.status_code == 409
    assert "already mapped to distinct patient" in resp.json()["detail"]


def test_resolve_identity_across_providers_success():
    """Resolve Arun's Hospital A reference to Hospital B."""
    payload = {
        "source_provider_id": "HOSPITAL_A",
        "source_patient_id": "CH1-1042",
        "target_provider_id": "HOSPITAL_B",
    }
    resp = client.post("/api/v1/identity/resolve", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["resolution_status"] == "RESOLVED"
    assert data["target_patient_id"] == "MH-2098"
    assert data["universal_patient_id"] == "UPID-ARUN-001"


def test_resolve_identity_unregistered_reference_returns_unresolved():
    """Unknown source patient returns explicit UNRESOLVED without guessing."""
    payload = {
        "source_provider_id": "HOSPITAL_A",
        "source_patient_id": "UNKNOWN_PATIENT_999",
        "target_provider_id": "HOSPITAL_B",
    }
    resp = client.post("/api/v1/identity/resolve", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["resolution_status"] == "UNRESOLVED"
    assert data["target_patient_id"] is None
