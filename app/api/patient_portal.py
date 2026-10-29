"""API router for Patient Portal operations, consent control, and record views."""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.core.security import AuthenticatedPrincipal, get_optional_principal
from app.schemas.gateway import ConsentRecord
from app.schemas.patient_portal import (
    CreateDynamicConsentRequest,
    PatientConsentDecisionRequest,
    PatientConsentRevokeRequest,
    PatientHospitalAssociationView,
    PatientProfileSummary,
    PatientRecordSummary,
    PatientSharingEvent,
)
from app.services.patient_portal_service import PatientPortalService

router = APIRouter(prefix="/patient", tags=["Patient Portal"])


@router.get("/profile", response_model=PatientProfileSummary)
async def get_patient_profile(
    upid: Optional[str] = Query(None),
    principal: Optional[AuthenticatedPrincipal] = Depends(get_optional_principal),
):
    """Retrieve profile and interoperability KPIs for the patient."""
    target_upid = upid or PatientPortalService.get_current_upid(principal)
    return PatientPortalService.get_profile(target_upid)


@router.get("/consents", response_model=List[ConsentRecord])
async def list_patient_consents(
    upid: Optional[str] = Query(None),
    principal: Optional[AuthenticatedPrincipal] = Depends(get_optional_principal),
):
    """List consent requests and active permissions for the calling patient."""
    target_upid = upid or PatientPortalService.get_current_upid(principal)
    return PatientPortalService.list_consents(target_upid)


@router.post("/consents/{consent_id}/decide", response_model=ConsentRecord)
async def decide_patient_consent(
    consent_id: str,
    payload: PatientConsentDecisionRequest,
    upid: Optional[str] = Query(None),
    principal: Optional[AuthenticatedPrincipal] = Depends(get_optional_principal),
):
    """Patient grants or denies an ABDM consent request."""
    target_upid = upid or PatientPortalService.get_current_upid(principal)
    try:
        return PatientPortalService.decide_consent(target_upid, consent_id, payload, principal=principal)
    except KeyError as ke:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(ke))


@router.post("/consents/{consent_id}/revoke", response_model=ConsentRecord)
async def revoke_patient_consent(
    consent_id: str,
    payload: PatientConsentRevokeRequest,
    upid: Optional[str] = Query(None),
    principal: Optional[AuthenticatedPrincipal] = Depends(get_optional_principal),
):
    """Patient revokes an active consent."""
    target_upid = upid or PatientPortalService.get_current_upid(principal)
    try:
        return PatientPortalService.revoke_consent(target_upid, consent_id, payload, principal=principal)
    except KeyError as ke:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(ke))


@router.get("/hospitals", response_model=List[PatientHospitalAssociationView])
async def list_connected_hospitals(
    upid: Optional[str] = Query(None),
    principal: Optional[AuthenticatedPrincipal] = Depends(get_optional_principal),
):
    """List healthcare providers with verified identity mappings for this patient."""
    target_upid = upid or PatientPortalService.get_current_upid(principal)
    return PatientPortalService.list_connected_hospitals(target_upid)


@router.get("/records", response_model=List[PatientRecordSummary])
async def get_federated_records(
    upid: Optional[str] = Query(None),
    principal: Optional[AuthenticatedPrincipal] = Depends(get_optional_principal),
):
    """Retrieve clinical records on-demand from connected hospitals.
    
    Zero Central Storage Guarantee: records are gathered in-memory from
    source providers and never permanently retained in middleware.
    """
    target_upid = upid or PatientPortalService.get_current_upid(principal)
    return PatientPortalService.get_federated_records(target_upid)


@router.get("/sharing-history", response_model=List[PatientSharingEvent])
async def get_sharing_history(
    upid: Optional[str] = Query(None),
    principal: Optional[AuthenticatedPrincipal] = Depends(get_optional_principal),
):
    """Retrieve audit history of data exchanges conducted for this patient."""
    target_upid = upid or PatientPortalService.get_current_upid(principal)
    return PatientPortalService.get_sharing_history(target_upid)


@router.get("/all-patients")
async def list_all_portal_patients():
    """List registered patients with UPID, names, and mappings for portal switchers."""
    from app.services.patient_identity_service import PatientIdentityService
    patients = PatientIdentityService.list_patients()
    return [
        {
            "universal_patient_id": p.universal_patient_id,
            "full_name": p.full_name,
            "dob": p.dob,
            "gender": p.gender,
            "connected_hospitals_count": len(p.mappings),
            "mappings": [m.model_dump() if hasattr(m, "model_dump") else dict(m) for m in p.mappings],
        }
        for p in patients
    ]


@router.post("/consent-requests", response_model=ConsentRecord, status_code=status.HTTP_201_CREATED)
async def create_patient_consent_request(
    payload: Optional[CreateDynamicConsentRequest] = None,
    source_provider_id: Optional[str] = Query(None),
    recipient_provider_id: Optional[str] = Query(None),
    universal_patient_id: Optional[str] = Query(None),
    purpose: Optional[str] = Query(None),
    principal: Optional[AuthenticatedPrincipal] = Depends(get_optional_principal),
):
    """Dynamic creation of a pending consent request from an HIU to a patient."""
    src = (payload.source_provider_id if payload else None) or source_provider_id
    rec = (payload.recipient_provider_id if payload else None) or recipient_provider_id
    uid = (payload.universal_patient_id if payload else None) or universal_patient_id
    purp = (payload.purpose if payload else None) or purpose or "Care Management and Clinical Consultation"

    if not src or not rec or not uid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="source_provider_id, recipient_provider_id, and universal_patient_id are required.",
        )

    return PatientPortalService.create_dynamic_consent_request(
        source_provider_id=src,
        recipient_provider_id=rec,
        universal_patient_id=uid,
        purpose=purp,
        principal=principal,
    )
