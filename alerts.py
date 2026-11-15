"""Alert engine.

Rules (applied to every new live reading):
  * critical       -> alert immediately
  * needs_checkup  -> alert after N readings in a row (default 3)
  * baseline drift -> alert when a value is >= Z standard deviations from that person's
                      own normal for this hour of the day, N readings in a row.
                      Only active when model.json exists (see train.py).
A cooldown stops the same alert repeating. Notifiers are pluggable.
"""
import json
import logging
import os
import time
from typing import Callable, Dict, List, Optional, Tuple

import config
import db
import levels

log = logging.getLogger("alerts")
Notifier = Callable[[dict], None]


def log_notifier(alert: dict):
    log.warning("ALERT [%s] %s", alert["level"], alert["msg"])


def buzzer_notifier(alert: dict):  # stub: wire a GPIO buzzer/LED here (e.g. gpiozero)
    pass


class Baseline:
    """Per-person, per-metric, per-hour mean/std loaded from model.json."""

    def __init__(self, path: str):
        self.path = path
        self.data: dict = {}
        self._mtime = 0.0
        self.reload()

    def reload(self):
        try:
            mt = os.path.getmtime(self.path)
        except OSError:
            self.data, self._mtime = {}, 0.0
            return
        if mt == self._mtime:
            return
        try:
            with open(self.path) as f:
                payload = json.load(f)
            subjects = payload.get("subjects", {}) if isinstance(payload, dict) else {}
            self.data = subjects if isinstance(subjects, dict) else {}
        except (OSError, TypeError, ValueError):
            # A partially written or malformed model must not stop live sampling.
            log.exception("could not load baseline model %s", self.path)
            self.data = {}
        # Record the mtime even on failure so we do not re-parse a bad file every reading.
        self._mtime = mt

    @property
    def loaded(self) -> bool:
        return bool(self.data)

    def zscore(self, sid: str, metric: str, ts: float, value: float) -> Optional[float]:
        self.reload()
        hour = str(time.gmtime(ts).tm_hour)
        entry = self.data.get(sid, {}).get(metric)
        if not isinstance(entry, dict):
            return None
        hours = entry.get("hours") or {}
        st = hours.get(hour) if isinstance(hours, dict) else None
        if not isinstance(st, dict):
            st = entry.get("all")
        if not isinstance(st, dict):
            return None
        mean, std = st.get("mean"), st.get("std")
        if not isinstance(mean, (int, float)) or not isinstance(std, (int, float)) or not std:
            return None
        return (value - mean) / std


class AlertEngine:
    def __init__(self, notifiers: Optional[List[Notifier]] = None, baseline: Optional[Baseline] = None):
        self.notifiers = notifiers if notifiers is not None else [log_notifier, buzzer_notifier]
        self.baseline = baseline or Baseline(config.MODEL_PATH)
        self._streak: Dict[Tuple[str, str, str], int] = {}
        self._last_fired: Dict[Tuple[str, str, str], float] = {}

    def _fire(self, key, sid, metric, value, level, source, msg, ts):
        if ts - self._last_fired.get(key, -1e18) < config.ALERT_COOLDOWN_S:
            return None
        self._last_fired[key] = ts
        alert = dict(subject_id=sid, ts=ts, metric=metric, value=value, level=level, source=source, msg=msg)
        try:
            db.add_alert(sid, ts, metric, value, level, source, msg)
        except Exception:  # a storage failure must not suppress the alert itself
            log.exception("could not store alert")
        for n in self.notifiers:
            try:
                n(alert)
            except Exception:  # a broken notifier must never stop the others
                log.exception("notifier failed")
        return alert

    def _streak_hit(self, key, hit: bool) -> bool:
        if not hit:
            self._streak[key] = 0
            return False
        self._streak[key] = self._streak.get(key, 0) + 1
        return self._streak[key] >= config.ALERT_CONSECUTIVE

    def check(self, sid: str, metric: str, value: float, level: str, ts: Optional[float] = None) -> List[dict]:
        ts = time.time() if ts is None else ts
        try:
            m = db.metric_def(metric)
        except ValueError:
            return []
        unit = m.get("unit") or ""
        name = metric.replace("_", " ")
        label = dict((d["name"], d["label"]) for d in db.level_defs()).get(level, level)
        fired = []

        # 1) threshold rules
        k_crit, k_warn = (sid, metric, "critical"), (sid, metric, "needs_checkup")
        if level == "critical":
            a = self._fire(k_crit, sid, metric, value, "critical", "live",
                           f"{name} {label}: {value} {unit}".strip(), ts)
            fired += [a] if a else []
        if self._streak_hit(k_warn, level == "needs_checkup"):
            a = self._fire(k_warn, sid, metric, value, "needs_checkup", "live",
                           f"{name} {label}: {value} {unit} ({config.ALERT_CONSECUTIVE} readings in a row)", ts)
            fired += [a] if a else []

        # 2) baseline-drift rule
        k_base = (sid, metric, "baseline")
        z = self.baseline.zscore(sid, metric, ts, value)
        if z is not None and self._streak_hit(k_base, abs(z) >= config.BASELINE_Z):
            a = self._fire(k_base, sid, metric, value, "slightly_abnormal", "baseline",
                           f"{name} is {z:+.1f} SD from this person's normal ({value} {unit})".strip(), ts)
            fired += [a] if a else []
        return fired
