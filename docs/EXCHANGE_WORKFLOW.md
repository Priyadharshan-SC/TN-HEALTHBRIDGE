# M7 Reliable Healthcare Data Exchange Workflow

## 1. Exchange State Machine

Exchange jobs in M7 follow a strictly defined, audited finite state machine with legal transitions enforced by the application layer:

```
        ┌──────────────┐
        │   RECEIVED   │
        └───────┬──────┘
                │
                ▼
        ┌──────────────┐
   ┌───►│  VALIDATING  ├──────────┐
   │    └───────┬──────┘          │
   │            │                 ▼
   │            ▼          ┌─────────────┐
   │    ┌──────────────┐   │   BLOCKED   │ (Terminal)
   │    │  AUTHORIZED  │   └─────────────┘
   │    └───────┬──────┘          ▲
   │            │                 │
   │            ▼                 │
   │    ┌──────────────┐          │
   │    │    QUEUED    ├──────────┘
   │    └───────┬──────┘
   │            │
   │            ▼
   │    ┌──────────────┐   ┌─────────────┐
   │    │  DELIVERING  ├──►│  CANCELLED  │ (Terminal)
   │    └───────┬──────┘   └─────────────┘
   │            │
   │     ┌──────┴──────┐
   │     ▼             ▼
   │┌─────────┐ ┌──────────────┐
   ││DELIVERED│ │RETRY_SCHED'D │
   │└─────────┘ └──────┬───────┘
   │ (Terminal)        │ (Backoff & pre-dispatch check)
   └───────────────────┘
```

### Legal Transitions Matrix
- `RECEIVED` $\rightarrow$ `VALIDATING`, `CANCELLED`, `BLOCKED`
- `VALIDATING` $\rightarrow$ `AUTHORIZED`, `BLOCKED`, `FAILED_PERMANENTLY`, `CANCELLED`
- `AUTHORIZED` $\rightarrow$ `QUEUED`, `CANCELLED`, `BLOCKED`
- `QUEUED` $\rightarrow$ `DELIVERING`, `CANCELLED`, `BLOCKED`
- `DELIVERING` $\rightarrow$ `DELIVERED`, `RETRY_SCHEDULED`, `FAILED_PERMANENTLY`, `CANCELLED`, `BLOCKED`
- `RETRY_SCHEDULED` $\rightarrow$ `DELIVERING`, `FAILED_PERMANENTLY`, `CANCELLED`, `BLOCKED`
- Terminal States: `DELIVERED`, `FAILED_PERMANENTLY`, `CANCELLED`, `BLOCKED`

---

## 2. Idempotency & Request Fingerprinting

Every exchange transmission can accept a client-supplied or server-generated `idempotency_key`.

1. The service maintains a durable index of `(caller_org, idempotency_key) -> job_id`.
2. When a request is received, a canonical SHA-256 fingerprint of the request payload is calculated.
3. If the idempotency key was previously processed:
   - **Matching Fingerprint**: The cached `ExchangeJob` and `ReceiverReceipt` are returned immediately with `is_idempotent_replay: true`. No duplicated network delivery is triggered.
   - **Conflicting Fingerprint**: An HTTP 409 Conflict (`IDEMPOTENCY_CONFLICT`) error is raised.

---

## 3. Bounded Retry Strategy

When communicating with remote hospital receivers:
- **Transient Failures (HTTP 503 / Timeout)**: Automatically scheduled for retry up to `MAX_RETRY_ATTEMPTS` (default: 3) with configurable exponential backoff (`RETRY_BACKOFF_SECONDS`).
- **Permanent Failures (HTTP 400 / 404 / 422)**: Immediately marked as `FAILED_PERMANENTLY`. Retries are omitted to avoid useless network load.
- **Pre-Dispatch Revocation Revalidation**: Immediately prior to each retry dispatch, consent status is re-verified against the registry. If consent was revoked during backoff, delivery is immediately aborted and the job transitions to `CANCELLED`.

---

## 4. Simulated Hospital Receiver

To support reproducible testing without live clinical infrastructure, the prototype includes a simulated receiving hospital endpoint (`/api/v1/exchange/receiver/simulate`):
- Recognizes registered simulated hospitals (`HOSPITAL_B`, `HOSPITAL_A`, `LAB_C`, `HIU_TN_001`, `HIU_TN_002`, `CITY_CARE_SIM`).
- Validates the transport envelope and verifies payload SHA-256 integrity digests.
- Caches receipts by `delivery_id` to ensure idempotent receiver processing.
- Supports deterministic simulation modes (`normal`, `transient_failure`, `permanent_failure`) for testing error recovery and retries.
