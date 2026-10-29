"""Tests for Patient Portal and Patient-Controlled Consent Lifecycle (Phase 7)."""
import pytest
from fastapi.testclient import TestClient

from app.core.security import AppRole, create_access_token
from app.main import app

client = TestClient(app)


def get_patient_token() -> str:
    return create_access_token(
        subject="arun_patient",
        organization_id="TN_PATIENT_PORTAL",
        roles=[AppRole.PATIENT],
        universal_patient_id="UPID-ARUN-001",
    )


def test_get_patient_profile():
    """Retrieve Arun Kumar's profile and interoperability metrics."""
    token = get_patient_token()
    resp = client.get(
        "/api/v1/patient/profile",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["universal_patient_id"] == "UPID-ARUN-001"
    assert data["full_name"] == "Arun Kumar"
    assert data["connected_providers_count"] >= 3


def test_list_connected_hospitals():
    """List hospitals connected to the authenticated patient."""
    token = get_patient_token()
    resp = client.get(
        "/api/v1/patient/hospitals",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    hospitals = resp.json()
    assert len(hospitals) >= 3
    prov_ids = {h["provider_id"] for h in hospitals}
    assert "HOSPITAL_A" in prov_ids
    assert "HOSPITAL_B" in prov_ids


def test_get_federated_records_on_demand():
    """Patient views clinical records retrieved on-the-fly across connected hospitals."""
    token = get_patient_token()
    resp = client.get(
        "/api/v1/patient/records",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    records = resp.json()
    assert len(records) >= 2
    # Verify non-persistence statement
    assert "Live federated query" in records[0]["retrieval_status"]


def test_patient_consent_decision_grant_and_revoke():
    """Patient reviews pending consent, grants it, and later revokes it."""
    token = get_patient_token()
    # 1. Register a dedicated pending consent for this test
    from datetime import datetime, timezone
    import uuid
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

    target_consent = f"CONSENT-TEST-GRANT-{uuid.uuid4().hex[:6]}"
    now_iso = datetime.now(timezone.utc).isoformat()
    record = ConsentRecord(
        artefact=AbdmConsentArtefact(
            consent_id=target_consent,
            status="REQUESTED",
            created_at=now_iso,
            patient=ConsentPatient(id="UPID-ARUN-001"),
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
            signature="PENDING",
        ),
        registered_at=now_iso,
        last_updated_at=now_iso,
    )
    ConsentService.register_consent(record)

    # 2. Grant consent
    grant_resp = client.post(
        f"/api/v1/patient/consents/{target_consent}/decide",
        json={"decision": "GRANT", "reason": "Patient approved for consultation"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert grant_resp.status_code == 200
    assert grant_resp.json()["artefact"]["status"] == "GRANTED"

    # 3. Revoke consent
    revoke_resp = client.post(
        f"/api/v1/patient/consents/{target_consent}/revoke",
        json={"reason": "Patient withdrew consent"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert revoke_resp.status_code == 200
    assert revoke_resp.json()["artefact"]["status"] == "REVOKED"
