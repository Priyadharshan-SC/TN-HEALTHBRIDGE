"""Comprehensive test suite for M3 Clinical Terminology Mapping Layer."""
import copy
import logging
import os
import uuid
from typing import Any, Dict, List, Optional

import pytest
from fastapi.testclient import TestClient

from app.core.config import get_settings
from app.core.errors import TerminologyConfigurationError
from app.core.terminology_config import (
    load_terminology_registry,
    validate_registry_entries,
)
from app.main import app
from app.schemas.normalization import (
    CanonicalLabRecord,
    NormalizationResponse,
    NormalizedRecord,
    QualityIssue,
)
from app.schemas.terminology import (
    MappingReasonCodes,
    TerminologyMappingEntry,
    TerminologyRegistry,
)
from app.services.terminology_service import TerminologyService

client = TestClient(app)
settings = get_settings()


def make_normalized_record(
    index: int = 0,
    patient_ref: str = "SYN001",
    test_name: Optional[str] = "Fasting Blood Glucose",
    result: Any = 95,
    unit: Optional[str] = "mg/dL",
    observed_at: Optional[str] = "2026-10-25T10:30:00+00:00",
    specimen: Optional[str] = "Serum",
    quality_status: str = "valid",
    quality_issues: Optional[List[Dict[str, Any]]] = None,
    original_fields: Optional[Dict[str, Any]] = None,
    unmapped_fields: Optional[Dict[str, Any]] = None,
) -> NormalizedRecord:
    """Helper to construct a NormalizedRecord instance."""
    issues = [QualityIssue(**q) for q in (quality_issues or [])]
    return NormalizedRecord(
        record_index=index,
        canonical_fields=CanonicalLabRecord(
            patient_reference=patient_ref,
            test_name=test_name,
            result=result,
            unit=unit,
            observed_at=observed_at,
            specimen=specimen,
        ),
        original_fields=original_fields or {
            "patient_id": patient_ref,
            "test_name": test_name,
            "result": result,
            "unit": unit,
        },
        unmapped_fields=unmapped_fields or {},
        quality_status=quality_status,
        quality_issues=issues,
    )


def make_normalization_envelope(
    provider_id: str = "HOSPITAL_A",
    records: Optional[List[NormalizedRecord]] = None,
) -> Dict[str, Any]:
    """Helper to construct a valid NormalizationResponse dictionary."""
    if records is None:
        records = [make_normalized_record()]

    valid_c = sum(1 for r in records if r.quality_status == "valid")
    warn_c = sum(1 for r in records if r.quality_status == "warning")
    rej_c = sum(1 for r in records if r.quality_status == "rejected")

    return {
        "normalization_id": str(uuid.uuid4()),
        "ingestion_id": str(uuid.uuid4()),
        "source_provider_id": provider_id,
        "status": "completed",
        "record_count": len(records),
        "valid_count": valid_c,
        "warning_count": warn_c,
        "rejected_count": rej_c,
        "records": [r.model_dump() for r in records],
    }


# ==============================================================================
# 1. Unique Exact Mapping & Alias Mapping
# ==============================================================================

def test_unique_exact_mapping():
    """Verify unique exact matching against verified standard concept."""
    rec = make_normalized_record(
        test_name="Fasting Blood Glucose",
        unit="mg/dL",
        specimen="Serum",
    )
    envelope = make_normalization_envelope("HOSPITAL_A", [rec])
    response = client.post("/api/v1/terminology/map", json=envelope)
    assert response.status_code == 200
    data = response.json()

    assert data["status"] == "completed"
    assert data["record_count"] == 1
    assert data["mapped_count"] == 1
    assert data["unmapped_count"] == 0
    assert data["ambiguous_count"] == 0
    assert data["review_required_count"] == 0
    assert "registry_version" in data

    r0 = data["records"][0]
    mapping = r0["terminology_mapping"]
    assert mapping["mapping_status"] == "mapped"
    assert mapping["target_system"] == "http://loinc.org"
    assert mapping["target_code"] == "1558-6"
    assert mapping["target_display"] == "Fasting glucose [Mass/volume] in Serum or Plasma"
    assert mapping["reason_code"] == MappingReasonCodes.EXACT_MATCH
    assert mapping["review_required"] is False
    assert len(mapping["candidate_mappings"]) == 1


def test_explicitly_configured_alias_mapping():
    """Verify configured aliases successfully resolve to the target concept."""
    rec = make_normalized_record(
        test_name="HbA1c",
        unit="%",
        specimen="Whole Blood",
    )
    envelope = make_normalization_envelope("HOSPITAL_A", [rec])
    response = client.post("/api/v1/terminology/map", json=envelope)
    assert response.status_code == 200
    data = response.json()

    assert data["mapped_count"] == 1
    mapping = data["records"][0]["terminology_mapping"]
    assert mapping["mapping_status"] == "mapped"
    assert mapping["target_system"] == "http://loinc.org"
    assert mapping["target_code"] == "4548-4"
    assert mapping["reason_code"] == MappingReasonCodes.ALIAS_MATCH
    assert mapping["review_required"] is False


# ==============================================================================
# 2. Unmapped Test Name & No Fuzzy Match Equivalence
# ==============================================================================

