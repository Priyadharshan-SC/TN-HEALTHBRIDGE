# Testing Guide & Verification Suite

## 1. Test Architecture Overview

TN HealthBridge uses **pytest** and **httpx** to provide end-to-end, deterministic test coverage across all implemented modules.

The test suite validates:
- Inbound payload stream size limiting, strict CSV parsing, and format validation (**M1**).
- Canonical schema mapping, numeric/timestamp normalization, and quality scoring (**M2**).
- Deterministic terminology mapping, alias resolution, specimen/unit context rules, and upstream rejection guardrails (**M3**).
- Provider-scoped references, synthetic fixture trust-binding, and uncertainty-aware linkage safety (**M4**).

---

## 2. Running Automated Tests

### 2.1 Complete Test Suite
Run the full test suite from the repository root:

```bash
pytest -v
```

Expected baseline output:
```text
======================= 162 passed in 3.61s =======================
```

### 2.2 Module-Specific Execution
Execute tests for specific modules individually:

```bash
# M1 — Data Ingestion Tests (22 tests)
pytest tests/test_ingestion.py -v

# M2 — Data Quality and Normalization Tests (33 tests)
pytest tests/test_normalization.py -v

# M3 — Clinical Terminology Mapping Tests (33 tests)
pytest tests/test_terminology.py -v

# M4 — Patient Identity Safety Tests (74 tests)
pytest tests/test_identity.py -v
```

### 2.3 Running with Coverage Analysis
Generate a coverage report using `pytest-cov`:

```bash
pytest --cov=app --cov-report=term-missing tests/
```

---

## 3. Test Organization and Coverage Matrix

| Test Suite | Module | Test Count | Key Areas Covered |
| :--- | :---: | :---: | :--- |
| `tests/test_ingestion.py` | **M1** | 22 | Stream size limit enforcement (1MB), CSV quoting standards, duplicate header rejection, JSON record caps, allowlist checks, provider header/body conflict rejection, privacy-safe logging. |
| `tests/test_normalization.py` | **M2** | 33 | CanonicalLabRecord schema validation, numeric overflow/underflow handling, date-only preservation without fabricated times, alias conflict policies, tri-state quality scoring (`valid`/`warning`/`rejected`). |
| `tests/test_terminology.py` | **M3** | 33 | Exact test name and alias matching against LOINC registry, biological specimen/unit constraint validation, measurement property separation (mass vs substance concentration), upstream M2-rejection guardrails, ambiguous candidate resolution. |
| `tests/test_identity.py` | **M4** | 74 | Provider-scoped local references, global registry uniqueness enforcement, authorized synthetic fixture trust-binding, demographic conflict escalation, uncertainty reason codes, zero-merge safety. |
| **Total Verified** | **All** | **162** | **100% Passing Baseline** |

---

## 4. Synthetic Fixture Data

All test cases use synthetic fixtures stored in the `data/` directory:

- **Sample CSV:** `data/samples/hospital_a.csv` (Simulated laboratory export for Hospital A).
- **Sample JSON:** `data/samples/hospital_b.json` (Simulated structured payload for Hospital B).
- **Terminology Registry:** `data/terminology/default_registry.json` (Versioned LOINC concepts and synthetic test entries).
- **Synthetic Identity Registry:** `data/identity/synthetic_identity_registry.json` (Authoritative synthetic subject reference definitions).
- **Synthetic Linkage Fixtures:** `data/identity/synthetic_linkage_fixtures.json` (Authorized token-to-subject trust bindings).

> [!CAUTION]
> Tests rely on explicit relative paths to these fixture files. Do not move or rename files in `data/` without updating corresponding configurations in `app/core/config.py` and test fixtures.

---

## 5. Adding New Tests

When writing new tests:

1. **Use Synthetic Data Exclusively:** Never use real patient names, real MRNs, or production identifiers.
2. **Test Uncertainty Outcomes:** Ensure both confident outcomes (`valid`, `mapped`, `same_identity`) and uncertain outcomes (`warning`, `rejected`, `ambiguous`, `review_required`, `unresolved`) are tested.
3. **Assert Privacy Compliance:** Verify that error messages do not echo sensitive patient demographics or raw clinical values.
4. **Follow Pytest Conventions:** Name test functions with the `test_` prefix and group related assertions logically.
