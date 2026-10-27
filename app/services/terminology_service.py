"""M3 Clinical Terminology Mapping Service: maps laboratory tests to standardized concepts."""
import copy
import logging
import uuid
from typing import List, Optional

from app.core.config import get_settings
from app.core.errors import (
    EmptyTerminologyBatchError,
    InvalidTerminologyRequestError,
    TerminologyRecordLimitExceededError,
)
from app.core.terminology_config import get_cached_registry
from app.schemas.normalization import NormalizationResponse, NormalizedRecord
from app.schemas.terminology import (
    CandidateMappingReference,
    MappedRecord,
    MappingReasonCodes,
    TerminologyBatchResponse,
    TerminologyMappingEntry,
    TerminologyMappingResult,
    TerminologyRegistry,
)

logger = logging.getLogger("tn_healthbridge.terminology")


class TerminologyService:
    """Service handling clinical concept resolution, uncertainty assessment, and batch mapping."""

    @classmethod
    def map_batch(
        cls,
        normalization_envelope: NormalizationResponse,
        registry: Optional[TerminologyRegistry] = None,
    ) -> TerminologyBatchResponse:
        """Process an M2 normalization response into an M3 terminology-mapped batch response.
        
        Guarantees:
        - Independent record processing
        - Full preservation of source and normalized fields
        - Zero centralized storage or persistence of clinical payloads
        - Strict reconciliation of batch and per-status record counts
        """
        # 1. Validate envelope integrity and batch limits
        cls._validate_envelope(normalization_envelope)

        active_registry = registry or get_cached_registry()
        provider_id = normalization_envelope.source_provider_id

        mapped_records: List[MappedRecord] = []

        # 2. Process each record independently
        for record in normalization_envelope.records:
            mapping_result = cls.map_record(
                record=record,
                provider_id=provider_id,
                registry=active_registry,
            )

            mapped_record = MappedRecord(
                record_index=record.record_index,
                canonical_fields=record.canonical_fields.model_copy(deep=True),
                original_fields=copy.deepcopy(record.original_fields),
                unmapped_fields=copy.deepcopy(record.unmapped_fields),
                quality_status=record.quality_status,
                quality_issues=[q.model_copy() for q in record.quality_issues],
                terminology_mapping=mapping_result,
            )
            mapped_records.append(mapped_record)

        # 3. Compute aggregate per-status counts
        mapped_count = sum(1 for r in mapped_records if r.terminology_mapping.mapping_status == "mapped")
        unmapped_count = sum(1 for r in mapped_records if r.terminology_mapping.mapping_status == "unmapped")
        ambiguous_count = sum(1 for r in mapped_records if r.terminology_mapping.mapping_status == "ambiguous")
        review_required_count = sum(1 for r in mapped_records if r.terminology_mapping.mapping_status == "review_required")
        total_count = len(mapped_records)

        # Count reconciliation assertion
        assert mapped_count + unmapped_count + ambiguous_count + review_required_count == total_count

        mapping_id = str(uuid.uuid4())

        response = TerminologyBatchResponse(
            mapping_id=mapping_id,
            normalization_id=normalization_envelope.normalization_id,
            ingestion_id=normalization_envelope.ingestion_id,
            source_provider_id=provider_id,
            status="completed",
            registry_version=active_registry.registry_version,
            record_count=total_count,
            mapped_count=mapped_count,
            unmapped_count=unmapped_count,
            ambiguous_count=ambiguous_count,
            review_required_count=review_required_count,
            records=mapped_records,
        )

        # Operational telemetry only - zero clinical payload data in logs
        logger.info(
            "Batch terminology mapped: mapping_id=%s, normalization_id=%s, provider=%s, "
            "records=%d, mapped=%d, unmapped=%d, ambiguous=%d, review_required=%d",
            mapping_id,
            normalization_envelope.normalization_id,
            provider_id,
            total_count,
            mapped_count,
            unmapped_count,
            ambiguous_count,
            review_required_count,
        )

        return response

    @classmethod
    def map_record(
        cls,
        record: NormalizedRecord,
        provider_id: str,
        registry: TerminologyRegistry,
    ) -> TerminologyMappingResult:
        """Map a single record's test name against the terminology registry deterministically."""
        test_name = record.canonical_fields.test_name
        specimen = record.canonical_fields.specimen
        unit = record.canonical_fields.unit

        # 1. Missing test name
        if not test_name or not str(test_name).strip():
            return TerminologyMappingResult(
                source_test_name=None,
                mapping_status="unmapped",
                target_system=None,
                target_code=None,
                target_display=None,
                reason_code=MappingReasonCodes.MISSING_SOURCE_TEST_NAME,
                message="Source record is missing required test name; cannot evaluate terminology mapping.",
                registry_version=registry.registry_version,
                review_required=False,
                candidate_mappings=[],
            )

        clean_test_name = str(test_name).strip()
        lower_test_name = clean_test_name.lower()
        clean_provider = (provider_id or "").strip().upper()

        # 2. Step 1 of Policy: Exact configured match on source_test_name
        exact_matches = [
            m for m in registry.mappings
            if m.mapping_status == "active"
            and m.source_test_name.strip().lower() == lower_test_name
        ]

        matched_via_alias = False
        candidates: List[TerminologyMappingEntry] = []

        if exact_matches:
            # Check provider scoping: provider-specific matches take precedence
            provider_exact = [
                m for m in exact_matches
                if m.source_provider_id and m.source_provider_id.strip().upper() == clean_provider
            ]
            if provider_exact:
                candidates = provider_exact
            else:
                # Global scope (None or "*")
                global_exact = [
                    m for m in exact_matches
                    if not m.source_provider_id or m.source_provider_id.strip() == "*"
                ]
                candidates = global_exact
        else:
            # 3. Step 2 of Policy: Exact explicitly configured alias match
            alias_matches = [
                m for m in registry.mappings
                if m.mapping_status == "active"
                and any(a.strip().lower() == lower_test_name for a in m.source_aliases)
            ]
            if alias_matches:
                provider_alias = [
                    m for m in alias_matches
                    if m.source_provider_id and m.source_provider_id.strip().upper() == clean_provider
                ]
                if provider_alias:
                    candidates = provider_alias
                    matched_via_alias = True
                else:
                    global_alias = [
                        m for m in alias_matches
                        if not m.source_provider_id or m.source_provider_id.strip() == "*"
                    ]
                    candidates = global_alias
                    matched_via_alias = True if global_alias else False


        # 4. Step 3 of Policy: If no candidate found -> unmapped
        if not candidates:
            return TerminologyMappingResult(
                source_test_name=clean_test_name,
                mapping_status="unmapped",
                target_system=None,
                target_code=None,
                target_display=None,
                reason_code=MappingReasonCodes.NO_MAPPING_FOUND,
                message="No configured terminology mapping found for source test name.",
                registry_version=registry.registry_version,
                review_required=False,
                candidate_mappings=[],
            )

        # 5. Step 4 of Policy: Context and constraint evaluation
        compatible_candidates: List[TerminologyMappingEntry] = []
        conflicted_candidates: List[tuple] = []  # (entry, fail_code, fail_message)

        for cand in candidates:
            specimen_ok = True
            specimen_fail = None

            # Specimen constraint evaluation
            if cand.specimen_constraints is not None:
                if specimen and str(specimen).strip():
                    spec_clean = str(specimen).strip().lower()
                    allowed_specs = [s.strip().lower() for s in cand.specimen_constraints]
                    if spec_clean not in allowed_specs:
                        specimen_ok = False
                        specimen_fail = (
                            MappingReasonCodes.SPECIMEN_MISMATCH,
                            "Source specimen conflicts with mapping constraints.",
                        )
                else:
                    if cand.require_specimen:
                        specimen_ok = False
                        specimen_fail = (
                            MappingReasonCodes.MISSING_REQUIRED_SPECIMEN,
                            "Required specimen context is missing from source record.",
                        )
            else:
                if cand.require_specimen and (not specimen or not str(specimen).strip()):
                    specimen_ok = False
                    specimen_fail = (
                        MappingReasonCodes.MISSING_REQUIRED_SPECIMEN,
                        "Required specimen context is missing from source record.",
                    )

            unit_ok = True
            unit_fail = None

            # Unit constraint evaluation
            if cand.unit_constraints is not None:
                if unit and str(unit).strip():
                    unit_clean = str(unit).strip().lower()
                    allowed_units = [u.strip().lower() for u in cand.unit_constraints]
                    if unit_clean not in allowed_units:
                        unit_ok = False
                        unit_fail = (
                            MappingReasonCodes.UNIT_MISMATCH,
                            "Source unit conflicts with mapping constraints.",
                        )
                else:
                    if cand.require_unit:
                        unit_ok = False
                        unit_fail = (
                            MappingReasonCodes.MISSING_REQUIRED_UNIT,
                            "Required unit context is missing from source record.",
                        )
            else:
                if cand.require_unit and (not unit or not str(unit).strip()):
                    unit_ok = False
                    unit_fail = (
                        MappingReasonCodes.MISSING_REQUIRED_UNIT,
                        "Required unit context is missing from source record.",
                    )

            if specimen_ok and unit_ok:
                compatible_candidates.append(cand)
            elif not specimen_ok and not unit_ok:
                conflicted_candidates.append((
                    cand,
                    MappingReasonCodes.CONTEXT_MISMATCH,
                    "Both specimen and unit constraints conflict with mapping configuration.",
                ))
            elif not specimen_ok:
                conflicted_candidates.append((cand, specimen_fail[0], specimen_fail[1]))
            else:
                conflicted_candidates.append((cand, unit_fail[0], unit_fail[1]))

        # Case A: All candidates failed contextual constraints
        if len(compatible_candidates) == 0:
            cand_refs = [
                CandidateMappingReference(
                    mapping_id=c.mapping_id,
                    target_system=c.target_system,
                    target_code=c.target_code,
                    target_display=c.target_display,
                    rationale=c.rationale,
                )
                for c, _, _ in conflicted_candidates
            ]
            failure_codes = {fail_code for _, fail_code, _ in conflicted_candidates}
            if (
                MappingReasonCodes.CONTEXT_MISMATCH in failure_codes
                or (
                    MappingReasonCodes.SPECIMEN_MISMATCH in failure_codes
                    and MappingReasonCodes.UNIT_MISMATCH in failure_codes
                )
            ):
                primary_code = MappingReasonCodes.CONTEXT_MISMATCH
                primary_msg = "Both specimen and unit constraints conflict with mapping configuration."
            else:
                primary_code = conflicted_candidates[0][1]
                primary_msg = conflicted_candidates[0][2]

            return TerminologyMappingResult(
                source_test_name=clean_test_name,
                mapping_status="review_required",
                target_system=None,
                target_code=None,
                target_display=None,
                reason_code=primary_code,
                message=primary_msg,
                registry_version=registry.registry_version,
                review_required=True,
                candidate_mappings=cand_refs,
            )

        # Policy: An M2-rejected record cannot be represented as an unconditionally usable mapped record.
        # Withhold concept assignment, preserve upstream status/issues, and route for clinical review.
        if record.quality_status == "rejected":
            cand_refs = [
                CandidateMappingReference(
                    mapping_id=c.mapping_id,
                    target_system=c.target_system,
                    target_code=c.target_code,
                    target_display=c.target_display,
                    rationale=c.rationale,
                )
                for c in compatible_candidates
            ]
            return TerminologyMappingResult(
                source_test_name=clean_test_name,
                mapping_status="review_required",
                target_system=None,
                target_code=None,
                target_display=None,
                reason_code=MappingReasonCodes.UPSTREAM_QUALITY_REJECTION,
                message="Upstream data quality rejected; terminology mapping withheld pending clinical quality resolution.",
                registry_version=registry.registry_version,
                review_required=True,
                candidate_mappings=cand_refs,
            )

        # Case B: Multiple candidates remain compatible -> Ambiguous
        if len(compatible_candidates) > 1:
            cand_refs = [
                CandidateMappingReference(
                    mapping_id=c.mapping_id,
                    target_system=c.target_system,
                    target_code=c.target_code,
                    target_display=c.target_display,
                    rationale=c.rationale,
                )
                for c in compatible_candidates
            ]
            return TerminologyMappingResult(
                source_test_name=clean_test_name,
                mapping_status="ambiguous",
                target_system=None,
                target_code=None,
                target_display=None,
                reason_code=MappingReasonCodes.MULTIPLE_CANDIDATE_MAPPINGS,
                message="Multiple plausible terminology mappings identified. Requires human review.",
                registry_version=registry.registry_version,
                review_required=True,
                candidate_mappings=cand_refs,
            )

        # Case C: Exactly one compatible candidate
        cand = compatible_candidates[0]
        cand_ref = CandidateMappingReference(
            mapping_id=cand.mapping_id,
            target_system=cand.target_system,
            target_code=cand.target_code,
            target_display=cand.target_display,
            rationale=cand.rationale,
        )


        if cand.human_review_required:
            return TerminologyMappingResult(
                source_test_name=clean_test_name,
                mapping_status="review_required",
                target_system=None,
                target_code=None,
                target_display=None,
                reason_code=MappingReasonCodes.EXPLICIT_REVIEW_FLAG,
                message="Mapping candidate is flagged as requiring human clinical review.",
                registry_version=registry.registry_version,
                review_required=True,
                candidate_mappings=[cand_ref],
            )

        return TerminologyMappingResult(
            source_test_name=clean_test_name,
            mapping_status="mapped",
            target_system=cand.target_system,
            target_code=cand.target_code,
            target_display=cand.target_display,
            reason_code=MappingReasonCodes.ALIAS_MATCH if matched_via_alias else MappingReasonCodes.EXACT_MATCH,
            message="Successfully mapped to standardized concept.",
            registry_version=registry.registry_version,
            review_required=False,
            candidate_mappings=[cand_ref],
        )

    @classmethod
    def _validate_envelope(cls, envelope: NormalizationResponse) -> None:
        """Validate M2 normalization envelope structure, count reconciliation, and batch limits."""
        if not envelope.normalization_id or not envelope.normalization_id.strip():
            raise InvalidTerminologyRequestError("Envelope missing required normalization_id.")

        if not envelope.source_provider_id or not envelope.source_provider_id.strip():
            raise InvalidTerminologyRequestError("Envelope missing required source_provider_id.")

        actual_records_count = len(envelope.records)
        if actual_records_count == 0:
            raise EmptyTerminologyBatchError("Terminology batch contains no records.")

        if envelope.record_count != actual_records_count:
            raise InvalidTerminologyRequestError(
                f"Envelope record_count ({envelope.record_count}) does not match "
                f"actual number of records ({actual_records_count})."
            )

        settings = get_settings()
        if actual_records_count > settings.MAX_TERMINOLOGY_RECORD_COUNT:
            raise TerminologyRecordLimitExceededError(
                record_count=actual_records_count,
                max_records=settings.MAX_TERMINOLOGY_RECORD_COUNT,
            )
