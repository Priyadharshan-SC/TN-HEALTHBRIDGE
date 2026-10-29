"""Service for managing Universal Patient Identity (UPID) and Provider Mappings."""
from datetime import datetime, timezone
import json
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional
import uuid

from app.core.security import AppRole, AuthenticatedPrincipal
from app.schemas.patient_identity import (
    ProviderMappingCreate,
    ProviderMappingResponse,
    ResolveIdentityRequest,
    ResolveIdentityResponse,
    UniversalPatientCreate,
    UniversalPatientResponse,
)
from app.services.audit_service import AuditService

import re

logger = logging.getLogger("tn_healthbridge.services.patient_identity")

def normalize_name_key(name: str) -> str:
    """Normalize patient name for phonetic/spacing comparison across provider intakes.
    
    Removes leading/trailing initials and all spacing/punctuation (e.g. 'Priya Dharshan' -> 'priyadharshan',
    'Priyadharshan S' -> 'priyadharshan').
    """
    s = (name or "").strip().lower()
    # Remove leading initials (e.g. 's. priyadharshan', 's priyadharshan')
    s = re.sub(r'^[a-z](\.|\s+)', '', s)
    # Remove trailing initials (e.g. 'priyadharshan s', 'priyadharshan s.', 'priyadharshan.s')
    s = re.sub(r'(\s+[a-z]\.?|\.[a-z])$', '', s)
    # Remove whitespace, dots, and hyphens
    s = re.sub(r'[\s\.\-]+', '', s)
    return s

MAPPINGS_STORE_PATH = Path("data/identity/universal_patient_mappings.json")

PROVIDER_NAMES = {
    "HOSPITAL_A": "City Hospital 1",
    "LAB_C": "Central Laboratory",
    "HOSPITAL_B": "Metro Hospital",
    "HOSPITAL_D": "Sunrise Hospital",
    "LAB_E": "Elite Diagnostics",
    "CLINIC_F": "Green Valley Clinic",
}

