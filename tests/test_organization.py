"""Tests for Organization Management and Organization Access (Phase 5)."""
import pytest
from fastapi.testclient import TestClient

from app.core.security import AppRole, create_access_token
from app.main import app
from app.services.organization_service import OrganizationService

client = TestClient(app)


def get_admin_token() -> str:
    return create_access_token(
        subject="admin",
        organization_id="TN_HEALTH_DEPT",
        roles=[AppRole.SYSTEM_ADMIN],
    )


def get_hosp_a_token() -> str:
    return create_access_token(
        subject="hospital_a_operator",
        organization_id="HOSPITAL_A",
        roles=[AppRole.HOSPITAL_OPERATOR],
    )


def test_list_all_six_default_organizations():
    """Verify all 6 named provider organizations exist."""
    response = client.get("/api/v1/organizations")
    assert response.status_code == 200
    data = response.json()
    org_ids = {o["org_id"] for o in data}
    expected = {"HOSPITAL_A", "LAB_C", "HOSPITAL_B", "HOSPITAL_D", "LAB_E", "CLINIC_F"}
    assert expected.issubset(org_ids)


def test_get_specific_organization():
    """Get City Hospital 1 details."""
    response = client.get("/api/v1/organizations/HOSPITAL_A")
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "City Hospital 1"
    assert data["code"] == "CH1"
    assert data["org_type"] == "HOSPITAL"
    assert data["connection_status"] == "ONLINE"


import uuid

def test_create_organization_admin_only():
    """Non-admin cannot create organization; admin can."""
    hosp_token = get_hosp_a_token()
    rand_code = uuid.uuid4().hex[:5].upper()
    payload = {
        "org_id": f"TEST_HOSP_{rand_code}",
        "name": f"Test Hospital {rand_code}",
        "code": f"T{rand_code}",
        "org_type": "HOSPITAL",
        "endpoint_url": "https://api.testx.tn.gov.in",
    }
    # Denied for hospital operator
    resp = client.post(
        "/api/v1/organizations",
        json=payload,
        headers={"Authorization": f"Bearer {hosp_token}"},
    )
    assert resp.status_code == 403

    # Permitted for system admin
    admin_token = get_admin_token()
    resp_admin = client.post(
        "/api/v1/organizations",
        json=payload,
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp_admin.status_code == 201
    assert resp_admin.json()["org_id"] == f"TEST_HOSP_{rand_code}"


def test_duplicate_organization_id_rejected():
    """Cannot register organization with duplicate ID."""
    admin_token = get_admin_token()
    payload = {
        "org_id": "HOSPITAL_A",
        "name": "Duplicate City Hospital",
        "code": "DCH",
        "org_type": "HOSPITAL",
        "endpoint_url": "https://api.cityhosp.tn.gov.in",
    }
    resp = client.post(
        "/api/v1/organizations",
        json=payload,
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp.status_code == 409


def test_list_and_create_organization_user():
    """Add a new user under an organization."""
    admin_token = get_admin_token()
    rand_u = uuid.uuid4().hex[:6]
    user_payload = {
        "username": f"dr_{rand_u}",
        "full_name": "Dr. K. Subramaniam",
        "email": f"subramaniam_{rand_u}@cityhospital1.tn.gov.in",
        "role": "HOSPITAL_OPERATOR",
        "department": "Cardiology",
        "password": "Password@2026",
    }
    resp = client.post(
        "/api/v1/organizations/HOSPITAL_A/users",
        json=user_payload,
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp.status_code == 201
    assert resp.json()["username"] == f"dr_{rand_u}"

    # List users
    resp_list = client.get("/api/v1/organizations/HOSPITAL_A/users")
    assert resp_list.status_code == 200
    usernames = [u["username"] for u in resp_list.json()]
    assert f"dr_{rand_u}" in usernames


def test_tenant_isolation_user_creation_denied():
    """Hospital A operator cannot add users to Hospital B."""
    hosp_a_token = get_hosp_a_token()
    user_payload = {
        "username": "intruder_user",
        "full_name": "Intruder User",
        "email": "intruder@metrohospital.tn.gov.in",
        "role": "HOSPITAL_OPERATOR",
        "password": "Password@2026",
    }
    resp = client.post(
        "/api/v1/organizations/HOSPITAL_B/users",
        json=user_payload,
        headers={"Authorization": f"Bearer {hosp_a_token}"},
    )
    assert resp.status_code == 403
