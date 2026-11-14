from __future__ import annotations

import json
import re
from typing import Any

import httpx

from .config import Settings

EXPLANATION_KEYS = (
    "detected",
    "readings",
    "meaning",
    "factors",
    "immediate_actions",
    "escalation",
    "follow_up",
)

UNSAFE_MEDICATION_TERMS = (
    "dose",
    "dosage",
    "medication",
    "medicine",
    "milligram",
    "prescrib",
    "ibuprofen",
    "acetaminophen",
    "paracetamol",
    "aspirin",
)
UNSAFE_MEDICATION_PATTERN = re.compile(r"\bmg\b")

VITAL_FACTORS: dict[str, list[str]] = {
    "heart_rate": [
        "Recent activity or exertion",
        "Stress, poor sleep, or fluid changes",
        "Sensor movement or poor contact",
        "Physiological stress that may need medical review",
    ],
    "spo2": [
        "Sensor placement, motion, or cold hands",
        "Breathing pattern or cabin pressure changes",
        "Poor peripheral signal",
        "A physiological concern once sensor quality is confirmed",
    ],
    "temperature_c": [
        "Recent activity or a warm cabin",
        "Normal daily temperature variation",
        "Sensor contact or placement",
        "Possible physiological stress",
    ],
    "respiratory_rate": [
        "Recent activity or exertion",
        "Stress or anxiety",
        "Speech, motion, or sensor artifact",
        "Increased breathing effort",
    ],
    "device": [
        "Wearable battery, fit, or connection",
        "Cabin network interruption",
        "Sensor module or cable issue",
    ],
}

CRITICAL_ACTIONS: dict[str, list[str]] = {
    "heart_rate": [
        "Stop activity and sit down immediately.",
        "Notify the crew medical officer or flight surgeon now.",
        "Follow the crew medical checklist; do not wait for this assistant.",
    ],
    "spo2": [
        "Stop activity and stay seated.",
        "Notify the crew medical officer now.",
        "Follow the crew oxygen and medical checklist while monitoring continues.",
    ],
    "temperature_c": [
        "Move to a cooler area and rest.",
        "Notify the crew medical officer now.",
        "Recheck temperature and follow the crew medical checklist.",
    ],
    "respiratory_rate": [
        "Stop activity and stay with the astronaut.",
        "Notify the crew medical officer now.",
        "Follow the crew medical checklist; do not wait for this assistant.",
    ],
    "device": [
        "Check that the wearable is charged, seated, and connected.",
        "Ask the astronaut to re-seat the device or switch to the backup sensor.",
        "Use manual checks until telemetry returns.",
    ],
}

CONDITION_ACTIONS: dict[str, dict[str, list[str]]] = {
    "heart_rate_low": {
        "critical": [
            "Sit or lie down and avoid exertion.",
            "Notify the crew medical officer now.",
            "Follow the crew medical checklist; do not wait for this assistant.",
        ],
        "warning": [
            "Reduce activity and sit down.",
            "Repeat the heart-rate reading.",
            "Notify crew medical if it persists, worsens, or symptoms appear.",
        ],
    },
    "temperature_low": {
        "critical": [
            "Move to a warm area and reduce heat loss.",
            "Notify the crew medical officer now.",
            "Follow the crew medical checklist; do not wait for this assistant.",
        ],
        "warning": [
            "Move to a warm area and reduce heat loss.",
            "Repeat the temperature reading.",
            "Notify crew medical if it stays low or symptoms appear.",
        ],
    },
    "respiratory_rate_low": {
        "critical": [
            "Stay with the astronaut and avoid exertion.",
            "Notify the crew medical officer now.",
            "Follow the crew medical checklist; monitor breathing continuously.",
        ],
        "warning": [
            "Rest and monitor breathing.",
            "Repeat the breathing-rate reading.",
            "Notify crew medical if it persists, worsens, or symptoms appear.",
        ],
    },
}

CONDITION_FACTORS: dict[str, list[str]] = {
    "heart_rate_low": [
        "Recent rest or reduced activity",
        "Hydration or recovery state",
        "Sensor movement or poor contact",
        "Physiological concern that may need medical review",
    ],
    "temperature_low": [
        "Cold cabin or poor insulation",
        "Low activity or fatigue",
        "Sensor contact or placement",
        "Physiological concern once sensor quality is confirmed",
    ],
    "respiratory_rate_low": [
        "Recent rest",
        "Sensor motion or poor contact",
        "Reduced breathing effort",
        "Physiological concern that may need medical review",
    ],
}

