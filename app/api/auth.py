"""Authentication API endpoints for TN HealthBridge."""
import logging
from typing import List, Optional
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from app.core.config import get_settings
from app.core.security import (
    REGISTERED_ACCOUNTS,
    create_access_token,
    verify_password,
)
from app.services.audit_service import AuditService

logger = logging.getLogger("tn_healthbridge.api.auth")

router = APIRouter(prefix="/auth", tags=["Authentication"])


class TokenRequest(BaseModel):
    """Credentials payload for JWT token issuance."""
    username: str = Field(..., description="Service client ID or user account identifier.")
    password: str = Field(..., description="Plain-text password or service secret.")


class TokenResponse(BaseModel):
    """Access token response."""
    access_token: str = Field(..., description="Signed HS256 JWT access token.")
    token_type: str = "Bearer"
    expires_in: int = Field(..., description="Token validity duration in seconds.")
    roles: List[str] = Field(default_factory=list)
    organization_id: str = Field(...)
    universal_patient_id: Optional[str] = None


@router.post(
    "/token",
    response_model=TokenResponse,
    status_code=status.HTTP_200_OK,
    summary="Issue JWT Access Token",
    description="Authenticate organization or service client credentials and issue a signed HS256 access token.",
)
async def login_for_access_token(payload: TokenRequest) -> TokenResponse:
    """Validate credentials and return signed access token."""
    account = REGISTERED_ACCOUNTS.get(payload.username)
    if not account or not verify_password(payload.password, account["password_hash"]):
        AuditService.record_event(
            action="AUTHENTICATION",
            resource_type="USER",
            resource_id=payload.username,
            outcome="FAILURE",
            actor_id=payload.username,
            organization_id="UNKNOWN",
            reason_code="INVALID_CREDENTIALS",
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    settings = get_settings()
    ttl = settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60
    token = create_access_token(
        subject=payload.username,
        organization_id=account["organization_id"],
        roles=account["roles"],
        expires_delta_seconds=ttl,
        universal_patient_id=account.get("universal_patient_id"),
    )

    AuditService.record_event(
        action="AUTHENTICATION",
        resource_type="USER",
        resource_id=payload.username,
        outcome="SUCCESS",
        actor_id=payload.username,
        organization_id=account["organization_id"],
        details={"roles": account["roles"]},
    )

    return TokenResponse(
        access_token=token,
        token_type="Bearer",
        expires_in=ttl,
        roles=account["roles"],
        organization_id=account["organization_id"],
        universal_patient_id=account.get("universal_patient_id"),
    )
