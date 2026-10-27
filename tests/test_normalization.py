"""Comprehensive test suite for M2 Data Quality and Normalization Layer."""
import copy
import logging
import os
import uuid
from typing import Any, Dict

import pytest
from fastapi.testclient import TestClient

from app.core.normalization_config import IssueCodes
from app.main import app
from app.schemas.ingestion import IngestionRecord, IngestionResponse

client = TestClient(app)


def make_sample_envelope(
    provider_id: str = "HOSPITAL_A",
    source_format: str = "csv",
    records: list[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Helper to construct a valid M1 IngestionResponse dictionary."""
    if records is None:
        records = [
            {
                "patient_id": "SYN001",
                "test_name": "Fasting Blood Glucose",
                "result": "95",
                "unit": "mg/dL",
            }
        ]
    return {
        "ingestion_id": str(uuid.uuid4()),
        "source_provider_id": provider_id,
        "source_format": source_format,
        "ingested_at": "2026-10-25T14:00:00Z",
        "record_count": len(records),
        "status": "accepted",
        "records": [{"source_fields": r} for r in records],
    }


# 1. Valid Hospital A record
def test_valid_hospital_a_record():
    records = [
        {
            "patient_id": "SYN001",
            "test_name": "Fasting Blood Glucose",
            "result": "95",
            "unit": "mg/dL",
            "test_datetime": "2026-10-25T10:30:00Z",
            "specimen": "Serum",
        }
    ]
    envelope = make_sample_envelope("HOSPITAL_A", "csv", records)
    response = client.post("/api/v1/normalization/process", json=envelope)
    assert response.status_code == 200
    data = response.json()

    assert data["status"] == "completed"
    assert data["record_count"] == 1
    assert data["valid_count"] == 1
    assert data["warning_count"] == 0
    assert data["rejected_count"] == 0

    record = data["records"][0]
    assert record["record_index"] == 0
    assert record["quality_status"] == "valid"
    assert len(record["quality_issues"]) == 0

    canon = record["canonical_fields"]
    assert canon["patient_reference"] == "SYN001"
    assert canon["test_name"] == "Fasting Blood Glucose"
    assert canon["result"] == 95  # parsed to int
    assert canon["unit"] == "mg/dL"
    assert canon["observed_at"] == "2026-10-25T10:30:00+00:00"
    assert canon["specimen"] == "Serum"


# 2. Valid Hospital B record
def test_valid_hospital_b_record():
    records = [
        {
            "patient_reference": "SYN002",
            "investigation": "Hemoglobin A1c",
            "value": 5.7,
            "measurement_unit": "%",
            "observed_at": "2026-10-25 11:00:00",
            "specimen": "Whole Blood",
        }
    ]
    envelope = make_sample_envelope("HOSPITAL_B", "json", records)
    response = client.post("/api/v1/normalization/process", json=envelope)
    assert response.status_code == 200
    data = response.json()

    assert data["valid_count"] == 1
    record = data["records"][0]
    assert record["quality_status"] == "valid"
    canon = record["canonical_fields"]
    assert canon["patient_reference"] == "SYN002"
    assert canon["test_name"] == "Hemoglobin A1c"
    assert canon["result"] == 5.7
    assert canon["unit"] == "%"
    assert canon["observed_at"] == "2026-10-25T11:00:00"
    assert canon["specimen"] == "Whole Blood"


# 3. Equivalent source records producing equivalent canonical fields
def test_equivalent_source_records_produce_equivalent_canonical():
    hosp_a_records = [
        {
            "patient_id": "SYN001",
            "test_name": "Total Cholesterol",
            "result": "185",
            "unit": "mg/dL",
        }
    ]
    hosp_b_records = [
        {
            "patient_reference": "SYN001",
            "investigation": "Total Cholesterol",
            "value": 185,
            "measurement_unit": "mg/dL",
        }
    ]

    resp_a = client.post("/api/v1/normalization/process", json=make_sample_envelope("HOSPITAL_A", "csv", hosp_a_records))
    resp_b = client.post("/api/v1/normalization/process", json=make_sample_envelope("HOSPITAL_B", "json", hosp_b_records))

    assert resp_a.status_code == 200
    assert resp_b.status_code == 200

    canon_a = resp_a.json()["records"][0]["canonical_fields"]
    canon_b = resp_b.json()["records"][0]["canonical_fields"]

    assert canon_a == canon_b
    assert canon_a["patient_reference"] == "SYN001"
    assert canon_a["test_name"] == "Total Cholesterol"
    assert canon_a["result"] == 185
    assert canon_a["unit"] == "mg/dL"


# 4. Preservation of original fields and values
def test_preservation_of_original_fields():
    raw_record = {
        "patient_id": "SYN003",
        "test_name": "Serum Creatinine",
        "result": "0.9",
        "unit": "mg/dL",
        "extra_info": "Unmodified verbatim value",
    }
    envelope = make_sample_envelope("HOSPITAL_A", "csv", [raw_record])
    response = client.post("/api/v1/normalization/process", json=envelope)
    assert response.status_code == 200

    rec = response.json()["records"][0]
    assert rec["original_fields"] == raw_record
    assert rec["original_fields"]["extra_info"] == "Unmodified verbatim value"


# 5. Preservation and flagging of unknown fields
def test_unknown_fields_flagged_and_preserved():
    records = [
        {
            "patient_id": "SYN001",
            "test_name": "Glucose",
            "result": "95",
            "unit": "mg/dL",
            "device_model": "Abbott Architect",
            "operator_id": "OP_42",
        }
    ]
    envelope = make_sample_envelope("HOSPITAL_A", "csv", records)
    response = client.post("/api/v1/normalization/process", json=envelope)
    assert response.status_code == 200
    rec = response.json()["records"][0]

    assert rec["quality_status"] == "warning"
    assert rec["unmapped_fields"] == {
        "device_model": "Abbott Architect",
        "operator_id": "OP_42",
    }
    issue_codes = [issue["code"] for issue in rec["quality_issues"]]
    assert issue_codes.count(IssueCodes.UNKNOWN_SOURCE_FIELD) == 2


# 6. Missing required patient reference
def test_missing_required_patient_reference():
    records = [
        {
            "test_name": "Glucose",
            "result": "95",
            "unit": "mg/dL",
        }
    ]
    envelope = make_sample_envelope("HOSPITAL_A", "csv", records)
    response = client.post("/api/v1/normalization/process", json=envelope)
    assert response.status_code == 200
    data = response.json()

    assert data["rejected_count"] == 1
    assert data["valid_count"] == 0
    rec = data["records"][0]
    assert rec["quality_status"] == "rejected"
    assert any(i["code"] == IssueCodes.MISSING_REQUIRED_PATIENT_REF for i in rec["quality_issues"])


# 7. Missing required test name
def test_missing_required_test_name():
    records = [
        {
            "patient_reference": "SYN001",
            "value": 95,
            "measurement_unit": "mg/dL",
        }
    ]
    envelope = make_sample_envelope("HOSPITAL_B", "json", records)
    response = client.post("/api/v1/normalization/process", json=envelope)
    assert response.status_code == 200
    data = response.json()

    assert data["rejected_count"] == 1
    rec = data["records"][0]
    assert rec["quality_status"] == "rejected"
    assert any(i["code"] == IssueCodes.MISSING_REQUIRED_TEST_NAME for i in rec["quality_issues"])


# 8. Missing or unusable result
def test_missing_required_result():
    records = [
        {
            "patient_id": "SYN001",
            "test_name": "Glucose",
            "result": "",  # Empty result string
            "unit": "mg/dL",
        }
    ]
    envelope = make_sample_envelope("HOSPITAL_A", "csv", records)
    response = client.post("/api/v1/normalization/process", json=envelope)
    assert response.status_code == 200
    rec = response.json()["records"][0]

    assert rec["quality_status"] == "rejected"
    assert any(i["code"] == IssueCodes.MISSING_REQUIRED_RESULT for i in rec["quality_issues"])


# 9. Missing optional fields
def test_missing_optional_fields():
    # Only required fields provided; unit, observed_at, specimen are missing
    records = [
        {
            "patient_id": "SYN001",
            "test_name": "Blood Glucose",
            "result": "95",
        }
    ]
    envelope = make_sample_envelope("HOSPITAL_A", "csv", records)
    response = client.post("/api/v1/normalization/process", json=envelope)
    assert response.status_code == 200
    rec = response.json()["records"][0]

    # Usable with warning for missing unit
    assert rec["quality_status"] == "warning"
    assert rec["canonical_fields"]["unit"] is None
    assert rec["canonical_fields"]["observed_at"] is None
    assert rec["canonical_fields"]["specimen"] is None
    assert any(i["code"] == IssueCodes.MISSING_OPTIONAL_UNIT for i in rec["quality_issues"])


# 10. Invalid numeric values
def test_invalid_numeric_values():
    records = [
        {
            "patient_id": "SYN001",
            "test_name": "Glucose",
            "result": "95.2.3",  # Malformed number
            "unit": "mg/dL",
        }
    ]
    envelope = make_sample_envelope("HOSPITAL_A", "csv", records)
    response = client.post("/api/v1/normalization/process", json=envelope)
    assert response.status_code == 200
    rec = response.json()["records"][0]

    assert rec["quality_status"] == "rejected"
    assert any(i["code"] == IssueCodes.INVALID_NUMERIC_VALUE for i in rec["quality_issues"])


# 11. Valid supported timestamps
def test_valid_supported_timestamps():
    formats = [
        "2026-10-25T14:30:00Z",
        "2026-10-25T14:30:00+05:30",
        "2026-10-25 14:30:00",
        "2026-10-25",
    ]
    for ts in formats:
        records = [
            {
                "patient_id": "SYN001",
                "test_name": "Glucose",
                "result": "95",
                "unit": "mg/dL",
                "test_datetime": ts,
            }
        ]
        envelope = make_sample_envelope("HOSPITAL_A", "csv", records)
        resp = client.post("/api/v1/normalization/process", json=envelope)
        assert resp.status_code == 200
        rec = resp.json()["records"][0]
        assert rec["canonical_fields"]["observed_at"] is not None
        assert not any(i["code"] == IssueCodes.MALFORMED_TIMESTAMP for i in rec["quality_issues"])


# 12. Invalid or ambiguous timestamps
def test_invalid_or_ambiguous_timestamps():
    # Ambiguous slash date
    ambiguous_records = [
        {
            "patient_id": "SYN001",
            "test_name": "Glucose",
            "result": "95",
            "unit": "mg/dL",
            "test_datetime": "01/02/2026",
        }
    ]
    resp_amb = client.post("/api/v1/normalization/process", json=make_sample_envelope("HOSPITAL_A", "csv", ambiguous_records))
    assert resp_amb.status_code == 200
    rec_amb = resp_amb.json()["records"][0]
    assert rec_amb["quality_status"] == "warning"
    assert any(i["code"] == IssueCodes.AMBIGUOUS_TIMESTAMP for i in rec_amb["quality_issues"])

    # Malformed timestamp
    malformed_records = [
        {
            "patient_id": "SYN001",
            "test_name": "Glucose",
            "result": "95",
            "unit": "mg/dL",
            "test_datetime": "2026-99-99",
        }
    ]
    resp_mal = client.post("/api/v1/normalization/process", json=make_sample_envelope("HOSPITAL_A", "csv", malformed_records))
    assert resp_mal.status_code == 200
    rec_mal = resp_mal.json()["records"][0]
    assert rec_mal["quality_status"] == "warning"
    assert any(i["code"] == IssueCodes.MALFORMED_TIMESTAMP for i in rec_mal["quality_issues"])


# 13. Unknown source provider or unsupported mapping configuration
def test_unknown_source_provider_rejected():
    envelope = make_sample_envelope("NON_EXISTENT_CLINIC", "json", [{"foo": "bar"}])
    response = client.post("/api/v1/normalization/process", json=envelope)
    assert response.status_code == 400
    data = response.json()
    assert data["error_code"] == "NORMALIZATION_CONFIG_ERROR"
    assert "No field-mapping configuration registered" in data["message"]


# 14. Conflicting aliases mapping to the same canonical field
def test_conflicting_aliases_mapping_to_same_canonical_field():
    # Both patient_id and patient_reference present in Lab C profile with differing values
    records = [
        {
            "patient_id": "SYN001",
            "patient_reference": "SYN999_DIFFERENT",
            "marker": "CRP",
            "value": "2.5",
            "unit": "mg/L",
        }
    ]
    envelope = make_sample_envelope("LAB_C", "json", records)
    response = client.post("/api/v1/normalization/process", json=envelope)
    assert response.status_code == 200
    rec = response.json()["records"][0]

    assert rec["quality_status"] == "rejected"
    assert any(i["code"] == IssueCodes.CONFLICTING_FIELD_VALUES for i in rec["quality_issues"])


# 15. Mixed batch containing valid, warning, and rejected records
def test_mixed_batch_processing():
    records = [
        # Record 0: Fully valid
        {
            "patient_id": "SYN001",
            "test_name": "Fasting Blood Glucose",
            "result": "95",
            "unit": "mg/dL",
        },
        # Record 1: Warning (missing unit)
        {
            "patient_id": "SYN002",
            "test_name": "Hemoglobin A1c",
            "result": "5.7",
        },
        # Record 2: Rejected (missing patient_id)
        {
            "test_name": "Serum Creatinine",
            "result": "0.9",
            "unit": "mg/dL",
        },
        # Record 3: Warning (unknown field)
        {
            "patient_id": "SYN004",
            "test_name": "Total Cholesterol",
            "result": "185",
            "unit": "mg/dL",
            "lab_room": "3B",
        },
        # Record 4: Rejected (missing result)
        {
            "patient_id": "SYN005",
            "test_name": "Platelet Count",
            "unit": "/uL",
        },
    ]
    envelope = make_sample_envelope("HOSPITAL_A", "csv", records)
    response = client.post("/api/v1/normalization/process", json=envelope)
    assert response.status_code == 200
    data = response.json()

    assert data["status"] == "completed"
    assert data["record_count"] == 5
    assert data["valid_count"] == 1
    assert data["warning_count"] == 2
    assert data["rejected_count"] == 2
    assert data["valid_count"] + data["warning_count"] + data["rejected_count"] == data["record_count"]

    assert data["records"][0]["quality_status"] == "valid"
    assert data["records"][1]["quality_status"] == "warning"
    assert data["records"][2]["quality_status"] == "rejected"
    assert data["records"][3]["quality_status"] == "warning"
    assert data["records"][4]["quality_status"] == "rejected"


# 16. Correct record counts and batch status
def test_record_counts_and_batch_status():
    envelope = make_sample_envelope("HOSPITAL_B", "json", [
        {"patient_reference": "SYN001", "investigation": "Glucose", "value": 90, "measurement_unit": "mg/dL"},
        {"patient_reference": "SYN002", "investigation": "Glucose", "value": 110, "measurement_unit": "mg/dL"},
    ])
    response = client.post("/api/v1/normalization/process", json=envelope)
    assert response.status_code == 200
    data = response.json()

    assert data["status"] == "completed"
    assert data["record_count"] == 2
    assert data["valid_count"] == 2
    assert data["warning_count"] == 0
    assert data["rejected_count"] == 0
    assert data["valid_count"] + data["warning_count"] + data["rejected_count"] == 2


# 17. Malformed M1 envelopes
def test_malformed_m1_envelope_rejected():
    # Empty ingestion_id
    bad_envelope_1 = make_sample_envelope()
    bad_envelope_1["ingestion_id"] = "   "
    resp1 = client.post("/api/v1/normalization/process", json=bad_envelope_1)
    assert resp1.status_code == 400
    assert resp1.json()["error_code"] == "INVALID_ENVELOPE"

    # Mismatched record_count
    bad_envelope_2 = make_sample_envelope()
    bad_envelope_2["record_count"] = 999  # actual records length is 1
    resp2 = client.post("/api/v1/normalization/process", json=bad_envelope_2)
    assert resp2.status_code == 400
    assert resp2.json()["error_code"] == "INVALID_ENVELOPE"

    # Missing records field (schema validation error 422)
    bad_envelope_3 = {"ingestion_id": str(uuid.uuid4()), "source_provider_id": "HOSPITAL_A"}
    resp3 = client.post("/api/v1/normalization/process", json=bad_envelope_3)
    assert resp3.status_code == 422
    assert resp3.json()["error_code"] == "VALIDATION_ERROR"


# 18. No central database or persistent clinical-payload storage
def test_no_central_storage_during_normalization():
    before_files = set(os.listdir("."))
    unique_marker = f"NORM_PERSISTENCE_TEST_{uuid.uuid4()}"
    envelope = make_sample_envelope("HOSPITAL_A", "csv", [
        {"patient_id": "SYN001", "test_name": "Test", "result": unique_marker, "unit": "mg/dL"}
    ])

    response = client.post("/api/v1/normalization/process", json=envelope)
    assert response.status_code == 200

    after_files = set(os.listdir("."))
    new_files = [f for f in (after_files - before_files) if not f.startswith(".pytest")]
    assert len(new_files) == 0

    forbidden = {".db", ".sqlite", ".sqlite3", ".dump"}
    for root, _, files in os.walk("."):
        if ".venv" in root or ".git" in root:
            continue
        for file in files:
            assert os.path.splitext(file)[1] not in forbidden


# 19. No mutation of the input ingestion object
def test_no_mutation_of_input_ingestion_object():
    records = [
        {
            "patient_id": "SYN001",
            "test_name": "Fasting Blood Glucose",
            "result": "95",
            "unit": "mg/dL",
            "extra": "keep_me",
        }
    ]
    envelope_dict = make_sample_envelope("HOSPITAL_A", "csv", records)
    envelope_obj = IngestionResponse.model_validate(envelope_dict)

    # Serialize pre-call snapshot
    pre_snapshot = copy.deepcopy(envelope_obj.model_dump())

    # Call service directly with object
    from app.services.normalization_service import NormalizationService
    NormalizationService.normalize_batch(envelope_obj)

    # Verify input object remains exactly unchanged
    post_snapshot = envelope_obj.model_dump()
    assert pre_snapshot == post_snapshot


# 20. Appropriate error handling and privacy-safe logging
def test_privacy_safe_logging(caplog):
    caplog.set_level(logging.INFO)
    sensitive_patient = "CONFIDENTIAL_PATIENT_NAME_999"
    sensitive_val = "SECRET_CLINICAL_RESULT_VALUE_888"

    envelope = make_sample_envelope("HOSPITAL_A", "csv", [
        {"patient_id": sensitive_patient, "test_name": "Confidential", "result": sensitive_val, "unit": "mg/dL"}
    ])

    response = client.post("/api/v1/normalization/process", json=envelope)
    assert response.status_code == 200

    # Ensure sensitive patient ID and clinical result are never logged
    for record in caplog.records:
        assert sensitive_patient not in record.message
        assert sensitive_val not in record.message


# 21. End-to-End Pipeline: Ingest Hospital A CSV -> Normalize
def test_end_to_end_hospital_a_csv_to_normalization():
    with open("data/samples/hospital_a.csv", "rb") as f:
        file_bytes = f.read()

    # Step 1: Ingest via M1 CSV endpoint
    ingest_resp = client.post(
        "/api/v1/ingestion/csv",
        headers={"X-Provider-ID": "HOSPITAL_A"},
        files={"file": ("hospital_a.csv", file_bytes, "text/csv")},
    )
    assert ingest_resp.status_code == 200
    ingest_data = ingest_resp.json()

    # Step 2: Pipe directly into M2 Normalization endpoint
    norm_resp = client.post("/api/v1/normalization/process", json=ingest_data)
    assert norm_resp.status_code == 200
    norm_data = norm_resp.json()

    assert norm_data["status"] == "completed"
    assert norm_data["record_count"] == 5
    assert norm_data["valid_count"] == 5
    assert norm_data["rejected_count"] == 0
    assert norm_data["ingestion_id"] == ingest_data["ingestion_id"]
    assert norm_data["source_provider_id"] == "HOSPITAL_A"

    # Verify first record is normalized properly
    first = norm_data["records"][0]
    assert first["canonical_fields"]["patient_reference"] == "SYN001"
    assert first["canonical_fields"]["test_name"] == "Fasting Blood Glucose"
    assert first["canonical_fields"]["result"] == 95
    assert first["canonical_fields"]["unit"] == "mg/dL"


# 22. End-to-End Pipeline: Ingest Hospital B JSON -> Normalize
def test_end_to_end_hospital_b_json_to_normalization():
    import json
    with open("data/samples/hospital_b.json", "r", encoding="utf-8") as f:
        json_payload = json.load(f)

    # Step 1: Ingest via M1 JSON endpoint
    ingest_resp = client.post("/api/v1/ingestion/json", json=json_payload)
    assert ingest_resp.status_code == 200
    ingest_data = ingest_resp.json()

    # Step 2: Pipe directly into M2 Normalization endpoint
    norm_resp = client.post("/api/v1/normalization/process", json=ingest_data)
    assert norm_resp.status_code == 200
    norm_data = norm_resp.json()

    assert norm_data["status"] == "completed"
    assert norm_data["record_count"] == 5
    assert norm_data["valid_count"] == 5
    assert norm_data["rejected_count"] == 0
    assert norm_data["ingestion_id"] == ingest_data["ingestion_id"]
    assert norm_data["source_provider_id"] == "HOSPITAL_B"

    # Verify first record has canonical fields mapped from investigation, value, measurement_unit
    first = norm_data["records"][0]
    assert first["canonical_fields"]["patient_reference"] == "SYN001"
    assert first["canonical_fields"]["test_name"] == "Fasting Blood Glucose"
    assert first["canonical_fields"]["result"] == 95
    assert first["canonical_fields"]["unit"] == "mg/dL"


# 23. Date-only handling: YYYY-MM-DD must not fabricate time or timezone
def test_date_only_preserves_date_without_fabricating_time():
    records = [
        {
            "patient_reference": "SYN001",
            "investigation": "Fasting Blood Glucose",
            "value": 95,
            "measurement_unit": "mg/dL",
            "observed_at": "2026-10-25",
        }
    ]
    envelope = make_sample_envelope("HOSPITAL_B", "json", records)
    resp = client.post("/api/v1/normalization/process", json=envelope)
    assert resp.status_code == 200
    rec = resp.json()["records"][0]
    assert rec["quality_status"] == "valid"
    # Crucial assertion: Must be pure date string without 'T00:00:00' or timezone
    assert rec["canonical_fields"]["observed_at"] == "2026-10-25"
    assert "T" not in rec["canonical_fields"]["observed_at"]
    assert ":" not in rec["canonical_fields"]["observed_at"]


# 24. Boolean result handling: Reject booleans (True and False)
@pytest.mark.parametrize("bool_val", [True, False])
def test_boolean_results_rejected_as_unsupported(bool_val):
    records = [
        {
            "patient_reference": "SYN001",
            "investigation": "Rapid Antigen",
            "value": bool_val,
            "measurement_unit": "status",
        }
    ]
    envelope = make_sample_envelope("HOSPITAL_B", "json", records)
    resp = client.post("/api/v1/normalization/process", json=envelope)
    assert resp.status_code == 200
    rec = resp.json()["records"][0]
    assert rec["quality_status"] == "rejected"
    assert rec["canonical_fields"]["result"] is None
    assert any(
        i["code"] == IssueCodes.UNSUPPORTED_RESULT_TYPE and i["severity"] == "rejected"
        for i in rec["quality_issues"]
    )


# 25. Conflicting optional fields: left unresolved (None) with warning severity
def test_conflicting_optional_fields_unresolved_with_warning():
    # In Lab C, unit and measurement_unit map to unit; observed_at and test_datetime map to observed_at
    records = [
        {
            "patient_id": "SYN001",
            "test_name": "Blood Glucose",
            "result": "95",
            "unit": "mg/dL",
            "measurement_unit": "mmol/L",  # Conflicting optional unit
            "observed_at": "2026-10-25T10:00:00Z",
            "test_datetime": "2026-10-25T12:00:00Z",  # Conflicting optional timestamp
        }
    ]
    envelope = make_sample_envelope("LAB_C", "json", records)
    resp = client.post("/api/v1/normalization/process", json=envelope)
    assert resp.status_code == 200
    rec = resp.json()["records"][0]

    # Warning status (not rejected because required fields are valid and unconflicted)
    assert rec["quality_status"] == "warning"
    # Crucial rule: Neither conflicting value selected arbitrarily; both unresolved (None)
    assert rec["canonical_fields"]["unit"] is None
    assert rec["canonical_fields"]["observed_at"] is None
    # Original fields preserved
    assert rec["original_fields"]["unit"] == "mg/dL"
    assert rec["original_fields"]["measurement_unit"] == "mmol/L"
    assert rec["original_fields"]["observed_at"] == "2026-10-25T10:00:00Z"
    assert rec["original_fields"]["test_datetime"] == "2026-10-25T12:00:00Z"

    conflict_issues = [i for i in rec["quality_issues"] if i["code"] == IssueCodes.CONFLICTING_FIELD_VALUES]
    assert len(conflict_issues) == 2
    assert all(i["severity"] == "warning" for i in conflict_issues)


# 26. Conflicting required fields: left unresolved (None) with rejected severity
def test_conflicting_required_fields_unresolved_with_rejection():
    records = [
        {
            "patient_id": "SYN001",
            "patient_reference": "SYN999",  # Conflicting required patient reference
            "test_name": "Glucose",
            "value": "95",
            "result": "120",  # Conflicting required result
            "unit": "mg/dL",
        }
    ]
    envelope = make_sample_envelope("LAB_C", "json", records)
    resp = client.post("/api/v1/normalization/process", json=envelope)
    assert resp.status_code == 200
    rec = resp.json()["records"][0]

    assert rec["quality_status"] == "rejected"
    assert rec["canonical_fields"]["patient_reference"] is None
    assert rec["canonical_fields"]["result"] is None
    assert rec["original_fields"]["patient_id"] == "SYN001"
    assert rec["original_fields"]["patient_reference"] == "SYN999"
    assert rec["original_fields"]["value"] == "95"
    assert rec["original_fields"]["result"] == "120"

    conflict_issues = [i for i in rec["quality_issues"] if i["code"] == IssueCodes.CONFLICTING_FIELD_VALUES]
    assert len(conflict_issues) == 2
    assert all(i["severity"] == "rejected" for i in conflict_issues)


# 27. Source-format validation per provider profile
def test_unsupported_source_formats_rejected():
    # Hospital A only supports 'csv'; reject 'json'
    envelope_a = make_sample_envelope("HOSPITAL_A", "json", [{"patient_id": "SYN001"}])
    resp_a = client.post("/api/v1/normalization/process", json=envelope_a)
    assert resp_a.status_code == 400
    assert resp_a.json()["error_code"] == "NORMALIZATION_CONFIG_ERROR"
    assert "does not support source format 'json'" in resp_a.json()["message"]

    # Hospital B only supports 'json'; reject 'csv'
    envelope_b = make_sample_envelope("HOSPITAL_B", "csv", [{"patient_reference": "SYN001"}])
    resp_b = client.post("/api/v1/normalization/process", json=envelope_b)
    assert resp_b.status_code == 400
    assert resp_b.json()["error_code"] == "NORMALIZATION_CONFIG_ERROR"
    assert "does not support source format 'csv'" in resp_b.json()["message"]

    # Lab C supports both 'csv' and 'json'
    envelope_c_csv = make_sample_envelope("LAB_C", "csv", [
        {"patient_id": "SYN001", "test_name": "Glucose", "result": "90", "unit": "mg/dL"}
    ])
    assert client.post("/api/v1/normalization/process", json=envelope_c_csv).status_code == 200

    envelope_c_json = make_sample_envelope("LAB_C", "json", [
        {"patient_id": "SYN001", "test_name": "Glucose", "result": "90", "unit": "mg/dL"}
    ])
    assert client.post("/api/v1/normalization/process", json=envelope_c_json).status_code == 200


# 28. Result type validation: complex types and numeric overflow
def test_result_type_validation_complex_types_and_overflow():
    # Complex dictionary result
    resp_dict = client.post(
        "/api/v1/normalization/process",
        json=make_sample_envelope("HOSPITAL_B", "json", [
            {"patient_reference": "SYN001", "investigation": "Test", "value": {"raw": 95}, "measurement_unit": "mg/dL"}
        ]),
    )
    rec_dict = resp_dict.json()["records"][0]
    assert rec_dict["quality_status"] == "rejected"
    assert any(i["code"] == IssueCodes.UNSUPPORTED_RESULT_TYPE for i in rec_dict["quality_issues"])

    # List result
    resp_list = client.post(
        "/api/v1/normalization/process",
        json=make_sample_envelope("HOSPITAL_B", "json", [
            {"patient_reference": "SYN001", "investigation": "Test", "value": [95, 96], "measurement_unit": "mg/dL"}
        ]),
    )
    rec_list = resp_list.json()["records"][0]
    assert rec_list["quality_status"] == "rejected"
    assert any(i["code"] == IssueCodes.UNSUPPORTED_RESULT_TYPE for i in rec_list["quality_issues"])

    # Numeric overflow: "1e999", "-1e999", "Infinity", "nan"
    for overflow_str in ["1e999", "-1e999", "Infinity", "nan"]:
        resp_over = client.post(
            "/api/v1/normalization/process",
            json=make_sample_envelope("HOSPITAL_A", "csv", [
                {"patient_id": "SYN001", "test_name": "Glucose", "result": overflow_str, "unit": "mg/dL"}
            ]),
        )
        rec_over = resp_over.json()["records"][0]
        assert rec_over["quality_status"] == "rejected"
        assert any(i["code"] == IssueCodes.INVALID_NUMERIC_VALUE for i in rec_over["quality_issues"])

    # Legitimate qualitative results: "Positive", "Negative", "Normal", "Reactive"
    for qual_str in ["Positive", "Negative", "Normal", "Reactive"]:
        resp_qual = client.post(
            "/api/v1/normalization/process",
            json=make_sample_envelope("HOSPITAL_A", "csv", [
                {"patient_id": "SYN001", "test_name": "COVID-19", "result": qual_str, "unit": "qualitative"}
            ]),
        )
        rec_qual = resp_qual.json()["records"][0]
        assert rec_qual["quality_status"] == "valid"
        assert rec_qual["canonical_fields"]["result"] == qual_str


# 29. Missing observation timestamp policy reconciliation
def test_missing_observation_timestamp_policy():
    records = [
        {
            "patient_reference": "SYN001",
            "investigation": "Fasting Blood Glucose",
            "value": 95,
            "measurement_unit": "mg/dL",
            # observed_at completely omitted
        }
    ]
    resp = client.post(
        "/api/v1/normalization/process",
        json=make_sample_envelope("HOSPITAL_B", "json", records),
    )
    assert resp.status_code == 200
    rec = resp.json()["records"][0]
    # In initial lab profile, observed_at is optional; omitted timestamp is valid
    assert rec["quality_status"] == "valid"
    assert rec["canonical_fields"]["observed_at"] is None
    assert len(rec["quality_issues"]) == 0


# 30. Quality issue messages sanitized (privacy-safe, no raw clinical value echoes)
def test_quality_issue_messages_sanitized_privacy():
    secret_clinical_value = "SECRET_CLINICAL_MEASUREMENT_777"
    secret_patient_id = "SECRET_PATIENT_IDENTITY_555"

    records = [
        {
            "patient_id": secret_patient_id,
            "patient_reference": "OTHER_PATIENT",
            "test_name": "Blood Test",
            "result": secret_clinical_value,
            "value": "95",
            "unit": "mg/dL",
        }
    ]
    resp = client.post(
        "/api/v1/normalization/process",
        json=make_sample_envelope("LAB_C", "json", records),
    )
    assert resp.status_code == 200
    rec = resp.json()["records"][0]

    for issue in rec["quality_issues"]:
        assert secret_clinical_value not in issue["message"]
        assert secret_patient_id not in issue["message"]


# 31. Blank alias fallback: absent vs usable vs conflicting aliases
def test_blank_alias_fallback_behavior():
    # Subcase 1: Blank-first on required field (patient_id blank, patient_reference usable)
    rec_blank_first = [
        {
            "patient_id": "   ",
            "patient_reference": "SYN001",
            "test_name": "Blood Glucose",
            "result": "95",
            "unit": "mg/dL",
        }
    ]
    resp1 = client.post("/api/v1/normalization/process", json=make_sample_envelope("LAB_C", "json", rec_blank_first))
    assert resp1.status_code == 200
    res1 = resp1.json()["records"][0]
    assert res1["quality_status"] == "valid"
    assert res1["canonical_fields"]["patient_reference"] == "SYN001"
    assert not any(i["code"] == IssueCodes.CONFLICTING_FIELD_VALUES for i in res1["quality_issues"])

    # Subcase 2: Blank-second on required field (patient_id usable, patient_reference empty string)
    rec_blank_second = [
        {
            "patient_id": "SYN001",
            "patient_reference": "",
            "test_name": "Blood Glucose",
            "result": "95",
            "unit": "mg/dL",
        }
    ]
    resp2 = client.post("/api/v1/normalization/process", json=make_sample_envelope("LAB_C", "json", rec_blank_second))
    assert resp2.status_code == 200
    res2 = resp2.json()["records"][0]
    assert res2["quality_status"] == "valid"
    assert res2["canonical_fields"]["patient_reference"] == "SYN001"
    assert not any(i["code"] == IssueCodes.CONFLICTING_FIELD_VALUES for i in res2["quality_issues"])

    # Subcase 3: Conflicting non-empty on required field (patient_id and patient_reference both non-empty and different)
    rec_conflict_req = [
        {
            "patient_id": "SYN001",
            "patient_reference": "SYN999",
            "test_name": "Blood Glucose",
            "result": "95",
            "unit": "mg/dL",
        }
    ]
    resp3 = client.post("/api/v1/normalization/process", json=make_sample_envelope("LAB_C", "json", rec_conflict_req))
    assert resp3.status_code == 200
    res3 = resp3.json()["records"][0]
    assert res3["quality_status"] == "rejected"
    assert res3["canonical_fields"]["patient_reference"] is None
    assert res3["original_fields"]["patient_id"] == "SYN001"
    assert res3["original_fields"]["patient_reference"] == "SYN999"
    assert any(i["code"] == IssueCodes.CONFLICTING_FIELD_VALUES and i["severity"] == "rejected" for i in res3["quality_issues"])

    # Subcase 4: Blank-first on optional field (unit is None, measurement_unit is "mg/dL")
    rec_blank_opt_first = [
        {
            "patient_id": "SYN001",
            "test_name": "Blood Glucose",
            "result": "95",
            "unit": None,
            "measurement_unit": "mg/dL",
        }
    ]
    resp4 = client.post("/api/v1/normalization/process", json=make_sample_envelope("LAB_C", "json", rec_blank_opt_first))
    assert resp4.status_code == 200
    res4 = resp4.json()["records"][0]
    assert res4["quality_status"] == "valid"
    assert res4["canonical_fields"]["unit"] == "mg/dL"
    assert not any(i["code"] == IssueCodes.MISSING_OPTIONAL_UNIT for i in res4["quality_issues"])

    # Subcase 5: Blank-second on optional field (unit is "mg/dL", measurement_unit is whitespace)
    rec_blank_opt_second = [
        {
            "patient_id": "SYN001",
            "test_name": "Blood Glucose",
            "result": "95",
            "unit": "mg/dL",
            "measurement_unit": "   ",
        }
    ]
    resp5 = client.post("/api/v1/normalization/process", json=make_sample_envelope("LAB_C", "json", rec_blank_opt_second))
    assert resp5.status_code == 200
    res5 = resp5.json()["records"][0]
    assert res5["quality_status"] == "valid"
    assert res5["canonical_fields"]["unit"] == "mg/dL"

    # Subcase 6: Conflicting non-empty on optional field (unit and measurement_unit differ)
    rec_conflict_opt = [
        {
            "patient_id": "SYN001",
            "test_name": "Blood Glucose",
            "result": "95",
            "unit": "mg/dL",
            "measurement_unit": "mmol/L",
        }
    ]
    resp6 = client.post("/api/v1/normalization/process", json=make_sample_envelope("LAB_C", "json", rec_conflict_opt))
    assert resp6.status_code == 200
    res6 = resp6.json()["records"][0]
    assert res6["quality_status"] == "warning"
    assert res6["canonical_fields"]["unit"] is None
    assert res6["original_fields"]["unit"] == "mg/dL"
    assert res6["original_fields"]["measurement_unit"] == "mmol/L"
    assert any(i["code"] == IssueCodes.CONFLICTING_FIELD_VALUES and i["severity"] == "warning" for i in res6["quality_issues"])


# 32. Numeric scientific notation classification, underflow, overflow, and malformed numeric strings
def test_numeric_underflow_and_scientific_notation():
    # 1. Valid decimal and scientific notation forms
    valid_cases = [
        ("0", 0),
        ("0.0", 0.0),
        ("0e0", 0.0),
        (".5", 0.5),
        ("1.", 1.0),
        ("-.5", -0.5),
        (".5e-3", 0.0005),
        ("1.e-3", 0.001),
        ("+.5E+2", 50.0),
        ("1.25e-3", 0.00125),
        ("5.0e2", 500.0),
        ("-2.5e-2", -0.025),
    ]
    for val_str, expected_num in valid_cases:
        resp = client.post(
            "/api/v1/normalization/process",
            json=make_sample_envelope("HOSPITAL_A", "csv", [
                {"patient_id": "SYN001", "test_name": "Concentration", "result": val_str, "unit": "ng/mL"}
            ]),
        )
        assert resp.status_code == 200
        rec = resp.json()["records"][0]
        assert rec["quality_status"] == "valid", f"Failed on {val_str!r}: {rec['quality_issues']}"
        assert rec["canonical_fields"]["result"] == expected_num

    # 2. Non-zero underflow cases (must be rejected as INVALID_NUMERIC_VALUE, not qualitative)
    underflow_cases = [
        "1e-999",
        ".1e-999",
        "+.1e-999",
        "1.e-999",
        "1e-500",
        "-1e-500",
        "2.5e-400",
        "0." + "0" * 350 + "1",
    ]
    for val in underflow_cases:
        resp = client.post(
            "/api/v1/normalization/process",
            json=make_sample_envelope("HOSPITAL_A", "csv", [
                {"patient_id": "SYN001", "test_name": "Concentration", "result": val, "unit": "ng/mL"}
            ]),
        )
        assert resp.status_code == 200
        rec = resp.json()["records"][0]
        assert rec["quality_status"] == "rejected", f"Expected underflow rejection for {val!r}"
        assert rec["canonical_fields"]["result"] is None
        issue = next(i for i in rec["quality_issues"] if i["code"] == IssueCodes.INVALID_NUMERIC_VALUE)
        assert issue["severity"] == "rejected"
        assert "underflowed" in issue["message"]
        # Ensure raw value is not echoed in the error message
        assert val not in issue["message"]

    # 3. Numeric overflow cases
    overflow_cases = ["1e999", "1.0e999", "-1e999", "-1.0e999"]
    for val in overflow_cases:
        resp = client.post(
            "/api/v1/normalization/process",
            json=make_sample_envelope("HOSPITAL_A", "csv", [
                {"patient_id": "SYN001", "test_name": "Concentration", "result": val, "unit": "ng/mL"}
            ]),
        )
        assert resp.status_code == 200
        rec = resp.json()["records"][0]
        assert rec["quality_status"] == "rejected", f"Expected overflow rejection for {val!r}"
        assert rec["canonical_fields"]["result"] is None
        issue = next(i for i in rec["quality_issues"] if i["code"] == IssueCodes.INVALID_NUMERIC_VALUE)
        assert issue["severity"] == "rejected"
        assert "overflowed" in issue["message"]

    # 4. Malformed numeric-looking strings (must be rejected as INVALID_NUMERIC_VALUE, not qualitative)
    malformed_cases = [
        "95.2.3",
        "12..4",
        "..5",
        "1e",
        "1e+",
        "1.2E",
        "1e2.5",
        "95mg",
        "+-5",
        ".",
    ]
    for mal_str in malformed_cases:
        resp = client.post(
            "/api/v1/normalization/process",
            json=make_sample_envelope("HOSPITAL_A", "csv", [
                {"patient_id": "SYN001", "test_name": "Glucose", "result": mal_str, "unit": "mg/dL"}
            ]),
        )
        assert resp.status_code == 200
        rec = resp.json()["records"][0]
        assert rec["quality_status"] == "rejected", f"Expected malformed rejection for {mal_str!r}"
        assert rec["canonical_fields"]["result"] is None
        issue = next(i for i in rec["quality_issues"] if i["code"] == IssueCodes.INVALID_NUMERIC_VALUE)
        assert issue["severity"] == "rejected"
        assert "Malformed" in issue["message"]


# 33. Normalization batch limit at and above threshold
def test_normalization_batch_limit_at_and_above_threshold(monkeypatch):
    from app.core.config import get_settings

    settings = get_settings()
    monkeypatch.setattr(settings, "MAX_NORMALIZATION_RECORD_COUNT", 5)

    # 1. At the limit: exactly 5 records
    records_at_limit = [
        {"patient_reference": f"SYN00{i}", "investigation": "Glucose", "value": 90 + i, "measurement_unit": "mg/dL"}
        for i in range(5)
    ]
    envelope_at_limit = make_sample_envelope("HOSPITAL_B", "json", records_at_limit)
    resp_at_limit = client.post("/api/v1/normalization/process", json=envelope_at_limit)
    assert resp_at_limit.status_code == 200
    data_at_limit = resp_at_limit.json()
    assert data_at_limit["status"] == "completed"
    assert data_at_limit["record_count"] == 5

    # 2. Above the limit: 6 records
    records_above_limit = [
        {"patient_reference": f"SYN00{i}", "investigation": "Glucose", "value": 90 + i, "measurement_unit": "mg/dL"}
        for i in range(6)
    ]
    envelope_above_limit = make_sample_envelope("HOSPITAL_B", "json", records_above_limit)
    resp_above_limit = client.post("/api/v1/normalization/process", json=envelope_above_limit)
    assert resp_above_limit.status_code == 400
    err_data = resp_above_limit.json()
    assert err_data["error_code"] == "RECORD_LIMIT_EXCEEDED"
    assert "Batch record count (6) exceeds maximum allowed limit of 5 records." in err_data["message"]
    # Ensure no patient or clinical values leaked into error payload
    assert "SYN00" not in err_data["message"]