def test_unmapped_test_name():
    """Verify unknown test names return unmapped status without arbitrary code assignment."""
    rec = make_normalized_record(test_name="Novel Unknown Oncology Panel XYZ")
    envelope = make_normalization_envelope("HOSPITAL_A", [rec])
    response = client.post("/api/v1/terminology/map", json=envelope)
    assert response.status_code == 200
    data = response.json()

    assert data["record_count"] == 1
    assert data["unmapped_count"] == 1
    assert data["mapped_count"] == 0

    mapping = data["records"][0]["terminology_mapping"]
    assert mapping["mapping_status"] == "unmapped"
    assert mapping["target_system"] is None
    assert mapping["target_code"] is None
    assert mapping["target_display"] is None
    assert mapping["reason_code"] == MappingReasonCodes.NO_MAPPING_FOUND
    assert mapping["review_required"] is False


def test_similar_looking_test_names_not_automatically_equated():
    """Verify fuzzy similarity is rejected: 'Glucose' must not equate to 'Fasting Blood Glucose'."""
    similar_names = [
        "Glucose",
        "Blood Glucose",
        "Random Glucose",
        "Urine Glucose",
        "Postprandial Blood Glucose",
    ]
    records = [
        make_normalized_record(index=i, test_name=name)
        for i, name in enumerate(similar_names)
    ]
    envelope = make_normalization_envelope("HOSPITAL_A", records)
    response = client.post("/api/v1/terminology/map", json=envelope)
    assert response.status_code == 200
    data = response.json()

    assert data["record_count"] == len(similar_names)
    assert data["unmapped_count"] == len(similar_names)
    assert data["mapped_count"] == 0

    for r in data["records"]:
        m = r["terminology_mapping"]
        assert m["mapping_status"] == "unmapped"
        assert m["target_code"] is None
        assert m["reason_code"] == MappingReasonCodes.NO_MAPPING_FOUND


# ==============================================================================
# 3. Ambiguous Candidate Outcome
# ==============================================================================

def test_multiple_candidate_mappings_produce_ambiguous_outcome():
    """Verify test name matching multiple candidates returns ambiguous without target assignment."""
    rec = make_normalized_record(
        test_name="Synthetic Ambiguous Marker",
        unit="mg/dL",
        specimen="Serum",
    )
    envelope = make_normalization_envelope("HOSPITAL_A", [rec])
    response = client.post("/api/v1/terminology/map", json=envelope)
    assert response.status_code == 200
    data = response.json()

    assert data["ambiguous_count"] == 1
    assert data["mapped_count"] == 0

    mapping = data["records"][0]["terminology_mapping"]
    assert mapping["mapping_status"] == "ambiguous"
    # Ambiguous candidate must NEVER return an arbitrarily selected target code!
    assert mapping["target_system"] is None
    assert mapping["target_code"] is None
    assert mapping["target_display"] is None
    assert mapping["reason_code"] == MappingReasonCodes.MULTIPLE_CANDIDATE_MAPPINGS
    assert mapping["review_required"] is True
    assert len(mapping["candidate_mappings"]) == 2
    codes = {c["target_code"] for c in mapping["candidate_mappings"]}
    assert "SYNTHETIC:LAB:101" in codes
    assert "SYNTHETIC:LAB:102" in codes


# ==============================================================================
# 4. Contextual Constraint Conflicts (Specimen & Unit)
# ==============================================================================

def test_specimen_constraint_conflict():
    """Verify specimen conflict routes to review_required without forcing mapping."""
    rec = make_normalized_record(
        test_name="Synthetic Serum Only Protein",
        unit="g/dL",
        specimen="Urine",  # Conflicts with allowed "Serum"
    )
    envelope = make_normalization_envelope("HOSPITAL_A", [rec])
    response = client.post("/api/v1/terminology/map", json=envelope)
    assert response.status_code == 200
    data = response.json()

    assert data["review_required_count"] == 1
    assert data["mapped_count"] == 0

    mapping = data["records"][0]["terminology_mapping"]
    assert mapping["mapping_status"] == "review_required"
    assert mapping["target_code"] is None
    assert mapping["reason_code"] == MappingReasonCodes.SPECIMEN_MISMATCH
    assert mapping["review_required"] is True
    assert len(mapping["candidate_mappings"]) == 1


def test_unit_constraint_conflict():
    """Verify unit conflict routes to review_required without forcing mapping."""
    rec = make_normalized_record(
        test_name="Synthetic Milligram Analyte",
        unit="mmol/L",  # Conflicts with allowed "mg/dL"
        specimen="Serum",
    )
    envelope = make_normalization_envelope("HOSPITAL_A", [rec])
    response = client.post("/api/v1/terminology/map", json=envelope)
    assert response.status_code == 200
    data = response.json()

    assert data["review_required_count"] == 1
    assert data["mapped_count"] == 0

    mapping = data["records"][0]["terminology_mapping"]
    assert mapping["mapping_status"] == "review_required"
    assert mapping["target_code"] is None
    assert mapping["reason_code"] == MappingReasonCodes.UNIT_MISMATCH
    assert mapping["review_required"] is True


def test_missing_optional_specimen_and_unit_when_not_required():
    """Verify missing optional specimen/unit maps safely without fabricating values."""
    rec = make_normalized_record(
        test_name="Synthetic Glucose Tolerance",
        unit=None,      # Not required
        specimen=None,  # Not required
    )
    envelope = make_normalization_envelope("HOSPITAL_A", [rec])
    response = client.post("/api/v1/terminology/map", json=envelope)
    assert response.status_code == 200
    data = response.json()

    assert data["mapped_count"] == 1
    r0 = data["records"][0]
    assert r0["terminology_mapping"]["mapping_status"] == "mapped"
    assert r0["terminology_mapping"]["target_code"] == "SYNTHETIC:LAB:001"
    # Verify values were NOT fabricated in canonical fields
    assert r0["canonical_fields"]["specimen"] is None
    assert r0["canonical_fields"]["unit"] is None


