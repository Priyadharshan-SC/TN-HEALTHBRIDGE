# M2 — Data Quality and Normalization Layer Specification

## 1. Module Overview

The **Data Quality and Normalization Layer (M2)** receives standardized ingestion responses from **M1**, projects heterogeneous provider field names into a canonical laboratory schema (`CanonicalLabRecord`), performs strict datatype and timestamp normalization, evaluates record-level quality issues, and assigns a tri-state quality classification (`valid`, `warning`, `rejected`).

M2 enforces data quality and structural predictability without modifying raw source evidence or creating a persistent clinical database.

---

## 2. Canonical Laboratory Record Schema

All incoming records are normalized into the `CanonicalLabRecord` structure:

| Canonical Field | Type | Required? | Normalization Rules & Constraints |
| :--- | :--- | :---: | :--- |
| `patient_reference` | `str` | **Yes** | Local patient identifier. Stripped of whitespace. Cannot be empty or null. |
| `test_name` | `str` | **Yes** | Clinical test name or investigation. Preserved as non-empty string. |
| `result` | `Union[int, float, str]` | **Yes** | Coerced to `int` or `float` if unambiguously numeric. Qualitative results (e.g., `"Negative"`, `"Reactive"`) preserved as strings. Booleans (`True`/`False`), `NaN`, `Infinity`, and overflow strings (e.g. `"1e999"`) are strictly rejected. |
| `unit` | `Optional[str]` | Optional | Unit of measure (e.g., `"mg/dL"`). Preserved verbatim. Missing units generate a quality warning. |
| `observed_at` | `Optional[str]` | Optional | Observation timestamp. Normalized to ISO-8601. Date-only values (`YYYY-MM-DD`) are preserved strictly without fabricating artificial time components (`T00:00:00`). Missing timestamps are permitted as `None`. |
| `specimen` | `Optional[str]` | Optional | Biological specimen type (e.g., `"Serum"`, `"Whole Blood"`). Preserved if supplied. |

---

## 3. Provider Field Mapping Configurations

M2 references provider profiles defined in `app/core/normalization_config.py` to resolve vendor-specific field names:

| Canonical Field | Hospital A (`HOSPITAL_A`) | Hospital B (`HOSPITAL_B`) | Lab C (`LAB_C`) |
| :--- | :--- | :--- | :--- |
| `patient_reference` | `patient_id` | `patient_reference` | `patient_id` / `patient_reference` |
| `test_name` | `test_name` | `investigation` | `marker` / `test_name` / `investigation` |
| `result` | `result` | `value` | `value` / `result` |
| `unit` | `unit` | `unit` | `units` / `unit` |
| `observed_at` | `timestamp` | `timestamp` | `collected_at` / `timestamp` |
| `specimen` | `specimen` | `specimen` | `sample_type` / `specimen` |

### Unmapped Fields & Source Preservation
- Any field in the source record not mapped to a canonical field is preserved losslessly in the `unmapped_fields` dictionary.
- The complete raw source payload is preserved verbatim in `source_data`.
- This ensures zero loss of clinical context during normalization.

---

## 4. Normalization Policies & Edge-Case Handling

### 4.1 Alias Conflict Resolution
When multiple candidate aliases exist for a canonical field (e.g., a record containing both `marker` and `test_name`):
- If the values are identical, the value is accepted.
- If the values conflict and the field is **required**, the record is **rejected** with issue code `CONFLICTING_REQUIRED_ALIASES`.
- If the values conflict and the field is **optional**, the field is set to `None` and assigned a **warning** with `CONFLICTING_OPTIONAL_ALIASES`.

### 4.2 Numeric Validation & Extreme Numbers
- Unambiguous integer strings (e.g., `"110"`) are coerced to `int`.
- Unambiguous decimal strings (e.g., `"5.8"`) are coerced to `float`.
- Scientific notation (e.g., `"1.2e-4"`) is safely parsed to `float`.
- Float overflow strings (e.g., `"1e999"`), `inf`, `-inf`, and `nan` are rejected with `INVALID_NUMERIC_RESULT`.
- Boolean values (`True`, `False`) are explicitly rejected and not cast to `1` or `0`.

### 4.3 Timestamp Normalization
- Supported formats: ISO-8601 (`YYYY-MM-DDTHH:MM:SSZ`, with or without UTC offsets) and date-only (`YYYY-MM-DD`).
- **No Artificial Precision:** Date-only strings are kept as `YYYY-MM-DD` and are never expanded with artificial midnight timestamps or guessed time zones.
- Ambiguous or unparseable timestamps produce a quality warning (`INVALID_TIMESTAMP_FORMAT`), preserving the original raw string in `unmapped_fields`.

---

## 5. Quality Status Classification

Each normalized record receives a quality outcome:

| Quality Status | Criteria | Downstream Usability |
| :--- | :--- | :--- |
| `valid` | All required fields present; numeric and timestamp fields normalized; zero warnings. | Fully usable for downstream processing and terminology mapping. |
| `warning` | Record is clinically interpretable, but contains non-fatal issues (missing optional unit, unrecognized vendor keys in `unmapped_fields`, or date format warnings). | Usable, but flags require clinical awareness. |
| `rejected` | Missing required fields (`patient_reference`, `test_name`, `result`), invalid numeric representation, unparseable data, or conflicting required aliases. | Unusable for clinical decisions; downstream terminology mapping is withheld. |

### Quality Issue Codes
- `MISSING_REQUIRED_PATIENT_REFERENCE`
- `MISSING_REQUIRED_TEST_NAME`
- `MISSING_REQUIRED_RESULT`
- `INVALID_NUMERIC_RESULT`
- `INVALID_TIMESTAMP_FORMAT`
- `MISSING_OPTIONAL_UNIT`
- `UNMAPPED_FIELDS_PRESENT`
- `CONFLICTING_REQUIRED_ALIASES`
- `CONFLICTING_OPTIONAL_ALIASES`

---

## 6. API Endpoint: `POST /api/v1/normalization/process`

- **Request Body:** Standard `IngestionResponse` envelope from M1.
- **Batch Limits:** Processing is capped at `MAX_RECORD_COUNT` (1,000 records).
- **Response Structure (`NormalizationResponse`):**
  ```json
  {
    "batch_id": "7b2c01e8-7821-4f10-b99d-83f6fa38b25a",
    "ingestion_id": "550e8400-e29b-41d4-a716-446655440000",
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
          "patient_reference": "SYN_PAT_001",
          "test_name": "Fasting Blood Glucose",
          "result": 110.0,
          "unit": "mg/dL",
          "observed_at": "2026-03-29T08:30:00Z",
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

## 7. Operational Limitations
- **No Persistence:** M2 operations are strictly in-memory; records are never written to disk or database.
- **Not a Full LIS Validation Engine:** M2 checks structural and syntactical data quality. It does not validate biological reference ranges or assess patient clinical diagnosis.
