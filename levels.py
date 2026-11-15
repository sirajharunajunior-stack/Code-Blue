"""Health-level classification (pure Python, no dependencies).

Levels, from best to worst:
    0 normal            inside the healthy range
    1 slightly_abnormal outside the healthy range but not beyond the warning limit
    2 needs_checkup     beyond the warning limit
    3 critical          beyond the critical limit

Limits come from the `metrics` table, so changing a threshold in the database
changes the behaviour with no code edits.
"""
import json
from typing import Dict, Iterable, List, Optional

LEVELS = ["normal", "slightly_abnormal", "needs_checkup", "critical"]
CODE = {name: i for i, name in enumerate(LEVELS)}

# Old two-state status used by the source dataset.
STATUS = {"normal": "normal", "slightly_abnormal": "normal",
          "needs_checkup": "warning", "critical": "critical"}


def worst(levels: Iterable[str]) -> str:
    return max(levels, key=lambda l: CODE.get(l, 0), default="normal")


def _lt(v, lim):
    return lim is not None and v < lim


def _gt(v, lim):
    return lim is not None and v > lim


def classify(m: dict, value: float) -> str:
    """Classify a single value against one metric row (vitals and most daily metrics)."""
    if _lt(value, m.get("crit_low")) or _gt(value, m.get("crit_high")):
        return "critical"
    if _lt(value, m.get("warn_low")) or _gt(value, m.get("warn_high")):
        return "needs_checkup"
    # A side of the normal range only counts as "slightly abnormal" when the metric
    # is two-sided there (it has a warning/critical limit on that side). One-sided
    # metrics such as blood pressure, respiration and CO2 treat low values as normal.
    two_low = m.get("warn_low") is not None or m.get("crit_low") is not None
    two_high = m.get("warn_high") is not None or m.get("crit_high") is not None
    if (two_low and _lt(value, m.get("normal_lo"))) or (two_high and _gt(value, m.get("normal_hi"))):
        return "slightly_abnormal"
    return "normal"


def classify_sleep(m: dict, hours: float) -> str:
    return classify(m, hours)


def classify_exercise(m: dict, hours: float, zero_days_in_a_row: int = 0) -> str:
    need = json.loads(m.get("extra") or "{}").get("zero_for_days", 3)
    if hours == 0 and zero_days_in_a_row >= need:
        return "critical"
    return classify(m, hours)


def radiation_limits(m: dict) -> dict:
    return json.loads(m.get("extra") or "{}")


def classify_radiation(m: dict, dose: float, environment: str, baseline: float,
                       event_total: float = 0.0) -> str:
    """dose in mSv/day.
    critical:      solar-particle-event total (consecutive spike days summed) >= limit
    needs_checkup: dose >= spike_multiple x the person's own baseline
    slightly:      above the environment's normal maximum
    """
    x = radiation_limits(m)
    env_max = x.get("max_by_environment", {}).get(environment, m.get("normal_hi"))
    if event_total >= x.get("event_total_critical_mSv", 250):
        return "critical"
    if baseline and dose >= x.get("spike_multiple_of_baseline", 2) * baseline:
        return "needs_checkup"
    if env_max is not None and dose > env_max:
        return "slightly_abnormal"
    return "normal"


def radiation_env_max(m: dict, environment: str) -> Optional[float]:
    return radiation_limits(m).get("max_by_environment", {}).get(environment, m.get("normal_hi"))


def environments(m: dict) -> List[str]:
    return list(radiation_limits(m).get("max_by_environment", {}))
