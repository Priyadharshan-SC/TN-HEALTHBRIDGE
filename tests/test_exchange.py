"""Comprehensive test suite for M7 Reliable, Secure Healthcare Data Exchange Layer."""
from datetime import datetime, timedelta, timezone
import json
import time
import uuid
import pytest
from fastapi.testclient import TestClient

from app.core.config import get_settings
from app.core.errors import (
    IdempotencyConflictError,
    InvalidExchangeStateError,
    ReceiverDeliveryError,
)
from app.core.security import AppRole, create_access_token
from app.main import app
from app.schemas.exchange import (
    ExchangeDeliveryEnvelope,
    ExchangeJob,
    ExchangeSendRequest,
    ReceiverReceipt,
    ReceiverSimulateRequest,
)
from app.services.audit_service import AuditService
from app.services.consent_service import ConsentService
from app.services.exchange_service import ExchangeService
from app.services.receiver_simulator import ReceiverSimulatorService
from tests.test_fhir import make_mapped_record, make_terminology_batch
from tests.test_gateway import make_test_bundle, make_test_consent

client = TestClient(app)
settings = get_settings()


@pytest.fixture(autouse=True)
def setup_test_environment(monkeypatch):
    """Ensure clean test environment and synthetic test signatures."""
    monkeypatch.setattr(settings, "ALLOW_TEST_SIGNATURES", True)
    monkeypatch.setattr(settings, "ENVIRONMENT", "test")
    monkeypatch.setattr(settings, "RETRY_BACKOFF_SECONDS", 0.01)
    ReceiverSimulatorService.clear_cache()
    ExchangeService.clear_cache()


def make_m3_batch(patient_id: str = "PT-2026-0091", provider_id: str = "HOSPITAL_A"):
    """Helper creating a valid M3 terminology batch dictionary."""
    r0 = make_mapped_record(
        index=0,
        patient_ref=patient_id,
        test_name="Fasting Blood Glucose",
        result=115.0,
        unit="mg/dL",
        observed_at="2026-10-27T10:00:00+00:00",
        specimen="Serum",
        mapping_status="mapped",
        target_code="1558-6",
        target_display="Fasting glucose [Mass/volume] in Serum or Plasma",
    )
    return make_terminology_batch([r0], provider_id=provider_id)


# ==============================================================================
# Category 1: End-to-End Successful Exchange Workflow
# ==============================================================================

def test_successful_end_to_end_exchange_from_m3_batch():
    """Verify complete end-to-end exchange: M3 batch -> M5 Bundle -> M6 Consent -> M7 Delivery."""
    cid = f"CONSENT-E2E-{uuid.uuid4()}"
    now = datetime.now(timezone.utc)
    consent = make_test_consent(
        consent_id=cid,
        patient_id="PT-2026-0091",
        hiu_id="HOSPITAL_B",
        hip_id="HOSPITAL_A",
        status="GRANTED",
        from_date=now - timedelta(days=7),
        to_date=now + timedelta(days=2),
    )
    # Register in consent store
    ConsentService.register_consent(consent, initial_status="GRANTED", actor="system")

    batch_dict = make_m3_batch(patient_id="PT-2026-0091", provider_id="HOSPITAL_A")
    idemp_key = f"IDEMP-KEY-{uuid.uuid4()}"

    send_payload = {
        "batch": batch_dict,
        "consent": consent.model_dump(mode="json"),
        "source_provider_id": "HOSPITAL_A",
        "recipient_hiu_id": "HOSPITAL_B",
        "patient_reference": "PT-2026-0091",
        "idempotency_key": idemp_key,
        "simulation_mode": "normal",
    }

    token = create_access_token(
        subject="hospital_a_operator",
        organization_id="HOSPITAL_A",
        roles=[AppRole.HOSPITAL_OPERATOR, AppRole.DATA_PROVIDER],
    )

    resp = client.post(
        "/api/v1/exchange/send",
        json=send_payload,
        headers={"Authorization": f"Bearer {token}"},
    )

    assert resp.status_code == 200
    data = resp.json()
    assert data["is_idempotent_replay"] is False

    job = data["job"]
    assert job["status"] == "DELIVERED"
    assert job["attempt_count"] == 1
    assert job["idempotency_key"] == idemp_key
    assert job["completed_at"] is not None

    receipt = data["receipt"]
    assert receipt is not None
    assert receipt["status"] == "accepted"
    assert receipt["recipient_id"] == "HOSPITAL_B"
    assert receipt["payload_digest"] is not None


