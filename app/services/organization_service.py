"""Service for managing healthcare organizations and authorized users."""
from datetime import datetime, timezone
import json
import logging
import os
from pathlib import Path
from typing import Dict, List, Optional
import uuid

from app.core.security import AppRole, AuthenticatedPrincipal, hash_password
from app.schemas.organization import (
    OrganizationCreate,
    OrganizationResponse,
    OrganizationUpdate,
    OrgUserCreate,
    OrgUserResponse,
    OrgUserUpdate,
)
from app.services.audit_service import AuditService

logger = logging.getLogger("tn_healthbridge.services.organization")

ORGS_STORE_PATH = Path("data/organizations/organizations.json")
USERS_STORE_PATH = Path("data/organizations/users.json")


DEFAULT_ORGANIZATIONS = [
    {
        "org_id": "HOSPITAL_A",
        "name": "City Hospital 1",
        "code": "CH1",
        "org_type": "HOSPITAL",
        "endpoint_url": "https://api.cityhospital1.tn.gov.in/fhir",
        "contact_email": "admin@cityhospital1.tn.gov.in",
        "contact_phone": "+91 44 2836 1001",
        "address": "12 Mount Road, Chennai, Tamil Nadu 600002",
        "is_active": True,
        "connection_status": "ONLINE",
        "exchange_count": 42,
        "last_exchange_at": "2026-10-28T09:15:00Z",
        "created_at": "2026-01-10T00:00:00Z",
        "updated_at": "2026-10-28T09:15:00Z",
    },
    {
        "org_id": "LAB_C",
        "name": "Central Laboratory",
        "code": "CL",
        "org_type": "LABORATORY",
        "endpoint_url": "https://api.centrallab.tn.gov.in/fhir",
        "contact_email": "operations@centrallab.tn.gov.in",
        "contact_phone": "+91 44 2490 2002",
        "address": "45 Anna Salai, Guindy, Chennai 600032",
        "is_active": True,
        "connection_status": "ONLINE",
        "exchange_count": 38,
        "last_exchange_at": "2026-10-28T08:45:00Z",
        "created_at": "2026-01-15T00:00:00Z",
        "updated_at": "2026-10-28T08:45:00Z",
    },
    {
        "org_id": "HOSPITAL_B",
        "name": "Metro Hospital",
        "code": "MH",
        "org_type": "HOSPITAL",
        "endpoint_url": "https://api.metrohospital.tn.gov.in/fhir",
        "contact_email": "interop@metrohospital.tn.gov.in",
        "contact_phone": "+91 44 2827 3003",
        "address": "88 Poonamallee High Rd, Kilpauk, Chennai 600010",
        "is_active": True,
        "connection_status": "ONLINE",
        "exchange_count": 29,
        "last_exchange_at": "2026-10-28T07:20:00Z",
        "created_at": "2026-02-01T00:00:00Z",
        "updated_at": "2026-10-28T07:20:00Z",
    },
    {
        "org_id": "HOSPITAL_D",
        "name": "Sunrise Hospital",
        "code": "SH",
        "org_type": "HOSPITAL",
        "endpoint_url": "https://api.sunrisehospital.tn.gov.in/fhir",
        "contact_email": "records@sunrisehospital.tn.gov.in",
        "contact_phone": "+91 422 257 4004",
        "address": "104 Avinashi Road, Coimbatore 641018",
        "is_active": True,
        "connection_status": "ONLINE",
        "exchange_count": 14,
        "last_exchange_at": "2026-10-27T16:30:00Z",
        "created_at": "2026-03-01T00:00:00Z",
        "updated_at": "2026-10-27T16:30:00Z",
    },
    {
        "org_id": "LAB_E",
        "name": "Elite Diagnostics",
        "code": "ED",
        "org_type": "LABORATORY",
        "endpoint_url": "https://api.elitediagnostics.tn.gov.in/fhir",
        "contact_email": "tech@elitediagnostics.tn.gov.in",
        "contact_phone": "+91 431 241 5005",
        "address": "22 Thillai Nagar, Tiruchirappalli 620018",
        "is_active": True,
        "connection_status": "ONLINE",
        "exchange_count": 19,
        "last_exchange_at": "2026-10-28T06:10:00Z",
        "created_at": "2026-03-15T00:00:00Z",
        "updated_at": "2026-10-28T06:10:00Z",
    },
    {
        "org_id": "CLINIC_F",
        "name": "Green Valley Clinic",
        "code": "GVC",
        "org_type": "CLINIC",
        "endpoint_url": "https://api.greenvalleyclinic.tn.gov.in/fhir",
        "contact_email": "care@greenvalleyclinic.tn.gov.in",
        "contact_phone": "+91 452 253 6006",
        "address": "77 Alagar Kovil Road, Madurai 625002",
        "is_active": True,
        "connection_status": "ONLINE",
        "exchange_count": 8,
        "last_exchange_at": "2026-10-26T14:00:00Z",
        "created_at": "2026-04-01T00:00:00Z",
        "updated_at": "2026-10-26T14:00:00Z",
    },
]

