"""Schemas for Federated Healthcare Provider Applications and Adapters."""
from datetime import datetime, timezone
from typing import Any, Dict, List, Literal, Optional, Union
from pydantic import BaseModel, ConfigDict, Field


class LocalPatientRecord(BaseModel):
    """Local patient record stored within a provider's authoritative repository."""
    local_patient_id: str = Field(..., description="Provider-scoped patient reference (e.g. CH1-1042)")
    full_name: str
    dob: str
    gender: Literal["MALE", "FEMALE", "OTHER"]
    phone: Optional[str] = None
    abha_address: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    active: bool = True


class LocalClinicalObservation(BaseModel):
    """Clinical observation or lab result stored locally at a provider."""
    model_config = ConfigDict(extra="ignore")

    record_id: str = Field(..., description="Unique local record ID (e.g. REC-CH1-001)")
    local_patient_id: str
    category: Literal["LABORATORY", "DIAGNOSTIC", "OBSERVATION", "ENCOUNTER"] = "LABORATORY"
    test_name: str = Field(..., description="Local test name e.g. 'Blood Glucose Fasting'")
    value: Union[float, int, str]
    unit: Optional[str] = Field(default="", description="e.g. 'mg/dL' or empty for qualitative results")
    specimen: Optional[str] = "blood"
    reference_range: Optional[str] = "70 - 100 mg/dL"
    interpretation: Optional[str] = "Normal"
    effective_datetime: str
    attending_practitioner: Optional[str] = "Dr. Senthil Nathan"
    notes: Optional[str] = "Standard fasting sample processed."


class CreateClinicalObservationRequest(BaseModel):
    """Payload to add a clinical observation to a provider's local store."""
    local_patient_id: str
    category: Literal["LABORATORY", "DIAGNOSTIC", "OBSERVATION", "ENCOUNTER"] = "LABORATORY"
    test_name: str
    value: Union[float, int, str]
    unit: Optional[str] = Field(default="", description="e.g. 'mg/dL' or empty for qualitative results")
    specimen: Optional[str] = "blood"
    reference_range: Optional[str] = "70 - 100 mg/dL"
    interpretation: Optional[str] = "Normal"
    attending_practitioner: Optional[str] = "Attending Physician"
    notes: Optional[str] = None


class ProviderExchangeRequest(BaseModel):
    """Request initiated by a healthcare provider to request records from another provider."""
    source_provider_id: str = Field(..., description="Source hospital holding the records (e.g. HOSPITAL_A)")
    universal_patient_id: str = Field(..., description="Patient universal identity (e.g. UPID-ARUN-001)")
    target_patient_id: Optional[str] = Field(None, description="Local patient ID at requesting hospital")
    purpose: str = Field(default="Care Management and Consultation")
    data_categories: List[str] = Field(default_factory=lambda: ["DiagnosticReport", "Observation"])
    date_from: Optional[str] = None
    date_to: Optional[str] = None


class ProviderInboxItem(BaseModel):
    """Record received by a provider from an authorized data exchange."""
    model_config = ConfigDict(extra="ignore")

    delivery_id: str
    job_id: str
    sender_provider_id: str
    sender_provider_name: str
    patient_name: str
    universal_patient_id: str
    local_patient_id: str
    data_type: str
    received_at: str
    integrity_digest: str
    receipt_id: str
    summary: str
    records: List[Dict[str, Any]] = Field(default_factory=list)
    fhir_bundle: Optional[Dict[str, Any]] = None
    module_results: Optional[Dict[str, Any]] = None
