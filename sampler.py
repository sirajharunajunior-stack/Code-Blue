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
        self.last_sample_ts = None

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
        self.last_sample_ts = time.time()
        if ts - self._last_prune > 3600:
            db.prune_live()
            self._last_prune = ts

    def _run(self):
        while not self._stop.is_set():
            try:
                self.sample_once()
            except Exception:  # noqa: BLE001
                log.exception("sample loop error")
            self._stop.wait(config.SAMPLE_SECONDS)

    def start(self):
        self._thread = threading.Thread(target=self._run, name="sampler", daemon=True)
        self._thread.start()

    def stop(self):
        self._stop.set()
        if self._thread:
            self._thread.join(timeout=5)
