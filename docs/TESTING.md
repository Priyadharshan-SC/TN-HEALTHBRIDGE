# Testing Guide & Verification Suite

## 1. Test Architecture Overview

TN HealthBridge uses **pytest** and **httpx** to provide comprehensive, deterministic, zero-compromise test coverage across all seven implemented modules (M1–M7), the 6 federated provider nodes, patient consent management, UPID identity resolution, and federated data exchange.

The test suite validates:
- Inbound payload stream size limiting, strict CSV parsing, and format validation (**M1**).
- Canonical schema mapping, numeric/timestamp normalization, and quality scoring (**M2**).
- Deterministic terminology mapping, alias resolution, specimen/unit context rules, and upstream rejection guardrails (**M3**).
- Provider-scoped references, synthetic fixture trust-binding, and uncertainty-aware linkage safety (**M4**).
- FHIR R4 Document Bundle assembly, Composition topology, LOINC/UCUM encoding, and internal reference closure (**M5**).
- ABDM consent lifecycle tracking, durable consent registry, 6 release gates, JWT authentication, and RBAC authorization (**M6**).
- Healthcare data exchange state machine, idempotency key fingerprinting, pre-dispatch revocation checking, bounded retries, and simulated hospital receiver receipts (**M7**).
- Organization management, facility status toggling, and authorized staff management (**Organization API**).
- Universal Patient Identity (UPID) registry, provider-scoped mappings, and cross-provider linkage resolution (**UPID API**).
- 6 isolated healthcare provider tenant nodes, local patient registries, clinical records, adapter endpoints, and delivered inboxes (**Provider API**).
- Patient portal profile, actionable consent grant/deny/revoke, and on-demand federated health record aggregation (**Patient Portal API**).
- Federated data exchange end-to-end scenarios A, B, C, F (**Federated Exchange**).

---

## 2. Running Automated Tests

### 2.1 Complete Test Suite
Run the full test suite from the repository root:

```powershell
.\.venv\Scripts\pytest -v
```

**Latest Verified Test Result:**
```text
======================= 315 passed, 1 warning in 9.45s =======================
```

### 2.2 Module-Specific Execution
Execute tests for specific modules individually:

```powershell
# M1 — Data Ingestion Tests (28 tests)
pytest tests/test_ingestion.py -v

# M2 — Data Quality and Normalization Tests (34 tests)
pytest tests/test_normalization.py -v

# M3 — Clinical Terminology Mapping Tests (34 tests)
pytest tests/test_terminology.py -v

# M4 — Patient Identity Safety Tests (66 tests)
pytest tests/test_identity.py -v

# M5 — FHIR R4 Bundle Assembly Tests (41 tests)
pytest tests/test_fhir.py -v

# M6 — Consent & ABDM Security Gateway Tests (59 tests)
pytest tests/test_gateway.py -v

# M6 — Security & Hardening Tests (12 tests)
pytest tests/test_security_gateway.py -v

# M7 — Reliable Healthcare Data Exchange Tests (13 tests)
pytest tests/test_exchange.py -v

# Organizations & Staff Access Tests (6 tests)
pytest tests/test_organization.py -v

# Universal Patient Identity (UPID) Tests (6 tests)
pytest tests/test_patient_identity.py -v

# 6 Federated Healthcare Provider Nodes Tests (5 tests)
pytest tests/test_providers.py -v

# Patient Portal & Consent Decision Tests (4 tests)
pytest tests/test_patient_portal.py -v

# Federated Exchange End-to-End Scenarios Tests (4 tests)
pytest tests/test_federated_exchange.py -v

# M1-M7 End-to-End Pipeline Integration Test (1 test)
pytest tests/test_end_to_end_pipeline.py -v
```

---

## 3. Test Organization and Coverage Matrix

| Test Suite | Module / Scope | Test Count | Key Areas Covered |
| :--- | :---: | :---: | :--- |
| `tests/test_ingestion.py` | **M1** | 28 | Stream size limit enforcement (1MB), CSV quoting standards, duplicate header rejection, JSON record caps, allowlist checks, provider header/body conflict rejection, privacy-safe logging. |
| `tests/test_normalization.py` | **M2** | 34 | CanonicalLabRecord schema validation, numeric overflow/underflow handling, date-only preservation without fabricated times, alias conflict policies, tri-state quality scoring (`valid`/`warning`/`rejected`). |
| `tests/test_terminology.py` | **M3** | 34 | Exact test name and alias matching against LOINC registry, biological specimen/unit constraint validation, measurement property separation (mass vs substance concentration), upstream M2-rejection guardrails, ambiguous candidate resolution. |
| `tests/test_identity.py` | **M4** | 66 | Provider-scoped local references, global registry uniqueness enforcement, authorized synthetic fixture trust-binding, demographic conflict escalation, uncertainty reason codes, zero-merge safety. |
| `tests/test_fhir.py` | **M5** | 41 | Strict FHIR R4 document topology, Composition as entry[0], two-tier section hierarchy, patient isolation, LOINC & UCUM mapping, closed internal references (`urn:uuid:`), bundle size limits, input immutability. |
| `tests/test_gateway.py` | **M6** | 59 | Standalone consent verification, temporal bounds, data retention deadlines (`data_erase_at`), patient subject matching, HIU/HIP authorization, clinical date range bounding, plain SHA-256 integrity digest. |
| `tests/test_security_gateway.py` | **M6 Security** | 12 | Password hashing, JWT creation & claims validation, expired token rejection, tampered signatures, consent lifecycle transitions (`REQUESTED` -> `GRANTED` -> `REVOKED`), forged grant rejection, tenant isolation, security headers, correlation IDs, production startup safeguards. |
| `tests/test_exchange.py` | **M7** | 13 | End-to-end exchange jobs, idempotency keys, request fingerprinting, duplicate submissions, pre-dispatch revocation checking, bounded retries (backoff), illegal state transition protection, job cancellation, simulated receiver receipts. |
| `tests/test_organization.py` | **Organizations** | 6 | Organization registration, admin authorization check, retrieval by ID, active status toggling, staff creation and role listing. |
| `tests/test_patient_identity.py` | **UPID Registry** | 6 | Universal Patient Identity creation, provider-scoped mapping registration, cross-node patient resolution, uniqueness violations rejection. |
| `tests/test_providers.py` | **6 Provider Nodes** | 5 | Tenant database isolation across nodes, local patient registration, clinical observation recording, provider adapter consent checks (`GRANTED` releases data; `REVOKED` blocks data). |
| `tests/test_patient_portal.py` | **Patient Portal** | 4 | Patient profile retrieval, consent listing, actionable consent grant/deny decisions, consent revocation, on-demand federated record aggregation with non-persistence. |
| `tests/test_federated_exchange.py` | **Federated Scenarios** | 6 | Scenarios A–F (Scenario A: successful exchange, Scenario B: denied consent, Scenario C: revoked consent, Scenario D: unmapped/missing identity review, Scenario E: unauthorized cross-organization access denial, Scenario F: idempotency and receipt download). |
| `tests/test_end_to_end_pipeline.py` | **M1–M7 E2E** | 1 | Complete integration: M1 Ingestion -> M2 Normalization -> M3 Terminology -> M4 Identity -> M5 FHIR Assembly -> M6 Consent Gate -> M7 Transport. |
| **Total Verified** | **All Modules** | **315** | **100% Passing Suite (0 failed, 0 skipped)** |
