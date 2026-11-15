"""Background loop: read each sensor, store the readings, run the alert engine.

A failing sensor is recorded in its status but never stops the others.
Old live readings are pruned about once an hour (astronaut data is never pruned).
"""
import logging
import threading
import time
from typing import Dict

import config
import db
from alerts import AlertEngine
from sensors import build_sensors

log = logging.getLogger("sampler")


class Sampler:
    def __init__(self, engine: AlertEngine = None):
        self.engine = engine or AlertEngine()
        self.sensors, startup_errors = build_sensors()
        self.status: Dict[str, dict] = {
            s.name: {"ok": None, "simulated": s.simulated, "last_ts": None, "error": None,
                     "metrics": list(s.metrics)} for s in self.sensors}
        for name, err in startup_errors.items():
            self.status[name] = {"ok": False, "simulated": False, "last_ts": None, "error": err, "metrics": []}
        self._stop = threading.Event()
        self._thread = None
        self._last_prune = 0.0
        self._last_sample_ts = None

    def sample_age(self):
        """Seconds since the last completed sampling pass, or None before the first."""
        return None if self._last_sample_ts is None else time.time() - self._last_sample_ts

    def sample_once(self):
        ts = time.time()
        for s in self.sensors:
            st = self.status[s.name]
            try:
                values = s.read()
                for metric, value in values.items():
                    level = db.add_reading(config.LOCAL_SUBJECT, metric, value, ts)
                    self.engine.check(config.LOCAL_SUBJECT, metric, value, level, ts)
                st.update(ok=True, last_ts=ts, error=None)
            except Exception as e:  # noqa: BLE001
                log.exception("sensor %s failed", s.name)
                st.update(ok=False, error=f"{type(e).__name__}: {e}")
        self._last_sample_ts = ts
        if ts - self._last_prune > 3600:
            try:
                db.prune_live()
                self._last_prune = ts
            except Exception:  # noqa: BLE001  retention must never stop sampling
                log.exception("could not prune live readings")

    def _run(self):
        while not self._stop.is_set():
            # start() takes the first sample synchronously, so wait one interval
            # instead of immediately recording the same values twice.
            self._stop.wait(config.SAMPLE_SECONDS)
            if self._stop.is_set():
                break
            try:
                self.sample_once()
            except Exception:  # noqa: BLE001
                log.exception("sample loop error")

    def start(self):
        if self._thread and self._thread.is_alive():
            return
        self._stop.clear()
        self.sample_once()                   # health has data immediately after startup
        self._thread = threading.Thread(target=self._run, name="sampler", daemon=True)
        self._thread.start()

    def stop(self):
        self._stop.set()
        if self._thread:
            self._thread.join(timeout=5)
            self._thread = None
