# M4 — Patient Identity Safety & Uncertainty-Aware Linkage Layer Specification

## 1. Module Overview

The **Patient Identity Safety and Uncertainty-Aware Linkage Layer (M4)** evaluates pairs of synthetic patient references in simulated cross-provider data exchange workflows to determine whether records can be safely associated.

M4 treats local patient references as provider-scoped, demands explicitly authorized synthetic fixture trust-binding for positive linkage, escalates demographic conflicts directly to human review, and explicitly forbids automated record merging or persistent identity indexing.

---

## 2. Core Architectural Principles

1. **Provider-Scoped Identifiers:** Local hospital identifiers (e.g., Medical Record Numbers) are not unique across institutions. `SYN_PATIENT_001` at `HOSPITAL_A` and `SYN_PATIENT_001` at `HOSPITAL_B` are treated as distinct individuals by default. They are never equated merely because the identifier strings match.
2. **Synthetic Fixture Trust-Binding:** Strong linkage (`same_identity`) requires an authorized synthetic linkage token bound directly to the synthetic subject configured to represent both provider references. Arbitrary or unconfigured tokens cannot trigger positive linkage.
3. **No Standalone Demographic Matching:** Matching names, dates of birth, or gender can produce at most `possible_match`, never a confident `same_identity` association.
4. **Conflict Escalation:** Any contradiction (e.g., matching tokens with conflicting dates of birth or names) routes unconditionally to `review_required`.
5. **Zero Record Merging & Zero Persistence:** M4 does not merge clinical records, rewrite patient IDs, or maintain a persistent database or cross-hospital patient index. All evaluations are stateless and in-memory.
6. **Synthetic Scope Notice:** All tokens, patient references, and fixtures are test constructs. They are **not** Ayushman Bharat Health Account (ABHA) addresses, national identifiers, or production credentials.

---

## 3. Authoritative Synthetic Registries & Startup Integrity

M4 relies on two configuration files validated at application startup (`app/core/identity_config.py`):

1. **Synthetic Identity Registry (`data/identity/synthetic_identity_registry.json`):**
   - Declares the authoritative list of synthetic subjects, their provider-scoped references (`(source_provider_id, patient_reference)`), and registered demographic baselines.
   - **Global Uniqueness Rule:** A provider-scoped reference can belong to exactly one synthetic subject. Any duplicate assignment across subjects causes startup validation failure (`RegistryIntegrityError`).
   - **Provider Allowlist Enforcement:** Every referenced provider must exist in `ALLOWED_PROVIDERS`.
2. **Synthetic Linkage Fixtures (`data/identity/synthetic_linkage_fixtures.json`):**
   - Defines explicitly authorized linkage tokens (`SYN_LINK_TOKEN_...`) bound to specific synthetic subjects and their permitted provider references.
   - Enforces that tokens only confer linkage when presented with the exact references authorized for that token.

---

## 4. Linkage Classification Outcomes & Decision Engine

M4 classifies each comparison pair into one of five deterministic outcomes:

| Outcome Status | Criteria | Confident Linkage? | Record Merged? |
| :--- | :--- | :---: | :---: |
| `same_identity` | Valid provider contexts, matching authorized synthetic linkage token bound to the subject representing both references, and no demographic contradictions. | **Yes** | **No** (Assessed only) |
| `different_identity` | Confirmed distinct registered synthetic subjects or explicitly conflicting primary identifiers. | **No** (Distinct) | **No** |
| `possible_match` | Demographic agreement (matching name, DOB, or gender) across distinct providers without an authorized strong linkage token. | **No** (Probable) | **No** |
| `review_required` | Conflicting signals (e.g., valid token match but contradictory DOB/gender, or demographic anomalies). Requires human administrative review. | **No** (Review) | **No** |
| `unresolved` | Insufficient demographic or token evidence to evaluate association. | **No** (Unknown) | **No** |

### Privacy-Safe Reason Codes
- `STRONG_TOKEN_MATCH`
- `KNOWN_DISTINCT_SUBJECTS`
- `DEMOGRAPHIC_SIMILARITY_ONLY`
- `DEMOGRAPHIC_CONFLICT`
- `TOKEN_SUBJECT_MISMATCH`
- `UNAUTHORIZED_TOKEN`
- `INSUFFICIENT_EVIDENCE`
- `SAME_PROVIDER_REFERENCE_MATCH`
- `SAME_PROVIDER_REFERENCE_MISMATCH`
- `PROVIDER_NOT_ALLOWED`

---

## 5. API Endpoint: `POST /api/v1/identity/assess`

- **Request Body:** `IdentityAssessmentBatchRequest` containing a list of reference pairs to compare (`comparisons`).
- **Request Example:**
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

- **Response Example (`IdentityAssessmentResponse`):**
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

---

## 6. Operational Limitations
- **No National ABHA Gateway Integration:** Does not communicate with live ABDM Sandbox or production ABHA token issuance servers.
- **Controlled Fixtures Only:** Positive identity linkage in tests is constrained to pre-registered synthetic subjects and linkage tokens.
