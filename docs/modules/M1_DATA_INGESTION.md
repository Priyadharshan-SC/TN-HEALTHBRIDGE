# M1 — Data Ingestion Layer Specification

## 1. Module Overview

The **Data Ingestion Layer (M1)** is the gateway for external clinical datasets entering the TN HealthBridge framework. It provides secure transport ingestion, strict structural and syntactic validation, stream size bounding, and provenance metadata attachment.

M1 ingests raw laboratory observation data from heterogeneous healthcare organizations without forcing providers to alter their legacy file generation pipelines, and outputs a standardized internal ingestion envelope.

---

## 2. Responsibilities and Non-Goals

### Core Responsibilities
- **Multi-Format Parsing:** Ingests tabular CSV data (`multipart/form-data`) and structured JSON payloads (`application/json`).
- **Stream Protection:** Protects server memory by enforcing a 1 MB stream size cap (`MAX_UPLOAD_SIZE_BYTES`) incrementally without buffering unbounded payloads.
- **Syntactic & Structural Validation:**
  - Strictly enforces CSV quoting standards, column count consistency, and rejects duplicate column headers (case-insensitively).
  - Validates JSON record collections, rejecting malformed syntax, empty record sets, and payloads exceeding record count limits (`MAX_RECORD_COUNT = 1,000`).
- **Provider Scoping & Provenance:** Verifies caller-declared provider identifiers against a configured allowlist, enforces header/body consistency, and mints an immutable provenance envelope (`ingestion_id` UUIDv4, UTC ISO-8601 `ingested_at`).
- **Lossless Field Preservation:** Retains all raw keys, string values, and native primitive types losslessly for downstream normalization.

### Non-Goals & Boundaries
- **No Provider Authentication:** M1 validates provider identifiers against a configured allowlist (`ALLOWED_PROVIDERS`), but does **not** perform cryptographic authentication, mTLS validation, or digital signature verification. Caller identity is unauthenticated in this research prototype.
- **No Clinical Semantic Validation:** M1 does not validate medical ranges, units, or clinical coding (delegated to M2 and M3).
- **No Central Persistence:** Payloads are processed in-memory and returned immediately in the HTTP response; no database or disk file is retained.

---

## 3. Supported Input Formats & Provider Profiles

| Provider Identifier | Native Format | Supported Ingestion Route | Input Transport | Format Characteristics |
| :--- | :---: | :--- | :--- | :--- |
| `HOSPITAL_A` | CSV | `POST /api/v1/ingestion/csv` | `multipart/form-data` | Comma-delimited text, UTF-8/UTF-8-BOM, header row required. |
| `HOSPITAL_B` | JSON | `POST /api/v1/ingestion/json` | `application/json` | JSON object containing `records` array or single record. |
| `LAB_C` | JSON | `POST /api/v1/ingestion/json` | `application/json` | Multi-record JSON payload with diagnostic observation fields. |

---

## 4. Ingestion Endpoints & Contracts

### 4.1 CSV Ingestion: `POST /api/v1/ingestion/csv`
- **Request Parameters:**
  - `file`: CSV file upload (`UploadFile`).
  - `X-Provider-ID` (Optional Header): Source provider ID (e.g., `HOSPITAL_A`).
  - `provider_id` (Optional Form Field): Alternative form field for provider ID.
- **Provider Resolution Rule:** If both header and form parameter are supplied, they must match identically. Conflicting values trigger `400 Bad Request` with `INVALID_PROVIDER_ID`.
- **Validation Rules:**
  - File extension must be `.csv`.
  - Stream terminates immediately if cumulative bytes exceed `MAX_UPLOAD_SIZE_BYTES` (1,048,576 bytes).
  - Empty files or headers without data rows trigger `400 Bad Request` (`EMPTY_PAYLOAD`).
  - Duplicate header column names (e.g., `patient_id,test_name,patient_id`) trigger `400 Bad Request` (`MALFORMED_PAYLOAD`).
  - Inconsistent row column counts trigger `400 Bad Request` (`MALFORMED_PAYLOAD`).

### 4.2 JSON Ingestion: `POST /api/v1/ingestion/json`
- **Request Parameters:**
  - Request Body: JSON object matching `JsonIngestionRequest`.
  - `X-Provider-ID` (Optional Header): Source provider ID (e.g., `HOSPITAL_B`).
- **Body Schema (`JsonIngestionRequest`):**
  ```json
  {
    "source_provider_id": "HOSPITAL_B",
    "records": [
      {
        "patient_reference": "SYN_PAT_001",
        "investigation": "Fasting Blood Glucose",
        "value": 110.0,
        "unit": "mg/dL",
        "timestamp": "2026-03-29T08:30:00Z"
      }
    ]
  }
  ```
- **Validation Rules:**
  - `Content-Type` must be `application/json`.
  - Payload size strictly bounded by incremental stream reader.
  - If header and body provider IDs are both present, they must match.
  - Record count must be between 1 and 1,000 records.

---

## 5. Ingestion Response Structure (`IngestionResponse`)

```json
{
  "ingestion_id": "550e8400-e29b-41d4-a716-446655440000",
  "source_provider_id": "HOSPITAL_B",
  "source_format": "json",
  "ingested_at": "2026-10-27T10:00:00Z",
  "record_count": 1,
  "records": [
    {
      "record_index": 0,
      "source_data": {
        "patient_reference": "SYN_PAT_001",
        "investigation": "Fasting Blood Glucose",
        "value": 110.0,
        "unit": "mg/dL",
        "timestamp": "2026-03-29T08:30:00Z"
      }
    }
  ]
}
```

---

## 6. Error Handling

Domain exceptions derive from `IngestionException` and map to standardized JSON responses:

| Error Code | HTTP Status | Trigger Condition |
| :--- | :---: | :--- |
| `INVALID_PROVIDER_ID` | 400 | Provider ID missing, not in `ALLOWED_PROVIDERS`, or conflicting between header and body. |
| `EMPTY_PAYLOAD` | 400 | Uploaded file or JSON body contains zero records or only empty lines. |
| `MALFORMED_PAYLOAD` | 400 | Unclosed quotes in CSV, unequal row lengths, duplicate headers, or unparseable JSON. |
| `UNSUPPORTED_MEDIA_TYPE` | 415 | File extension is not `.csv` or `Content-Type` is not `application/json`. |
| `PAYLOAD_TOO_LARGE` | 413 | Cumulative payload stream exceeds 1,048,576 bytes. |
| `RECORD_COUNT_EXCEEDED` | 400 | Number of records exceeds `MAX_RECORD_COUNT` (1,000). |

---

## 7. Security and Privacy

- **Sanitized Logging:** Ingestion logs record only the provider ID, record count, and byte volume. Raw patient identifiers and clinical test values are never emitted in logs.
- **Temporary File Disposal:** Starlette's `UploadFile` utilizes `SpooledTemporaryFile`. Any spooled OS file descriptor is explicitly closed in a `finally` block, guaranteeing immediate disposal.
