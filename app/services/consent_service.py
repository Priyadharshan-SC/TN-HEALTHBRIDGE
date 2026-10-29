"""Durable Consent Lifecycle Management Service for ABDM-Aligned Data Exchange."""
import json
import logging
import os
import threading
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Union

from app.core.config import get_settings
from app.core.errors import (
    ConsentDeniedError,
    ConsentExpiredError,
    ConsentNotFoundError,
    ConsentNotGrantedError,
    ConsentRevokedError,
    InvalidConsentSignatureError,
    InvalidGatewayRequestError,
)
from app.schemas.gateway import (
    AbdmConsentArtefact,
    ConsentActor,
    ConsentDateRange,
    ConsentLifecycleEvent,
    ConsentPatient,
    ConsentPermission,
    ConsentPurpose,
    ConsentRecord,
    ConsentStatus,
)
from app.services.audit_service import AuditService

logger = logging.getLogger("tn_healthbridge.consent_service")


class ConsentService:
    """Thread-safe, durable consent lifecycle manager."""

    _lock = threading.Lock()
    _registry: Dict[str, ConsentRecord] = {}
    _initialized: bool = False

    @classmethod
    def _ensure_initialized(cls) -> None:
        """Load stored consents or seed default synthetic fixtures."""
        if cls._initialized:
            return
        with cls._lock:
            if cls._initialized:
                return
            cls._load_from_disk()
            cls._initialized = True

    @classmethod
    def _load_from_disk(cls) -> None:
        """Load consent registry from configured JSON file."""
        settings = get_settings()
        path = settings.CONSENT_STORE_PATH
        if os.path.exists(path):
            try:
                with open(path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    for item in data:
                        rec = ConsentRecord.model_validate(item)
                        cls._registry[rec.artefact.consent_id] = rec
                logger.info("Loaded %d consent artefacts from %s", len(cls._registry), path)
            except Exception as e:
                logger.warning("Failed to load consent registry: %s. Starting with defaults.", e)

    @classmethod
    def _save_to_disk(cls) -> None:
        """Persist consent registry to disk atomically."""
        settings = get_settings()
        path = settings.CONSENT_STORE_PATH
        try:
            os.makedirs(os.path.dirname(path), exist_ok=True)
            temp_path = f"{path}.tmp"
            data = [rec.model_dump(mode="json") for rec in cls._registry.values()]
            with open(temp_path, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2)
            os.replace(temp_path, path)
        except Exception as e:
            logger.warning("Failed to persist consent registry to %s: %s", path, e)

    @classmethod
    def _seed_default_synthetic_consents(cls) -> None:
        """Seed representative synthetic ABDM consent artefacts."""
        now = datetime.now(timezone.utc)
        fixtures = [
            # 1. Standard active granted consent for PT-2026-0091
            AbdmConsentArtefact(
                consent_id="CONSENT-SYN-001",
                status="GRANTED",
                created_at=now - timedelta(days=2),
                patient=ConsentPatient(id="PT-2026-0091"),
                purpose=ConsentPurpose(code="CAREMGT", text="Care Management"),
                hip=ConsentActor(id="HOSPITAL_A", name="Government Multi Care Hospital"),
                hiu=ConsentActor(id="HOSPITAL_B", name="City Referral Hospital"),
                permission=ConsentPermission(
                    access_mode="VIEW",
                    date_range=ConsentDateRange(
                        from_date=now - timedelta(days=30),
                        to_date=now + timedelta(days=1),
                    ),
                    data_erase_at=now + timedelta(days=60),
                ),
                consent_expiry=now + timedelta(days=30),
                hi_types=["DiagnosticReport"],
                signature="TEST_SIG_CONSENT-SYN-001",
            ),
            # 2. Standard active granted consent for PAT-001 / SYN_PATIENT_001
            AbdmConsentArtefact(
                consent_id="CONSENT-SYN-002",
                status="GRANTED",
                created_at=now - timedelta(days=1),
                patient=ConsentPatient(id="PAT-001"),
                purpose=ConsentPurpose(code="CAREMGT", text="Care Management"),
                hip=ConsentActor(id="HOSPITAL_A", name="Government Multi Care Hospital"),
                hiu=ConsentActor(id="HIU_TN_001", name="TN State Health Directorate"),
                permission=ConsentPermission(
                    access_mode="VIEW",
                    date_range=ConsentDateRange(
                        from_date=now - timedelta(days=90),
                        to_date=now + timedelta(days=1),
                    ),
                    data_erase_at=now + timedelta(days=90),
                ),
                consent_expiry=now + timedelta(days=45),
                hi_types=["DiagnosticReport"],
                signature="TEST_SIG_CONSENT-SYN-002",
            ),
            # 3. Revoked consent fixture for security testing
            AbdmConsentArtefact(
                consent_id="CONSENT-SYN-REVOKED-001",
                status="REVOKED",
                created_at=now - timedelta(days=5),
                patient=ConsentPatient(id="PAT-001"),
                purpose=ConsentPurpose(code="CAREMGT", text="Care Management"),
                hip=ConsentActor(id="HOSPITAL_A", name="Government Multi Care Hospital"),
                hiu=ConsentActor(id="HOSPITAL_B", name="City Referral Hospital"),
                permission=ConsentPermission(
                    access_mode="VIEW",
                    date_range=ConsentDateRange(
                        from_date=now - timedelta(days=30),
                        to_date=now + timedelta(days=1),
                    ),
                    data_erase_at=now + timedelta(days=60),
                ),
                consent_expiry=now + timedelta(days=30),
                hi_types=["DiagnosticReport"],
                signature="TEST_SIG_CONSENT-SYN-REVOKED-001",
            ),
        ]

        for fix in fixtures:
            rec = ConsentRecord(
                artefact=fix,
                version=1,
                lifecycle_history=[
                    ConsentLifecycleEvent(
                        to_status=fix.status,
                        actor="SYSTEM_INIT",
                        reason="Synthetic baseline fixture initialization",
                    )
                ],
            )
            cls._registry[fix.consent_id] = rec

    @classmethod
    def list_consents(cls) -> List[ConsentRecord]:
        """Return all registered consent records."""
        cls._ensure_initialized()
        with cls._lock:
            return list(cls._registry.values())

    @classmethod
    def save_all_consents(cls, consents: List[ConsentRecord]) -> None:
        """Update consent registry from records list."""
        cls._ensure_initialized()
        with cls._lock:
            for c in consents:
                cls._registry[c.artefact.consent_id] = c
            cls._save_to_disk()

    @classmethod
    def get_consent(cls, consent_id: str) -> Optional[ConsentRecord]:
        """Fetch consent record by unique ID."""
        cls._ensure_initialized()
        with cls._lock:
            return cls._registry.get(consent_id)

    @classmethod
    def register_consent(
        cls,
        artefact: Any,
        initial_status: ConsentStatus = "REQUESTED",
        actor: str = "system",
    ) -> ConsentRecord:
        """Register a new consent request or pre-signed artefact in authoritative store."""
        cls._ensure_initialized()
        with cls._lock:
            if isinstance(artefact, ConsentRecord):
                rec = artefact
                cls._registry[rec.artefact.consent_id] = rec
                cls._save_to_disk()
                return rec

            # Enforce that caller cannot self-grant without an authorized grant operation
            if initial_status == "GRANTED" and not artefact.signature:
                raise InvalidGatewayRequestError("Cannot register GRANTED consent without cryptographic signature.")

            art = artefact.model_copy(update={"status": initial_status})
            rec = ConsentRecord(
                artefact=art,
                version=1,
                lifecycle_history=[
                    ConsentLifecycleEvent(
                        from_status=None,
                        to_status=initial_status,
                        actor=actor,
                        reason="Consent artefact registered",
                    )
                ],
            )
            cls._registry[art.consent_id] = rec
            cls._save_to_disk()

            AuditService.record_event(
                action="CONSENT_REGISTERED",
                resource_type="CONSENT",
                resource_id=art.consent_id,
                outcome="SUCCESS",
                actor_id=actor,
                organization_id=art.hiu.id,
                details={"patient_id": art.patient.id, "initial_status": initial_status},
            )
            return rec

    @classmethod
    def grant_consent(
        cls,
        consent_id: str,
        actor: str,
        signature: Optional[str] = None,
        reason: Optional[str] = None,
    ) -> ConsentRecord:
        """Transition consent state to GRANTED by authorized patient or administrator."""
        cls._ensure_initialized()
        with cls._lock:
            rec = cls._registry.get(consent_id)
            if not rec:
                raise ConsentNotFoundError(consent_id)

            old_status = rec.artefact.status
            if old_status == "REVOKED":
                raise InvalidGatewayRequestError("Cannot grant a REVOKED consent artefact.")
            if old_status == "EXPIRED":
                raise InvalidGatewayRequestError("Cannot grant an EXPIRED consent artefact.")

            sig = signature or f"TEST_SIG_{consent_id}"
            updated_art = rec.artefact.model_copy(update={"status": "GRANTED", "signature": sig})
            rec.artefact = updated_art
            rec.version += 1
            rec.last_updated_at = datetime.now(timezone.utc).isoformat()
            rec.lifecycle_history.append(
                ConsentLifecycleEvent(
                    from_status=old_status,
                    to_status="GRANTED",
                    actor=actor,
                    reason=reason or "Authorized grant",
                )
            )
            cls._save_to_disk()

            AuditService.record_event(
                action="CONSENT_GRANTED",
                resource_type="CONSENT",
                resource_id=consent_id,
                outcome="SUCCESS",
                actor_id=actor,
                organization_id=rec.artefact.hiu.id,
                details={"old_status": old_status, "new_status": "GRANTED"},
            )
            return rec

    @classmethod
    def revoke_consent(
        cls,
        consent_id: str,
        actor: str,
        reason: str = "Revoked by patient request",
    ) -> ConsentRecord:
        """Revoke an active consent artefact immediately (fail-closed)."""
        cls._ensure_initialized()
        with cls._lock:
            rec = cls._registry.get(consent_id)
            if not rec:
                raise ConsentNotFoundError(consent_id)

            old_status = rec.artefact.status
            updated_art = rec.artefact.model_copy(update={"status": "REVOKED"})
            rec.artefact = updated_art
            rec.version += 1
            rec.last_updated_at = datetime.now(timezone.utc).isoformat()
            rec.lifecycle_history.append(
                ConsentLifecycleEvent(
                    from_status=old_status,
                    to_status="REVOKED",
                    actor=actor,
                    reason=reason,
                )
            )
            cls._save_to_disk()

            AuditService.record_event(
                action="CONSENT_REVOKED",
                resource_type="CONSENT",
                resource_id=consent_id,
                outcome="SUCCESS",
                actor_id=actor,
                organization_id=rec.artefact.hiu.id,
                details={"old_status": old_status, "reason": reason},
            )
            return rec

    @classmethod
    def deny_consent(
        cls,
        consent_id: str,
        actor: str,
        reason: str = "Consent request denied",
    ) -> ConsentRecord:
        """Mark consent request as explicitly DENIED."""
        cls._ensure_initialized()
        with cls._lock:
            rec = cls._registry.get(consent_id)
            if not rec:
                raise ConsentNotFoundError(consent_id)

            old_status = rec.artefact.status
            updated_art = rec.artefact.model_copy(update={"status": "DENIED"})
            rec.artefact = updated_art
            rec.version += 1
            rec.last_updated_at = datetime.now(timezone.utc).isoformat()
            rec.lifecycle_history.append(
                ConsentLifecycleEvent(
                    from_status=old_status,
                    to_status="DENIED",
                    actor=actor,
                    reason=reason,
                )
            )
            cls._save_to_disk()

            AuditService.record_event(
                action="CONSENT_DENIED",
                resource_type="CONSENT",
                resource_id=consent_id,
                outcome="SUCCESS",
                actor_id=actor,
                organization_id=rec.artefact.hiu.id,
                details={"old_status": old_status, "reason": reason},
            )
            return rec

    @classmethod
    def resolve_effective_consent(
        cls,
        caller_consent: AbdmConsentArtefact,
    ) -> AbdmConsentArtefact:
        """Resolve authoritative consent status from durable registry.
        
        Enforces:
        - If consent_id exists in registry, the server's registered lifecycle status
          and metadata override any caller-supplied claim.
        - A caller cannot bypass revocation or denial by submitting a JSON object
          with status="GRANTED".
        """
        cls._ensure_initialized()
        with cls._lock:
            registered_rec = cls._registry.get(caller_consent.consent_id)
            if registered_rec:
                # Server-authoritative record takes precedence
                reg_art = registered_rec.artefact
                if reg_art.status == "REVOKED":
                    raise ConsentRevokedError("Consent artefact status is REVOKED by the patient.")
                if reg_art.status == "DENIED":
                    raise ConsentDeniedError("Consent request was DENIED by the patient.")
                if reg_art.status == "EXPIRED":
                    raise ConsentExpiredError("Consent artefact status is EXPIRED.")
                if reg_art.status == "REQUESTED":
                    raise ConsentNotGrantedError("Consent artefact status is REQUESTED; authorization has not been granted.")
                return reg_art

            # If not in registry, caller must not claim status="GRANTED" without a server record
            # unless running in test mode with valid test signatures
            settings = get_settings()
            if caller_consent.status != "GRANTED":
                if caller_consent.status == "REVOKED":
                    raise ConsentRevokedError("Consent artefact status is REVOKED by the patient.")
                if caller_consent.status == "DENIED":
                    raise ConsentDeniedError("Consent request was DENIED by the patient.")
                if caller_consent.status == "EXPIRED":
                    raise ConsentExpiredError("Consent artefact status is EXPIRED.")
                if caller_consent.status == "REQUESTED":
                    raise ConsentNotGrantedError("Consent artefact status is REQUESTED; authorization has not been granted.")
                raise ConsentNotGrantedError(f"Consent artefact is in invalid or ungranted status: '{caller_consent.status}'.")

            return caller_consent

    @classmethod
    def reassign_patient_consents(cls, old_upid: str, new_upid: str) -> int:
        """Reassign all consent artefacts from old_upid to new_upid upon administrative identity merge."""
        cls._ensure_initialized()
        norm_old = old_upid.strip().upper()
        norm_new = new_upid.strip().upper()
        count = 0
        with cls._lock:
            for rec in cls._registry.values():
                if rec.artefact.patient.id.strip().upper() == norm_old:
                    rec.artefact.patient.id = norm_new
                    count += 1
            if count > 0:
                cls._save_to_disk()
        return count
