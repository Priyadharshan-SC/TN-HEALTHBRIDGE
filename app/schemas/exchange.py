"""Pydantic schemas for M7 Reliable, Secure Healthcare Data Exchange Layer."""
from datetime import datetime, timezone
from typing import Any, Dict, List, Literal, Optional
from pydantic import BaseModel, ConfigDict, Field

from app.schemas.fhir import Bundle
from app.schemas.gateway import AbdmConsentArtefact
from app.schemas.terminology import TerminologyBatchResponse

ExchangeJobStatus = Literal[
    "RECEIVED",
    "VALIDATING",
    "BLOCKED",
    "AUTHORIZED",
    "QUEUED",
    "DELIVERING",
    "DELIVERED",
    "RETRY_SCHEDULED",
    "FAILED_PERMANENTLY",
    "CANCELLED",
]

# Legal state machine transitions
LEGAL_TRANSITIONS: Dict[str, set] = {
    "RECEIVED": {"VALIDATING", "CANCELLED", "BLOCKED"},
    "VALIDATING": {"BLOCKED", "AUTHORIZED", "FAILED_PERMANENTLY", "CANCELLED"},
    "AUTHORIZED": {"QUEUED", "CANCELLED", "BLOCKED"},
    "QUEUED": {"DELIVERING", "CANCELLED", "BLOCKED"},
    "DELIVERING": {"DELIVERED", "RETRY_SCHEDULED", "FAILED_PERMANENTLY", "CANCELLED", "BLOCKED"},
    "RETRY_SCHEDULED": {"DELIVERING", "CANCELLED", "BLOCKED", "FAILED_PERMANENTLY"},
    "DELIVERED": set(),           # Terminal
    "FAILED_PERMANENTLY": set(),  # Terminal
    "CANCELLED": set(),           # Terminal
    "BLOCKED": set(),             # Terminal
}


class ReceiverReceipt(BaseModel):
    """Cryptographically verifiable receipt issued by receiving hospital simulator."""
    model_config = ConfigDict(extra="ignore")

    receipt_id: str = Field(..., description="Unique receipt identifier issued by receiving hospital.")
    delivery_id: str = Field(..., description="Delivery envelope identifier being acknowledged.")
    recipient_id: str = Field(..., description="Registered receiver identifier (e.g. HOSPITAL_B).")
    status: Literal["accepted", "rejected"] = Field(..., description="Receipt processing outcome.")
    acknowledged_at: str = Field(..., description="ISO 8601 UTC timestamp of acknowledgement.")
    payload_digest: str = Field(..., description="SHA-256 digest of received clinical envelope.")
    message: str = Field(default="Payload accepted and verified by receiving hospital simulator.")


class ExchangeDeliveryEnvelope(BaseModel):
    """Secure transport envelope delivered to recipient hospital."""
    model_config = ConfigDict(extra="ignore")

    delivery_id: str = Field(..., description="Unique UUID for this delivery attempt.")
    job_id: str = Field(..., description="Exchange job tracking identifier.")
    sender_provider_id: str = Field(..., description="Source HIP identifier.")
    recipient_hiu_id: str = Field(..., description="Destination HIU identifier.")
    consent_id: str = Field(..., description="Authorizing ABDM consent artefact identifier.")
    patient_reference: str = Field(..., description="Patient subject reference.")
    bundle: Bundle = Field(..., description="Authorized FHIR R4 document bundle.")
    integrity_digest: str = Field(..., description="SHA-256 digest of canonical release payload.")
    timestamp: str = Field(..., description="Envelope assembly timestamp.")


class ExchangeJobHistory(BaseModel):
    """Lifecycle transition event on exchange job."""
    model_config = ConfigDict(extra="ignore")

    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    from_status: Optional[str] = None
    to_status: ExchangeJobStatus
    reason: Optional[str] = None


