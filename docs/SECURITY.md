# Application Security & Privacy Architecture

## 1. Threat Model & Security Posture

TN HealthBridge is an **academic research prototype** designed to study uncertainty-aware healthcare data exchange. It processes synthetic clinical records and is **NOT** deployed directly to the live ABDM production network or integrated with live hospital EHR systems.

### Core Security Boundaries

1. **Authentication & Identity Assertion**:
   - RFC 7519 compliant HS256 JWT tokens with strictly validated `iss` ("tn-healthbridge"), `aud` ("tn-healthbridge-api"), `exp`, and HMAC-SHA256 signature.
   - Caller organization context is extracted from authenticated claims and checked against provider and recipient identifiers to enforce strict **multi-tenant isolation**.
   - Passwords hashed using standard PBKDF2-HMAC-SHA256 with 100,000 iterations and random per-user salt.

2. **Role-Based Access Control (RBAC)**:
   - Defined roles: `SYSTEM_ADMIN`, `HOSPITAL_OPERATOR`, `DATA_PROVIDER`, `DATA_REQUESTER`, `AUDITOR`.
   - Deny-by-default access policies across sensitive endpoints.
   - Operations bound to tenant scope: a hospital operator cannot send or request data on behalf of another hospital.

3. **Consent-Gated Data Release (M6 Gatekeeper)**:
   - Evaluates 6 deterministic security gates:
     1. Lifecycle Status (must be `GRANTED`).
     2. Temporal Authorization Expiry.
     3. Data Retention Boundary (`data_erase_at`).
     4. Patient Identity & Subject Matching.
     5. HIU & HIP Authorization.
     6. Clinical Date Bounding across all bundle observations (fail-closed, HTTP 403, zero bundle mutation).

4. **Cryptographic Integrity vs Authenticity**:
   - Every released bundle is accompanied by a plain **SHA-256 integrity digest** calculated over canonical release metadata and the unmodified bundle JSON.
   - Hashing establishes payload tampering detection, but does not substitute for asymmetric digital signatures. In production, cryptographic PKI signatures must be provided by ABDM-compliant HSMs or hardware tokens.

5. **Data Minimization & Privacy Protection**:
   - Purely synthetic fixtures and records. Real ABHA identifiers, real names, and live patient data are prohibited.
   - Zero central repository: complete clinical charts and FHIR documents are never stored centrally.
   - Audit logs capture operational metadata only; passwords, tokens, full clinical bundles, and patient attributes are automatically redacted.

6. **Web/API Protections**:
   - HTTP response security headers: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`.
   - Strict CORS configuration (no wildcard with credentials).
   - Traceable request correlation with `X-Correlation-ID`.
   - Bounded input sizes (1MB max body, 1,000 max batch size).

---

## 2. Security Controls: Application vs Deployment

| Control | Implemented in Application Code | Requires Infrastructure / Deployment |
| :--- | :---: | :---: |
| JWT signature & claims verification | ✅ | ❌ |
| RBAC & Tenant Scoping | ✅ | ❌ |
| Bounded request payload size | ✅ | ✅ (Reverse proxy / WAF recommended) |
| Constant-time password verification | ✅ | ❌ |
| Consent lifecycle store | ✅ | ✅ (Managed replicated PostgreSQL) |
| Security response headers | ✅ | ✅ (Edge CDN / API Gateway) |
| TLS 1.3 encryption in transit | ❌ | ✅ (Load balancer / Ingress) |
| Mutual TLS (mTLS) between hospitals | ❌ | ✅ (Service mesh / ABDM gateway) |
| Hardware Security Module (HSM) PKI | ❌ | ✅ (Production ABDM signing gateway) |
