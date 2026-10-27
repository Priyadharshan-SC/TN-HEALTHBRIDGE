"""M2 Normalization configuration: field mapping registry and quality issue codes."""
from typing import Dict, Optional
from pydantic import BaseModel, Field

from app.core.errors import NormalizationConfigurationError

# Canonical field names
CANONICAL_PATIENT_REFERENCE = "patient_reference"
CANONICAL_TEST_NAME = "test_name"
CANONICAL_RESULT = "result"
CANONICAL_UNIT = "unit"
CANONICAL_OBSERVED_AT = "observed_at"
CANONICAL_SPECIMEN = "specimen"

REQUIRED_CANONICAL_FIELDS = {
    CANONICAL_PATIENT_REFERENCE,
    CANONICAL_TEST_NAME,
    CANONICAL_RESULT,
}

OPTIONAL_CANONICAL_FIELDS = {
    CANONICAL_UNIT,
    CANONICAL_OBSERVED_AT,
    CANONICAL_SPECIMEN,
}


# Quality Issue Codes
class IssueCodes:
    MISSING_REQUIRED_PATIENT_REF = "MISSING_REQUIRED_PATIENT_REF"
    MISSING_REQUIRED_TEST_NAME = "MISSING_REQUIRED_TEST_NAME"
    MISSING_REQUIRED_RESULT = "MISSING_REQUIRED_RESULT"
    UNUSABLE_RECORD_STRUCTURE = "UNUSABLE_RECORD_STRUCTURE"
    CONFLICTING_FIELD_VALUES = "CONFLICTING_FIELD_VALUES"
    INVALID_NUMERIC_VALUE = "INVALID_NUMERIC_VALUE"
    UNSUPPORTED_RESULT_TYPE = "UNSUPPORTED_RESULT_TYPE"
    AMBIGUOUS_NUMERIC_VALUE = "AMBIGUOUS_NUMERIC_VALUE"
    MALFORMED_TIMESTAMP = "MALFORMED_TIMESTAMP"
    AMBIGUOUS_TIMESTAMP = "AMBIGUOUS_TIMESTAMP"
    MISSING_OPTIONAL_UNIT = "MISSING_OPTIONAL_UNIT"
    MISSING_OPTIONAL_OBSERVED_AT = "MISSING_OPTIONAL_OBSERVED_AT"
    UNKNOWN_SOURCE_FIELD = "UNKNOWN_SOURCE_FIELD"


class ProviderMappingProfile(BaseModel):
    """Field mapping definition for a registered healthcare provider."""
    provider_id: str = Field(..., description="Provider identifier")
    field_map: Dict[str, str] = Field(..., description="Source field to canonical field mapping")
    allowed_formats: list[str] = Field(
        default_factory=lambda: ["csv", "json"],
        description="List of explicitly supported source formats for this provider",
    )


# Registry of known provider field mappings
HOSPITAL_A_MAPPING = {
    "patient_id": CANONICAL_PATIENT_REFERENCE,
    "test_name": CANONICAL_TEST_NAME,
    "result": CANONICAL_RESULT,
    "unit": CANONICAL_UNIT,
    "test_datetime": CANONICAL_OBSERVED_AT,
    "specimen": CANONICAL_SPECIMEN,
}

HOSPITAL_B_MAPPING = {
    "patient_reference": CANONICAL_PATIENT_REFERENCE,
    "investigation": CANONICAL_TEST_NAME,
    "value": CANONICAL_RESULT,
    "measurement_unit": CANONICAL_UNIT,
    "observed_at": CANONICAL_OBSERVED_AT,
    "specimen": CANONICAL_SPECIMEN,
}

LAB_C_MAPPING = {
    "patient_id": CANONICAL_PATIENT_REFERENCE,
    "patient_reference": CANONICAL_PATIENT_REFERENCE,
    "marker": CANONICAL_TEST_NAME,
    "test_name": CANONICAL_TEST_NAME,
    "investigation": CANONICAL_TEST_NAME,
    "value": CANONICAL_RESULT,
    "result": CANONICAL_RESULT,
    "unit": CANONICAL_UNIT,
    "measurement_unit": CANONICAL_UNIT,
    "observed_at": CANONICAL_OBSERVED_AT,
    "test_datetime": CANONICAL_OBSERVED_AT,
    "specimen": CANONICAL_SPECIMEN,
}

PROVIDER_MAPPING_REGISTRY: Dict[str, ProviderMappingProfile] = {
    "HOSPITAL_A": ProviderMappingProfile(
        provider_id="HOSPITAL_A",
        field_map=HOSPITAL_A_MAPPING,
        allowed_formats=["csv"],
    ),
    "HOSPITAL_B": ProviderMappingProfile(
        provider_id="HOSPITAL_B",
        field_map=HOSPITAL_B_MAPPING,
        allowed_formats=["json"],
    ),
    "LAB_C": ProviderMappingProfile(
        provider_id="LAB_C",
        field_map=LAB_C_MAPPING,
        allowed_formats=["csv", "json"],
    ),
}


def get_provider_mapping(provider_id: str, source_format: Optional[str] = None) -> ProviderMappingProfile:
    """Retrieve the mapping profile for a given provider and validate source format."""
    if not provider_id or not provider_id.strip():
        raise NormalizationConfigurationError("Missing or empty provider ID in normalization request.")
        
    normalized_id = provider_id.strip().upper()
    if normalized_id not in PROVIDER_MAPPING_REGISTRY:
        raise NormalizationConfigurationError(
            f"No field-mapping configuration registered for provider '{provider_id}'."
        )
        
    profile = PROVIDER_MAPPING_REGISTRY[normalized_id]

    if source_format is not None and source_format.strip():
        clean_format = source_format.strip().lower()
        allowed_lower = [fmt.lower() for fmt in profile.allowed_formats]
        if clean_format not in allowed_lower:
            raise NormalizationConfigurationError(
                f"Provider '{provider_id}' does not support source format '{source_format}'. "
                f"Supported formats: {profile.allowed_formats}."
            )

    return profile
