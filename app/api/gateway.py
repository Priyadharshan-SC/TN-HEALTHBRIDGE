"""API endpoints for M6 Consent & ABDM Security Gateway."""
import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, Header, HTTPException, status

from app.core.security import (
    AppRole,
    AuthenticatedPrincipal,
    get_current_principal,
    get_optional_principal,
    require_role,
)
from app.schemas.gateway import (
    ConsentGrantRequest,
    ConsentRecord,
    ConsentRegisterRequest,
    ConsentRevokeRequest,
    GatewayReleaseRequest,
    GatewayReleaseResponse,
)
from app.services.consent_service import ConsentService
from app.services.gateway_service import GatewayService

logger = logging.getLogger("tn_healthbridge.api.gateway")

router = APIRouter(
    prefix="/gateway",
    tags=["Gateway"],
)


@router.post(
    "/release",
    response_model=GatewayReleaseResponse,
    response_model_exclude_none=True,
    status_code=status.HTTP_200_OK,
    summary="Secure Consent-Bound Health Data Release",
    description=(
        "Evaluates an ABDM-aligned consent artefact against an assembled FHIR R4 Bundle. "
        "Enforces strict fail-closed validation across 6 security gates (lifecycle status, temporal validity, "
        "data retention boundary, patient matching, HIU/HIP authorization, HI-type, and clinical date range). "
        "On full authorization, returns the release envelope with a SHA-256 integrity digest and the original, "
        "unmodified FHIR bundle. Zero central clinical persistence is created."
    ),
)
async def release_clinical_data(
    request: GatewayReleaseRequest,
    principal: Optional[AuthenticatedPrincipal] = Depends(get_optional_principal),
) -> GatewayReleaseResponse:
    """Evaluate synthetic ABDM consent and securely release the unmodified FHIR bundle."""
    return GatewayService.evaluate_and_release(request, principal=principal)


# ==============================================================================
# Consent Lifecycle Management Endpoints
# ==============================================================================

@router.post(
    "/consent",
    response_model=ConsentRecord,
    status_code=status.HTTP_201_CREATED,
    summary="Register Consent Artefact",
    description="Register a new synthetic ABDM consent request in the authoritative consent registry.",
)
async def register_consent(
    payload: ConsentRegisterRequest,
) -> ConsentRecord:
    """Register consent request in the authoritative store."""
    return ConsentService.register_consent(
        artefact=payload.artefact,
        initial_status=payload.initial_status,
        actor=payload.artefact.requester.name if payload.artefact.requester else "system",
    )


@router.get(
    "/consents",
    response_model=List[ConsentRecord],
    status_code=status.HTTP_200_OK,
    summary="List All Authoritative Consent Records",
    description="Retrieve all registered ABDM consent records across the platform.",
)
async def list_all_consents(
    principal: Optional[AuthenticatedPrincipal] = Depends(get_optional_principal),
) -> List[ConsentRecord]:
    """List all registered ABDM consent records."""
    return ConsentService.list_consents()


@router.get(
    "/consent/{consent_id}",
    response_model=ConsentRecord,
    status_code=status.HTTP_200_OK,
    summary="Get Consent Artefact Details",
    description="Retrieve authoritative consent record and full lifecycle transition history.",
)
async def get_consent_details(consent_id: str) -> ConsentRecord:
    """Fetch consent status and lifecycle history by unique ID."""
    record = ConsentService.get_consent(consent_id)
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Consent artefact '{consent_id}' not found in registry.",
        )
    return record


@router.post(
    "/consent/{consent_id}/grant",
    response_model=ConsentRecord,
    status_code=status.HTTP_200_OK,
    summary="Grant Consent",
    description="Transition an active consent request to GRANTED status by authorized patient or administrator.",
)
async def grant_consent(
    consent_id: str,
    payload: ConsentGrantRequest,
) -> ConsentRecord:
    """Grant an active consent request."""
    return ConsentService.grant_consent(
        consent_id=consent_id,
        actor="patient_authorization_service",
        signature=payload.signature,
        reason=payload.reason,
    )


@router.post(
    "/consent/{consent_id}/revoke",
    response_model=ConsentRecord,
    status_code=status.HTTP_200_OK,
    summary="Revoke Consent",
    description="Revoke an active consent artefact immediately. All subsequent releases will be blocked.",
)
async def revoke_consent(
    consent_id: str,
    payload: ConsentRevokeRequest,
) -> ConsentRecord:
    """Revoke consent immediately."""
    return ConsentService.revoke_consent(
        consent_id=consent_id,
        actor="patient_revocation_service",
        reason=payload.reason,
    )
