"""Safety precautions for flagged readings. The wording lives in precautions.json: edit it freely,
no code changes needed. Pure Python (no FastAPI), so it can be tested anywhere.
General guidance only; not medical advice."""
import json
import os
from typing import Dict, Optional

import config

_LIB: Optional[dict] = None


def library() -> dict:
    global _LIB
    if _LIB is None:
        with open(os.path.join(config.BASE_DIR, "precautions.json"), encoding="utf-8") as f:
            _LIB = json.load(f)
    return _LIB


def _sides() -> Dict[str, Dict[str, str]]:
    """metric -> {'high': condition id, 'low': condition id}"""
    out: Dict[str, Dict[str, str]] = {}
    for cid, c in library()["conditions"].items():
        for metric, direction in c["metrics"]:
            out.setdefault(metric, {})[direction] = cid
    return out


def condition_for(metric: str, value: float, spec: dict) -> Optional[str]:
    """Which condition a flagged value points to (by the side of the normal range it falls on)."""
    sides = _sides().get(metric)
    if not sides:
        return None
    if len(sides) == 1:                                  # one-sided metric (SpO2, CO2, sleep, ...)
        return next(iter(sides.values()))
    hi, lo = spec.get("normal_hi"), spec.get("normal_lo")
    if hi is not None and value > hi:
        return sides.get("high")
    if lo is not None and value < lo:
        return sides.get("low")
    return None


def advice_for(metric: str, value: float, level: str, spec: dict, unit: Optional[str] = None) -> Optional[dict]:
    """Precautions for one flagged reading, or None if it is normal / has no matching condition."""
    if level == "normal":
        return None
    cid = condition_for(metric, value, spec)
    if cid is None:
        return None
    lib = library()
    c = lib["conditions"][cid]
    return {"metric": metric, "value": value, "unit": unit or spec.get("unit"), "level": level,
            "condition": cid, "condition_name": c["name"], "indicates": c["indicates"],
            "steps": c[level], "general_steps": lib["general"][level]["steps"],
            "seek_urgent_help_if": c["seek_urgent_help_if"]}


def action_plan(a: dict, compact: bool = False) -> dict:
    """Turn one flagged-reading advice item into a ready-to-show 'what to do now' plan.
    do_now = the level's general steps first (e.g. 'call for help'), then the condition-specific steps."""
    lib = library()
    title = lib["general"][a["level"]]["title"]
    plan = {"level": a["level"], "headline": f"{a['condition_name']}: {title}", "condition": a["condition"],
            "do_now": list(a["general_steps"]) + list(a["steps"]),
            "get_urgent_help_if": a["seek_urgent_help_if"]}
    if not compact:
        plan.update({"condition_name": a["condition_name"], "what_it_may_mean": a["indicates"],
                     "emergency_signs": lib["emergency_signs"],
                     "check_first": lib["check_first"] if a["level"] != "critical" else [],
                     "disclaimer": lib["disclaimer"]})
    return plan
