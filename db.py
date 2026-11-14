"""SQLite access (WAL mode). Works with the health.db schema.

Every call opens a short-lived connection, so it is safe to use from the API
threads and the sampler thread at the same time.
"""
import contextlib
import json
import sqlite3
import time
from typing import Dict, List, Optional

import config
import levels

REQUIRED = ("subjects", "metrics", "readings", "daily", "levels", "level_ranges", "alerts", "meta")


@contextlib.contextmanager
def conn():
    c = sqlite3.connect(config.DB_PATH, timeout=15)
    c.row_factory = sqlite3.Row
    c.execute("PRAGMA busy_timeout=15000")
    try:
        yield c
        c.commit()
    finally:
        c.close()


def init():
    """Check the database is the expected one, switch on WAL, add the live subject."""
    with conn() as c:
        have = {r[0] for r in c.execute("SELECT name FROM sqlite_master WHERE type='table'")}
        missing = [t for t in REQUIRED if t not in have]
        if missing:
            raise RuntimeError(
                f"{config.DB_PATH} is missing tables {missing}. "
                "Put the provided health.db next to main.py or set HM_DB=/path/to/health.db")
        c.execute("PRAGMA journal_mode=WAL")
        c.execute("CREATE INDEX IF NOT EXISTS idx_readings_ts ON readings(ts)")
        c.execute("INSERT OR IGNORE INTO subjects(id,name,baseline,environment) VALUES(?,?,?,?)",
                  (config.LOCAL_SUBJECT, "Local sensors", "{}", "free_space"))


# ---------- reference data ----------
def metrics() -> Dict[str, dict]:
    with conn() as c:
        return {r["name"]: dict(r) for r in c.execute("SELECT * FROM metrics")}


def vital_names() -> List[str]:
    return [n for n, m in metrics().items() if m["kind"] == "vital"]


def level_defs() -> List[dict]:
    with conn() as c:
        return [dict(r) for r in c.execute("SELECT * FROM levels ORDER BY code")]


def level_ranges() -> Dict[str, Dict[str, str]]:
    out: Dict[str, Dict[str, str]] = {}
    with conn() as c:
        for r in c.execute("SELECT * FROM level_ranges"):
            out.setdefault(r["metric"], {})[r["level"]] = r["range_text"]
    return out


def subjects() -> List[dict]:
    with conn() as c:
        rows = [dict(r) for r in c.execute("SELECT * FROM subjects ORDER BY id")]
    for r in rows:
        r["baseline"] = json.loads(r["baseline"] or "{}")
        r["id"] = r["id"]
    return rows


def subject(sid: str) -> Optional[dict]:
    return next((s for s in subjects() if s["id"] == sid), None)


def set_environment(sid: str, env: str):
    with conn() as c:
        c.execute("UPDATE subjects SET environment=? WHERE id=?", (env, sid))


# ---------- readings ----------
def add_reading(sid: str, metric: str, value: float, ts: Optional[float] = None) -> str:
    """Store one reading, classified with the thresholds in the database. Returns its level."""
    m = metrics()[metric]
    level = levels.classify(m, value)
    with conn() as c:
        c.execute("INSERT OR REPLACE INTO readings(subject_id,metric,ts,value,status,level) VALUES(?,?,?,?,?,?)",
                  (sid, metric, ts if ts is not None else time.time(), value, levels.STATUS[level], level))
    return level


def latest(sid: str) -> List[dict]:
    """Most recent reading of every vital for one subject."""
    with conn() as c:
        rows = c.execute(
            """SELECT r.metric, r.ts, r.value, r.status, r.level, m.unit
               FROM readings r
               JOIN metrics m ON m.name = r.metric AND m.kind = 'vital'
               WHERE r.subject_id = ?
                 AND r.ts = (SELECT MAX(ts) FROM readings WHERE subject_id = r.subject_id AND metric = r.metric)
               ORDER BY r.metric""", (sid,)).fetchall()
    return [dict(r) for r in rows]


def history(sid: str, metric: str, since: Optional[float] = None, until: Optional[float] = None,
            limit: Optional[int] = None) -> List[dict]:
    q, a = "SELECT ts,value,status,level FROM readings WHERE subject_id=? AND metric=?", [sid, metric]
    if since is not None:
        q += " AND ts>=?"; a.append(since)
    if until is not None:
        q += " AND ts<=?"; a.append(until)
    if limit:  # newest `limit` rows, returned oldest-first
        q = f"SELECT * FROM ({q} ORDER BY ts DESC LIMIT ?) ORDER BY ts"; a.append(limit)
    else:
        q += " ORDER BY ts"
    with conn() as c:
        return [dict(r) for r in c.execute(q, a)]


def export_rows(sid: str):
    with conn() as c:
        yield from c.execute(
            """SELECT r.ts, r.metric, r.value, r.status FROM readings r
               JOIN metrics m ON m.name=r.metric AND m.kind='vital'
               WHERE r.subject_id=? ORDER BY r.ts, r.metric""", (sid,))


def recent_values(sid: str, metric: str, n: int) -> List[dict]:
    with conn() as c:
        return [dict(r) for r in c.execute(
            "SELECT ts,value,level FROM readings WHERE subject_id=? AND metric=? ORDER BY ts DESC LIMIT ?",
            (sid, metric, n))]


# ---------- daily / radiation ----------
def daily(sid: str) -> List[dict]:
    with conn() as c:
        return [dict(r) for r in c.execute("SELECT * FROM daily WHERE subject_id=? ORDER BY ts", (sid,))]


def career_limit() -> float:
    with conn() as c:
        row = c.execute("SELECT value FROM meta WHERE key='radiation_career_limit_mSv'").fetchone()
    return float(json.loads(row["value"])) if row else 600.0


# ---------- alerts ----------
def add_alert(sid: str, ts: float, metric: str, value: float, level: str, source: str, msg: str):
    with conn() as c:
        c.execute("INSERT INTO alerts(subject_id,ts,metric,value,level,source,msg) VALUES(?,?,?,?,?,?,?)",
                  (sid, ts, metric, value, level, source, msg))


def alerts(sid: Optional[str], n: int = 50) -> List[dict]:
    q, a = "SELECT * FROM alerts", []
    if sid:
        q += " WHERE subject_id=?"; a.append(sid)
    q += " ORDER BY ts DESC, id DESC LIMIT ?"; a.append(n)
    with conn() as c:
        return [dict(r) for r in c.execute(q, a)]


# ---------- housekeeping ----------
def prune_live():
    """Retention applies to the Pi's own live readings only; astronaut data is never deleted."""
    cutoff = time.time() - config.RETENTION_DAYS * 86400
    with conn() as c:
        c.execute("DELETE FROM readings WHERE subject_id=? AND ts<?", (config.LOCAL_SUBJECT, cutoff))
