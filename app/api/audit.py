"""API route handlers for Immutable Audit Logs."""
import json
import logging
import os
from pathlib import Path
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, Query, status
from pydantic import BaseModel, ConfigDict, Field

from app.core.config import get_settings
from app.core.security import AuthenticatedPrincipal, get_optional_principal

logger = logging.getLogger("tn_healthbridge.api.audit")

router = APIRouter(prefix="/audit", tags=["Audit Trail & Governance"])


class AuditEventResponse(BaseModel):
    """Structured audit log event model."""
    model_config = ConfigDict(extra="ignore")

    event_id: str
    timestamp: str
    actor_id: str
    organization_id: str
    action: str
    resource_type: str
    resource_id: str
    outcome: str
    reason_code: Optional[str] = None
    correlation_id: Optional[str] = None
    ip_address: Optional[str] = None
    integrity_checksum: Optional[str] = None


class PaginatedAuditLogsResponse(BaseModel):
    """Paginated list of audit events."""
    model_config = ConfigDict(extra="ignore")

    logs: List[AuditEventResponse]
    total_count: int
    page: int
    page_size: int
    total_pages: int


class AuditStatsResponse(BaseModel):
    """Aggregated audit statistics."""
    total_events: int
    successful_events: int
    failed_events: int
    security_denials: int
    unique_actors: int


@router.get("/logs", response_model=PaginatedAuditLogsResponse)
async def list_audit_logs(
    start_date: Optional[str] = Query(None, description="Filter from timestamp"),
    end_date: Optional[str] = Query(None, description="Filter to timestamp"),
    actor: Optional[str] = Query(None, description="Filter by actor ID"),
    organization: Optional[str] = Query(None, description="Filter by organization ID"),
    action: Optional[str] = Query(None, description="Filter by action name"),
    outcome: Optional[str] = Query(None, description="Filter by outcome (SUCCESS, FAILURE)"),
    search: Optional[str] = Query(None, description="Free text search"),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    principal: Optional[AuthenticatedPrincipal] = Depends(get_optional_principal),
) -> PaginatedAuditLogsResponse:
    """Retrieve filtered and paginated audit events."""
    settings = get_settings()
    path = Path(settings.AUDIT_LOG_PATH)
    events: List[Dict[str, Any]] = []

    if path.exists():
        try:
            with open(path, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line:
                        try:
                            events.append(json.loads(line))
                        except Exception:
                            continue
        except Exception as e:
            logger.warning("Error reading audit logs: %s", e)

    # Sort reverse chronologically
    events.sort(key=lambda ev: ev.get("timestamp", ""), reverse=True)

    filtered = []
    for ev in events:
        ts = ev.get("timestamp", "")
        if start_date and ts < start_date:
            continue
        if end_date and ts > end_date:
            continue
        if actor and ev.get("actor_id", "").lower() != actor.lower():
            continue
        if organization and organization.lower() != "all organizations" and ev.get("organization_id", "").lower() != organization.lower():
            continue
        if action and action.lower() != "all actions" and ev.get("action", "").lower() != action.lower():
            continue
        if outcome and outcome.lower() != "all outcomes" and ev.get("outcome", "").lower() != outcome.lower():
            continue
        if search:
            s = search.lower()
            matches = (
                s in ev.get("event_id", "").lower()
                or s in ev.get("actor_id", "").lower()
                or s in ev.get("organization_id", "").lower()
                or s in ev.get("action", "").lower()
                or s in ev.get("resource_id", "").lower()
                or s in (ev.get("reason_code") or "").lower()
            )
            if not matches:
                continue
        filtered.append(ev)

    total_count = len(filtered)
    total_pages = max(1, (total_count + page_size - 1) // page_size)
    start_idx = (page - 1) * page_size
    end_idx = start_idx + page_size
    paged = filtered[start_idx:end_idx]

    typed_logs = [AuditEventResponse(**item) for item in paged]
    return PaginatedAuditLogsResponse(
        logs=typed_logs,
        total_count=total_count,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get("/stats", response_model=AuditStatsResponse)
async def get_audit_stats(
    principal: Optional[AuthenticatedPrincipal] = Depends(get_optional_principal),
) -> AuditStatsResponse:
    """Retrieve summary metrics across all audit logs."""
    settings = get_settings()
    path = Path(settings.AUDIT_LOG_PATH)
    events: List[Dict[str, Any]] = []

    if path.exists():
        try:
            with open(path, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line:
                        try:
                            events.append(json.loads(line))
                        except Exception:
                            continue
        except Exception:
            pass

    success = sum(1 for ev in events if ev.get("outcome") == "SUCCESS")
    failed = sum(1 for ev in events if ev.get("outcome") == "FAILURE")
    denials = sum(1 for ev in events if "DENIED" in (ev.get("reason_code") or "") or "UNAUTHORIZED" in (ev.get("reason_code") or ""))
    actors = len({ev.get("actor_id") for ev in events if ev.get("actor_id")})

    return AuditStatsResponse(
        total_events=len(events),
        successful_events=success,
        failed_events=failed,
        security_denials=denials,
        unique_actors=actors,
    )
