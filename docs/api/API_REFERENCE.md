# TN HealthBridge API Reference (M1–M7 & Federated System)

Complete reference documentation for all implemented endpoints, authentication models, RBAC permissions, and domain error responses.

---

## 1. Authentication & RBAC

Protected endpoints accept standard RFC 7519 HS256 JWT access tokens in the `Authorization` header:
```http
Authorization: Bearer <access_token>
```

### Pre-Configured Test Credentials
| Account Username | Organization | Role Assignment | Scope |
| :--- | :--- | :--- | :--- |
| `admin` | `TN_HEALTH_DEPT` | `SYSTEM_ADMIN` | Global administrative operations, organization management |
| `hospital_a_operator` | `HOSPITAL_A` | `HOSPITAL_OPERATOR`, `DATA_PROVIDER` | Local ingestion, records entry, provider adapter |
| `hospital_b_requester`| `HOSPITAL_B` | `DATA_REQUESTER`, `HOSPITAL_OPERATOR` | Federated data requests, destination inbox |
| `lab_c_provider` | `LAB_C` | `DATA_PROVIDER` | Diagnostic laboratory records entry |
| `hospital_d_operator` | `HOSPITAL_D` | `HOSPITAL_OPERATOR` | Sunrise Hospital node operations |
| `lab_e_operator` | `LAB_E` | `DATA_PROVIDER` | Elite Diagnostics node operations |
| `clinic_f_operator` | `CLINIC_F` | `HOSPITAL_OPERATOR` | Green Valley Clinic node operations |
| `arun_patient` | `PATIENT` | `PATIENT` | Patient portal, consent grant/deny/revoke |
| `auditor_user` | `TN_AUDIT_COMMISSION`| `AUDITOR` | Compliance audit querying |

---

## 2. API Endpoints Catalog

### Authentication
- `POST /api/v1/auth/token`: Submit username and password to obtain a signed access token.

### M1 — Data Ingestion
- `POST /api/v1/ingestion/csv`: Upload raw hospital CSV files (`Content-Type: multipart/form-data`) with `X-Provider-ID` header.
- `POST /api/v1/ingestion/json`: Post raw hospital JSON records batch.

### M2 — Data Quality & Normalization
- `POST /api/v1/normalization/process`: Ingest an M1 `IngestionResponse` envelope; maps source fields to `CanonicalLabRecord` and evaluates record quality (`valid`, `warning`, `rejected`).

### M3 — Clinical Terminology Mapping
- `POST /api/v1/terminology/map`: Maps normalized records to standard LOINC concepts using local terminology registry; isolates ambiguities and context conflicts.

### M4 — Patient Identity Safety
- `POST /api/v1/identity/assess`: Evaluates candidate patient pairs for potential linkage using controlled synthetic trust fixtures; outputs `same_identity`, `different_identity`, `possible_match`, `unresolved`, or `review_required`.

### M5 — FHIR R4 Bundle Assembly
- `POST /api/v1/fhir/bundle`: Assembles an uncertainty-aware FHIR R4 Document Bundle from an M3 terminology batch. Enforces Composition-as-entry[0] topology, LOINC/UCUM encoding, and closed `urn:uuid:` references.

### M6 — Consent & Security Gateway
- `POST /api/v1/gateway/release`: Evaluates ABDM consent artefact against assembled FHIR bundle; enforces 6 security gates and returns signed release envelope with plain SHA-256 integrity digest.
- `POST /api/v1/gateway/consent`: Registers a new consent artefact in the authoritative store.
- `GET /api/v1/gateway/consent/{consent_id}`: Retrieves consent state and full lifecycle history.
- `POST /api/v1/gateway/consent/{consent_id}/grant`: Grants an active consent artefact.
- `POST /api/v1/gateway/consent/{consent_id}/revoke`: Immediately revokes consent (fail-closed).

### M7 & Federated Exchange
- `POST /api/v1/exchange/send`: Executes reliable, idempotent exchange to simulated receiving hospital with pre-dispatch revocation check and bounded retries.
- `GET /api/v1/exchange/jobs/{job_id}`: Polls exchange job status and transition history.
- `POST /api/v1/exchange/jobs/{job_id}/cancel`: Manually cancels an active exchange job.
- `POST /api/v1/exchange/receiver/simulate`: Direct simulated hospital receiver endpoint.
- `GET /api/v1/exchange/transfers`: Paginated list of transfer jobs with date, source, destination, status, and search filters.
- `POST /api/v1/exchange/federated-exchange`: End-to-end multi-module federated transfer orchestrating Source Adapter -> M1 Ingestion -> M2 Normalization -> M3 Terminology -> M4 Linkage -> M5 FHIR Assembly -> M6 Consent Gate -> M7 Transport -> Destination Inbox.
- `GET /api/v1/exchange/transfers/{job_id}/download-receipt`: Downloads the ECDSA P-256 signed cryptographic transfer receipt.

