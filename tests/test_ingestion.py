"""Automated test suite for TN HealthBridge M1 Data Ingestion Layer."""
import io
import json
import logging
import os
import uuid
from datetime import datetime
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.core.config import get_settings
from app.main import app

client = TestClient(app)
settings = get_settings()


# 1. Health endpoint returns success
def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data.get("status") == "healthy"
    assert "service" in data
    # Ensure no sensitive system internals leaked
    assert "db" not in data
    assert "password" not in data


# 2. Valid CSV with one record
def test_valid_csv_single_record():
    csv_content = "patient_id,test_name,result,unit\nSYN001,Glucose,95,mg/dL\n"
    response = client.post(
        "/api/v1/ingestion/csv",
        headers={"X-Provider-ID": "HOSPITAL_A"},
        files={"file": ("test_single.csv", csv_content.encode("utf-8"), "text/csv")},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["source_provider_id"] == "HOSPITAL_A"
    assert data["source_format"] == "csv"
    assert data["record_count"] == 1
    assert data["status"] == "accepted"
    assert len(data["records"]) == 1
    assert data["records"][0]["source_fields"] == {
        "patient_id": "SYN001",
        "test_name": "Glucose",
        "result": "95",
        "unit": "mg/dL",
    }


# 3. Valid CSV with multiple records
def test_valid_csv_multiple_records():
    sample_path = Path("data/samples/hospital_a.csv")
    with open(sample_path, "rb") as f:
        file_bytes = f.read()

    response = client.post(
        "/api/v1/ingestion/csv",
        headers={"X-Provider-ID": "HOSPITAL_A"},
        files={"file": ("hospital_a.csv", file_bytes, "text/csv")},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["record_count"] == 5
    assert len(data["records"]) == 5
    assert data["records"][0]["source_fields"]["patient_id"] == "SYN001"
    assert data["records"][1]["source_fields"]["patient_id"] == "SYN002"


# 4. Valid JSON with one record
def test_valid_json_single_record():
    payload = {
        "source_provider_id": "HOSPITAL_B",
        "record": {
            "patient_reference": "SYN001",
            "investigation": "Blood Sugar",
            "value": 95,
            "measurement_unit": "mg/dL",
        },
    }
    response = client.post(
        "/api/v1/ingestion/json",
        json=payload,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["source_provider_id"] == "HOSPITAL_B"
    assert data["source_format"] == "json"
    assert data["record_count"] == 1
    assert data["records"][0]["source_fields"]["patient_reference"] == "SYN001"
    # Preserves numerical type
    assert data["records"][0]["source_fields"]["value"] == 95


# 5. Valid JSON with multiple records
def test_valid_json_multiple_records():
    sample_path = Path("data/samples/hospital_b.json")
    with open(sample_path, "r", encoding="utf-8") as f:
        payload = json.load(f)

    response = client.post(
        "/api/v1/ingestion/json",
        json=payload,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["source_provider_id"] == "HOSPITAL_B"
    assert data["record_count"] == 5
    assert len(data["records"]) == 5
    assert data["records"][0]["source_fields"]["patient_reference"] == "SYN001"
    assert data["records"][4]["source_fields"]["value"] == 250000


# 6. Equivalent CSV and JSON data produce equivalent source fields
def test_equivalent_csv_and_json_source_fields():
    # Both convey the exact same source fields
    csv_text = "patient_id,test_name,result,unit\nSYN001,Glucose,95,mg/dL\n"
    csv_response = client.post(
        "/api/v1/ingestion/csv",
        headers={"X-Provider-ID": "HOSPITAL_A"},
        files={"file": ("record.csv", csv_text.encode("utf-8"), "text/csv")},
    )
    assert csv_response.status_code == 200
    csv_fields = csv_response.json()["records"][0]["source_fields"]

    json_payload = {
        "source_provider_id": "HOSPITAL_A",
        "records": [
            {
                "patient_id": "SYN001",
                "test_name": "Glucose",
                "result": "95",
                "unit": "mg/dL",
            }
        ],
    }
    json_response = client.post(
        "/api/v1/ingestion/json",
        json=json_payload,
    )
    assert json_response.status_code == 200
    json_fields = json_response.json()["records"][0]["source_fields"]

    # Assert equivalent source field content
    assert csv_fields == json_fields


# 7. Empty CSV is rejected
def test_empty_csv_rejected():
    response = client.post(
        "/api/v1/ingestion/csv",
        headers={"X-Provider-ID": "HOSPITAL_A"},
        files={"file": ("empty.csv", b"", "text/csv")},
    )
    assert response.status_code == 400
    data = response.json()
    assert data["error_code"] == "EMPTY_PAYLOAD"


# 8. Missing CSV headers are rejected
def test_missing_csv_headers_rejected():
    # Only blank lines
    response = client.post(
        "/api/v1/ingestion/csv",
        headers={"X-Provider-ID": "HOSPITAL_A"},
        files={"file": ("no_headers.csv", b"   \n  \n", "text/csv")},
    )
    assert response.status_code == 400
    assert response.json()["error_code"] in ["EMPTY_PAYLOAD", "MALFORMED_PAYLOAD"]

    # Header with empty column name
    bad_header = "patient_id,,unit\nSYN001,100,mg/dL\n"
    response2 = client.post(
        "/api/v1/ingestion/csv",
        headers={"X-Provider-ID": "HOSPITAL_A"},
        files={"file": ("bad_headers.csv", bad_header.encode("utf-8"), "text/csv")},
    )
    assert response2.status_code == 400
    assert response2.json()["error_code"] == "MALFORMED_PAYLOAD"


# 9. Malformed CSV rows are rejected
def test_malformed_csv_rows_rejected():
    # Row has fewer columns than header
    malformed_csv = "patient_id,test_name,result,unit\nSYN001,Glucose\n"
    response = client.post(
        "/api/v1/ingestion/csv",
        headers={"X-Provider-ID": "HOSPITAL_A"},
        files={"file": ("malformed.csv", malformed_csv.encode("utf-8"), "text/csv")},
    )
    assert response.status_code == 400
    data = response.json()
    assert data["error_code"] == "MALFORMED_PAYLOAD"
    assert "Malformed CSV row" in data["message"]


# 10. Invalid JSON is rejected
def test_invalid_json_rejected():
    response = client.post(
        "/api/v1/ingestion/json",
        content=b'{"source_provider_id": "HOSPITAL_B", malformed_json: }',
        headers={"Content-Type": "application/json"},
    )
    assert response.status_code == 400
    data = response.json()
    assert data["error_code"] == "MALFORMED_PAYLOAD"


# 11. Empty record collections are rejected
def test_empty_record_collections_rejected():
    # CSV with headers but no data rows
    csv_header_only = "patient_id,test_name,result,unit\n"
    resp_csv = client.post(
        "/api/v1/ingestion/csv",
        headers={"X-Provider-ID": "HOSPITAL_A"},
        files={"file": ("header_only.csv", csv_header_only.encode("utf-8"), "text/csv")},
    )
    assert resp_csv.status_code == 400
    assert resp_csv.json()["error_code"] == "EMPTY_PAYLOAD"

    # JSON with empty records list
    resp_json = client.post(
        "/api/v1/ingestion/json",
        json={"source_provider_id": "HOSPITAL_B", "records": []},
    )
    assert resp_json.status_code in [400, 422]
    assert resp_json.json()["error_code"] in ["MALFORMED_PAYLOAD", "EMPTY_PAYLOAD", "VALIDATION_ERROR"]


# 12. Unknown provider IDs are rejected
def test_unknown_provider_id_rejected():
    # CSV with unauthorized provider
    csv_content = "patient_id,test_name\nSYN001,Test\n"
    resp_csv = client.post(
        "/api/v1/ingestion/csv",
        headers={"X-Provider-ID": "UNKNOWN_HOSPITAL"},
        files={"file": ("test.csv", csv_content.encode("utf-8"), "text/csv")},
    )
    assert resp_csv.status_code == 400
    assert resp_csv.json()["error_code"] == "INVALID_PROVIDER_ID"

    # JSON with unauthorized provider
    resp_json = client.post(
        "/api/v1/ingestion/json",
        json={
            "source_provider_id": "ROGUE_CLINIC",
            "record": {"patient": "SYN001"},
        },
    )
    assert resp_json.status_code == 400
    assert resp_json.json()["error_code"] == "INVALID_PROVIDER_ID"


# 13. Unsupported file formats are rejected
def test_unsupported_file_formats_rejected():
    # Upload non-csv extension to CSV endpoint
    resp_csv = client.post(
        "/api/v1/ingestion/csv",
        headers={"X-Provider-ID": "HOSPITAL_A"},
        files={"file": ("document.pdf", b"%PDF-1.4 test", "application/pdf")},
    )
    assert resp_csv.status_code == 415
    assert resp_csv.json()["error_code"] == "UNSUPPORTED_MEDIA_TYPE"

    # Send text/plain to JSON endpoint
    resp_json = client.post(
        "/api/v1/ingestion/json",
        content=b"plain text payload",
        headers={"Content-Type": "text/plain"},
    )
    assert resp_json.status_code == 415
    assert resp_json.json()["error_code"] == "UNSUPPORTED_MEDIA_TYPE"


# 14. Oversized uploads are rejected
def test_oversized_uploads_rejected():
    # Create content larger than MAX_UPLOAD_SIZE_BYTES (1 MB = 1048576)
    large_size = settings.MAX_UPLOAD_SIZE_BYTES + 1024
    large_bytes = b"a" * large_size

    resp_csv = client.post(
        "/api/v1/ingestion/csv",
        headers={"X-Provider-ID": "HOSPITAL_A"},
        files={"file": ("huge.csv", large_bytes, "text/csv")},
    )
    assert resp_csv.status_code == 413
    assert resp_csv.json()["error_code"] == "PAYLOAD_TOO_LARGE"

    resp_json = client.post(
        "/api/v1/ingestion/json",
        content=large_bytes,
        headers={"Content-Type": "application/json"},
    )
    assert resp_json.status_code == 413
    assert resp_json.json()["error_code"] == "PAYLOAD_TOO_LARGE"


# 15. Record-count limits are enforced
def test_record_count_limits_enforced():
    max_records = settings.MAX_RECORD_COUNT  # 1000
    
    # Generate CSV with 1001 records
    csv_rows = ["id,value"] + [f"SYN{i},{i}" for i in range(max_records + 1)]
    csv_payload = "\n".join(csv_rows).encode("utf-8")

    resp_csv = client.post(
        "/api/v1/ingestion/csv",
        headers={"X-Provider-ID": "HOSPITAL_A"},
        files={"file": ("limit.csv", csv_payload, "text/csv")},
    )
    assert resp_csv.status_code == 400
    assert resp_csv.json()["error_code"] == "RECORD_LIMIT_EXCEEDED"

    # Generate JSON with 1001 records
    json_records = [{"id": f"SYN{i}", "val": i} for i in range(max_records + 1)]
    resp_json = client.post(
        "/api/v1/ingestion/json",
        json={"source_provider_id": "HOSPITAL_B", "records": json_records},
    )
    assert resp_json.status_code == 400
    assert resp_json.json()["error_code"] == "RECORD_LIMIT_EXCEEDED"


# 16. Server-generated ingestion IDs and timestamps are present
def test_server_generated_metadata_present():
    payload = {
        "source_provider_id": "LAB_C",
        "record": {"patient_id": "SYN999", "marker": "CRP", "value": "2.4"},
    }
    response = client.post("/api/v1/ingestion/json", json=payload)
    assert response.status_code == 200
    data = response.json()

    # Ingestion ID must be a valid UUID
    ingestion_id = data.get("ingestion_id")
    assert ingestion_id is not None
    parsed_uuid = uuid.UUID(ingestion_id)
    assert str(parsed_uuid) == ingestion_id

    # Ingested timestamp must be a valid ISO 8601 string
    ingested_at = data.get("ingested_at")
    assert ingested_at is not None
    # Parse timestamp verifying it contains valid UTC date time
    dt = datetime.fromisoformat(ingested_at.replace("Z", "+00:00"))
    assert dt is not None
    assert data["status"] == "accepted"


# 17. Clinical records are not persisted to a central database or files
def test_no_central_storage_persistence():
    # Inspect workspace before ingestion
    workspace_files_before = set(os.listdir("."))

    # Post an ingestion request
    unique_tag = f"CONFIDENTIAL_RECORD_{uuid.uuid4()}"
    payload = {
        "source_provider_id": "HOSPITAL_B",
        "record": {"secret_field": unique_tag, "val": 42},
    }
    response = client.post("/api/v1/ingestion/json", json=payload)
    assert response.status_code == 200

    # Verify no database files or dumped files were generated in workspace
    workspace_files_after = set(os.listdir("."))
    new_files = workspace_files_after - workspace_files_before
    # Filter out pytest temporary caches if any
    relevant_new_files = [f for f in new_files if not f.startswith(".pytest")]
    assert len(relevant_new_files) == 0

    # Ensure no sqlite, db, or clinical dump files exist in data/ or root
    forbidden_extensions = {".db", ".sqlite", ".sqlite3", ".dump"}
    for root, _, files in os.walk("."):
        if ".venv" in root or ".git" in root:
            continue
        for file in files:
            ext = os.path.splitext(file)[1]
            assert ext not in forbidden_extensions, f"Forbidden database file detected: {file}"


# 18. Error responses and application logs do not expose complete submitted payloads
def test_error_and_log_privacy(caplog):
    caplog.set_level(logging.INFO)
    sensitive_token = "VERY_SENSITIVE_PATIENT_DIAGNOSIS_XYZ123"

    # Malformed JSON containing sensitive token
    malformed_body = f'{{"source_provider_id": "HOSPITAL_B", "secret": "{sensitive_token}", malformed}}'
    response = client.post(
        "/api/v1/ingestion/json",
        content=malformed_body.encode("utf-8"),
        headers={"Content-Type": "application/json"},
    )
    assert response.status_code == 400

    # Check error response does not reflect the sensitive token
    error_text = response.text
    assert sensitive_token not in error_text

    # Check application logs captured do not contain the sensitive token
    for record in caplog.records:
        assert sensitive_token not in record.message


# =========================================================================
# Security & Robustness Hardening Tests
# =========================================================================

# 19. Provider identity: conflicting header and body provider IDs rejected
def test_json_conflicting_provider_ids_rejected():
    response = client.post(
        "/api/v1/ingestion/json",
        headers={"X-Provider-ID": "HOSPITAL_A"},
        json={
            "source_provider_id": "HOSPITAL_B",
            "record": {"patient_reference": "SYN001", "val": 99},
        },
    )
    assert response.status_code == 400
    data = response.json()
    assert data["error_code"] == "INVALID_PROVIDER_ID"
    assert "Conflicting provider IDs" in data["message"]


# 20. Provider identity: matching header and body provider IDs accepted
def test_json_matching_provider_ids_accepted():
    response = client.post(
        "/api/v1/ingestion/json",
        headers={"X-Provider-ID": "HOSPITAL_B"},
        json={
            "source_provider_id": "HOSPITAL_B",
            "record": {"patient_reference": "SYN001", "val": 99},
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["source_provider_id"] == "HOSPITAL_B"


# 21. Provider identity: header-only provider ID accepted
def test_json_header_only_provider_id_accepted():
    response = client.post(
        "/api/v1/ingestion/json",
        headers={"X-Provider-ID": "LAB_C"},
        json={
            "record": {"patient_reference": "SYN001", "marker": "CRP"},
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["source_provider_id"] == "LAB_C"


# 22. Provider identity: body-only provider ID accepted
def test_json_body_only_provider_id_accepted():
    response = client.post(
        "/api/v1/ingestion/json",
        json={
            "source_provider_id": "LAB_C",
            "record": {"patient_reference": "SYN001", "marker": "CRP"},
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["source_provider_id"] == "LAB_C"


# 23. Provider identity: CSV conflicting header and form provider IDs rejected
def test_csv_conflicting_provider_ids_rejected():
    csv_content = "patient_id,test_name,result,unit\nSYN001,Glucose,95,mg/dL\n"
    response = client.post(
        "/api/v1/ingestion/csv",
        headers={"X-Provider-ID": "HOSPITAL_A"},
        data={"provider_id": "HOSPITAL_B"},
        files={"file": ("record.csv", csv_content.encode("utf-8"), "text/csv")},
    )
    assert response.status_code == 400
    data = response.json()
    assert data["error_code"] == "INVALID_PROVIDER_ID"
    assert "Conflicting provider IDs" in data["message"]


# 24. Incremental JSON streaming: oversized payload without Content-Length rejected
def test_oversized_json_without_content_length():
    def chunk_generator():
        # Yield two 600KB chunks -> 1.2MB total > 1MB MAX_UPLOAD_SIZE_BYTES
        yield b'{"source_provider_id": "HOSPITAL_B", "records": [{"data": "'
        yield b'A' * (600 * 1024)
        yield b'B' * (600 * 1024)
        yield b'"}]}'

    response = client.post(
        "/api/v1/ingestion/json",
        content=chunk_generator(),
        headers={"Content-Type": "application/json"},
    )
    assert response.status_code == 413
    data = response.json()
    assert data["error_code"] == "PAYLOAD_TOO_LARGE"


# 25. Incremental JSON streaming: oversized payload with fraudulent Content-Length rejected
def test_oversized_json_with_fraudulent_content_length():
    def chunk_generator():
        yield b'{"source_provider_id": "HOSPITAL_B", "records": [{"data": "'
        yield b'X' * (settings.MAX_UPLOAD_SIZE_BYTES + 500)
        yield b'"}]}'

    # Claim Content-Length is small (e.g., 50 bytes), but stream large content
    response = client.post(
        "/api/v1/ingestion/json",
        content=chunk_generator(),
        headers={
            "Content-Type": "application/json",
            "Content-Length": "50",
        },
    )
    assert response.status_code == 413
    data = response.json()
    assert data["error_code"] == "PAYLOAD_TOO_LARGE"


# 26. CSV duplicate header names rejected (exact match)
def test_csv_duplicate_headers_exact_rejected():
    bad_csv = "patient_id,test_name,patient_id\nSYN001,Glucose,SYN001\n"
    response = client.post(
        "/api/v1/ingestion/csv",
        headers={"X-Provider-ID": "HOSPITAL_A"},
        files={"file": ("dup.csv", bad_csv.encode("utf-8"), "text/csv")},
    )
    assert response.status_code == 400
    data = response.json()
    assert data["error_code"] == "MALFORMED_PAYLOAD"
    assert "Duplicate CSV header detected" in data["message"]


# 27. CSV duplicate header names rejected (case-insensitive and trimmed whitespace)
def test_csv_duplicate_headers_case_insensitive_rejected():
    bad_csv = "patient_id,test_name, PATIENT_ID \nSYN001,Glucose,SYN001\n"
    response = client.post(
        "/api/v1/ingestion/csv",
        headers={"X-Provider-ID": "HOSPITAL_A"},
        files={"file": ("dup_case.csv", bad_csv.encode("utf-8"), "text/csv")},
    )
    assert response.status_code == 400
    data = response.json()
    assert data["error_code"] == "MALFORMED_PAYLOAD"
    assert "Duplicate CSV header detected" in data["message"]


# 28. CSV strict parsing: malformed quoting rejected
def test_csv_malformed_quoting_strict_rejected():
    # Quotes improperly placed inside field
    malformed_quote_csv = 'patient_id,test_name,result,unit\nSYN001,"Fast"ing Glucose,95,mg/dL\n'
    response = client.post(
        "/api/v1/ingestion/csv",
        headers={"X-Provider-ID": "HOSPITAL_A"},
        files={"file": ("bad_quote.csv", malformed_quote_csv.encode("utf-8"), "text/csv")},
    )
    assert response.status_code == 400
    data = response.json()
    assert data["error_code"] == "MALFORMED_PAYLOAD"
    assert "CSV format parsing error" in data["message"]
