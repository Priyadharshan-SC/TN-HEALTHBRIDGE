# Changelog

All notable changes to the **TN HealthBridge** project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.2.0] - 2026-10-27

### Added
- **M4 Patient Identity Safety & Uncertainty-Aware Linkage:**
  - Implemented provider-scoped local patient reference evaluation (`(source_provider_id, patient_reference)`).
  - Enforced authorized synthetic fixture trust-binding via `synthetic_identity_registry.json` and `synthetic_linkage_fixtures.json`.
  - Implemented demographic conflict escalation engine and five-outcome uncertainty model (`same_identity`, `different_identity`, `possible_match`, `unresolved`, `review_required`).
  - Added startup registry integrity verification preventing duplicate provider-scoped reference assignments across subjects.
  - Implemented `POST /api/v1/identity/assess` endpoint with privacy-safe reason codes and zero automated record merging.
  - Added 74 automated unit and integration tests covering M4 identity safety.
- **Repository Organization & Public Release Hygiene:**
  - Structured documentation tree under `docs/architecture/`, `docs/modules/`, `docs/api/`, `docs/security/`, and `docs/research/`.
  - Added GitHub Actions automated CI workflow (`.github/workflows/tests.yml`) testing on Python 3.11 and 3.12.
  - Added GitHub Community Health templates: `bug_report.md`, `feature_request.md`, and `pull_request_template.md`.
  - Added comprehensive `SECURITY.md`, `.gitattributes`, and updated `.gitignore`.
  - Added `requirements.txt`, `requirements-dev.txt`, `.env.example`, and `pyproject.toml`.

---

## [0.1.2] - 2026-10-25

### Added
- **M3 Clinical Terminology Mapping:**
  - Implemented deterministic terminology resolution against versioned local registry (`data/terminology/default_registry.json`).
  - Added exact test name matching and configured alias resolution.
  - Implemented contextual biological specimen and unit constraint evaluation.
  - Added upstream quality guardrail withholding standard mapping for M2-rejected records.
  - Implemented `POST /api/v1/terminology/map` endpoint with uncertainty statuses (`mapped`, `ambiguous`, `review_required`, `unmapped`).
  - Added 33 automated tests covering M3 terminology mapping.

---

## [0.1.1] - 2026-10-23

### Added
- **M2 Data Quality and Normalization:**
  - Implemented canonical laboratory record schema (`CanonicalLabRecord`).
  - Added provider-specific semantic field mappings for Hospital A, Hospital B, and Lab C.
  - Implemented lossless source data and unmapped vendor key preservation.
  - Added numeric normalization, scientific notation handling, and safe ISO-8601 timestamp parsing.
  - Implemented tri-state quality scoring (`valid`, `warning`, `rejected`) and sanitized issue codes.
  - Implemented `POST /api/v1/normalization/process` endpoint.
  - Added 33 automated tests covering M2 normalization.

---

## [0.1.0] - 2026-10-21

### Added
- **M1 Data Ingestion Gateway:**
  - Implemented multi-format ingestion endpoints: `POST /api/v1/ingestion/csv` and `POST /api/v1/ingestion/json`.
  - Added stream size bounding (1 MB cap) preventing unbounded memory buffering.
  - Implemented provider allowlist checking (`ALLOWED_PROVIDERS`) and header/body conflict rejection.
  - Added strict CSV quoting enforcement and case-insensitive duplicate header column rejection.
  - Added provenance metadata attachment (`ingestion_id` UUIDv4 and UTC timestamp).
  - Added 22 automated tests covering M1 ingestion.

---

## Current Implementation Status

| Module | Component Name | Status | Verified Passing Tests |
| :--- | :--- | :---: | :---: |
| **M1** | Data Ingestion Layer | **Implemented** | 22 |
| **M2** | Data Quality & Normalization Layer | **Implemented** | 33 |
| **M3** | Clinical Terminology Mapping Layer | **Implemented** | 33 |
| **M4** | Patient Identity Safety & Linkage | **Implemented** | 74 |
| **Total** | **Current Test Suite** | **100% Passing** | **162** |
| **M5** | FHIR R4 Bundle Assembly | *Planned / Not Implemented* | 0 |
| **M6** | Consent & ABDM Security Gateway | *Planned / Not Implemented* | 0 |
| **M7** | Inter-Provider Secure Delivery | *Planned / Not Implemented* | 0 |
| **M8** | Federated Audit & Compliance | *Planned / Not Implemented* | 0 |
