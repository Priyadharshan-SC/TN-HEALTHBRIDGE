"""API router for Organization and Authorized-User Management."""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status

from app.core.security import AuthenticatedPrincipal, get_current_principal, get_optional_principal
from app.schemas.organization import (
    OrganizationCreate,
    OrganizationResponse,
    OrganizationUpdate,
    OrgUserCreate,
    OrgUserResponse,
    OrgUserUpdate,
)
from app.services.organization_service import OrganizationService

router = APIRouter(prefix="/organizations", tags=["Organization Management"])


@router.get("", response_model=List[OrganizationResponse])
async def list_organizations(
    principal: Optional[AuthenticatedPrincipal] = Depends(get_optional_principal)
):
    """List all registered healthcare organizations."""
    return OrganizationService.list_organizations()


@router.get("/{org_id}", response_model=OrganizationResponse)
async def get_organization(
    org_id: str,
    principal: Optional[AuthenticatedPrincipal] = Depends(get_optional_principal)
):
    """Get details for a specific organization."""
    org = OrganizationService.get_organization(org_id)
    if not org:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Organization '{org_id}' not found.")
    return org


@router.post("", response_model=OrganizationResponse, status_code=status.HTTP_201_CREATED)
async def create_organization(
    payload: OrganizationCreate,
    principal: Optional[AuthenticatedPrincipal] = Depends(get_optional_principal)
):
    """Register a new organization."""
    try:
        return OrganizationService.create_organization(payload, principal=principal)
    except PermissionError as pe:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(pe))
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(ve))


@router.put("/{org_id}", response_model=OrganizationResponse)
async def update_organization(
    org_id: str,
    payload: OrganizationUpdate,
    principal: Optional[AuthenticatedPrincipal] = Depends(get_optional_principal)
):
    """Update details for an organization."""
    try:
        return OrganizationService.update_organization(org_id, payload, principal=principal)
    except PermissionError as pe:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(pe))
    except KeyError as ke:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(ke))


@router.post("/{org_id}/toggle-status", response_model=OrganizationResponse)
async def toggle_organization_status(
    org_id: str,
    principal: Optional[AuthenticatedPrincipal] = Depends(get_optional_principal)
):
    """Toggle organization active/inactive status."""
    try:
        return OrganizationService.toggle_organization_status(org_id, principal=principal)
    except KeyError as ke:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(ke))


# -----------------------------------------------------------------------------
# Organization Users
# -----------------------------------------------------------------------------

@router.get("/{org_id}/users", response_model=List[OrgUserResponse])
async def list_organization_users(
    org_id: str,
    principal: Optional[AuthenticatedPrincipal] = Depends(get_optional_principal)
):
    """List users for an organization."""
    try:
        return OrganizationService.list_organization_users(org_id, principal=principal)
    except PermissionError as pe:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(pe))


@router.post("/{org_id}/users", response_model=OrgUserResponse, status_code=status.HTTP_201_CREATED)
async def create_organization_user(
    org_id: str,
    payload: OrgUserCreate,
    principal: Optional[AuthenticatedPrincipal] = Depends(get_optional_principal)
):
    """Add a new user to an organization."""
    try:
        return OrganizationService.create_organization_user(org_id, payload, principal=principal)
    except PermissionError as pe:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(pe))
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(ve))


@router.put("/{org_id}/users/{user_id}", response_model=OrgUserResponse)
async def update_organization_user(
    org_id: str,
    user_id: str,
    payload: OrgUserUpdate,
    principal: Optional[AuthenticatedPrincipal] = Depends(get_optional_principal)
):
    """Update a user within an organization."""
    try:
        return OrganizationService.update_organization_user(org_id, user_id, payload, principal=principal)
    except PermissionError as pe:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(pe))
    except KeyError as ke:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(ke))
