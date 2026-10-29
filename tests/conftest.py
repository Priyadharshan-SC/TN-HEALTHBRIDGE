"""Pytest configuration and test isolation fixtures for TN HealthBridge.

Ensures that automated tests run with required test fixtures while guaranteeing
that the live data directory remains in a clean zero-data state for manual
black-box testing.
"""
import copy
import json
import os
import shutil
import tempfile
import pytest

TEST_PATIENTS_FIXTURE = [
    {
        "universal_patient_id": "UPID-ARUN-001",
        "full_name": "Arun Kumar",
        "dob": "1985-06-15",
        "gender": "MALE",
        "abha_address": "arun.kumar@abdm",
        "phone_masked": "+91 98*** **210",
        "status": "ACTIVE",
        "created_at": "2026-01-10T09:00:00Z",
        "updated_at": "2026-01-10T09:00:00Z",
        "mappings": [
            {
                "mapping_id": "MAP-ARUN-001",
                "universal_patient_id": "UPID-ARUN-001",
                "provider_id": "HOSPITAL_A",
                "local_patient_id": "CH1-1042",
                "provider_name": "City Hospital 1",
                "verification_status": "VERIFIED",
                "mapping_method": "MANUAL_VERIFIED",
                "confidence_score": 1.0,
                "provenance": "Institutional registration",
                "created_at": "2026-01-10T09:00:00Z",
                "verified_at": "2026-01-10T09:00:00Z",
            },
            {
                "mapping_id": "MAP-ARUN-002",
                "universal_patient_id": "UPID-ARUN-001",
                "provider_id": "HOSPITAL_B",
                "local_patient_id": "MH-2098",
                "provider_name": "Metro Multi-Specialty Hospital",
                "verification_status": "VERIFIED",
                "mapping_method": "MANUAL_VERIFIED",
                "confidence_score": 1.0,
                "provenance": "Institutional registration",
                "created_at": "2026-02-15T11:30:00Z",
                "verified_at": "2026-02-15T11:30:00Z",
            },
            {
                "mapping_id": "MAP-ARUN-003",
                "universal_patient_id": "UPID-ARUN-001",
                "provider_id": "LAB_C",
                "local_patient_id": "CDL-9021",
                "provider_name": "Central Diagnostic Laboratory",
                "verification_status": "VERIFIED",
                "mapping_method": "MANUAL_VERIFIED",
                "confidence_score": 1.0,
                "provenance": "Institutional registration",
                "created_at": "2026-03-01T14:15:00Z",
                "verified_at": "2026-03-01T14:15:00Z",
            },
        ],
    },
    {
        "universal_patient_id": "UPID-MEENA-002",
        "full_name": "Meena Sundaram",
        "dob": "1990-11-22",
        "gender": "FEMALE",
        "abha_address": "meena.s@abdm",
        "phone_masked": "+91 98*** **211",
        "status": "ACTIVE",
        "created_at": "2026-01-20T10:00:00Z",
        "updated_at": "2026-01-20T10:00:00Z",
        "mappings": [
            {
                "mapping_id": "MAP-MEENA-001",
                "universal_patient_id": "UPID-MEENA-002",
                "provider_id": "HOSPITAL_B",
                "local_patient_id": "MH-3044",
                "provider_name": "Metro Multi-Specialty Hospital",
                "verification_status": "VERIFIED",
                "mapping_method": "MANUAL_VERIFIED",
                "confidence_score": 1.0,
                "provenance": "Institutional registration",
                "created_at": "2026-01-20T10:00:00Z",
                "verified_at": "2026-01-20T10:00:00Z",
            },
            {
                "mapping_id": "MAP-MEENA-002",
                "universal_patient_id": "UPID-MEENA-002",
                "provider_id": "HOSPITAL_D",
                "local_patient_id": "SAH-5501",
                "provider_name": "Sunrise Apex Specialty Hospital",
                "verification_status": "VERIFIED",
                "mapping_method": "MANUAL_VERIFIED",
                "confidence_score": 1.0,
                "provenance": "Institutional registration",
                "created_at": "2026-02-18T16:00:00Z",
                "verified_at": "2026-02-18T16:00:00Z",
            },
        ],
    },
    {
        "universal_patient_id": "UPID-KAVITHA-003",
        "full_name": "Kavitha Rajan",
        "dob": "1978-04-03",
        "gender": "FEMALE",
        "abha_address": "kavitha.r@abdm",
        "phone_masked": "+91 98*** **212",
        "status": "ACTIVE",
        "created_at": "2026-03-05T08:30:00Z",
        "updated_at": "2026-03-05T08:30:00Z",
        "mappings": [
            {
                "mapping_id": "MAP-KAV-001",
                "universal_patient_id": "UPID-KAVITHA-003",
                "provider_id": "CLINIC_F",
                "local_patient_id": "GV-108",
                "provider_name": "Green Valley Community Health Centre",
                "verification_status": "VERIFIED",
                "mapping_method": "MANUAL_VERIFIED",
                "confidence_score": 1.0,
                "provenance": "Institutional registration",
                "created_at": "2026-03-05T08:30:00Z",
                "verified_at": "2026-03-05T08:30:00Z",
            },
            {
                "mapping_id": "MAP-KAV-002",
                "universal_patient_id": "UPID-KAVITHA-003",
                "provider_id": "LAB_E",
                "local_patient_id": "EPL-772",
                "provider_name": "Elite Pathology & Molecular Labs",
                "verification_status": "VERIFIED",
                "mapping_method": "MANUAL_VERIFIED",
                "confidence_score": 1.0,
                "provenance": "Institutional registration",
                "created_at": "2026-03-12T12:00:00Z",
                "verified_at": "2026-03-12T12:00:00Z",
            },
        ],
    },
]

