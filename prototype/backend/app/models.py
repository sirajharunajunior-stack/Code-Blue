from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

VitalKey = Literal["heart_rate", "spo2", "temperature_c", "respiratory_rate"]
Activity = Literal["rest", "light", "moderate", "active"]
Scenario = Literal[
    "normal",
    "elevated_heart_rate",
    "low_spo2",
    "high_temperature",
    "abnormal_respiration",
    "recovery",
]

VITALS: dict[str, dict[str, str]] = {
    "heart_rate": {"label": "Heart rate", "unit": "bpm"},
    "spo2": {"label": "Blood oxygen", "unit": "%"},
    "temperature_c": {"label": "Body temperature", "unit": "°C"},
    "respiratory_rate": {"label": "Respiratory rate", "unit": "breaths/min"},
}


class Reading(BaseModel):
    recorded_at: datetime
    heart_rate: float | None = None
    spo2: float | None = None
    temperature_c: float | None = None
    respiratory_rate: float | None = None
    activity: Activity = "rest"
    quality: Literal["valid", "sensor_error"] = "valid"
    error: str | None = None


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=2000)


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=1000)
    history: list[ChatMessage] = Field(default_factory=list, max_length=20)


class ScenarioRequest(BaseModel):
    scenario: Scenario
