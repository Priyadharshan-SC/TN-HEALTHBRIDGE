"""Schemas for Universal Patient Identity (UPID) and Provider-Scoped Mappings."""
from datetime import datetime, timezone
from typing import List, Literal, Optional
from pydantic import BaseModel, ConfigDict, Field

MappingVerificationStatus = Literal["VERIFIED", "PENDING", "REJECTED", "REVIEW_REQUIRED"]
MappingMethod = Literal["CONTROLLED_REGISTRY", "MANUAL_VERIFIED", "PATIENT_ASSERTED", "ABHA_LINKED"]


class ProviderMappingBase(BaseModel):
    """Mapping between a Universal Patient ID and a Provider-Scoped Local Patient ID."""
    provider_id: str = Field(..., description="Healthcare organization ID (e.g. HOSPITAL_A, HOSPITAL_B)")
    local_patient_id: str = Field(..., description="Provider's internal patient identifier (e.g. CH1-1042, MH-2098)")
    verification_status: MappingVerificationStatus = Field(default="PENDING")
    mapping_method: MappingMethod = Field(default="MANUAL_VERIFIED")
    confidence_score: float = Field(default=1.0, ge=0.0, le=1.0)
    provenance: str = Field(default="Institutional registration and verification")


class ProviderMappingCreate(ProviderMappingBase):
    """Payload to create a new provider mapping."""
    universal_patient_id: str = Field(..., description="Universal patient identifier (e.g. UPID-ARUN-001)")


class ProviderMappingResponse(ProviderMappingBase):
    """Response model for a provider mapping."""
    model_config = ConfigDict(extra="ignore")

    mapping_id: str
    universal_patient_id: str
    provider_name: Optional[str] = None
    created_at: str
    verified_at: Optional[str] = None


class UniversalPatientCreate(BaseModel):
    """Payload to register a new universal patient."""
    full_name: str = Field(..., min_length=2, max_length=150)
    dob: str = Field(..., description="Date of birth YYYY-MM-DD")
    gender: Literal["MALE", "FEMALE", "OTHER"] = Field(...)
    abha_address: Optional[str] = None
    phone_masked: Optional[str] = Field(None, description="Masked phone e.g. +91 98*** **345")


class UniversalPatientResponse(UniversalPatientCreate):
    """Universal patient profile response model."""
    model_config = ConfigDict(extra="ignore")

    universal_patient_id: str
    status: Literal["ACTIVE", "SUSPENDED"] = "ACTIVE"
    mappings: List[ProviderMappingResponse] = Field(default_factory=list)
    created_at: str
    updated_at: str


class ResolveIdentityRequest(BaseModel):
    """Request to resolve a patient reference across providers."""
    source_provider_id: str
    source_patient_id: str
    target_provider_id: str


class ResolveIdentityResponse(BaseModel):
    """Result of cross-provider patient identity resolution."""
    universal_patient_id: str
    target_patient_id: Optional[str] = None
    target_provider_id: str
    resolution_status: Literal["RESOLVED", "UNRESOLVED", "REVIEW_REQUIRED"]
    confidence: float
    message: str


class MergePatientsRequest(BaseModel):
    """Payload to merge duplicate universal patient identities."""
    source_universal_patient_id: str = Field(..., description="UPID to absorb and remove")
    target_universal_patient_id: str = Field(..., description="Authoritative primary UPID to retain")
    preferred_name: Optional[str] = Field(None, description="Preferred display name for the merged identity")
    reason: Optional[str] = Field("Identity verified as same person", description="Audit justification for merge")