def test_missing_required_specimen_context_routes_to_review():
    """Verify missing specimen triggers MISSING_REQUIRED_SPECIMEN when require_specimen is True."""
    rec = make_normalized_record(
        test_name="Synthetic Strict Specimen Test",
        unit="mg/dL",
        specimen=None,  # Mapping strictly requires specimen
    )
    envelope = make_normalization_envelope("HOSPITAL_A", [rec])
    response = client.post("/api/v1/terminology/map", json=envelope)
    assert response.status_code == 200
    data = response.json()

    assert data["review_required_count"] == 1
    mapping = data["records"][0]["terminology_mapping"]
    assert mapping["mapping_status"] == "review_required"
    assert mapping["target_code"] is None
    assert mapping["reason_code"] == MappingReasonCodes.MISSING_REQUIRED_SPECIMEN
    assert mapping["review_required"] is True


def test_missing_required_unit_context_routes_to_review():
    """Verify missing unit triggers MISSING_REQUIRED_UNIT when require_unit is True."""
    rec = make_normalized_record(
        test_name="Synthetic Strict Unit Test",
        unit=None,  # Mapping strictly requires unit
        specimen="Serum",
    )
    envelope = make_normalization_envelope("HOSPITAL_A", [rec])
    response = client.post("/api/v1/terminology/map", json=envelope)
    assert response.status_code == 200
    data = response.json()

    assert data["review_required_count"] == 1
    mapping = data["records"][0]["terminology_mapping"]
    assert mapping["mapping_status"] == "review_required"
    assert mapping["target_code"] is None
    assert mapping["reason_code"] == MappingReasonCodes.MISSING_REQUIRED_UNIT
    assert mapping["review_required"] is True


# ==============================================================================
# 5. Provider Scoping & Explicit Human Review Flag
# ==============================================================================

def test_provider_scoped_mapping():
    """Verify provider-specific mapping matches for designated provider but not other providers."""
    rec = make_normalized_record(test_name="Local Hospital Test")

    # 1. Matches for HOSPITAL_A
    env_a = make_normalization_envelope("HOSPITAL_A", [rec])
    resp_a = client.post("/api/v1/terminology/map", json=env_a)
    assert resp_a.status_code == 200
    data_a = resp_a.json()
    assert data_a["mapped_count"] == 1
    assert data_a["records"][0]["terminology_mapping"]["target_code"] == "SYNTHETIC:LAB:601"

    # 2. Unmapped for HOSPITAL_B
    env_b = make_normalization_envelope("HOSPITAL_B", [rec])
    resp_b = client.post("/api/v1/terminology/map", json=env_b)
    assert resp_b.status_code == 200
    data_b = resp_b.json()
    assert data_b["unmapped_count"] == 1
    assert data_b["records"][0]["terminology_mapping"]["target_code"] is None


def test_explicit_human_review_flag():
    """Verify entry with human_review_required=True forces review_required even on exact match."""
    rec = make_normalized_record(test_name="Experimental Research Assay")
    envelope = make_normalization_envelope("HOSPITAL_A", [rec])
    response = client.post("/api/v1/terminology/map", json=envelope)
    assert response.status_code == 200
    data = response.json()

    assert data["review_required_count"] == 1
    mapping = data["records"][0]["terminology_mapping"]
    assert mapping["mapping_status"] == "review_required"
    assert mapping["target_code"] is None
    assert mapping["reason_code"] == MappingReasonCodes.EXPLICIT_REVIEW_FLAG
    assert mapping["review_required"] is True


# ==============================================================================
# 6. Mixed Batch & Count Reconciliation
# ==============================================================================

def test_mixed_batch_processing_and_count_reconciliation():
    """Verify a batch containing mapped, unmapped, ambiguous, and review records processes independently."""
    records = [
        # Record 0: Mapped (Fasting Blood Glucose)
        make_normalized_record(0, "P001", "Fasting Blood Glucose", 95, "mg/dL", specimen="Serum"),
        # Record 1: Unmapped (Unknown Marker)
        make_normalized_record(1, "P002", "Unknown Marker XYZ", 10, "mg/dL"),
        # Record 2: Ambiguous (Synthetic Ambiguous Marker)
        make_normalized_record(2, "P003", "Synthetic Ambiguous Marker", 50, "mg/dL"),
        # Record 3: Review Required (Specimen Mismatch)
        make_normalized_record(3, "P004", "Synthetic Serum Only Protein", 6.5, "g/dL", specimen="Urine"),
        # Record 4: Mapped via Alias (HbA1c)
        make_normalized_record(4, "P005", "HbA1c", 5.8, "%", specimen="Whole Blood"),
    ]
    envelope = make_normalization_envelope("HOSPITAL_A", records)
    response = client.post("/api/v1/terminology/map", json=envelope)
    assert response.status_code == 200
    data = response.json()

    assert data["record_count"] == 5
    assert data["mapped_count"] == 2
    assert data["unmapped_count"] == 1
    assert data["ambiguous_count"] == 1
    assert data["review_required_count"] == 1
    assert (
        data["mapped_count"]
        + data["unmapped_count"]
        + data["ambiguous_count"]
        + data["review_required_count"]
        == data["record_count"]
    )
    assert len(data["records"]) == 5

    # Check order and statuses
    assert data["records"][0]["terminology_mapping"]["mapping_status"] == "mapped"
    assert data["records"][1]["terminology_mapping"]["mapping_status"] == "unmapped"
    assert data["records"][2]["terminology_mapping"]["mapping_status"] == "ambiguous"
    assert data["records"][3]["terminology_mapping"]["mapping_status"] == "review_required"
    assert data["records"][4]["terminology_mapping"]["mapping_status"] == "mapped"


