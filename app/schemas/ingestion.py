"""Pydantic models for request validation and standardized ingestion responses."""
from typing import Any, Dict, List, Optional, Union
from pydantic import BaseModel, Field, model_validator


class IngestionRecord(BaseModel):
    """Encapsulates raw, untransformed source fields from a single clinical record."""
    source_fields: Dict[str, Any] = Field(
        ...,
        description="Preserved key-value pairs exactly as supplied by the source provider.",
    )


class IngestionResponse(BaseModel):
    """Standardized response schema across all ingestion adapters in M1."""
    ingestion_id: str = Field(
        ...,
        description="Server-generated unique identifier for this ingestion transaction.",
    )
    source_provider_id: str = Field(
        ...,
        description="Identifies the sending healthcare provider or laboratory.",
    )
    source_format: str = Field(
        ...,
        description="Input serialization format, e.g., 'csv' or 'json'.",
    )
    ingested_at: str = Field(
        ...,
        description="ISO 8601 UTC timestamp recording when ingestion occurred.",
    )
    record_count: int = Field(
        ...,
        description="Total number of clinical records accepted in this batch.",
    )
    status: str = Field(
        default="accepted",
        description="Ingestion processing status.",
    )
    records: List[IngestionRecord] = Field(
        ...,
        description="Collection of ingested records preserving source fields and types.",
    )


class JsonIngestionRequest(BaseModel):
    """Contract for incoming JSON ingestion payloads. Supports single or multi-record batches."""
    source_provider_id: Optional[str] = Field(
        default=None,
        description="Healthcare provider ID. Can alternatively be passed via 'X-Provider-ID' header.",
    )
    records: Optional[List[Dict[str, Any]]] = Field(
        default=None,
        description="List of one or more clinical records.",
    )
    record: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Single clinical record dictionary.",
    )

    @model_validator(mode="before")
    @classmethod
    def validate_payload_shape(cls, data: Any) -> Any:
        # If raw list or non-dict passed, handle gracefully
        if not isinstance(data, dict):
            raise ValueError("Payload must be a JSON object.")

        has_records = "records" in data and data["records"] is not None
        has_record = "record" in data and data["record"] is not None

        if not has_records and not has_record:
            raise ValueError("Payload must contain either a 'records' list or a single 'record' object.")

        if has_records and has_record:
            raise ValueError("Payload cannot contain both 'records' and 'record'. Choose one format.")

        if has_records:
            records = data["records"]
            if not isinstance(records, list):
                raise ValueError("'records' field must be a list.")
            if len(records) == 0:
                raise ValueError("'records' list cannot be empty.")
            for idx, r in enumerate(records):
                if not isinstance(r, dict) or not r:
                    raise ValueError(f"Record at index {idx} must be a non-empty object.")

        if has_record:
            rec = data["record"]
            if not isinstance(rec, dict) or not rec:
                raise ValueError("'record' must be a non-empty object.")

        return data


class ErrorDetail(BaseModel):
    """Standardized error detail response."""
    error_code: str = Field(..., description="Machine-readable error classification code.")
    message: str = Field(..., description="Human-readable safe error description.")


class ErrorResponse(BaseModel):
    """Top-level error response model."""
    error_code: str
    message: str
