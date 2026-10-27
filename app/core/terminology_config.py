"""Configuration and registry management for M3 Clinical Terminology Mapping."""
import json
import logging
from functools import lru_cache
from pathlib import Path
from typing import List, Optional, Set

from app.core.errors import TerminologyConfigurationError
from app.schemas.terminology import TerminologyMappingEntry, TerminologyRegistry

logger = logging.getLogger("tn_healthbridge.terminology_config")

DEFAULT_REGISTRY_PATH = (
    Path(__file__).resolve().parent.parent.parent
    / "data"
    / "terminology"
    / "default_registry.json"
)


def validate_registry_entries(
    entries: List[TerminologyMappingEntry],
    strict_no_conflicts: bool = False,
) -> None:
    """Validate terminology mapping entries for structural integrity and identifier uniqueness.
    
    Raises:
        TerminologyConfigurationError: If duplicate mapping IDs, invalid target systems/codes,
                                       empty test names, or strict configuration conflicts are found.
    """
    seen_ids: Set[str] = set()

    for entry in entries:
        # 1. Validate mapping identifier
        if not entry.mapping_id or not entry.mapping_id.strip():
            raise TerminologyConfigurationError("Mapping entry missing required mapping_id.")
        clean_id = entry.mapping_id.strip()
        if clean_id in seen_ids:
            raise TerminologyConfigurationError(
                f"Duplicate mapping identifier '{clean_id}' detected in registry configuration."
            )
        seen_ids.add(clean_id)

        # 2. Validate source test name
        if not entry.source_test_name or not entry.source_test_name.strip():
            raise TerminologyConfigurationError(
                f"Mapping '{clean_id}' contains empty or blank source_test_name."
            )

        # 3. Validate target system and target code
        if not entry.target_system or not entry.target_system.strip():
            raise TerminologyConfigurationError(
                f"Mapping '{clean_id}' contains invalid or missing target_system configuration."
            )
        if not entry.target_code or not entry.target_code.strip():
            raise TerminologyConfigurationError(
                f"Mapping '{clean_id}' contains invalid or missing target_code configuration."
            )
        if not entry.target_display or not entry.target_display.strip():
            raise TerminologyConfigurationError(
                f"Mapping '{clean_id}' contains invalid or missing target_display configuration."
            )

        # 4. Check for contradictory constraint definitions
        if entry.require_specimen and entry.specimen_constraints is not None and len(entry.specimen_constraints) == 0:
            raise TerminologyConfigurationError(
                f"Mapping '{clean_id}' requires specimen but specifies empty specimen_constraints list."
            )
        if entry.require_unit and entry.unit_constraints is not None and len(entry.unit_constraints) == 0:
            raise TerminologyConfigurationError(
                f"Mapping '{clean_id}' requires unit but specifies empty unit_constraints list."
            )

    # 5. Strict conflict validation if requested
    if strict_no_conflicts:
        seen_targets: dict = {}
        for entry in entries:
            if entry.mapping_status != "active":
                continue
            key = (
                (entry.source_provider_id or "*").upper(),
                entry.source_test_name.strip().lower(),
            )
            target = (entry.target_system.strip(), entry.target_code.strip())
            if key in seen_targets and seen_targets[key] != target:
                raise TerminologyConfigurationError(
                    f"Conflicting configured mappings for test name '{entry.source_test_name}' "
                    f"under provider scope '{entry.source_provider_id or '*'}': conflicting targets "
                    f"{seen_targets[key]} vs {target}."
                )
            seen_targets[key] = target


def load_terminology_registry(
    file_path: Optional[str] = None,
    strict_no_conflicts: bool = False,
) -> TerminologyRegistry:
    """Load and validate the terminology registry from a JSON fixture file.
    
    If file_path is None, loads from the default registry file.
    """
    path = Path(file_path) if file_path else DEFAULT_REGISTRY_PATH
    if not path.is_file():
        raise TerminologyConfigurationError(f"Terminology registry file not found at: {path}")

    try:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
    except Exception as exc:
        raise TerminologyConfigurationError(
            f"Failed to parse terminology registry JSON at {path}: {str(exc)}"
        ) from exc

    try:
        registry = TerminologyRegistry(**data)
    except Exception as exc:
        raise TerminologyConfigurationError(
            f"Registry schema validation failed for {path}: {str(exc)}"
        ) from exc

    validate_registry_entries(registry.mappings, strict_no_conflicts=strict_no_conflicts)
    return registry


@lru_cache(maxsize=1)
def get_cached_registry() -> TerminologyRegistry:
    """Return the cached default terminology registry."""
    return load_terminology_registry()


def clear_registry_cache() -> None:
    """Clear cached registry (primarily used in tests when switching fixtures)."""
    get_cached_registry.cache_clear()
