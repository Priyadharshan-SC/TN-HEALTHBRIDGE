"""Pydantic schemas for M3 Clinical Terminology Mapping Layer."""
from typing import Any, Dict, List, Literal, Optional
from pydantic import BaseModel, Field

from app.schemas.normalization import CanonicalLabRecord, QualityIssue


class MappingReasonCodes:
    """Stable reason codes for explainable clinical terminology mapping decisions."""
    EXACT_MATCH = "EXACT_MATCH"
    ALIAS_MATCH = "ALIAS_MATCH"
    NO_MAPPING_FOUND = "NO_MAPPING_FOUND"
    MULTIPLE_CANDIDATE_MAPPINGS = "MULTIPLE_CANDIDATE_MAPPINGS"
    SPECIMEN_MISMATCH = "SPECIMEN_MISMATCH"
    UNIT_MISMATCH = "UNIT_MISMATCH"
    MISSING_REQUIRED_SPECIMEN = "MISSING_REQUIRED_SPECIMEN"
    MISSING_REQUIRED_UNIT = "MISSING_REQUIRED_UNIT"
    CONTEXT_MISMATCH = "CONTEXT_MISMATCH"
    EXPLICIT_REVIEW_FLAG = "EXPLICIT_REVIEW_FLAG"
    MISSING_SOURCE_TEST_NAME = "MISSING_SOURCE_TEST_NAME"
    UPSTREAM_QUALITY_REJECTION = "UPSTREAM_QUALITY_REJECTION"



class CandidateMappingReference(BaseModel):
    """Reference to an evaluated candidate terminology mapping entry."""
    mapping_id: str = Field(
        ...,
        description="Unique identifier of the evaluated mapping entry.",
    )
    target_system: str = Field(
        ...,
        description="Terminology system URI or namespace (e.g. http://loinc.org).",
    )
    target_code: str = Field(
        ...,
        description="Standard or synthetic concept code.",
    )
    target_display: str = Field(
        ...,
        description="Official or synthetic standard display name.",
    )
    rationale: Optional[str] = Field(
        default=None,
        description="Clinical or mapping rationale.",
    )


class TerminologyMappingResult(BaseModel):
    """Outcome of clinical terminology mapping evaluation for a single record."""
    source_test_name: Optional[str] = Field(
        default=None,
        description="Source test name submitted for terminology mapping.",
    )
    mapping_status: Literal["mapped", "unmapped", "ambiguous", "review_required"] = Field(
        ...,
        description="Classification of terminology mapping outcome.",
    )
    target_system: Optional[str] = Field(
        default=None,
        description="Standard terminology system URI. Populated ONLY when status is 'mapped'.",
    )
    target_code: Optional[str] = Field(
        default=None,
        description="Standard concept code. Populated ONLY when status is 'mapped'.",
    )
    target_display: Optional[str] = Field(
        default=None,
        description="Standard concept display name. Populated ONLY when status is 'mapped'.",
    )
    reason_code: str = Field(
        ...,
        description="Stable machine-readable explanation code for the mapping outcome.",
    )
    message: str = Field(
        ...,
        description="Privacy-safe human-readable explanation of the mapping outcome.",
    )
    registry_version: str = Field(
        ...,
        description="Version identifier of the terminology registry used for evaluation.",
    )
    review_required: bool = Field(
        ...,
        description="Whether human clinical terminology review is required.",
    )
    candidate_mappings: List[CandidateMappingReference] = Field(
        default_factory=list,
        description="Candidate mapping references evaluated, particularly for ambiguous or review cases.",
    )


class MappedRecord(BaseModel):
    """Normalized clinical record enriched with clinical terminology mapping outcome."""
    record_index: int = Field(
        ...,
        description="Zero-based index of the record in the original batch.",
    )
    canonical_fields: CanonicalLabRecord = Field(
        ...,
        description="Preserved canonical laboratory record fields from M2.",
    )
    original_fields: Dict[str, Any] = Field(
        ...,
        description="Preserved raw source fields as ingested from M1.",
    )
    unmapped_fields: Dict[str, Any] = Field(
        default_factory=dict,
        description="Fields present in the source record not recognized by the provider mapping.",
    )
    quality_status: Literal["valid", "warning", "rejected"] = Field(
        ...,
        description="Overall record quality determination from M2.",
    )
    quality_issues: List[QualityIssue] = Field(
        default_factory=list,
        description="Collection of all quality issues identified for this record in M2.",
    )
    terminology_mapping: TerminologyMappingResult = Field(
        ...,
        description="Clinical terminology mapping evaluation outcome.",
    )


