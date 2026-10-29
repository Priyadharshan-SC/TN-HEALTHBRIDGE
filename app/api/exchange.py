"""API route handlers for M7 Reliable, Secure Healthcare Data Exchange."""
import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from app.core.security import AuthenticatedPrincipal, get_optional_principal
from app.schemas.exchange import (
    ExchangeJob,
    ExchangeSendRequest,
    ExchangeSendResponse,
    FederatedExchangeRequest,
    PaginatedExchangeJobsResponse,
    ReceiverReceipt,
    ReceiverSimulateRequest,
)
from app.services.exchange_service import ExchangeService
from app.services.receiver_simulator import ReceiverSimulatorService

logger = logging.getLogger("tn_healthbridge.api.exchange")

router = APIRouter(prefix="/exchange", tags=["Healthcare Data Exchange"])


class CancelRequest(BaseModel):
    reason: str = "Cancelled by authorized operator"


@router.get(
    "/transfers",
    response_model=PaginatedExchangeJobsResponse,
    summary="List Exchange Transfer Jobs with Date & Status Filtering",
    description="Query exchange transfer jobs with server-side date range, status, and organization filters.",
)
async def list_transfers(
    start_date: Optional[str] = Query(None, description="ISO start date filter"),
    end_date: Optional[str] = Query(None, description="ISO end date filter"),
    source_org: Optional[str] = Query(None, description="Source hospital filter"),
    dest_org: Optional[str] = Query(None, description="Destination hospital filter"),
    status: Optional[str] = Query(None, description="Transfer status filter"),
    search: Optional[str] = Query(None, description="Search by ID, hospital, patient, or consent"),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    principal: Optional[AuthenticatedPrincipal] = Depends(get_optional_principal),
) -> PaginatedExchangeJobsResponse:
    """List and filter transfer history."""
    result = ExchangeService.list_transfers(
        start_date=start_date,
        end_date=end_date,
        source_org=source_org,
        dest_org=dest_org,
        status=status,
        search=search,
        page=page,
        page_size=page_size,
    )
    return PaginatedExchangeJobsResponse(**result)


@router.post(
    "/send",
    response_model=ExchangeSendResponse,
    status_code=status.HTTP_200_OK,
    summary="Execute Reliable Healthcare Data Exchange",
    description=(
        "Executes end-to-end reliable healthcare data exchange. "
        "Enforces idempotency keys, request fingerprinting, M5 FHIR assembly, M6 consent authorization, "
        "immediate pre-dispatch revocation checking, bounded retries on transient errors, and "
        "returns an authenticated receiver delivery receipt."
    ),
)
async def send_healthcare_exchange(
    request: ExchangeSendRequest,
    principal: Optional[AuthenticatedPrincipal] = Depends(get_optional_principal),
) -> ExchangeSendResponse:
    """Execute reliable healthcare data exchange."""
    return ExchangeService.send_exchange(request, principal=principal)


@router.post(
    "/federated-exchange",
    response_model=ExchangeSendResponse,
    status_code=status.HTTP_200_OK,
    summary="Execute Complete Federated Cross-Hospital Exchange",
    description=(
        "Orchestrates a complete federated data exchange: resolves universal identity, verifies "
        "consent, fetches records from source provider adapter, cleanses, standardizes to FHIR R4, "
        "evaluates release gates, and delivers to destination hospital with strict non-persistence."
    ),
)
async def execute_federated_exchange(
    request: FederatedExchangeRequest,
    principal: Optional[AuthenticatedPrincipal] = Depends(get_optional_principal),
) -> ExchangeSendResponse:
    """Execute full federated cross-hospital exchange workflow."""
    try:
        return ExchangeService.execute_federated_exchange(request, principal=principal)
    except PermissionError as pe:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(pe))


@router.get(
    "/jobs/{job_id}",
    response_model=ExchangeJob,
    status_code=status.HTTP_200_OK,
    summary="Get Exchange Job Status",
    description="Retrieve full tracking state and audit transition history for an exchange job.",
)
async def get_exchange_job(job_id: str) -> ExchangeJob:
    """Retrieve exchange job by ID."""
    return ExchangeService.get_job(job_id)


@router.get(
    "/transfers/{job_id}/download-receipt",
    summary="Download Verifiable Exchange Receipt",
    description="Download a verifiable delivery receipt for an authorized exchange. Non-persistence disclosure included.",
)
async def download_transfer_receipt(job_id: str):
    """Download verifiable receipt for a completed transfer."""
    job = ExchangeService.get_job(job_id)
    receipt_data = {
        "job_id": job.job_id,
        "delivery_id": job.delivery_id,
        "source_provider": job.source_provider_id,
        "recipient_hiu": job.recipient_hiu_id,
        "patient_reference": job.patient_reference,
        "status": job.status,
        "created_at": job.created_at,
        "completed_at": job.completed_at,
        "receipt": job.receipt.model_dump() if job.receipt else None,
        "clinical_data_non_persistence_policy": (
            "TN HealthBridge does not persist raw clinical records centrally. "
            "The source provider remains the authoritative custodian of complete health records."
        ),
    }
    return JSONResponse(
        content=receipt_data,
        headers={
            "Content-Disposition": f"attachment; filename=receipt-{job_id}.json",
            "Content-Type": "application/json",
        },
    )


@router.post(
    "/jobs/{job_id}/cancel",
    response_model=ExchangeJob,
    status_code=status.HTTP_200_OK,
    summary="Cancel Exchange Job",
    description="Cancel an active exchange job in compliance with state machine rules.",
)
async def cancel_exchange_job(
    job_id: str,
    payload: CancelRequest,
) -> ExchangeJob:
    """Cancel exchange job."""
    return ExchangeService.cancel_job(job_id, reason=payload.reason)


@router.post(
    "/receiver/simulate",
    response_model=ReceiverReceipt,
    status_code=status.HTTP_200_OK,
    summary="Direct Receiver Simulation Endpoint",
    description="Direct testing endpoint representing a registered remote hospital receiver.",
)
async def simulate_receiver_delivery(
    payload: ReceiverSimulateRequest,
) -> ReceiverReceipt:
    """Simulate receiving a delivered clinical envelope."""
    return ReceiverSimulatorService.receive_envelope(
        payload.envelope,
        simulation_mode=payload.simulation_mode or "normal",
    )
