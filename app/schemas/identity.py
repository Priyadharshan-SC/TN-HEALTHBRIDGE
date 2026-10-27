"""Pydantic schemas for M4 Patient Identity Safety and Uncertainty-Aware Linkage."""
from typing import List, Literal, Optional
from pydantic import BaseModel, Field


class IdentityReasonCodes:
    """Stable reason codes for explainable patient identity safety decisions."""
    PROVIDER_CONTEXT_MISSING = "PROVIDER_CONTEXT_MISSING"
    LOCAL_REFERENCE_MISSING = "LOCAL_REFERENCE_MISSING"
    SAME_LOCAL_ID_DIFFERENT_PROVIDERS = "SAME_LOCAL_ID_DIFFERENT_PROVIDERS"
    STRONG_SYNTHETIC_LINKAGE_MATCH = "STRONG_SYNTHETIC_LINKAGE_MATCH"
    STRONG_SYNTHETIC_LINKAGE_CONFLICT = "STRONG_SYNTHETIC_LINKAGE_CONFLICT"
    DEMOGRAPHIC_EVIDENCE_INSUFFICIENT = "DEMOGRAPHIC_EVIDENCE_INSUFFICIENT"
    IDENTITY_EVIDENCE_MISSING = "IDENTITY_EVIDENCE_MISSING"
    IDENTITY_EVIDENCE_CONFLICT = "IDENTITY_EVIDENCE_CONFLICT"
    MALFORMED_IDENTITY_INPUT = "MALFORMED_IDENTITY_INPUT"
    REVIEW_REQUIRED = "REVIEW_REQUIRED"
    UNKNOWN_PROVIDER = "UNKNOWN_PROVIDER"
    UNTRUSTED_IDENTITY_TOKEN = "UNTRUSTED_IDENTITY_TOKEN"
    IDENTITY_EVIDENCE_NOT_BOUND_TO_REFERENCES = "IDENTITY_EVIDENCE_NOT_BOUND_TO_REFERENCES"




IdentityDecisionStatus = Literal[
    "same_identity",
    "different_identity",
    "possible_match",
    "unresolved",
    "review_required",
]

EvidenceCategory = Literal[
    "strong_synthetic_linkage",
    "provider_local_reference",
    "demographic_similarity",
    "missing_evidence",
    "conflicting_evidence",
]


class PatientDemographics(BaseModel):
    """Optional synthetic demographic attributes for assessing similarity or conflict."""
    first_name: Optional[str] = Field(
        default=None,
        description="Synthetic first or given name.",
    )
    last_name: Optional[str] = Field(
        default=None,
        description="Synthetic last or family name.",
    )
    date_of_birth: Optional[str] = Field(
        default=None,
        description="Synthetic date of birth in ISO 8601 format (YYYY-MM-DD).",
    )
    gender: Optional[str] = Field(
        default=None,
        description="Synthetic administrative gender.",
    )


class PatientIdentityRecord(BaseModel):
    """Synthetic representation of a provider-local patient reference or clinical record context."""
    source_provider_id: Optional[str] = Field(
        default=None,
        description="Source healthcare provider identifier establishing the reference scope.",
    )
    local_patient_id: Optional[str] = Field(
        default=None,
        description="Provider-local patient reference (e.g. MRN or internal patient ID).",
    )
    identity_token: Optional[str] = Field(
        default=None,
        description="Optional explicitly configured synthetic identity token (e.g. SYN_LINK_TOKEN_...).",
    )
    demographics: Optional[PatientDemographics] = Field(
        default=None,
        description="Optional synthetic demographic attributes.",
    )
    record_correlation_id: Optional[str] = Field(
        default=None,
        description="Optional correlation identifier from upstream M1/M2/M3 batch or exchange event.",
    )


class ScopedPatientReference(BaseModel):
    """Privacy-safe representation of a provider-scoped patient reference."""
    source_provider_id: Optional[str] = Field(
        default=None,
        description="Source healthcare provider identifier.",
    )
    local_patient_id: Optional[str] = Field(
        default=None,
        description="Provider-local reference identifier.",
    )


