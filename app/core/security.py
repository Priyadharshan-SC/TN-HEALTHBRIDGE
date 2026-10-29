"""Authentication, authorization (RBAC), and cryptographic utility routines."""
import base64
import hashlib
import hmac
import json
import logging
import secrets
import time
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Set

from fastapi import Depends, Header, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, Field

from app.core.config import get_settings
from app.core.errors import AuthenticationException, AuthorizationException

logger = logging.getLogger("tn_healthbridge.security")

security_scheme = HTTPBearer(auto_error=False)


# ==============================================================================
# Domain Models for Principals and Roles
# ==============================================================================

class AppRole:
    """Canonical application role definitions."""
    SYSTEM_ADMIN = "SYSTEM_ADMIN"
    HOSPITAL_OPERATOR = "HOSPITAL_OPERATOR"
    DATA_PROVIDER = "DATA_PROVIDER"
    DATA_REQUESTER = "DATA_REQUESTER"
    AUDITOR = "AUDITOR"
    PATIENT = "PATIENT"


class AuthenticatedPrincipal(BaseModel):
    """Authenticated caller identity representation."""
    user_id: str
    organization_id: str
    roles: List[str] = Field(default_factory=list)
    scopes: List[str] = Field(default_factory=list)
    universal_patient_id: Optional[str] = None
    issued_at: Optional[int] = None
    expires_at: Optional[int] = None

    def has_role(self, *required_roles: str) -> bool:
        """Check if caller possesses any of the required roles."""
        if AppRole.SYSTEM_ADMIN in self.roles:
            return True
        return any(r in self.roles for r in required_roles)

    def can_access_provider(self, provider_id: str) -> bool:
        """Enforce tenant isolation: caller org must match provider or be admin."""
        if AppRole.SYSTEM_ADMIN in self.roles:
            return True
        return self.organization_id.strip().upper() == provider_id.strip().upper()


# ==============================================================================
# Standard PBKDF2 Password Hashing
# ==============================================================================

def hash_password(password: str, salt: Optional[str] = None) -> str:
    """Hash password using PBKDF2-HMAC-SHA256 with 100,000 iterations."""
    if not salt:
        salt = secrets.token_hex(16)
    hashed = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        100_000,
    ).hex()
    return f"{salt}${hashed}"


def verify_password(plain_password: str, hashed_value: str) -> bool:
    """Verify password against salt$hash string using constant-time comparison."""
    try:
        parts = hashed_value.split("$")
        if len(parts) != 2:
            return False
        salt, expected_hash = parts
        computed = hashlib.pbkdf2_hmac(
            "sha256",
            plain_password.encode("utf-8"),
            salt.encode("utf-8"),
            100_000,
        ).hex()
        return hmac.compare_digest(computed, expected_hash)
    except Exception:
        return False


# ==============================================================================
# Simulated Client Credentials & User Accounts
# ==============================================================================

