"""FastAPI route handlers for M2 Data Quality and Normalization Layer."""
from fastapi import APIRouter, status

from app.schemas.ingestion import IngestionResponse
from app.schemas.normalization import NormalizationResponse
from app.services.normalization_service import NormalizationService

router = APIRouter(prefix="/normalization", tags=["Normalization"])


@router.post(
    "/process",
    response_model=NormalizationResponse,
    status_code=status.HTTP_200_OK,
    summary="Normalize Ingested Healthcare Records",
    description=(
        "Transforms a validated M1 ingestion response into canonical laboratory records, "
        "validates required fields, normalizes data types, preserves source fields and unmapped keys, "
        "and evaluates record-level data quality. "
        "\n\n**Provider Authenticity Boundary:**\n"
        "This endpoint accepts a caller-supplied M1-shaped envelope (`IngestionResponse`). In this prototype "
        "hardening pass, M2 verifies envelope schema structure and checks the provider against registered mapping "
        "profiles, but does not independently authenticate caller origin or verify cryptographic signatures. "
        "Ingestion metadata and provider IDs are not cryptographically trusted; internal service boundaries and "
        "mutual TLS / cryptographic token authentication remain out of scope for this prototype."
    ),
)
async def process_normalization(
    payload: IngestionResponse,
) -> NormalizationResponse:
    """Normalize records and assess data quality from an M1 ingestion batch.
    
    Security & Authenticity Note:
    M2 processes caller-supplied M1-shaped envelopes based on registered configuration.
    It does not independently authenticate the caller's cryptographic identity or origin.
    """
    return NormalizationService.normalize_batch(payload)
