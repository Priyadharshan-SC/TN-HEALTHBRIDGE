"""Automated test suite for M4 Patient Identity Safety and Uncertainty-Aware Linkage."""
import json
import logging
from pathlib import Path
from typing import Any, Dict

import pytest
from fastapi.testclient import TestClient

from app.core.config import get_settings
from app.core.errors import (
    EmptyIdentityBatchError,
    IdentityRecordLimitExceededError,
)
from app.main import app
from app.schemas.identity import (
    IdentityAssessmentBatchRequest,
    IdentityComparisonItem,
    IdentityReasonCodes,
    PatientDemographics,
    PatientIdentityRecord,
)
from app.services.identity_service import IdentityService

client = TestClient(app)
settings = get_settings()


@pytest.fixture
def identity_service() -> IdentityService:
    return IdentityService()


@pytest.fixture
def synthetic_fixtures() -> Dict[str, Any]:
    fixture_path = Path(__file__).resolve().parent.parent / "data" / "identity" / "synthetic_linkage_fixtures.json"
    with open(fixture_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    return data["fixtures"]


# =========================================================================
# 1. Core Scenarios from Section 8 & Section 9
# =========================================================================

def test_scenario_01_same_local_id_diff_providers_never_matches(identity_service: IdentityService):
    """
    Identical local patient IDs from different providers must not automatically
    be treated as the same person.
    """
    item = IdentityComparisonItem(
        comparison_id="comp_001",
        record_a=PatientIdentityRecord(
            source_provider_id="HOSPITAL_A",
            local_patient_id="SYN_PATIENT_001",
        ),
        record_b=PatientIdentityRecord(
            source_provider_id="HOSPITAL_B",
            local_patient_id="SYN_PATIENT_001",
        ),
    )
    res = identity_service.assess_comparison(item)
    assert res.status == "unresolved"
    assert res.status != "same_identity"
    assert res.reason_code == IdentityReasonCodes.SAME_LOCAL_ID_DIFFERENT_PROVIDERS
    assert not res.review_required
    assert "provider_local_reference" in res.evidence_categories


def test_scenario_02_different_local_references_no_evidence(identity_service: IdentityService):
    """Different local references with no other evidence remain unresolved."""
    item = IdentityComparisonItem(
        comparison_id="comp_002",
        record_a=PatientIdentityRecord(
            source_provider_id="HOSPITAL_A",
            local_patient_id="SYN_PATIENT_001",
        ),
        record_b=PatientIdentityRecord(
            source_provider_id="HOSPITAL_B",
            local_patient_id="SYN_PATIENT_002",
        ),
    )
    res = identity_service.assess_comparison(item)
    assert res.status == "unresolved"
    assert res.reason_code == IdentityReasonCodes.IDENTITY_EVIDENCE_MISSING
    assert "missing_evidence" in res.evidence_categories


def test_scenario_03_matching_synthetic_linkage_tokens(identity_service: IdentityService):
    """
    A positive same_identity outcome requires an explicitly configured strong synthetic
    linkage token together with valid provider context.
    """
    item = IdentityComparisonItem(
        comparison_id="comp_003",
        record_a=PatientIdentityRecord(
            source_provider_id="HOSPITAL_A",
            local_patient_id="SYN_PATIENT_001",
            identity_token="SYN_LINK_TOKEN_999",
        ),
        record_b=PatientIdentityRecord(
            source_provider_id="HOSPITAL_B",
            local_patient_id="SYN_PATIENT_002",
            identity_token="SYN_LINK_TOKEN_999",
        ),
    )
    res = identity_service.assess_comparison(item)
    assert res.status == "same_identity"
    assert res.reason_code == IdentityReasonCodes.STRONG_SYNTHETIC_LINKAGE_MATCH
    assert "strong_synthetic_linkage" in res.evidence_categories
    assert not res.review_required


def test_scenario_04_different_synthetic_linkage_tokens(identity_service: IdentityService):
    """Distinct strong synthetic linkage tokens indicate different identities."""
    item = IdentityComparisonItem(
        comparison_id="comp_004",
        record_a=PatientIdentityRecord(
            source_provider_id="HOSPITAL_A",
            local_patient_id="SYN_PATIENT_105",
            identity_token="SYN_LINK_TOKEN_001",
        ),
        record_b=PatientIdentityRecord(
            source_provider_id="HOSPITAL_B",
            local_patient_id="SYN_PATIENT_106",
            identity_token="SYN_LINK_TOKEN_002",
        ),
    )
    res = identity_service.assess_comparison(item)
    assert res.status == "different_identity"
    assert res.reason_code == IdentityReasonCodes.STRONG_SYNTHETIC_LINKAGE_CONFLICT
    assert "conflicting_evidence" in res.evidence_categories


def test_scenario_05_conflicting_strong_synthetic_evidence(identity_service: IdentityService):
    """
    Conflicting strong evidence (e.g. matching token but conflicting demographics)
    must never produce a confident match and must flag review_required.
    """
    item = IdentityComparisonItem(
        comparison_id="comp_005",
        record_a=PatientIdentityRecord(
            source_provider_id="HOSPITAL_A",
            local_patient_id="SYN_PATIENT_001",
            identity_token="SYN_LINK_TOKEN_999",
            demographics=PatientDemographics(
                first_name="Ramesh",
                last_name="Kumar",
                date_of_birth="1975-01-01",
            ),
        ),
        record_b=PatientIdentityRecord(
            source_provider_id="HOSPITAL_B",
            local_patient_id="SYN_PATIENT_002",
            identity_token="SYN_LINK_TOKEN_999",
            demographics=PatientDemographics(
                first_name="Sita",
                last_name="Sundaram",
                date_of_birth="1992-10-15",
            ),
        ),
    )
    res = identity_service.assess_comparison(item)
    assert res.status == "review_required"
    assert res.status != "same_identity"
    assert res.reason_code == IdentityReasonCodes.IDENTITY_EVIDENCE_CONFLICT
    assert res.review_required is True
    assert "conflicting_evidence" in res.evidence_categories


def test_scenario_05b_same_provider_same_local_conflicting_tokens(identity_service: IdentityService):
    """Internal conflict within same provider local reference must require review."""
    item = IdentityComparisonItem(
        comparison_id="comp_005b",
        record_a=PatientIdentityRecord(
            source_provider_id="HOSPITAL_A",
            local_patient_id="SYN_PATIENT_001",
            identity_token="SYN_LINK_TOKEN_001",
        ),
        record_b=PatientIdentityRecord(
            source_provider_id="HOSPITAL_A",
            local_patient_id="SYN_PATIENT_001",
            identity_token="SYN_LINK_TOKEN_002",
        ),
    )
    res = identity_service.assess_comparison(item)
    assert res.status == "review_required"
    assert res.reason_code == IdentityReasonCodes.STRONG_SYNTHETIC_LINKAGE_CONFLICT
    assert res.review_required is True


def test_scenario_06_missing_provider_context(identity_service: IdentityService):
    """Missing provider context must return unresolved rather than guessing."""
    item_a_missing = IdentityComparisonItem(
        comparison_id="comp_006a",
        record_a=PatientIdentityRecord(
            source_provider_id=None,
            local_patient_id="SYN_PATIENT_001",
            identity_token="SYN_LINK_TOKEN_001",
        ),
        record_b=PatientIdentityRecord(
            source_provider_id="HOSPITAL_B",
            local_patient_id="SYN_PATIENT_001",
            identity_token="SYN_LINK_TOKEN_001",
        ),
    )
    res_a = identity_service.assess_comparison(item_a_missing)
    assert res_a.status == "unresolved"
    assert res_a.reason_code == IdentityReasonCodes.PROVIDER_CONTEXT_MISSING

    item_b_empty = IdentityComparisonItem(
        comparison_id="comp_006b",
        record_a=PatientIdentityRecord(
            source_provider_id="HOSPITAL_A",
            local_patient_id="SYN_PATIENT_001",
            identity_token="SYN_LINK_TOKEN_001",
        ),
        record_b=PatientIdentityRecord(
            source_provider_id="   ",
            local_patient_id="SYN_PATIENT_001",
            identity_token="SYN_LINK_TOKEN_001",
        ),
    )
    res_b = identity_service.assess_comparison(item_b_empty)
    assert res_b.status == "unresolved"
    assert res_b.reason_code == IdentityReasonCodes.PROVIDER_CONTEXT_MISSING


def test_scenario_07_missing_local_patient_reference(identity_service: IdentityService):
    """Missing local patient reference identifier must return unresolved."""
    item = IdentityComparisonItem(
        comparison_id="comp_007",
        record_a=PatientIdentityRecord(
            source_provider_id="HOSPITAL_A",
            local_patient_id="",
            identity_token="SYN_LINK_TOKEN_001",
        ),
        record_b=PatientIdentityRecord(
            source_provider_id="HOSPITAL_B",
            local_patient_id="SYN_PATIENT_002",
            identity_token="SYN_LINK_TOKEN_001",
        ),
    )
    res = identity_service.assess_comparison(item)
    assert res.status == "unresolved"
    assert res.reason_code == IdentityReasonCodes.LOCAL_REFERENCE_MISSING


def test_scenario_08_matching_names_never_independently_matches(identity_service: IdentityService):
    """Matching names alone must never produce same_identity."""
    item = IdentityComparisonItem(
        comparison_id="comp_008",
        record_a=PatientIdentityRecord(
            source_provider_id="HOSPITAL_A",
            local_patient_id="SYN_PATIENT_001",
            demographics=PatientDemographics(
                first_name="Meena",
                last_name="Raman",
            ),
        ),
        record_b=PatientIdentityRecord(
            source_provider_id="HOSPITAL_B",
            local_patient_id="SYN_PATIENT_002",
            demographics=PatientDemographics(
                first_name="Meena",
                last_name="Raman",
            ),
        ),
    )
    res = identity_service.assess_comparison(item)
    assert res.status == "possible_match"
    assert res.status != "same_identity"
    assert res.reason_code == IdentityReasonCodes.DEMOGRAPHIC_EVIDENCE_INSUFFICIENT
    assert "demographic_similarity" in res.evidence_categories


def test_scenario_09_matching_dates_of_birth_never_independently_matches(identity_service: IdentityService):
    """Matching birth dates alone must never produce same_identity."""
    item = IdentityComparisonItem(
        comparison_id="comp_009",
        record_a=PatientIdentityRecord(
            source_provider_id="HOSPITAL_A",
            local_patient_id="SYN_PATIENT_001",
            demographics=PatientDemographics(date_of_birth="1980-05-20"),
        ),
        record_b=PatientIdentityRecord(
            source_provider_id="HOSPITAL_B",
            local_patient_id="SYN_PATIENT_002",
            demographics=PatientDemographics(date_of_birth="1980-05-20"),
        ),
    )
    res = identity_service.assess_comparison(item)
    assert res.status == "possible_match"
    assert res.status != "same_identity"
    assert res.reason_code == IdentityReasonCodes.DEMOGRAPHIC_EVIDENCE_INSUFFICIENT


def test_scenario_10_matching_local_ids_and_demographics_no_token_never_matches(identity_service: IdentityService):
    """
    Matching local IDs AND matching demographic attributes across providers without strong
    linkage evidence must NEVER produce same_identity.
    """
    item = IdentityComparisonItem(
        comparison_id="comp_010",
        record_a=PatientIdentityRecord(
            source_provider_id="HOSPITAL_A",
            local_patient_id="SYN_PATIENT_888",
            demographics=PatientDemographics(
                first_name="Vijay",
                last_name="Sethupathi",
                date_of_birth="1978-01-16",
            ),
        ),
        record_b=PatientIdentityRecord(
            source_provider_id="HOSPITAL_B",
            local_patient_id="SYN_PATIENT_888",
            demographics=PatientDemographics(
                first_name="Vijay",
                last_name="Sethupathi",
                date_of_birth="1978-01-16",
            ),
        ),
    )
    res = identity_service.assess_comparison(item)
    assert res.status != "same_identity"
    assert res.status == "possible_match"
    assert res.reason_code == IdentityReasonCodes.DEMOGRAPHIC_EVIDENCE_INSUFFICIENT


def test_scenario_11_missing_identity_evidence(identity_service: IdentityService):
    """When both records have valid providers and local IDs but no other evidence, return unresolved."""
    item = IdentityComparisonItem(
        comparison_id="comp_011",
        record_a=PatientIdentityRecord(
            source_provider_id="HOSPITAL_A",
            local_patient_id="SYN_PATIENT_001",
        ),
        record_b=PatientIdentityRecord(
            source_provider_id="HOSPITAL_B",
            local_patient_id="SYN_PATIENT_002",
        ),
    )
    res = identity_service.assess_comparison(item)
    assert res.status == "unresolved"
    assert res.reason_code == IdentityReasonCodes.IDENTITY_EVIDENCE_MISSING


def test_scenario_12_malformed_identity_input_handled_safely(identity_service: IdentityService):
    """Malformed comparison records produce safe unresolved outcome."""
    item = IdentityComparisonItem(
        comparison_id="comp_012",
        record_a=PatientIdentityRecord(
            source_provider_id=None,
            local_patient_id=None,
        ),
        record_b=PatientIdentityRecord(
            source_provider_id=None,
            local_patient_id=None,
        ),
    )
    res = identity_service.assess_comparison(item)
    assert res.status == "unresolved"
    assert res.reason_code in (
        IdentityReasonCodes.MALFORMED_IDENTITY_INPUT,
        IdentityReasonCodes.PROVIDER_CONTEXT_MISSING,
    )


# =========================================================================
# 2. Batch Processing, Reconciliation, and Limits
# =========================================================================

def test_scenario_13_batch_processing_and_count_reconciliation(identity_service: IdentityService):
    """
    Batch processing evaluates independent comparisons independently and ensures
    status counts reconcile exactly with the returned assessments.
    """
    items = [
        # 1. same_identity
        IdentityComparisonItem(
            comparison_id="c1",
            record_a=PatientIdentityRecord(
                source_provider_id="HOSPITAL_A",
                local_patient_id="P1",
                identity_token="SYN_TOKEN_1",
            ),
            record_b=PatientIdentityRecord(
                source_provider_id="HOSPITAL_B",
                local_patient_id="P2",
                identity_token="SYN_TOKEN_1",
            ),
        ),
        # 2. different_identity
        IdentityComparisonItem(
            comparison_id="c2",
            record_a=PatientIdentityRecord(
                source_provider_id="HOSPITAL_A",
                local_patient_id="P3",
                identity_token="SYN_TOKEN_1",
            ),
            record_b=PatientIdentityRecord(
                source_provider_id="HOSPITAL_B",
                local_patient_id="P4",
                identity_token="SYN_TOKEN_2",
            ),
        ),
        # 3. possible_match
        IdentityComparisonItem(
            comparison_id="c3",
            record_a=PatientIdentityRecord(
                source_provider_id="HOSPITAL_A",
                local_patient_id="P5",
                demographics=PatientDemographics(date_of_birth="1990-01-01"),
            ),
            record_b=PatientIdentityRecord(
                source_provider_id="HOSPITAL_B",
                local_patient_id="P6",
                demographics=PatientDemographics(date_of_birth="1990-01-01"),
            ),
        ),
        # 4. unresolved (same local ID diff providers)
        IdentityComparisonItem(
            comparison_id="c4",
            record_a=PatientIdentityRecord(
                source_provider_id="HOSPITAL_A",
                local_patient_id="P7",
            ),
            record_b=PatientIdentityRecord(
                source_provider_id="HOSPITAL_B",
                local_patient_id="P7",
            ),
        ),
        # 5. review_required (matching token but conflicting demographics)
        IdentityComparisonItem(
            comparison_id="c5",
            record_a=PatientIdentityRecord(
                source_provider_id="HOSPITAL_A",
                local_patient_id="P8",
                identity_token="SYN_TOKEN_3",
                demographics=PatientDemographics(date_of_birth="1980-01-01"),
            ),
            record_b=PatientIdentityRecord(
                source_provider_id="HOSPITAL_B",
                local_patient_id="P9",
                identity_token="SYN_TOKEN_3",
                demographics=PatientDemographics(date_of_birth="2000-01-01"),
            ),
        ),
    ]

    req = IdentityAssessmentBatchRequest(batch_id="batch_mixed_001", comparisons=items)
    resp = identity_service.assess_batch(req)

    assert resp.batch_id == "batch_mixed_001"
    assert resp.total_comparisons == 5
    assert resp.same_identity_count == 1
    assert resp.different_identity_count == 1
    assert resp.possible_match_count == 1
    assert resp.unresolved_count == 1
    assert resp.review_required_count == 1

    # Exact reconciliation check
    assert (
        resp.same_identity_count
        + resp.different_identity_count
        + resp.possible_match_count
        + resp.unresolved_count
        + resp.review_required_count
    ) == resp.total_comparisons


def test_scenario_14_oversized_batch_rejected(identity_service: IdentityService):
    """Oversized batches exceeding configured maximum limit are rejected."""
    max_records = settings.MAX_IDENTITY_RECORD_COUNT
    dummy_item = IdentityComparisonItem(
        comparison_id="comp_dummy",
        record_a=PatientIdentityRecord(source_provider_id="HOSPITAL_A", local_patient_id="P1"),
        record_b=PatientIdentityRecord(source_provider_id="HOSPITAL_B", local_patient_id="P2"),
    )
    oversized_list = [dummy_item] * (max_records + 1)
    req = IdentityAssessmentBatchRequest(comparisons=oversized_list)

    with pytest.raises(IdentityRecordLimitExceededError):
        identity_service.assess_batch(req)


def test_empty_batch_rejected(identity_service: IdentityService):
    """Empty batch raises EmptyIdentityBatchError."""
    req = IdentityAssessmentBatchRequest(comparisons=[])
    with pytest.raises(EmptyIdentityBatchError):
        identity_service.assess_batch(req)


# =========================================================================
# 3. Privacy, Immutability, and Statelessness
# =========================================================================

def test_scenario_15_privacy_safe_output_and_no_sensitive_data_exposure(
    identity_service: IdentityService,
    caplog: pytest.LogCaptureFixture,
):
    """
    Sensitive identity values (tokens, names, DOB) must NOT appear in output messages,
    reference metadata, or log outputs.
    """
    secret_token = "SYN_SECRET_TOKEN_XYZ_777"
    sensitive_name = "Kavitha Rajan"
    sensitive_dob = "1988-12-05"

    item = IdentityComparisonItem(
        comparison_id="comp_privacy_001",
        record_a=PatientIdentityRecord(
            source_provider_id="HOSPITAL_A",
            local_patient_id="SYN_PAT_001",
            identity_token=secret_token,
            demographics=PatientDemographics(
                first_name="Kavitha",
                last_name="Rajan",
                date_of_birth=sensitive_dob,
            ),
        ),
        record_b=PatientIdentityRecord(
            source_provider_id="HOSPITAL_B",
            local_patient_id="SYN_PAT_002",
            identity_token=secret_token,
            demographics=PatientDemographics(
                first_name="Kavitha",
                last_name="Rajan",
                date_of_birth=sensitive_dob,
            ),
        ),
    )

    with caplog.at_level(logging.DEBUG):
        res = identity_service.assess_comparison(item)

    # 1. Output verification
    assert res.status == "same_identity"
    assert secret_token not in res.message
    assert sensitive_name not in res.message
    assert sensitive_dob not in res.message

    # Scoped references contain only provider ID and local patient ID
    assert res.record_a_reference.source_provider_id == "HOSPITAL_A"
    assert res.record_a_reference.local_patient_id == "SYN_PAT_001"
    assert not hasattr(res.record_a_reference, "identity_token")
    assert not hasattr(res.record_a_reference, "demographics")

    # 2. Log verification
    log_text = caplog.text
    assert secret_token not in log_text
    assert sensitive_name not in log_text
    assert sensitive_dob not in log_text


def test_scenario_16_preservation_of_original_references_and_records(identity_service: IdentityService):
    """Original patient references and records must never be modified or merged."""
    rec_a_orig = PatientIdentityRecord(
        source_provider_id="HOSPITAL_A",
        local_patient_id="SYN_PAT_001",
        identity_token="SYN_LINK_TOKEN_001",
    )
    rec_b_orig = PatientIdentityRecord(
        source_provider_id="HOSPITAL_B",
        local_patient_id="SYN_PAT_002",
        identity_token="SYN_LINK_TOKEN_001",
    )

    item = IdentityComparisonItem(
        comparison_id="comp_preserve_001",
        record_a=rec_a_orig,
        record_b=rec_b_orig,
    )

    # Perform assessment
    res = identity_service.assess_comparison(item)

    # Confirm original objects were not mutated
    assert item.record_a.source_provider_id == "HOSPITAL_A"
    assert item.record_a.local_patient_id == "SYN_PAT_001"
    assert item.record_a.identity_token == "SYN_LINK_TOKEN_001"
    assert item.record_b.source_provider_id == "HOSPITAL_B"
    assert item.record_b.local_patient_id == "SYN_PAT_002"
    assert item.record_b.identity_token == "SYN_LINK_TOKEN_001"


def test_scenario_17_no_database_or_persistent_identity_registry():
    """
    M4 operates purely in-memory. Verify no database models, tables, or persistence
    connections are created or used.
    """
    service = IdentityService()
    # Check that service has no db connection attribute or session
    assert not hasattr(service, "db")
    assert not hasattr(service, "session")
    assert not hasattr(service, "engine")
    assert not hasattr(service, "connection")


# =========================================================================
# 4. FastAPI Endpoint Integration Tests
# =========================================================================

def test_api_assess_identity_success():
    """POST /api/v1/identity/assess returns 200 with complete assessment response."""
    payload = {
        "batch_id": "test_api_batch_001",
        "comparisons": [
            {
                "comparison_id": "comp_api_1",
                "record_a": {
                    "source_provider_id": "HOSPITAL_A",
                    "local_patient_id": "SYN_API_P1",
                    "identity_token": "SYN_TOKEN_MATCH",
                },
                "record_b": {
                    "source_provider_id": "HOSPITAL_B",
                    "local_patient_id": "SYN_API_P2",
                    "identity_token": "SYN_TOKEN_MATCH",
                },
            },
            {
                "comparison_id": "comp_api_2",
                "record_a": {
                    "source_provider_id": "HOSPITAL_A",
                    "local_patient_id": "SYN_P3",
                },
                "record_b": {
                    "source_provider_id": "HOSPITAL_B",
                    "local_patient_id": "SYN_P3",
                },
            },
        ],
    }

    response = client.post("/api/v1/identity/assess", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert data["batch_id"] == "test_api_batch_001"
    assert data["status"] == "completed"
    assert data["total_comparisons"] == 2
    assert data["same_identity_count"] == 1
    assert data["unresolved_count"] == 1
    assert len(data["results"]) == 2

    res_1 = data["results"][0]
    assert res_1["comparison_id"] == "comp_api_1"
    assert res_1["status"] == "same_identity"
    assert res_1["reason_code"] == "STRONG_SYNTHETIC_LINKAGE_MATCH"

    res_2 = data["results"][1]
    assert res_2["comparison_id"] == "comp_api_2"
    assert res_2["status"] == "unresolved"
    assert res_2["reason_code"] == "SAME_LOCAL_ID_DIFFERENT_PROVIDERS"


def test_api_assess_identity_empty_batch_returns_400():
    """POST /api/v1/identity/assess with empty comparisons returns 400 EMPTY_PAYLOAD."""
    payload = {
        "batch_id": "test_empty_batch",
        "comparisons": [],
    }
    response = client.post("/api/v1/identity/assess", json=payload)
    assert response.status_code == 400
    data = response.json()
    assert data["error_code"] == "EMPTY_PAYLOAD"


def test_api_assess_identity_validation_error_returns_422():
    """POST /api/v1/identity/assess with malformed JSON body returns 422 VALIDATION_ERROR."""
    response = client.post(
        "/api/v1/identity/assess",
        content="not a json string",
        headers={"Content-Type": "application/json"},
    )
    assert response.status_code == 422
    data = response.json()
    assert data["error_code"] == "VALIDATION_ERROR"


def test_health_check_includes_m4():
    """Health check endpoint includes M4_PATIENT_IDENTITY_SAFETY in active modules."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "M4_PATIENT_IDENTITY_SAFETY" in data["modules"]
    assert "M1_DATA_INGESTION" in data["modules"]
    assert "M2_DATA_NORMALIZATION" in data["modules"]
    assert "M3_CLINICAL_TERMINOLOGY_MAPPING" in data["modules"]


# =========================================================================
# 5. Synthetic Fixtures Integration Test
# =========================================================================

def test_all_fixtures_from_json_pass_as_expected(
    identity_service: IdentityService,
    synthetic_fixtures: Dict[str, Any],
):
    """Execute all predefined fixtures in synthetic_linkage_fixtures.json and assert outcomes."""
    for fixture_name, fixture_data in synthetic_fixtures.items():
        item_dict = fixture_data["item"]
        item = IdentityComparisonItem(**item_dict)
        res = identity_service.assess_comparison(item)

        assert res.status == fixture_data["expected_status"], (
            f"Fixture '{fixture_name}' expected status {fixture_data['expected_status']}, got {res.status}"
        )
        assert res.reason_code == fixture_data["expected_reason_code"], (
            f"Fixture '{fixture_name}' expected reason {fixture_data['expected_reason_code']}, got {res.reason_code}"
        )
        assert res.review_required == fixture_data["expected_review_required"], (
            f"Fixture '{fixture_name}' expected review_required {fixture_data['expected_review_required']}, got {res.review_required}"
        )


# =========================================================================
# 6. Controlled Synthetic Token Trust Regression Tests (Remediation Item 1)
# =========================================================================

def test_token_trust_01_two_matching_registered_tokens(identity_service: IdentityService):
    """1. Two matching registered synthetic tokens produce same_identity."""
    item = IdentityComparisonItem(
        comparison_id="comp_tt_01",
        record_a=PatientIdentityRecord(
            source_provider_id="HOSPITAL_A",
            local_patient_id="SYN_P1",
            identity_token="SYN_LINK_TOKEN_001",
        ),
        record_b=PatientIdentityRecord(
            source_provider_id="HOSPITAL_B",
            local_patient_id="SYN_P2",
            identity_token="SYN_LINK_TOKEN_001",
        ),
    )
    res = identity_service.assess_comparison(item)
    assert res.status == "same_identity"
    assert res.reason_code == IdentityReasonCodes.STRONG_SYNTHETIC_LINKAGE_MATCH
    assert "strong_synthetic_linkage" in res.evidence_categories


def test_token_trust_02_two_matching_arbitrary_unregistered_tokens(identity_service: IdentityService):
    """2. Two matching arbitrary unregistered tokens must never produce same_identity."""
    unregistered_token = "arbitrary_custom_token_12345"
    item = IdentityComparisonItem(
        comparison_id="comp_tt_02",
        record_a=PatientIdentityRecord(
            source_provider_id="HOSPITAL_A",
            local_patient_id="SYN_P1",
            identity_token=unregistered_token,
        ),
        record_b=PatientIdentityRecord(
            source_provider_id="HOSPITAL_B",
            local_patient_id="SYN_P2",
            identity_token=unregistered_token,
        ),
    )
    res = identity_service.assess_comparison(item)
    assert res.status == "unresolved"
    assert res.status != "same_identity"
    assert res.reason_code == IdentityReasonCodes.UNTRUSTED_IDENTITY_TOKEN
    assert unregistered_token not in res.message


def test_token_trust_03_two_matching_tokens_valid_prefix_unregistered(identity_service: IdentityService):
    """3. Two matching tokens with a valid-looking prefix but no registry entry must be unresolved."""
    prefix_token = "SYN_LINK_TOKEN_FAKE_9999"
    item = IdentityComparisonItem(
        comparison_id="comp_tt_03",
        record_a=PatientIdentityRecord(
            source_provider_id="HOSPITAL_A",
            local_patient_id="SYN_P1",
            identity_token=prefix_token,
        ),
        record_b=PatientIdentityRecord(
            source_provider_id="HOSPITAL_B",
            local_patient_id="SYN_P2",
            identity_token=prefix_token,
        ),
    )
    res = identity_service.assess_comparison(item)
    assert res.status == "unresolved"
    assert res.status != "same_identity"
    assert res.reason_code == IdentityReasonCodes.UNTRUSTED_IDENTITY_TOKEN
    assert prefix_token not in res.message


def test_token_trust_04_one_registered_one_unregistered_token(identity_service: IdentityService):
    """4. One registered token and one unregistered token must be unresolved, not different_identity."""
    item = IdentityComparisonItem(
        comparison_id="comp_tt_04",
        record_a=PatientIdentityRecord(
            source_provider_id="HOSPITAL_A",
            local_patient_id="SYN_P1",
            identity_token="SYN_LINK_TOKEN_001",  # registered
        ),
        record_b=PatientIdentityRecord(
            source_provider_id="HOSPITAL_B",
            local_patient_id="SYN_P2",
            identity_token="SYN_UNREGISTERED_TOKEN_XYZ",  # unregistered
        ),
    )
    res = identity_service.assess_comparison(item)
    assert res.status == "unresolved"
    assert res.status != "different_identity"
    assert res.status != "same_identity"
    assert res.reason_code == IdentityReasonCodes.UNTRUSTED_IDENTITY_TOKEN


def test_token_trust_05_two_different_unregistered_tokens(identity_service: IdentityService):
    """5. Two unregistered tokens must not infer different_identity; must be unresolved."""
    item = IdentityComparisonItem(
        comparison_id="comp_tt_05",
        record_a=PatientIdentityRecord(
            source_provider_id="HOSPITAL_A",
            local_patient_id="SYN_P1",
            identity_token="UNREGISTERED_A",
        ),
        record_b=PatientIdentityRecord(
            source_provider_id="HOSPITAL_B",
            local_patient_id="SYN_P2",
            identity_token="UNREGISTERED_B",
        ),
    )
    res = identity_service.assess_comparison(item)
    assert res.status == "unresolved"
    assert res.status != "different_identity"
    assert res.status != "same_identity"
    assert res.reason_code == IdentityReasonCodes.UNTRUSTED_IDENTITY_TOKEN


def test_token_trust_06_no_token_supplied(identity_service: IdentityService):
    """6. No token supplied yields IDENTITY_EVIDENCE_MISSING when local IDs differ."""
    item = IdentityComparisonItem(
        comparison_id="comp_tt_06",
        record_a=PatientIdentityRecord(
            source_provider_id="HOSPITAL_A",
            local_patient_id="SYN_P1",
            identity_token=None,
        ),
        record_b=PatientIdentityRecord(
            source_provider_id="HOSPITAL_B",
            local_patient_id="SYN_P2",
            identity_token=None,
        ),
    )
    res = identity_service.assess_comparison(item)
    assert res.status == "unresolved"
    assert res.status != "same_identity"
    assert res.reason_code == IdentityReasonCodes.IDENTITY_EVIDENCE_MISSING


def test_token_trust_07_unknown_token_values_never_yield_same_identity(identity_service: IdentityService):
    """7. Any unknown token value never yields same_identity."""
    unknown_values = [
        "12345",
        "ABHA_SIMULATED_123",
        "SYN_UNKNOWN",
        "RANDOM_STRING_TOKEN",
    ]
    for val in unknown_values:
        item = IdentityComparisonItem(
            comparison_id=f"comp_unknown_{val}",
            record_a=PatientIdentityRecord(
                source_provider_id="HOSPITAL_A",
                local_patient_id="SYN_P1",
                identity_token=val,
            ),
            record_b=PatientIdentityRecord(
                source_provider_id="HOSPITAL_B",
                local_patient_id="SYN_P2",
                identity_token=val,
            ),
        )
        res = identity_service.assess_comparison(item)
        assert res.status != "same_identity"
        assert res.status == "unresolved"
        assert res.reason_code == IdentityReasonCodes.UNTRUSTED_IDENTITY_TOKEN


# =========================================================================
# 7. Provider Allowlist Enforcement Regression Tests (Remediation Item 2)
# =========================================================================

def test_provider_allowlist_01_unknown_provider_rejected_safely(identity_service: IdentityService):
    """Unrecognized source provider ID yields safe unresolved UNKNOWN_PROVIDER."""
    item = IdentityComparisonItem(
        comparison_id="comp_pal_01",
        record_a=PatientIdentityRecord(
            source_provider_id="HOSPITAL_UNKNOWN_XYZ",
            local_patient_id="SYN_P1",
            identity_token="SYN_LINK_TOKEN_001",
        ),
        record_b=PatientIdentityRecord(
            source_provider_id="HOSPITAL_B",
            local_patient_id="SYN_P2",
            identity_token="SYN_LINK_TOKEN_001",
        ),
    )
    res = identity_service.assess_comparison(item)
    assert res.status == "unresolved"
    assert res.status != "same_identity"
    assert res.reason_code == IdentityReasonCodes.UNKNOWN_PROVIDER
    assert "HOSPITAL_UNKNOWN_XYZ" not in res.message


def test_provider_allowlist_02_whitespace_only_provider_rejected_safely(identity_service: IdentityService):
    """Whitespace-only provider ID yields safe unresolved PROVIDER_CONTEXT_MISSING."""
    item = IdentityComparisonItem(
        comparison_id="comp_pal_02",
        record_a=PatientIdentityRecord(
            source_provider_id="   ",
            local_patient_id="SYN_P1",
            identity_token="SYN_LINK_TOKEN_001",
        ),
        record_b=PatientIdentityRecord(
            source_provider_id="HOSPITAL_B",
            local_patient_id="SYN_P2",
            identity_token="SYN_LINK_TOKEN_001",
        ),
    )
    res = identity_service.assess_comparison(item)
    assert res.status == "unresolved"
    assert res.reason_code == IdentityReasonCodes.PROVIDER_CONTEXT_MISSING


def test_provider_allowlist_03_missing_provider_rejected_safely(identity_service: IdentityService):
    """Missing (None) provider ID yields safe unresolved PROVIDER_CONTEXT_MISSING."""
    item = IdentityComparisonItem(
        comparison_id="comp_pal_03",
        record_a=PatientIdentityRecord(
            source_provider_id=None,
            local_patient_id="SYN_P1",
            identity_token="SYN_LINK_TOKEN_001",
        ),
        record_b=PatientIdentityRecord(
            source_provider_id="HOSPITAL_B",
            local_patient_id="SYN_P2",
            identity_token="SYN_LINK_TOKEN_001",
        ),
    )
    res = identity_service.assess_comparison(item)
    assert res.status == "unresolved"
    assert res.reason_code == IdentityReasonCodes.PROVIDER_CONTEXT_MISSING


def test_provider_allowlist_04_valid_configured_providers_accepted(identity_service: IdentityService):
    """Valid configured providers in ALLOWED_PROVIDERS are accepted."""
    item = IdentityComparisonItem(
        comparison_id="comp_pal_04",
        record_a=PatientIdentityRecord(
            source_provider_id="HOSPITAL_A",
            local_patient_id="SYN_P1",
            identity_token="SYN_LINK_TOKEN_001",
        ),
        record_b=PatientIdentityRecord(
            source_provider_id="LAB_C",
            local_patient_id="SYN_P2",
            identity_token="SYN_LINK_TOKEN_001",
        ),
    )
    res = identity_service.assess_comparison(item)
    assert res.status == "same_identity"
    assert res.reason_code == IdentityReasonCodes.STRONG_SYNTHETIC_LINKAGE_MATCH


# =========================================================================
# 8. Independent Demographic Conflict Regression Tests (Remediation Item 3)
# =========================================================================

def test_demo_conflict_01_matching_dob_conflicting_names(identity_service: IdentityService):
    """1. Matching DOB with conflicting first and last names must flag conflict."""
    item = IdentityComparisonItem(
        comparison_id="comp_dc_01",
        record_a=PatientIdentityRecord(
            source_provider_id="HOSPITAL_A",
            local_patient_id="P1",
            demographics=PatientDemographics(
                first_name="Ramesh",
                last_name="Kumar",
                date_of_birth="1980-05-10",
            ),
        ),
        record_b=PatientIdentityRecord(
            source_provider_id="HOSPITAL_B",
            local_patient_id="P2",
            demographics=PatientDemographics(
                first_name="Priya",
                last_name="Natarajan",
                date_of_birth="1980-05-10",
            ),
        ),
    )
    res = identity_service.assess_comparison(item)
    assert res.status == "review_required"
    assert res.reason_code == IdentityReasonCodes.IDENTITY_EVIDENCE_CONFLICT
    assert res.review_required is True
    assert "conflicting_evidence" in res.evidence_categories
    assert "demographic_similarity" in res.evidence_categories


def test_demo_conflict_02_matching_first_name_conflicting_last_name(identity_service: IdentityService):
    """2. Matching first name with conflicting last name must flag conflict."""
    item = IdentityComparisonItem(
        comparison_id="comp_dc_02",
        record_a=PatientIdentityRecord(
            source_provider_id="HOSPITAL_A",
            local_patient_id="P1",
            demographics=PatientDemographics(
                first_name="Sita",
                last_name="Raman",
            ),
        ),
        record_b=PatientIdentityRecord(
            source_provider_id="HOSPITAL_B",
            local_patient_id="P2",
            demographics=PatientDemographics(
                first_name="Sita",
                last_name="Sundaram",
            ),
        ),
    )
    res = identity_service.assess_comparison(item)
    assert res.status == "review_required"
    assert res.reason_code == IdentityReasonCodes.IDENTITY_EVIDENCE_CONFLICT
    assert res.review_required is True
    assert "conflicting_evidence" in res.evidence_categories


def test_demo_conflict_03_matching_first_and_last_names_conflicting_dob(identity_service: IdentityService):
    """3. Matching first and last names with conflicting DOB must flag conflict."""
    item = IdentityComparisonItem(
        comparison_id="comp_dc_03",
        record_a=PatientIdentityRecord(
            source_provider_id="HOSPITAL_A",
            local_patient_id="P1",
            demographics=PatientDemographics(
                first_name="Anand",
                last_name="Babu",
                date_of_birth="1975-01-01",
            ),
        ),
        record_b=PatientIdentityRecord(
            source_provider_id="HOSPITAL_B",
            local_patient_id="P2",
            demographics=PatientDemographics(
                first_name="Anand",
                last_name="Babu",
                date_of_birth="1995-12-31",
            ),
        ),
    )
    res = identity_service.assess_comparison(item)
    assert res.status == "review_required"
    assert res.reason_code == IdentityReasonCodes.IDENTITY_EVIDENCE_CONFLICT
    assert res.review_required is True
    assert "conflicting_evidence" in res.evidence_categories


def test_demo_conflict_04_conflicting_gender_alongside_other_matching_fields(identity_service: IdentityService):
    """4. Conflicting gender alongside other matching fields must flag conflict."""
    item = IdentityComparisonItem(
        comparison_id="comp_dc_04",
        record_a=PatientIdentityRecord(
            source_provider_id="HOSPITAL_A",
            local_patient_id="P1",
            demographics=PatientDemographics(
                first_name="Kiran",
                last_name="Reddy",
                date_of_birth="1988-08-08",
                gender="male",
            ),
        ),
        record_b=PatientIdentityRecord(
            source_provider_id="HOSPITAL_B",
            local_patient_id="P2",
            demographics=PatientDemographics(
                first_name="Kiran",
                last_name="Reddy",
                date_of_birth="1988-08-08",
                gender="female",
            ),
        ),
    )
    res = identity_service.assess_comparison(item)
    assert res.status == "review_required"
    assert res.reason_code == IdentityReasonCodes.IDENTITY_EVIDENCE_CONFLICT
    assert res.review_required is True
    assert "conflicting_evidence" in res.evidence_categories


def test_demo_conflict_05_partial_demographics_no_conflict(identity_service: IdentityService):
    """5. Partial demographics where non-empty fields match and no fields conflict yields possible_match."""
    item = IdentityComparisonItem(
        comparison_id="comp_dc_05",
        record_a=PatientIdentityRecord(
            source_provider_id="HOSPITAL_A",
            local_patient_id="P1",
            demographics=PatientDemographics(
                first_name="Kavitha",
                last_name="Rajan",
                date_of_birth="1982-03-15",
            ),
        ),
        record_b=PatientIdentityRecord(
            source_provider_id="HOSPITAL_B",
            local_patient_id="P2",
            demographics=PatientDemographics(
                first_name="Kavitha",
                last_name=None,  # missing on record B
                date_of_birth=None,  # missing on record B
            ),
        ),
    )
    res = identity_service.assess_comparison(item)
    assert res.status == "possible_match"
    assert res.status != "same_identity"
    assert res.reason_code == IdentityReasonCodes.DEMOGRAPHIC_EVIDENCE_INSUFFICIENT
    assert not res.review_required
    assert "conflicting_evidence" not in res.evidence_categories


def test_demo_conflict_06_matching_demographics_without_trusted_tokens(identity_service: IdentityService):
    """6. Complete matching demographics without trusted tokens yields possible_match, never same_identity."""
    item = IdentityComparisonItem(
        comparison_id="comp_dc_06",
        record_a=PatientIdentityRecord(
            source_provider_id="HOSPITAL_A",
            local_patient_id="P1",
            identity_token=None,
            demographics=PatientDemographics(
                first_name="Deepa",
                last_name="Subramanian",
                date_of_birth="1991-07-22",
                gender="female",
            ),
        ),
        record_b=PatientIdentityRecord(
            source_provider_id="HOSPITAL_B",
            local_patient_id="P2",
            identity_token=None,
            demographics=PatientDemographics(
                first_name="Deepa",
                last_name="Subramanian",
                date_of_birth="1991-07-22",
                gender="female",
            ),
        ),
    )
    res = identity_service.assess_comparison(item)
    assert res.status == "possible_match"
    assert res.status != "same_identity"
    assert res.reason_code == IdentityReasonCodes.DEMOGRAPHIC_EVIDENCE_INSUFFICIENT


def test_demo_conflict_07_conflicting_demographics_with_matching_registered_tokens(identity_service: IdentityService):
    """7. Matching registered tokens with conflicting demographics yields review_required, never same_identity."""
    item = IdentityComparisonItem(
        comparison_id="comp_dc_07",
        record_a=PatientIdentityRecord(
            source_provider_id="HOSPITAL_A",
            local_patient_id="SYN_PATIENT_103",
            identity_token="SYN_LINK_TOKEN_001",  # registered
            demographics=PatientDemographics(
                first_name="Vikram",
                last_name="Prabhu",
                date_of_birth="1984-11-04",
            ),
        ),
        record_b=PatientIdentityRecord(
            source_provider_id="HOSPITAL_B",
            local_patient_id="SYN_PATIENT_104",
            identity_token="SYN_LINK_TOKEN_001",  # registered
            demographics=PatientDemographics(
                first_name="Karthik",
                last_name="Sivakumar",
                date_of_birth="1984-11-04",
            ),
        ),
    )
    res = identity_service.assess_comparison(item)
    assert res.status == "review_required"
    assert res.status != "same_identity"
    assert res.reason_code == IdentityReasonCodes.IDENTITY_EVIDENCE_CONFLICT
    assert res.review_required is True
    assert "conflicting_evidence" in res.evidence_categories


def test_demo_conflict_08_conflicting_demographics_with_unregistered_tokens(identity_service: IdentityService):
    """8. Conflicting demographics with unregistered tokens yields unresolved UNTRUSTED_IDENTITY_TOKEN, never same_identity."""
    item = IdentityComparisonItem(
        comparison_id="comp_dc_08",
        record_a=PatientIdentityRecord(
            source_provider_id="HOSPITAL_A",
            local_patient_id="P1",
            identity_token="UNREGISTERED_TOKEN_A",
            demographics=PatientDemographics(
                first_name="Vikram",
                date_of_birth="1980-01-01",
            ),
        ),
        record_b=PatientIdentityRecord(
            source_provider_id="HOSPITAL_B",
            local_patient_id="P2",
            identity_token="UNREGISTERED_TOKEN_A",
            demographics=PatientDemographics(
                first_name="Vikram",
                date_of_birth="1999-12-31",
            ),
        ),
    )
    res = identity_service.assess_comparison(item)
    assert res.status != "same_identity"
    assert res.status != "different_identity"
    assert res.status == "unresolved"
    assert res.reason_code == IdentityReasonCodes.UNTRUSTED_IDENTITY_TOKEN
    assert "conflicting_evidence" in res.evidence_categories


# =========================================================================
# 9. Adversarial Regression Tests — Reference-to-Fixture Trust Binding
# =========================================================================

def test_adversarial_01_valid_fixture_authorized_token_and_references(identity_service: IdentityService):
    """1. Valid fixture-authorized token and its approved references produce same_identity when no demographic conflict exists."""
    item = IdentityComparisonItem(
        comparison_id="adv_01",
        record_a=PatientIdentityRecord(
            source_provider_id="HOSPITAL_A",
            local_patient_id="SYN_PATIENT_103",
            identity_token="SYN_LINK_TOKEN_001",
            demographics=PatientDemographics(first_name="Ramesh", last_name="Kumar", date_of_birth="1980-05-12"),
        ),
        record_b=PatientIdentityRecord(
            source_provider_id="HOSPITAL_B",
            local_patient_id="SYN_PATIENT_104",
            identity_token="SYN_LINK_TOKEN_001",
            demographics=PatientDemographics(first_name="Ramesh", last_name="Kumar", date_of_birth="1980-05-12"),
        ),
    )
    res = identity_service.assess_comparison(item)
    assert res.status == "same_identity"
    assert res.reason_code == IdentityReasonCodes.STRONG_SYNTHETIC_LINKAGE_MATCH
    assert "strong_synthetic_linkage" in res.evidence_categories
    assert res.review_required is False


def test_adversarial_02_registered_token_reused_for_unrelated_references_cannot_match(identity_service: IdentityService):
    """2. A registered token reused for two unrelated references cannot produce same_identity."""
    token = "SYN_LINK_TOKEN_001"
    item = IdentityComparisonItem(
        comparison_id="adv_02",
        record_a=PatientIdentityRecord(
            source_provider_id="HOSPITAL_A",
            local_patient_id="UNRELATED_PAT_999",
            identity_token=token,
            demographics=PatientDemographics(first_name="Ramesh", last_name="Kumar", date_of_birth="1980-05-12"),
        ),
        record_b=PatientIdentityRecord(
            source_provider_id="HOSPITAL_B",
            local_patient_id="UNRELATED_PAT_888",
            identity_token=token,
            demographics=PatientDemographics(first_name="Ramesh", last_name="Kumar", date_of_birth="1980-05-12"),
        ),
    )
    res = identity_service.assess_comparison(item)
    assert res.status == "unresolved"
    assert res.status != "same_identity"
    assert res.status != "different_identity"
    assert res.reason_code == IdentityReasonCodes.IDENTITY_EVIDENCE_NOT_BOUND_TO_REFERENCES
    assert "provider_local_reference" in res.evidence_categories
    # Token value must not be leaked
    assert token not in res.message


def test_adversarial_03_registered_token_one_authorized_one_unauthorized_reference(identity_service: IdentityService):
    """3. A registered token paired with one authorized and one unauthorized reference cannot produce same_identity."""
    token = "SYN_LINK_TOKEN_001"
    item = IdentityComparisonItem(
        comparison_id="adv_03",
        record_a=PatientIdentityRecord(
            source_provider_id="HOSPITAL_A",
            local_patient_id="SYN_PATIENT_103",  # authorized in fixture
            identity_token=token,
        ),
        record_b=PatientIdentityRecord(
            source_provider_id="HOSPITAL_B",
            local_patient_id="UNAUTHORIZED_PAT_777",  # NOT authorized in fixture
            identity_token=token,
        ),
    )
    res = identity_service.assess_comparison(item)
    assert res.status == "unresolved"
    assert res.status != "same_identity"
    assert res.status != "different_identity"
    assert res.reason_code == IdentityReasonCodes.IDENTITY_EVIDENCE_NOT_BOUND_TO_REFERENCES
    assert token not in res.message


def test_adversarial_04_token_registered_for_one_subject_cannot_be_reused_for_different_subject(identity_service: IdentityService):
    """4. A token registered for one synthetic subject cannot be reused for a different subject's references."""
    token = "SYN_LINK_TOKEN_003"
    item = IdentityComparisonItem(
        comparison_id="adv_04",
        record_a=PatientIdentityRecord(
            source_provider_id="HOSPITAL_A",
            local_patient_id="SYN_PATIENT_103",
            identity_token=token,
        ),
        record_b=PatientIdentityRecord(
            source_provider_id="HOSPITAL_B",
            local_patient_id="SYN_PATIENT_104",
            identity_token=token,
        ),
    )
    res = identity_service.assess_comparison(item)
    assert res.status == "unresolved"
    assert res.status != "same_identity"
    assert res.status != "different_identity"
    assert res.reason_code == IdentityReasonCodes.IDENTITY_EVIDENCE_NOT_BOUND_TO_REFERENCES


def test_adversarial_05_unknown_tokens_remain_unresolved(identity_service: IdentityService):
    """5. Unknown tokens remain unresolved, not different_identity."""
    unknown_token = "TOTALLY_UNKNOWN_TOKEN_999"
    item = IdentityComparisonItem(
        comparison_id="adv_05",
        record_a=PatientIdentityRecord(
            source_provider_id="HOSPITAL_A",
            local_patient_id="SYN_PATIENT_103",
            identity_token=unknown_token,
        ),
        record_b=PatientIdentityRecord(
            source_provider_id="HOSPITAL_B",
            local_patient_id="SYN_PATIENT_104",
            identity_token=unknown_token,
        ),
    )
    res = identity_service.assess_comparison(item)
    assert res.status == "unresolved"
    assert res.status != "same_identity"
    assert res.status != "different_identity"
    assert res.reason_code == IdentityReasonCodes.UNTRUSTED_IDENTITY_TOKEN
    assert unknown_token not in res.message


def test_adversarial_06_unknown_providers_remain_unresolved(identity_service: IdentityService):
    """6. Unknown providers remain unresolved."""
    item = IdentityComparisonItem(
        comparison_id="adv_06",
        record_a=PatientIdentityRecord(
            source_provider_id="UNAUTHORIZED_ROGUE_HOSPITAL",
            local_patient_id="SYN_PATIENT_103",
            identity_token="SYN_LINK_TOKEN_001",
        ),
        record_b=PatientIdentityRecord(
            source_provider_id="HOSPITAL_B",
            local_patient_id="SYN_PATIENT_104",
            identity_token="SYN_LINK_TOKEN_001",
        ),
    )
    res = identity_service.assess_comparison(item)
    assert res.status == "unresolved"
    assert res.status != "same_identity"
    assert res.status != "different_identity"
    assert res.reason_code == IdentityReasonCodes.UNKNOWN_PROVIDER


def test_adversarial_07_matching_registered_evidence_with_conflicting_demographics_review_required(identity_service: IdentityService):
    """7. Matching registered evidence with conflicting demographics remains review_required."""
    item = IdentityComparisonItem(
        comparison_id="adv_07",
        record_a=PatientIdentityRecord(
            source_provider_id="HOSPITAL_A",
            local_patient_id="SYN_PATIENT_103",
            identity_token="SYN_LINK_TOKEN_001",
            demographics=PatientDemographics(
                first_name="Priya",
                last_name="Raman",
                date_of_birth="1985-05-15",
            ),
        ),
        record_b=PatientIdentityRecord(
            source_provider_id="HOSPITAL_B",
            local_patient_id="SYN_PATIENT_104",
            identity_token="SYN_LINK_TOKEN_001",
            demographics=PatientDemographics(
                first_name="Priya",
                last_name="Raman",
                date_of_birth="1995-12-01",  # conflicting DOB
            ),
        ),
    )
    res = identity_service.assess_comparison(item)
    assert res.status == "review_required"
    assert res.status != "same_identity"
    assert res.reason_code == IdentityReasonCodes.IDENTITY_EVIDENCE_CONFLICT
    assert res.review_required is True
    assert "conflicting_evidence" in res.evidence_categories


def test_adversarial_08_matching_demographics_without_fixture_evidence_never_same_identity(identity_service: IdentityService):
    """8. Matching demographic attributes without fixture-authorized evidence never produce same_identity."""
    item = IdentityComparisonItem(
        comparison_id="adv_08",
        record_a=PatientIdentityRecord(
            source_provider_id="HOSPITAL_A",
            local_patient_id="SYN_PATIENT_103",
            identity_token=None,  # No token
            demographics=PatientDemographics(
                first_name="Anita",
                last_name="Sundaram",
                date_of_birth="1990-01-01",
                gender="female",
            ),
        ),
        record_b=PatientIdentityRecord(
            source_provider_id="HOSPITAL_B",
            local_patient_id="SYN_PATIENT_104",
            identity_token=None,  # No token
            demographics=PatientDemographics(
                first_name="Anita",
                last_name="Sundaram",
                date_of_birth="1990-01-01",
                gender="female",
            ),
        ),
    )
    res = identity_service.assess_comparison(item)
    assert res.status == "possible_match"
    assert res.status != "same_identity"
    assert res.reason_code == IdentityReasonCodes.DEMOGRAPHIC_EVIDENCE_INSUFFICIENT


def test_adversarial_09_original_references_preserved_no_mutation_or_merge(identity_service: IdentityService):
    """9. Original references are preserved and no records are merged or mutated."""
    orig_rec_a = PatientIdentityRecord(
        source_provider_id="HOSPITAL_A",
        local_patient_id="SYN_PATIENT_103",
        identity_token="SYN_LINK_TOKEN_001",
        demographics=PatientDemographics(first_name="Ramesh", last_name="Kumar"),
    )
    orig_rec_b = PatientIdentityRecord(
        source_provider_id="HOSPITAL_B",
        local_patient_id="SYN_PATIENT_104",
        identity_token="SYN_LINK_TOKEN_001",
        demographics=PatientDemographics(first_name="Ramesh", last_name="Kumar"),
    )
    item = IdentityComparisonItem(
        comparison_id="adv_09",
        record_a=orig_rec_a,
        record_b=orig_rec_b,
    )
    res = identity_service.assess_comparison(item)
    assert res.status == "same_identity"
    # Ensure source records were not mutated
    assert orig_rec_a.source_provider_id == "HOSPITAL_A"
    assert orig_rec_a.local_patient_id == "SYN_PATIENT_103"
    assert orig_rec_b.source_provider_id == "HOSPITAL_B"
    assert orig_rec_b.local_patient_id == "SYN_PATIENT_104"
    # Ensure response model does not contain merged global patient ID or token
    res_dict = res.model_dump()
    assert "global_patient_id" not in res_dict
    assert "synthetic_subject_id" not in res_dict
    assert "identity_token" not in res_dict


def test_adversarial_10_batch_counts_and_reconciliation(identity_service: IdentityService):
    """10. Batch counts and existing behavior remain strictly reconciled across all outcome states."""
    items = [
        # 1: Bound authorized token -> same_identity
        IdentityComparisonItem(
            comparison_id="batch_01",
            record_a=PatientIdentityRecord(
                source_provider_id="HOSPITAL_A",
                local_patient_id="SYN_PATIENT_103",
                identity_token="SYN_LINK_TOKEN_001",
            ),
            record_b=PatientIdentityRecord(
                source_provider_id="HOSPITAL_B",
                local_patient_id="SYN_PATIENT_104",
                identity_token="SYN_LINK_TOKEN_001",
            ),
        ),
        # 2: Bound authorized token with demographic conflict -> review_required
        IdentityComparisonItem(
            comparison_id="batch_02",
            record_a=PatientIdentityRecord(
                source_provider_id="HOSPITAL_A",
                local_patient_id="SYN_PATIENT_103",
                identity_token="SYN_LINK_TOKEN_001",
                demographics=PatientDemographics(date_of_birth="1980-01-01"),
            ),
            record_b=PatientIdentityRecord(
                source_provider_id="HOSPITAL_B",
                local_patient_id="SYN_PATIENT_104",
                identity_token="SYN_LINK_TOKEN_001",
                demographics=PatientDemographics(date_of_birth="1990-01-01"),
            ),
        ),
        # 3: Registered token reused for unauthorized references -> unresolved (IDENTITY_EVIDENCE_NOT_BOUND_TO_REFERENCES)
        IdentityComparisonItem(
            comparison_id="batch_03",
            record_a=PatientIdentityRecord(
                source_provider_id="HOSPITAL_A",
                local_patient_id="ROGUE_01",
                identity_token="SYN_LINK_TOKEN_001",
            ),
            record_b=PatientIdentityRecord(
                source_provider_id="HOSPITAL_B",
                local_patient_id="ROGUE_02",
                identity_token="SYN_LINK_TOKEN_001",
            ),
        ),
        # 4: Unregistered token -> unresolved (UNTRUSTED_IDENTITY_TOKEN)
        IdentityComparisonItem(
            comparison_id="batch_04",
            record_a=PatientIdentityRecord(
                source_provider_id="HOSPITAL_A",
                local_patient_id="SYN_PATIENT_103",
                identity_token="UNREGISTERED_TOKEN_XYZ",
            ),
            record_b=PatientIdentityRecord(
                source_provider_id="HOSPITAL_B",
                local_patient_id="SYN_PATIENT_104",
                identity_token="UNREGISTERED_TOKEN_XYZ",
            ),
        ),
        # 5: No token, matching demographics -> possible_match
        IdentityComparisonItem(
            comparison_id="batch_05",
            record_a=PatientIdentityRecord(
                source_provider_id="HOSPITAL_A",
                local_patient_id="SYN_PATIENT_103",
                demographics=PatientDemographics(first_name="Sanjay", last_name="Menon", date_of_birth="1985-06-15"),
            ),
            record_b=PatientIdentityRecord(
                source_provider_id="HOSPITAL_B",
                local_patient_id="SYN_PATIENT_104",
                demographics=PatientDemographics(first_name="Sanjay", last_name="Menon", date_of_birth="1985-06-15"),
            ),
        ),
        # 6: Two distinct authorized tokens -> different_identity
        IdentityComparisonItem(
            comparison_id="batch_06",
            record_a=PatientIdentityRecord(
                source_provider_id="HOSPITAL_A",
                local_patient_id="SYN_PATIENT_103",
                identity_token="SYN_LINK_TOKEN_001",
            ),
            record_b=PatientIdentityRecord(
                source_provider_id="HOSPITAL_B",
                local_patient_id="SYN_PATIENT_106",
                identity_token="SYN_LINK_TOKEN_002",
            ),
        ),
    ]

    batch_req = IdentityAssessmentBatchRequest(comparisons=items)
    batch_res = identity_service.assess_batch(batch_req)

    assert batch_res.total_comparisons == 6
    assert batch_res.same_identity_count == 1
    assert batch_res.different_identity_count == 1
    assert batch_res.possible_match_count == 1
    assert batch_res.unresolved_count == 2  # item 3 (unbound) and item 4 (untrusted)
    assert batch_res.review_required_count == 1  # item 2
    # Verify count reconciliation
    assert (
        batch_res.total_comparisons
        == batch_res.same_identity_count
        + batch_res.different_identity_count
        + batch_res.possible_match_count
        + batch_res.unresolved_count
        + batch_res.review_required_count
    )


# =========================================================================
# 10. Synthetic Identity Registry Startup / Validation Tests
# =========================================================================

def test_registry_validation_duplicate_subject_id_raises():
    """Duplicate synthetic_subject_id raises IdentityConfigurationError."""
    from app.core.identity_config import validate_identity_registry_entries
    from app.core.errors import IdentityConfigurationError
    from app.schemas.identity import SyntheticIdentityEntry, SyntheticIdentityRegistry

    registry = SyntheticIdentityRegistry(
        registry_version="1.0.0",
        description="test",
        disclaimer="synthetic",
        last_updated="2026-10-27T14:30:00Z",
        identities=[
            SyntheticIdentityEntry(
                synthetic_subject_id="SYN_DUP_001",
                identity_token="TOKEN_A",
                fixture_version="1.0.0",
                authorized_scoped_references=[{"source_provider_id": "HOSPITAL_A", "local_patient_id": "P1"}],
            ),
            SyntheticIdentityEntry(
                synthetic_subject_id="SYN_DUP_001",  # duplicate subject ID
                identity_token="TOKEN_B",
                fixture_version="1.0.0",
                authorized_scoped_references=[{"source_provider_id": "HOSPITAL_B", "local_patient_id": "P2"}],
            ),
        ],
    )
    with pytest.raises(IdentityConfigurationError, match="Duplicate synthetic subject identifier"):
        validate_identity_registry_entries(registry, {"HOSPITAL_A", "HOSPITAL_B"})


def test_registry_validation_duplicate_token_raises():
    """Duplicate identity_token across subjects raises IdentityConfigurationError."""
    from app.core.identity_config import validate_identity_registry_entries
    from app.core.errors import IdentityConfigurationError
    from app.schemas.identity import SyntheticIdentityEntry, SyntheticIdentityRegistry

    registry = SyntheticIdentityRegistry(
        registry_version="1.0.0",
        description="test",
        disclaimer="synthetic",
        last_updated="2026-10-27T14:30:00Z",
        identities=[
            SyntheticIdentityEntry(
                synthetic_subject_id="SYN_SUBJ_A",
                identity_token="REUSED_TOKEN",
                fixture_version="1.0.0",
                authorized_scoped_references=[{"source_provider_id": "HOSPITAL_A", "local_patient_id": "P1"}],
            ),
            SyntheticIdentityEntry(
                synthetic_subject_id="SYN_SUBJ_B",
                identity_token="REUSED_TOKEN",  # duplicate token
                fixture_version="1.0.0",
                authorized_scoped_references=[{"source_provider_id": "HOSPITAL_B", "local_patient_id": "P2"}],
            ),
        ],
    )
    with pytest.raises(IdentityConfigurationError, match="Duplicate identity token"):
        validate_identity_registry_entries(registry, {"HOSPITAL_A", "HOSPITAL_B"})


def test_registry_validation_unauthorized_provider_in_fixture_raises():
    """Provider in fixture not in allowed providers raises IdentityConfigurationError."""
    from app.core.identity_config import validate_identity_registry_entries
    from app.core.errors import IdentityConfigurationError
    from app.schemas.identity import SyntheticIdentityEntry, SyntheticIdentityRegistry

    registry = SyntheticIdentityRegistry(
        registry_version="1.0.0",
        description="test",
        disclaimer="synthetic",
        last_updated="2026-10-27T14:30:00Z",
        identities=[
            SyntheticIdentityEntry(
                synthetic_subject_id="SYN_SUBJ_A",
                identity_token="TOKEN_A",
                fixture_version="1.0.0",
                authorized_scoped_references=[{"source_provider_id": "UNKNOWN_HOSPITAL_XYZ", "local_patient_id": "P1"}],
            ),
        ],
    )
    with pytest.raises(IdentityConfigurationError, match="not in ALLOWED_PROVIDERS"):
        validate_identity_registry_entries(registry, {"HOSPITAL_A", "HOSPITAL_B"})


# =========================================================================
# 11. Registry Integrity & Reference Uniqueness Regression Tests (Remediation Item 1)
# =========================================================================

def test_registry_validation_duplicate_reference_across_subjects_raises():
    """1. A duplicate scoped reference assigned to two different subjects causes registry validation to fail."""
    from app.core.identity_config import validate_identity_registry_entries
    from app.core.errors import IdentityConfigurationError
    from app.schemas.identity import SyntheticIdentityEntry, SyntheticIdentityRegistry

    registry = SyntheticIdentityRegistry(
        registry_version="1.0.0",
        description="test",
        disclaimer="synthetic",
        last_updated="2026-10-27T15:00:00Z",
        identities=[
            SyntheticIdentityEntry(
                synthetic_subject_id="SYN_SUBJ_X",
                identity_token="TOKEN_X",
                fixture_version="1.0.0",
                authorized_scoped_references=[{"source_provider_id": "HOSPITAL_A", "local_patient_id": "SHARED_P1"}],
            ),
            SyntheticIdentityEntry(
                synthetic_subject_id="SYN_SUBJ_Y",
                identity_token="TOKEN_Y",
                fixture_version="1.0.0",
                authorized_scoped_references=[{"source_provider_id": "HOSPITAL_A", "local_patient_id": "SHARED_P1"}],
            ),
        ],
    )
    with pytest.raises(IdentityConfigurationError, match="assigned to multiple synthetic subjects"):
        validate_identity_registry_entries(registry, {"HOSPITAL_A"})


def test_registry_validation_duplicate_reference_within_same_subject_raises():
    """2. Duplicate scoped references within one subject follow the documented policy (rejected with IdentityConfigurationError)."""
    from app.core.identity_config import validate_identity_registry_entries
    from app.core.errors import IdentityConfigurationError
    from app.schemas.identity import SyntheticIdentityEntry, SyntheticIdentityRegistry

    registry = SyntheticIdentityRegistry(
        registry_version="1.0.0",
        description="test",
        disclaimer="synthetic",
        last_updated="2026-10-27T15:00:00Z",
        identities=[
            SyntheticIdentityEntry(
                synthetic_subject_id="SYN_SUBJ_X",
                identity_token="TOKEN_X",
                fixture_version="1.0.0",
                authorized_scoped_references=[
                    {"source_provider_id": "HOSPITAL_A", "local_patient_id": "DUP_P1"},
                    {"source_provider_id": "HOSPITAL_A", "local_patient_id": "DUP_P1"},
                ],
            ),
        ],
    )
    with pytest.raises(IdentityConfigurationError, match="Duplicate scoped reference .* found within synthetic subject"):
        validate_identity_registry_entries(registry, {"HOSPITAL_A"})


def test_cleaned_default_registry_passes_validation():
    """3. The cleaned default registry passes validation without error."""
    from app.core.identity_config import load_synthetic_identity_registry
    registry = load_synthetic_identity_registry()
    assert registry is not None
    assert len(registry.identities) > 0


def test_every_scoped_reference_in_default_registry_maps_to_exactly_one_subject():
    """4. Every scoped reference in the default registry maps to exactly one synthetic subject."""
    from app.core.identity_config import load_synthetic_identity_registry
    registry = load_synthetic_identity_registry()
    
    seen_references = {}
    for entry in registry.identities:
        for ref in entry.authorized_scoped_references:
            ref_key = (ref.source_provider_id, ref.local_patient_id)
            assert ref_key not in seen_references, (
                f"Scoped reference {ref_key} mapped to multiple subjects: "
                f"{seen_references[ref_key]} and {entry.synthetic_subject_id}"
            )
            seen_references[ref_key] = entry.synthetic_subject_id


def test_same_reference_pair_cannot_yield_same_and_different_identity_under_different_tokens(identity_service: IdentityService):
    """5. The same reference pair cannot yield same_identity under one token and different_identity under another due to fixture overlap."""
    item_match = IdentityComparisonItem(
        comparison_id="comp_overlap_check_1",
        record_a=PatientIdentityRecord(
            source_provider_id="HOSPITAL_A",
            local_patient_id="SYN_PATIENT_001",
            identity_token="SYN_LINK_TOKEN_999",
        ),
        record_b=PatientIdentityRecord(
            source_provider_id="HOSPITAL_B",
            local_patient_id="SYN_PATIENT_002",
            identity_token="SYN_LINK_TOKEN_999",
        ),
    )
    res_match = identity_service.assess_comparison(item_match)
    assert res_match.status == "same_identity"

    item_unbound = IdentityComparisonItem(
        comparison_id="comp_overlap_check_2",
        record_a=PatientIdentityRecord(
            source_provider_id="HOSPITAL_A",
            local_patient_id="SYN_PATIENT_001",
            identity_token="SYN_LINK_TOKEN_001",
        ),
        record_b=PatientIdentityRecord(
            source_provider_id="HOSPITAL_B",
            local_patient_id="SYN_PATIENT_002",
            identity_token="SYN_LINK_TOKEN_002",
        ),
    )
    res_unbound = identity_service.assess_comparison(item_unbound)
    assert res_unbound.status == "unresolved"
    assert res_unbound.status != "different_identity"
    assert res_unbound.status != "same_identity"
    assert res_unbound.reason_code == IdentityReasonCodes.IDENTITY_EVIDENCE_NOT_BOUND_TO_REFERENCES


def test_distinct_synthetic_subjects_have_distinct_authorized_references():
    """6. Distinct synthetic subjects have strictly disjoint sets of authorized references."""
    from app.core.identity_config import load_synthetic_identity_registry
    registry = load_synthetic_identity_registry()

    subjects_refs = []
    for entry in registry.identities:
        refs_set = {(ref.source_provider_id, ref.local_patient_id) for ref in entry.authorized_scoped_references}
        subjects_refs.append((entry.synthetic_subject_id, refs_set))

    for i in range(len(subjects_refs)):
        for j in range(i + 1, len(subjects_refs)):
            subj_i, refs_i = subjects_refs[i]
            subj_j, refs_j = subjects_refs[j]
            overlap = refs_i.intersection(refs_j)
            assert not overlap, f"Subjects '{subj_i}' and '{subj_j}' share overlapping references: {overlap}"


# =========================================================================
# 12. Provider Allowlist Enforcement During Registry Validation Tests (Remediation Item 2)
# =========================================================================

def test_load_registry_with_unknown_provider_raises_error(tmp_path):
    """1. A registry file containing an unknown provider is rejected during load."""
    from app.core.identity_config import load_synthetic_identity_registry
    from app.core.errors import IdentityConfigurationError

    bad_registry = {
        "registry_version": "1.0.0",
        "description": "bad",
        "disclaimer": "test",
        "last_updated": "2026-10-27T15:00:00Z",
        "identities": [
            {
                "synthetic_subject_id": "SYN_BAD_1",
                "identity_token": "SYN_BAD_TOK_1",
                "fixture_version": "1.0.0",
                "authorized_scoped_references": [
                    {"source_provider_id": "ROGUE_PROVIDER_999", "local_patient_id": "P1"}
                ],
            }
        ],
    }
    bad_file = tmp_path / "bad_registry.json"
    bad_file.write_text(json.dumps(bad_registry), encoding="utf-8")

    with pytest.raises(IdentityConfigurationError, match="not in ALLOWED_PROVIDERS"):
        load_synthetic_identity_registry(
            registry_path=str(bad_file),
            allowed_providers={"HOSPITAL_A", "HOSPITAL_B"},
        )


def test_load_registry_with_only_valid_configured_providers_succeeds(tmp_path):
    """2. A registry with only valid configured providers loads successfully."""
    from app.core.identity_config import load_synthetic_identity_registry

    valid_registry = {
        "registry_version": "1.0.0",
        "description": "valid",
        "disclaimer": "test",
        "last_updated": "2026-10-27T15:00:00Z",
        "identities": [
            {
                "synthetic_subject_id": "SYN_VALID_1",
                "identity_token": "SYN_VALID_TOK_1",
                "fixture_version": "1.0.0",
                "authorized_scoped_references": [
                    {"source_provider_id": "HOSPITAL_A", "local_patient_id": "P1"}
                ],
            }
        ],
    }
    valid_file = tmp_path / "valid_registry.json"
    valid_file.write_text(json.dumps(valid_registry), encoding="utf-8")

    reg = load_synthetic_identity_registry(
        registry_path=str(valid_file),
        allowed_providers={"HOSPITAL_A", "HOSPITAL_B"},
    )
    assert reg is not None
    assert len(reg.identities) == 1


def test_startup_validation_uses_actual_configured_allowlist():
    """3. Startup registry validation utilizes the configured ALLOWED_PROVIDERS allowlist."""
    from app.core.identity_config import load_synthetic_identity_registry
    from app.core.config import get_settings

    settings = get_settings()
    registry = load_synthetic_identity_registry(
        registry_path=settings.SYNTHETIC_IDENTITY_REGISTRY_PATH,
        allowed_providers=settings.ALLOWED_PROVIDERS,
    )
    assert registry is not None
    for entry in registry.identities:
        for ref in entry.authorized_scoped_references:
            assert ref.source_provider_id in settings.ALLOWED_PROVIDERS


# =========================================================================
# 13. Single Authoritative Source & Trusted Token Derivation Tests (Remediation Item 3)
# =========================================================================

def test_trusted_tokens_derived_strictly_from_authoritative_registry(identity_service: IdentityService):
    """The service's trusted tokens derive strictly from the authoritative registry."""
    from app.core.identity_config import load_synthetic_identity_registry
    registry = load_synthetic_identity_registry()
    expected_tokens = {entry.identity_token for entry in registry.identities}

    assert identity_service.trusted_tokens == expected_tokens
    # Verify TRUSTED_SYNTHETIC_TOKENS is no longer in settings
    assert not hasattr(identity_service.settings, "TRUSTED_SYNTHETIC_TOKENS")

