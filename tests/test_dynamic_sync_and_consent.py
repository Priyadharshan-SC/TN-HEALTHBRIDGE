"""Comprehensive End-to-End Tests for Dynamic Patient Registration,
Cross-Hospital Synchronization, Universal Identity Safety, and Dynamic Patient Consent.
"""
import uuid
import pytest
from fastapi.testclient import TestClient

from app.core.security import AppRole, create_access_token
from app.main import app
from app.services.audit_service import AuditService
from app.services.patient_identity_service import PatientIdentityService
from app.services.provider_service import ProviderService

client = TestClient(app)


def get_token(subject: str, org_id: str, role: AppRole, upid: str = None) -> str:
    return create_access_token(
        subject=subject,
        organization_id=org_id,
        roles=[role],
        universal_patient_id=upid,
    )


def test_dynamic_patient_registration_and_identity_mapping():
    """Register a new patient at Hospital A; verify UPID creation and local mapping."""
    staff_token = get_token("nurse_sumathi", "HOSPITAL_A", AppRole.HOSPITAL_OPERATOR)
    unique_suffix = uuid.uuid4().hex[:6]
    local_id = f"CH1-DYN-{unique_suffix}"

    reg_payload = {
        "local_patient_id": local_id,
        "full_name": f"Gokul Raman {unique_suffix}",
        "dob": "1994-08-12",
        "gender": "MALE",
        "phone": "+91 94441 23456",
        "abha_address": f"gokul.{unique_suffix}@abdm",
        "created_at": "2026-10-28T10:00:00Z",
        "active": True,
    }

    # Register at Hospital A
    resp = client.post(
        "/api/v1/providers/HOSPITAL_A/patients",
        json=reg_payload,
        headers={"Authorization": f"Bearer {staff_token}"},
    )
    assert resp.status_code == 201
    created_pt = resp.json()
    assert created_pt["local_patient_id"] == local_id

    # Verify universal patient registry has automatically linked patient
    all_patients = PatientIdentityService.list_patients()
    matched = next((p for p in all_patients if p.full_name == reg_payload["full_name"]), None)
    assert matched is not None, "Patient was not synced to universal identity registry"
    assert matched.universal_patient_id.startswith("UPID-")

    # Verify mapping in UPID
    hosp_a_map = next((m for m in matched.mappings if m.provider_id == "HOSPITAL_A"), None)
    assert hosp_a_map is not None
    assert hosp_a_map.local_patient_id == local_id
    assert hosp_a_map.verification_status == "VERIFIED"


def test_prevent_demographic_collision_without_verified_identifier():
    """Ensure that patients with identical name and DOB are NOT merged automatically

    when lacking verified unique identifiers (preventing accidental record cross-contamination).
    """
    staff_token = get_token("clerk_saravanan", "HOSPITAL_B", AppRole.HOSPITAL_OPERATOR)
    shared_name = "Rajeshwari Natarajan"
    shared_dob = "1987-12-04"

    # Patient 1 registered at Hospital A with distinct phone
    pt1_id = f"CH1-COL1-{uuid.uuid4().hex[:4]}"
    client.post(
        "/api/v1/providers/HOSPITAL_A/patients",
        json={
            "local_patient_id": pt1_id,
            "full_name": shared_name,
            "dob": shared_dob,
            "gender": "FEMALE",
            "phone": "+91 98401 11111",
            "created_at": "2026-10-28T10:00:00Z",
            "active": True,
        },
    )

    # Patient 2 registered at Hospital B with same name & DOB, but different phone and NO ABHA
    pt2_id = f"MH-COL2-{uuid.uuid4().hex[:4]}"
    resp2 = client.post(
        "/api/v1/providers/HOSPITAL_B/patients",
        json={
            "local_patient_id": pt2_id,
            "full_name": shared_name,
            "dob": shared_dob,
            "gender": "FEMALE",
            "phone": "+91 97890 22222",
            "created_at": "2026-10-28T10:01:00Z",
            "active": True,
        },
        headers={"Authorization": f"Bearer {staff_token}"},
    )
    assert resp2.status_code == 201

    # Verify both patients have DISTINCT UPIDs in universal registry
    all_patients = PatientIdentityService.list_patients()
    matching_patients = [p for p in all_patients if p.full_name == shared_name and p.dob == shared_dob]
    assert len(matching_patients) >= 2, "Automatic demographic merging should have been prevented"
    upids = {p.universal_patient_id for p in matching_patients}
    assert len(upids) >= 2, "Each unverified demographic candidate must have an independent UPID"

    # Verify audit event for review required
    recent_audits = AuditService.get_events(limit=50)
    collision_event = next(
        (e for e in recent_audits if getattr(e, "action", None) == "PATIENT_DEMOGRAPHIC_COLLISION_DETECTED" or (isinstance(e, dict) and e.get("action") == "PATIENT_DEMOGRAPHIC_COLLISION_DETECTED")),
        None,
    )
    assert collision_event is not None
    outcome_val = getattr(collision_event, "outcome", None) or (collision_event.get("outcome") if isinstance(collision_event, dict) else None)
    assert outcome_val == "REVIEW_REQUIRED"


