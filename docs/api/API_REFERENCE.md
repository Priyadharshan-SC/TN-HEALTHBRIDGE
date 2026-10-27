# TN HealthBridge — API Reference Manual

## 1. Overview & Interactive OpenAPI Documentation

TN HealthBridge exposes a RESTful HTTP API built with FastAPI. All endpoints reside under the `/api/v1` prefix (except the `/health` endpoint).

### Interactive Swagger & OpenAPI Schema
When the application is running, authoritative interactive documentation is automatically served at:
- **Swagger UI:** `http://127.0.0.1:8000/docs`
- **ReDoc UI:** `http://127.0.0.1:8000/redoc`
- **OpenAPI JSON Schema:** `http://127.0.0.1:8000/openapi.json`

---

## 2. Global Conventions

- **Content Types:** All endpoints accept and return `application/json`, except `POST /api/v1/ingestion/csv` which accepts `multipart/form-data`.
- **Stateless Operation:** Requests are processed purely in-memory; no central clinical database is created or modified.
- **Privacy Safe Errors:** Validation errors (HTTP 422) and domain errors (HTTP 400, 413, 415) return sanitized messages that never echo raw clinical values or unredacted patient identifiers.

---

## 3. Endpoints

### 3.1 Service Health Check

`GET /health`

- **Purpose:** Verifies that the service is running and identifies active modules without exposing sensitive internal state.
- **Request Parameters:** None.
- **Response Model:** JSON object (`status: "healthy"`).
- **Representative Response:**
  ```json
  {
    "status": "healthy",
    "service": "TN HealthBridge",
    "module": "M1_DATA_INGESTION",
    "modules": [
      "M1_DATA_INGESTION",
      "M2_DATA_NORMALIZATION",
      "M3_CLINICAL_TERMINOLOGY_MAPPING",
      "M4_PATIENT_IDENTITY_SAFETY"
    ]
  }
  ```

---

### 3.2 Ingest CSV Clinical Records

`POST /api/v1/ingestion/csv`

- **Purpose:** Ingests tabular CSV clinical records from an uploaded file, validates column count and unique headers, attaches provenance metadata, and outputs standardized records.
- **Content-Type:** `multipart/form-data`
- **Parameters:**
  - `file` (*required, file upload*): Valid `.csv` file.
  - `X-Provider-ID` (*optional header*): Source healthcare provider (e.g. `HOSPITAL_A`).
  - `provider_id` (*optional form field*): Alternative provider ID form field.
- **Validation & Limits:**
  - Max file upload size: 1 MB (`MAX_UPLOAD_SIZE_BYTES = 1,048,576`).
  - Strict CSV quote checking; duplicate header columns rejected.
  - Conflicting header vs form provider IDs rejected with `400 Bad Request`.
- **Response Model:** `IngestionResponse`
- **Representative Response:**
  ```json
  {
    "ingestion_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
    "source_provider_id": "HOSPITAL_A",
    "source_format": "csv",
    "ingested_at": "2026-10-27T10:00:00Z",
    "record_count": 2,
    "records": [
      {
        "record_index": 0,
        "source_data": {
          "patient_id": "SYN_PATIENT_001",
          "test_name": "Fasting Blood Glucose",
          "result": "110",
          "unit": "mg/dL",
          "timestamp": "2026-03-29"
        }
      }
    ]
  }
  ```

---

### 3.3 Ingest JSON Clinical Records

`POST /api/v1/ingestion/json`

- **Purpose:** Ingests structured JSON clinical records, validates payload structure and provider ID, bounds stream memory, and wraps records in an ingestion envelope.
- **Content-Type:** `application/json`
- **Parameters:**
  - `X-Provider-ID` (*optional header*): Source healthcare provider (e.g. `HOSPITAL_B`).
  - Request Body (*required*): `JsonIngestionRequest` containing `source_provider_id` (optional if header present) and `records` array.
- **Batch Limits:** 1 to 1,000 records (`MAX_RECORD_COUNT`).
- **Representative Request:**
  ```json
  {
    "source_provider_id": "HOSPITAL_B",
    "records": [
      {
        "patient_reference": "SYN_PATIENT_002",
        "investigation": "Hemoglobin A1c",
        "value": 5.8,
        "unit": "%",
        "timestamp": "2026-03-29T11:00:00Z"
      }
    ]
  }
  ```
- **Response Model:** `IngestionResponse`

---

### 3.4 Normalize Ingested Records

`POST /api/v1/normalization/process`

