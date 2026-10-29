"""Service providing federated healthcare provider data isolation and adapter interfaces."""
from datetime import datetime, timezone
import json
import logging
import os
from pathlib import Path
from typing import Any, Dict, List, Optional
import uuid

from app.core.security import AppRole, AuthenticatedPrincipal
from app.schemas.provider import (
    CreateClinicalObservationRequest,
    LocalClinicalObservation,
    LocalPatientRecord,
    ProviderExchangeRequest,
    ProviderInboxItem,
)
from app.services.audit_service import AuditService
from app.services.consent_service import ConsentService
from app.services.patient_identity_service import PatientIdentityService

logger = logging.getLogger("tn_healthbridge.services.provider")

PROVIDERS_BASE_DIR = Path("data/providers")

SEED_PROVIDER_DATA: Dict[str, Dict[str, Any]] = {
    "HOSPITAL_A": {
        "name": "City Hospital 1",
        "patients": [
            {
                "local_patient_id": "CH1-1042",
                "full_name": "Arun Kumar",
                "dob": "1985-05-14",
                "gender": "MALE",
                "phone": "+91 98400 12345",
                "created_at": "2026-01-10T00:00:00Z",
                "active": True,
            },
            {
                "local_patient_id": "CH1-2091",
                "full_name": "Priya S",
                "dob": "1992-09-22",
                "gender": "FEMALE",
                "phone": "+91 94440 67890",
                "created_at": "2026-01-20T00:00:00Z",
                "active": True,
            },
        ],
        "records": [
            {
                "record_id": "REC-CH1-001",
                "local_patient_id": "CH1-1042",
                "category": "LABORATORY",
                "test_name": "Blood Glucose Fasting",
                "value": 105.0,
                "unit": "mg/dL",
                "specimen": "blood",
                "reference_range": "70 - 100 mg/dL",
                "interpretation": "Elevated",
                "effective_datetime": "2026-10-25T08:30:00Z",
                "attending_practitioner": "Dr. Senthil Nathan",
                "notes": "Fasting plasma glucose 12-hour fast",
            },
            {
                "record_id": "REC-CH1-002",
                "local_patient_id": "CH1-1042",
                "category": "LABORATORY",
                "test_name": "Hemoglobin A1c",
                "value": 6.2,
                "unit": "%",
                "specimen": "blood",
                "reference_range": "4.0 - 5.6 %",
                "interpretation": "Pre-diabetic Range",
                "effective_datetime": "2026-10-25T08:35:00Z",
                "attending_practitioner": "Dr. Senthil Nathan",
                "notes": "Glycated hemoglobin assay",
            },
        ],
        "inbox": [],
    },
    "LAB_C": {
        "name": "Central Laboratory",
        "patients": [
            {
                "local_patient_id": "CL-7821",
                "full_name": "Arun Kumar",
                "dob": "1985-05-14",
                "gender": "MALE",
                "phone": "+91 98400 12345",
                "created_at": "2026-02-15T00:00:00Z",
                "active": True,
            },
        ],
        "records": [
            {
                "record_id": "REC-CL-101",
                "local_patient_id": "CL-7821",
                "category": "LABORATORY",
                "test_name": "Serum Creatinine",
                "value": 0.95,
                "unit": "mg/dL",
                "specimen": "blood",
                "reference_range": "0.7 - 1.3 mg/dL",
                "interpretation": "Normal",
                "effective_datetime": "2026-10-20T10:15:00Z",
                "attending_practitioner": "Kavitha Rajan (Lab Biochemist)",
                "notes": "Automated kinetic Jaffe reaction",
            },
        ],
        "inbox": [],
    },
    "HOSPITAL_B": {
        "name": "Metro Hospital",
        "patients": [
            {
                "local_patient_id": "MH-2098",
                "full_name": "Arun Kumar",
                "dob": "1985-05-14",
                "gender": "MALE",
                "phone": "+91 98400 12345",
                "created_at": "2026-02-01T00:00:00Z",
                "active": True,
            },
            {
                "local_patient_id": "MH-3310",
                "full_name": "Karthik R",
                "dob": "1978-11-03",
                "gender": "MALE",
                "phone": "+91 97890 23456",
                "created_at": "2026-02-10T00:00:00Z",
                "active": True,
            },
        ],
        "records": [
            {
                "record_id": "REC-MH-201",
                "local_patient_id": "MH-2098",
                "category": "OBSERVATION",
                "test_name": "Blood Pressure Systolic",
                "value": 128.0,
                "unit": "mmHg",
                "specimen": "arterial",
                "reference_range": "90 - 120 mmHg",
                "interpretation": "Prehypertension",
                "effective_datetime": "2026-10-26T11:00:00Z",
                "attending_practitioner": "Dr. V. Ramesh",
                "notes": "Manual sphygmomanometer reading seated",
            },
        ],
        "inbox": [
            {
                "delivery_id": "DEL-MH-INIT-001",
                "job_id": "JOB-EXCH-INIT-001",
                "sender_provider_id": "HOSPITAL_A",
                "sender_provider_name": "City Hospital 1",
                "patient_name": "Arun Kumar",
                "universal_patient_id": "UPID-ARUN-001",
                "local_patient_id": "MH-2098",
                "data_type": "DiagnosticReport & Lab Observations",
                "received_at": "2026-10-27T14:30:00Z",
                "integrity_digest": "sha256:d84f881938b812f8a4e3",
                "receipt_id": "RCPT-MH-001",
                "summary": "Received 2 authorized clinical observations (Glucose, HbA1c)",
            }
        ],
    },
    "HOSPITAL_D": {
        "name": "Sunrise Hospital",
        "patients": [
            {
                "local_patient_id": "SH-5017",
                "full_name": "Arun Kumar",
                "dob": "1985-05-14",
                "gender": "MALE",
                "phone": "+91 98400 12345",
                "created_at": "2026-03-01T00:00:00Z",
                "active": True,
            },
        ],
        "records": [
            {
                "record_id": "REC-SH-301",
                "local_patient_id": "SH-5017",
                "category": "LABORATORY",
                "test_name": "Total Cholesterol",
                "value": 195.0,
                "unit": "mg/dL",
                "specimen": "blood",
                "reference_range": "< 200 mg/dL",
                "interpretation": "Desirable",
                "effective_datetime": "2026-10-15T09:00:00Z",
                "attending_practitioner": "Dr. Anand Mohan",
                "notes": "Lipid panel enzymatic screening",
            },
        ],
        "inbox": [],
    },
    "LAB_E": {
        "name": "Elite Diagnostics",
        "patients": [
            {
                "local_patient_id": "ED-3041",
                "full_name": "Priya S",
                "dob": "1992-09-22",
                "gender": "FEMALE",
                "phone": "+91 94440 67890",
                "created_at": "2026-03-15T00:00:00Z",
                "active": True,
            },
        ],
        "records": [
            {
                "record_id": "REC-ED-401",
                "local_patient_id": "ED-3041",
                "category": "LABORATORY",
                "test_name": "Thyroid Stimulating Hormone",
                "value": 2.4,
                "unit": "uIU/mL",
                "specimen": "blood",
                "reference_range": "0.4 - 4.0 uIU/mL",
                "interpretation": "Euthyroid",
                "effective_datetime": "2026-10-18T10:30:00Z",
                "attending_practitioner": "Deepa Sundaram",
                "notes": "Chemiluminescent immunoassay",
            },
        ],
        "inbox": [],
    },
    "CLINIC_F": {
        "name": "Green Valley Clinic",
        "patients": [
            {
                "local_patient_id": "GVC-9102",
                "full_name": "Karthik R",
                "dob": "1978-11-03",
                "gender": "MALE",
                "phone": "+91 97890 23456",
                "created_at": "2026-04-01T00:00:00Z",
                "active": True,
            },
        ],
        "records": [
            {
                "record_id": "REC-GVC-501",
                "local_patient_id": "GVC-9102",
                "category": "OBSERVATION",
                "test_name": "Body Mass Index",
                "value": 24.5,
                "unit": "kg/m2",
                "specimen": "physical",
                "reference_range": "18.5 - 24.9 kg/m2",
                "interpretation": "Normal weight",
                "effective_datetime": "2026-10-22T16:00:00Z",
                "attending_practitioner": "Dr. Meenakshi Sundaram",
                "notes": "Routine wellness checkup",
            },
        ],
        "inbox": [],
    },
}