def test_verified_cross_hospital_patient_synchronization():
    """Verify that when a verified ABHA identifier is provided, patient is linked to existing UPID

    without copying raw clinical records into the new hospital (zero central persistence).
    """
    staff_token = get_token("staff_d", "HOSPITAL_D", AppRole.HOSPITAL_OPERATOR)
    unique_code = uuid.uuid4().hex[:6]
    abha_addr = f"subha.{unique_code}@abdm"

    # Register at Hospital A
    resp1 = client.post(
        "/api/v1/providers/HOSPITAL_A/patients",
        json={
            "local_patient_id": f"CH1-VER-{unique_code}",
            "full_name": "Subhashini V",
            "dob": "1991-03-25",
            "gender": "FEMALE",
            "phone": "+91 98402 33333",
            "abha_address": abha_addr,
            "created_at": "2026-10-28T10:00:00Z",
            "active": True,
        },
    )
    assert resp1.status_code == 201

    # Add clinical record at Hospital A
    client.post(
        "/api/v1/providers/HOSPITAL_A/records",
        json={
            "local_patient_id": f"CH1-VER-{unique_code}",
            "category": "LABORATORY",
            "test_name": "Fasting Blood Glucose",
            "value": 115.0,
            "unit": "mg/dL",
            "interpretation": "Elevated",
            "attending_practitioner": "Dr. Senthil Nathan",
        },
    )

    # Register at Hospital D with same ABHA address
    resp2 = client.post(
        "/api/v1/providers/HOSPITAL_D/patients",
        json={
            "local_patient_id": f"SH-VER-{unique_code}",
            "full_name": "Subhashini V",
            "dob": "1991-03-25",
            "gender": "FEMALE",
            "phone": "+91 98402 33333",
            "abha_address": abha_addr,
            "created_at": "2026-10-28T10:05:00Z",
            "active": True,
        },
        headers={"Authorization": f"Bearer {staff_token}"},
    )
    assert resp2.status_code == 201

    # Verify single UPID with both provider mappings
    all_patients = PatientIdentityService.list_patients()
    linked_pt = next((p for p in all_patients if p.abha_address == abha_addr), None)
    assert linked_pt is not None
    prov_ids = {m.provider_id for m in linked_pt.mappings}
    assert "HOSPITAL_A" in prov_ids
    assert "HOSPITAL_D" in prov_ids

    # STRICT CHECK: Hospital D local records store must NOT have copied Hospital A's clinical record
    hosp_d_records = ProviderService.list_records("HOSPITAL_D", local_patient_id=f"SH-VER-{unique_code}")
    assert len(hosp_d_records) == 0, "Hospital D must not contain Hospital A's clinical records"


