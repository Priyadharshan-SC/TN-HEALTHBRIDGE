from app.api.ingestion import router as ingestion_router
from app.api.normalization import router as normalization_router
from app.api.terminology import router as terminology_router
from app.api.identity import router as identity_router
from app.api.fhir import router as fhir_router
from app.api.gateway import router as gateway_router
from app.api.auth import router as auth_router
from app.api.exchange import router as exchange_router
from app.api.organization import router as organization_router
from app.api.provider import router as provider_router
from app.api.patient_portal import router as patient_portal_router
from app.api.audit import router as audit_router

__all__ = [
    "ingestion_router",
    "normalization_router",
    "terminology_router",
    "identity_router",
    "fhir_router",
    "gateway_router",
    "auth_router",
    "exchange_router",
    "organization_router",
    "provider_router",
    "patient_portal_router",
    "audit_router",
]