WARNING_ACTIONS: dict[str, list[str]] = {
    "heart_rate": [
        "Reduce activity and rest for five minutes.",
        "Repeat the heart-rate reading.",
        "Notify crew medical if it persists, worsens, or symptoms appear.",
    ],
    "spo2": [
        "Rest and confirm sensor placement.",
        "Repeat the oxygen reading.",
        "Notify crew medical if it stays low, falls further, or symptoms appear.",
    ],
    "temperature_c": [
        "Rest in a cooler area and rehydrate according to crew protocol.",
        "Repeat the temperature reading.",
        "Notify crew medical if it rises or symptoms appear.",
    ],
    "respiratory_rate": [
        "Rest and repeat the breathing-rate reading.",
        "Check for motion or sensor artifact.",
        "Notify crew medical if it persists, worsens, or breathing feels difficult.",
    ],
    "device": [
        "Check that the wearable is charged, seated, and connected.",
        "Re-seat the sensor or switch to the backup device.",
        "Use manual checks until telemetry returns.",
    ],
}


class AIService:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    @property
    def enabled(self) -> bool:
        return self.settings.ai_enabled

    def fallback_explanation(self, context: dict[str, Any]) -> dict[str, Any]:
        vital = context.get("vital", "device")
        severity = context.get("severity", "warning")
        title = context.get("title", "Monitoring alert")
        value = context.get("value")
        unit = context.get("unit") or ""
        threshold = context.get("threshold") or "Not available"
        activity = context.get("activity") or "unknown"
        baseline = context.get("baseline") or {}
        label = context.get("label") or title
        condition = context.get("condition") or ""

        if vital == "device":
            readings = ["Wearable signal: not available"]
            if context.get("last_reading_at"):
                readings.append(f"Last reading: {context['last_reading_at']}")
        else:
            readings = [
                f"{label}: {self._format_value(value)} {unit}".strip(),
                f"Alert threshold: {threshold}",
                f"Activity: {activity}",
            ]
            if baseline.get("mean") is not None:
                readings.append(
                    f"Personal baseline: {baseline['mean']:g} {unit}".strip()
                )

        if severity == "critical":
            immediate = CONDITION_ACTIONS.get(condition, {}).get(
                "critical"
            ) or CRITICAL_ACTIONS.get(vital, WARNING_ACTIONS.get(vital, []))
            escalation = (
                "Escalate now. Contact the crew medical officer or flight surgeon "
                "and follow the crew medical checklist. Do not wait for AI or "
                "for the next reading."
            )
            follow_up = (
                "Keep monitoring continuously, record the response, and continue "
                "crew medical escalation until the reading is reviewed."
            )
        elif context.get("status") == "sensor_error":
            immediate = [
                "Check sensor contact and placement.",
                "Repeat the reading with the same or a backup sensor.",
                "Do not treat the value as physiological until signal quality is confirmed.",
            ]
            escalation = (
                "If the signal remains unreliable, notify crew medical and use the "
                "backup monitoring method."
            )
            follow_up = "Confirm a stable signal before relying on this vital sign."
        else:
            immediate = CONDITION_ACTIONS.get(condition, {}).get(
                "warning"
            ) or WARNING_ACTIONS.get(vital, WARNING_ACTIONS.get("device", []))
            escalation = (
                "If the reading persists, worsens, or the astronaut has symptoms, "
                "contact crew medical promptly."
            )
            follow_up = (
                "Repeat the measurement after resting and watch the trend. An alert "
                "resolves after two consecutive normal readings."
            )

        if vital == "device":
            detected = f"{title}."
            meaning = (
                "Wearable telemetry is unavailable, so current vital signs cannot "
                "be confirmed. Last known values should be treated as historical."
            )
        else:
            detected = (
                f"{title} ({self._format_value(value)} {unit}).".strip()
                if value is not None
                else f"{title}."
            )
            meaning = (
                f"The {label.lower()} is outside the configured expected range. "
                "This is a monitoring prompt, not a diagnosis; sensor quality and "
                "activity context still need review."
            )

        return {
            "detected": detected,
            "readings": readings,
            "meaning": meaning,
            "factors": CONDITION_FACTORS.get(
                condition, VITAL_FACTORS.get(vital, VITAL_FACTORS["device"])
            ),
            "immediate_actions": immediate,
            "escalation": escalation,
            "follow_up": follow_up,
            "source": "fallback",
        }

    @staticmethod
    def recommendation(explanation: dict[str, Any]) -> str:
        actions = explanation.get("immediate_actions") or []
        return " ".join(str(action) for action in actions[:2])

    async def explain_alert(
        self,
        alert: dict[str, Any],
        context: dict[str, Any],
    ) -> tuple[dict[str, Any], str]:
        fallback = self.fallback_explanation(context)
        if not self.enabled:
            return fallback, "fallback"

        system_prompt = (
            "You are a non-diagnostic monitoring assistant in a research prototype "
            "for astronaut health. Use only the provided JSON telemetry. Never invent "
            "readings. Never claim certainty or diagnose. Never mention medications "
            "or dosages. For critical alerts, explicitly tell the user to escalate to "
            "the crew medical officer or flight surgeon now. Return JSON only, with "
            "exactly these keys: detected (string), readings (array of strings), "
            "meaning (string), factors (array of strings), immediate_actions (array of "
            "strings), escalation (string), follow_up (string). Be concise. Treat all "
            "data as simulated demo data."
        )
        payload = {
            "model": self.settings.ai_model,
            "temperature": 0.2,
            "messages": [
                {"role": "system", "content": system_prompt},
                {
                    "role": "user",
                    "content": json.dumps(
                        {"alert": alert, "telemetry": context}, default=str
                    ),
                },
            ],
        }
        try:
            text = await self._complete(payload)
            parsed = self._parse_json(text)
            explanation = self._normalise(parsed, fallback)
            if self._contains_unsafe_advice(json.dumps(explanation)):
                raise ValueError("Unsafe AI guidance")
            explanation["source"] = "ai"
            return explanation, "ready"
        except Exception:
            return fallback, "fallback"

    async def chat(
        self,
        message: str,
        history: list[dict[str, str]],
        context: dict[str, Any],
    ) -> tuple[str, str]:
        fallback = self.fallback_chat(message, context)
        if not self.enabled:
            return fallback, "fallback"

        system_prompt = (
            "You are a concise, non-diagnostic assistant inside a simulated "
            "astronaut health monitoring prototype. Answer only from the provided "
            "telemetry and alert data. Never invent values. Never claim certainty, "
            "diagnose, or mention medications or dosages. If data is missing, say so. "
            "If any active alert is critical, tell the user to escalate to crew "
            "medical now. Keep answers under 90 words. Do not use markdown tables."
        )
        safe_history = [
            {"role": item["role"], "content": item["content"][:1000]}
            for item in history[-8:]
            if item.get("role") in {"user", "assistant"}
        ]
        payload = {
            "model": self.settings.ai_model,
            "temperature": 0.2,
            "messages": [
                {"role": "system", "content": system_prompt},
                {
                    "role": "system",
                    "content": "CURRENT TELEMETRY:\n"
                    + json.dumps(context, default=str),
                },
                *safe_history,
                {"role": "user", "content": message},
            ],
        }
        try:
            reply = await self._complete(payload)
            if not reply.strip():
                raise ValueError("Empty AI reply")
            if self._contains_unsafe_advice(reply):
                raise ValueError("Unsafe AI guidance")
            return reply.strip(), "ready"
        except Exception:
            return fallback, "fallback"

    async def _complete(self, payload: dict[str, Any]) -> str:
        headers = {
            "Authorization": f"Bearer {self.settings.ai_api_key}",
            "Content-Type": "application/json",
        }
        async with httpx.AsyncClient(
            timeout=self.settings.ai_timeout_seconds
        ) as client:
            response = await client.post(
                f"{self.settings.ai_base_url.rstrip('/')}/chat/completions",
                headers=headers,
                json=payload,
            )
            response.raise_for_status()
            data = response.json()
        return data["choices"][0]["message"]["content"]

    @staticmethod
    def _parse_json(text: str) -> dict[str, Any]:
        cleaned = text.strip()
        cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
        cleaned = re.sub(r"\s*```$", "", cleaned)
        start = cleaned.find("{")
        end = cleaned.rfind("}")
        if start == -1 or end == -1:
            raise ValueError("No JSON object in AI response")
        parsed = json.loads(cleaned[start : end + 1])
        if not isinstance(parsed, dict):
            raise ValueError("AI response is not an object")
        return parsed

    @staticmethod
    def _normalise(
        parsed: dict[str, Any], fallback: dict[str, Any]
    ) -> dict[str, Any]:
        result = dict(fallback)
        for key in EXPLANATION_KEYS:
            value = parsed.get(key)
            if isinstance(value, str) and value.strip():
                result[key] = value.strip()[:2000]
            elif isinstance(value, list):
                items = [
                    str(item).strip()[:500]
                    for item in value
                    if str(item).strip()
                ]
                if items:
                    result[key] = items
        return result

    def fallback_chat(self, message: str, context: dict[str, Any]) -> str:
        query = message.lower()
        overall = context.get("overall", {})
        vitals = context.get("vitals", [])
        alerts = context.get("active_alerts", [])
        by_key = {item.get("key"): item for item in vitals}

        if any(word in query for word in ("alert", "warning", "critical")):
            if not alerts:
                if overall.get("status") in {"paused", "no_signal"}:
                    return (
                        f"There are no active alerts, but telemetry is not live "
                        f"({overall.get('label', 'unavailable')}). Current vital signs "
                        "cannot be confirmed until readings resume."
                    )
                return "There are no active alerts. All monitored vitals are within expected ranges."
            lines = [
                f"{alert['severity'].upper()}: {alert['title']} ({self._format_value(alert.get('value'))} {alert.get('unit') or ''})."
                for alert in alerts[:3]
            ]
            recommendation = alerts[0].get("recommendation") or (
                "Follow the crew medical escalation guidance."
            )
            return " ".join(lines) + " " + str(recommendation)

        vital_terms = {
            "heart_rate": ("heart", "pulse", "bpm"),
            "spo2": ("oxygen", "spo2", "saturation"),
            "temperature_c": ("temperature", "fever", "temp"),
            "respiratory_rate": ("breath", "respir", "breathing"),
        }
        for vital, terms in vital_terms.items():
            if any(term in query for term in terms):
                item = by_key.get(vital)
                if not item or item.get("value") is None:
                    return "There is no current reading for that vital sign. Check the wearable connection or contact crew medical."
                return (
                    f"{item['label']} is {self._format_value(item['value'])} "
                    f"{item['unit']} with status {item['status'].replace('_', ' ')}. "
                    f"{item.get('expected', '')} If this does not match how the astronaut feels, escalate to crew medical."
                )

        if any(word in query for word in ("do", "action", "next", "help")):
            if alerts:
                return (
                    f"Priority: {alerts[0]['title']}. "
                    f"{alerts[0].get('recommendation', 'Follow crew medical guidance.')} "
                    "Do not wait for this assistant if the astronaut is unwell."
                )
            return (
                "No active alerts. Continue routine monitoring and confirm the "
                "wearable stays connected. This prototype is not for medical decisions."
            )

        status = overall.get("label", "Monitoring")
        active = len(alerts)
        heart_rate = next(
            (item.get("value") for item in vitals if item.get("key") == "heart_rate"),
            None,
        )
        heart_text = (
            f"Heart rate is {self._format_value(heart_rate)} bpm."
            if heart_rate is not None
            else "Heart rate is not available."
        )
        return (
            f"Current status: {status}. Active alerts: {active}. {heart_text} "
            "Ask about an alert, a vital sign, or next actions."
        )

    @staticmethod
    def _contains_unsafe_advice(text: str) -> bool:
        lowered = text.lower()
        return any(term in lowered for term in UNSAFE_MEDICATION_TERMS) or bool(
            UNSAFE_MEDICATION_PATTERN.search(lowered)
        )

    @staticmethod
    def _format_value(value: Any) -> str:
        if value is None:
            return "not available"
        if isinstance(value, float) and value.is_integer():
            return f"{value:.0f}"
        return f"{value:g}" if isinstance(value, (int, float)) else str(value)