# ==============================================================================
# 7. Data Preservation & Zero Mutation
# ==============================================================================

def test_preservation_of_all_source_and_normalized_fields():
    """Verify M3 preserves canonical fields, original fields, unmapped fields, and quality issues."""
    rec = make_normalized_record(
        index=0,
        patient_ref="PATIENT_SECRET_999",
        test_name="Fasting Blood Glucose",
        result=105,
        unit="mg/dL",
        observed_at="2026-10-25T14:30:00+00:00",
        specimen="Serum",
        quality_status="warning",
        quality_issues=[{"code": "AMBIGUOUS_TIMESTAMP", "severity": "warning", "message": "Notice"}],
        original_fields={"patient_id": "PATIENT_SECRET_999", "custom_flag": "VAL_123"},
        unmapped_fields={"custom_flag": "VAL_123"},
    )
    envelope = make_normalization_envelope("HOSPITAL_A", [rec])
    response = client.post("/api/v1/terminology/map", json=envelope)
    assert response.status_code == 200
    data = response.json()

    r0 = data["records"][0]
    # Check canonical fields preserved
    assert r0["canonical_fields"]["patient_reference"] == "PATIENT_SECRET_999"
    assert r0["canonical_fields"]["test_name"] == "Fasting Blood Glucose"  # NOT overwritten with target display!
    assert r0["canonical_fields"]["result"] == 105
    assert r0["canonical_fields"]["unit"] == "mg/dL"
    assert r0["canonical_fields"]["observed_at"] == "2026-10-25T14:30:00+00:00"
    assert r0["canonical_fields"]["specimen"] == "Serum"

    # Check original and unmapped fields preserved
    assert r0["original_fields"]["custom_flag"] == "VAL_123"
    assert r0["unmapped_fields"]["custom_flag"] == "VAL_123"

    # Check quality status and issues preserved
    assert r0["quality_status"] == "warning"
    assert len(r0["quality_issues"]) == 1
    assert r0["quality_issues"][0]["code"] == "AMBIGUOUS_TIMESTAMP"

    # Check mapping result cleanly separated
    assert r0["terminology_mapping"]["target_code"] == "1558-6"


def test_missing_test_name_handled_safely():
    """Verify records with missing test_name (e.g. rejected in M2) are handled gracefully."""
    rec = make_normalized_record(
        test_name=None,
        quality_status="rejected",
        quality_issues=[{"code": "MISSING_REQUIRED_TEST_NAME", "severity": "rejected", "message": "Missing"}],
    )
    envelope = make_normalization_envelope("HOSPITAL_A", [rec])
    response = client.post("/api/v1/terminology/map", json=envelope)
    assert response.status_code == 200
    data = response.json()

    assert data["unmapped_count"] == 1
    r0 = data["records"][0]
    assert r0["quality_status"] == "rejected"
    assert r0["terminology_mapping"]["mapping_status"] == "unmapped"
    assert r0["terminology_mapping"]["reason_code"] == MappingReasonCodes.MISSING_SOURCE_TEST_NAME


# ==============================================================================
# 8. Registry Validation & Integrity Tests
# ==============================================================================

def test_registry_duplicate_mapping_ids_rejected():
    """Verify validate_registry_entries detects and rejects duplicate mapping IDs."""
    entries = [
        TerminologyMappingEntry(
            mapping_id="DUP-001",
            source_test_name="Glucose",
            target_system="http://loinc.org",
            target_code="1558-6",
            target_display="Glucose",
        ),
        TerminologyMappingEntry(
            mapping_id="DUP-001",  # Duplicate ID
            source_test_name="Other Test",
            target_system="http://loinc.org",
            target_code="9999-9",
            target_display="Other Test",
        ),
    ]
    with pytest.raises(TerminologyConfigurationError, match="Duplicate mapping identifier"):
        validate_registry_entries(entries)


def test_registry_invalid_target_configuration_rejected():
    """Verify validate_registry_entries rejects missing or blank target systems and codes."""
    entries = [
        TerminologyMappingEntry(
            mapping_id="INV-001",
            source_test_name="Glucose",
            target_system="",  # Blank target system
            target_code="1558-6",
            target_display="Glucose",
        ),
    ]
    with pytest.raises(TerminologyConfigurationError, match="invalid or missing target_system"):
        validate_registry_entries(entries)


def test_registry_strict_conflicting_mappings_detection():
    """Verify strict validation detects conflicting active mappings for identical test names."""
    entries = [
        TerminologyMappingEntry(
            mapping_id="CONF-001",
            source_test_name="Glucose",
            target_system="http://loinc.org",
            target_code="1558-6",
            target_display="Glucose",
        ),
        TerminologyMappingEntry(
            mapping_id="CONF-002",
            source_test_name="Glucose",
            target_system="http://loinc.org",
            target_code="2345-7",  # Conflicting target code under same scope
            target_display="Glucose Different",
        ),
    ]
    with pytest.raises(TerminologyConfigurationError, match="Conflicting configured mappings"):
        validate_registry_entries(entries, strict_no_conflicts=True)


# ==============================================================================
# 9. Request Envelope Validation & Batch Limits
# ==============================================================================

