"""API router for Federated Healthcare Provider Applications and Adapters."""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.core.security import AuthenticatedPrincipal, get_optional_principal
from app.schemas.provider import (
    CreateClinicalObservationRequest,
    LocalClinicalObservation,
    LocalPatientRecord,
    ProviderExchangeRequest,
    ProviderInboxItem,
)
from app.services.provider_service import ProviderService

router = APIRouter(prefix="/providers", tags=["Federated Provider Applications"])


@router.get("/{provider_id}/patients", response_model=List[LocalPatientRecord])
async def list_provider_patients(
    provider_id: str,
    principal: Optional[AuthenticatedPrincipal] = Depends(get_optional_principal),
):
    """List local patient records at a specific provider."""
    return ProviderService.list_patients(provider_id)


@router.post(
    "/{provider_id}/patients",
    response_model=LocalPatientRecord,
    status_code=status.HTTP_201_CREATED,
)
async def register_provider_patient(
    provider_id: str,
    patient: LocalPatientRecord,
    principal: Optional[AuthenticatedPrincipal] = Depends(get_optional_principal),
):
    """Register a new patient locally in the provider's database."""
    try:
        return ProviderService.register_patient(provider_id, patient, principal=principal)
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(ve))


@router.get("/{provider_id}/records", response_model=List[LocalClinicalObservation])
async def list_provider_records(
    provider_id: str,
    local_patient_id: Optional[str] = Query(None, description="Filter by local patient ID"),
    principal: Optional[AuthenticatedPrincipal] = Depends(get_optional_principal),
):
    """List local clinical records and observations stored at this provider."""
    return ProviderService.list_records(provider_id, local_patient_id=local_patient_id)


@router.post(
    "/{provider_id}/records",
    response_model=LocalClinicalObservation,
    status_code=status.HTTP_201_CREATED,
)
async def create_provider_record(
    provider_id: str,
    payload: CreateClinicalObservationRequest,
    principal: Optional[AuthenticatedPrincipal] = Depends(get_optional_principal),
):
    """Create a new local clinical observation at this provider."""
    return ProviderService.create_record(provider_id, payload, principal=principal)


@router.get(
    "/{provider_id}/adapter/records/{local_patient_id}",
    response_model=List[LocalClinicalObservation],
    summary="Secure Provider Adapter for Middleware",
    description="Endpoint invoked by the middleware to retrieve patient records upon verified consent.",
)
async def adapter_get_patient_records(
    provider_id: str,
    local_patient_id: str,
    consent_id: Optional[str] = Query(None, description="Authorizing ABDM consent identifier"),
    principal: Optional[AuthenticatedPrincipal] = Depends(get_optional_principal),
):
    """Retrieve patient records via provider adapter."""
    try:
        return ProviderService.adapter_get_patient_records(
            provider_id, local_patient_id, consent_id=consent_id, principal=principal
        )
    except PermissionError as pe:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(pe))


@router.get("/{provider_id}/inbox", response_model=List[ProviderInboxItem])
async def list_provider_inbox(
    provider_id: str,
    principal: Optional[AuthenticatedPrincipal] = Depends(get_optional_principal),
):
    """List clinical data transfers delivered to this hospital by TN HealthBridge."""
    return ProviderService.list_inbox(provider_id)
