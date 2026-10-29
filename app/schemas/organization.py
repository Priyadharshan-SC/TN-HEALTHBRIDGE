"""Schemas for Organization and Authorized-User Management."""
from datetime import datetime, timezone
from typing import List, Literal, Optional
from pydantic import BaseModel, ConfigDict, Field

OrgType = Literal["HOSPITAL", "LABORATORY", "CLINIC", "PUBLIC_HEALTH", "OTHER"]
ConnectionStatus = Literal["CONNECTED", "ONLINE", "DEGRADED", "OFFLINE"]


class OrganizationBase(BaseModel):
    """Base organization definition."""
    name: str = Field(..., min_length=2, max_length=150)
    code: str = Field(..., min_length=2, max_length=50, description="Unique short code (e.g. ORG-001, CH1, MH)")
    org_type: OrgType = Field(default="HOSPITAL")
    endpoint_url: str = Field(..., description="Provider FHIR/REST adapter URL")
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    address: Optional[str] = None
    is_active: bool = Field(default=True)


class OrganizationCreate(OrganizationBase):
    """Payload to register a new organization."""
    org_id: str = Field(..., min_length=2, max_length=50, description="Unique uppercase ID (e.g. HOSPITAL_A)")


class OrganizationUpdate(BaseModel):
    """Payload to update an organization."""
    name: Optional[str] = None
    endpoint_url: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    address: Optional[str] = None
    is_active: Optional[bool] = None


class OrganizationResponse(OrganizationBase):
    """Full organization response model."""
    model_config = ConfigDict(extra="ignore")

    org_id: str
    connection_status: ConnectionStatus = "ONLINE"
    user_count: int = 0
    exchange_count: int = 0
    last_exchange_at: Optional[str] = None
    created_at: str
    updated_at: str


class OrgUserBase(BaseModel):
    """Base organization user representation."""
    username: str = Field(..., min_length=3, max_length=50)
    full_name: str = Field(..., min_length=2, max_length=100)
    email: str = Field(..., min_length=5, max_length=100)
    role: str = Field(default="HOSPITAL_OPERATOR", description="SYSTEM_ADMIN, HOSPITAL_OPERATOR, DATA_PROVIDER, DATA_REQUESTER, AUDITOR")
    department: Optional[str] = None
    is_active: bool = Field(default=True)


class OrgUserCreate(OrgUserBase):
    """Create a user associated with an organization."""
    password: str = Field(..., min_length=6, description="Initial plain-text password")


class OrgUserUpdate(BaseModel):
    """Update a user."""
    full_name: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None
    department: Optional[str] = None
    is_active: Optional[bool] = None
    new_password: Optional[str] = None


class OrgUserResponse(OrgUserBase):
    """Response model for an organization user."""
    model_config = ConfigDict(extra="ignore")

    user_id: str
    organization_id: str
    created_at: str
    last_login: Optional[str] = None