# Pre-registered synthetic service credentials for simulated hospital participants
# Format: username: {password_hash, organization_id, roles}
REGISTERED_ACCOUNTS: Dict[str, Dict[str, Any]] = {
    "admin": {
        "password_hash": hash_password("AdminPass@2026", salt="salt_admin_001"),
        "organization_id": "TN_HEALTH_DEPT",
        "roles": [AppRole.SYSTEM_ADMIN],
    },
    "hospital_a_operator": {
        "password_hash": hash_password("HospitalA@2026", salt="salt_hosp_a_001"),
        "organization_id": "HOSPITAL_A",
        "roles": [AppRole.HOSPITAL_OPERATOR, AppRole.DATA_PROVIDER],
    },
    "hospital_b_requester": {
        "password_hash": hash_password("HospitalB@2026", salt="salt_hosp_b_001"),
        "organization_id": "HOSPITAL_B",
        "roles": [AppRole.DATA_REQUESTER, AppRole.HOSPITAL_OPERATOR],
    },
    "lab_c_provider": {
        "password_hash": hash_password("LabC@2026", salt="salt_lab_c_001"),
        "organization_id": "LAB_C",
        "roles": [AppRole.DATA_PROVIDER],
    },
    "auditor_user": {
        "password_hash": hash_password("AuditorPass@2026", salt="salt_audit_001"),
        "organization_id": "TN_AUDIT_COMMISSION",
        "roles": [AppRole.AUDITOR],
    },
    "hiu_tn_client": {
        "password_hash": hash_password("HiuClient@2026", salt="salt_hiu_001"),
        "organization_id": "HIU_TN_001",
        "roles": [AppRole.DATA_REQUESTER],
    },
    "hospital_d_operator": {
        "password_hash": hash_password("HospitalD@2026", salt="salt_hosp_d_001"),
        "organization_id": "HOSPITAL_D",
        "roles": [AppRole.HOSPITAL_OPERATOR, AppRole.DATA_PROVIDER, AppRole.DATA_REQUESTER],
    },
    "lab_e_operator": {
        "password_hash": hash_password("LabE@2026", salt="salt_lab_e_001"),
        "organization_id": "LAB_E",
        "roles": [AppRole.HOSPITAL_OPERATOR, AppRole.DATA_PROVIDER],
    },
    "clinic_f_operator": {
        "password_hash": hash_password("ClinicF@2026", salt="salt_clinic_f_001"),
        "organization_id": "CLINIC_F",
        "roles": [AppRole.HOSPITAL_OPERATOR, AppRole.DATA_PROVIDER, AppRole.DATA_REQUESTER],
    },
    "arun_patient": {
        "password_hash": hash_password("PatientPass@2026", salt="salt_patient_001"),
        "organization_id": "TN_PATIENT_PORTAL",
        "roles": [AppRole.PATIENT],
        "universal_patient_id": "UPID-ARUN-001",
    },
}


# ==============================================================================
# Standard RFC 7519 HS256 JWT Implementation (Zero Extra Dependencies)
# ==============================================================================

def _b64url_encode(data: bytes) -> str:
    """Base64url encode without padding."""
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def _b64url_decode(encoded: str) -> bytes:
    """Base64url decode with restored padding."""
    rem = len(encoded) % 4
    if rem > 0:
        encoded += "=" * (4 - rem)
    return base64.urlsafe_b64decode(encoded.encode("ascii"))


def create_access_token(
    subject: str,
    organization_id: str,
    roles: List[str],
    expires_delta_seconds: Optional[int] = None,
    scopes: Optional[List[str]] = None,
    universal_patient_id: Optional[str] = None,
) -> str:
    """Generate a signed HS256 JWT access token."""
    settings = get_settings()
    now = int(time.time())
    ttl = expires_delta_seconds or (settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60)
    exp = now + ttl

    header = {"alg": "HS256", "typ": "JWT"}
    payload = {
        "sub": subject,
        "iss": "tn-healthbridge",
        "aud": "tn-healthbridge-api",
        "org": organization_id,
        "roles": roles,
        "scopes": scopes or ["healthbridge:exchange"],
        "iat": now,
        "nbf": now - 5,  # 5-second leeway
        "exp": exp,
    }
    if universal_patient_id:
        payload["upid"] = universal_patient_id

    header_b64 = _b64url_encode(json.dumps(header, separators=(",", ":")).encode("utf-8"))
    payload_b64 = _b64url_encode(json.dumps(payload, separators=(",", ":")).encode("utf-8"))
    signing_input = f"{header_b64}.{payload_b64}".encode("ascii")

    secret = settings.JWT_SECRET_KEY.encode("utf-8")
    sig = hmac.new(secret, signing_input, hashlib.sha256).digest()
    sig_b64 = _b64url_encode(sig)

    return f"{header_b64}.{payload_b64}.{sig_b64}"