DEFAULT_USERS = [
    {
        "user_id": "USR-001",
        "organization_id": "HOSPITAL_A",
        "username": "hospital_a_operator",
        "full_name": "Dr. Senthil Nathan",
        "email": "senthil.n@cityhospital1.tn.gov.in",
        "role": "HOSPITAL_OPERATOR",
        "department": "Interoperability & Data Exchanges",
        "password_hash": hash_password("HospitalA@2026", salt="salt_hosp_a_001"),
        "is_active": True,
        "created_at": "2026-01-10T00:00:00Z",
        "last_login": "2026-10-28T08:00:00Z",
    },
    {
        "user_id": "USR-002",
        "organization_id": "LAB_C",
        "username": "lab_c_provider",
        "full_name": "Kavitha Rajan",
        "email": "kavitha.r@centrallab.tn.gov.in",
        "role": "DATA_PROVIDER",
        "department": "Biochemistry Lab Operations",
        "password_hash": hash_password("LabC@2026", salt="salt_lab_c_001"),
        "is_active": True,
        "created_at": "2026-01-15T00:00:00Z",
        "last_login": "2026-10-28T08:30:00Z",
    },
    {
        "user_id": "USR-003",
        "organization_id": "HOSPITAL_B",
        "username": "hospital_b_requester",
        "full_name": "Ramesh V",
        "email": "ramesh.v@metrohospital.tn.gov.in",
        "role": "DATA_REQUESTER",
        "department": "Outpatient Referrals",
        "password_hash": hash_password("HospitalB@2026", salt="salt_hosp_b_001"),
        "is_active": True,
        "created_at": "2026-02-01T00:00:00Z",
        "last_login": "2026-10-28T07:10:00Z",
    },
    {
        "user_id": "USR-004",
        "organization_id": "HOSPITAL_D",
        "username": "hospital_d_operator",
        "full_name": "Anand Mohan",
        "email": "anand.m@sunrisehospital.tn.gov.in",
        "role": "HOSPITAL_OPERATOR",
        "department": "Health Informatics",
        "password_hash": hash_password("HospitalD@2026", salt="salt_hosp_d_001"),
        "is_active": True,
        "created_at": "2026-03-01T00:00:00Z",
        "last_login": "2026-10-27T16:00:00Z",
    },
    {
        "user_id": "USR-005",
        "organization_id": "LAB_E",
        "username": "lab_e_operator",
        "full_name": "Deepa Sundaram",
        "email": "deepa.s@elitediagnostics.tn.gov.in",
        "role": "DATA_PROVIDER",
        "department": "Pathology Dispatch",
        "password_hash": hash_password("LabE@2026", salt="salt_lab_e_001"),
        "is_active": True,
        "created_at": "2026-03-15T00:00:00Z",
        "last_login": "2026-10-28T06:00:00Z",
    },
    {
        "user_id": "USR-006",
        "organization_id": "CLINIC_F",
        "username": "clinic_f_operator",
        "full_name": "Dr. Meenakshi Sundaram",
        "email": "dr.meenakshi@greenvalleyclinic.tn.gov.in",
        "role": "HOSPITAL_OPERATOR",
        "department": "Family Medicine & Records",
        "password_hash": hash_password("ClinicF@2026", salt="salt_clinic_f_001"),
        "is_active": True,
        "created_at": "2026-04-01T00:00:00Z",
        "last_login": "2026-10-26T13:45:00Z",
    },
]