TEST_PROVIDER_DATA = {
    "HOSPITAL_A": {
        "name": "City Hospital 1 (Government General Hospital, Chennai)",
        "patients": [
            {"local_patient_id": "CH1-1042", "full_name": "Arun Kumar", "dob": "1985-06-15", "gender": "MALE", "phone": "+91 98765 43210", "created_at": "2026-01-10T09:00:00Z", "active": True}
        ],
        "records": [
            {
                "record_id": "REC-CH1-001",
                "local_patient_id": "CH1-1042",
                "category": "LABORATORY",
                "test_name": "Blood Glucose Fasting",
                "value": 110.0,
                "unit": "mg/dL",
                "specimen": "blood",
                "reference_range": "70 - 100 mg/dL",
                "interpretation": "Elevated",
                "effective_datetime": "2026-03-20T08:30:00Z",
                "attending_practitioner": "Dr. Senthil Nathan",
                "notes": "Patient reports 10 hr fasting.",
            }
        ],
        "inbox": []
    },
    "HOSPITAL_B": {
        "name": "Metro Multi-Specialty Hospital, Chennai",
        "patients": [
            {"local_patient_id": "MH-2098", "full_name": "Arun Kumar", "dob": "1985-06-15", "gender": "MALE", "phone": "+91 98765 43210", "created_at": "2026-02-15T11:30:00Z", "active": True},
            {"local_patient_id": "MH-3044", "full_name": "Meena Sundaram", "dob": "1990-11-22", "gender": "FEMALE", "phone": "+91 98765 43211", "created_at": "2026-01-20T10:00:00Z", "active": True}
        ],
        "records": [
            {
                "record_id": "REC-MH-001",
                "local_patient_id": "MH-2098",
                "category": "LABORATORY",
                "test_name": "Hemoglobin A1c",
                "value": 6.8,
                "unit": "%",
                "specimen": "blood",
                "reference_range": "< 5.7 %",
                "interpretation": "Pre-diabetic Range",
                "effective_datetime": "2026-03-21T09:15:00Z",
                "attending_practitioner": "Dr. Meenakshi Sundaram",
                "notes": "Follow-up test for glycation control.",
            }
        ],
        "inbox": []
    },
    "LAB_C": {
        "name": "Central Diagnostic Laboratory, Madurai",
        "patients": [
            {"local_patient_id": "CDL-9021", "full_name": "Arun Kumar", "dob": "1985-06-15", "gender": "MALE", "phone": "+91 98765 43210", "created_at": "2026-03-01T14:15:00Z", "active": True}
        ],
        "records": [],
        "inbox": []
    },
    "HOSPITAL_D": {
        "name": "Sunrise Apex Specialty Hospital, Coimbatore",
        "patients": [
            {"local_patient_id": "SAH-5501", "full_name": "Meena Sundaram", "dob": "1990-11-22", "gender": "FEMALE", "phone": "+91 98765 43211", "created_at": "2026-02-18T16:00:00Z", "active": True}
        ],
        "records": [],
        "inbox": []
    },
    "LAB_E": {
        "name": "Elite Pathology & Molecular Labs, Tiruchirappalli",
        "patients": [
            {"local_patient_id": "EPL-772", "full_name": "Kavitha Rajan", "dob": "1978-04-03", "gender": "FEMALE", "phone": "+91 98765 43212", "created_at": "2026-03-12T12:00:00Z", "active": True}
        ],
        "records": [],
        "inbox": []
    },
    "CLINIC_F": {
        "name": "Green Valley Community Health Centre, Salem",
        "patients": [
            {"local_patient_id": "GV-108", "full_name": "Kavitha Rajan", "dob": "1978-04-03", "gender": "FEMALE", "phone": "+91 98765 43212", "created_at": "2026-03-05T08:30:00Z", "active": True}
        ],
        "records": [],
        "inbox": []
    },
}

_BACKUP_DIR = None

def pytest_sessionstart(session):
    """Back up data directory and load test fixtures for the test run."""
    global _BACKUP_DIR
    data_dir = os.path.abspath("data")
    if os.path.exists(data_dir):
        _BACKUP_DIR = tempfile.mkdtemp(prefix="hb_data_backup_")
        for item in os.listdir(data_dir):
            s = os.path.join(data_dir, item)
            d = os.path.join(_BACKUP_DIR, item)
            if os.path.isdir(s):
                shutil.copytree(s, d)
            else:
                shutil.copy2(s, d)

    # Populate test patients
    os.makedirs(os.path.join(data_dir, "identity"), exist_ok=True)
    with open(os.path.join(data_dir, "identity", "universal_patient_mappings.json"), "w") as f:
        json.dump(TEST_PATIENTS_FIXTURE, f, indent=2)

    # Populate provider test directories
    for prov_id, prov_data in TEST_PROVIDER_DATA.items():
        prov_dir = os.path.join(data_dir, "providers", prov_id)
        os.makedirs(prov_dir, exist_ok=True)
        with open(os.path.join(prov_dir, "data.json"), "w") as f:
            json.dump(prov_data, f, indent=2)


def pytest_sessionfinish(session, exitstatus):
    """Restore clean zero-data state after test run."""
    global _BACKUP_DIR
    data_dir = os.path.abspath("data")
    if _BACKUP_DIR and os.path.exists(_BACKUP_DIR):
        if os.path.exists(data_dir):
            shutil.rmtree(data_dir)
        shutil.copytree(_BACKUP_DIR, data_dir)
        shutil.rmtree(_BACKUP_DIR, ignore_errors=True)
