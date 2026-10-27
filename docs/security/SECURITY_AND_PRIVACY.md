# Security and Privacy Architecture

## 1. Research Scope and Synthetic Boundary

**TN HealthBridge** is an academic and research prototype designed to explore uncertainty-aware healthcare data exchange.

- **Synthetic Data Exclusively:** All datasets, patient identifiers, provider names, and linkage tokens bundled with this repository are entirely synthetic.
- **No Real Patient Health Information (PHI):** The repository does not contain and must never receive real patient data, clinical histories, or identifiable healthcare information.
- **No Production ABDM/ABHA Gateway:** The prototype does not connect to the live Government of India Ayushman Bharat Digital Mission (ABDM) production infrastructure, production Health Information Exchanges (HIE), or live ABHA registration networks.

---

## 2. Authentication & Trust Boundaries

### 2.1 Provider Allowlist vs. Cryptographic Authentication
- The current implementation verifies provider identifiers (`source_provider_id`, `X-Provider-ID`) against a configured allowlist (`ALLOWED_PROVIDERS = ["HOSPITAL_A", "HOSPITAL_B", "LAB_C"]`).
- **Important Trust Limitation:** An allowlist checks whether a string identifier is recognized by the simulation. It does **not** cryptographically authenticate the caller's origin, identity, or authority.
- The prototype currently lacks Mutual TLS (mTLS), asymmetric digital signatures, and JWT/OAuth token verification. In a production environment, provider communication must be secured behind mutual TLS and an API gateway enforcing national digital health certificates.

### 2.2 Authoritative Synthetic Fixture Boundaries
- In **M4 (Patient Identity Safety)**, identity linkage is strictly bounded by pre-registered synthetic subjects and linkage fixtures.
- Synthetic linkage tokens (`SYN_LINK_TOKEN_...`) are valid only when bound to the synthetic subject authorized to represent both compared provider references.
- Tokens cannot be fabricated or arbitrarily transferred to assert cross-provider identity.

---

## 3. Data Protection and Zero-Persistence Architecture

### 3.1 Stateless Processing (No Central Database)
- TN HealthBridge does not maintain a central database (no PostgreSQL, MongoDB, MySQL, or local SQLite database).
- Data records exist solely in volatile application memory (RAM) for the duration of the HTTP request and are returned immediately in the response envelope.
- This design respects provider data sovereignty: no central authority accumulates a centralized patient repository.

### 3.2 Upload Stream Safety & Temporary File Purging
- File uploads are capped at 1 MB (`MAX_UPLOAD_SIZE_BYTES = 1,048,576`).
- Upload streams are consumed incrementally via chunks (64 KB) to prevent memory exhaustion attacks.
- Starlette's `UploadFile` utilizes a memory buffer (`SpooledTemporaryFile`) that spools to disk only if the threshold is approached. To guarantee that spooled descriptors never persist, `UploadFile.close()` is executed inside a guaranteed `finally` block immediately after parsing.

### 3.3 Privacy-Safe Logging Standards
- Server logs strictly prohibit the emission of raw clinical results, patient names, dates of birth, or test values.
- Log entries record only system metrics, provider identifiers, batch record counts, and sanitized error codes.
- Error responses returned to clients (e.g. 422 validation errors or domain exceptions) are scrubbed of raw input values to prevent data leakage in HTTP response bodies.

---

## 4. Uncertainty-Aware Clinical Safety

Rather than forcing binary decisions or silently coercing data, TN HealthBridge treats uncertainty as a safety mechanism:

- **Non-Destructive Normalization:** Raw source fields and unmapped keys are preserved verbatim in `source_data` and `unmapped_fields`.
- **Measurement Property Protection:** Terminology mapping refuses to conflate mass concentration (`mg/dL`) with substance concentration (`mmol/L` or `umol/L`). Conflicting units route to clinical review (`review_required`), preventing hazardous automated dosing errors.
- **Zero Automatic Identity Merges:** Even when strong synthetic tokens establish `same_identity`, M4 provides an assessment outcome; it **never merges records** or alters primary patient identifiers.
- **Conflict Escalation:** Any demographic contradiction (e.g. conflicting dates of birth) immediately escalates to `review_required`.
