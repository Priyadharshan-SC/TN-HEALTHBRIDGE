"""Structured, privacy-conscious audit logging for security and compliance events."""
import json
import logging
import os
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field

from app.core.config import get_settings

logger = logging.getLogger("tn_healthbridge.audit")


class AuditEvent(BaseModel):
    """Structured, immutable audit record."""
    model_config = ConfigDict(extra="ignore")

    event_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    actor_id: str = Field(..., description="User ID, client ID, or 'anonymous'.")
    organization_id: str = Field(..., description="Organization scope of the actor.")
    action: str = Field(..., description="Security event action classification.")
    resource_type: str = Field(..., description="Type of affected resource (e.g., 'CONSENT', 'BUNDLE', 'EXCHANGE').")
    resource_id: Optional[str] = Field(default=None, description="Identifier of the targeted resource.")
    outcome: str = Field(..., description="'SUCCESS', 'DENIED', or 'FAILURE'.")
    reason_code: Optional[str] = Field(default=None, description="Machine-readable outcome code.")
    details: Dict[str, Any] = Field(default_factory=dict, description="Sanitized, non-PHI metadata.")
    correlation_id: Optional[str] = Field(default=None, description="Request correlation identifier.")


class AuditService:
    """Service for recording and querying structured security audit events."""

    _in_memory_events: List[AuditEvent] = []
    _MAX_IN_MEMORY: int = 10_000

    @classmethod
    def record_event(
        cls,
        action: str,
        resource_type: str,
        outcome: str,
        actor_id: str = "system",
        organization_id: str = "system",
        resource_id: Optional[str] = None,
        reason_code: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        correlation_id: Optional[str] = None,
    ) -> AuditEvent:
        """Create and persist a structured, sanitized audit event."""
        settings = get_settings()
        sanitized_details = cls._sanitize_details(details or {})

        event = AuditEvent(
            event_id=str(uuid.uuid4()),
            timestamp=datetime.now(timezone.utc).isoformat(),
            actor_id=actor_id,
            organization_id=organization_id,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            outcome=outcome,
            reason_code=reason_code,
            details=sanitized_details,
            correlation_id=correlation_id,
        )

        # 1. Append to bounded in-memory buffer
        cls._in_memory_events.append(event)
        if len(cls._in_memory_events) > cls._MAX_IN_MEMORY:
            cls._in_memory_events.pop(0)

        # 2. Append to disk log file if configured
        try:
            log_path = settings.AUDIT_LOG_PATH
            os.makedirs(os.path.dirname(log_path), exist_ok=True)
            with open(log_path, "a", encoding="utf-8") as f:
                f.write(event.model_dump_json() + "\n")
        except Exception as ex:
            logger.warning("Failed to append audit event to disk: %s", ex)

        logger.info(
            "AUDIT [%s] %s %s:%s outcome=%s actor=%s org=%s",
            event.action,
            event.resource_type,
            event.resource_id or "-",
            event.reason_code or "-",
            event.outcome,
            event.actor_id,
            event.organization_id,
        )

        return event

    @classmethod
    def get_events(
        cls,
        action: Optional[str] = None,
        resource_id: Optional[str] = None,
        actor_id: Optional[str] = None,
        limit: int = 100,
    ) -> List[AuditEvent]:
        """Query recent in-memory audit events with optional filtering."""
        matches = cls._in_memory_events[:]
        if action:
            matches = [e for e in matches if e.action == action]
        if resource_id:
            matches = [e for e in matches if e.resource_id == resource_id]
        if actor_id:
            matches = [e for e in matches if e.actor_id == actor_id]
        return matches[-limit:]

    @classmethod
    def clear_in_memory_events(cls) -> None:
        """Clear memory buffer for test isolation."""
        cls._in_memory_events.clear()

    @staticmethod
    def _sanitize_details(raw: Dict[str, Any]) -> Dict[str, Any]:
        """Strip sensitive credentials, tokens, and PHI from audit details."""
        forbidden_keys = {
            "password", "token", "secret", "access_token", "jwt",
            "clinical_records", "bundle", "records", "result_value",
            "patient_name", "phone", "email", "address",
        }
        sanitized = {}
        for k, v in raw.items():
            if k.lower() in forbidden_keys:
                sanitized[k] = "[REDACTED]"
            elif isinstance(v, dict):
                sanitized[k] = AuditService._sanitize_details(v)
            else:
                sanitized[k] = v
        return sanitized
