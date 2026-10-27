# Research Scope, Methodology & Technical Limitations

## 1. Academic & Research Context

**TN HealthBridge** is an open-source academic research prototype investigating decentralized, uncertainty-aware healthcare data exchange. The framework explores how regional healthcare organizations can safely interoperate without creating centralized patient repositories or executing risky automated merges.

The research directly addresses challenges highlighted in digital health ecosystems like India's **Ayushman Bharat Digital Mission (ABDM)**:
- Preserving local healthcare provider autonomy and data sovereignty.
- Mitigating patient safety hazards caused by silent, automated identity resolution mistakes.
- Preventing medical misinterpretation caused by lossy terminology coercion or unit mismatches.

---

## 2. Scope Matrix: Implemented vs. Planned Capabilities

| Capability | Module | Implementation Status | Implementation Details |
| :--- | :---: | :---: | :--- |
| **Tabular & JSON Ingestion** | M1 | **Implemented** | Stream-bounded CSV (`multipart/form-data`) and JSON (`application/json`) ingestion with provenance envelope attachment. |
| **Provider Allowlist Check** | M1 | **Implemented** | Rejection of undeclared provider IDs; header/body conflict resolution. |
| **Laboratory Normalization** | M2 | **Implemented** | In-memory projection into `CanonicalLabRecord` schema with lossless source preservation. |
| **Tri-State Quality Scoring** | M2 | **Implemented** | Deterministic quality scoring (`valid`, `warning`, `rejected`) and explicit issue codes. |
| **Deterministic Terminology** | M3 | **Implemented** | Versioned local registry mapping for LOINC concepts with alias matching. |
| **Contextual Constraint Engine** | M3 | **Implemented** | Biological specimen and unit constraint checks; measurement property separation. |
| **Upstream Quality Guardrail** | M3 | **Implemented** | Conservative withholding of standard mapping on M2-rejected records. |
| **Provider-Scoped Identity** | M4 | **Implemented** | Local IDs scoped to provider context; non-equivalence of identical cross-provider strings. |
| **Fixture-Bound Trust Model** | M4 | **Implemented** | Strict binding of synthetic linkage tokens to authorized synthetic subjects and references. |
| **Zero-Merge Safety Engine** | M4 | **Implemented** | Five-outcome uncertainty model (`same_identity`, `different_identity`, `possible_match`, `unresolved`, `review_required`) without merging records. |
| **FHIR R4 Bundle Assembly** | M5 | *Planned (Not Implemented)* | Assembly of standardized `DiagnosticReport` and `Observation` FHIR resources. |
| **Consent & ABDM Gateway** | M6 | *Planned (Not Implemented)* | Integration with ABDM Consent Manager protocols (HIP/HIU consent artifact exchange). |
| **Secure Inter-Node Transfer** | M7 | *Planned (Not Implemented)* | Mutual TLS (mTLS) and peer-to-peer federated delivery protocol between hospitals. |
| **Federated Audit Trail** | M8 | *Planned (Not Implemented)* | Cryptographic provenance logs and distributed compliance auditing. |

---

## 3. Known Technical Limitations

1. **Synthetic Data Scope:** All evaluation is conducted exclusively on synthetic test fixtures. Real clinical records, hospital EHR databases, and live patient cohorts have not been tested.
2. **Provider Authentication Absence:** In the current release, provider identity is established solely via an allowlist check on caller-supplied identifiers (`X-Provider-ID`). Production deployments require mutual TLS, PKI infrastructure, and signed JWT assertion verification.
3. **Local In-Memory Terminology Registry:** Terminology resolution relies on a static, versioned JSON registry (`data/terminology/default_registry.json`). The system does not currently query external terminology servers (e.g., Ontoserver) over the network.
4. **No Automated Pipeline Orchestration:** Endpoints operate independently. Sequential orchestration is client-driven; there is no background queue (e.g., Celery, RabbitMQ) managing cross-module handoffs.
5. **No Persistent Cross-Provider Index:** By architectural design, TN HealthBridge does not persist identity correlations or clinical records. Downstream consumers are responsible for managing their own local patient databases.
