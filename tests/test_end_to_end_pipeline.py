"""Comprehensive end-to-end integration test across all 7 TN HealthBridge modules.

Validates the complete workflow:
M1 (Ingestion) -> M2 (Normalization) -> M3 (Terminology Mapping) ->
M4 (Identity Safety) -> M5 (FHIR R4 Assembly) -> M6 (Consent & Security Gateway) ->
M7 (Simulated Hospital Delivery)
"""
from datetime import datetime, timedelta, timezone
import json
import uuid
import pytest
from fastapi.testclient import TestClient

from app.core.config import get_settings
from app.core.security import AppRole, create_access_token
from app.main import app
from app.schemas.identity import (
    IdentityAssessmentBatchRequest,
    IdentityComparisonItem,
    PatientIdentityRecord,
)
from app.services.consent_service import ConsentService
from tests.test_gateway import make_test_consent

client = TestClient(app)
settings = get_settings()


@pytest.fixture(autouse=True)
def setup_test_environment(monkeypatch):
    """Enable synthetic test signatures and testing mode."""
    monkeypatch.setattr(settings, "ALLOW_TEST_SIGNATURES", True)
    monkeypatch.setattr(settings, "ENVIRONMENT", "test")
    monkeypatch.setattr(settings, "RETRY_BACKOFF_SECONDS", 0.01)


def test_complete_m1_through_m7_pipeline():
    """Verify execution of all seven modules in a coherent, reproducible end-to-end workflow."""
    patient_id = "SYN_PATIENT_103"
    provider_id = "HOSPITAL_A"
    recipient_id = "HOSPITAL_B"

    # ==========================================================================
    # Stage 1: M1 Ingestion (Simulated hospital CSV upload)
    # ==========================================================================
    csv_content = (
        "patient_id,test_name,result,unit,test_datetime,specimen\n"
        "SYN_PATIENT_103,Fasting Blood Glucose,112.5,mg/dL,2026-10-27T08:30:00Z,Serum\n"
    )

    m1_resp = client.post(
        "/api/v1/ingestion/csv",
        files={"file": ("lab_records.csv", csv_content, "text/csv")},
        headers={"X-Provider-ID": provider_id},
    )
    assert m1_resp.status_code == 200, f"M1 failed: {m1_resp.text}"
    m1_envelope = m1_resp.json()
    assert m1_envelope["record_count"] == 1
    assert m1_envelope["source_provider_id"] == provider_id

    # ==========================================================================
    # Stage 2: M2 Normalization (Canonical lab record mapping & quality gate)
    # ==========================================================================
    m2_resp = client.post("/api/v1/normalization/process", json=m1_envelope)
    assert m2_resp.status_code == 200, f"M2 failed: {m2_resp.text}"
    m2_batch = m2_resp.json()
    assert m2_batch["valid_count"] == 1
    assert m2_batch["records"][0]["canonical_fields"]["result"] == 112.5

    # ==========================================================================
    # Stage 3: M3 Terminology Mapping (LOINC concept mapping)
    # ==========================================================================
    m3_resp = client.post("/api/v1/terminology/map", json=m2_batch)
    assert m3_resp.status_code == 200, f"M3 failed: {m3_resp.text}"
    m3_batch = m3_resp.json()
    assert m3_batch["mapped_count"] == 1
    term_res = m3_batch["records"][0]["terminology_mapping"]
    assert term_res["mapping_status"] == "mapped"
    assert term_res["target_code"] is not None

    # ==========================================================================
    # Stage 4: M4 Patient Identity Safety (Uncertainty-aware identity assessment)
    # ==========================================================================
    m4_comparison = IdentityComparisonItem(
        comparison_id="CMP-E2E-001",
        record_a=PatientIdentityRecord(
            source_provider_id="HOSPITAL_A",
            local_patient_id=patient_id,
            identity_token="SYN_LINK_TOKEN_001",
        ),
        record_b=PatientIdentityRecord(
            source_provider_id="HOSPITAL_B",
            local_patient_id="SYN_PATIENT_104",
            identity_token="SYN_LINK_TOKEN_001",
        ),
    )
    m4_req = IdentityAssessmentBatchRequest(comparisons=[m4_comparison])
    m4_resp = client.post("/api/v1/identity/assess", json=m4_req.model_dump(mode="json"))
    assert m4_resp.status_code == 200, f"M4 failed: {m4_resp.text}"
    m4_assessment = m4_resp.json()
    assert len(m4_assessment["results"]) == 1
    assert m4_assessment["results"][0]["status"] == "same_identity"

    # ==========================================================================
    # Stage 5: M5 FHIR R4 Bundle Assembly (Composition-first document bundle)
    # ==========================================================================
    m5_payload = {
        "batch": m3_batch,
        "patient_reference": patient_id,
    }
    m5_resp = client.post("/api/v1/fhir/bundle", json=m5_payload)
    assert m5_resp.status_code == 200, f"M5 failed: {m5_resp.text}"
    m5_data = m5_resp.json()
    assert m5_data["status"] == "completed"
    bundle = m5_data["bundle"]
    assert bundle["type"] == "document"
    assert bundle["entry"][0]["resource"]["resourceType"] == "Composition"

    # ==========================================================================
    # Stage 6: M6 Consent & Security Gateway (Fail-closed release gate)
    # ==========================================================================
    cid = f"CONSENT-E2E-PIPE-{uuid.uuid4()}"
    now = datetime.now(timezone.utc)
    consent = make_test_consent(
        consent_id=cid,
        patient_id=patient_id,
        hiu_id=recipient_id,
        hip_id=provider_id,
        status="GRANTED",
        from_date=now - timedelta(days=30),
        to_date=now + timedelta(days=2),
    )
    ConsentService.register_consent(consent, initial_status="GRANTED", actor="patient_proxy")

    m6_payload = {
        "consent": consent.model_dump(mode="json"),
        "bundle": bundle,
        "hiu_id": recipient_id,
        "hip_id": provider_id,
    }
    m6_resp = client.post("/api/v1/gateway/release", json=m6_payload)
    assert m6_resp.status_code == 200, f"M6 failed: {m6_resp.text}"
    m6_data = m6_resp.json()
    assert m6_data["status"] == "released"
    assert m6_data["integrity_digest"] is not None

    # ==========================================================================
    # Stage 7: M7 Reliable Healthcare Data Exchange (Simulated Hospital Delivery)
    # ==========================================================================
    token = create_access_token(
        subject="hospital_a_operator",
        organization_id=provider_id,
        roles=[AppRole.HOSPITAL_OPERATOR, AppRole.DATA_PROVIDER],
    )

    m7_payload = {
        "bundle": bundle,
        "consent_id": cid,
        "source_provider_id": provider_id,
        "recipient_hiu_id": recipient_id,
        "patient_reference": patient_id,
        "idempotency_key": f"IDEMP-E2E-{uuid.uuid4()}",
    }

    m7_resp = client.post(
        "/api/v1/exchange/send",
        json=m7_payload,
        headers={"Authorization": f"Bearer {token}"},
    )
    assert m7_resp.status_code == 200, f"M7 failed: {m7_resp.text}"
    m7_data = m7_resp.json()
    assert m7_data["job"]["status"] == "DELIVERED"
    assert m7_data["receipt"]["status"] == "accepted"
    assert m7_data["receipt"]["recipient_id"] == recipient_id
