"""FastAPI route handlers for M4 Patient Identity Safety and Universal Identity Mapping."""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.core.security import AuthenticatedPrincipal, get_optional_principal
from app.schemas.identity import (
    IdentityAssessmentBatchRequest,
    IdentityAssessmentResponse,
)
from app.schemas.patient_identity import (
    MergePatientsRequest,
    ProviderMappingCreate,
    ProviderMappingResponse,
    ResolveIdentityRequest,
    ResolveIdentityResponse,
    UniversalPatientCreate,
    UniversalPatientResponse,
)
from app.services.identity_service import IdentityService
from app.services.patient_identity_service import PatientIdentityService

router = APIRouter(prefix="/identity", tags=["Patient Identity Safety & Mapping"])


# -----------------------------------------------------------------------------
# M4 Uncertainty-Aware Identity Safety Assessment
# -----------------------------------------------------------------------------

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


# -----------------------------------------------------------------------------
# Universal Patient Identity (UPID) and Provider Mapping
# -----------------------------------------------------------------------------

@router.get(
    "/patients",
    response_model=List[UniversalPatientResponse],
    summary="List/Search Universal Patients",
    description="Retrieve universal patients and their provider-scoped mappings with optional search filter.",
)
async def list_patients(
    search: Optional[str] = Query(None, description="Search by UPID, name, ABHA, or local ID"),
    provider_id: Optional[str] = Query(None, description="Filter by registered provider ID"),
    principal: Optional[AuthenticatedPrincipal] = Depends(get_optional_principal),
) -> List[UniversalPatientResponse]:
    """List universal patients with provider-scoped mappings."""
    return PatientIdentityService.list_patients(search=search, provider_id=provider_id)


@router.post(
    "/patients",
    response_model=UniversalPatientResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create Universal Patient Identity",
    description="Generate a stable opaque UPID for a newly registered patient.",
)
async def create_patient(
    payload: UniversalPatientCreate,
    principal: Optional[AuthenticatedPrincipal] = Depends(get_optional_principal),
) -> UniversalPatientResponse:
    """Register a new universal patient."""
    return PatientIdentityService.create_patient(payload, principal=principal)


@router.get(
    "/patients/{universal_patient_id}",
    response_model=UniversalPatientResponse,
    summary="Get Universal Patient Profile",
    description="Retrieve a universal patient profile and verified provider mappings by UPID.",
)
async def get_patient(
    universal_patient_id: str,
    principal: Optional[AuthenticatedPrincipal] = Depends(get_optional_principal),
) -> UniversalPatientResponse:
    """Retrieve universal patient profile by UPID."""
    patient = PatientIdentityService.get_patient(universal_patient_id)
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Universal Patient ID '{universal_patient_id}' not found.",
        )
    return patient


@router.post(
    "/mappings",
    response_model=ProviderMappingResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add Verified Provider Mapping",
    description="Associate a provider-scoped patient reference to a UPID with strict uniqueness checks.",
)
async def add_provider_mapping(
    payload: ProviderMappingCreate,
    principal: Optional[AuthenticatedPrincipal] = Depends(get_optional_principal),
) -> ProviderMappingResponse:
    """Add a verified provider mapping to a universal patient."""
    try:
        return PatientIdentityService.add_mapping(payload, principal=principal)
    except KeyError as ke:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(ke))
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(ve))


@router.post(
    "/resolve",
    response_model=ResolveIdentityResponse,
    summary="Resolve Identity Across Providers",
    description="Safely resolve a source provider reference to a destination provider reference.",
)
async def resolve_identity(
    payload: ResolveIdentityRequest,
    principal: Optional[AuthenticatedPrincipal] = Depends(get_optional_principal),
) -> ResolveIdentityResponse:
    """Resolve cross-provider patient identity."""
    return PatientIdentityService.resolve_identity(payload)


@router.post(
    "/merge",
    response_model=UniversalPatientResponse,
    status_code=status.HTTP_200_OK,
    summary="Merge Universal Patient Identities",
    description="Administratively merge duplicate UPIDs into a single unified UPID, consolidating all provider mappings.",
)
async def merge_patients(
    payload: MergePatientsRequest,
    principal: Optional[AuthenticatedPrincipal] = Depends(get_optional_principal),
) -> UniversalPatientResponse:
    """Merge duplicate universal patient identities into a single consolidated UPID."""
    try:
        return PatientIdentityService.merge_patients(
            source_upid=payload.source_universal_patient_id,
            target_upid=payload.target_universal_patient_id,
            preferred_name=payload.preferred_name,
            reason=payload.reason,
            principal=principal,
        )
    except KeyError as ke:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(ke))
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))

