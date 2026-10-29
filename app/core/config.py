"""Application configuration using Pydantic Settings."""
from functools import lru_cache
from typing import Set, Union
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Central configuration for TN HealthBridge M1 Data Ingestion Layer."""
    
    # Environment & API metadata
    ENVIRONMENT: str = "development"
    PROJECT_NAME: str = "TN HealthBridge"
    API_V1_PREFIX: str = "/api/v1"
    
    # Ingestion, normalization & terminology constraints
    MAX_UPLOAD_SIZE_BYTES: int = 1_048_576  # 1 MB
    MAX_RECORD_COUNT: int = 1_000
    MAX_NORMALIZATION_RECORD_COUNT: int = 1_000
    MAX_TERMINOLOGY_RECORD_COUNT: int = 1_000
    MAX_IDENTITY_RECORD_COUNT: int = 1_000
    
    # Simulated provider allowlist (6 Federated Providers)
    ALLOWED_PROVIDERS: Union[Set[str], str] = {
        "HOSPITAL_A",   # City Hospital 1
        "LAB_C",        # Central Laboratory
        "HOSPITAL_B",   # Metro Hospital
        "HOSPITAL_D",   # Sunrise Hospital
        "LAB_E",        # Elite Diagnostics
        "CLINIC_F",     # Green Valley Clinic
    }

    # Simulated Health Information User (HIU) allowlist
    ALLOWED_HIUS: Union[Set[str], str] = {
        "HIU_TN_001",
        "HIU_TN_002",
        "HOSPITAL_A",
        "HOSPITAL_B",
        "LAB_C",
        "HOSPITAL_D",
        "LAB_E",
        "CLINIC_F",
    }

    # Authoritative synthetic identity fixture registry path
    SYNTHETIC_IDENTITY_REGISTRY_PATH: str = "data/identity/synthetic_identity_registry.json"

    # M5 FHIR Assembly constraints
    MAX_FHIR_RECORD_COUNT: int = 1_000

    # M6 ABDM Gateway & Consent constraints
    ALLOW_TEST_SIGNATURES: bool = True
    CONSENT_STORE_PATH: str = "data/gateway/consent_registry.json"
    MAX_CONSENT_VALIDITY_DAYS: int = 180
    MAX_CLOCK_DRIFT_MINUTES: int = 5

    # Application Authentication & Security
    JWT_SECRET_KEY: str = "insecure-test-secret-key-for-dev-only-min-32-chars"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # M7 Healthcare Data Exchange constraints
    EXCHANGE_STORE_PATH: str = "data/exchange/exchange_jobs.json"
    MAX_EXCHANGE_RECORD_COUNT: int = 1_000
    MAX_RETRY_ATTEMPTS: int = 3
    RETRY_BACKOFF_SECONDS: float = 0.5

    # Audit Logging
    AUDIT_LOG_PATH: str = "data/audit/audit_events.jsonl"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )
    
    @field_validator("ALLOWED_PROVIDERS", mode="before")
    @classmethod
    def parse_allowed_providers(cls, v: Union[Set[str], list, str]) -> Set[str]:
        if isinstance(v, str):
            return {p.strip() for p in v.split(",") if p.strip()}
        if isinstance(v, (list, set)):
            return {str(p).strip() for p in v if str(p).strip()}
        return set()

    @field_validator("ALLOWED_HIUS", mode="before")
    @classmethod
    def parse_allowed_hius(cls, v: Union[Set[str], list, str]) -> Set[str]:
        if isinstance(v, str):
            return {h.strip() for h in v.split(",") if h.strip()}
        if isinstance(v, (list, set)):
            return {str(h).strip() for h in v if str(h).strip()}
        return set()



@lru_cache()
def get_settings() -> Settings:
    """Return cached application settings instance."""
    return Settings()