DEFAULT_PATIENTS_DATA = [
    {
        "universal_patient_id": "UPID-ARUN-001",
        "full_name": "Arun Kumar",
        "dob": "1985-05-14",
        "gender": "MALE",
        "abha_address": "arun.kumar@abdm",
        "phone_masked": "+91 98*** **345",
        "status": "ACTIVE",
        "created_at": "2026-01-10T00:00:00Z",
        "updated_at": "2026-10-28T09:00:00Z",
        "mappings": [
            {
                "mapping_id": "MAP-001",
                "universal_patient_id": "UPID-ARUN-001",
                "provider_id": "HOSPITAL_A",
                "provider_name": "City Hospital 1",
                "local_patient_id": "CH1-1042",
                "verification_status": "VERIFIED",
                "mapping_method": "CONTROLLED_REGISTRY",
                "confidence_score": 1.0,
                "provenance": "Biometric ABHA authentication and in-person hospital registration",
                "created_at": "2026-01-10T00:00:00Z",
                "verified_at": "2026-01-10T00:00:00Z",
            },
            {
                "mapping_id": "MAP-002",
                "universal_patient_id": "UPID-ARUN-001",
                "provider_id": "HOSPITAL_B",
                "provider_name": "Metro Hospital",
                "local_patient_id": "MH-2098",
                "verification_status": "VERIFIED",
                "mapping_method": "CONTROLLED_REGISTRY",
                "confidence_score": 1.0,
                "provenance": "Patient-consented cross-referral record binding",
                "created_at": "2026-02-01T00:00:00Z",
                "verified_at": "2026-02-01T00:00:00Z",
            },
            {
                "mapping_id": "MAP-003",
                "universal_patient_id": "UPID-ARUN-001",
                "provider_id": "LAB_C",
                "provider_name": "Central Laboratory",
                "local_patient_id": "CL-7821",
                "verification_status": "VERIFIED",
                "mapping_method": "CONTROLLED_REGISTRY",
                "confidence_score": 1.0,
                "provenance": "Diagnostic requisition lab barcode binding",
                "created_at": "2026-02-15T00:00:00Z",
                "verified_at": "2026-02-15T00:00:00Z",
            },
            {
                "mapping_id": "MAP-004",
                "universal_patient_id": "UPID-ARUN-001",
                "provider_id": "HOSPITAL_D",
                "provider_name": "Sunrise Hospital",
                "local_patient_id": "SH-5017",
                "verification_status": "VERIFIED",
                "mapping_method": "CONTROLLED_REGISTRY",
                "confidence_score": 1.0,
                "provenance": "Coimbatore branch verified clinical intake",
                "created_at": "2026-03-01T00:00:00Z",
                "verified_at": "2026-03-01T00:00:00Z",
            },
        ],
    },
    {
        "universal_patient_id": "UPID-PRIYA-002",
        "full_name": "Priya S",
        "dob": "1992-09-22",
        "gender": "FEMALE",
        "abha_address": "priya.s@abdm",
        "phone_masked": "+91 94*** **891",
        "status": "ACTIVE",
        "created_at": "2026-01-20T00:00:00Z",
        "updated_at": "2026-10-27T14:00:00Z",
        "mappings": [
            {
                "mapping_id": "MAP-005",
                "universal_patient_id": "UPID-PRIYA-002",
                "provider_id": "HOSPITAL_A",
                "provider_name": "City Hospital 1",
                "local_patient_id": "CH1-2091",
                "verification_status": "VERIFIED",
                "mapping_method": "CONTROLLED_REGISTRY",
                "confidence_score": 1.0,
                "provenance": "Outpatient department verified registration",
                "created_at": "2026-01-20T00:00:00Z",
                "verified_at": "2026-01-20T00:00:00Z",
            },
            {
                "mapping_id": "MAP-006",
                "universal_patient_id": "UPID-PRIYA-002",
                "provider_id": "LAB_E",
                "provider_name": "Elite Diagnostics",
                "local_patient_id": "ED-3041",
                "verification_status": "VERIFIED",
                "mapping_method": "CONTROLLED_REGISTRY",
                "confidence_score": 1.0,
                "provenance": "Trichy branch verified diagnostic intake",
                "created_at": "2026-03-15T00:00:00Z",
                "verified_at": "2026-03-15T00:00:00Z",
            },
        ],
    },
    {
        "universal_patient_id": "UPID-KARTHIK-003",
        "full_name": "Karthik R",
        "dob": "1978-11-03",
        "gender": "MALE",
        "abha_address": "karthik.r@abdm",
        "phone_masked": "+91 97*** **112",
        "status": "ACTIVE",
        "created_at": "2026-02-10T00:00:00Z",
        "updated_at": "2026-10-26T11:00:00Z",
        "mappings": [
            {
                "mapping_id": "MAP-007",
                "universal_patient_id": "UPID-KARTHIK-003",
                "provider_id": "HOSPITAL_B",
                "provider_name": "Metro Hospital",
                "local_patient_id": "MH-3310",
                "verification_status": "VERIFIED",
                "mapping_method": "CONTROLLED_REGISTRY",
                "confidence_score": 1.0,
                "provenance": "Emergency department verified intake",
                "created_at": "2026-02-10T00:00:00Z",
                "verified_at": "2026-02-10T00:00:00Z",
            },
            {
                "mapping_id": "MAP-008",
                "universal_patient_id": "UPID-KARTHIK-003",
                "provider_id": "CLINIC_F",
                "provider_name": "Green Valley Clinic",
                "local_patient_id": "GVC-9102",
                "verification_status": "VERIFIED",
                "mapping_method": "CONTROLLED_REGISTRY",
                "confidence_score": 1.0,
                "provenance": "Primary care clinic registration",
                "created_at": "2026-04-01T00:00:00Z",
                "verified_at": "2026-04-01T00:00:00Z",
            },
        ],
    },
]


