# M3 — Clinical Terminology Mapping Layer Specification

## 1. Module Overview

The **Clinical Terminology Mapping Layer (M3)** consumes standardized, quality-scored batch outputs from **M2 (Data Quality and Normalization)** and maps local investigation names deterministically to standard clinical terminology concepts (e.g., LOINC) using an explicit, versioned local registry.

M3 evaluates biological specimen constraints and unit constraints, surfaces ambiguities and conflicts as explicit uncertainty classifications, enforces an upstream quality guardrail for M2-rejected records, and produces enriched records without modifying raw source data or creating a central clinical database.

---

## 2. Terminology Mapping Policies & Uncertainty Model

### 2.1 Conservative Determinism: No Fuzzy Matching
- **Zero Fuzzy Equivalences:** M3 strictly forbids approximate string matching, phonetic heuristics, or probabilistic embeddings. Clinical test names that appear similar (e.g., `"Blood Glucose"` vs `"Urine Glucose"` or `"Fasting Glucose"` vs `"Postprandial Glucose"`) are never automatically equated.
- **Zero Automatic Unit Conversions:** M3 does not automatically convert values across measurement properties (e.g., converting mass concentration `mg/dL` to substance concentration `mmol/L` or `umol/L`). If a unit conflicts with a concept's defined measurement property, the mapping is withheld and routed to clinical review.

### 2.2 Resolution Hierarchy
1. **Exact Configured Match:** Case-insensitive, whitespace-trimmed match of `test_name` against registered `source_test_name`. Provider-specific mappings take strict precedence over global mappings.
2. **Exact Configured Alias Match:** Matches against explicitly declared `source_aliases`.
3. **Contextual Constraint Evaluation:**
   - **Specimen Constraints:** If the candidate mapping specifies allowed `specimen_constraints`, the record's `specimen` must match one of the allowed values. If missing and `require_specimen` is `True`, routed to review with `MISSING_REQUIRED_SPECIMEN`. If conflicting, routed to review with `SPECIMEN_MISMATCH`.
   - **Unit Constraints:** If the candidate specifies `unit_constraints`, the record's `unit` must match. If missing and `require_unit` is `True`, routed to review with `MISSING_REQUIRED_UNIT`. If conflicting, routed to review with `UNIT_MISMATCH`.
   - **Simultaneous Mismatch:** If both specimen and unit conflict, routed with `CONTEXT_MISMATCH`.
   - **Explicit Human Review Flag:** If candidate entry has `human_review_required = True`, routed with `EXPLICIT_REVIEW_FLAG`.
4. **Upstream Quality Guardrail (M2-Rejected Policy):** If the incoming M2 record has `quality_status = "rejected"`, standard terminology assignment is withheld (`target_code = None`). The mapping outcome is assigned `review_required` with reason code `UPSTREAM_QUALITY_REJECTION` and candidate mappings preserved in `candidate_mappings` for clinical review.
5. **Unambiguous Resolution:** Exactly one candidate passes all checks and record is not rejected -> `mapped`.
6. **Ambiguity Handling:** Multiple candidate concepts remain compatible -> `ambiguous` (`target_code = None`).
7. **No Match Found:** No configured test name or alias matches -> `unmapped`.

---

## 3. Mapping Classification Outcomes

| Mapping Status | Target Assigned? | Review Required? | Description |
| :--- | :---: | :---: | :--- |
| `mapped` | **Yes** | No | Unambiguous, contextually compatible match to a verified standard concept. |
| `ambiguous` | No | **Yes** | Multiple candidate concepts match the test name without sufficient context to disambiguate. |
| `review_required` | No | **Yes** | Context conflict (specimen or unit mismatch), explicit review flag, or upstream M2 rejection guardrail. |
| `unmapped` | No | No / Policy | Test name not recognized in local registry. Preserved for vendor profile expansion. |

### Terminology Reason Codes
- `EXACT_MATCH`
- `ALIAS_MATCH`
- `PROVIDER_SPECIFIC_MATCH`
- `SPECIMEN_MISMATCH`
- `UNIT_MISMATCH`
- `CONTEXT_MISMATCH`
- `MISSING_REQUIRED_SPECIMEN`
- `MISSING_REQUIRED_UNIT`
- `EXPLICIT_REVIEW_FLAG`
- `UPSTREAM_QUALITY_REJECTION`
- `MULTIPLE_CANDIDATE_MATCHES`
- `NO_CONFIGURED_MAPPING`

---

## 4. Local Terminology Registry Configuration

Mappings reside in `data/terminology/default_registry.json` (`registry_version: "1.0.0"`).

### Verified Standard LOINC Concepts
The following LOINC concepts have been verified for mass-concentration/substance property compatibility in the default registry:

| Mapping ID | Source Concept | Verified LOINC Code | Verified Target Display | Property & Units |
| :--- | :--- | :---: | :--- | :--- |
| `MAP-LOINC-001` | Fasting Blood Glucose | `1558-6` | Fasting glucose [Mass/volume] in Serum or Plasma | Mass conc (`mg/dL`). Excludes `mmol/L` (14771-0). |
| `MAP-LOINC-002` | Hemoglobin A1c | `4548-4` | Hemoglobin A1c/Hemoglobin.total in Blood | Mass fraction (`%`, NGSP). Excludes `mmol/mol` (59261-8). |
| `MAP-LOINC-003` | Serum Creatinine | `2160-0` | Creatinine [Mass/volume] in Serum or Plasma | Mass conc (`mg/dL`). Excludes `umol/L` (14682-9). |
| `MAP-LOINC-004` | Total Cholesterol | `2093-3` | Cholesterol [Mass/volume] in Serum or Plasma | Mass conc (`mg/dL`). Excludes `mmol/L` (14647-2). |
| `MAP-LOINC-005` | Serum Potassium | `2823-3` | Potassium [Moles/volume] in Serum or Plasma | Substance conc (`mEq/L`, `mmol/L`). |
| `MAP-LOINC-006` | Platelet Count | `777-3` | Platelets [#/volume] in Blood by Automated count | Number conc (`10*3/uL`, `cells/uL`, `/uL`). |

### Synthetic Clinical Test Concepts
The registry also includes synthetic concepts (`SYN_LOINC_...`) used specifically to test contextual disambiguation, explicit human review flags, and edge cases in automated testing. These are clearly tagged with system `"http://tnhealthbridge.local/terminology/synthetic"`.

---

## 5. API Endpoint: `POST /api/v1/terminology/map`

- **Request Body:** Standard `NormalizationResponse` envelope from M2.
- **Batch Limits:** Bounded by `MAX_RECORD_COUNT` (1,000 records). Requires non-empty record collections.
- **Response Structure (`TerminologyBatchResponse`):**
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
        "source_data": { ... },
        "unmapped_fields": {},
        "quality_status": "valid",
        "quality_issues": [],
        "terminology_mapping": {
          "status": "mapped",
          "target_system": "http://loinc.org",
          "target_code": "1558-6",
          "target_display": "Fasting glucose [Mass/volume] in Serum or Plasma",
          "terminology_version": "2.76",
          "mapping_id": "MAP-LOINC-001",
          "reason_code": "EXACT_MATCH",
          "review_required": false,
          "candidate_mappings": []
        }
      }
    ]
  }
  ```

---

## 6. Operational Limitations
- **No Direct Terminology Server Integration:** Uses a fast, in-memory versioned JSON registry. Does not query external FHIR Terminology Services (e.g., Ontoserver) over the network.
- **No Cross-Property Conflation:** Strict measurement property separation prevents dangerous clinical misinterpretations between molar and mass concentrations.