class ExchangeJob(BaseModel):
    """Durable state tracking model for healthcare data exchange."""
    model_config = ConfigDict(extra="ignore")

    job_id: str = Field(..., description="Unique exchange job identifier.")
    idempotency_key: str = Field(..., description="Client-supplied or server-generated idempotency key.")
    request_fingerprint: str = Field(..., description="SHA-256 fingerprint of request payload.")
    caller_organization_id: str = Field(..., description="Authenticated caller organization.")
    source_provider_id: str = Field(..., description="Source Health Information Provider.")
    recipient_hiu_id: str = Field(..., description="Destination Health Information User.")
    patient_reference: str = Field(..., description="Patient reference.")
    status: ExchangeJobStatus = Field(default="RECEIVED", description="Current delivery state.")
    attempt_count: int = Field(default=0, description="Total delivery attempts executed.")
    max_retries: int = Field(default=3, description="Maximum retry count for transient failures.")
    consent_id: str = Field(..., description="ABDM consent identifier.")
    delivery_id: Optional[str] = None
    receipt: Optional[ReceiverReceipt] = None
    error_message: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    completed_at: Optional[str] = None
    history: List[ExchangeJobHistory] = Field(default_factory=list)
    module_results: Optional[Dict[str, Any]] = None
    delivered_records: List[Dict[str, Any]] = Field(default_factory=list)
    fhir_bundle: Optional[Dict[str, Any]] = None


class ExchangeSendRequest(BaseModel):
    """Exchange request payload supporting either M3 batch input or pre-assembled M5 bundle."""
    model_config = ConfigDict(extra="ignore")

    batch: Optional[TerminologyBatchResponse] = Field(
        default=None,
        description="Terminology mapped batch response from M3.",
    )
    bundle: Optional[Bundle] = Field(
        default=None,
        description="Pre-assembled FHIR R4 document bundle (alternative to batch).",
    )
    consent: Optional[AbdmConsentArtefact] = Field(
        default=None,
        description="ABDM consent artefact authorizing data exchange (or use consent_id).",
    )
    consent_id: Optional[str] = Field(
        default=None,
        description="Identifier of server-registered consent artefact.",
    )
    source_provider_id: str = Field(..., description="Source healthcare provider (e.g. HOSPITAL_A).")
    recipient_hiu_id: str = Field(..., description="Destination recipient hospital (e.g. HOSPITAL_B).")
    patient_reference: str = Field(..., description="Subject patient reference.")
    idempotency_key: Optional[str] = Field(
        default=None,
        description="Client-supplied idempotency key for deduplication.",
    )
    simulation_mode: Optional[Literal["normal", "transient_failure", "permanent_failure"]] = Field(
        default="normal",
        description="Deterministic simulation control for receiving hospital behavior.",
    )


class ExchangeSendResponse(BaseModel):
    """Response envelope for healthcare data exchange operation."""
    model_config = ConfigDict(extra="ignore")

    job: ExchangeJob
    receipt: Optional[ReceiverReceipt] = None
    is_idempotent_replay: bool = Field(
        default=False,
        description="True if this response returned a cached previous operation result.",
    )


class ReceiverSimulateRequest(BaseModel):
    """Direct testing payload for the simulated receiving hospital endpoint."""
    model_config = ConfigDict(extra="ignore")

    envelope: ExchangeDeliveryEnvelope
    simulation_mode: Optional[Literal["normal", "transient_failure", "permanent_failure"]] = "normal"


class FederatedExchangeRequest(BaseModel):
    """End-to-end federated request initiated by a healthcare provider or patient."""
    source_provider_id: str = Field(..., description="Provider holding the records e.g. HOSPITAL_A")
    destination_provider_id: Optional[str] = Field(None, description="Provider requesting the records e.g. HOSPITAL_B")
    recipient_provider_id: Optional[str] = Field(None, description="Alias for destination_provider_id e.g. HOSPITAL_B")
    universal_patient_id: str = Field(..., description="Universal Patient ID e.g. UPID-ARUN-001")
    consent_id: str = Field(..., description="Authorizing ABDM consent identifier")
    purpose: str = Field(default="Care Management and Consultation")
    data_categories: List[str] = Field(default_factory=lambda: ["DiagnosticReport", "Observation"])
    idempotency_key: Optional[str] = None
    simulation_mode: Optional[Literal["normal", "transient_failure", "permanent_failure"]] = "normal"


class PaginatedExchangeJobsResponse(BaseModel):
    """Paginated list of exchange transfer jobs."""
    model_config = ConfigDict(extra="ignore")

    jobs: List[ExchangeJob]
    total_count: int
    page: int
    page_size: int
    total_pages: int

