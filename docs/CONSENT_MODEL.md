# ABDM-Aligned Electronic Consent Model & Lifecycle

## 1. Overview & Trust Model

In TN HealthBridge, data access authorization is governed by electronic consent artefacts aligned with the Ayushman Bharat Digital Mission (ABDM) specifications.

A consent artefact represents an explicit authorization granted by a patient for sharing specific health data categories between a Health Information Provider (HIP) and a Health Information User (HIU) for a defined clinical purpose and duration.

```
       [Request Initiated]
                │
                ▼
        ┌───────────────┐
        │   REQUESTED   │
        └───────┬───────┘
                │
       ┌────────┴────────┐
       ▼                 ▼
┌──────────────┐  ┌──────────────┐
│   GRANTED    │  │    DENIED    │ (Terminal)
└──────┬───────┘  └──────────────┘
       │
  ┌────┴────┐
  ▼         ▼
┌────────┐ ┌─────────┐
│REVOKED │ │ EXPIRED │ (Terminal)
└────────┘ └─────────┘
```

## 2. Consent Lifecycle States

- **`REQUESTED`**: An HIU has requested access, but the patient has not yet authorized release. Any attempt to release clinical data under this state fails closed (HTTP 403 `CONSENT_NOT_GRANTED`).
- **`GRANTED`**: The patient has authorized access, cryptographically signing the artefact. Release is permitted subject to the 6 Gatekeeper security evaluations.
- **`DENIED`**: The patient explicitly declined the request. Releases are permanently blocked (HTTP 403 `CONSENT_DENIED`).
- **`REVOKED`**: The patient withdrew authorization after granting it. Revocation is instantaneous; any subsequent release attempt is blocked (HTTP 403 `CONSENT_REVOKED`).
- **`EXPIRED`**: The authorization deadline has passed. Subsequent releases are blocked (HTTP 403 `CONSENT_EXPIRED`).

---

## 3. Authoritative Server Store vs Caller-Supplied JSON

To prevent security bypass attacks where a malicious client submits a crafted JSON payload claiming `status="GRANTED"`, the gateway resolves consent against its authoritative durable registry (`data/gateway/consent_registry.json`).

1. If the consent ID exists in the store, the server's registered lifecycle status overrides the caller's request payload.
2. In production mode, synthetic test signatures are strictly forbidden (`ALLOW_TEST_SIGNATURES=false`).
3. For local research/testing, synthetic test signatures (e.g. `TEST_SIG_<consent_id>`) can be verified only when explicitly enabled via server configuration.

---

## 4. Temporal Boundaries & Revocation Semantics

Consent permissions define two distinct temporal deadlines:
1. **`consent_expiry`**: The timestamp after which the HIU can no longer initiate new release requests.
2. **`data_erase_at`**: The data retention boundary after which the HIU is legally obligated to purge all cached clinical data.

### Pre-Dispatch Revocation Protection
When an exchange job is queued or retried in M7, consent status is re-checked against the registry immediately before network dispatch. If the patient revokes consent while a transmission is queued or waiting for retry backoff, the job transitions to `CANCELLED` and transmission is immediately aborted.
