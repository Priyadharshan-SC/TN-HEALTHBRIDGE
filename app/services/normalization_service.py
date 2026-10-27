"""M2 Normalization Service: maps source records to canonical laboratory schemas and assesses quality."""
import logging
import math
import re
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple, Union

from app.core.config import get_settings
from app.core.errors import (
    InvalidEnvelopeError,
    NormalizationRecordLimitExceededError,
)
from app.core.normalization_config import (
    CANONICAL_OBSERVED_AT,
    CANONICAL_PATIENT_REFERENCE,
    CANONICAL_RESULT,
    CANONICAL_SPECIMEN,
    CANONICAL_TEST_NAME,
    CANONICAL_UNIT,
    REQUIRED_CANONICAL_FIELDS,
    IssueCodes,
    get_provider_mapping,
)
from app.schemas.ingestion import IngestionResponse
from app.schemas.normalization import (
    CanonicalLabRecord,
    NormalizationResponse,
    NormalizedRecord,
    QualityIssue,
)

logger = logging.getLogger("tn_healthbridge.normalization")

# Robust pattern for valid numbers: integers, decimals, and scientific notation
# Covers: 0, 0.0, 0e0, .5, 1., -.5, .5e-3, 1.e-3, +.5E+2, 1.25e-3, 1e999, 1e-999
VALID_NUMERIC_PATTERN = re.compile(r"^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$")


