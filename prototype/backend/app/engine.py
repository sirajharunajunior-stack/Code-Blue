from __future__ import annotations

import statistics
from collections import deque
from dataclasses import dataclass, field
from typing import Any

from .config import Thresholds
from .models import VITALS

DEFAULT_BASELINES: dict[str, tuple[float, float]] = {
    "heart_rate": (68.0, 8.0),
    "spo2": (97.5, 1.2),
    "temperature_c": (36.7, 0.3),
    "respiratory_rate": (15.0, 2.0),
}

STD_FLOORS: dict[str, float] = {
    "heart_rate": 4.0,
    "spo2": 0.8,
    "temperature_c": 0.18,
    "respiratory_rate": 1.2,
}

SENSOR_BOUNDS: dict[str, tuple[float, float]] = {
    "heart_rate": (20.0, 250.0),
    "spo2": (50.0, 100.0),
    "temperature_c": (30.0, 43.0),
    "respiratory_rate": (4.0, 60.0),
}

HISTORY_FILTERS: dict[str, tuple[float, float]] = {
    "heart_rate": (45.0, 110.0),
    "spo2": (90.0, 100.0),
    "temperature_c": (35.0, 38.5),
    "respiratory_rate": (8.0, 25.0),
}

ACTIVITY_OFFSETS: dict[str, dict[str, float]] = {
    "heart_rate": {
        "rest": 0.0,
        "light": 10.0,
        "moderate": 28.0,
        "active": 42.0,
    },
    "respiratory_rate": {
        "rest": 0.0,
        "light": 2.0,
        "moderate": 4.0,
        "active": 6.0,
    },
}


@dataclass
class Assessment:
    vital: str
    label: str
    unit: str
    value: float | None
    status: str
    condition: str | None = None
    title: str = ""
    threshold: str = ""
    expected: str = ""
    severity: str | None = None

    def as_dict(self) -> dict[str, Any]:
        return {
            "vital": self.vital,
            "label": self.label,
            "unit": self.unit,
            "value": self.value,
            "status": self.status,
            "condition": self.condition,
            "title": self.title,
            "threshold": self.threshold,
            "expected": self.expected,
            "severity": self.severity,
        }


@dataclass
class Baseline:
    vital: str
    mean: float
    std: float
    samples: int
    ready: bool

    def as_dict(self) -> dict[str, Any]:
        return {
            "mean": round(self.mean, 1),
            "std": round(self.std, 1),
            "samples": self.samples,
            "ready": self.ready,
        }


