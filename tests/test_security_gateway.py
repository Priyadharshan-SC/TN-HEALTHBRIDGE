"""Negative security, authentication, RBAC, and consent lifecycle tests for M6 Gateway."""
from datetime import datetime, timedelta, timezone
import json
import time
import pytest
from fastapi.testclient import TestClient

from app.core.config import get_settings
from app.core.security import (
    AppRole,
    create_access_token,
    decode_access_token,
    hash_password,
    verify_password,
)
from app.main import app
from app.schemas.gateway import (
    AbdmConsentArtefact,
    ConsentActor,
    ConsentDateRange,
    ConsentPatient,
    ConsentPermission,
    ConsentPurpose,
)
from app.services.audit_service import AuditService
from app.services.consent_service import ConsentService
from tests.test_gateway import FIXED_NOW, make_test_bundle, make_test_consent

client = TestClient(app)
settings = get_settings()


@pytest.fixture(autouse=True)
def setup_test_environment(monkeypatch):
    """Enable synthetic test signatures in development/test environment by default for tests."""
    monkeypatch.setattr(settings, "ALLOW_TEST_SIGNATURES", True)
    monkeypatch.setattr(settings, "ENVIRONMENT", "test")


# ==============================================================================
# Authentication & Token Tests
# ==============================================================================