def decode_access_token(token: str) -> Dict[str, Any]:
    """Validate and decode a signed HS256 JWT access token.
    
    Validates:
    - Token structure (3 dot-separated segments)
    - Algorithm (strictly HS256)
    - Cryptographic HMAC-SHA256 signature
    - Expiration (exp) with small leeway
    - Not Before (nbf)
    - Issuer (iss) and Audience (aud)
    """
    settings = get_settings()
    parts = token.split(".")
    if len(parts) != 3:
        raise AuthenticationException("Malformed JWT: token must contain 3 segments.")

    header_b64, payload_b64, sig_b64 = parts

    # 1. Verify Signature
    signing_input = f"{header_b64}.{payload_b64}".encode("ascii")
    secret = settings.JWT_SECRET_KEY.encode("utf-8")
    expected_sig = hmac.new(secret, signing_input, hashlib.sha256).digest()
    actual_sig = _b64url_decode(sig_b64)

    if not hmac.compare_digest(expected_sig, actual_sig):
        raise AuthenticationException("Invalid JWT signature.")

    # 2. Parse Header
    try:
        header = json.loads(_b64url_decode(header_b64).decode("utf-8"))
    except Exception:
        raise AuthenticationException("Malformed JWT header.")

    if header.get("alg") != "HS256":
        raise AuthenticationException(f"Unsupported JWT algorithm: {header.get('alg')}. Only HS256 is permitted.")

    # 3. Parse Payload
    try:
        payload = json.loads(_b64url_decode(payload_b64).decode("utf-8"))
    except Exception:
        raise AuthenticationException("Malformed JWT payload.")

    # 4. Temporal Validations
    now = int(time.time())
    if "exp" in payload and now > payload["exp"]:
        raise AuthenticationException("Access token has expired.")
    if "nbf" in payload and now < payload["nbf"]:
        raise AuthenticationException("Access token is not yet active.")

    # 5. Claims Validation
    if payload.get("iss") != "tn-healthbridge":
        raise AuthenticationException(f"Invalid token issuer: {payload.get('iss')}.")
    if payload.get("aud") != "tn-healthbridge-api":
        raise AuthenticationException(f"Invalid token audience: {payload.get('aud')}.")

    return payload


# ==============================================================================
# FastAPI Security Dependencies
# ==============================================================================

async def get_current_principal(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme),
    x_api_key: Optional[str] = Header(None, alias="X-API-Key"),
) -> AuthenticatedPrincipal:
    """Extract and validate caller identity from Authorization Bearer token or API key.
    
    Fails closed if credentials are missing, invalid, or expired.
    """
    token: Optional[str] = None

    if credentials and credentials.scheme.lower() == "bearer" and credentials.credentials:
        token = credentials.credentials
    elif x_api_key and x_api_key.startswith("Bearer "):
        token = x_api_key.replace("Bearer ", "").strip()

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Provide a valid Bearer token in Authorization header.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        claims = decode_access_token(token)
    except AuthenticationException as ae:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=ae.message,
            headers={"WWW-Authenticate": "Bearer"},
        )

    return AuthenticatedPrincipal(
        user_id=claims.get("sub", "unknown"),
        organization_id=claims.get("org", "unknown"),
        roles=claims.get("roles", []),
        scopes=claims.get("scopes", []),
        universal_patient_id=claims.get("upid"),
        issued_at=claims.get("iat"),
        expires_at=claims.get("exp"),
    )


def require_role(*allowed_roles: str):
    """Enforce that caller has at least one of the specified roles."""
    async def _role_checker(principal: AuthenticatedPrincipal = Depends(get_current_principal)) -> AuthenticatedPrincipal:
        if not principal.has_role(*allowed_roles):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission denied: operation requires one of {allowed_roles}.",
            )
        return principal
    return _role_checker


async def get_optional_principal(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme),
    x_api_key: Optional[str] = Header(None, alias="X-API-Key"),
) -> Optional[AuthenticatedPrincipal]:
    """Extract and validate caller identity if Authorization Bearer token or key is provided."""
    token: Optional[str] = None
    if credentials and credentials.scheme.lower() == "bearer" and credentials.credentials:
        token = credentials.credentials
    elif x_api_key and x_api_key.startswith("Bearer "):
        token = x_api_key.replace("Bearer ", "").strip()

    if not token:
        return None

    try:
        claims = decode_access_token(token)
    except AuthenticationException as ae:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=ae.message,
            headers={"WWW-Authenticate": "Bearer"},
        )

    return AuthenticatedPrincipal(
        user_id=claims.get("sub", "unknown"),
        organization_id=claims.get("org", "unknown"),
        roles=claims.get("roles", []),
        scopes=claims.get("scopes", []),
        universal_patient_id=claims.get("upid"),
        issued_at=claims.get("iat"),
        expires_at=claims.get("exp"),
    )
