"""SQLite access (WAL mode). Works with the health.db schema.

Every call opens a short-lived connection, so it is safe to use from the API
threads and the sampler thread at the same time.
"""
import contextlib
import json
import os
import sqlite3
import time
from typing import Dict, List, Optional

import config
import levels

REQUIRED = ("subjects", "metrics", "readings", "daily", "levels", "level_ranges", "alerts", "meta")
DEMO_DATA_DIR = os.path.join(config.BASE_DIR, "frontend", "lib", "data")


def _create_schema(c):
    c.executescript("""
        CREATE TABLE subjects(
            id TEXT PRIMARY KEY, name TEXT, baseline TEXT,
            environment TEXT DEFAULT 'free_space');
        CREATE TABLE metrics(
            name TEXT PRIMARY KEY, unit TEXT, kind TEXT,
            normal_lo REAL, normal_hi REAL, warn_low REAL, warn_high REAL,
            crit_low REAL, crit_high REAL, extra TEXT, note TEXT);
        CREATE TABLE readings(
            subject_id TEXT, metric TEXT, ts REAL, value REAL, status TEXT, level TEXT,
            PRIMARY KEY(subject_id, metric, ts)) WITHOUT ROWID;
        CREATE TABLE daily(
            subject_id TEXT, ts REAL, day INTEGER,
            sleep_hours REAL, exercise_hours REAL, radiation REAL, cumulative_radiation REAL,
            sleep_status TEXT, exercise_status TEXT, radiation_status TEXT,
            sleep_level TEXT, exercise_level TEXT, radiation_level TEXT,
            PRIMARY KEY(subject_id, ts)) WITHOUT ROWID;
        CREATE TABLE levels(
            code INTEGER PRIMARY KEY, name TEXT, label TEXT, meaning TEXT, action TEXT, color TEXT);
        CREATE TABLE level_ranges(
            metric TEXT, level TEXT, range_text TEXT, PRIMARY KEY(metric, level));
        CREATE TABLE alerts(
            id INTEGER PRIMARY KEY, subject_id TEXT, ts REAL, metric TEXT, value REAL,
            level TEXT, source TEXT, msg TEXT);
        CREATE TABLE meta(key TEXT PRIMARY KEY, value TEXT);
    """)


def _seed_demo(c):
    """Populate a first-run database from the committed, fictional demo snapshot."""
    try:
        with open(os.path.join(DEMO_DATA_DIR, "reference.json"), encoding="utf-8") as f:
            reference = json.load(f)
        with open(os.path.join(DEMO_DATA_DIR, "readings.json"), encoding="utf-8") as f:
            readings = json.load(f)
        with open(os.path.join(DEMO_DATA_DIR, "daily.json"), encoding="utf-8") as f:
            daily = json.load(f)
        with open(os.path.join(DEMO_DATA_DIR, "alerts.json"), encoding="utf-8") as f:
            alerts = json.load(f)
    except (OSError, ValueError) as e:
        raise RuntimeError(
            f"Cannot initialize {config.DB_PATH}: demo data snapshot is unavailable or invalid "
            f"under {DEMO_DATA_DIR}: {e}") from e

    c.executemany(
        "INSERT INTO metrics VALUES(?,?,?,?,?,?,?,?,?,?,?)",
        [(m["name"], m["unit"], m["kind"], m["normal_lo"], m["normal_hi"],
          m["warn_low"], m["warn_high"], m["crit_low"], m["crit_high"], m["extra"], m["note"])
         for m in reference["metrics"]])
    c.executemany(
        "INSERT INTO levels VALUES(?,?,?,?,?,?)",
        [(v["code"], v["name"], v["label"], v["meaning"], v["action"], v["color"])
         for v in reference["levels"]])
    c.executemany(
        "INSERT INTO level_ranges VALUES(?,?,?)",
        [(metric, level, text) for metric, ranges in reference["ranges"].items()
         for level, text in ranges.items()])
    c.executemany(
        "INSERT INTO meta VALUES(?,?)",
        [(key, json.dumps(value)) for key, value in reference["meta"].items()])
    c.executemany(
        "INSERT INTO subjects(id,name,baseline,environment) VALUES(?,?,?,?)",
        [(s["id"], s["name"], json.dumps(s.get("baseline", {})), s["environment"])
         for s in reference["subjects"]])

    for sid, metrics_by_name in readings.items():
        for metric, points in metrics_by_name.items():
            c.executemany(
                "INSERT INTO readings VALUES(?,?,?,?,?,?)",
                [(sid, metric, ts, value, levels.STATUS[level], level)
                 for ts, value, level in points])
    for sid, days in daily.items():
        c.executemany(
            "INSERT INTO daily VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)",
            [(sid, row["ts"], row["day"], row["sleep_hours"], row["exercise_hours"],
              row["radiation"], row["cumulative_radiation"],
              levels.STATUS[row["levels"]["sleep_hours"]],
              levels.STATUS[row["levels"]["exercise_hours"]],
              levels.STATUS[row["levels"]["radiation"]],
              row["levels"]["sleep_hours"], row["levels"]["exercise_hours"],
              row["levels"]["radiation"])
             for row in days])
    c.executemany(
        "INSERT INTO alerts(subject_id,ts,metric,value,level,source,msg) VALUES(?,?,?,?,?,?,?)",
        [(a["subject"], a["ts"], a["metric"], a["value"], a["level"], a["source"], a["msg"])
         for a in alerts])


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
    """Initialize a new demo database or validate an existing one, then add the live subject."""
    with conn() as c:
        have = {r[0] for r in c.execute("SELECT name FROM sqlite_master WHERE type='table'")}
        if not have:
            _create_schema(c)
            _seed_demo(c)
            have = {r[0] for r in c.execute("SELECT name FROM sqlite_master WHERE type='table'")}
        missing = [t for t in REQUIRED if t not in have]
        if missing:
            raise RuntimeError(
                f"{config.DB_PATH} is missing tables {missing}. "
                "Use a valid health database or remove the incomplete file to initialize the demo database.")
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


def add_subject(sid: str, name: str, environment: str = "free_space") -> bool:
    """Create a person to monitor. Returns False if the id already exists."""
    with conn() as c:
        cur = c.execute("INSERT OR IGNORE INTO subjects(id,name,baseline,environment) VALUES(?,?,?,?)",
                        (sid, name, "{}", environment))
        return cur.rowcount == 1


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