# ==============================================================================
# Category 2: Idempotency & Duplicate Request Protection
# ==============================================================================

def test_idempotent_replay_returns_cached_result_without_duplicate_delivery():
    """Verify sending identical payload with same idempotency key returns cached job."""
    consent = make_test_consent(hiu_id="HOSPITAL_B", hip_id="HOSPITAL_A")
    ConsentService.register_consent(consent, initial_status="GRANTED", actor="system")
    batch_dict = make_m3_batch(patient_id=consent.patient.id, provider_id="HOSPITAL_A")
    idemp_key = f"IDEMP-REPLAY-{uuid.uuid4()}"

    send_payload = {
        "batch": batch_dict,
        "consent": consent.model_dump(mode="json"),
        "source_provider_id": "HOSPITAL_A",
        "recipient_hiu_id": "HOSPITAL_B",
        "patient_reference": consent.patient.id,
        "idempotency_key": idemp_key,
    }

    # 1. Initial submission
    resp1 = client.post("/api/v1/exchange/send", json=send_payload)
    assert resp1.status_code == 200
    data1 = resp1.json()
    assert data1["is_idempotent_replay"] is False
    initial_job_id = data1["job"]["job_id"]
    initial_receipt_id = data1["receipt"]["receipt_id"]

    # 2. Resubmission with same key and same body
    resp2 = client.post("/api/v1/exchange/send", json=send_payload)
    assert resp2.status_code == 200
    data2 = resp2.json()
    assert data2["is_idempotent_replay"] is True
    assert data2["job"]["job_id"] == initial_job_id
    assert data2["receipt"]["receipt_id"] == initial_receipt_id


def test_idempotency_conflict_different_payload_rejected():
    """Verify reusing an idempotency key with a DIFFERENT payload raises 409 Conflict."""
    consent = make_test_consent(hiu_id="HOSPITAL_B", hip_id="HOSPITAL_A")
    ConsentService.register_consent(consent, initial_status="GRANTED", actor="system")
    batch_dict = make_m3_batch(patient_id=consent.patient.id, provider_id="HOSPITAL_A")
    idemp_key = f"IDEMP-CONFLICT-{uuid.uuid4()}"

    send_payload1 = {
        "batch": batch_dict,
        "consent": consent.model_dump(mode="json"),
        "source_provider_id": "HOSPITAL_A",
        "recipient_hiu_id": "HOSPITAL_B",
        "patient_reference": consent.patient.id,
        "idempotency_key": idemp_key,
    }
    resp1 = client.post("/api/v1/exchange/send", json=send_payload1)
    assert resp1.status_code == 200

    # Payload 2 has different recipient or patient
    send_payload2 = dict(send_payload1)
    send_payload2["patient_reference"] = "DIFFERENT-PATIENT-999"

    resp2 = client.post("/api/v1/exchange/send", json=send_payload2)
    assert resp2.status_code == 409
    assert "Idempotency key" in resp2.json()["message"]


# ==============================================================================
# Category 3: Revocation & Authorization Failure Protections
# ==============================================================================

def test_revoked_consent_before_dispatch_aborts_delivery():
    """Verify that if consent is revoked prior to dispatch, the exchange job is cancelled/blocked."""
    cid = f"CONSENT-REVOKE-DISPATCH-{uuid.uuid4()}"
    consent = make_test_consent(consent_id=cid, hiu_id="HOSPITAL_B", hip_id="HOSPITAL_A", status="GRANTED")
    ConsentService.register_consent(consent, initial_status="GRANTED", actor="system")

    # Revoke consent in store
    ConsentService.revoke_consent(cid, actor="patient_proxy", reason="Emergency patient revocation")

    batch_dict = make_m3_batch(patient_id=consent.patient.id, provider_id="HOSPITAL_A")
    payload = {
        "batch": batch_dict,
        "consent_id": cid,
        "source_provider_id": "HOSPITAL_A",
        "recipient_hiu_id": "HOSPITAL_B",
        "patient_reference": consent.patient.id,
    }

    resp = client.post("/api/v1/exchange/send", json=payload)
    assert resp.status_code == 403
    assert "REVOKED" in resp.json()["message"]


def test_unregistered_destination_hospital_rejected():
    """Verify sending to an unauthorized/unregistered destination hospital is rejected."""
    consent = make_test_consent(hiu_id="UNKNOWN_HOSPITAL_XYZ", hip_id="HOSPITAL_A")
    ConsentService.register_consent(consent, initial_status="GRANTED", actor="system")
    batch_dict = make_m3_batch(patient_id=consent.patient.id, provider_id="HOSPITAL_A")

    payload = {
        "batch": batch_dict,
        "consent": consent.model_dump(mode="json"),
        "source_provider_id": "HOSPITAL_A",
        "recipient_hiu_id": "UNKNOWN_HOSPITAL_XYZ",
        "patient_reference": consent.patient.id,
    }

    resp = client.post("/api/v1/exchange/send", json=payload)
    assert resp.status_code in (404, 403)


