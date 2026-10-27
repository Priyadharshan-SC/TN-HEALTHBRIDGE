# Development Guide

## 1. Prerequisites

- **Python**: Version 3.11 or 3.12 (Python 3.11+ is required).
- **Package Manager**: `pip` (bundled with Python).
- **Operating System**: Platform-agnostic (Windows, Linux, macOS).
- **Git**: For version control.

---

## 2. Local Environment Setup

### 2.1 Clone Repository
```bash
git clone https://github.com/your-org/TN-HealthBridge.git
cd TN-HealthBridge
```

### 2.2 Create Virtual Environment

**Windows (PowerShell):**
```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

**Linux / macOS (Bash / Zsh):**
```bash
python3 -m venv .venv
source .venv/bin/activate
```

### 2.3 Install Dependencies

Install the core runtime dependencies:
```bash
pip install -r requirements.txt
```

For development, testing, and coverage analysis:
```bash
pip install -r requirements-dev.txt
```

---

## 3. Environment Configuration

TN HealthBridge provides sensible defaults for development. You can customize settings using environment variables or a `.env` file based on `.env.example`:

```bash
cp .env.example .env
```

Key configuration parameters (defined in `app/core/config.py`):

| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `ENVIRONMENT` | `development` | Deployment environment (`development`, `staging`, `production`). |
| `API_V1_PREFIX` | `/api/v1` | URL route prefix for v1 endpoints. |
| `MAX_UPLOAD_SIZE_BYTES` | `1048576` | Inbound payload stream size cap (1 MB). |
| `MAX_RECORD_COUNT` | `1000` | Maximum allowed records per batch. |
| `ALLOWED_PROVIDERS` | `["HOSPITAL_A", "HOSPITAL_B", "LAB_C"]` | JSON array of permitted source healthcare providers. |
| `SYNTHETIC_IDENTITY_REGISTRY_PATH` | `data/identity/synthetic_identity_registry.json` | Authoritative synthetic subjects registry. |
| `SYNTHETIC_LINKAGE_FIXTURES_PATH` | `data/identity/synthetic_linkage_fixtures.json` | Authorized synthetic linkage tokens registry. |
| `DEFAULT_TERMINOLOGY_REGISTRY_PATH`| `data/terminology/default_registry.json` | Versioned clinical terminology mapping registry. |

---

## 4. Running the Application Locally

Start the development server using Uvicorn:

```bash
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Once running:
- **API Base URL:** `http://127.0.0.1:8000`
- **Health Check:** `http://127.0.0.1:8000/health`
- **Swagger Documentation:** `http://127.0.0.1:8000/docs`
- **ReDoc Documentation:** `http://127.0.0.1:8000/redoc`
- **OpenAPI Schema:** `http://127.0.0.1:8000/openapi.json`

---

## 5. Repository Structure Conventions

```text
TN-HealthBridge/
├── app/
│   ├── api/             # FastAPI route controllers by module
│   ├── core/            # Configuration, error definitions, and registry loaders
│   ├── schemas/         # Strongly-typed Pydantic contracts
│   └── services/        # Stateless business logic and domain engines
├── data/
│   ├── identity/        # Authoritative synthetic identity & fixture registries
│   ├── samples/         # Sample CSV and JSON clinical test files
│   └── terminology/     # Versioned LOINC & synthetic terminology registries
├── docs/                # Architectural, module, API, and security documentation
└── tests/               # Pytest automated test suites for M1–M4
```

### Architectural Guardrails
- **Do not introduce a database:** TN HealthBridge is a stateless middleware; clinical records must never be persisted to a disk database.
- **Do not merge patient records:** M4 provides linkage assessment only; never write code that alters or combines patient records across providers.
- **Preserve raw fields:** Normalization must always preserve original source data and unmapped attributes in response models.