class ProviderService:
    """Manages provider local patient records and adapter retrieval."""

    @classmethod
    def _get_provider_file(cls, provider_id: str) -> Path:
        norm_id = provider_id.strip().upper()
        pdir = PROVIDERS_BASE_DIR / norm_id
        pdir.mkdir(parents=True, exist_ok=True)
        return pdir / "data.json"

    @classmethod
    def _read_provider_data(cls, provider_id: str) -> Dict[str, Any]:
        norm_id = provider_id.strip().upper()
        pfile = cls._get_provider_file(norm_id)
        if not pfile.exists():
            empty = {
                "name": norm_id,
                "patients": [],
                "records": [],
                "inbox": [],
            }
            with open(pfile, "w", encoding="utf-8") as f:
                json.dump(empty, f, indent=2)
            return empty
        try:
            with open(pfile, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return {"name": norm_id, "patients": [], "records": [], "inbox": []}

    @classmethod
    def _write_provider_data(cls, provider_id: str, data: Dict[str, Any]):
        norm_id = provider_id.strip().upper()
        pfile = cls._get_provider_file(norm_id)
        with open(pfile, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)

    @classmethod
    def list_patients(cls, provider_id: str) -> List[LocalPatientRecord]:
        """List patients registered locally at this provider."""
        data = cls._read_provider_data(provider_id)
        return [LocalPatientRecord(**p) for p in data.get("patients", [])]

    @classmethod
    def register_patient(
        cls, 
        provider_id: str, 
        patient: LocalPatientRecord,
        principal: Optional[AuthenticatedPrincipal] = None
    ) -> LocalPatientRecord:
        """Register a new patient locally at this provider."""
        norm_id = provider_id.strip().upper()
        data = cls._read_provider_data(norm_id)
        patients = data.get("patients", [])
        if any(p["local_patient_id"] == patient.local_patient_id for p in patients):
            raise ValueError(f"Patient ID '{patient.local_patient_id}' already registered at {norm_id}.")

        patients.append(patient.model_dump())
        data["patients"] = patients
        cls._write_provider_data(norm_id, data)

        # Synchronize with Universal Patient Identity Registry
        from app.services.patient_identity_service import PatientIdentityService
        try:
            PatientIdentityService.link_or_create_provider_patient(norm_id, patient, principal=principal)
        except Exception as e:
            logger.warning("Could not auto-link universal patient for %s/%s: %s", norm_id, patient.local_patient_id, e)

        AuditService.record_event(
            action="LOCAL_PATIENT_REGISTERED",
            resource_type="PATIENT",
            resource_id=patient.local_patient_id,
            outcome="SUCCESS",
            actor_id=principal.user_id if principal else "PROVIDER_STAFF",
            organization_id=norm_id,
        )
        return patient

    @classmethod
    def list_records(
        cls, 
        provider_id: str, 
        local_patient_id: Optional[str] = None
    ) -> List[LocalClinicalObservation]:
        """List clinical observations stored locally at this provider."""
        data = cls._read_provider_data(provider_id)
        records = data.get("records", [])
        if local_patient_id:
            records = [r for r in records if r["local_patient_id"] == local_patient_id]
        return [LocalClinicalObservation(**r) for r in records]

    @classmethod
    def create_record(
        cls, 
        provider_id: str, 
        payload: CreateClinicalObservationRequest,
        principal: Optional[AuthenticatedPrincipal] = None
    ) -> LocalClinicalObservation:
        """Add a local clinical observation to the provider's local repository."""
        norm_id = provider_id.strip().upper()
        data = cls._read_provider_data(norm_id)
        records = data.get("records", [])

        rec_id = f"REC-{norm_id}-{uuid.uuid4().hex[:6].upper()}"
        now_str = datetime.now(timezone.utc).isoformat()
        new_rec = {
            "record_id": rec_id,
            "local_patient_id": payload.local_patient_id,
            "category": payload.category,
            "test_name": payload.test_name,
            "value": payload.value,
            "unit": payload.unit,
            "specimen": payload.specimen,
            "reference_range": payload.reference_range,
            "interpretation": payload.interpretation,
            "effective_datetime": now_str,
            "attending_practitioner": payload.attending_practitioner,
            "notes": payload.notes,
        }
        records.append(new_rec)
        data["records"] = records
        cls._write_provider_data(norm_id, data)

        AuditService.record_event(
            action="CLINICAL_RECORD_CREATED",
            resource_type="OBSERVATION",
            resource_id=rec_id,
            outcome="SUCCESS",
            actor_id=principal.user_id if principal else "PROVIDER_STAFF",
            organization_id=norm_id,
        )
        return LocalClinicalObservation(**new_rec)

    @classmethod
    def adapter_get_patient_records(
        cls, 
        provider_id: str, 
        local_patient_id: str,
        consent_id: Optional[str] = None,
        principal: Optional[AuthenticatedPrincipal] = None
    ) -> List[LocalClinicalObservation]:
        """Secure adapter endpoint called by the middleware to fetch clinical data.
        
        Strict Non-Persistence Invariant:
        The provider remains the authoritative owner of the data. 
        Data is returned in-memory to the middleware pipeline for transport, 
        never persisted centrally.
        """
        norm_id = provider_id.strip().upper()

        # Authorization check:
        # Either caller is an authenticated staff member belonging to this provider,
        # or an authorizing ABDM consent in GRANTED state must be supplied.
        is_internal_staff = (
            principal is not None
            and principal.organization_id == norm_id
            and principal.has_role(AppRole.SYSTEM_ADMIN, AppRole.HOSPITAL_OPERATOR, AppRole.DATA_PROVIDER)
        )
        if not is_internal_staff:
            if not consent_id:
                raise PermissionError(f"Authorizing ABDM consent required to release patient records from {norm_id}.")
            consent = ConsentService.get_consent(consent_id)
            if not consent:
                raise PermissionError(f"Consent '{consent_id}' not found; record retrieval forbidden.")
            if consent.artefact.status != "GRANTED":
                raise PermissionError(f"Consent '{consent_id}' is in {consent.artefact.status} state, not GRANTED; record retrieval forbidden.")

        data = cls._read_provider_data(norm_id)
        records = [r for r in data.get("records", []) if r["local_patient_id"] == local_patient_id]

        AuditService.record_event(
            action="FEDERATED_RECORD_RETRIEVAL",
            resource_type="PROVIDER_ADAPTER",
            resource_id=local_patient_id,
            outcome="SUCCESS",
            actor_id=principal.user_id if principal else "MIDDLEWARE_ADAPTER",
            organization_id=norm_id,
        )
        return [LocalClinicalObservation(**r) for r in records]

    @classmethod
    def list_inbox(cls, provider_id: str) -> List[ProviderInboxItem]:
        """List exchanges delivered to this hospital by TN HealthBridge."""
        data = cls._read_provider_data(provider_id)
        return [ProviderInboxItem(**item) for item in data.get("inbox", [])]

    @classmethod
    def add_inbox_item(cls, provider_id: str, item: ProviderInboxItem):
        """Record an incoming delivery in the destination provider's local inbox."""
        norm_id = provider_id.strip().upper()
        data = cls._read_provider_data(norm_id)
        inbox = data.get("inbox", [])
        inbox.insert(0, item.model_dump())
        data["inbox"] = inbox
        cls._write_provider_data(norm_id, data)