# ==============================================================================
# Category 4: Retry State Machine & Failure Modes
# ==============================================================================

def test_transient_receiver_failure_retries_and_succeeds():
    """Verify transient 503 receiver error triggers bounded retries and eventually succeeds."""
    consent = make_test_consent(hiu_id="HOSPITAL_B", hip_id="HOSPITAL_A")
    ConsentService.register_consent(consent, initial_status="GRANTED", actor="system")
    batch_dict = make_m3_batch(patient_id=consent.patient.id, provider_id="HOSPITAL_A")

    payload = {
        "batch": batch_dict,
        "consent": consent.model_dump(mode="json"),
        "source_provider_id": "HOSPITAL_A",
        "recipient_hiu_id": "HOSPITAL_B",
        "patient_reference": consent.patient.id,
        "simulation_mode": "transient_failure",
    }

    resp = client.post("/api/v1/exchange/send", json=payload)
    assert resp.status_code == 200
    job = resp.json()["job"]
    assert job["status"] == "DELIVERED"
    # Receiver simulator fails twice then succeeds on 3rd attempt
    assert job["attempt_count"] == 3

    # Check history contains RETRY_SCHEDULED transitions
    statuses = [h["to_status"] for h in job["history"]]
    assert "RETRY_SCHEDULED" in statuses
    assert "DELIVERED" in statuses


def test_permanent_receiver_failure_does_not_retry():
    """Verify permanent receiver error (400) transitions directly to FAILED_PERMANENTLY without retry."""
    consent = make_test_consent(hiu_id="HOSPITAL_B", hip_id="HOSPITAL_A")
    ConsentService.register_consent(consent, initial_status="GRANTED", actor="system")
    batch_dict = make_m3_batch(patient_id=consent.patient.id, provider_id="HOSPITAL_A")

    payload = {
        "batch": batch_dict,
        "consent": consent.model_dump(mode="json"),
        "source_provider_id": "HOSPITAL_A",
        "recipient_hiu_id": "HOSPITAL_B",
        "patient_reference": consent.patient.id,
        "simulation_mode": "permanent_failure",
    }

    resp = client.post("/api/v1/exchange/send", json=payload)
    assert resp.status_code == 400
    assert "permanent" in resp.json()["message"].lower()


def test_illegal_state_transition_rejected():
    """Verify attempting an illegal state transition raises InvalidExchangeStateError."""
    job = ExchangeJob(
        job_id="TEST-JOB-ILLEGAL",
        idempotency_key="K1",
        request_fingerprint="FP1",
        caller_organization_id="HOSPITAL_A",
        source_provider_id="HOSPITAL_A",
        recipient_hiu_id="HOSPITAL_B",
        patient_reference="PT-001",
        status="DELIVERED",
        consent_id="C1",
    )
    # DELIVERED is a terminal state; cannot transition back to RECEIVED or DELIVERING
    with pytest.raises(InvalidExchangeStateError, match="Cannot transition"):
        ExchangeService.transition_state(job, "DELIVERING")


