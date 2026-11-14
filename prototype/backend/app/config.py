from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path


def _env_bool(name: str, default: bool) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def _env_float(name: str, default: float) -> float:
    value = os.getenv(name)
    if value is None:
        return default
    try:
        return float(value)
    except ValueError:
        return default


BACKEND_DIR = Path(__file__).resolve().parent.parent


@dataclass(frozen=True)
class Thresholds:
    heart_rate_warning_high: float = 105.0
    heart_rate_critical_high: float = 145.0
    heart_rate_warning_low: float = 50.0
    heart_rate_critical_low: float = 40.0
    spo2_warning_low: float = 94.0
    spo2_critical_low: float = 90.0
    temperature_warning_high: float = 38.0
    temperature_critical_high: float = 39.5
    temperature_warning_low: float = 35.5
    temperature_critical_low: float = 34.5
    respiratory_warning_high: float = 24.0
    respiratory_critical_high: float = 30.0
    respiratory_warning_low: float = 10.0
    respiratory_critical_low: float = 7.0
    baseline_window: int = 120
    baseline_min_samples: int = 8
    baseline_ready_samples: int = 12
    normal_readings_to_resolve: int = 2


@dataclass(frozen=True)
class Settings:
    db_path: Path = field(
        default_factory=lambda: Path(
            os.getenv("MONITOR_DB", str(BACKEND_DIR / "monitor.db"))
        )
    )
    tick_seconds: float = field(
        default_factory=lambda: max(0.25, _env_float("MONITOR_TICK_SECONDS", 2.0))
    )
    auto_start: bool = field(
        default_factory=lambda: _env_bool("MONITOR_AUTOSTART", True)
    )
    ai_api_key: str = field(
        default_factory=lambda: os.getenv("AI_API_KEY", "")
        or os.getenv("OPENAI_API_KEY", "")
    )
    ai_base_url: str = field(
        default_factory=lambda: (
            os.getenv("AI_BASE_URL", "https://api.openai.com/v1").rstrip("/")
        )
    )
    ai_model: str = field(
        default_factory=lambda: os.getenv("AI_MODEL", "gpt-4o-mini")
    )
    ai_timeout_seconds: float = field(
        default_factory=lambda: max(2.0, _env_float("AI_TIMEOUT_SECONDS", 15.0))
    )
    cors_origins: tuple[str, ...] = field(
        default_factory=lambda: tuple(
            origin.strip()
            for origin in os.getenv(
                "CORS_ORIGINS",
                "http://localhost:5173,http://127.0.0.1:5173",
            ).split(",")
            if origin.strip()
        )
    )
    thresholds: Thresholds = field(default_factory=Thresholds)

    @property
    def ai_enabled(self) -> bool:
        return bool(self.ai_api_key.strip())
