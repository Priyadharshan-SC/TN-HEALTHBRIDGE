"""Schemas for Patient Portal operations, consent control, and sharing history."""
from datetime import datetime, timezone
from typing import Any, Dict, List, Literal, Optional, Union
from pydantic import BaseModel, ConfigDict, Field

from app.schemas.gateway import ConsentRecord


class PatientConsentDecisionRequest(BaseModel):
    """Payload for patient to grant or deny a consent request."""
    decision: Literal["GRANT", "DENY"] = Field(..., description="Patient decision")
    reason: Optional[str] = Field(None, description="Reason or patient note")


class PatientConsentRevokeRequest(BaseModel):
    """Payload for patient to revoke an active consent."""
    reason: Optional[str] = Field(default="Revoked by patient via Patient Portal")


class CreateDynamicConsentRequest(BaseModel):
    """Payload for initiating a dynamic patient consent request."""
    source_provider_id: str
    recipient_provider_id: str
    universal_patient_id: str
    purpose: str = "Care Management and Clinical Consultation"


class PatientHospitalAssociationView(BaseModel):
    """View of a healthcare provider connected to the patient."""
    model_config = ConfigDict(extra="ignore")

    provider_id: str
    provider_name: str
    local_patient_id: str
    verification_status: str
    mapping_method: str
    confidence_score: float
    verified_at: Optional[str] = None
    records_count: int = 0


class PatientRecordSummary(BaseModel):
    """Federated clinical record summary shown to the patient."""
    model_config = ConfigDict(extra="ignore")

    record_id: str
    source_provider_id: str
    source_provider_name: str
    test_name: str
    value: Union[float, int, str]
    unit: Optional[str] = Field(default="")
    interpretation: Optional[str] = None
    effective_datetime: str
    attending_practitioner: Optional[str] = None
    retrieval_status: str = "Retrieved live via federated adapter"


class PatientSharingEvent(BaseModel):
    """Audit entry of clinical data shared on behalf of the patient."""
    model_config = ConfigDict(extra="ignore")

    event_id: str
    timestamp: str
    source_provider_name: str
    recipient_provider_name: str
    purpose: str
    data_type: str
    consent_id: str
    status: str
    message: str


class PatientProfileSummary(BaseModel):
    """Summary profile for the authenticated patient."""
    model_config = ConfigDict(extra="ignore")

    universal_patient_id: str
    full_name: str
    dob: str
    gender: str
    abha_address: Optional[str] = None
    phone_masked: Optional[str] = None
    connected_providers_count: int = 0
    pending_consents_count: int = 0
    active_consents_count: int = 0
    total_shared_exchanges_count: int = 0
