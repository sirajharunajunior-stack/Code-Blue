from __future__ import annotations

import random
from typing import Any

from .models import Reading, Scenario
from .utils import utc_now

SCENARIO_LABELS: dict[str, str] = {
    "normal": "Normal activity",
    "elevated_heart_rate": "Elevated heart rate",
    "low_spo2": "Low blood oxygen",
    "high_temperature": "High temperature",
    "abnormal_respiration": "Abnormal breathing rate",
    "recovery": "Simulated recovery",
}


class Simulator:
    """Generates wearable-like demo readings. All data is simulated."""

    def __init__(self, seed: int | None = None) -> None:
        self._random = random.Random(seed)
        self.scenario: str = "normal"
        self.connected = True
        self.activity = "rest"
        self._step = 0
        self._recovery_from: dict[str, float] | None = None
        self._recovery_step = 0
        self._recovery_steps = 12
        self._last_values = self._normal_values("rest", 68.0, 97.5, 36.7, 15.0)

    def set_scenario(self, scenario: Scenario) -> None:
        if scenario == "recovery":
            self._recovery_from = dict(self._last_values)
            self._recovery_step = 0
        self.scenario = scenario
        self.connected = True
        self._step = 0

    def disconnect(self) -> None:
        self.connected = False

    def reconnect(self) -> None:
        self.connected = True

    def status(self) -> dict[str, Any]:
        return {
            "connected": self.connected,
            "scenario": self.scenario,
            "scenario_label": SCENARIO_LABELS.get(self.scenario, self.scenario),
            "activity": self.activity,
        }

    def next_reading(self) -> Reading | None:
        if not self.connected:
            return None

        self._step += 1
        activity = self._activity_for_tick()
        values = self._values_for_scenario(activity)
        self._last_values = values
        self.activity = activity
        return Reading(
            recorded_at=utc_now(),
            heart_rate=round(values["heart_rate"]),
            spo2=round(values["spo2"]),
            temperature_c=round(values["temperature_c"], 1),
            respiratory_rate=round(values["respiratory_rate"]),
            activity=activity,  # type: ignore[arg-type]
            quality="valid",
        )

    def _activity_for_tick(self) -> str:
        if self.scenario != "normal":
            return "rest"
        return "light" if (self._step // 4) % 2 else "rest"

    def _normal_values(
        self,
        activity: str,
        heart_rate: float,
        spo2: float,
        temperature: float,
        respiratory_rate: float,
    ) -> dict[str, float]:
        offset_hr = {"rest": 0.0, "light": 14.0}.get(activity, 0.0)
        offset_rr = {"rest": 0.0, "light": 3.0}.get(activity, 0.0)
        return {
            "heart_rate": heart_rate + offset_hr + self._random.gauss(0, 3.5),
            "spo2": spo2 + self._random.gauss(0, 0.8),
            "temperature_c": temperature + self._random.gauss(0, 0.12),
            "respiratory_rate": (
                respiratory_rate + offset_rr + self._random.gauss(0, 1.0)
            ),
        }

    def _values_for_scenario(self, activity: str) -> dict[str, float]:
        if self.scenario == "recovery":
            return self._recovery_values(activity)
        if self.scenario == "elevated_heart_rate":
            return {
                "heart_rate": 127.0 + self._random.gauss(0, 3.5),
                "spo2": 96.8 + self._random.gauss(0, 0.7),
                "temperature_c": 36.8 + self._random.gauss(0, 0.1),
                "respiratory_rate": 18.0 + self._random.gauss(0, 1.0),
            }
        if self.scenario == "low_spo2":
            return {
                "heart_rate": 88.0 + self._random.gauss(0, 4.0),
                "spo2": 87.0 + self._random.gauss(0, 1.2),
                "temperature_c": 36.7 + self._random.gauss(0, 0.1),
                "respiratory_rate": 20.0 + self._random.gauss(0, 1.5),
            }
        if self.scenario == "high_temperature":
            return {
                "heart_rate": 92.0 + self._random.gauss(0, 4.0),
                "spo2": 96.5 + self._random.gauss(0, 0.8),
                "temperature_c": 38.7 + self._random.gauss(0, 0.12),
                "respiratory_rate": 19.0 + self._random.gauss(0, 1.2),
            }
        if self.scenario == "abnormal_respiration":
            return {
                "heart_rate": 94.0 + self._random.gauss(0, 4.0),
                "spo2": 95.0 + self._random.gauss(0, 1.0),
                "temperature_c": 36.8 + self._random.gauss(0, 0.1),
                "respiratory_rate": 29.5 + self._random.gauss(0, 1.2),
            }
        return self._normal_values(activity, 68.0, 97.5, 36.7, 15.0)

    def _recovery_values(self, activity: str) -> dict[str, float]:
        target = self._normal_values(activity, 68.0, 97.5, 36.7, 15.0)
        if self._recovery_from is None:
            self._recovery_from = dict(target)
        self._recovery_step += 1
        progress = min(1.0, self._recovery_step / self._recovery_steps)
        values = {
            vital: self._recovery_from[vital]
            + (target[vital] - self._recovery_from[vital]) * progress
            for vital in target
        }
        if progress >= 1.0:
            self.scenario = "normal"
            self._recovery_from = None
        return values
