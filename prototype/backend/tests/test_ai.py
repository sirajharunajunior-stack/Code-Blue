from __future__ import annotations

import asyncio

from app.ai import EXPLANATION_KEYS, AIService
from app.config import Settings


def context():
    return {
        "vital": "spo2",
        "label": "Blood oxygen",
        "severity": "critical",
        "title": "Blood oxygen critically low",
        "value": 87.0,
        "unit": "%",
        "threshold": "< 90%",
        "activity": "rest",
        "status": "critical",
        "baseline": {"mean": 97.5, "std": 1.2, "samples": 20, "ready": True},
    }


def test_fallback_explanation_has_all_sections():
    service = AIService(Settings(ai_api_key=""))
    explanation = service.fallback_explanation(context())
    for key in EXPLANATION_KEYS:
        assert key in explanation
    assert explanation["source"] == "fallback"
    assert "crew medical" in explanation["escalation"].lower()
    assert "87" in explanation["detected"]
    assert all(
        "medication" not in action.lower()
        for action in explanation["immediate_actions"]
    )


def test_explain_alert_without_key_returns_fallback():
    service = AIService(Settings(ai_api_key=""))
    explanation, status = asyncio.run(
        service.explain_alert({"title": "test"}, context())
    )
    assert status == "fallback"
    assert explanation["source"] == "fallback"


def test_gemini_environment_selects_compatible_endpoint_and_model(monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "test-gemini-key")
    monkeypatch.delenv("AI_API_KEY", raising=False)
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    monkeypatch.delenv("AI_BASE_URL", raising=False)
    monkeypatch.delenv("AI_MODEL", raising=False)

    settings = Settings()

    assert settings.ai_api_key == "test-gemini-key"
    assert settings.ai_base_url == "https://generativelanguage.googleapis.com/v1beta/openai"
    assert settings.ai_model == "gemini-3.5-flash-lite"
    assert settings.ai_enabled


def test_gemini_completion_uses_server_side_key_and_api_endpoint(monkeypatch):
    service = AIService(
        Settings(
            ai_api_key="test-gemini-key",
            ai_base_url="https://generativelanguage.googleapis.com/v1beta/openai",
            ai_model="gemini-3.5-flash-lite",
        )
    )
    request = {}

    class FakeResponse:
        def raise_for_status(self):
            pass

        def json(self):
            return {"choices": [{"message": {"content": "Gemini response"}}]}

    class FakeClient:
        def __init__(self, timeout):
            assert timeout == service.settings.ai_timeout_seconds

        async def __aenter__(self):
            return self

        async def __aexit__(self, *_):
            return None

        async def post(self, url, headers, json):
            request.update(url=url, headers=headers, payload=json)
            return FakeResponse()

    monkeypatch.setattr("app.ai.httpx.AsyncClient", FakeClient)
    response = asyncio.run(service._complete({"model": "gemini-3.5-flash-lite"}))

    assert response == "Gemini response"
    assert request["url"] == (
        "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"
    )
    assert request["headers"]["Authorization"] == "Bearer test-gemini-key"
    assert request["payload"]["model"] == "gemini-3.5-flash-lite"


def test_ai_json_is_normalized(monkeypatch):
    service = AIService(Settings(ai_api_key="test-key"))

    async def fake_complete(_payload):
        return """```json
        {
          "detected": "Oxygen is low.",
          "readings": ["Blood oxygen: 87%"],
          "meaning": "This is a monitoring prompt.",
          "factors": ["Sensor placement"],
          "immediate_actions": ["Notify crew medical now."],
          "escalation": "Escalate now.",
          "follow_up": "Keep monitoring."
        }
        ```"""

    monkeypatch.setattr(service, "_complete", fake_complete)
    explanation, status = asyncio.run(
        service.explain_alert({"title": "test"}, context())
    )
    assert status == "ready"
    assert explanation["source"] == "ai"
    assert explanation["detected"] == "Oxygen is low."


def test_medication_advice_is_rejected(monkeypatch):
    service = AIService(Settings(ai_api_key="test-key"))

    async def fake_complete(_payload):
        return (
            '{"detected":"Low oxygen","readings":["87%"],"meaning":"Low",'
            '"factors":[],"immediate_actions":["Take aspirin 300 mg"],'
            '"escalation":"none","follow_up":"none"}'
        )

    monkeypatch.setattr(service, "_complete", fake_complete)
    explanation, status = asyncio.run(
        service.explain_alert({"title": "test"}, context())
    )
    assert status == "fallback"
    assert "aspirin" not in str(explanation).lower()


def test_invalid_ai_output_falls_back(monkeypatch):
    service = AIService(Settings(ai_api_key="test-key"))

    async def fake_complete(_payload):
        return "not json"

    monkeypatch.setattr(service, "_complete", fake_complete)
    explanation, status = asyncio.run(
        service.explain_alert({"title": "test"}, context())
    )
    assert status == "fallback"
    assert explanation["source"] == "fallback"


def test_ai_chat_failure_is_logged_without_leaking_error_details(monkeypatch, caplog):
    service = AIService(Settings(ai_api_key="test-key"))

    async def fail_with_sensitive_detail(_payload):
        raise RuntimeError("provider response included a sensitive value")

    monkeypatch.setattr(service, "_complete", fail_with_sensitive_detail)
    with caplog.at_level("WARNING", logger="app.ai"):
        reply, status = asyncio.run(
            service.chat("What is my status?", [], {"vitals": [], "active_alerts": []})
        )

    assert status == "fallback"
    assert reply
    assert "RuntimeError" in caplog.text
    assert "sensitive value" not in caplog.text


def test_low_temperature_guidance_fits_the_condition():
    service = AIService(Settings(ai_api_key=""))
    low_temperature = context() | {
        "vital": "temperature_c",
        "label": "Body temperature",
        "condition": "temperature_low",
        "title": "Body temperature critically low",
        "value": 34.8,
        "unit": "°C",
        "threshold": "< 35.0°C",
    }
    explanation = service.fallback_explanation(low_temperature)
    actions = " ".join(explanation["immediate_actions"]).lower()
    assert "warm" in actions
    assert "cooler" not in actions


def test_unsafe_ai_chat_reply_falls_back(monkeypatch):
    service = AIService(Settings(ai_api_key="test-key"))

    async def fake_complete(_payload):
        return "Take 2 aspirin now."

    monkeypatch.setattr(service, "_complete", fake_complete)
    reply, status = asyncio.run(
        service.chat("How are my vitals?", [], {"vitals": [], "active_alerts": []})
    )
    assert status == "fallback"
    assert "aspirin" not in reply.lower()


def test_fallback_chat_uses_actual_values():
    service = AIService(Settings(ai_api_key=""))
    telemetry = {
        "overall": {"label": "Warning", "status": "warning"},
        "active_alerts": [
            {
                "severity": "warning",
                "title": "Heart rate elevated",
                "value": 130,
                "unit": "bpm",
                "recommendation": "Rest and repeat the reading.",
            }
        ],
        "vitals": [
            {
                "key": "heart_rate",
                "label": "Heart rate",
                "value": 130,
                "unit": "bpm",
                "status": "warning",
                "expected": "Expected about 68 bpm.",
            }
        ],
    }
    reply = service.fallback_chat("What is my heart rate?", telemetry)
    assert "130" in reply
    assert "heart rate" in reply.lower()
    reply = service.fallback_chat("Explain the alert", telemetry)
    assert "Heart rate elevated" in reply