def test_prevent_duplicate_local_registration():
    """Attempting to register the same local_patient_id twice at the same provider returns 409 Conflict."""
    local_id = f"CH1-DUP-{uuid.uuid4().hex[:4]}"
    payload = {
        "local_patient_id": local_id,
        "full_name": "Deepak M",
        "dob": "1983-05-18",
        "gender": "MALE",
        "created_at": "2026-10-28T10:00:00Z",
        "active": True,
    }
    resp1 = client.post("/api/v1/providers/HOSPITAL_A/patients", json=payload)
    assert resp1.status_code == 201

    resp2 = client.post("/api/v1/providers/HOSPITAL_A/patients", json=payload)
    assert resp2.status_code == 409
    assert "already registered" in resp2.json()["detail"]


def test_dynamic_consent_lifecycle_and_federated_exchange():
    """End-to-End dynamic consent flow:

    1. Patient registration & record creation at Hospital A.
    2. Hospital B initiates dynamic consent request (status: REQUESTED).
    3. Patient denies request -> transfer attempt blocked (403).
    4. New consent request generated -> Patient grants consent (status: GRANTED).
    5. Hospital B executes federated exchange -> 200 DELIVERED -> in Hospital B inbox.
    6. Patient revokes consent -> subsequent transfer attempts fail closed (403).
    """
    code = uuid.uuid4().hex[:6]
    local_hosp_a_id = f"CH1-FLW-{code}"
    abha_addr = f"patient.{code}@abdm"

    # Step 1: Register at Hospital A
    reg_resp = client.post(
        "/api/v1/providers/HOSPITAL_A/patients",
        json={
            "local_patient_id": local_hosp_a_id,
            "full_name": f"Kalyani Sundaram {code}",
            "dob": "1990-07-15",
            "gender": "FEMALE",
            "phone": "+91 94443 78901",
            "abha_address": abha_addr,
            "created_at": "2026-10-28T10:00:00Z",
            "active": True,
        },
    )
    assert reg_resp.status_code == 201

    # Add clinical record (TB GeneXpert Detected)
    rec_resp = client.post(
        "/api/v1/providers/HOSPITAL_A/records",
        json={
            "local_patient_id": local_hosp_a_id,
            "category": "DIAGNOSTIC",
            "test_name": "GeneXpert MTB/RIF",
            "value": "Detected",
            "unit": "",
            "interpretation": "Positive",
            "attending_practitioner": "Dr. Senthil Nathan",
        },
    )
    assert rec_resp.status_code == 201

    # Lookup auto-generated UPID
    all_pts = PatientIdentityService.list_patients()
    pt = next(p for p in all_pts if p.abha_address == abha_addr)
    upid = pt.universal_patient_id

    # Step 2: Hospital B creates dynamic consent request
    c_req_resp = client.post(
        "/api/v1/patient/consent-requests",
        json={
            "source_provider_id": "HOSPITAL_A",
            "recipient_provider_id": "HOSPITAL_B",
            "universal_patient_id": upid,
            "purpose": "Pulmonary Evaluation",
        },
    )
    assert c_req_resp.status_code == 201
    consent_id_1 = c_req_resp.json()["artefact"]["consent_id"]

    # Step 3: Patient DENIES consent
    patient_token = get_token("patient_user", "TN_PATIENT_PORTAL", AppRole.PATIENT, upid=upid)
    deny_resp = client.post(
        f"/api/v1/patient/consents/{consent_id_1}/decide",
        json={"decision": "DENY", "notes": "Patient denied release to Hospital B"},
        headers={"Authorization": f"Bearer {patient_token}"},
    )
    assert deny_resp.status_code == 200
    assert deny_resp.json()["artefact"]["status"] == "DENIED"

    # Hospital B tries to exchange with DENIED consent -> FAILS CLOSED
    prov_b_token = get_token("dr_sharma", "HOSPITAL_B", AppRole.HOSPITAL_OPERATOR)
    ex_blocked_resp = client.post(
        "/api/v1/exchange/federated-exchange",
        json={
            "source_provider_id": "HOSPITAL_A",
            "recipient_provider_id": "HOSPITAL_B",
            "universal_patient_id": upid,
            "consent_id": consent_id_1,
            "purpose": "Pulmonary Evaluation",
        },
        headers={"Authorization": f"Bearer {prov_b_token}"},
    )
    assert ex_blocked_resp.status_code == 403
    assert "DENIED" in ex_blocked_resp.json()["detail"].upper()

    # Step 4: Dispatch new request and Patient GRANTS it
    c_req_resp_2 = client.post(
        "/api/v1/patient/consent-requests",
        json={
            "source_provider_id": "HOSPITAL_A",
            "recipient_provider_id": "HOSPITAL_B",
            "universal_patient_id": upid,
            "purpose": "Pulmonary Evaluation",
        },
    )
    assert c_req_resp_2.status_code == 201
    consent_id_2 = c_req_resp_2.json()["artefact"]["consent_id"]

    grant_resp = client.post(
        f"/api/v1/patient/consents/{consent_id_2}/decide",
        json={"decision": "GRANT", "notes": "Patient authorized clinical transfer"},
        headers={"Authorization": f"Bearer {patient_token}"},
    )
    assert grant_resp.status_code == 200
    assert grant_resp.json()["artefact"]["status"] == "GRANTED"

    # Step 5: Execute federated exchange with GRANTED consent -> SUCCESS
    ex_success_resp = client.post(
        "/api/v1/exchange/federated-exchange",
        json={
            "source_provider_id": "HOSPITAL_A",
            "recipient_provider_id": "HOSPITAL_B",
            "universal_patient_id": upid,
            "consent_id": consent_id_2,
            "purpose": "Pulmonary Evaluation",
        },
        headers={"Authorization": f"Bearer {prov_b_token}"},
    )
    assert ex_success_resp.status_code == 200
    ex_data = ex_success_resp.json()
    assert ex_data["job"]["status"] == "DELIVERED"
    assert "receipt" in ex_data

    # Verify delivered item in Hospital B inbox
    inbox_resp = client.get(
        "/api/v1/providers/HOSPITAL_B/inbox",
        headers={"Authorization": f"Bearer {prov_b_token}"},
    )
    assert inbox_resp.status_code == 200
    inbox_items = inbox_resp.json()
    matching_inbox = next((item for item in inbox_items if item["universal_patient_id"] == upid), None)
    assert matching_inbox is not None
    assert "GeneXpert MTB/RIF" in matching_inbox["summary"]

    # Step 6: Patient REVOKES consent -> subsequent attempts FAIL CLOSED
    revoke_resp = client.post(
        f"/api/v1/patient/consents/{consent_id_2}/revoke",
        json={"reason": "Transfer concluded; consent revoked by patient"},
        headers={"Authorization": f"Bearer {patient_token}"},
    )
    assert revoke_resp.status_code == 200
    assert revoke_resp.json()["artefact"]["status"] == "REVOKED"

    ex_revoked_resp = client.post(
        "/api/v1/exchange/federated-exchange",
        json={
            "source_provider_id": "HOSPITAL_A",
            "recipient_provider_id": "HOSPITAL_B",
            "universal_patient_id": upid,
            "consent_id": consent_id_2,
            "purpose": "Pulmonary Evaluation",
        },
        headers={"Authorization": f"Bearer {prov_b_token}"},
    )
    assert ex_revoked_resp.status_code == 403
    assert "REVOKED" in ex_revoked_resp.json()["detail"].upper()


def test_unauthorized_adapter_access_fails_closed():
    """Calling provider adapter without valid authorizing consent fails closed with 403 Forbidden."""
    resp = client.get("/api/v1/providers/HOSPITAL_A/adapter/records/CH1-1042")
    assert resp.status_code == 403

    resp_invalid = client.get(
        "/api/v1/providers/HOSPITAL_A/adapter/records/CH1-1042?consent_id=NON-EXISTENT-CONSENT"
    )
    assert resp_invalid.status_code == 403