class NormalizationService:
    """Service handling field mapping, type normalization, quality assessment, and batch assembly."""

    @classmethod
    def normalize_batch(cls, ingestion_envelope: IngestionResponse) -> NormalizationResponse:
        """Process an M1 ingestion response into a standardized M2 canonical response.
        
        Guarantees that the input ingestion_envelope is never mutated in place.
        """
        # 1. Validate envelope integrity
        cls._validate_envelope(ingestion_envelope)

        # 2. Retrieve provider mapping profile
        provider_id = ingestion_envelope.source_provider_id
        source_format = ingestion_envelope.source_format
        mapping_profile = get_provider_mapping(provider_id, source_format)

        normalized_records: List[NormalizedRecord] = []

        # 3. Process each record independently
        for idx, item in enumerate(ingestion_envelope.records):
            normalized_record = cls.normalize_record(
                record_index=idx,
                source_fields=item.source_fields,
                field_map=mapping_profile.field_map,
            )
            normalized_records.append(normalized_record)

        # 4. Compute aggregate quality counts
        valid_count = sum(1 for r in normalized_records if r.quality_status == "valid")
        warning_count = sum(1 for r in normalized_records if r.quality_status == "warning")
        rejected_count = sum(1 for r in normalized_records if r.quality_status == "rejected")
        total_count = len(normalized_records)

        normalization_id = str(uuid.uuid4())

        response = NormalizationResponse(
            normalization_id=normalization_id,
            ingestion_id=ingestion_envelope.ingestion_id,
            source_provider_id=provider_id,
            status="completed",
            record_count=total_count,
            valid_count=valid_count,
            warning_count=warning_count,
            rejected_count=rejected_count,
            records=normalized_records,
        )

        # Operational telemetry only - zero clinical payload data in logs
        logger.info(
            "Batch normalized: normalization_id=%s, ingestion_id=%s, provider=%s, "
            "records=%d, valid=%d, warning=%d, rejected=%d",
            normalization_id,
            ingestion_envelope.ingestion_id,
            provider_id,
            total_count,
            valid_count,
            warning_count,
            rejected_count,
        )

        return response

    @classmethod
    def _validate_envelope(cls, envelope: IngestionResponse) -> None:
        """Ensure the M1 envelope contains valid required provenance and batch metadata."""
        if not envelope.ingestion_id or not envelope.ingestion_id.strip():
            raise InvalidEnvelopeError("Ingestion envelope must contain a valid non-empty 'ingestion_id'.")
        if not envelope.source_provider_id or not envelope.source_provider_id.strip():
            raise InvalidEnvelopeError("Ingestion envelope must contain a valid non-empty 'source_provider_id'.")
        if not envelope.source_format or not envelope.source_format.strip():
            raise InvalidEnvelopeError("Ingestion envelope must contain a valid non-empty 'source_format'.")
        if envelope.record_count < 0:
            raise InvalidEnvelopeError("Envelope 'record_count' cannot be negative.")
        if envelope.record_count != len(envelope.records):
            raise InvalidEnvelopeError(
                f"Envelope 'record_count' ({envelope.record_count}) does not match "
                f"actual records length ({len(envelope.records)})."
            )

        settings = get_settings()
        max_records = getattr(settings, "MAX_NORMALIZATION_RECORD_COUNT", settings.MAX_RECORD_COUNT)
        if len(envelope.records) > max_records:
            raise NormalizationRecordLimitExceededError(
                record_count=len(envelope.records),
                max_records=max_records,
            )

    @classmethod
    def normalize_record(
        cls,
        record_index: int,
        source_fields: Dict[str, Any],
        field_map: Dict[str, str],
    ) -> NormalizedRecord:
        """Map and assess data quality for an individual record."""
        # Deepcopy source fields dictionary to prevent mutating caller's state
        original_fields = dict(source_fields)
        issues: List[QualityIssue] = []

        # Validate basic record structure
        if not isinstance(original_fields, dict) or not original_fields:
            issues.append(
                QualityIssue(
                    code=IssueCodes.UNUSABLE_RECORD_STRUCTURE,
                    severity="rejected",
                    message="Record structure is empty or not a valid dictionary.",
                )
            )
            return NormalizedRecord(
                record_index=record_index,
                canonical_fields=CanonicalLabRecord(),
                original_fields=original_fields or {},
                unmapped_fields={},
                quality_status="rejected",
                quality_issues=issues,
            )

        # 1. Map fields and detect conflicts & unknown fields
        mapped_canonical: Dict[str, Any] = {}
        mapped_source_keys: Dict[str, str] = {}
        unmapped_fields: Dict[str, Any] = {}
        conflicting_canonical: set = set()

        for src_key, src_val in original_fields.items():
            if src_key in field_map:
                target_canonical = field_map[src_key]
                if target_canonical in conflicting_canonical:
                    continue

                if cls._is_absent(src_val):
                    # Record the alias as absent if target_canonical has not yet been recorded
                    if target_canonical not in mapped_canonical:
                        mapped_canonical[target_canonical] = None
                        mapped_source_keys[target_canonical] = src_key
                    continue

                # src_val is a usable, non-absent value
                if target_canonical in mapped_canonical and not cls._is_absent(mapped_canonical[target_canonical]):
                    # Both existing and current aliases have non-empty values
                    existing_val = mapped_canonical[target_canonical]
                    if cls._values_conflict(existing_val, src_val):
                        conflicting_canonical.add(target_canonical)
                        is_required = target_canonical in REQUIRED_CANONICAL_FIELDS
                        issues.append(
                            QualityIssue(
                                code=IssueCodes.CONFLICTING_FIELD_VALUES,
                                severity="rejected" if is_required else "warning",
                                message=(
                                    f"Conflicting values mapped to '{target_canonical}' from source fields "
                                    f"'{mapped_source_keys[target_canonical]}' and '{src_key}'."
                                ),
                                field=target_canonical,
                            )
                        )
                        # Crucial rule: Never select a conflicting value arbitrarily; leave unresolved
                        mapped_canonical[target_canonical] = None
                    else:
                        # Non-conflicting equivalent values, keep usable value
                        pass
                else:
                    # Either not mapped yet, or previous alias was absent!
                    # Usable value takes precedence over absent/blank alias
                    mapped_canonical[target_canonical] = src_val
                    mapped_source_keys[target_canonical] = src_key
            else:
                unmapped_fields[src_key] = src_val
                issues.append(
                    QualityIssue(
                        code=IssueCodes.UNKNOWN_SOURCE_FIELD,
                        severity="warning",
                        message=f"Unknown source field '{src_key}' preserved in unmapped_fields.",
                        field=src_key,
                    )
                )

        # 2. Validate & normalize Required: patient_reference
        norm_patient_ref: Optional[str] = None
        if CANONICAL_PATIENT_REFERENCE in conflicting_canonical:
            norm_patient_ref = None
        else:
            raw_patient_ref = mapped_canonical.get(CANONICAL_PATIENT_REFERENCE)
            if raw_patient_ref is None or str(raw_patient_ref).strip() == "":
                issues.append(
                    QualityIssue(
                        code=IssueCodes.MISSING_REQUIRED_PATIENT_REF,
                        severity="rejected",
                        message="Missing required patient reference.",
                        field=CANONICAL_PATIENT_REFERENCE,
                    )
                )
            else:
                norm_patient_ref = str(raw_patient_ref).strip()

        # 3. Validate & normalize Required: test_name
        norm_test_name: Optional[str] = None
        if CANONICAL_TEST_NAME in conflicting_canonical:
            norm_test_name = None
        else:
            raw_test_name = mapped_canonical.get(CANONICAL_TEST_NAME)
            if raw_test_name is None or str(raw_test_name).strip() == "":
                issues.append(
                    QualityIssue(
                        code=IssueCodes.MISSING_REQUIRED_TEST_NAME,
                        severity="rejected",
                        message="Missing required laboratory test name.",
                        field=CANONICAL_TEST_NAME,
                    )
                )
            else:
                norm_test_name = str(raw_test_name).strip()

        # 4. Validate & normalize Required: result
        norm_result: Optional[Union[int, float, str]] = None
        if CANONICAL_RESULT in conflicting_canonical:
            norm_result = None
        else:
            raw_result = mapped_canonical.get(CANONICAL_RESULT)
            if raw_result is None or (isinstance(raw_result, str) and raw_result.strip() == ""):
                issues.append(
                    QualityIssue(
                        code=IssueCodes.MISSING_REQUIRED_RESULT,
                        severity="rejected",
                        message="Missing required laboratory result value.",
                        field=CANONICAL_RESULT,
                    )
                )
            else:
                norm_result, result_issues = cls._normalize_result(raw_result)
                issues.extend(result_issues)

        # 5. Validate & normalize Optional: unit
        norm_unit: Optional[str] = None
        if CANONICAL_UNIT in conflicting_canonical:
            norm_unit = None
        else:
            raw_unit = mapped_canonical.get(CANONICAL_UNIT)
            if raw_unit is None or (isinstance(raw_unit, str) and raw_unit.strip() == ""):
                issues.append(
                    QualityIssue(
                        code=IssueCodes.MISSING_OPTIONAL_UNIT,
                        severity="warning",
                        message="Measurement unit is not provided.",
                        field=CANONICAL_UNIT,
                    )
                )
            else:
                norm_unit = str(raw_unit).strip()

        # 6. Validate & normalize Optional: observed_at
        norm_observed_at: Optional[str] = None
        if CANONICAL_OBSERVED_AT in conflicting_canonical:
            norm_observed_at = None
        else:
            raw_observed_at = mapped_canonical.get(CANONICAL_OBSERVED_AT)
            if raw_observed_at is not None and str(raw_observed_at).strip() != "":
                norm_observed_at, date_issues = cls._normalize_timestamp(raw_observed_at)
                issues.extend(date_issues)

        # 7. Validate & normalize Optional: specimen
        norm_specimen: Optional[str] = None
        if CANONICAL_SPECIMEN in conflicting_canonical:
            norm_specimen = None
        else:
            raw_specimen = mapped_canonical.get(CANONICAL_SPECIMEN)
            norm_specimen = str(raw_specimen).strip() if raw_specimen is not None else None

        canonical_fields = CanonicalLabRecord(
            patient_reference=norm_patient_ref,
            test_name=norm_test_name,
            result=norm_result,
            unit=norm_unit,
            observed_at=norm_observed_at,
            specimen=norm_specimen,
        )

        # 8. Determine overall record quality status
        if any(issue.severity == "rejected" for issue in issues):
            quality_status = "rejected"
        elif any(issue.severity == "warning" for issue in issues):
            quality_status = "warning"
        else:
            quality_status = "valid"

        return NormalizedRecord(
            record_index=record_index,
            canonical_fields=canonical_fields,
            original_fields=original_fields,
            unmapped_fields=unmapped_fields,
            quality_status=quality_status,
            quality_issues=issues,
        )

    @classmethod
    def _is_absent(cls, val: Any) -> bool:
        """Check if a value is absent (None, empty string, or whitespace-only string)."""
        if val is None:
            return True
        if isinstance(val, str) and val.strip() == "":
            return True
        return False

    @classmethod
    def _values_conflict(cls, val1: Any, val2: Any) -> bool:
        """Return True if two values are both provided (non-absent) and conflict."""
        if cls._is_absent(val1) or cls._is_absent(val2):
            return False
        if type(val1) is not type(val2):
            try:
                if str(val1).strip() == str(val2).strip():
                    return False
            except Exception:
                pass
            return True
        s1 = str(val1).strip()
        s2 = str(val2).strip()
        return s1 != s2

    @classmethod
    def _normalize_result(cls, val: Any) -> Tuple[Optional[Union[int, float, str]], List[QualityIssue]]:
        """Normalize numeric result or preserve qualitative string result."""
        issues: List[QualityIssue] = []

        # 1. Reject Booleans explicitly (bool subclasses int in Python)
        if isinstance(val, bool):
            issues.append(
                QualityIssue(
                    code=IssueCodes.UNSUPPORTED_RESULT_TYPE,
                    severity="rejected",
                    message="Boolean values are not supported as laboratory result values.",
                    field=CANONICAL_RESULT,
                )
            )
            return None, issues

        # 2. Reject unsupported complex JSON types (dict, list, etc.)
        if isinstance(val, (dict, list, set, tuple)):
            issues.append(
                QualityIssue(
                    code=IssueCodes.UNSUPPORTED_RESULT_TYPE,
                    severity="rejected",
                    message="Complex objects or arrays are not supported as laboratory result values.",
                    field=CANONICAL_RESULT,
                )
            )
            return None, issues

        # 3. If already numeric (int or float)
        if isinstance(val, (int, float)):
            if math.isnan(val) or math.isinf(val):
                issues.append(
                    QualityIssue(
                        code=IssueCodes.INVALID_NUMERIC_VALUE,
                        severity="rejected",
                        message="Numeric result value is NaN or Infinite.",
                        field=CANONICAL_RESULT,
                    )
                )
                return None, issues
            return val, issues

        # 4. If string representation
        if not isinstance(val, str):
            issues.append(
                QualityIssue(
                    code=IssueCodes.UNSUPPORTED_RESULT_TYPE,
                    severity="rejected",
                    message="Unsupported data type for laboratory result.",
                    field=CANONICAL_RESULT,
                )
            )
            return None, issues

        val_str = val.strip()

        # Reject NaN / Infinity string representations
        if val_str.lower() in ("nan", "inf", "-inf", "+inf", "infinity", "-infinity", "+infinity"):
            issues.append(
                QualityIssue(
                    code=IssueCodes.INVALID_NUMERIC_VALUE,
                    severity="rejected",
                    message="Numeric result value is NaN or Infinite.",
                    field=CANONICAL_RESULT,
                )
            )
            return None, issues

        # Check for ambiguous ranges/ratios (e.g. "95-100" or "12/30")
        if re.match(r"^\d+\s*[-/]\s*\d+$", val_str):
            issues.append(
                QualityIssue(
                    code=IssueCodes.AMBIGUOUS_NUMERIC_VALUE,
                    severity="warning",
                    message="Ambiguous numeric range or ratio preserved as string.",
                    field=CANONICAL_RESULT,
                )
            )
            return val_str, issues

        # Check valid numeric forms (integers, decimals, and scientific notation)
        if VALID_NUMERIC_PATTERN.match(val_str):
            # Pure integer representation
            if re.match(r"^[+-]?\d+$", val_str):
                try:
                    return int(val_str), issues
                except ValueError:
                    pass

            # Floating-point representation (decimals, scientific notation)
            try:
                f_val = float(val_str)
                if math.isinf(f_val) or math.isnan(f_val):
                    issues.append(
                        QualityIssue(
                            code=IssueCodes.INVALID_NUMERIC_VALUE,
                            severity="rejected",
                            message="Numeric result value overflowed or infinite.",
                            field=CANONICAL_RESULT,
                        )
                    )
                    return None, issues

                # Detect floating-point underflow to 0.0 for non-zero inputs
                mantissa = re.split(r"[eE]", val_str, maxsplit=1)[0]
                if f_val == 0.0 and re.search(r"[1-9]", mantissa):
                    issues.append(
                        QualityIssue(
                            code=IssueCodes.INVALID_NUMERIC_VALUE,
                            severity="rejected",
                            message="Numeric result value underflowed to zero.",
                            field=CANONICAL_RESULT,
                        )
                    )
                    return None, issues

                return f_val, issues
            except OverflowError:
                issues.append(
                    QualityIssue(
                        code=IssueCodes.INVALID_NUMERIC_VALUE,
                        severity="rejected",
                        message="Numeric result value overflowed.",
                        field=CANONICAL_RESULT,
                    )
                )
                return None, issues

        # Check for malformed numeric-looking strings
        if (
            val_str.count(".") > 1
            or re.search(r"[+-]{2,}", val_str)
            or val_str in (".", "+", "-", "+.", "-.")
            or re.search(r"^[+-]?(?:\d+(?:\.\d*)?|\.\d*)[eE]", val_str)
            or re.match(r"^[eE][+-]?\d", val_str)
            or re.match(r"^[+-]?(?:\d+\.?\d*|\.\d+)[a-zA-DF-Z]", val_str)
        ):
            issues.append(
                QualityIssue(
                    code=IssueCodes.INVALID_NUMERIC_VALUE,
                    severity="rejected",
                    message="Malformed numeric result format.",
                    field=CANONICAL_RESULT,
                )
            )
            return None, issues

        # Qualitative textual result (e.g. "Positive", "Negative", "Normal", "Reactive")
        return val_str, issues

    @classmethod
    def _normalize_timestamp(cls, val: Any) -> Tuple[Optional[str], List[QualityIssue]]:
        """Normalize supported timestamp format to ISO 8601 without inventing timezones or times."""
        issues: List[QualityIssue] = []
        if not isinstance(val, str):
            issues.append(
                QualityIssue(
                    code=IssueCodes.MALFORMED_TIMESTAMP,
                    severity="warning",
                    message="Timestamp must be a string format.",
                    field=CANONICAL_OBSERVED_AT,
                )
            )
            return None, issues

        val_str = val.strip()

        # 1. Date-only handling: YYYY-MM-DD
        # Must preserve as date-only without fabricating T00:00:00 or timezone!
        if re.match(r"^\d{4}-\d{2}-\d{2}$", val_str):
            try:
                dt = datetime.strptime(val_str, "%Y-%m-%d")
                return dt.date().isoformat(), issues
            except ValueError:
                issues.append(
                    QualityIssue(
                        code=IssueCodes.MALFORMED_TIMESTAMP,
                        severity="warning",
                        message="Malformed date value.",
                        field=CANONICAL_OBSERVED_AT,
                    )
                )
                return None, issues

        # 2. Detect ambiguous date format, e.g. "01/02/2026" or "05/06/2026"
        slash_match = re.match(r"^(\d{1,2})/(\d{1,2})/(\d{2,4})$", val_str)
        if slash_match:
            p1, p2 = int(slash_match.group(1)), int(slash_match.group(2))
            if p1 <= 12 and p2 <= 12:
                issues.append(
                    QualityIssue(
                        code=IssueCodes.AMBIGUOUS_TIMESTAMP,
                        severity="warning",
                        message="Ambiguous date format cannot be safely resolved without locale assumption.",
                        field=CANONICAL_OBSERVED_AT,
                    )
                )
                return None, issues
            else:
                issues.append(
                    QualityIssue(
                        code=IssueCodes.MALFORMED_TIMESTAMP,
                        severity="warning",
                        message="Unsupported date format. Use ISO 8601 format.",
                        field=CANONICAL_OBSERVED_AT,
                    )
                )
                return None, issues

        # 3. Try parsing ISO 8601 timestamp format with time
        try:
            dt = datetime.fromisoformat(val_str)
            # Preserve timezone if specified, preserve lack of timezone if naive
            return dt.isoformat(), issues
        except (ValueError, TypeError):
            pass

        # 4. Try common YYYY-MM-DD HH:MM:SS format
        try:
            dt = datetime.strptime(val_str, "%Y-%m-%d %H:%M:%S")
            return dt.isoformat(), issues
        except (ValueError, TypeError):
            pass

        # Malformed timestamp
        issues.append(
            QualityIssue(
                code=IssueCodes.MALFORMED_TIMESTAMP,
                severity="warning",
                message="Malformed or unsupported timestamp format.",
                field=CANONICAL_OBSERVED_AT,
            )
        )
        return None, issues