class OrganizationService:
    """Manages organizations and users with durable JSON storage."""

    @classmethod
    def _ensure_stores(cls):
        """Ensure storage directory and files exist with seed data."""
        ORGS_STORE_PATH.parent.mkdir(parents=True, exist_ok=True)
        if not ORGS_STORE_PATH.exists():
            with open(ORGS_STORE_PATH, "w", encoding="utf-8") as f:
                json.dump(DEFAULT_ORGANIZATIONS, f, indent=2)

        if not USERS_STORE_PATH.exists():
            with open(USERS_STORE_PATH, "w", encoding="utf-8") as f:
                json.dump(DEFAULT_USERS, f, indent=2)

    @classmethod
    def _read_orgs(cls) -> List[Dict]:
        cls._ensure_stores()
        try:
            with open(ORGS_STORE_PATH, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return list(DEFAULT_ORGANIZATIONS)

    @classmethod
    def _write_orgs(cls, orgs: List[Dict]):
        cls._ensure_stores()
        with open(ORGS_STORE_PATH, "w", encoding="utf-8") as f:
            json.dump(orgs, f, indent=2)

    @classmethod
    def _read_users(cls) -> List[Dict]:
        cls._ensure_stores()
        try:
            with open(USERS_STORE_PATH, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return list(DEFAULT_USERS)

    @classmethod
    def _write_users(cls, users: List[Dict]):
        cls._ensure_stores()
        with open(USERS_STORE_PATH, "w", encoding="utf-8") as f:
            json.dump(users, f, indent=2)

    @classmethod
    def list_organizations(cls) -> List[OrganizationResponse]:
        """List all organizations with user count aggregation."""
        orgs = cls._read_orgs()
        users = cls._read_users()
        
        results = []
        for o in orgs:
            org_id = o["org_id"]
            u_count = sum(1 for u in users if u["organization_id"] == org_id and u.get("is_active", True))
            o_copy = dict(o)
            o_copy["user_count"] = u_count
            results.append(OrganizationResponse(**o_copy))
        return results

    @classmethod
    def get_organization(cls, org_id: str) -> Optional[OrganizationResponse]:
        """Get an organization by org_id."""
        orgs = cls.list_organizations()
        for o in orgs:
            if o.org_id.upper() == org_id.upper():
                return o
        return None

    @classmethod
    def create_organization(
        cls, 
        payload: OrganizationCreate, 
        principal: Optional[AuthenticatedPrincipal] = None
    ) -> OrganizationResponse:
        """Register a new organization (Platform Admin only)."""
        if principal and not principal.has_role(AppRole.SYSTEM_ADMIN):
            raise PermissionError("Only SYSTEM_ADMIN can register organizations.")

        orgs = cls._read_orgs()
        norm_id = payload.org_id.strip().upper()
        if any(o["org_id"] == norm_id for o in orgs):
            raise ValueError(f"Organization ID '{norm_id}' is already registered.")
        if any(o["code"].upper() == payload.code.strip().upper() for o in orgs):
            raise ValueError(f"Organization code '{payload.code}' is already registered.")

        now_str = datetime.now(timezone.utc).isoformat()
        new_org = {
            "org_id": norm_id,
            "name": payload.name.strip(),
            "code": payload.code.strip().upper(),
            "org_type": payload.org_type,
            "endpoint_url": payload.endpoint_url.strip(),
            "contact_email": payload.contact_email,
            "contact_phone": payload.contact_phone,
            "address": payload.address,
            "is_active": payload.is_active,
            "connection_status": "ONLINE",
            "exchange_count": 0,
            "last_exchange_at": None,
            "created_at": now_str,
            "updated_at": now_str,
        }
        orgs.append(new_org)
        cls._write_orgs(orgs)

        AuditService.record_event(
            action="ORGANIZATION_CREATED",
            resource_type="ORGANIZATION",
            resource_id=norm_id,
            outcome="SUCCESS",
            actor_id=principal.user_id if principal else "SYSTEM_ADMIN",
            organization_id=norm_id,
        )
        return OrganizationResponse(**new_org, user_count=0)

    @classmethod
    def update_organization(
        cls, 
        org_id: str, 
        payload: OrganizationUpdate, 
        principal: Optional[AuthenticatedPrincipal] = None
    ) -> OrganizationResponse:
        """Update organization details."""
        if principal and not principal.has_role(AppRole.SYSTEM_ADMIN) and not principal.can_access_provider(org_id):
            raise PermissionError("Access denied: cannot update organizations outside your tenant.")

        orgs = cls._read_orgs()
        norm_id = org_id.strip().upper()
        target = None
        for o in orgs:
            if o["org_id"] == norm_id:
                target = o
                break
        if not target:
            raise KeyError(f"Organization '{org_id}' not found.")

        now_str = datetime.now(timezone.utc).isoformat()
        if payload.name is not None:
            target["name"] = payload.name
        if payload.endpoint_url is not None:
            target["endpoint_url"] = payload.endpoint_url
        if payload.contact_email is not None:
            target["contact_email"] = payload.contact_email
        if payload.contact_phone is not None:
            target["contact_phone"] = payload.contact_phone
        if payload.address is not None:
            target["address"] = payload.address
        if payload.is_active is not None:
            target["is_active"] = payload.is_active
        target["updated_at"] = now_str

        cls._write_orgs(orgs)
        AuditService.record_event(
            action="ORGANIZATION_UPDATED",
            resource_type="ORGANIZATION",
            resource_id=norm_id,
            outcome="SUCCESS",
            actor_id=principal.user_id if principal else "SYSTEM_ADMIN",
            organization_id=norm_id,
        )
        return cls.get_organization(norm_id)

    @classmethod
    def toggle_organization_status(
        cls, 
        org_id: str, 
        principal: Optional[AuthenticatedPrincipal] = None
    ) -> OrganizationResponse:
        """Toggle an organization active/inactive status."""
        org = cls.get_organization(org_id)
        if not org:
            raise KeyError(f"Organization '{org_id}' not found.")
        new_status = not org.is_active
        return cls.update_organization(org_id, OrganizationUpdate(is_active=new_status), principal=principal)

    # -------------------------------------------------------------------------
    # User Management
    # -------------------------------------------------------------------------

    @classmethod
    def list_organization_users(
        cls, 
        org_id: str, 
        principal: Optional[AuthenticatedPrincipal] = None
    ) -> List[OrgUserResponse]:
        """List users for a specific organization."""
        if principal and not principal.has_role(AppRole.SYSTEM_ADMIN) and not principal.can_access_provider(org_id):
            raise PermissionError("Access denied: cannot list users outside your tenant organization.")

        norm_id = org_id.strip().upper()
        users = cls._read_users()
        org_users = [u for u in users if u["organization_id"] == norm_id]
        return [OrgUserResponse(**u) for u in org_users]

    @classmethod
    def create_organization_user(
        cls, 
        org_id: str, 
        payload: OrgUserCreate, 
        principal: Optional[AuthenticatedPrincipal] = None
    ) -> OrgUserResponse:
        """Create a user under an organization."""
        norm_id = org_id.strip().upper()
        if principal and not principal.has_role(AppRole.SYSTEM_ADMIN) and not principal.can_access_provider(norm_id):
            raise PermissionError("Access denied: cannot add users to other organizations.")

        users = cls._read_users()
        if any(u["username"].lower() == payload.username.strip().lower() for u in users):
            raise ValueError(f"Username '{payload.username}' is already taken.")
        if any(u["email"].lower() == payload.email.strip().lower() for u in users):
            raise ValueError(f"Email '{payload.email}' is already registered.")

        now_str = datetime.now(timezone.utc).isoformat()
        new_id = f"USR-{uuid.uuid4().hex[:6].upper()}"
        pwd_hash = hash_password(payload.password)

        new_user = {
            "user_id": new_id,
            "organization_id": norm_id,
            "username": payload.username.strip(),
            "full_name": payload.full_name.strip(),
            "email": payload.email.strip(),
            "role": payload.role,
            "department": payload.department,
            "password_hash": pwd_hash,
            "is_active": payload.is_active,
            "created_at": now_str,
            "last_login": None,
        }
        users.append(new_user)
        cls._write_users(users)

        AuditService.record_event(
            action="USER_CREATED",
            resource_type="USER",
            resource_id=new_id,
            outcome="SUCCESS",
            actor_id=principal.user_id if principal else "ADMIN",
            organization_id=norm_id,
        )
        return OrgUserResponse(**new_user)

    @classmethod
    def update_organization_user(
        cls,
        org_id: str,
        user_id: str,
        payload: OrgUserUpdate,
        principal: Optional[AuthenticatedPrincipal] = None
    ) -> OrgUserResponse:
        """Update a user's details or role."""
        norm_id = org_id.strip().upper()
        if principal and not principal.has_role(AppRole.SYSTEM_ADMIN) and not principal.can_access_provider(norm_id):
            raise PermissionError("Access denied: cannot modify users from other organizations.")

        users = cls._read_users()
        target = None
        for u in users:
            if u["user_id"] == user_id and u["organization_id"] == norm_id:
                target = u
                break
        if not target:
            raise KeyError(f"User '{user_id}' not found under organization '{org_id}'.")

        if payload.full_name is not None:
            target["full_name"] = payload.full_name
        if payload.email is not None:
            target["email"] = payload.email
        if payload.role is not None:
            target["role"] = payload.role
        if payload.department is not None:
            target["department"] = payload.department
        if payload.is_active is not None:
            target["is_active"] = payload.is_active
        if payload.new_password:
            target["password_hash"] = hash_password(payload.new_password)

        cls._write_users(users)
        AuditService.record_event(
            action="USER_UPDATED",
            resource_type="USER",
            resource_id=user_id,
            outcome="SUCCESS",
            actor_id=principal.user_id if principal else "ADMIN",
            organization_id=norm_id,
        )
        return OrgUserResponse(**target)
