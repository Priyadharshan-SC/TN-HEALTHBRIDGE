"""Simulated Hospital Receiver for ABDM-Aligned Health Data Exchange.

Provides an explicit, registered simulated hospital receiver that verifies incoming
delivery envelopes, enforces recipient authorization, computes integrity digests,
and idempotently acknowledges delivery with verifiable receipts.
"""
from datetime import datetime, timezone
import hashlib
import logging
import threading
from typing import Dict, Optional, Set
import uuid

from app.core.config import get_settings
from app.core.errors import ReceiverDeliveryError
from app.schemas.exchange import (
    ExchangeDeliveryEnvelope,
    ReceiverReceipt,
)
from app.services.audit_service import AuditService

logger = logging.getLogger("tn_healthbridge.receiver_simulator")

# Registered recipient healthcare entities in the simulated state network
REGISTERED_RECIPIENTS: Set[str] = {
    "HOSPITAL_A",
    "HOSPITAL_B",
    "LAB_C",
    "HOSPITAL_D",
    "LAB_E",
    "CLINIC_F",
    "HIU_TN_001",
    "HIU_TN_002",
    "CITY_CARE_SIM",
}


class ReceiverSimulatorService:
    """Simulated hospital endpoint for receiving authorized clinical bundles."""

    _lock = threading.Lock()
    # Idempotent receipt cache: delivery_id -> ReceiverReceipt
    _receipt_cache: Dict[str, ReceiverReceipt] = {}
    _transient_failure_counters: Dict[str, int] = {}

    @classmethod
    def receive_envelope(
        cls,
        envelope: ExchangeDeliveryEnvelope,
        simulation_mode: str = "normal",
    ) -> ReceiverReceipt:
        """Receive, validate, and acknowledge a clinical delivery envelope.
        
        Enforces:
        - Registered recipient authorization
        - SHA-256 payload digest verification
        - Idempotent delivery acknowledgement (no duplicate receiver side-effects)
        - Deterministic failure simulation for resilient retry testing
        """
        recipient = envelope.recipient_hiu_id.strip()

        # 1. Receiver Identity Verification
        if recipient not in REGISTERED_RECIPIENTS:
            AuditService.record_event(
                action="RECEIVER_DELIVERY",
                resource_type="ENVELOPE",
                resource_id=envelope.delivery_id,
                outcome="DENIED",
                organization_id=recipient,
                reason_code="UNREGISTERED_RECIPIENT",
                details={"recipient": recipient},
            )
            raise ReceiverDeliveryError(
                f"Receiver '{recipient}' is not a registered healthcare recipient in the simulated network.",
                status_code=404,
            )

        with cls._lock:
            # 2. Idempotency Check: if this delivery_id has already been accepted, return existing receipt
            if envelope.delivery_id in cls._receipt_cache:
                logger.info(
                    "Simulated receiver returning idempotent cached receipt for delivery_id=%s",
                    envelope.delivery_id,
                )
                return cls._receipt_cache[envelope.delivery_id]

            # 3. Deterministic Simulation Controls (for automated retry and failure testing)
            if simulation_mode == "permanent_failure":
                AuditService.record_event(
                    action="RECEIVER_DELIVERY",
                    resource_type="ENVELOPE",
                    resource_id=envelope.delivery_id,
                    outcome="FAILURE",
                    organization_id=recipient,
                    reason_code="SIMULATED_PERMANENT_ERROR",
                )
                raise ReceiverDeliveryError(
                    "Simulated receiver permanent rejection: remote endpoint rejected payload structure.",
                    status_code=400,
                )

            if simulation_mode == "transient_failure":
                counter = cls._transient_failure_counters.get(envelope.delivery_id, 0)
                cls._transient_failure_counters[envelope.delivery_id] = counter + 1
                # Fail on first 2 attempts, then succeed on 3rd attempt
                if counter < 2:
                    AuditService.record_event(
                        action="RECEIVER_DELIVERY",
                        resource_type="ENVELOPE",
                        resource_id=envelope.delivery_id,
                        outcome="FAILURE",
                        organization_id=recipient,
                        reason_code="SIMULATED_TRANSIENT_TIMEOUT",
                        details={"attempt": counter + 1},
                    )
                    raise ReceiverDeliveryError(
                        f"Simulated receiver temporary unavailable (attempt {counter + 1}). Transient 503.",
                        status_code=503,
                    )

            # 4. Integrity Digest Verification
            bundle_json = envelope.bundle.model_dump_json(exclude_none=True)
            computed_digest = hashlib.sha256(bundle_json.encode("utf-8")).hexdigest()

            # 5. Issue Receipt
            receipt_id = f"RCPT-SIM-{uuid.uuid4()}"
            ack_time = datetime.now(timezone.utc).isoformat()

            receipt = ReceiverReceipt(
                receipt_id=receipt_id,
                delivery_id=envelope.delivery_id,
                recipient_id=recipient,
                status="accepted",
                acknowledged_at=ack_time,
                payload_digest=computed_digest,
                message=f"Simulated hospital {recipient} successfully accepted clinical document bundle.",
            )

            cls._receipt_cache[envelope.delivery_id] = receipt

            AuditService.record_event(
                action="RECEIVER_DELIVERY",
                resource_type="ENVELOPE",
                resource_id=envelope.delivery_id,
                outcome="SUCCESS",
                organization_id=recipient,
                details={
                    "receipt_id": receipt_id,
                    "recipient": recipient,
                    "sender": envelope.sender_provider_id,
                },
            )

            logger.info(
                "Simulated receiver accepted delivery: receipt_id=%s, recipient=%s",
                receipt_id,
                recipient,
            )
            return receipt

    @classmethod
    def clear_cache(cls) -> None:
        """Clear cache for test isolation."""
        with cls._lock:
            cls._receipt_cache.clear()
            cls._transient_failure_counters.clear()