def test_job_cancellation():
    """Verify manual cancellation of an exchange job."""
    consent = make_test_consent(hiu_id="HOSPITAL_B", hip_id="HOSPITAL_A")
    ConsentService.register_consent(consent, initial_status="GRANTED", actor="system")
    batch_dict = make_m3_batch(patient_id=consent.patient.id, provider_id="HOSPITAL_A")

    # Create job in RECEIVED state
    req = ExchangeSendRequest(
        batch=make_terminology_batch([make_mapped_record()], provider_id="HOSPITAL_A"),
        consent=consent,
        source_provider_id="HOSPITAL_A",
        recipient_hiu_id="HOSPITAL_B",
        patient_reference=consent.patient.id,
    )
    job = ExchangeJob(
        job_id=f"JOB-CANCEL-{uuid.uuid4()}",
        idempotency_key="CANCEL-KEY",
        request_fingerprint="FP",
        caller_organization_id="HOSPITAL_A",
        source_provider_id="HOSPITAL_A",
        recipient_hiu_id="HOSPITAL_B",
        patient_reference="PT-001",
        status="RECEIVED",
        consent_id=consent.consent_id,
    )
    ExchangeService._jobs[job.job_id] = job

    # Cancel via API
    resp = client.post(
        f"/api/v1/exchange/jobs/{job.job_id}/cancel",
        json={"reason": "Operator cancelled due to misrouting"},
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "CANCELLED"


def test_exchange_with_preassembled_bundle():
    """Verify exchange using directly pre-assembled FHIR R4 Bundle."""
    consent = make_test_consent(hiu_id="HOSPITAL_B", hip_id="HOSPITAL_A")
    ConsentService.register_consent(consent, initial_status="GRANTED", actor="system")
    bundle = make_test_bundle(patient_id=consent.patient.id, provider_id="HOSPITAL_A")

    payload = {
        "bundle": bundle.model_dump(mode="json"),
        "consent": consent.model_dump(mode="json"),
        "source_provider_id": "HOSPITAL_A",
        "recipient_hiu_id": "HOSPITAL_B",
        "patient_reference": consent.patient.id,
    }
    resp = client.post("/api/v1/exchange/send", json=payload)
    assert resp.status_code == 200
    assert resp.json()["job"]["status"] == "DELIVERED"


def test_get_exchange_job_by_id():
    """Verify retrieving exchange job status and transition history via GET endpoint."""
    consent = make_test_consent(hiu_id="HOSPITAL_B", hip_id="HOSPITAL_A")
    ConsentService.register_consent(consent, initial_status="GRANTED", actor="system")
    bundle = make_test_bundle(patient_id=consent.patient.id, provider_id="HOSPITAL_A")

    payload = {
        "bundle": bundle.model_dump(mode="json"),
        "consent": consent.model_dump(mode="json"),
        "source_provider_id": "HOSPITAL_A",
        "recipient_hiu_id": "HOSPITAL_B",
        "patient_reference": consent.patient.id,
    }
    send_resp = client.post("/api/v1/exchange/send", json=payload)
    job_id = send_resp.json()["job"]["job_id"]

    get_resp = client.get(f"/api/v1/exchange/jobs/{job_id}")
    assert get_resp.status_code == 200
    fetched_job = get_resp.json()
    assert fetched_job["job_id"] == job_id
    assert fetched_job["status"] == "DELIVERED"
    assert len(fetched_job["history"]) >= 4


def test_m5_assembly_failure_blocks_exchange():
    """Verify that if M5 bundle assembly fails (e.g. all records rejected), exchange fails safely."""
    rec_rejected = make_mapped_record(
        index=0,
        patient_ref="PT-REJECTED-001",
        quality_status="rejected",
    )
    batch_dict = make_terminology_batch([rec_rejected], provider_id="HOSPITAL_A")
    consent = make_test_consent(patient_id="PT-REJECTED-001", hiu_id="HOSPITAL_B", hip_id="HOSPITAL_A")
    ConsentService.register_consent(consent, initial_status="GRANTED", actor="system")

    payload = {
        "batch": batch_dict,
        "consent": consent.model_dump(mode="json"),
        "source_provider_id": "HOSPITAL_A",
        "recipient_hiu_id": "HOSPITAL_B",
        "patient_reference": "PT-REJECTED-001",
    }
    resp = client.post("/api/v1/exchange/send", json=payload)
    assert resp.status_code == 422
    assert "quality rejection" in resp.json()["message"].lower()


def test_direct_receiver_simulator_endpoint():
    """Verify direct POST /receiver/simulate endpoint enforces registered recipient and issues receipt."""
    bundle = make_test_bundle(patient_id="PT-2026-0091", provider_id="HOSPITAL_A")
    envelope = ExchangeDeliveryEnvelope(
        delivery_id=f"DIRECT-DELIV-{uuid.uuid4()}",
        job_id="TEST-JOB-DIRECT",
        sender_provider_id="HOSPITAL_A",
        recipient_hiu_id="HOSPITAL_B",
        consent_id="CONSENT-DIRECT-001",
        patient_reference="PT-2026-0091",
        bundle=bundle,
        integrity_digest="sha256-test-digest",
        timestamp=datetime.now(timezone.utc).isoformat(),
    )
    resp = client.post(
        "/api/v1/exchange/receiver/simulate",
        json={"envelope": envelope.model_dump(mode="json"), "simulation_mode": "normal"},
    )
    assert resp.status_code == 200
    receipt = resp.json()
    assert receipt["status"] == "accepted"
    assert receipt["recipient_id"] == "HOSPITAL_B"
    assert receipt["delivery_id"] == envelope.delivery_id
