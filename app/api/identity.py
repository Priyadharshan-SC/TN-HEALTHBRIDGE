"""FastAPI route handlers for M4 Patient Identity Safety and Uncertainty-Aware Linkage."""
from fastapi import APIRouter, status

from app.schemas.identity import (
    IdentityAssessmentBatchRequest,
    IdentityAssessmentResponse,
)
from app.services.identity_service import IdentityService

router = APIRouter(prefix="/identity", tags=["Patient Identity Safety"])


@router.post(
    "/assess",
    response_model=IdentityAssessmentResponse,
    status_code=status.HTTP_200_OK,
    summary="Assess Patient Identity Linkage Safety",
    description=(
        "Evaluates synthetic patient references for simulated cross-provider exchange workflows. "
        "Scopes local identifiers to provider contexts, requires configured strong synthetic linkage "
        "tokens for association, detects evidence conflicts, explicitly represents uncertainty, and "
        "never merges records or introduces a persistent identity database."
    ),
)
async def assess_identity(
    payload: IdentityAssessmentBatchRequest,
) -> IdentityAssessmentResponse:
    """Evaluate patient identity linkage safety for a batch of synthetic reference comparison pairs."""
    service = IdentityService()
    return service.assess_batch(payload)
