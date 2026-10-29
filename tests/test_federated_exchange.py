"""End-to-End Federated Data Exchange Scenarios across Independent Provider Nodes (Phase 9 & 16)."""
from datetime import datetime, timezone
import pytest
import uuid
from fastapi.testclient import TestClient

from app.core.security import AppRole, create_access_token
from app.main import app
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
from app.services.exchange_service import ExchangeService

client = TestClient(app)


from app.core.config import get_settings

settings = get_settings()


@pytest.fixture(autouse=True)
def setup_exchange_tests(monkeypatch):
    monkeypatch.setattr(settings, "ALLOW_TEST_SIGNATURES", True)
    monkeypatch.setattr(settings, "ENVIRONMENT", "test")
    ExchangeService.clear_cache()
    yield
    ExchangeService.clear_cache()


def create_test_consent(consent_id: str, status: str = "GRANTED", patient_id: str = "CH1-1042") -> str:
    now_iso = datetime.now(timezone.utc).isoformat()
    record = ConsentRecord(
        artefact=AbdmConsentArtefact(
            consent_id=consent_id,
            status=status,
            created_at=now_iso,
            patient=ConsentPatient(id=patient_id),
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
            hi_types=["DiagnosticReport", "Observation"],
            signature=f"TEST_SIG_{consent_id}",
        ),
        registered_at=now_iso,
        last_updated_at=now_iso,
    )
    ConsentService.register_consent(record)
    return consent_id


def test_scenario_a_successful_federated_exchange():
    """Scenario A: Successful federated exchange from City Hospital 1 to Metro Hospital for Arun Kumar."""
    cid = f"CONSENT-FED-{uuid.uuid4().hex[:6]}"
    create_test_consent(cid, status="GRANTED", patient_id="CH1-1042")

    metro_token = create_access_token(
        subject="hospital_b_requester",
        organization_id="HOSPITAL_B",
        roles=[AppRole.DATA_REQUESTER],
    )

    payload = {
        "source_provider_id": "HOSPITAL_A",
        "destination_provider_id": "HOSPITAL_B",
        "universal_patient_id": "UPID-ARUN-001",
        "consent_id": cid,
        "purpose": "Care Management and Consultation",
        "data_categories": ["DiagnosticReport", "Observation"],
        "idempotency_key": str(uuid.uuid4()),
        "simulation_mode": "normal",
    }

    resp = client.post(
        "/api/v1/exchange/federated-exchange",
        json=payload,
        headers={"Authorization": f"Bearer {metro_token}"},
    )
    assert resp.status_code == 200
    data = resp.json()

    assert data["job"]["status"] == "DELIVERED"
    assert data["receipt"] is not None
    assert data["receipt"]["status"] == "accepted"
    assert data["receipt"]["recipient_id"] == "HOSPITAL_B"

    # Verify that Destination Provider received it in its inbox
    inbox_resp = client.get("/api/v1/providers/HOSPITAL_B/inbox")
    assert inbox_resp.status_code == 200
    inbox_items = inbox_resp.json()
    assert len(inbox_items) >= 1
    assert any(item["universal_patient_id"] == "UPID-ARUN-001" for item in inbox_items)


def test_scenario_b_consent_denied_or_requested_blocks_exchange():
    """Scenario B: Unapproved consent (REQUESTED status) blocks release."""
    cid = f"CONSENT-DENIED-{uuid.uuid4().hex[:6]}"
    create_test_consent(cid, status="REQUESTED", patient_id="CH1-1042")

    metro_token = create_access_token(
        subject="hospital_b_requester",
        organization_id="HOSPITAL_B",
        roles=[AppRole.DATA_REQUESTER],
    )

    payload = {
        "source_provider_id": "HOSPITAL_A",
        "destination_provider_id": "HOSPITAL_B",
        "universal_patient_id": "UPID-ARUN-001",
        "consent_id": cid,
        "idempotency_key": str(uuid.uuid4()),
    }

    resp = client.post(
        "/api/v1/exchange/federated-exchange",
        json=payload,
        headers={"Authorization": f"Bearer {metro_token}"},
    )
    # Blocked by gateway gate 1 (Consent not GRANTED)
    assert resp.status_code in (400, 403)