class IdentityComparisonItem(BaseModel):
    """A pair of synthetic patient references to assess for potential linkage."""
    comparison_id: str = Field(
        ...,
        description="Client or transaction unique identifier for this comparison pair.",
    )
    record_a: PatientIdentityRecord = Field(
        ...,
        description="First synthetic patient identity reference.",
    )
    record_b: PatientIdentityRecord = Field(
        ...,
        description="Second synthetic patient identity reference.",
    )


class IdentityAssessmentResult(BaseModel):
    """Outcome of identity safety and linkage assessment for a comparison pair."""
    comparison_id: str = Field(
        ...,
        description="Unique identifier of the evaluated comparison pair.",
    )
    status: IdentityDecisionStatus = Field(
        ...,
        description="Linkage assessment determination.",
    )
    reason_code: str = Field(
        ...,
        description="Stable machine-readable code explaining the assessment outcome.",
    )
    message: str = Field(
        ...,
        description="Privacy-safe explanation of the assessment outcome.",
    )
    evidence_categories: List[EvidenceCategory] = Field(
        default_factory=list,
        description="Categories of evidence evaluated during linkage assessment.",
    )
    review_required: bool = Field(
        ...,
        description="Indicates whether human identity review is required before any association.",
    )
    record_a_reference: Optional[ScopedPatientReference] = Field(
        default=None,
        description="Provider-scoped reference metadata for record A.",
    )
    record_b_reference: Optional[ScopedPatientReference] = Field(
        default=None,
        description="Provider-scoped reference metadata for record B.",
    )


class IdentityAssessmentBatchRequest(BaseModel):
    """Batch request for evaluating one or more synthetic patient identity comparison pairs."""
    batch_id: Optional[str] = Field(
        default=None,
        description="Client or transaction batch identifier.",
    )
    comparisons: List[IdentityComparisonItem] = Field(
        ...,
        description="List of comparison pairs to assess.",
    )


class IdentityAssessmentResponse(BaseModel):
    """Standardized response from M4 Patient Identity Safety Assessment."""
    batch_id: str = Field(
        ...,
        description="Batch or transaction identifier.",
    )
    status: str = Field(
        default="completed",
        description="Batch assessment execution status.",
    )
    total_comparisons: int = Field(
        ...,
        description="Total number of comparison pairs assessed.",
    )
    same_identity_count: int = Field(
        ...,
        description="Count of comparisons where strong synthetic evidence supports association.",
    )
    different_identity_count: int = Field(
        ...,
        description="Count of comparisons where strong synthetic evidence indicates different identities.",
    )
    possible_match_count: int = Field(
        ...,
        description="Count of comparisons where demographic similarity exists without strong evidence.",
    )
    unresolved_count: int = Field(
        ...,
        description="Count of comparisons with insufficient, missing, or scoped-only evidence.",
    )
    review_required_count: int = Field(
        ...,
        description="Count of comparisons requiring authorized human review due to conflicts.",
    )
    results: List[IdentityAssessmentResult] = Field(
        ...,
        description="List of individual comparison assessment results.",
    )


class SyntheticIdentityEntry(BaseModel):
    """Explicit association of a synthetic subject, approved token, and authorized references."""
    synthetic_subject_id: str = Field(
        ...,
        description="Internal test fixture synthetic subject identifier. Never returned as a real patient ID.",
    )
    identity_token: str = Field(
        ...,
        description="Approved synthetic linkage token for this subject.",
    )
    authorized_scoped_references: List[ScopedPatientReference] = Field(
        ...,
        description="Explicit list of provider-scoped references authorized to represent this subject.",
    )
    fixture_version: str = Field(
        default="1.0.0",
        description="Fixture version for reproducibility.",
    )
    description: Optional[str] = Field(
        default=None,
        description="Description of the synthetic subject test fixture.",
    )


class SyntheticIdentityRegistry(BaseModel):
    """Controlled static synthetic identity fixture registry."""
    registry_version: str = Field(
        ...,
        description="Version of the synthetic identity fixture registry.",
    )
    description: str = Field(
        ...,
        description="Scope and purpose of this test registry.",
    )
    last_updated: str = Field(
        ...,
        description="ISO timestamp of last update.",
    )
    identities: List[SyntheticIdentityEntry] = Field(
        ...,
        description="Collection of authorized synthetic identity fixtures.",
    )

