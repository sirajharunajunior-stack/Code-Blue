"""Learn each person's normal baseline (mean and spread per metric, per hour of day).

    python train.py                 # trains on health.db -> model.json
    python train.py --db sim.db --out model.json

"Training" here is simple statistics, so it runs fine on a Raspberry Pi, with no extra
packages. Readings that were already flagged (needs check-up / critical) are left out,
and remaining outliers are trimmed, so past illness or sensor glitches don't widen "normal".
Retrain weekly (e.g. a systemd timer or cron job).
"""
import argparse
import json
import math
import os
import sqlite3
import statistics
import time
from collections import defaultdict

MIN_PER_HOUR = 5      # fewer samples than this -> fall back to the all-day statistics
TRIM_SD = 3.0
MIN_STD_FRACTION = 0.02  # std floor = 2% of the normal-range width, avoids divide-by-near-zero


def _stats(values, floor):
    if len(values) >= 8:                      # trim outliers once
        mu, sd = statistics.fmean(values), statistics.pstdev(values)
        if sd:
            values = [v for v in values if abs(v - mu) <= TRIM_SD * sd] or values
    mu = statistics.fmean(values)
    sd = statistics.pstdev(values) if len(values) > 1 else 0.0
    return {"mean": round(mu, 4), "std": round(max(sd, floor), 4), "n": len(values)}


def train(db_path: str, out_path: str) -> dict:
    if not os.path.exists(db_path):
        raise FileNotFoundError(f"database not found: {db_path}")
    c = sqlite3.connect(db_path)
    c.row_factory = sqlite3.Row
    try:
        metrics = {r["name"]: r for r in c.execute("SELECT * FROM metrics WHERE kind='vital'")}
        model = {"trained_at": time.time(), "subjects": {}}
        rows = c.execute("SELECT subject_id,metric,ts,value FROM readings WHERE level IN ('normal','slightly_abnormal')")
        data = defaultdict(lambda: defaultdict(list))
        for r in rows:
            if r["metric"] in metrics:
                data[(r["subject_id"], r["metric"])][time.gmtime(r["ts"]).tm_hour].append(r["value"])
    finally:
        c.close()
    for (sid, metric), by_hour in data.items():
        m = metrics[metric]
        lo, hi = m["normal_lo"], m["normal_hi"]
        width = (hi - lo) if lo is not None and hi is not None else 1.0
        floor = max(width * MIN_STD_FRACTION, 1e-6)
        allv = [v for vs in by_hour.values() for v in vs]
        entry = {"all": _stats(allv, floor), "hours": {}}
        for h, vs in by_hour.items():
            if len(vs) >= MIN_PER_HOUR:
                entry["hours"][str(h)] = _stats(vs, floor)
        model["subjects"].setdefault(sid, {})[metric] = entry
    out_dir = os.path.dirname(os.path.abspath(out_path))
    os.makedirs(out_dir, exist_ok=True)
    tmp = out_path + ".tmp"
    with open(tmp, "w") as f:
        json.dump(model, f, indent=1)
    os.replace(tmp, out_path)
    return model


if __name__ == "__main__":
    import config
    ap = argparse.ArgumentParser()
    ap.add_argument("--db", default=config.DB_PATH)
    ap.add_argument("--out", default=config.MODEL_PATH)
    a = ap.parse_args()
    mdl = train(a.db, a.out)
    for sid, ms in mdl["subjects"].items():
        print(f"{sid}: " + ", ".join(f"{k} {v['all']['mean']:.2f}±{v['all']['std']:.2f}" for k, v in sorted(ms.items())))
    print("saved", a.out)