def test_empty_batch_rejected():
    """Verify empty terminology batch returns HTTP 400 EMPTY_PAYLOAD."""
    envelope = make_normalization_envelope("HOSPITAL_A", [])
    response = client.post("/api/v1/terminology/map", json=envelope)
    assert response.status_code == 400
    data = response.json()
    assert data["error_code"] == "EMPTY_PAYLOAD"


def test_mismatched_record_count_rejected():
    """Verify envelope record_count mismatch returns HTTP 400 INVALID_TERMINOLOGY_REQUEST."""
    envelope = make_normalization_envelope("HOSPITAL_A", [make_normalized_record()])
    envelope["record_count"] = 999  # Mismatch actual count (1)
    response = client.post("/api/v1/terminology/map", json=envelope)
    assert response.status_code == 400
    data = response.json()
    assert data["error_code"] == "INVALID_TERMINOLOGY_REQUEST"


def test_batch_size_limit_enforced():
    """Verify batch exceeding MAX_TERMINOLOGY_RECORD_COUNT is rejected with RECORD_LIMIT_EXCEEDED."""
    limit = settings.MAX_TERMINOLOGY_RECORD_COUNT
    oversized = [make_normalized_record(i) for i in range(limit + 1)]
    envelope = make_normalization_envelope("HOSPITAL_A", oversized)
    response = client.post("/api/v1/terminology/map", json=envelope)
    assert response.status_code == 400
    data = response.json()
    assert data["error_code"] == "RECORD_LIMIT_EXCEEDED"


# ==============================================================================
# 10. Privacy & Architectural Safeguards
# ==============================================================================

def test_no_clinical_database_or_disk_persistence():
    """Verify M3 creates zero database or persistence files on disk."""
    rec = make_normalized_record(test_name="Fasting Blood Glucose")
    envelope = make_normalization_envelope("HOSPITAL_A", [rec])
    response = client.post("/api/v1/terminology/map", json=envelope)
    assert response.status_code == 200

    # Ensure no database files were created anywhere in workspace
    for root, _, files in os.walk("."):
        if ".venv" in root or ".git" in root or ".pytest_cache" in root:
            continue
        for file in files:
            assert not file.endswith((".db", ".sqlite", ".sqlite3", ".parquet", ".duckdb")), (
                f"Disallowed persistence file found: {file}"
            )


def test_privacy_safe_logging(caplog):
    """Verify logger output contains operational telemetry and zero patient/clinical values."""
    sensitive_patient = "CONFIDENTIAL_PATIENT_XYZ_888"
    sensitive_test = "CONFIDENTIAL_TEST_NAME_999"

    rec = make_normalized_record(
        patient_ref=sensitive_patient,
        test_name=sensitive_test,
    )
    envelope = make_normalization_envelope("HOSPITAL_A", [rec])

    with caplog.at_level(logging.INFO):
        response = client.post("/api/v1/terminology/map", json=envelope)
        assert response.status_code == 200

    log_text = caplog.text
    # Ensure sensitive patient ID and test name are NOT in application logs
    assert sensitive_patient not in log_text
    assert sensitive_test not in log_text
    # Operational telemetry should be present
    assert "Batch terminology mapped" in log_text


# ==============================================================================
# 11. End-to-End Pipeline: Ingestion (M1) -> Normalization (M2) -> Terminology (M3)
# ==============================================================================

def test_end_to_end_m1_m2_m3_pipeline():
    """Verify complete interoperability pipeline: CSV upload -> M1 -> M2 -> M3."""
    csv_content = (
        "patient_id,test_name,result,unit,test_datetime,specimen\n"
        "SYN001,Fasting Blood Glucose,95,mg/dL,2026-10-25T10:30:00Z,Serum\n"
        "SYN002,Hemoglobin A1c,5.7,%,2026-10-25T11:00:00Z,Whole Blood\n"
        "SYN003,Serum Creatinine,0.9,mg/dL,2026-10-25T11:30:00Z,Serum\n"
    )

    # 1. M1 Ingestion
    m1_resp = client.post(
        "/api/v1/ingestion/csv",
        files={"file": ("hospital_a.csv", csv_content.encode("utf-8"), "text/csv")},
        headers={"X-Provider-ID": "HOSPITAL_A"},
    )
    assert m1_resp.status_code == 200

    m1_data = m1_resp.json()
    assert m1_data["record_count"] == 3

    # 2. M2 Normalization
    m2_resp = client.post("/api/v1/normalization/process", json=m1_data)
    assert m2_resp.status_code == 200
    m2_data = m2_resp.json()
    assert m2_data["valid_count"] == 3

    # 3. M3 Terminology Mapping
    m3_resp = client.post("/api/v1/terminology/map", json=m2_data)
    assert m3_resp.status_code == 200
    m3_data = m3_resp.json()

    assert m3_data["record_count"] == 3
    assert m3_data["mapped_count"] == 3
    assert m3_data["unmapped_count"] == 0
    assert m3_data["ambiguous_count"] == 0
    assert m3_data["review_required_count"] == 0

    codes = [r["terminology_mapping"]["target_code"] for r in m3_data["records"]]
    assert codes == ["1558-6", "4548-4", "2160-0"]
    # Verify correlation IDs inherited through pipeline
    assert m3_data["normalization_id"] == m2_data["normalization_id"]
    assert m3_data["ingestion_id"] == m1_data["ingestion_id"]
    assert m3_data["source_provider_id"] == "HOSPITAL_A"


