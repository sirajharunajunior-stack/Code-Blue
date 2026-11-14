"""Endpoint logic in plain Python (no FastAPI), so it can be tested anywhere.
main.py only translates these functions into HTTP."""
import csv
import io
import statistics
import time
from datetime import datetime, timezone
from typing import Iterator, List, Optional

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
    for r in rows:
        r["time"] = iso(r["ts"])
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