- **Purpose:** Maps source-specific keys into the canonical laboratory schema (`CanonicalLabRecord`), normalizes types and ISO-8601 datetimes, preserves unmapped attributes, and assigns tri-state quality scoring (`valid`, `warning`, `rejected`).
- **Content-Type:** `application/json`
- **Request Model:** `IngestionResponse` envelope from M1.
- **Response Model:** `NormalizationResponse`
- **Representative Response:**
  ```json
  {
    "batch_id": "7b2c01e8-7821-4f10-b99d-83f6fa38b25a",
    "ingestion_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
    "source_provider_id": "HOSPITAL_B",
    "source_format": "json",
    "total_records": 1,
    "valid_records": 1,
    "warning_records": 0,
    "rejected_records": 0,
    "records": [
      {
        "record_index": 0,
        "canonical": {
          "patient_reference": "SYN_PATIENT_002",
          "test_name": "Hemoglobin A1c",
          "result": 5.8,
          "unit": "%",
          "observed_at": "2026-03-29T11:00:00Z",
          "specimen": null
        },
        "source_data": { ... },
        "unmapped_fields": {},
        "quality_status": "valid",
        "issues": []
      }
    ]
  }
  ```

---

### 3.5 Map Clinical Terminology

`POST /api/v1/terminology/map`

- **Purpose:** Maps normalized test names to verified LOINC or synthetic concepts using an explicit local registry. Evaluates specimen and unit constraints, applies upstream quality guardrails, and classifies uncertainty.
- **Content-Type:** `application/json`
- **Request Model:** `NormalizationResponse` envelope from M2.
- **Response Model:** `TerminologyBatchResponse`
- **Representative Response:**
  ```json
  {
    "batch_id": "9a1c02e1-4567-4a11-b88d-12f6fa38b111",
    "normalization_batch_id": "7b2c01e8-7821-4f10-b99d-83f6fa38b25a",
    "source_provider_id": "HOSPITAL_B",
    "total_records": 1,
    "mapped_records": 1,
    "ambiguous_records": 0,
    "review_required_records": 0,
    "unmapped_records": 0,
    "records": [
      {
        "record_index": 0,
        "canonical": { ... },
        "quality_status": "valid",
        "quality_issues": [],
        "terminology_mapping": {
          "status": "mapped",
          "target_system": "http://loinc.org",
          "target_code": "4548-4",
          "target_display": "Hemoglobin A1c/Hemoglobin.total in Blood",
          "terminology_version": "2.76",
          "mapping_id": "MAP-LOINC-002",
          "reason_code": "EXACT_MATCH",
          "review_required": false,
          "candidate_mappings": []
        }
      }
    ]
  }
  ```

---

### 3.6 Assess Patient Identity Linkage Safety

`POST /api/v1/identity/assess`

- **Purpose:** Evaluates pairs of synthetic patient references in cross-provider exchange workflows. Enforces provider scoping, requires authorized synthetic linkage tokens for positive linkage, and flags conflicts for human review without merging records.
- **Content-Type:** `application/json`
- **Request Model:** `IdentityAssessmentBatchRequest`
- **Response Model:** `IdentityAssessmentResponse`
- **Representative Request:**
  ```json
  {
    "comparisons": [
      {
        "comparison_id": "CMP-001",
        "left_reference": {
          "source_provider_id": "HOSPITAL_A",
          "patient_reference": "SYN_PATIENT_001",
          "identity_token": "SYN_LINK_TOKEN_ALPHA_001",
          "demographics": {
            "full_name": "Ravi Kumar",
            "date_of_birth": "1985-06-15",
            "gender": "male"
          }
        },
        "right_reference": {
          "source_provider_id": "HOSPITAL_B",
          "patient_reference": "SYN_PATIENT_002",
          "identity_token": "SYN_LINK_TOKEN_ALPHA_001",
          "demographics": {
            "full_name": "Ravi Kumar",
            "date_of_birth": "1985-06-15",
            "gender": "male"
          }
        }
      }
    ]
  }
  ```
- **Representative Response:**
  ```json
  {
    "batch_id": "8e4d2a1b-3c4d-4e5f-a6b7-c8d9e0f1a2b3",
    "total_comparisons": 1,
    "same_identity_count": 1,
    "different_identity_count": 0,
    "possible_match_count": 0,
    "review_required_count": 0,
    "unresolved_count": 0,
    "evaluations": [
      {
        "comparison_id": "CMP-001",
        "outcome": "same_identity",
        "confidence": 1.0,
        "reason_code": "STRONG_TOKEN_MATCH",
        "details": "Authorized synthetic linkage fixture verified across distinct provider contexts without demographic conflicts."
      }
    ]
  }
  ```