def test_end_to_end_hospital_b_json_pipeline():
    """Verify complete interoperability pipeline for Hospital B JSON data."""
    json_payload = {
        "source_provider_id": "HOSPITAL_B",
        "records": [
            {
                "patient_reference": "SYN001",
                "investigation": "Fasting Blood Glucose",
                "value": 95,
                "measurement_unit": "mg/dL",
                "observed_at": "2026-10-25 10:30:00",
                "specimen": "Serum",
            },
            {
                "patient_reference": "SYN002",
                "investigation": "Platelet Count",
                "value": 250000,
                "measurement_unit": "/uL",
                "observed_at": "2026-10-25 11:00:00",
                "specimen": "Blood",
            },
        ],
    }

    # 1. M1 Ingestion
    m1_resp = client.post("/api/v1/ingestion/json", json=json_payload)
    assert m1_resp.status_code == 200
    m1_data = m1_resp.json()

    # 2. M2 Normalization
    m2_resp = client.post("/api/v1/normalization/process", json=m1_data)
    assert m2_resp.status_code == 200
    m2_data = m2_resp.json()

    # 3. M3 Terminology Mapping
    m3_resp = client.post("/api/v1/terminology/map", json=m2_data)
    assert m3_resp.status_code == 200
    m3_data = m3_resp.json()

    assert m3_data["record_count"] == 2
    assert m3_data["mapped_count"] == 2
    assert m3_data["records"][0]["terminology_mapping"]["target_code"] == "1558-6"
    assert m3_data["records"][1]["terminology_mapping"]["target_code"] == "777-3"


def test_contextual_disambiguation_between_multiple_candidates():
    """Verify specimen constraint can disambiguate between multiple candidate mappings."""
    entries = [
        TerminologyMappingEntry(
            mapping_id="DUAL-SPEC-SERUM",
            source_test_name="Synthetic Dual Specimen Protein",
            target_system="http://tnhealthbridge.local/terminology/synthetic",
            target_code="SYNTHETIC:SERUM:001",
            target_display="Synthetic Protein in Serum",
            specimen_constraints=["Serum"],
        ),
        TerminologyMappingEntry(
            mapping_id="DUAL-SPEC-URINE",
            source_test_name="Synthetic Dual Specimen Protein",
            target_system="http://tnhealthbridge.local/terminology/synthetic",
            target_code="SYNTHETIC:URINE:002",
            target_display="Synthetic Protein in Urine",
            specimen_constraints=["Urine"],
        ),
    ]
    custom_registry = TerminologyRegistry(
        registry_version="TEST-DISAMBIG-1.0",
        description="Disambiguation Test Registry",
        last_updated="2026-10-25T12:00:00Z",
        mappings=entries,
    )

    # Record with specimen="Serum" -> uniquely matches DUAL-SPEC-SERUM
    rec_serum = make_normalized_record(
        test_name="Synthetic Dual Specimen Protein",
        specimen="Serum",
    )
    result_serum = TerminologyService.map_record(
        record=rec_serum,
        provider_id="HOSPITAL_A",
        registry=custom_registry,
    )
    assert result_serum.mapping_status == "mapped"
    assert result_serum.target_code == "SYNTHETIC:SERUM:001"

    # Record with specimen="Urine" -> uniquely matches DUAL-SPEC-URINE
    rec_urine = make_normalized_record(
        test_name="Synthetic Dual Specimen Protein",
        specimen="Urine",
    )
    result_urine = TerminologyService.map_record(
        record=rec_urine,
        provider_id="HOSPITAL_A",
        registry=custom_registry,
    )
    assert result_urine.mapping_status == "mapped"
    assert result_urine.target_code == "SYNTHETIC:URINE:002"

    # Record with missing specimen -> both remain plausible -> ambiguous!
    rec_none = make_normalized_record(
        test_name="Synthetic Dual Specimen Protein",
        specimen=None,
    )
    result_none = TerminologyService.map_record(
        record=rec_none,
        provider_id="HOSPITAL_A",
        registry=custom_registry,
    )
    assert result_none.mapping_status == "ambiguous"
    assert result_none.target_code is None
    assert len(result_none.candidate_mappings) == 2


def test_envelope_missing_identifiers_rejected():
    """Verify missing normalization_id or source_provider_id in envelope is rejected."""
    # 1. Missing normalization_id
    env1 = make_normalization_envelope("HOSPITAL_A")
    env1["normalization_id"] = "   "
    resp1 = client.post("/api/v1/terminology/map", json=env1)
    assert resp1.status_code == 400
    assert resp1.json()["error_code"] == "INVALID_TERMINOLOGY_REQUEST"

    # 2. Missing source_provider_id
    env2 = make_normalization_envelope("HOSPITAL_A")
    env2["source_provider_id"] = ""
    resp2 = client.post("/api/v1/terminology/map", json=env2)
    assert resp2.status_code == 400
    assert resp2.json()["error_code"] == "INVALID_TERMINOLOGY_REQUEST"


def test_registry_file_loader_exceptions(tmp_path):
    """Verify load_terminology_registry handles missing files and corrupted JSON."""
    # 1. Nonexistent file
    with pytest.raises(TerminologyConfigurationError, match="Terminology registry file not found"):
        load_terminology_registry(str(tmp_path / "nonexistent.json"))

    # 2. Corrupted JSON file
    bad_json = tmp_path / "bad.json"
    bad_json.write_text("{ corrupt json ", encoding="utf-8")
    with pytest.raises(TerminologyConfigurationError, match="Failed to parse terminology registry JSON"):
        load_terminology_registry(str(bad_json))

    # 3. Invalid schema JSON file
    bad_schema = tmp_path / "bad_schema.json"
    bad_schema.write_text('{"registry_version": "1.0", "description": "missing fields"}', encoding="utf-8")
    with pytest.raises(TerminologyConfigurationError, match="Registry schema validation failed"):
        load_terminology_registry(str(bad_schema))


