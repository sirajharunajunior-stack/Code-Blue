from __future__ import annotations

import asyncio
import contextlib
import logging
from typing import Any

from .ai import AIService
from .config import Settings
from .database import Database
from .engine import Assessment, HealthEngine
from .models import VITALS
from .simulator import Simulator
from .utils import iso_now

STATUS_LABELS = {
    "normal": "Normal",
    "warning": "Warning",
    "critical": "Critical",
    "sensor_error": "Sensor error",
    "no_signal": "No signal",
    "inactive": "Paused",
    "no_data": "No data",
}

SEVERITY_RANK = {"warning": 1, "critical": 2}

logger = logging.getLogger(__name__)


class MonitorService:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.db = Database(settings.db_path)
        self.engine = HealthEngine(settings.thresholds)
        self.simulator = Simulator()
        self.ai = AIService(settings)

        self._monitoring = False
        self._task: asyncio.Task[None] | None = None
        self._lock = asyncio.Lock()
        self._subscribers: set[Any] = set()
        self._ai_tasks: set[asyncio.Task[None]] = set()
        self._latest_reading: dict[str, Any] | None = None
        self._assessments: dict[str, Assessment] = {}
        self._normal_streak: dict[str, int] = {vital: 0 for vital in VITALS}
        self._last_disconnect_alert: dict[str, Any] | None = None

    @property
    def monitoring(self) -> bool:
        return self._monitoring

    async def startup(self) -> None:
        self.db.initialize()
        history = self.db.recent_readings(500)
        self.engine.load_history(history)
        if history:
            latest = history[-1]
            self._latest_reading = latest
            self._assessments = {
                assessment.vital: assessment
                for assessment in self.engine.assess(latest)
            }
        if self.settings.auto_start:
            self.start_monitoring()

    async def shutdown(self) -> None:
        self._monitoring = False
        if self._task is not None:
            self._task.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await self._task
            self._task = None
        for task in list(self._ai_tasks):
            task.cancel()
        if self._ai_tasks:
            await asyncio.gather(*self._ai_tasks, return_exceptions=True)
        self._ai_tasks.clear()

    def start_monitoring(self) -> None:
        if self._monitoring:
            return
        self._monitoring = True
        self.simulator.reconnect()
        self._task = asyncio.create_task(self._run_loop())

    async def stop_monitoring(self) -> None:
        self._monitoring = False
        if self._task is not None:
            self._task.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await self._task
            self._task = None
        await self.broadcast(self.snapshot())

    async def _run_loop(self) -> None:
        while self._monitoring:
            try:
                await self.tick()
            except Exception:
                logger.exception("Monitoring tick failed")
            await asyncio.sleep(max(self.settings.tick_seconds, 0.05))

    async def set_scenario(self, scenario: str) -> None:
        self.simulator.set_scenario(scenario)  # type: ignore[arg-type]
        if not self._monitoring:
            self.start_monitoring()
        await self.tick()

    async def disconnect(self) -> None:
        self.simulator.disconnect()
        await self.tick()

    async def reconnect(self) -> None:
        self.simulator.reconnect()
        if not self._monitoring:
            self.start_monitoring()
        await self.tick()

    async def tick(self) -> None:
        new_alert_contexts: list[tuple[int, dict[str, Any]]] = []
        async with self._lock:
            if not self._monitoring:
                snapshot = self.snapshot()
            elif not self.simulator.connected:
                self._handle_disconnect()
                snapshot = self.snapshot()
            else:
                self._resolve_disconnect_alert()
                reading = self.simulator.next_reading()
                if reading is None:
                    snapshot = self.snapshot()
                else:
                    payload = reading.model_dump(mode="json")
                    stored = self.db.insert_reading(payload)
                    self._latest_reading = stored
                    assessments = self.engine.assess(payload)
                    self._assessments = {
                        assessment.vital: assessment for assessment in assessments
                    }
                    new_alert_contexts = self._reconcile_alerts(payload, assessments)
                    updated = self.engine.update_baselines(payload, assessments)
                    for vital in VITALS:
                        baseline = self.engine.baseline(vital)
                        if vital in updated or baseline.samples > 0:
                            self.db.save_baseline(
                                vital,
                                baseline.mean,
                                baseline.std,
                                baseline.samples,
                            )
                    snapshot = self.snapshot()
        await self.broadcast(snapshot)
        for alert_id, context in new_alert_contexts:
            self._schedule_ai_explanation(alert_id, context)

    def _handle_disconnect(self) -> None:
        existing = self.db.get_active_alert("device_connection")
        if existing is not None:
            self._last_disconnect_alert = existing
            return
        latest = self._latest_reading or self.db.latest_reading()
        context = {
            "vital": "device",
            "label": "Wearable",
            "severity": "warning",
            "title": "Wearable signal lost",
            "value": None,
            "unit": None,
            "threshold": "No telemetry received",
            "activity": "unknown",
            "baseline": {},
            "status": "sensor_error",
            "last_reading_at": latest.get("recorded_at") if latest else None,
        }
        explanation = self.ai.fallback_explanation(context)
        alert = self.db.create_alert(
            {
                "alert_key": "device_connection",
                "condition": "disconnected",
                "vital": "device",
                "severity": "warning",
                "title": "Wearable signal lost",
                "value": None,
                "unit": None,
                "threshold": "No telemetry received",
                "detected_at": iso_now(),
                "updated_at": iso_now(),
                "ai_status": "fallback",
                "explanation": explanation,
                "recommendation": self.ai.recommendation(explanation),
            }
        )
        self._last_disconnect_alert = alert

    def _resolve_disconnect_alert(self) -> None:
        if self.db.resolve_active_alert_for_key("device_connection"):
            self._last_disconnect_alert = None

    def _reconcile_alerts(
        self, reading: dict[str, Any], assessments: list[Assessment]
    ) -> list[tuple[int, dict[str, Any]]]:
        new_contexts: list[tuple[int, dict[str, Any]]] = []
        now = iso_now()
        to_resolve = self.settings.thresholds.normal_readings_to_resolve

        for assessment in assessments:
            vital = assessment.vital
            if assessment.status == "normal":
                self._normal_streak[vital] += 1
                if self._normal_streak[vital] >= to_resolve:
                    self.db.resolve_active_alerts_for_vital(vital)
                continue

            self._normal_streak[vital] = 0
            existing = self.db.get_active_alert(vital)
            context = self._alert_context(reading, assessment)

            if existing is None:
                alert = self._create_alert(assessment, context)
                ai_status = alert.get("ai_status")
                if ai_status == "pending":
                    new_contexts.append((alert["id"], context))
                continue

            if existing["condition"] != assessment.condition:
                self.db.resolve_active_alerts_for_vital(vital)
                alert = self._create_alert(assessment, context)
                if alert.get("ai_status") == "pending":
                    new_contexts.append((alert["id"], context))
                continue

            severity_changed = existing["severity"] != assessment.severity
            escalated = SEVERITY_RANK.get(
                assessment.severity or "", 0
            ) > SEVERITY_RANK.get(existing["severity"], 0)
            if severity_changed:
                explanation = self.ai.fallback_explanation(context)
                ai_status = (
                    "pending"
                    if self.ai.enabled and assessment.status != "sensor_error"
                    else "fallback"
                )
                self.db.update_active_alert(
                    existing["id"],
                    severity=assessment.severity or existing["severity"],
                    value=assessment.value,
                    updated_at=now,
                    clear_acknowledged=escalated,
                    explanation=explanation,
                    recommendation=self.ai.recommendation(explanation),
                    ai_status=ai_status,
                    threshold=assessment.threshold,
                    title=assessment.title,
                )
                if ai_status == "pending":
                    new_contexts.append((existing["id"], context))
            else:
                self.db.update_active_alert(
                    existing["id"],
                    severity=existing["severity"],
                    value=assessment.value,
                    updated_at=now,
                )
        return new_contexts

    def _alert_context(
        self, reading: dict[str, Any], assessment: Assessment
    ) -> dict[str, Any]:
        baseline = self.engine.baseline(assessment.vital)
        return {
            "vital": assessment.vital,
            "label": assessment.label,
            "severity": assessment.severity or "warning",
            "title": assessment.title,
            "condition": assessment.condition,
            "value": assessment.value,
            "unit": assessment.unit,
            "threshold": assessment.threshold,
            "expected": assessment.expected,
            "activity": reading.get("activity", "unknown"),
            "status": assessment.status,
            "baseline": baseline.as_dict(),
        }

    def _create_alert(
        self, assessment: Assessment, context: dict[str, Any]
    ) -> dict[str, Any]:
        explanation = self.ai.fallback_explanation(context)
        ai_status = (
            "pending"
            if self.ai.enabled and assessment.status != "sensor_error"
            else "fallback"
        )
        return self.db.create_alert(
            {
                "alert_key": assessment.vital,
                "condition": assessment.condition,
                "vital": assessment.vital,
                "severity": assessment.severity or "warning",
                "title": assessment.title,
                "value": assessment.value,
                "unit": assessment.unit,
                "threshold": assessment.threshold,
                "detected_at": iso_now(),
                "updated_at": iso_now(),
                "ai_status": ai_status,
                "explanation": explanation,
                "recommendation": self.ai.recommendation(explanation),
            }
        )

    def _schedule_ai_explanation(
        self, alert_id: int, context: dict[str, Any]
    ) -> None:
        if not self.ai.enabled:
            return
        task = asyncio.create_task(self._enrich_alert(alert_id, context))
        self._ai_tasks.add(task)
        task.add_done_callback(self._ai_tasks.discard)

    async def _enrich_alert(
        self, alert_id: int, context: dict[str, Any]
    ) -> None:
        alert = self.db.get_alert(alert_id)
        if alert is None:
            return
        explanation, ai_status = await self.ai.explain_alert(alert, context)
        current = self.db.get_alert(alert_id)
        if current is None or current["severity"] != context.get("severity"):
            return
        self.db.set_alert_ai(
            alert_id,
            explanation=explanation,
            recommendation=self.ai.recommendation(explanation),
            ai_status=ai_status,
        )
        await self.broadcast(self.snapshot())

    def snapshot(self) -> dict[str, Any]:
        now = iso_now()
        recent_alerts = self.db.list_alerts(limit=30)
        active_alerts = [
            alert for alert in recent_alerts if alert["status"] != "resolved"
        ]
        readings = self.db.recent_readings(120)
        latest = self._latest_reading or (readings[-1] if readings else None)

        connected = self.simulator.connected
        if not self._monitoring:
            overall_status = "paused"
            overall_label = "Paused"
            summary = "Monitoring is paused. Start the demo to resume live readings."
        elif any(alert["severity"] == "critical" for alert in active_alerts):
            overall_status = "critical"
            overall_label = "Critical"
            critical_alert = next(
                alert
                for alert in active_alerts
                if alert["severity"] == "critical"
            )
            summary = (
                f"{critical_alert['title']}. Escalate to crew medical now; "
                "do not wait for the AI explanation."
            )
        elif not connected:
            overall_status = "no_signal"
            overall_label = "No signal"
            summary = (
                "Wearable signal lost. Last known readings remain on screen; "
                "check the device and use manual monitoring."
            )
        elif any(alert["severity"] == "warning" for alert in active_alerts):
            overall_status = "warning"
            overall_label = "Warning"
            warning_alert = next(
                alert for alert in active_alerts if alert["severity"] == "warning"
            )
            summary = f"{warning_alert['title']}. {warning_alert['recommendation']}"
        else:
            overall_status = "normal"
            overall_label = "Stable"
            summary = "All monitored vitals are within expected ranges."

        if not self._monitoring:
            vital_override = "inactive"
        elif not connected:
            vital_override = "no_signal"
        else:
            vital_override = None

        active_by_vital = {alert["vital"]: alert for alert in active_alerts}
        history = [
            {
                "recorded_at": reading["recorded_at"],
                "heart_rate": reading["heart_rate"],
                "spo2": reading["spo2"],
                "temperature_c": reading["temperature_c"],
                "respiratory_rate": reading["respiratory_rate"],
                "activity": reading["activity"],
            }
            for reading in readings
        ]
        activity = latest.get("activity", "rest") if latest else "rest"
        vitals = []
        for vital, meta in VITALS.items():
            assessment = self._assessments.get(vital)
            if vital_override:
                vital_status = vital_override
            elif assessment is not None:
                vital_status = assessment.status
            else:
                vital_status = "no_data"

            value = None
            if assessment is not None and assessment.status == "sensor_error":
                value = None
            elif latest is not None:
                value = latest.get(vital)

            latest_alert = active_by_vital.get(vital)
            if latest_alert is not None and latest_alert["severity"] == "critical":
                vital_status = "critical"
            elif latest_alert is not None and vital_status == "normal":
                vital_status = "warning"

            baselines = self.engine.baseline(vital)
            series = [
                {
                    "t": row["recorded_at"],
                    "value": row.get(vital),
                }
                for row in readings[-24:]
            ]
            vitals.append(
                {
                    "key": vital,
                    "label": meta["label"],
                    "unit": meta["unit"],
                    "value": None if value is None else round(float(value), 1),
                    "status": vital_status,
                    "status_label": STATUS_LABELS.get(vital_status, vital_status),
                    "expected": self.engine.expected_text(
                        vital, activity, meta["unit"]
                    ),
                    "threshold": (
                        assessment.threshold if assessment is not None else ""
                    ),
                    "baseline": baselines.as_dict(),
                    "series": series,
                }
            )

        return {
            "generated_at": now,
            "device": {
                **self.simulator.status(),
                "monitoring": self._monitoring,
                "last_reading_at": latest.get("recorded_at") if latest else None,
                "tick_seconds": self.settings.tick_seconds,
            },
            "overall": {
                "status": overall_status,
                "label": overall_label,
                "message": summary,
            },
            "summary": summary,
            "current": (
                {
                    "recorded_at": latest.get("recorded_at"),
                    "heart_rate": latest.get("heart_rate"),
                    "spo2": latest.get("spo2"),
                    "temperature_c": latest.get("temperature_c"),
                    "respiratory_rate": latest.get("respiratory_rate"),
                    "activity": latest.get("activity"),
                }
                if latest
                else None
            ),
            "vitals": vitals,
            "history": history,
            "alerts": recent_alerts,
            "active_alerts": active_alerts,
            "ai": {
                "enabled": self.ai.enabled,
                "model": self.settings.ai_model if self.ai.enabled else "fallback",
            },
        }

    def chat_context(self) -> dict[str, Any]:
        snapshot = self.snapshot()
        return {
            "generated_at": snapshot["generated_at"],
            "overall": snapshot["overall"],
            "device": snapshot["device"],
            "current": snapshot["current"],
            "vitals": [
                {
                    "key": vital["key"],
                    "label": vital["label"],
                    "value": vital["value"],
                    "unit": vital["unit"],
                    "status": vital["status"],
                    "expected": vital["expected"],
                }
                for vital in snapshot["vitals"]
            ],
            "active_alerts": [
                {
                    "severity": alert["severity"],
                    "title": alert["title"],
                    "value": alert["value"],
                    "unit": alert["unit"],
                    "recommendation": alert["recommendation"],
                    "detected_at": alert["detected_at"],
                }
                for alert in snapshot["active_alerts"]
            ],
        }

    async def register(self, websocket: Any) -> None:
        self._subscribers.add(websocket)
        await self.send_snapshot(websocket)

    def unregister(self, websocket: Any) -> None:
        self._subscribers.discard(websocket)

    async def send_snapshot(self, websocket: Any) -> None:
        await websocket.send_json(
            {"type": "snapshot", "data": self.snapshot()}
        )

    async def broadcast(self, snapshot: dict[str, Any]) -> None:
        dead: list[Any] = []
        payload = {"type": "snapshot", "data": snapshot}
        for websocket in list(self._subscribers):
            try:
                await websocket.send_json(payload)
            except Exception:
                dead.append(websocket)
        for websocket in dead:
            self._subscribers.discard(websocket)
