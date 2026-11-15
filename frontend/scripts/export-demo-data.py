"""Export a compact, frontend-friendly snapshot of the health.db dataset.

The ASTRA frontend ships with demonstration data so it runs without the
FastAPI backend. This script is the *only* place that reads health.db, and it
writes plain JSON into lib/data/ — replacing this JSON (or pointing the data
repositories at the API) is all that is needed to go live.

Usage (from frontend/):  python scripts/export-demo-data.py
"""
import json
import os
import sqlite3
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "lib", "data")
DB = os.environ.get("HM_DB", os.path.join(HERE, "..", "..", "health.db"))
BUCKET = 3600  # one point per hour keeps charts smooth and the payload small


def open_db():
    """Snapshot the database with SQLite's backup API.

    A plain file copy can miss transactions still sitting in the WAL file while
    the backend is running. ``backup`` reads a consistent view without taking
    the writer lock.
    """
    if not os.path.exists(DB):
        raise SystemExit(f"database not found: {DB}\nSet HM_DB to point at health.db")
    fd, tmp = tempfile.mkstemp(prefix="astra_export_", suffix=".db")
    os.close(fd)
    try:
        source = sqlite3.connect(DB, timeout=15)
        target = sqlite3.connect(tmp)
        try:
            source.backup(target)
        finally:
            source.close()
        target.row_factory = sqlite3.Row
        return target, tmp
    except Exception:
        os.unlink(tmp)
        raise


def downsample(rows):
    """Keep the last reading of every hour so trends stay faithful."""
    out, bucket, last = [], None, None
    for r in rows:
        b = int(r["ts"] // BUCKET)
        if b != bucket and last is not None:
            out.append(last)
        bucket, last = b, r
    if last is not None:
        out.append(last)
    return out


def export(c):
    metrics = [dict(r) for r in c.execute("SELECT * FROM metrics ORDER BY kind, name")]
    subjects = [dict(r) for r in c.execute("SELECT * FROM subjects ORDER BY id")]
    levels = [dict(r) for r in c.execute("SELECT * FROM levels ORDER BY code")]
    ranges = {}
    for r in c.execute("SELECT * FROM level_ranges"):
        ranges.setdefault(r["metric"], {})[r["level"]] = r["range_text"]
    meta = {r["key"]: json.loads(r["value"]) for r in c.execute("SELECT * FROM meta")}

    readings, daily, alerts = {}, {}, []
    for s in subjects:
        sid = s["id"]
        # `local` is the Pi's live sensor stream, not part of the astronaut demo
        # snapshot. Keeping it out also prevents its wall-clock timestamps from
        # becoming the frontend's demonstration "now".
        if sid == "local":
            continue
        per_metric = {}
        for m in metrics:
            if m["kind"] != "vital":
                continue
            rows = list(c.execute(
                "SELECT ts, value, level FROM readings WHERE subject_id=? AND metric=? ORDER BY ts",
                (sid, m["name"])))
            if not rows:
                continue
            kept = downsample(rows)
            per_metric[m["name"]] = [[int(r["ts"]), round(r["value"], 3), r["level"]] for r in kept]
        if per_metric:
            readings[sid] = per_metric

        rows = list(c.execute("SELECT * FROM daily WHERE subject_id=? ORDER BY ts", (sid,)))
        if rows:
            daily[sid] = [{
                "day": r["day"],
                "ts": int(r["ts"]),
                "sleep_hours": r["sleep_hours"],
                "exercise_hours": r["exercise_hours"],
                "radiation": None if r["radiation"] is None else round(r["radiation"], 3),
                "cumulative_radiation": None if r["cumulative_radiation"] is None else round(r["cumulative_radiation"], 3),
                "levels": {
                    "sleep_hours": r["sleep_level"],
                    "exercise_hours": r["exercise_level"],
                    "radiation": r["radiation_level"],
                },
            } for r in rows]

    for r in c.execute("SELECT * FROM alerts ORDER BY ts DESC LIMIT 200"):
        alerts.append({
            "id": r["id"],
            "subject": r["subject_id"],
            "ts": int(r["ts"]),
            "metric": r["metric"],
            "value": r["value"],
            "level": r["level"],
            "source": r["source"],
            "msg": r["msg"],
        })

    payload = {
        "_note": "Demonstration snapshot exported from health.db. Not real astronaut data.",
        "exported_from": "health.db",
        "metrics": metrics,
        "levels": levels,
        "ranges": ranges,
        "meta": meta,
        "subjects": [{k: s[k] for k in ("id", "name", "environment")}
                     for s in subjects if s["id"] != "local"],
    }

    def dump(name, obj):
        path = os.path.join(OUT, name)
        with open(path, "w", encoding="utf-8") as f:
            json.dump(obj, f, separators=(",", ":"))
        print("%-18s %7.1f KB" % (name, os.path.getsize(path) / 1024))

    dump("readings.json", readings)
    dump("daily.json", daily)
    dump("alerts.json", alerts)
    dump("reference.json", payload)


def main():
    os.makedirs(OUT, exist_ok=True)
    c, tmp = open_db()
    try:
        export(c)
    finally:
        c.close()
        try:
            os.unlink(tmp)
        except OSError:
            pass


if __name__ == "__main__":
    main()