### Organization & Access Management
- `GET /api/v1/organizations`: Retrieves all registered healthcare organizations.
- `POST /api/v1/organizations`: Registers a new healthcare organization (Admin only).
- `GET /api/v1/organizations/{org_id}`: Gets detailed organization metadata.
- `PUT /api/v1/organizations/{org_id}`: Updates organization details.
- `POST /api/v1/organizations/{org_id}/toggle-status`: Toggles facility active/suspended state.
- `GET /api/v1/organizations/{org_id}/users`: Lists authorized users belonging to an organization.
- `POST /api/v1/organizations/{org_id}/users`: Adds an authorized user to an organization.

### Universal Patient Identity (UPID)
- `GET /api/v1/identity/patients`: Lists registered universal patient profiles with optional search and provider filters.
- `POST /api/v1/identity/patients`: Creates a new Universal Patient Identity profile (Admin only).
- `GET /api/v1/identity/patients/{universal_patient_id}`: Gets UPID profile and all mapped provider local IDs.
- `POST /api/v1/identity/mappings`: Maps a provider local patient ID and scoped token to a UPID.
- `POST /api/v1/identity/resolve`: Resolves a patient identity across two provider nodes using UPID or M4 engine.

### Federated Provider Applications (6 Nodes)
- `GET /api/v1/providers/{provider_id}/patients`: Lists local registered patients at the given provider node.
- `POST /api/v1/providers/{provider_id}/patients`: Registers a new local patient at the provider node.
- `GET /api/v1/providers/{provider_id}/records`: Lists local clinical observations, optionally filtered by `local_patient_id`.
- `POST /api/v1/providers/{provider_id}/records`: Adds a new clinical observation record to the provider's local repository.
- `POST /api/v1/providers/{provider_id}/adapter`: Provider adapter endpoint called by middleware to retrieve local records governed by verified ABDM consent.
- `GET /api/v1/providers/{provider_id}/inbox`: Lists delivered FHIR bundles and receipts received by the provider node.

### Patient Portal
- `GET /api/v1/patient/profile`: Retrieves authenticated patient demographics and UPID.
- `GET /api/v1/patient/consents`: Lists all consent requests and active permissions for the patient.
- `POST /api/v1/patient/consents/{consent_id}/decide`: Actionable consent decision (`GRANTED` or `DENIED`).
- `POST /api/v1/patient/consents/{consent_id}/revoke`: Immediately revokes previously granted consent.
- `GET /api/v1/patient/hospitals`: Lists healthcare providers with mapped patient accounts.
- `GET /api/v1/patient/records`: Aggregates patient's clinical records on-demand across connected nodes without middleware database persistence.
- `GET /api/v1/patient/sharing-history`: Lists historical data exchange transfers involving the patient.

### Audit & Governance
- `GET /api/v1/audit/logs`: Paginated search of immutable audit events with actor, organization, action, outcome, and text search filters.
- `GET /api/v1/audit/stats`: Summarizes total events, outcomes, and activity distribution.

---

## 3. Standard Error Codes

| HTTP Status | Error Code | Description |
| :--- | :--- | :--- |
| **400** | `INVALID_PROVIDER_ID` | Unknown or disallowed source healthcare provider. |
| **400** | `RECORD_LIMIT_EXCEEDED`| Ingestion/normalization batch exceeds 1,000 records. |
| **400** | `MIXED_PATIENT_BATCH` | FHIR assembly batch contains multiple patients without explicit filter. |
| **401** | `AUTHENTICATION_FAILED`| Missing, expired, or invalid JWT signature. |
| **403** | `CONSENT_REVOKED` | Authorizing consent artefact has been revoked. |
| **403** | `CONSENT_DENIED` | Authorizing consent artefact was denied by the patient. |
| **403** | `CONSENT_EXPIRED` | Consent temporal validity deadline has elapsed. |
| **403** | `CONSENT_RETENTION_EXPIRED` | Current timestamp has reached or exceeded `data_erase_at`. |
| **403** | `CONSENT_PATIENT_MISMATCH` | Consent patient ID does not match bundle patient subject. |
| **403** | `CONSENT_HIU_MISMATCH` | Requesting or authenticated HIU does not match consent. |
| **403** | `CONSENT_DATE_OUT_OF_RANGE` | Observations fall outside consented clinical date range. |
| **404** | `CONSENT_NOT_FOUND` | Specified consent artefact ID does not exist in registry. |
| **404** | `PATIENT_NOT_FOUND` | Universal Patient Identity or local patient not found. |
| **404** | `ORGANIZATION_NOT_FOUND` | Target organization does not exist. |
| **409** | `IDEMPOTENCY_CONFLICT` | Reused idempotency key with conflicting request payload. |
| **409** | `MAPPING_CONFLICT` | Provider local patient ID is already mapped to another UPID. |
| **409** | `INVALID_STATE_TRANSITION` | Attempted illegal state transition on exchange job. |
| **413** | `PAYLOAD_TOO_LARGE` | Upload size exceeds configured 1MB limit. |
| **422** | `FHIR_ASSEMBLY_FAILED` | All target patient records withheld due to quality rejection. |
