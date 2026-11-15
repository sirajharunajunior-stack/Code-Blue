"""Endpoint logic in plain Python (no FastAPI), so it can be tested anywhere.
main.py only translates these functions into HTTP."""
import csv
import io
import math
import statistics
import time
from datetime import datetime, timezone
from typing import Iterator, List, Optional

import re

import advice
import alerts as alerts_mod
import db
import levels


class NotFound(Exception):
    pass


class BadRequest(Exception):
    pass


def iso(ts: float) -> str:
    return datetime.fromtimestamp(ts, timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _colors() -> dict:
    return {d["name"]: d for d in db.level_defs()}


def _require_subject(sid: str) -> dict:
    s = db.subject(sid)
    if not s:
        raise NotFound(f"unknown subject '{sid}'")
    return s


def _overall(rows: List[dict]) -> dict:
    d = _colors()
    lv = levels.worst(r["level"] for r in rows)
    return {"overall_level": lv, "label": d[lv]["label"], "color": d[lv]["color"],
            "action": d[lv]["action"]}


# ---------- endpoints ----------
def subjects() -> List[dict]:
    return db.subjects()


def limits() -> List[dict]:
    return list(db.metrics().values())


def levels_info() -> dict:
    return {"levels": db.level_defs(), "ranges": db.level_ranges()}


def latest(sid: str) -> dict:
    _require_subject(sid)
    rows = db.latest(sid)
    for r in rows:
        r["time"] = iso(r["ts"])
    return {"subject": sid, "latest": rows, **_overall(rows)}


def history(sid: str, metric: str, minutes: Optional[float] = None, since: Optional[float] = None,
            until: Optional[float] = None, limit: Optional[int] = None) -> List[dict]:
    _require_subject(sid)
    m = db.metrics().get(metric)
    if not m:
        raise NotFound(f"unknown metric '{metric}'")
    if m["kind"] != "vital":
        raise BadRequest(f"'{metric}' is a daily metric; use /api/daily")
    if minutes is not None:
        # window ends at the newest reading, so it also works on historical data
        last = db.recent_values(sid, metric, 1)
        if last:
            since = last[0]["ts"] - minutes * 60
    rows = db.history(sid, metric, since, until, limit)
    for r in rows:
        r["time"] = iso(r["ts"])
    return rows


def crew() -> List[dict]:
    """Every subject with data, worst overall level first."""
    out = []
    for s in db.subjects():
        rows = db.latest(s["id"])
        if not rows:
            continue
        flagged = [{"metric": r["metric"], "value": r["value"], "unit": r["unit"], "level": r["level"]}
                   for r in rows if r["level"] != "normal"]
        out.append({"id": s["id"], "name": s["name"], "as_of": iso(max(r["ts"] for r in rows)),
                    **_overall(rows), "flagged": flagged})
    out.sort(key=lambda c: (-levels.CODE[c["overall_level"]], c["id"]))
    return out


def daily(sid: str) -> List[dict]:
    _require_subject(sid)
    rows = db.daily(sid)
    for r in rows:
        r["date"] = iso(r["ts"])[:10]
    return rows


def alerts(sid: Optional[str], n: int = 50) -> List[dict]:
    if sid:
        _require_subject(sid)
    rows = db.alerts(sid, n)
    specs = db.metrics()
    for r in rows:
        r["time"] = iso(r["ts"])
        a = advice.advice_for(r["metric"], r["value"], r["level"], specs[r["metric"]]) if r["metric"] in specs else None
        r["what_to_do"] = advice.action_plan(a, compact=True) if a else None     # every alert says what to do
    return rows


def radiation(sid: str) -> dict:
    s = _require_subject(sid)
    m = db.metrics()["radiation"]
    x = levels.radiation_limits(m)
    env = s["environment"]
    env_max = levels.radiation_env_max(m, env)
    limit = db.career_limit()
    days = db.daily(sid)
    doses = [d["radiation"] for d in days if d["radiation"] is not None]
    baseline = statistics.median(doses) if doses else None
    cumulative = days[-1]["cumulative_radiation"] if days else 0.0
    recent = doses[-7:]
    avg = statistics.fmean(recent) if recent else None
    remaining = max(0.0, limit - cumulative)
    spike = x.get("spike_multiple_of_baseline", 2) * baseline if baseline else None
    # recompute today's level with the CURRENT environment (it can be changed via the API)
    event = 0.0
    for d in days:
        event = event + d["radiation"] if spike and d["radiation"] >= spike else 0.0
    today = (levels.classify_radiation(m, days[-1]["radiation"], env, baseline, event)
             if days and baseline else None)
    return {
        "subject": sid, "environment": env, "environments": levels.environments(m),
        "normal_max_mSv_day": env_max, "career_limit_mSv": limit,
        "cumulative_mSv": cumulative, "remaining_mSv": round(remaining, 3),
        "percent_of_limit": round(100 * cumulative / limit, 2) if limit else None,
        "baseline_daily_mSv": baseline, "spike_threshold_mSv": spike,
        "avg_daily_mSv_last7": round(avg, 3) if avg else None,
        "projected_days_to_limit": round(remaining / avg) if avg else None,
        "level_today": today,
        "daily": [{"day": d["day"], "date": iso(d["ts"])[:10], "radiation": d["radiation"],
                   "cumulative_radiation": d["cumulative_radiation"]} for d in days],
    }


def set_environment(sid: str, value: str) -> dict:
    _require_subject(sid)
    valid = levels.environments(db.metrics()["radiation"])
    if value not in valid:
        raise BadRequest(f"environment must be one of {valid}")
    db.set_environment(sid, value)
    return {"subject": sid, "environment": value}


def export_csv(sid: str) -> Iterator[str]:
    _require_subject(sid)
    buf = io.StringIO()
    w = csv.writer(buf, lineterminator="\n")
    w.writerow(["timestamp", "metric", "value", "status"])
    yield buf.getvalue()
    for r in db.export_rows(sid):
        buf.seek(0); buf.truncate()
        w.writerow([iso(r["ts"]), r["metric"], r["value"], r["status"]])
        yield buf.getvalue()


# ---------- safety precautions ----------
def _plan(items: List[dict]) -> Optional[dict]:
    """The 'what to do now' plan for the most serious flagged item, listing the others as also flagged."""
    items = [a for a in items if a]
    if not items:
        return None
    items = sorted(items, key=lambda a: -levels.CODE[a["level"]])
    plan = advice.action_plan(items[0])
    plan["also_flagged"] = [{"condition_name": a["condition_name"], "level": a["level"]} for a in items[1:]]
    return plan



def precautions() -> dict:
    """The whole precautions library (conditions, steps per level, warning signs)."""
    return advice.library()


def advice_for_subject(sid: str) -> dict:
    """Precautions for everything currently flagged for one person: latest vitals plus the latest daily
    metrics (sleep, exercise, radiation). One entry per condition, worst first."""
    _require_subject(sid)
    specs = db.metrics()
    rows = db.latest(sid)
    items: dict = {}

    def add(metric, value, level):
        a = advice.advice_for(metric, value, level, specs[metric])
        if not a:
            return
        cur = items.get(a["condition"])
        if cur is None:
            a["metrics"] = [metric]
            items[a["condition"]] = a
        else:                                              # e.g. systolic and diastolic: keep the worse one
            metrics = cur["metrics"] + [metric]
            if levels.CODE[level] > levels.CODE[cur["level"]]:
                a["metrics"] = metrics
                items[a["condition"]] = a
            else:
                cur["metrics"] = metrics

    for r in rows:
        add(r["metric"], r["value"], r["level"])
    days = db.daily(sid)
    if days:
        last = days[-1]
        for metric, col in (("sleep_hours", "sleep_level"), ("exercise_hours", "exercise_level"),
                            ("radiation", "radiation_level")):
            if last.get(col):
                add(metric, last[metric], last[col])

    lib = advice.library()
    overall = _overall(rows)
    out = sorted(items.values(), key=lambda a: -levels.CODE[a["level"]])
    return {"subject": sid, **overall, "action_plan": _plan(out), "advice": out,
            "check_first": lib["check_first"], "emergency_signs": lib["emergency_signs"],
            "disclaimer": lib["disclaimer"]}


# ---------- people ----------
def add_subject(sid: str, name: str) -> dict:
    """Create a person to monitor (e.g. the user of the camera page)."""
    if not re.fullmatch(r"[A-Za-z0-9_-]{1,32}", sid or ""):
        raise BadRequest("id must be 1-32 letters, digits, '-' or '_'")
    name = (name or "").strip()
    if not name or len(name) > 60:
        raise BadRequest("name must be 1-60 characters")
    if not db.add_subject(sid, name):
        raise BadRequest(f"subject '{sid}' already exists")
    return db.subject(sid)


# ---------- ingest: readings from a camera, phone app or any other device ----------
# Values outside these ranges are rejected as measurement errors, never stored.
PLAUSIBLE = {"heart_rate": (20, 250), "resp_rate": (2, 60), "spo2": (50, 100), "body_temp": (25, 43),
             "bp_systolic": (50, 260), "bp_diastolic": (30, 160), "cabin_co2": (0, 10)}
_default_engine: Optional[alerts_mod.AlertEngine] = None


def ingest(sid: str, readings: List[dict], source: str = "api", engine=None) -> dict:
    """Store readings, grade them with the database thresholds, run the alert rules, and return
    each reading's level, any alerts raised, and the safety precautions if it is flagged.
    All-or-nothing: if any reading is invalid, nothing is stored."""
    global _default_engine
    _require_subject(sid)
    if not readings:
        raise BadRequest("no readings supplied")
    specs, now, clean, seen = db.metrics(), time.time(), [], set()
    for r in readings:
        m, spec = r.get("metric"), specs.get(r.get("metric"))
        if not spec or spec["kind"] != "vital":
            raise BadRequest(f"unknown vital metric '{m}'")
        try:
            v = float(r["value"])
        except (KeyError, TypeError, ValueError):
            raise BadRequest(f"{m}: value must be a number")
        lo, hi = PLAUSIBLE.get(m, (-1e9, 1e9))
        if not (lo <= v <= hi):                                  # also rejects NaN
            raise BadRequest(f"{m} value {v} is outside the plausible range {lo}-{hi}; not stored")
        ts = r.get("ts")
        try:
            ts = now if ts is None else float(ts)
        except (TypeError, ValueError):
            raise BadRequest(f"{m}: timestamp must be a finite number")
        if not math.isfinite(ts):
            raise BadRequest(f"{m}: timestamp must be a finite number")
        if abs(ts - now) > 86400:
            raise BadRequest(f"{m}: timestamp is more than a day away from now")
        key = (m, ts)
        if key in seen:
            raise BadRequest(f"{m}: duplicate timestamp in this batch")
        seen.add(key)
        clean.append((m, v, ts))
    if engine is None:
        _default_engine = _default_engine or alerts_mod.AlertEngine()
        engine = _default_engine
    colors, out = _colors(), []
    for m, v, ts in clean:
        level = db.add_reading(sid, m, v, ts)
        fired = engine.check(sid, m, v, level, ts)
        for a in fired:
            a["time"] = iso(a["ts"])
        out.append({"metric": m, "value": v, "unit": specs[m]["unit"], "level": level,
                    "label": colors[level]["label"], "color": colors[level]["color"], "time": iso(ts),
                    "alerts": fired, "advice": advice.advice_for(m, v, level, specs[m])})
    return {"subject": sid, "source": source, "saved": len(out), "results": out,
            "action_plan": _plan([r["advice"] for r in out]),      # null when everything is normal
            **_overall(db.latest(sid))}
