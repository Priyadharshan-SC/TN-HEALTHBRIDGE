"""Patient Identity Safety and Uncertainty-Aware Linkage Service for M4."""
import logging
import uuid
from typing import Dict, List, Optional, Set, Tuple

from app.core.config import Settings, get_settings
from app.core.errors import (
    EmptyIdentityBatchError,
    IdentityRecordLimitExceededError,
    InvalidIdentityRequestError,
)
from app.core.identity_config import load_synthetic_identity_registry
from app.schemas.identity import (
    EvidenceCategory,
    IdentityAssessmentBatchRequest,
    IdentityAssessmentResponse,
    IdentityAssessmentResult,
    IdentityComparisonItem,
    IdentityDecisionStatus,
    IdentityReasonCodes,
    PatientDemographics,
    PatientIdentityRecord,
    ScopedPatientReference,
    SyntheticIdentityEntry,
    SyntheticIdentityRegistry,
)

logger = logging.getLogger("tn_healthbridge.identity")


class IdentityService:
    """Service evaluating patient identity references and linkage safety without central database storage."""

    def __init__(
        self,
        settings: Optional[Settings] = None,
        registry: Optional[SyntheticIdentityRegistry] = None,
    ):
        self.settings = settings or get_settings()
        self.registry: SyntheticIdentityRegistry = (
            registry
            if registry is not None
            else load_synthetic_identity_registry(
                self.settings.SYNTHETIC_IDENTITY_REGISTRY_PATH,
                allowed_providers=self.settings.ALLOWED_PROVIDERS,
            )
        )
        self._token_to_identity: Dict[str, SyntheticIdentityEntry] = {
            entry.identity_token: entry for entry in self.registry.identities
        }
        # Trusted tokens derive strictly from authoritative registry; cannot be overridden by callers
        self.trusted_tokens: Set[str] = set(self._token_to_identity.keys())

    def _is_reference_authorized(
        self,
        entry: SyntheticIdentityEntry,
        provider_id: str,
        local_id: str,
    ) -> bool:
        """Verify if a provider-scoped reference is explicitly authorized for this synthetic subject fixture."""
        prov_clean = provider_id.strip()
        local_clean = local_id.strip()
        for ref in entry.authorized_scoped_references:
            if (ref.source_provider_id or "").strip() == prov_clean and (ref.local_patient_id or "").strip() == local_clean:
                return True
        return False

    def assess_batch(
        self,
        request: IdentityAssessmentBatchRequest,
    ) -> IdentityAssessmentResponse:
        """
        Assess a batch of synthetic patient identity comparison pairs.
        Enforces batch limits, processes pairs independently, and provides exact count reconciliation.
        """
        if not request.comparisons:
            raise EmptyIdentityBatchError("Identity assessment batch contains no comparison pairs.")

        comparison_count = len(request.comparisons)
        if comparison_count > self.settings.MAX_IDENTITY_RECORD_COUNT:
            raise IdentityRecordLimitExceededError(
                comparison_count=comparison_count,
                max_comparisons=self.settings.MAX_IDENTITY_RECORD_COUNT,
            )

        batch_id = request.batch_id or f"id_batch_{uuid.uuid4().hex[:12]}"
        logger.info(
            "Assessing identity batch: batch_id=%s, total_comparisons=%d",
            batch_id,
            comparison_count,
        )

        results: List[IdentityAssessmentResult] = []
        for item in request.comparisons:
            result = self.assess_comparison(item)
            results.append(result)

        # Exact status count reconciliation
        same_count = sum(1 for r in results if r.status == "same_identity")
        diff_count = sum(1 for r in results if r.status == "different_identity")
        poss_count = sum(1 for r in results if r.status == "possible_match")
        unres_count = sum(1 for r in results if r.status == "unresolved")
        rev_count = sum(1 for r in results if r.status == "review_required")

        total = len(results)
        if (same_count + diff_count + poss_count + unres_count + rev_count) != total:
            logger.error("Batch count reconciliation mismatch in batch_id=%s", batch_id)
            raise InvalidIdentityRequestError("Assessment count reconciliation failure.")

        logger.info(
            "Identity batch completed: batch_id=%s, same=%d, diff=%d, possible=%d, unresolved=%d, review=%d",
            batch_id,
            same_count,
            diff_count,
            poss_count,
            unres_count,
            rev_count,
        )

        return IdentityAssessmentResponse(
            batch_id=batch_id,
            status="completed",
            total_comparisons=total,
            same_identity_count=same_count,
            different_identity_count=diff_count,
            possible_match_count=poss_count,
            unresolved_count=unres_count,
            review_required_count=rev_count,
            results=results,
        )

    def assess_comparison(
        self,
        item: IdentityComparisonItem,
    ) -> IdentityAssessmentResult:
        """
        Deterministic, explainable identity safety assessment for a single comparison pair.
        Enforces provider allowlist, synthetic token trust boundaries, reference-to-fixture
        authorization binding, independent demographic conflict detection, and never merges records.
        """
        comparison_id = item.comparison_id
        rec_a = item.record_a
        rec_b = item.record_b

        # 1. Validate comparison item structure and required local-reference fields
        if not rec_a or not rec_b:
            return self._build_result(
                comparison_id=comparison_id,
                status="unresolved",
                reason_code=IdentityReasonCodes.MALFORMED_IDENTITY_INPUT,
                message="Comparison records are missing or malformed.",
                evidence_categories=["missing_evidence"],
                review_required=False,
                rec_a=rec_a,
                rec_b=rec_b,
            )

        prov_a = (rec_a.source_provider_id or "").strip()
        prov_b = (rec_b.source_provider_id or "").strip()
        if not prov_a or not prov_b:
            return self._build_result(
                comparison_id=comparison_id,
                status="unresolved",
                reason_code=IdentityReasonCodes.PROVIDER_CONTEXT_MISSING,
                message="Provider context is missing on one or both references; cannot establish scoped identity.",
                evidence_categories=["missing_evidence"],
                review_required=False,
                rec_a=rec_a,
                rec_b=rec_b,
            )

        local_a = (rec_a.local_patient_id or "").strip()
        local_b = (rec_b.local_patient_id or "").strip()
        if not local_a or not local_b:
            return self._build_result(
                comparison_id=comparison_id,
                status="unresolved",
                reason_code=IdentityReasonCodes.LOCAL_REFERENCE_MISSING,
                message="Provider-local patient reference identifier is missing on one or both records.",
                evidence_categories=["missing_evidence"],
                review_required=False,
                rec_a=rec_a,
                rec_b=rec_b,
            )

        # 2. Validate provider contexts against configured provider allowlist
        allowed_providers = self.settings.ALLOWED_PROVIDERS
        if prov_a not in allowed_providers or prov_b not in allowed_providers:
            return self._build_result(
                comparison_id=comparison_id,
                status="unresolved",
                reason_code=IdentityReasonCodes.UNKNOWN_PROVIDER,
                message="One or both source provider IDs are not recognized in the configured provider allowlist.",
                evidence_categories=["missing_evidence"],
                review_required=False,
                rec_a=rec_a,
                rec_b=rec_b,
            )

        # Base evidence includes provider-local references
        evidence: List[EvidenceCategory] = ["provider_local_reference"]
        same_provider = (prov_a == prov_b)
        same_local_id = (local_a == local_b)

        token_a = (rec_a.identity_token or "").strip()
        token_b = (rec_b.identity_token or "").strip()
        has_token_a = bool(token_a)
        has_token_b = bool(token_b)

        # 3. Determine whether supplied token evidence is recognized by the controlled synthetic fixture registry
        entry_a = self._token_to_identity.get(token_a) if has_token_a else None
        entry_b = self._token_to_identity.get(token_b) if has_token_b else None
        trusted_token_a = entry_a is not None
        trusted_token_b = entry_b is not None

        # 4. Evaluate available demographic evidence and detect conflicts independently
        demo_similarity, demo_conflict = self._evaluate_demographics(
            rec_a.demographics,
            rec_b.demographics,
        )

        # 5. Resolve the outcome conservatively
        # 5a. Check if caller supplied untrusted/unregistered token(s)
        if (has_token_a and not trusted_token_a) or (has_token_b and not trusted_token_b):
            evidence.append("missing_evidence")
            if demo_conflict:
                evidence.append("conflicting_evidence")
            return self._build_result(
                comparison_id=comparison_id,
                status="unresolved",
                reason_code=IdentityReasonCodes.UNTRUSTED_IDENTITY_TOKEN,
                message="Supplied identity linkage token is not recognized in the trusted synthetic registry; cannot establish linkage.",
                evidence_categories=evidence,
                review_required=False,
                rec_a=rec_a,
                rec_b=rec_b,
            )

        # 5b. Both tokens present and both are recognized by controlled fixtures
        if trusted_token_a and trusted_token_b and entry_a and entry_b:
            # 1. Internal reference conflict: identical reference presented with conflicting registered tokens
            if token_a != token_b and same_provider and same_local_id:
                evidence.append("strong_synthetic_linkage")
                evidence.append("conflicting_evidence")
                return self._build_result(
                    comparison_id=comparison_id,
                    status="review_required",
                    reason_code=IdentityReasonCodes.STRONG_SYNTHETIC_LINKAGE_CONFLICT,
                    message="Same local reference associated with conflicting synthetic linkage tokens; review required.",
                    evidence_categories=evidence,
                    review_required=True,
                    rec_a=rec_a,
                    rec_b=rec_b,
                )

            # 2. Enforce reference-to-fixture authorization binding
            auth_a = self._is_reference_authorized(entry_a, prov_a, local_a)
            auth_b = self._is_reference_authorized(entry_b, prov_b, local_b)

            if not auth_a or not auth_b:
                # Registered token reused for unauthorized provider-scoped references!
                evidence.append("missing_evidence")
                if demo_conflict:
                    evidence.append("conflicting_evidence")
                return self._build_result(
                    comparison_id=comparison_id,
                    status="unresolved",
                    reason_code=IdentityReasonCodes.IDENTITY_EVIDENCE_NOT_BOUND_TO_REFERENCES,
                    message="Supplied synthetic linkage token is not authorized for the specified provider-scoped references.",
                    evidence_categories=evidence,
                    review_required=False,
                    rec_a=rec_a,
                    rec_b=rec_b,
                )

            evidence.append("strong_synthetic_linkage")

            if token_a == token_b:
                # Matching registered tokens and both references authorized for this subject fixture!
                if demo_conflict:
                    evidence.append("conflicting_evidence")
                    return self._build_result(
                        comparison_id=comparison_id,
                        status="review_required",
                        reason_code=IdentityReasonCodes.IDENTITY_EVIDENCE_CONFLICT,
                        message="Strong synthetic linkage token matches but demographic attributes conflict; human review required.",
                        evidence_categories=evidence,
                        review_required=True,
                        rec_a=rec_a,
                        rec_b=rec_b,
                    )

                if demo_similarity:
                    evidence.append("demographic_similarity")

                return self._build_result(
                    comparison_id=comparison_id,
                    status="same_identity",
                    reason_code=IdentityReasonCodes.STRONG_SYNTHETIC_LINKAGE_MATCH,
                    message="Configured strong synthetic linkage token confirmed with valid provider contexts.",
                    evidence_categories=evidence,
                    review_required=False,
                    rec_a=rec_a,
                    rec_b=rec_b,
                )
            else:
                # Differing registered tokens explicitly authorized for distinct synthetic subjects
                evidence.append("conflicting_evidence")
                return self._build_result(
                    comparison_id=comparison_id,
                    status="different_identity",
                    reason_code=IdentityReasonCodes.STRONG_SYNTHETIC_LINKAGE_CONFLICT,
                    message="Synthetic linkage tokens explicitly indicate distinct identities across references.",
                    evidence_categories=evidence,
                    review_required=False,
                    rec_a=rec_a,
                    rec_b=rec_b,
                )

        # 5c. One token present (and trusted), one token missing
        if has_token_a != has_token_b:
            evidence.append("missing_evidence")
            if demo_conflict:
                evidence.append("conflicting_evidence")
            return self._build_result(
                comparison_id=comparison_id,
                status="unresolved",
                reason_code=IdentityReasonCodes.IDENTITY_EVIDENCE_MISSING,
                message="Synthetic identity linkage token is absent on one of the compared references.",
                evidence_categories=evidence,
                review_required=False,
                rec_a=rec_a,
                rec_b=rec_b,
            )


        # Neither record has a strong synthetic linkage token
        # Check for demographic conflict first
        if demo_conflict:
            evidence.append("conflicting_evidence")
            if demo_similarity:
                evidence.append("demographic_similarity")
            if demo_similarity or same_local_id:
                # Potential overlap accompanied by conflicting fields requires review
                return self._build_result(
                    comparison_id=comparison_id,
                    status="review_required",
                    reason_code=IdentityReasonCodes.IDENTITY_EVIDENCE_CONFLICT,
                    message="Contradictory demographic attributes detected across references; review required.",
                    evidence_categories=evidence,
                    review_required=True,
                    rec_a=rec_a,
                    rec_b=rec_b,
                )


        # Demographic similarity without conflict -> possible_match (never same_identity)
        if demo_similarity:
            evidence.append("demographic_similarity")
            return self._build_result(
                comparison_id=comparison_id,
                status="possible_match",
                reason_code=IdentityReasonCodes.DEMOGRAPHIC_EVIDENCE_INSUFFICIENT,
                message="Demographic attributes indicate potential similarity, but cannot establish identity without strong linkage evidence.",
                evidence_categories=evidence,
                review_required=False,
                rec_a=rec_a,
                rec_b=rec_b,
            )

        # Same local ID across different providers without strong token
        if same_local_id and not same_provider:
            return self._build_result(
                comparison_id=comparison_id,
                status="unresolved",
                reason_code=IdentityReasonCodes.SAME_LOCAL_ID_DIFFERENT_PROVIDERS,
                message="Identical local patient ID string found across different provider contexts; cannot be linked without strong evidence.",
                evidence_categories=evidence,
                review_required=False,
                rec_a=rec_a,
                rec_b=rec_b,
            )

        # Fallback: No strong synthetic token, no demographic match, references remain distinct/unresolved
        evidence.append("missing_evidence")
        return self._build_result(
            comparison_id=comparison_id,
            status="unresolved",
            reason_code=IdentityReasonCodes.IDENTITY_EVIDENCE_MISSING,
            message="No strong synthetic identity evidence or linkage tokens provided for association.",
            evidence_categories=evidence,
            review_required=False,
            rec_a=rec_a,
            rec_b=rec_b,
        )

    def _evaluate_demographics(
        self,
        demo_a: Optional[PatientDemographics],
        demo_b: Optional[PatientDemographics],
    ) -> Tuple[bool, bool]:
        """
        Evaluate similarity and conflict between optional synthetic demographics using
        independent field-by-field comparisons.
        A match in one field never cancels out a conflict in another field.
        Returns (has_similarity, has_conflict).
        """
        if not demo_a or not demo_b:
            return False, False

        has_similarity = False
        has_conflict = False

        # 1. Date of birth
        dob_a = (demo_a.date_of_birth or "").strip()
        dob_b = (demo_b.date_of_birth or "").strip()
        if dob_a and dob_b:
            if dob_a == dob_b:
                has_similarity = True
            else:
                has_conflict = True

        # 2. First name
        fn_a = (demo_a.first_name or "").strip().lower()
        fn_b = (demo_b.first_name or "").strip().lower()
        if fn_a and fn_b:
            if fn_a == fn_b:
                has_similarity = True
            else:
                has_conflict = True

        # 3. Last name
        ln_a = (demo_a.last_name or "").strip().lower()
        ln_b = (demo_b.last_name or "").strip().lower()
        if ln_a and ln_b:
            if ln_a == ln_b:
                has_similarity = True
            else:
                has_conflict = True

        # 4. Gender
        g_a = (demo_a.gender or "").strip().lower()
        g_b = (demo_b.gender or "").strip().lower()
        if g_a and g_b:
            if g_a != g_b:
                has_conflict = True

        return has_similarity, has_conflict


    def _build_result(
        self,
        comparison_id: str,
        status: IdentityDecisionStatus,
        reason_code: str,
        message: str,
        evidence_categories: List[EvidenceCategory],
        review_required: bool,
        rec_a: Optional[PatientIdentityRecord],
        rec_b: Optional[PatientIdentityRecord],
    ) -> IdentityAssessmentResult:
        """Construct privacy-safe assessment result without exposing sensitive data."""
        ref_a = None
        if rec_a:
            ref_a = ScopedPatientReference(
                source_provider_id=rec_a.source_provider_id,
                local_patient_id=rec_a.local_patient_id,
            )

        ref_b = None
        if rec_b:
            ref_b = ScopedPatientReference(
                source_provider_id=rec_b.source_provider_id,
                local_patient_id=rec_b.local_patient_id,
            )

        logger.debug(
            "Evaluated comparison %s: status=%s, reason=%s",
            comparison_id,
            status,
            reason_code,
        )

        return IdentityAssessmentResult(
            comparison_id=comparison_id,
            status=status,
            reason_code=reason_code,
            message=message,
            evidence_categories=evidence_categories,
            review_required=review_required,
            record_a_reference=ref_a,
            record_b_reference=ref_b,
        )
