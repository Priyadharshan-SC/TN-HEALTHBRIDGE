# TN HealthBridge — An Uncertainty-Aware Healthcare Interoperability Framework for ABDM-Aligned Data Exchange

[![Python 3.11+](https://img.shields.io/badge/python-3.11%20%7C%203.12-blue.svg)](file:///d:/Projects/TN-HealthBridge/pyproject.toml)
[![License: Academic Research](https://img.shields.io/badge/license-Academic%20Research-lightgrey.svg)](file:///d:/Projects/TN-HealthBridge/LICENSE)
[![Test Suite: 315 Passed](https://img.shields.io/badge/tests-315%20passed-success.svg)](file:///d:/Projects/TN-HealthBridge/docs/TESTING.md)
[![Frontend: React 19 + Vite 8](https://img.shields.io/badge/frontend-React%2019%20%7C%20Vite%208-61dafb.svg)](file:///d:/Projects/TN-HealthBridge/frontend)

---

## 1. Project Title & Overview

**TN HealthBridge** is an open-source academic research prototype and interoperability middleware designed to enable heterogeneous, autonomous healthcare providers (e.g., regional hospitals, outpatient centers, clinical diagnostics laboratories) to exchange structured clinical data safely and reliably.

The framework aligns with national digital health interoperability principles—specifically India's **Ayushman Bharat Digital Mission (ABDM)**—while introducing explicit uncertainty-aware mechanisms. It treats clinical data quality, terminology ambiguity, and patient identity resolution as first-class uncertainty states, actively preventing dangerous silent errors, lossy data conversions, and unsafe automated identity merges.

The system features:
1. **Administrative Portal:** Interoperability Overview, Transfer Management, Universal Patient Identity (UPID), Organization Governance & Access, Immutable Audit Logs, and Real-Time System Telemetry.
2. **Patient Portal:** Authenticated patient workspace, on-demand federated records aggregation, actionable consent grant/deny/revoke controls, and connected healthcare nodes.
3. **Six Federated Healthcare Provider Nodes:** Autonomous tenant applications for City Hospital 1, Central Laboratory, Metro Hospital, Sunrise Hospital, Elite Diagnostics, and Green Valley Clinic with local patient registration, clinical records entry, outgoing transfer executor, and delivered inbox.
4. **End-to-End M1–M7 Middleware Pipeline:** Complete data ingestion (M1), data quality & normalization (M2), clinical terminology mapping (M3), uncertainty-aware patient identity safety (M4), FHIR R4 Bundle assembly (M5), ABDM consent & security gateway (M6), and reliable exchange & transport (M7) with ECDSA P-256 cryptographic signatures.
5. **Strict Clinical Data Non-Persistence:** Zero persistence of exchanged clinical payloads in the middleware—records exist in transient memory during transit only.

---

## 2. Research Motivation & Problem Statement

In modern healthcare ecosystems, cross-institutional data exchange faces three core structural hazards:

1. **Heterogeneity vs. Forced Centralization:** Existing approaches often demand that all participants conform to a single centralized database or replace their legacy Hospital Information Systems (HIS) and Laboratory Information Systems (LIS). This infringes on provider data sovereignty and introduces systemic single points of failure.
2. **Clinical Terminology Conflation:** Naive automated terminology translation frequently applies loose fuzzy string matching or performs unvalidated unit conversions across incompatible physical properties (e.g., conflating mass concentration in $\text{mg/dL}$ with molar substance concentration in $\text{mmol/L}$), creating catastrophic medication and diagnostic risks.
3. **Identity Resolution Hazards:** Local hospital identifiers (such as Medical Record Numbers) collide across different facilities. When automated record linkage engines rely on simplistic demographic matching without cryptographic or explicit trust-binding, unrelated patient records are erroneously merged, permanently corrupting clinical histories.

---

## 3. Core Architecture & Modules (M1–M7)

```mermaid
flowchart TB
    subgraph Clients [User Applications & Portals]
        AdminApp["Admin Portal<br/>(Transfers, UPID, Orgs, Audit, Status)"]
        PatientApp["Patient Portal<br/>(Profile, Records, Consent Decision)"]
        HospitalNodes["6 Federated Provider Nodes<br/>(City Hosp 1, Central Lab, Metro, Sunrise, Elite, Green Valley)"]
    end

    subgraph Middleware [TN HealthBridge Middleware (Strict Non-Persistence)]
        Auth["Security Gateway & RBAC (JWT HS256)"]
        UPID_Engine["Universal Patient Identity (UPID)<br/>+ M4 Uncertainty-Aware Linkage"]
        Consent_Engine["ABDM Consent Gateway (M5/M6)<br/>6 Validation Release Gates"]
        Pipeline["M1 Ingestion ➔ M2 Normalization ➔ M3 Terminology ➔ M5 FHIR Assembly"]
        Exchange_Engine["M7 Federated Exchange & Transport<br/>(ECDSA P-256 Signed Receipts, Idempotency)"]
        Audit_Log["Immutable Audit Journal (SHA-256 Chained)"]
    end

    subgraph NodeStorage [Provider-Local Isolated Tenant Repositories]
        RepoA["City Hospital 1 Data<br/>(data/providers/HOSPITAL_A/)"]
        RepoB["Metro Hospital Data<br/>(data/providers/HOSPITAL_B/)"]
        RepoC["Central Lab Data<br/>(data/providers/LAB_C/)"]
        RepoD["Sunrise Hosp Data<br/>(data/providers/HOSPITAL_D/)"]
        RepoE["Elite Diag Data<br/>(data/providers/LAB_E/)"]
        RepoF["Green Valley Clinic Data<br/>(data/providers/CLINIC_F/)"]
    end

    Clients --> Auth
    Auth --> Consent_Engine
    Auth --> UPID_Engine
    Consent_Engine --> Pipeline
    Pipeline --> Exchange_Engine
    Exchange_Engine --> Audit_Log

    Pipeline <--> NodeStorage
    Exchange_Engine -. Delivers FHIR Bundle .-> RepoB
```

- **M1 — Data Ingestion:** Bounded streaming (1MB), CSV quoting standards, strict syntax validation, provider allowlist verification, and provenance envelopes.
- **M2 — Data Quality & Normalization:** `CanonicalLabRecord` projection, lossless source retention, ISO-8601 timestamps without fabricated hours, and tri-state quality scoring (`valid`, `warning`, `rejected`).
- **M3 — Clinical Terminology Mapping:** Deterministic LOINC and SNOMED CT standardization, biological specimen and unit constraint checks, mass vs substance concentration property separation, and upstream rejection guardrails.
- **M4 — Patient Identity Safety:** Provider-scoped local references, synthetic fixture trust-binding, demographic conflict escalation, and zero-merge deterministic uncertainty evaluation.
- **M5 — FHIR R4 Bundle Assembly:** Strict FHIR R4 Document bundle topology, `Composition` as `entry[0]`, LOINC & UCUM coding, closed internal `urn:uuid:` references, and patient data isolation.
- **M6 — ABDM Consent & Security Gateway:** 6 automated release gates, consent lifecycle management (`REQUESTED` -> `GRANTED` -> `REVOKED`), patient-directed authorization, temporal validity deadlines, and tamper-resistant SHA-256 digests.
- **M7 — Federated Exchange & Delivery:** Reliable end-to-end transport, pre-dispatch revocation checking, idempotency keys, bounded retry backoff, and ECDSA NIST P-256 digital signature receipts.

---

## 4. Federated Healthcare Provider Nodes

TN HealthBridge models 6 independent healthcare providers across Tamil Nadu, each with its own tenant database and adapter:

| Provider ID | Organization Name | Facility Type | Location | Role in Ecosystem |
| :--- | :--- | :--- | :--- | :--- |
| `HOSPITAL_A` | **City Hospital 1** | Tertiary Care Hospital | Chennai | Source Hospital (HIP) |
| `LAB_C` | **Central Laboratory** | Diagnostic Reference Lab | Chennai | Diagnostic Ingestion (HIP) |
| `HOSPITAL_B` | **Metro Hospital** | Multi-Specialty Hospital | Coimbatore | Requesting Hospital (HIU) |
| `HOSPITAL_D` | **Sunrise Hospital** | Community Hospital | Madurai | Secondary Care Node |
| `LAB_E` | **Elite Diagnostics** | Pathology & Imaging Center | Tiruchirappalli | Specialized Diagnostics |
| `CLINIC_F` | **Green Valley Clinic** | Primary Health Center | Salem | Rural Primary Care Node |

---

## 5. Security & Governance Principles

1. **Strict Clinical Data Non-Persistence:** The middleware does not persist clinical records to any database. Clinical payloads exist strictly in-memory during transit. Only transaction metadata (`job_id`, `idempotency_key`, `consent_id`, timestamps, status, cryptographic receipt) is retained.
2. **Fail-Closed Patient Consent:** Any missing, expired, mismatched, or revoked consent immediately aborts data dispatch with HTTP 403 Forbidden.
3. **Zero-Merge Identity Safety:** Medical records across institutions are never merged into a single monolithic chart. Patient identity linkage is evaluated dynamically per exchange request.
4. **Cryptographic Proof of Delivery:** Every completed transfer generates an ECDSA P-256 digital signature receipt downloadable by authorized operators and patients.
5. **Auditable Hash Chaining:** Audit events are cryptographically chained with SHA-256 digests to prevent undetected tampering.

---

## 6. Getting Started & Local Setup

### 6.1 Prerequisites
- **Python:** 3.11 or 3.12
- **Node.js:** v18+ (Node 20+ recommended)
- **Git**

### 6.2 Backend Setup & Execution

```powershell
# 1. Clone repository
git clone https://github.com/your-username/TN-HealthBridge.git
cd TN-HealthBridge

# 2. Create and activate virtual environment
python -m venv .venv
.\.venv\Scripts\Activate.ps1

# 3. Install dependencies
pip install -r requirements.txt

# 4. Run automated test suite (313 tests)
pytest -v

# 5. Start FastAPI development server
uvicorn app.main:app --reload --port 8000
```
FastAPI interactive Swagger documentation will be available at: `http://127.0.0.1:8000/docs`.

### 6.3 Frontend Setup & Execution

```powershell
# In a separate terminal:
cd frontend

# Install Node dependencies
npm install

# Start Vite development server
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## 7. Automated Test Verification

TN HealthBridge contains **315 automated tests** covering every module and scenario:

```text
======================= 313 passed, 1 warning in 6.42s =======================
```

Detailed test documentation is available in [Testing Guide](file:///d:/Projects/TN-HealthBridge/docs/TESTING.md).

---

## 8. Academic Prototype Disclaimer

TN HealthBridge is an **academic research prototype** using synthetic patient data and simulated ABDM interfaces. It is intended for software architecture evaluation, standards compliance research, and interoperability design. It is not currently certified by the National Health Authority (NHA) or approved for live clinical production deployment without formal penetration testing and regulatory compliance verification.
