"""
Deterministic Clinical Rules Engine
Author: Vaishnavi (@vaishnavikc0194-ux)
Project: HC-03 Antibiotic Stewardship Copilot

Deterministic rule evaluations for:
1. Antibiotic Whitelist Verification
2. Inappropriate Route (IV for outpatient cystitis)
3. Mandatory Pre-Therapy Culture Enforcement
4. Maximum Duration Capping (ICMR Short-Course Standards)
5. WHO AWaRe Reserve Restriction
6. Renal Dose Adjustments (CKD Stage 3/4)
"""

from typing import Any, Dict, List, Optional


def is_antibiotic_molecule(generic_name: Optional[str], benchmarks: Dict[str, Any]) -> bool:
    """Checks whether the generic name is present in the antibiotic benchmarks."""
    return bool(generic_name and generic_name in benchmarks)


def evaluate_clinical_flags(
    generic_name: str,
    benchmark: Dict[str, Any],
    route: str,
    duration_days: Optional[int],
    has_cystitis_or_uti: bool,
    culture_ordered: bool,
    has_ckd: bool,
) -> List[str]:
    """Evaluates deterministic clinical rules against local hospital antibiogram benchmarks."""
    flags = []

    # Duration Check
    max_duration = benchmark.get("max_duration_days")
    if duration_days and max_duration and int(duration_days) > int(max_duration):
        flags.append("DURATION_EXCEEDS_LOCAL_DEFAULT")

    # Culture Requirement
    if benchmark.get("requires_culture", False) and not culture_ordered:
        flags.append("CULTURE_REQUIRED_BEFORE_OR_AT_START")

    # WHO AWaRe Reserve Agent Justification
    if benchmark.get("aware_class") == "Reserve":
        flags.append("RESERVE_AGENT_REQUIRES_JUSTIFICATION")

    # Route Mismatch: IV therapy for outpatient cystitis
    if "IV" in route.upper() and benchmark.get("aware_class") == "Watch" and has_cystitis_or_uti:
        flags.append("ROUTE_ERROR: IV therapy prescribed for stable outpatient.")

    # Renal Toxicity Alert for CKD
    if has_ckd and benchmark.get("renal_dose_adjustment_required", False):
        flags.append("RENAL_TOXICITY_ALERT")

    return flags