@dataclass
class HealthEngine:
    thresholds: Thresholds = field(default_factory=Thresholds)
    _windows: dict[str, deque[float]] = field(init=False)

    def __post_init__(self) -> None:
        self._windows = {
            vital: deque(maxlen=self.thresholds.baseline_window)
            for vital in VITALS
        }

    def load_history(self, readings: list[dict[str, Any]]) -> None:
        for reading in readings:
            if reading.get("quality") != "valid":
                continue
            for vital in VITALS:
                value = reading.get(vital)
                if value is None:
                    continue
                if vital == "heart_rate" and reading.get("activity") != "rest":
                    continue
                low, high = HISTORY_FILTERS[vital]
                if low <= float(value) <= high:
                    self._windows[vital].append(float(value))

    def _stats(self, vital: str) -> tuple[float, float]:
        window = self._windows[vital]
        if len(window) < self.thresholds.baseline_min_samples:
            return DEFAULT_BASELINES[vital]
        mean = statistics.fmean(window)
        std = statistics.pstdev(window) if len(window) > 1 else 0.0
        return mean, max(std, STD_FLOORS[vital])

    def baseline(self, vital: str) -> Baseline:
        mean, std = self._stats(vital)
        samples = len(self._windows[vital])
        return Baseline(
            vital=vital,
            mean=mean,
            std=std,
            samples=samples,
            ready=samples >= self.thresholds.baseline_ready_samples,
        )

    def baselines(self) -> dict[str, dict[str, Any]]:
        return {vital: self.baseline(vital).as_dict() for vital in VITALS}

    def expected_value(self, vital: str, activity: str) -> float:
        expected = self.baseline(vital).mean
        return expected + ACTIVITY_OFFSETS.get(vital, {}).get(activity, 0.0)

    def expected_text(self, vital: str, activity: str, unit: str) -> str:
        if vital not in ACTIVITY_OFFSETS:
            if vital == "spo2":
                return "Expected 95–100%"
            return f"Typical {DEFAULT_BASELINES[vital][0]:g} {unit}"
        expected = self.expected_value(vital, activity)
        return f"Expected about {expected:.0f} {unit} ({activity})"

    def update_baselines(
        self,
        reading: dict[str, Any],
        assessments: list[Assessment],
    ) -> set[str]:
        if reading.get("quality") != "valid":
            return set()
        normal_vitals = {
            assessment.vital
            for assessment in assessments
            if assessment.status == "normal"
        }
        updated: set[str] = set()
        for vital in normal_vitals:
            if vital == "heart_rate" and reading.get("activity") != "rest":
                continue
            value = reading.get(vital)
            if value is None:
                continue
            low, high = HISTORY_FILTERS[vital]
            if not low <= float(value) <= high:
                continue
            self._windows[vital].append(float(value))
            updated.add(vital)
        return updated

    def assess(self, reading: dict[str, Any]) -> list[Assessment]:
        assessments: list[Assessment] = []
        activity = reading.get("activity", "rest")
        sensor_fault = reading.get("quality") == "sensor_error"

        for vital, meta in VITALS.items():
            value = reading.get(vital)
            label = meta["label"]
            unit = meta["unit"]
            if sensor_fault or value is None:
                assessments.append(
                    self._sensor_error(
                        vital,
                        label,
                        unit,
                        None if value is None else float(value),
                        "Sensor reading unavailable",
                    )
                )
                continue

            numeric = float(value)
            low_bound, high_bound = SENSOR_BOUNDS[vital]
            if not low_bound <= numeric <= high_bound:
                assessments.append(
                    self._sensor_error(
                        vital,
                        label,
                        unit,
                        numeric,
                        f"Value outside sensor range {low_bound:g}–{high_bound:g} {unit}",
                    )
                )
                continue

            expected = self.expected_text(vital, activity, unit)
            if vital == "heart_rate":
                assessment = self._assess_heart_rate(
                    numeric, activity, label, unit, expected
                )
            elif vital == "spo2":
                assessment = self._assess_spo2(numeric, label, unit, expected)
            elif vital == "temperature_c":
                assessment = self._assess_temperature(numeric, label, unit, expected)
            else:
                assessment = self._assess_respiratory(
                    numeric, activity, label, unit, expected
                )
            assessments.append(assessment)

        return assessments

    def _assess_heart_rate(
        self,
        value: float,
        activity: str,
        label: str,
        unit: str,
        expected: str,
    ) -> Assessment:
        baseline = self.baseline("heart_rate")
        expected_value = self.expected_value("heart_rate", activity)
        warning_high = max(
            self.thresholds.heart_rate_warning_high,
            expected_value + max(24.0, 2.5 * baseline.std),
        )
        if baseline.ready and activity == "rest":
            personal_warning = expected_value + max(30.0, 4.0 * baseline.std)
            warning_high = min(warning_high, personal_warning)
        critical_high = max(
            self.thresholds.heart_rate_critical_high,
            expected_value + max(45.0, 4.0 * baseline.std),
        )
        if value >= critical_high:
            return self._abnormal(
                "heart_rate", value, label, unit, "critical", "heart_rate_high",
                "Heart rate critically high", f"> {critical_high:.0f} {unit}", expected,
            )
        if value >= warning_high:
            return self._abnormal(
                "heart_rate", value, label, unit, "warning", "heart_rate_high",
                "Heart rate elevated", f"> {warning_high:.0f} {unit}", expected,
            )
        if value <= self.thresholds.heart_rate_critical_low:
            return self._abnormal(
                "heart_rate", value, label, unit, "critical", "heart_rate_low",
                "Heart rate critically low",
                f"< {self.thresholds.heart_rate_critical_low:.0f} {unit}",
                expected,
            )
        if value <= self.thresholds.heart_rate_warning_low:
            return self._abnormal(
                "heart_rate", value, label, unit, "warning", "heart_rate_low",
                "Heart rate low",
                f"< {self.thresholds.heart_rate_warning_low:.0f} {unit}",
                expected,
            )
        return self._normal("heart_rate", value, label, unit, expected)

    def _assess_spo2(
        self, value: float, label: str, unit: str, expected: str
    ) -> Assessment:
        baseline = self.baseline("spo2")
        warning_low = self.thresholds.spo2_warning_low
        if baseline.ready:
            warning_low = max(
                warning_low, baseline.mean - max(3.0, 3.0 * baseline.std)
            )
        if value <= self.thresholds.spo2_critical_low:
            return self._abnormal(
                "spo2", value, label, unit, "critical", "spo2_low",
                "Blood oxygen critically low",
                f"< {self.thresholds.spo2_critical_low:.0f}{unit}", expected,
            )
        if value <= warning_low:
            return self._abnormal(
                "spo2", value, label, unit, "warning", "spo2_low",
                "Blood oxygen below range",
                f"< {warning_low:.0f}{unit}", expected,
            )
        return self._normal("spo2", value, label, unit, expected)

    def _assess_temperature(
        self, value: float, label: str, unit: str, expected: str
    ) -> Assessment:
        baseline = self.baseline("temperature_c")
        warning_high = self.thresholds.temperature_warning_high
        warning_low = self.thresholds.temperature_warning_low
        if baseline.ready:
            personal_delta = max(0.6, 3.0 * baseline.std)
            warning_high = min(warning_high, baseline.mean + personal_delta)
            warning_low = max(warning_low, baseline.mean - personal_delta)
        if value >= self.thresholds.temperature_critical_high:
            return self._abnormal(
                "temperature_c", value, label, unit, "critical",
                "temperature_high", "Body temperature critically high",
                f"> {self.thresholds.temperature_critical_high:.1f}{unit}", expected,
            )
        if value >= warning_high:
            return self._abnormal(
                "temperature_c", value, label, unit, "warning",
                "temperature_high", "Body temperature elevated",
                f"> {warning_high:.1f}{unit}", expected,
            )
        if value <= self.thresholds.temperature_critical_low:
            return self._abnormal(
                "temperature_c", value, label, unit, "critical",
                "temperature_low", "Body temperature critically low",
                f"< {self.thresholds.temperature_critical_low:.1f}{unit}", expected,
            )
        if value <= warning_low:
            return self._abnormal(
                "temperature_c", value, label, unit, "warning",
                "temperature_low", "Body temperature below range",
                f"< {warning_low:.1f}{unit}", expected,
            )
        return self._normal("temperature_c", value, label, unit, expected)

    def _assess_respiratory(
        self,
        value: float,
        activity: str,
        label: str,
        unit: str,
        expected: str,
    ) -> Assessment:
        baseline = self.baseline("respiratory_rate")
        expected_value = self.expected_value("respiratory_rate", activity)
        warning_high = max(
            self.thresholds.respiratory_warning_high, expected_value + 7.0
        )
        if baseline.ready and activity == "rest":
            warning_high = min(
                warning_high, expected_value + max(7.0, 3.0 * baseline.std)
            )
        critical_high = max(
            self.thresholds.respiratory_critical_high, expected_value + 12.0
        )
        if value >= critical_high:
            return self._abnormal(
                "respiratory_rate", value, label, unit, "critical",
                "respiratory_rate_high", "Breathing rate critically high",
                f"> {critical_high:.0f} {unit}", expected,
            )
        if value >= warning_high:
            return self._abnormal(
                "respiratory_rate", value, label, unit, "warning",
                "respiratory_rate_high", "Breathing rate elevated",
                f"> {warning_high:.0f} {unit}", expected,
            )
        if value <= self.thresholds.respiratory_critical_low:
            return self._abnormal(
                "respiratory_rate", value, label, unit, "critical",
                "respiratory_rate_low", "Breathing rate critically low",
                f"< {self.thresholds.respiratory_critical_low:.0f} {unit}",
                expected,
            )
        if value <= self.thresholds.respiratory_warning_low:
            return self._abnormal(
                "respiratory_rate", value, label, unit, "warning",
                "respiratory_rate_low", "Breathing rate low",
                f"< {self.thresholds.respiratory_warning_low:.0f} {unit}",
                expected,
            )
        return self._normal("respiratory_rate", value, label, unit, expected)

    def _normal(
        self, vital: str, value: float, label: str, unit: str, expected: str
    ) -> Assessment:
        return Assessment(
            vital=vital,
            label=label,
            unit=unit,
            value=round(value, 1),
            status="normal",
            expected=expected,
        )

    def _abnormal(
        self,
        vital: str,
        value: float,
        label: str,
        unit: str,
        severity: str,
        condition: str,
        title: str,
        threshold: str,
        expected: str,
    ) -> Assessment:
        return Assessment(
            vital=vital,
            label=label,
            unit=unit,
            value=round(value, 1),
            status=severity,
            condition=condition,
            title=title,
            threshold=threshold,
            expected=expected,
            severity=severity,
        )

    def _sensor_error(
        self,
        vital: str,
        label: str,
        unit: str,
        value: float | None,
        detail: str,
    ) -> Assessment:
        return Assessment(
            vital=vital,
            label=label,
            unit=unit,
            value=value,
            status="sensor_error",
            condition=f"{vital}_sensor",
            title=f"{label} signal unreliable",
            threshold=detail,
            expected="Check sensor contact and placement.",
            severity="warning",
        )