def test_auth_login_success():
    """Verify successful authentication with registered credentials yields valid JWT."""
    resp = client.post(
        "/api/v1/auth/token",
        json={"username": "hospital_a_operator", "password": "HospitalA@2026"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert data["token_type"] == "Bearer"
    assert data["organization_id"] == "HOSPITAL_A"
    assert AppRole.HOSPITAL_OPERATOR in data["roles"]

    # Decode and verify payload
    claims = decode_access_token(data["access_token"])
    assert claims["sub"] == "hospital_a_operator"
    assert claims["org"] == "HOSPITAL_A"


def test_auth_login_invalid_password_rejected():
    """Verify incorrect password returns 401 Unauthorized."""
    resp = client.post(
        "/api/v1/auth/token",
        json={"username": "hospital_a_operator", "password": "WrongPassword"},
    )
    assert resp.status_code == 401
    assert "Invalid username or password" in resp.json()["detail"]


def test_auth_login_unknown_user_rejected():
    """Verify non-existent username returns 401 Unauthorized."""
    resp = client.post(
        "/api/v1/auth/token",
        json={"username": "unknown_hacker", "password": "Password123"},
    )
    assert resp.status_code == 401


def test_token_expired_rejected():
    """Verify expired token cannot be validated."""
    # Generate token that expired 10 seconds ago
    token = create_access_token(
        subject="test_user",
        organization_id="HOSPITAL_A",
        roles=[AppRole.DATA_PROVIDER],
        expires_delta_seconds=-10,
    )
    with pytest.raises(Exception, match="expired"):
        decode_access_token(token)


def test_token_tampered_signature_rejected():
    """Verify tampered JWT signature is rejected."""
    token = create_access_token(
        subject="test_user",
        organization_id="HOSPITAL_A",
        roles=[AppRole.DATA_PROVIDER],
        expires_delta_seconds=3600,
    )
    parts = token.split(".")
    tampered = f"{parts[0]}.{parts[1]}.invalidsignature"
    with pytest.raises(Exception, match="signature"):
        decode_access_token(tampered)


def test_token_malformed_structure_rejected():
    """Verify malformed token strings are rejected."""
    with pytest.raises(Exception, match="Malformed"):
        decode_access_token("not-a-valid-token")


# ==============================================================================
# Consent Lifecycle & Server-Store Hardening Tests
# ==============================================================================

def test_consent_lifecycle_registration_grant_revoke():
    """Verify full consent lifecycle: REQUESTED -> GRANTED -> REVOKED."""
    cid = f"CONSENT-LIFECYCLE-{int(time.time())}"
    now = datetime.now(timezone.utc)
    artefact = make_test_consent(consent_id=cid, status="REQUESTED")

    # 1. Register consent
    reg_resp = client.post(
        "/api/v1/gateway/consent",
        json={"artefact": artefact.model_dump(mode="json"), "initial_status": "REQUESTED"},
    )
    assert reg_resp.status_code == 201
    assert reg_resp.json()["artefact"]["status"] == "REQUESTED"

    # 2. Verify release fails because status is REQUESTED
    bundle = make_test_bundle()
    release_payload = {
        "consent": artefact.model_dump(mode="json"),
        "bundle": bundle.model_dump(mode="json"),
        "hiu_id": artefact.hiu.id,
    }
    rel_fail = client.post("/api/v1/gateway/release", json=release_payload)
    assert rel_fail.status_code == 403
    assert "REQUESTED" in rel_fail.json()["message"]

    # 3. Grant consent
    grant_resp = client.post(
        f"/api/v1/gateway/consent/{cid}/grant",
        json={"signature": f"TEST_SIG_{cid}", "reason": "Patient approved in portal"},
    )
    assert grant_resp.status_code == 200
    assert grant_resp.json()["artefact"]["status"] == "GRANTED"

    # 4. Revoke consent
    revoke_resp = client.post(
        f"/api/v1/gateway/consent/{cid}/revoke",
        json={"reason": "Patient revoked consent via mobile app"},
    )
    assert revoke_resp.status_code == 200
    assert revoke_resp.json()["artefact"]["status"] == "REVOKED"

    # 5. Forged caller-supplied grant: caller claims GRANTED in request, but server store is REVOKED
    forged_consent = artefact.model_copy(update={"status": "GRANTED"})
    forged_payload = {
        "consent": forged_consent.model_dump(mode="json"),
        "bundle": bundle.model_dump(mode="json"),
        "hiu_id": artefact.hiu.id,
    }
    rel_blocked = client.post("/api/v1/gateway/release", json=forged_payload)
    assert rel_blocked.status_code == 403
    assert "REVOKED" in rel_blocked.json()["message"]


def test_unknown_consent_rejected_when_test_signatures_disabled(monkeypatch):
    """Verify that when ALLOW_TEST_SIGNATURES is false, unauthenticated/unregistered signatures are rejected."""
    monkeypatch.setattr(settings, "ALLOW_TEST_SIGNATURES", False)
    consent = make_test_consent(consent_id="UNKNOWN-CONSENT-999")
    bundle = make_test_bundle()
    payload = {
        "consent": consent.model_dump(mode="json"),
        "bundle": bundle.model_dump(mode="json"),
        "hiu_id": consent.hiu.id,
    }
    resp = client.post("/api/v1/gateway/release", json=payload)
    assert resp.status_code == 403
    assert "signature" in resp.json()["message"].lower()


def test_cross_provider_tenant_isolation_enforced():
    """Verify that a caller from HOSPITAL_B cannot access data where HIU is HIU_TN_001."""
    token = create_access_token(
        subject="hospital_b_user",
        organization_id="HOSPITAL_B",
        roles=[AppRole.DATA_REQUESTER],
    )
    consent = make_test_consent(hiu_id="HIU_TN_001")
    bundle = make_test_bundle()
    payload = {
        "consent": consent.model_dump(mode="json"),
        "bundle": bundle.model_dump(mode="json"),
        "hiu_id": "HIU_TN_001",
    }
    # Call with Authorization header
    resp = client.post(
        "/api/v1/gateway/release",
        json=payload,
        headers={"Authorization": f"Bearer {token}"},
    )
    # HIU in request is HIU_TN_001, but caller's token org is HOSPITAL_B -> rejected!
    assert resp.status_code in (403, 400)


def test_audit_events_recorded_on_release():
    """Verify that release evaluations produce structured audit events."""
    AuditService.clear_in_memory_events()
    consent = make_test_consent()
    bundle = make_test_bundle()
    payload = {
        "consent": consent.model_dump(mode="json"),
        "bundle": bundle.model_dump(mode="json"),
        "hiu_id": consent.hiu.id,
    }
    resp = client.post("/api/v1/gateway/release", json=payload)
    assert resp.status_code == 200

    events = AuditService.get_events(action="GATEWAY_RELEASE")
    assert len(events) >= 1
    ev = events[-1]
    assert ev.outcome == "SUCCESS"
    assert ev.resource_type == "BUNDLE"
    assert ev.organization_id == consent.hiu.id


def test_security_headers_and_correlation_id_present():
    """Verify standard security headers and correlation ID in HTTP responses."""
    resp = client.get("/health", headers={"X-Correlation-ID": "CORR-TEST-12345"})
    assert resp.status_code == 200
    assert resp.headers["X-Correlation-ID"] == "CORR-TEST-12345"
    assert resp.headers["X-Content-Type-Options"] == "nosniff"
    assert resp.headers["X-Frame-Options"] == "DENY"
    assert resp.headers["Referrer-Policy"] == "no-referrer"


def test_production_startup_fails_with_insecure_defaults(monkeypatch):
    """Verify that starting the application in production mode fails closed if using dev secrets."""
    from app.main import lifespan

    monkeypatch.setattr(settings, "ENVIRONMENT", "production")
    monkeypatch.setattr(settings, "JWT_SECRET_KEY", "insecure-test-secret-key-for-dev-only-min-32-chars")

    import pytest
    with pytest.raises(RuntimeError, match="CRITICAL SECURITY ERROR"):
        import asyncio
        async def run_lifespan():
            async with lifespan(app):
                pass
        asyncio.run(run_lifespan())