def test_scenario_c_revoked_consent_aborts_exchange():
    """Scenario C: Revoked consent aborts exchange immediately."""
    cid = f"CONSENT-REV-{uuid.uuid4().hex[:6]}"
    create_test_consent(cid, status="REVOKED", patient_id="CH1-1042")

    metro_token = create_access_token(
        subject="hospital_b_requester",
        organization_id="HOSPITAL_B",
        roles=[AppRole.DATA_REQUESTER],
    )

    payload = {
        "source_provider_id": "HOSPITAL_A",
        "destination_provider_id": "HOSPITAL_B",
        "universal_patient_id": "UPID-ARUN-001",
        "consent_id": cid,
        "idempotency_key": str(uuid.uuid4()),
    }

    resp = client.post(
        "/api/v1/exchange/federated-exchange",
        json=payload,
        headers={"Authorization": f"Bearer {metro_token}"},
    )
    assert resp.status_code in (400, 403)


def test_scenario_d_ambiguous_or_unmapped_identity_requires_review():
    """Scenario D: Patient with unmapped/missing identity stops workflow without guessing."""
    cid = f"CONSENT-UNMAP-{uuid.uuid4().hex[:6]}"
    create_test_consent(cid, status="GRANTED", patient_id="UNKNOWN-999")

    metro_token = create_access_token(
        subject="hospital_b_requester",
        organization_id="HOSPITAL_B",
        roles=[AppRole.DATA_REQUESTER],
    )

    payload = {
        "source_provider_id": "HOSPITAL_A",
        "destination_provider_id": "HOSPITAL_B",
        "universal_patient_id": "UPID-NONEXISTENT-999",
        "consent_id": cid,
        "idempotency_key": str(uuid.uuid4()),
    }

    resp = client.post(
        "/api/v1/exchange/federated-exchange",
        json=payload,
        headers={"Authorization": f"Bearer {metro_token}"},
    )
    # Fails closed because no verified mapping exists or patient mismatch
    assert resp.status_code in (400, 403, 404, 422)


def test_scenario_e_unauthorized_cross_organization_access_denied():
    """Scenario E: Unauthorized principal attempting to access protected resources is denied."""
    patient_token = create_access_token(
        subject="arun_patient",
        organization_id="PATIENT",
        roles=[AppRole.PATIENT],
    )

    # Patient role attempting to create an organization (requires SYSTEM_ADMIN)
    resp = client.post(
        "/api/v1/organizations",
        json={
            "org_id": "ROGUE_ORG",
            "name": "Rogue Hospital",
            "code": "ROGUE",
            "endpoint_url": "http://127.0.0.1:8000/adapter",
            "org_type": "HOSPITAL",
        },
        headers={"Authorization": f"Bearer {patient_token}"},
    )
    assert resp.status_code == 403


def test_scenario_f_idempotency_and_receipt_download():
    """Scenario F: Identical idempotency key returns cached receipt without re-dispatch; receipt is downloadable."""
    cid = f"CONSENT-IDEMP-{uuid.uuid4().hex[:6]}"
    create_test_consent(cid, status="GRANTED", patient_id="CH1-1042")
    idem_key = str(uuid.uuid4())

    metro_token = create_access_token(
        subject="hospital_b_requester",
        organization_id="HOSPITAL_B",
        roles=[AppRole.DATA_REQUESTER],
    )

    payload = {
        "source_provider_id": "HOSPITAL_A",
        "destination_provider_id": "HOSPITAL_B",
        "universal_patient_id": "UPID-ARUN-001",
        "consent_id": cid,
        "idempotency_key": idem_key,
    }

    # First dispatch
    resp1 = client.post(
        "/api/v1/exchange/federated-exchange",
        json=payload,
        headers={"Authorization": f"Bearer {metro_token}"},
    )
    assert resp1.status_code == 200
    job_id = resp1.json()["job"]["job_id"]

    # Replay with same idempotency key
    resp2 = client.post(
        "/api/v1/exchange/federated-exchange",
        json=payload,
        headers={"Authorization": f"Bearer {metro_token}"},
    )
    assert resp2.status_code == 200
    assert resp2.json()["is_idempotent_replay"] is True

    # Download verifiable receipt
    download_resp = client.get(f"/api/v1/exchange/transfers/{job_id}/download-receipt")
    assert download_resp.status_code == 200
    receipt_obj = download_resp.json()
    assert receipt_obj["job_id"] == job_id
    assert "TN HealthBridge does not persist raw clinical records centrally" in receipt_obj["clinical_data_non_persistence_policy"]