class PatientIdentityService:
    """Manages Universal Patient Identity and secure provider-scoped mappings."""

    @classmethod
    def _ensure_store(cls):
        MAPPINGS_STORE_PATH.parent.mkdir(parents=True, exist_ok=True)
        if not MAPPINGS_STORE_PATH.exists():
            with open(MAPPINGS_STORE_PATH, "w", encoding="utf-8") as f:
                json.dump([], f, indent=2)

    @classmethod
    def _read_data(cls) -> List[Dict]:
        cls._ensure_store()
        try:
            with open(MAPPINGS_STORE_PATH, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return []

    @classmethod
    def _write_data(cls, data: List[Dict]):
        cls._ensure_store()
        with open(MAPPINGS_STORE_PATH, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)

    @classmethod
    def list_patients(
        cls, 
        search: Optional[str] = None,
        provider_id: Optional[str] = None
    ) -> List[UniversalPatientResponse]:
        """List patients and their mappings, filtering by search or provider."""
        data = cls._read_data()
        results = []
        for p in data:
            if provider_id and not any(m["provider_id"] == provider_id.upper() for m in p.get("mappings", [])):
                continue
            if search:
                s = search.lower()
                matches = (
                    s in p["universal_patient_id"].lower()
                    or s in p["full_name"].lower()
                    or (p.get("abha_address") and s in p["abha_address"].lower())
                    or any(s in m["local_patient_id"].lower() for m in p.get("mappings", []))
                )
                if not matches:
                    continue
            results.append(UniversalPatientResponse(**p))
        return results

    @classmethod
    def get_patient(cls, universal_patient_id: str) -> Optional[UniversalPatientResponse]:
        """Retrieve a universal patient by UPID."""
        data = cls._read_data()
        norm_upid = universal_patient_id.strip().upper()
        for p in data:
            if p["universal_patient_id"].upper() == norm_upid:
                return UniversalPatientResponse(**p)
        return None

    @classmethod
    def find_by_local_id(cls, provider_id: str, local_patient_id: str) -> Optional[UniversalPatientResponse]:
        """Resolve a (provider_id, local_patient_id) to its UniversalPatient."""
        data = cls._read_data()
        norm_prov = provider_id.strip().upper()
        norm_local = local_patient_id.strip()
        for p in data:
            for m in p.get("mappings", []):
                if m["provider_id"] == norm_prov and m["local_patient_id"] == norm_local:
                    return UniversalPatientResponse(**p)
        return None

    @classmethod
    def create_patient(
        cls, 
        payload: UniversalPatientCreate,
        principal: Optional[AuthenticatedPrincipal] = None
    ) -> UniversalPatientResponse:
        """Register a new universal patient with a generated UPID."""
        data = cls._read_data()
        upid = f"UPID-{uuid.uuid4().hex[:8].upper()}"
        now_str = datetime.now(timezone.utc).isoformat()

        new_record = {
            "universal_patient_id": upid,
            "full_name": payload.full_name.strip(),
            "dob": payload.dob.strip(),
            "gender": payload.gender,
            "abha_address": payload.abha_address,
            "phone_masked": payload.phone_masked,
            "status": "ACTIVE",
            "mappings": [],
            "created_at": now_str,
            "updated_at": now_str,
        }
        data.append(new_record)
        cls._write_data(data)

        AuditService.record_event(
            action="PATIENT_IDENTITY_CREATED",
            resource_type="PATIENT",
            resource_id=upid,
            outcome="SUCCESS",
            actor_id=principal.user_id if principal else "SYSTEM",
            organization_id=principal.organization_id if principal else "CENTRAL_REGISTRY",
        )
        return UniversalPatientResponse(**new_record)

    @classmethod
    def add_mapping(
        cls, 
        payload: ProviderMappingCreate,
        principal: Optional[AuthenticatedPrincipal] = None
    ) -> ProviderMappingResponse:
        """Add a verified provider-specific patient reference to a universal identity.
        
        Enforces global uniqueness: (provider_id, local_patient_id) must not belong
        to any other universal patient.
        """
        data = cls._read_data()
        norm_upid = payload.universal_patient_id.strip().upper()
        norm_prov = payload.provider_id.strip().upper()
        norm_local = payload.local_patient_id.strip()

        # 1. Uniqueness check across all patients
        for p in data:
            for m in p.get("mappings", []):
                if m["provider_id"] == norm_prov and m["local_patient_id"] == norm_local:
                    if p["universal_patient_id"].upper() != norm_upid:
                        raise ValueError(
                            f"Provider reference '{norm_prov}/{norm_local}' is already mapped "
                            f"to distinct patient '{p['universal_patient_id']}'. Multi-subject assignment rejected."
                        )

        # 2. Find target patient
        target_patient = None
        for p in data:
            if p["universal_patient_id"].upper() == norm_upid:
                target_patient = p
                break
        if not target_patient:
            raise KeyError(f"Universal Patient ID '{norm_upid}' not found.")

        # 3. Prevent duplicate mapping in same subject
        for m in target_patient.get("mappings", []):
            if m["provider_id"] == norm_prov and m["local_patient_id"] == norm_local:
                return ProviderMappingResponse(**m)

        now_str = datetime.now(timezone.utc).isoformat()
        new_map_id = f"MAP-{uuid.uuid4().hex[:6].upper()}"
        prov_name = PROVIDER_NAMES.get(norm_prov, norm_prov)

        new_map = {
            "mapping_id": new_map_id,
            "universal_patient_id": norm_upid,
            "provider_id": norm_prov,
            "provider_name": prov_name,
            "local_patient_id": norm_local,
            "verification_status": payload.verification_status,
            "mapping_method": payload.mapping_method,
            "confidence_score": payload.confidence_score,
            "provenance": payload.provenance,
            "created_at": now_str,
            "verified_at": now_str if payload.verification_status == "VERIFIED" else None,
        }
        target_patient.setdefault("mappings", []).append(new_map)
        target_patient["updated_at"] = now_str
        cls._write_data(data)

        AuditService.record_event(
            action="PATIENT_MAPPING_ADDED",
            resource_type="PATIENT_MAPPING",
            resource_id=new_map_id,
            outcome="SUCCESS",
            actor_id=principal.user_id if principal else "SYSTEM",
            organization_id=norm_prov,
        )
        return ProviderMappingResponse(**new_map)

    @classmethod
    def resolve_identity(cls, request: ResolveIdentityRequest) -> ResolveIdentityResponse:
        """Resolve a source patient reference to its target provider reference.
        
        Zero-merge guarantee: returns explicit UNRESOLVED if mapping is missing
        or REVIEW_REQUIRED if not verified.
        """
        source_patient = cls.find_by_local_id(request.source_provider_id, request.source_patient_id)
        if not source_patient:
            return ResolveIdentityResponse(
                universal_patient_id="UNKNOWN",
                target_patient_id=None,
                target_provider_id=request.target_provider_id.upper(),
                resolution_status="UNRESOLVED",
                confidence=0.0,
                message=f"No universal identity found for source {request.source_provider_id}/{request.source_patient_id}.",
            )

        norm_target_prov = request.target_provider_id.strip().upper()
        target_mapping = None
        for m in source_patient.mappings:
            if m.provider_id == norm_target_prov:
                target_mapping = m
                break

        if not target_mapping:
            return ResolveIdentityResponse(
                universal_patient_id=source_patient.universal_patient_id,
                target_patient_id=None,
                target_provider_id=norm_target_prov,
                resolution_status="UNRESOLVED",
                confidence=0.0,
                message=f"Universal patient '{source_patient.universal_patient_id}' has no registered mapping at '{norm_target_prov}'.",
            )

        if target_mapping.verification_status != "VERIFIED":
            return ResolveIdentityResponse(
                universal_patient_id=source_patient.universal_patient_id,
                target_patient_id=target_mapping.local_patient_id,
                target_provider_id=norm_target_prov,
                resolution_status="REVIEW_REQUIRED",
                confidence=target_mapping.confidence_score,
                message=f"Target mapping at '{norm_target_prov}' is pending verification; requires institutional review.",
            )

        return ResolveIdentityResponse(
            universal_patient_id=source_patient.universal_patient_id,
            target_patient_id=target_mapping.local_patient_id,
            target_provider_id=norm_target_prov,
            resolution_status="RESOLVED",
            confidence=target_mapping.confidence_score,
            message="Universal identity successfully resolved and verified.",
        )

    @classmethod
    def link_or_create_provider_patient(
        cls,
        provider_id: str,
        local_patient: Any,
        principal: Optional[AuthenticatedPrincipal] = None,
    ) -> UniversalPatientResponse:
        """Find matching universal patient by name/DOB or create one and link the provider mapping."""
        norm_prov = provider_id.strip().upper()
        norm_local = local_patient.local_patient_id.strip()
        data = cls._read_data()

        # 1. Check if this local patient is already mapped
        for p in data:
            for m in p.get("mappings", []):
                if m["provider_id"] == norm_prov and m["local_patient_id"] == norm_local:
                    return UniversalPatientResponse(**p)

        # 2. Check for matching universal patient with strict verification rules
        # Enforce: Prevent incorrect mappings and automatic merging based only on matching names or demographics.
        clean_name = local_patient.full_name.strip().lower()
        clean_dob = local_patient.dob.strip()
        raw_phone = (getattr(local_patient, "phone", None) or "").strip()
        clean_phone = "".join(ch for ch in raw_phone if ch.isdigit())
        explicit_abha = (getattr(local_patient, "abha_address", None) or "").strip().lower()

        matched_patient = None
        demographic_collision_detected = False
        colliding_candidate = None

        for p in data:
            p_abha = (p.get("abha_address") or "").strip().lower()
            p_name = p.get("full_name", "").strip().lower()
            p_dob = p.get("dob", "").strip()
            p_phone_digits = "".join(ch for ch in p.get("phone_masked", "") if ch.isdigit())

            # A. High-confidence match via explicit ABHA Address
            if explicit_abha and p_abha and explicit_abha == p_abha:
                matched_patient = p
                break

            # B. Check demographic match
            name_exact_match = (p_name == clean_name)
            name_norm_match = (normalize_name_key(p_name) == normalize_name_key(clean_name))

            if p_dob == clean_dob and (name_exact_match or name_norm_match):
                # If verified phone number also matches with >= 6 continuous digits
                if clean_phone and len(clean_phone) >= 6 and (clean_phone in p_phone_digits or p_phone_digits in clean_phone):
                    matched_patient = p
                    break
                elif name_exact_match:
                    # AMBIGUOUS DEMOGRAPHIC MATCH: Same name and DOB, but unverified / lacking shared unique identifier!
                    # Prevent automatic merging to protect patient safety.
                    demographic_collision_detected = True
                    colliding_candidate = p

        now_str = datetime.now(timezone.utc).isoformat()

        if demographic_collision_detected and not matched_patient:
            # Explicitly log collision and require manual administrative verification
            AuditService.record_event(
                action="PATIENT_DEMOGRAPHIC_COLLISION_DETECTED",
                resource_type="PATIENT",
                resource_id=colliding_candidate["universal_patient_id"],
                outcome="REVIEW_REQUIRED",
                actor_id=principal.user_id if principal else "PROVIDER_STAFF",
                organization_id=norm_prov,
                details={
                    "colliding_upid": colliding_candidate["universal_patient_id"],
                    "candidate_name": local_patient.full_name,
                    "candidate_dob": local_patient.dob,
                    "provider_id": norm_prov,
                    "local_patient_id": norm_local,
                    "reason": "Demographic collision detected on name and DOB without verified identifier. Automatic merging prevented.",
                },
            )

        if matched_patient:
            upid = matched_patient["universal_patient_id"]
        else:
            upid = f"UPID-{uuid.uuid4().hex[:8].upper()}"
            phone_masked = f"{raw_phone[:6]}***" if len(raw_phone) > 6 else (raw_phone or "+91 98*** **000")
            assigned_abha = explicit_abha or f"{clean_name.replace(' ', '.')}.{uuid.uuid4().hex[:4]}@abdm"
            matched_patient = {
                "universal_patient_id": upid,
                "full_name": local_patient.full_name.strip(),
                "dob": local_patient.dob.strip(),
                "gender": local_patient.gender,
                "abha_address": assigned_abha,
                "phone_masked": phone_masked,
                "status": "ACTIVE",
                "mappings": [],
                "created_at": now_str,
                "updated_at": now_str,
            }
            data.append(matched_patient)

        # Add or update the provider mapping
        prov_name = PROVIDER_NAMES.get(norm_prov, norm_prov)
        existing_map = next((m for m in matched_patient.get("mappings", []) if m["provider_id"] == norm_prov), None)
        if existing_map:
            existing_map["local_patient_id"] = norm_local
            existing_map["verified_at"] = now_str
        else:
            new_map_id = f"MAP-{uuid.uuid4().hex[:6].upper()}"
            new_map = {
                "mapping_id": new_map_id,
                "universal_patient_id": upid,
                "provider_id": norm_prov,
                "provider_name": prov_name,
                "local_patient_id": norm_local,
                "verification_status": "VERIFIED",
                "mapping_method": "MANUAL_VERIFIED",
                "confidence_score": 1.0,
                "provenance": f"Registered at {prov_name}",
                "created_at": now_str,
                "verified_at": now_str,
            }
            matched_patient.setdefault("mappings", []).append(new_map)
        matched_patient["updated_at"] = now_str
        cls._write_data(data)

        AuditService.record_event(
            action="PATIENT_IDENTITY_AUTO_LINKED",
            resource_type="PATIENT",
            resource_id=upid,
            outcome="SUCCESS",
            actor_id=principal.user_id if principal else "PROVIDER_STAFF",
            organization_id=norm_prov,
            details={"provider_id": norm_prov, "local_patient_id": norm_local},
        )
        return UniversalPatientResponse(**matched_patient)

    @classmethod
    def merge_patients(
        cls,
        source_upid: str,
        target_upid: str,
        principal: Optional[AuthenticatedPrincipal] = None,
        preferred_name: Optional[str] = None,
        reason: Optional[str] = "Identity verified as same person",
    ) -> UniversalPatientResponse:
        """Merge source_upid into target_upid, transferring all provider mappings.
        
        Consolidates separate UPIDs (e.g. from slight name spelling variations)
        into a single unified authoritative universal patient identity tree.
        """
        data = cls._read_data()
        norm_source = source_upid.strip().upper()
        norm_target = target_upid.strip().upper()

        if norm_source == norm_target:
            raise ValueError("Source and target UPID cannot be identical.")

        source_patient = None
        target_patient = None

        for p in data:
            if p["universal_patient_id"].upper() == norm_source:
                source_patient = p
            elif p["universal_patient_id"].upper() == norm_target:
                target_patient = p

        if not source_patient:
            raise KeyError(f"Source UPID '{norm_source}' not found.")
        if not target_patient:
            raise KeyError(f"Target UPID '{norm_target}' not found.")

        # Transfer mappings
        target_mappings = target_patient.setdefault("mappings", [])
        now_str = datetime.now(timezone.utc).isoformat()

        for sm in source_patient.get("mappings", []):
            existing = next(
                (m for m in target_mappings if m["provider_id"] == sm["provider_id"] and m["local_patient_id"] == sm["local_patient_id"]),
                None
            )
            if not existing:
                sm_copy = dict(sm)
                sm_copy["universal_patient_id"] = norm_target
                sm_copy["verified_at"] = now_str
                sm_copy["provenance"] = f"Transferred via administrative identity merge from {norm_source}"
                target_mappings.append(sm_copy)

        if preferred_name and preferred_name.strip():
            target_patient["full_name"] = preferred_name.strip()

        target_patient["updated_at"] = now_str

        # Remove source patient
        data = [p for p in data if p["universal_patient_id"].upper() != norm_source]
        cls._write_data(data)

        # Update consent registry references if source_upid was used
        try:
            from app.services.consent_service import ConsentService
            ConsentService.reassign_patient_consents(norm_source, norm_target)
        except Exception as e:
            logger.warning("Could not reassign consents during merge: %s", e)

        AuditService.record_event(
            action="PATIENT_IDENTITIES_MERGED",
            resource_type="PATIENT",
            resource_id=norm_target,
            outcome="SUCCESS",
            actor_id=principal.user_id if principal else "ADMINISTRATOR",
            organization_id=principal.organization_id if principal else "CENTRAL_REGISTRY",
            details={
                "source_upid": norm_source,
                "target_upid": norm_target,
                "mappings_transferred": len(source_patient.get("mappings", [])),
                "reason": reason,
            },
        )
        return UniversalPatientResponse(**target_patient)