class TerminologyBatchResponse(BaseModel):
    """Standardized batch response from M3 Clinical Terminology Mapping Layer."""
    mapping_id: str = Field(
        ...,
        description="Server-generated unique identifier for this terminology mapping transaction.",
    )
    normalization_id: str = Field(
        ...,
        description="Inherited transaction ID from M2 normalization.",
    )
    ingestion_id: str = Field(
        ...,
        description="Inherited transaction ID from M1 ingestion.",
    )
    source_provider_id: str = Field(
        ...,
        description="Inherited healthcare provider identifier.",
    )
    status: str = Field(
        default="completed",
        description="Batch terminology mapping execution status.",
    )
    registry_version: str = Field(
        ...,
        description="Version of the active terminology registry used for this batch.",
    )
    record_count: int = Field(
        ...,
        description="Total number of records evaluated in this batch.",
    )
    mapped_count: int = Field(
        ...,
        description="Count of records safely and uniquely mapped to standard concepts.",
    )
    unmapped_count: int = Field(
        ...,
        description="Count of records with no matching configured mapping.",
    )
    ambiguous_count: int = Field(
        ...,
        description="Count of records with multiple plausible mappings requiring review.",
    )
    review_required_count: int = Field(
        ...,
        description="Count of records requiring review due to context conflicts or explicit flags.",
    )
    records: List[MappedRecord] = Field(
        ...,
        description="List of all mapped records in the batch.",
    )


class TerminologyMappingEntry(BaseModel):
    """Single clinical terminology mapping definition in the registry."""
    mapping_id: str = Field(
        ...,
        description="Stable unique mapping identifier.",
    )
    source_provider_id: Optional[str] = Field(
        default=None,
        description="Specific provider ID if mapping is scoped to a provider, or None for global scope.",
    )
    source_test_name: str = Field(
        ...,
        description="Source laboratory test or investigation name.",
    )
    source_aliases: List[str] = Field(
        default_factory=list,
        description="Explicitly configured alternate test names or acronyms.",
    )
    target_system: str = Field(
        ...,
        description="Target terminology URI or namespace (e.g. http://loinc.org).",
    )
    target_code: str = Field(
        ...,
        description="Standard concept code.",
    )
    target_display: str = Field(
        ...,
        description="Official standard or synthetic display name.",
    )
    mapping_status: Literal["active", "draft", "deprecated"] = Field(
        default="active",
        description="Operational status of this mapping entry.",
    )
    terminology_version: Optional[str] = Field(
        default=None,
        description="Version of target terminology system (e.g. 2.76).",
    )
    specimen_constraints: Optional[List[str]] = Field(
        default=None,
        description="List of acceptable specimens, or None if unconstrained.",
    )
    unit_constraints: Optional[List[str]] = Field(
        default=None,
        description="List of acceptable units, or None if unconstrained.",
    )
    require_specimen: bool = Field(
        default=False,
        description="If True, records lacking specimen information will require review.",
    )
    require_unit: bool = Field(
        default=False,
        description="If True, records lacking unit information will require review.",
    )
    rationale: Optional[str] = Field(
        default=None,
        description="Clinical or mapping rationale.",
    )
    human_review_required: bool = Field(
        default=False,
        description="If True, forces review_required even if matched.",
    )


class TerminologyRegistry(BaseModel):
    """Versioned local terminology mapping registry."""
    registry_version: str = Field(
        ...,
        description="Version identifier of this mapping registry.",
    )
    description: str = Field(
        ...,
        description="Description of the registry content and scope.",
    )
    last_updated: str = Field(
        ...,
        description="ISO 8601 timestamp of last registry update.",
    )
    mappings: List[TerminologyMappingEntry] = Field(
        ...,
        description="Collection of mapping entries.",
    )