# ==============================================================================
# 12. M3 Final Audit Remediation Regression Tests
# ==============================================================================

def test_default_registry_loinc_entries_have_strictly_compatible_units():
    """Verify official LOINC concepts in default registry restrict units to exact measurement properties."""
    registry = load_terminology_registry()
    mapping_dict = {m.mapping_id: m for m in registry.mappings}

    # LOINC 1558-6: Fasting glucose [Mass/volume] -> only mass concentration (mg/dL)
    m1 = mapping_dict["MAP-LOINC-001"]
    assert m1.target_code == "1558-6"
    assert m1.unit_constraints == ["mg/dL"]
    assert "mmol/L" not in m1.unit_constraints

    # LOINC 4548-4: Hemoglobin A1c/Hemoglobin.total in Blood -> only NGSP mass ratio (%)
    m2 = mapping_dict["MAP-LOINC-002"]
    assert m2.target_code == "4548-4"
    assert m2.unit_constraints == ["%"]
    assert "mmol/mol" not in m2.unit_constraints

    # LOINC 2160-0: Creatinine [Mass/volume] in Serum or Plasma -> only mass concentration (mg/dL)
    m3 = mapping_dict["MAP-LOINC-003"]
    assert m3.target_code == "2160-0"
    assert m3.unit_constraints == ["mg/dL"]
    assert "umol/L" not in m3.unit_constraints

    # LOINC 2093-3: Cholesterol [Mass/volume] in Serum or Plasma -> only mass concentration (mg/dL)
    m4 = mapping_dict["MAP-LOINC-004"]
    assert m4.target_code == "2093-3"
    assert m4.unit_constraints == ["mg/dL"]
    assert "mmol/L" not in m4.unit_constraints

    # LOINC 777-3: Platelets [#/volume] in Blood -> number concentration units
    m5 = mapping_dict["MAP-LOINC-005"]
    assert m5.target_code == "777-3"
    assert m5.unit_constraints == ["/uL", "10*3/uL", "K/uL", "x10^9/L"]


def test_incompatible_measurement_property_units_rejected_from_confident_mapping():
    """Verify substance-concentration and incompatible protocol units cannot produce a confident mapping."""
    # 1. Fasting Blood Glucose with molar concentration mmol/L (incompatible with LOINC 1558-6 Mass/vol)
    rec_glu = make_normalized_record(
        test_name="Fasting Blood Glucose",
        unit="mmol/L",
        specimen="Serum",
    )
    env_glu = make_normalization_envelope("HOSPITAL_A", [rec_glu])
    resp_glu = client.post("/api/v1/terminology/map", json=env_glu)
    assert resp_glu.status_code == 200
    data_glu = resp_glu.json()
    assert data_glu["mapped_count"] == 0
    assert data_glu["review_required_count"] == 1
    m_glu = data_glu["records"][0]["terminology_mapping"]
    assert m_glu["mapping_status"] == "review_required"
    assert m_glu["target_code"] is None
    assert m_glu["reason_code"] == MappingReasonCodes.UNIT_MISMATCH

    # 2. Serum Creatinine with substance concentration umol/L (incompatible with LOINC 2160-0 Mass/vol)
    rec_cr = make_normalized_record(
        test_name="Serum Creatinine",
        unit="umol/L",
        specimen="Serum",
    )
    env_cr = make_normalization_envelope("HOSPITAL_A", [rec_cr])
    resp_cr = client.post("/api/v1/terminology/map", json=env_cr)
    assert resp_cr.status_code == 200
    data_cr = resp_cr.json()
    assert data_cr["mapped_count"] == 0
    assert data_cr["review_required_count"] == 1
    m_cr = data_cr["records"][0]["terminology_mapping"]
    assert m_cr["mapping_status"] == "review_required"
    assert m_cr["target_code"] is None
    assert m_cr["reason_code"] == MappingReasonCodes.UNIT_MISMATCH


def test_m2_rejected_record_with_known_test_name_withheld_from_mapping():
    """Verify an M2-rejected record with a known test name is NOT represented as usable mapped clinical record."""
    rec = make_normalized_record(
        index=0,
        patient_ref=None,
        test_name="Fasting Blood Glucose",
        result=95,
        unit="mg/dL",
        specimen="Serum",
        quality_status="rejected",
        quality_issues=[{
            "code": "MISSING_REQUIRED_PATIENT_REF",
            "severity": "rejected",
            "message": "Missing required patient reference.",
            "field": "patient_reference",
        }],
    )
    envelope = make_normalization_envelope("HOSPITAL_A", [rec])
    response = client.post("/api/v1/terminology/map", json=envelope)
    assert response.status_code == 200
    data = response.json()

    assert data["mapped_count"] == 0
    assert data["review_required_count"] == 1
    assert data["unmapped_count"] == 0

    r0 = data["records"][0]
    # M2 quality assessment must be preserved
    assert r0["quality_status"] == "rejected"
    assert len(r0["quality_issues"]) == 1
    assert r0["quality_issues"][0]["code"] == "MISSING_REQUIRED_PATIENT_REF"

    # Terminology mapping must withhold concept assignment
    tm = r0["terminology_mapping"]
    assert tm["mapping_status"] == "review_required"
    assert tm["target_system"] is None
    assert tm["target_code"] is None
    assert tm["target_display"] is None
    assert tm["reason_code"] == MappingReasonCodes.UPSTREAM_QUALITY_REJECTION
    assert tm["review_required"] is True
    # Candidate reference is documented for the human reviewer
    assert len(tm["candidate_mappings"]) == 1
    assert tm["candidate_mappings"][0]["target_code"] == "1558-6"


