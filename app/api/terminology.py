"""FastAPI route handlers for M3 Clinical Terminology Mapping Layer."""
from fastapi import APIRouter, status

from app.schemas.normalization import NormalizationResponse
from app.schemas.terminology import TerminologyBatchResponse
from app.services.terminology_service import TerminologyService

router = APIRouter(prefix="/terminology", tags=["Terminology Mapping"])


@router.post(
    "/map",
    response_model=TerminologyBatchResponse,
    status_code=status.HTTP_200_OK,
    summary="Map Normalized Clinical Records to Standard Concepts",
    description=(
        "Processes an M2 normalization response, matches clinical test names deterministically "
        "against an explicit versioned local terminology registry, evaluates contextual specimen and unit "
        "constraints, flags ambiguities and conflicts for review, and returns enriched records without mutating "
        "source fields or creating a centralized clinical database."
    ),
)
async def map_terminology(
    payload: NormalizationResponse,
) -> TerminologyBatchResponse:
    """Evaluate clinical terminology mappings for an M2 normalized batch."""
    return TerminologyService.map_batch(payload)
