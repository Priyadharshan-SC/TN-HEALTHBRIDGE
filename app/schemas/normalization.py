"""Pydantic schemas for M2 Data Quality and Normalization Layer."""
from typing import Any, Dict, List, Literal, Optional, Union
from pydantic import BaseModel, Field


class CanonicalLabRecord(BaseModel):
    """Canonical representation of an individual laboratory observation record."""
    patient_reference: Optional[str] = Field(
        default=None,
        description="Source-provided patient reference identifier.",
    )
    test_name: Optional[str] = Field(
        default=None,
        description="Source-provided laboratory test or investigation name.",
    )
    result: Optional[Union[int, float, str]] = Field(
        default=None,
        description="Laboratory observation result value, normalized when numeric.",
    )
    unit: Optional[str] = Field(
        default=None,
        description="Source-provided measurement unit, preserved without clinical conversion.",
    )
    observed_at: Optional[str] = Field(
        default=None,
        description="Normalized ISO 8601 observation timestamp.",
    )
    specimen: Optional[str] = Field(
        default=None,
        description="Biological specimen information.",
    )


class QualityIssue(BaseModel):
    """Encapsulates a single data quality assessment finding."""
    code: str = Field(
        ...,
        description="Stable machine-readable error or warning classification code.",
    )
    severity: Literal["warning", "rejected"] = Field(
        ...,
        description="Severity level of the issue: warning (usable) or rejected (ineligible).",
    )
    message: str = Field(
        ...,
        description="Human-readable explanation of the data quality issue.",
    )
    field: Optional[str] = Field(
        default=None,
        description="The relevant canonical or source field name, if applicable.",
    )


class NormalizedRecord(BaseModel):
    """A single normalized clinical record containing canonical fields and data quality metadata."""
    record_index: int = Field(
        ...,
        description="Zero-based index of the record in the original batch.",
    )
    canonical_fields: CanonicalLabRecord = Field(
        ...,
        description="Mapped canonical laboratory record fields.",
    )
    original_fields: Dict[str, Any] = Field(
        ...,
        description="Raw, unmodified source fields as ingested from M1.",
    )
    unmapped_fields: Dict[str, Any] = Field(
        default_factory=dict,
        description="Fields present in the source record not recognized by the provider mapping.",
    )
    quality_status: Literal["valid", "warning", "rejected"] = Field(
        ...,
        description="Overall record quality determination.",
    )
    quality_issues: List[QualityIssue] = Field(
        default_factory=list,
        description="Collection of all quality issues identified for this record.",
    )


class NormalizationResponse(BaseModel):
    """Standardized batch response from M2 Data Quality and Normalization Layer."""
    normalization_id: str = Field(
        ...,
        description="Server-generated unique identifier for this normalization transaction.",
    )
    ingestion_id: str = Field(
        ...,
        description="Inherited transaction ID from M1 ingestion.",
    )
    source_provider_id: str = Field(
        ...,
        description="Inherited healthcare provider identifier from M1.",
    )
    status: str = Field(
        default="completed",
        description="Batch normalization execution status.",
    )
    record_count: int = Field(
        ...,
        description="Total number of records processed in this batch.",
    )
    valid_count: int = Field(
        ...,
        description="Count of records meeting all required criteria without issues.",
    )
    warning_count: int = Field(
        ...,
        description="Count of usable records with non-critical quality issues.",
    )
    rejected_count: int = Field(
        ...,
        description="Count of records rejected due to missing or invalid required data.",
    )
    records: List[NormalizedRecord] = Field(
        ...,
        description="List of all normalized records in the batch.",
    )