def test_m2_rejected_record_with_unknown_test_name_returns_unmapped():
    """Verify an M2-rejected record with an unknown test name returns unmapped status."""
    rec = make_normalized_record(
        index=0,
        patient_ref="SYN001",
        test_name="Unregistered Novel Investigation XYZ",
        result=10,
        quality_status="rejected",
        quality_issues=[{
            "code": "INVALID_NUMERIC_VALUE",
            "severity": "rejected",
            "message": "Malformed numeric result.",
            "field": "result",
        }],
    )
    envelope = make_normalization_envelope("HOSPITAL_A", [rec])
    response = client.post("/api/v1/terminology/map", json=envelope)
    assert response.status_code == 200
    data = response.json()

    assert data["mapped_count"] == 0
    assert data["unmapped_count"] == 1
    assert data["review_required_count"] == 0

    r0 = data["records"][0]
    assert r0["quality_status"] == "rejected"
    tm = r0["terminology_mapping"]
    assert tm["mapping_status"] == "unmapped"
    assert tm["target_code"] is None
    assert tm["reason_code"] == MappingReasonCodes.NO_MAPPING_FOUND
    assert tm["review_required"] is False


def test_batch_processing_and_count_reconciliation_with_rejected_records():
    """Verify batch containing valid, warning, and rejected records maintains exact count reconciliation."""
    records = [
        # Record 0: Valid, Known -> mapped
        make_normalized_record(
            index=0,
            patient_ref="P001",
            test_name="Fasting Blood Glucose",
            result=95,
            unit="mg/dL",
            specimen="Serum",
            quality_status="valid",
        ),
        # Record 1: Warning, Known -> mapped
        make_normalized_record(
            index=1,
            patient_ref="P002",
            test_name="Serum Creatinine",
            result=0.9,
            unit="mg/dL",
            specimen="Serum",
            quality_status="warning",
            quality_issues=[{"code": "UNKNOWN_SOURCE_FIELD", "severity": "warning", "message": "Ignored"}],
        ),
        # Record 2: Rejected, Known -> review_required (UPSTREAM_QUALITY_REJECTION)
        make_normalized_record(
            index=2,
            patient_ref="P003",
            test_name="Hemoglobin A1c",
            result=5.7,
            unit="%",
            specimen="Whole Blood",
            quality_status="rejected",
            quality_issues=[{"code": "UNSUPPORTED_RESULT_TYPE", "severity": "rejected", "message": "Rejected"}],
        ),
        # Record 3: Rejected, Unknown -> unmapped (NO_MAPPING_FOUND)
        make_normalized_record(
            index=3,
            patient_ref="P004",
            test_name="Unknown Unregistered Assay",
            result=100,
            quality_status="rejected",
            quality_issues=[{"code": "MISSING_REQUIRED_PATIENT_REF", "severity": "rejected", "message": "Rejected"}],
        ),
    ]
    envelope = make_normalization_envelope("HOSPITAL_A", records)
    response = client.post("/api/v1/terminology/map", json=envelope)
    assert response.status_code == 200
    data = response.json()

    assert data["record_count"] == 4
    assert data["mapped_count"] == 2
    assert data["review_required_count"] == 1
    assert data["unmapped_count"] == 1
    assert data["ambiguous_count"] == 0

    assert (
        data["mapped_count"]
        + data["review_required_count"]
        + data["unmapped_count"]
        + data["ambiguous_count"]
        == data["record_count"]
    )
    assert len(data["records"]) == 4

    assert data["records"][0]["terminology_mapping"]["mapping_status"] == "mapped"
    assert data["records"][1]["terminology_mapping"]["mapping_status"] == "mapped"
    assert data["records"][2]["terminology_mapping"]["mapping_status"] == "review_required"
    assert data["records"][2]["terminology_mapping"]["reason_code"] == MappingReasonCodes.UPSTREAM_QUALITY_REJECTION
    assert data["records"][3]["terminology_mapping"]["mapping_status"] == "unmapped"
    assert data["records"][3]["terminology_mapping"]["reason_code"] == MappingReasonCodes.NO_MAPPING_FOUND


def test_simultaneous_specimen_and_unit_conflict_returns_context_mismatch():
    """Verify that when both specimen and unit constraints conflict, CONTEXT_MISMATCH is emitted."""
    rec = make_normalized_record(
        test_name="Synthetic Glucose Tolerance",
        specimen="Urine",   # Mapping requires "Serum"
        unit="mmol/L",      # Mapping requires "mg/dL"
    )
    envelope = make_normalization_envelope("HOSPITAL_A", [rec])
    response = client.post("/api/v1/terminology/map", json=envelope)
    assert response.status_code == 200
    data = response.json()

    assert data["review_required_count"] == 1
    assert data["mapped_count"] == 0

    mapping = data["records"][0]["terminology_mapping"]
    assert mapping["mapping_status"] == "review_required"
    assert mapping["target_code"] is None
    assert mapping["reason_code"] == MappingReasonCodes.CONTEXT_MISMATCH
    assert "Both specimen and unit constraints conflict" in mapping["message"]
    assert mapping["review_required"] is True


