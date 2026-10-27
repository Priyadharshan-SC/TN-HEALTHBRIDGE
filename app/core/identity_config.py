"""Configuration and registry management for M4 Patient Identity Safety."""
import json
import logging
from functools import lru_cache
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple

from app.core.errors import IdentityConfigurationError
from app.schemas.identity import SyntheticIdentityEntry, SyntheticIdentityRegistry

logger = logging.getLogger("tn_healthbridge.identity_config")

DEFAULT_IDENTITY_REGISTRY_PATH = (
    Path(__file__).resolve().parent.parent.parent
    / "data"
    / "identity"
    / "synthetic_identity_registry.json"
)


def validate_identity_registry_entries(
    entries: Any,
    allowed_providers: Optional[Set[str]] = None,
) -> None:
    """Validate synthetic identity fixture entries for integrity, uniqueness, and scope constraints.
    
    Enforces:
    1. Uniqueness of synthetic_subject_id across all entries.
    2. Uniqueness of identity_token across all entries.
    3. Every subject must authorize at least one provider-scoped reference.
    4. References must have non-blank source_provider_id and local_patient_id.
    5. Provider references must belong to configured allowed_providers.
    6. Intra-subject uniqueness: duplicate references within the same subject are rejected.
    7. Global uniqueness: each provider-scoped reference belongs to at most one synthetic subject.

    Raises:
        IdentityConfigurationError: If any integrity or uniqueness constraint is violated.
    """
    if hasattr(entries, "identities"):
        entries = entries.identities

    seen_subjects: Set[str] = set()
    seen_tokens: Set[str] = set()
    global_ref_to_subject: Dict[Tuple[str, str], str] = {}

    for entry in entries:
        # 1. Validate subject ID
        if not entry.synthetic_subject_id or not entry.synthetic_subject_id.strip():
            raise IdentityConfigurationError("Identity fixture entry missing synthetic_subject_id.")
        subj_id = entry.synthetic_subject_id.strip()
        if subj_id in seen_subjects:
            raise IdentityConfigurationError(
                f"Duplicate synthetic subject identifier '{subj_id}' in registry configuration."
            )
        seen_subjects.add(subj_id)

        # 2. Validate identity token
        if not entry.identity_token or not entry.identity_token.strip():
            raise IdentityConfigurationError(
                f"Identity fixture '{subj_id}' has missing or blank identity_token."
            )
        tok = entry.identity_token.strip()
        if tok in seen_tokens:
            raise IdentityConfigurationError(
                f"Duplicate identity token '{tok}' assigned to multiple synthetic subjects in registry."
            )
        seen_tokens.add(tok)

        # 3. Validate authorized scoped references
        if not entry.authorized_scoped_references:
            raise IdentityConfigurationError(
                f"Identity fixture '{subj_id}' must authorize at least one provider-scoped reference."
            )

        subject_refs: Set[Tuple[str, str]] = set()

        for ref in entry.authorized_scoped_references:
            prov = (ref.source_provider_id or "").strip()
            loc = (ref.local_patient_id or "").strip()
            if not prov or not loc:
                raise IdentityConfigurationError(
                    f"Identity fixture '{subj_id}' contains invalid reference with blank provider or local ID."
                )
            if allowed_providers is not None and prov not in allowed_providers:
                raise IdentityConfigurationError(
                    f"Identity fixture '{subj_id}' references provider '{prov}' not in ALLOWED_PROVIDERS."
                )

            ref_key = (prov, loc)

            # 4. Check intra-subject duplicate references
            if ref_key in subject_refs:
                raise IdentityConfigurationError(
                    f"Duplicate scoped reference '({prov}, {loc})' found within synthetic subject '{subj_id}'."
                )
            subject_refs.add(ref_key)

            # 5. Check global uniqueness across distinct synthetic subjects
            if ref_key in global_ref_to_subject:
                prev_subj = global_ref_to_subject[ref_key]
                raise IdentityConfigurationError(
                    f"Scoped reference '({prov}, {loc})' is assigned to multiple synthetic subjects: '{prev_subj}' and '{subj_id}'."
                )
            global_ref_to_subject[ref_key] = subj_id


@lru_cache(maxsize=16)
def _load_synthetic_identity_registry_cached(
    path_str: str,
    providers_tuple: Optional[Tuple[str, ...]],
) -> SyntheticIdentityRegistry:
    """Internal cached helper loading and validating the registry."""
    path = Path(path_str)

    if not path.is_file():
        raise IdentityConfigurationError(
            f"Authoritative synthetic identity registry file not found at: {path}"
        )

    try:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
    except json.JSONDecodeError as exc:
        raise IdentityConfigurationError(
            f"Corrupted or invalid JSON in synthetic identity registry: {exc}"
        ) from exc
    except Exception as exc:
        raise IdentityConfigurationError(
            f"Failed to read synthetic identity registry file: {exc}"
        ) from exc

    try:
        registry = SyntheticIdentityRegistry(**data)
    except Exception as exc:
        raise IdentityConfigurationError(
            f"Synthetic identity registry failed schema validation: {exc}"
        ) from exc

    allowed_providers = set(providers_tuple) if providers_tuple is not None else None
    validate_identity_registry_entries(registry.identities, allowed_providers=allowed_providers)
    logger.info(
        "Loaded synthetic identity registry version=%s with %d subjects from %s",
        registry.registry_version,
        len(registry.identities),
        path.name,
    )
    return registry


def clear_synthetic_identity_registry_cache() -> None:
    """Clear cached registry instances, useful for dynamic test fixtures."""
    _load_synthetic_identity_registry_cached.cache_clear()


def load_synthetic_identity_registry(
    registry_path: Optional[str] = None,
    allowed_providers: Optional[Set[str]] = None,
) -> SyntheticIdentityRegistry:
    """Load and validate the authoritative synthetic identity registry from JSON configuration.
    
    If allowed_providers is not explicitly supplied, resolves ALLOWED_PROVIDERS from application settings.
    """
    path_str = str(Path(registry_path).resolve()) if registry_path else str(DEFAULT_IDENTITY_REGISTRY_PATH.resolve())

    if allowed_providers is None:
        try:
            from app.core.config import get_settings
            allowed_providers = get_settings().ALLOWED_PROVIDERS
        except Exception:
            allowed_providers = None

    providers_tuple: Optional[Tuple[str, ...]] = (
        tuple(sorted(allowed_providers)) if allowed_providers is not None else None
    )

    return _load_synthetic_identity_registry_cached(path_str, providers_tuple)
