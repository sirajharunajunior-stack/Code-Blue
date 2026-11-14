from __future__ import annotations

from fastapi.testclient import TestClient

from app.config import Settings
from app.main import create_app


def make_client(tmp_path):
    settings = Settings(
        db_path=tmp_path / "monitor.db",
        tick_seconds=0.05,
        auto_start=False,
        ai_api_key="",
    )
    return TestClient(create_app(settings))


def test_health_snapshot_and_websocket(tmp_path):
    with make_client(tmp_path) as client:
        health = client.get("/api/health")
        assert health.status_code == 200
        assert health.json()["demo"] is True
        assert health.json()["monitoring"] is False

        snapshot = client.get("/api/snapshot")
        assert snapshot.status_code == 200
        assert snapshot.json()["overall"]["status"] == "paused"

        with client.websocket_connect("/ws") as websocket:
            message = websocket.receive_json()
            assert message["type"] == "snapshot"
            assert message["data"]["device"]["monitoring"] is False


def test_end_to_end_alert_acknowledge_and_recovery(tmp_path):
    with make_client(tmp_path) as client:
        started = client.post("/api/demo/start").json()["snapshot"]
        assert started["device"]["monitoring"] is True
        assert started["current"] is not None

        abnormal = client.post(
            "/api/demo/scenario", json={"scenario": "low_spo2"}
        ).json()["snapshot"]
        spo2_alerts = [
            alert
            for alert in abnormal["active_alerts"]
            if alert["vital"] == "spo2"
        ]
        assert spo2_alerts
        alert = spo2_alerts[0]
        assert alert["severity"] == "critical"
        assert alert["acknowledged_at"] is None
        assert alert["explanation"]["immediate_actions"]

        acknowledged = client.post(
            f"/api/alerts/{alert['id']}/acknowledge"
        ).json()["alert"]
        assert acknowledged["status"] == "acknowledged"

        client.post("/api/demo/scenario", json={"scenario": "normal"})
        recovered = client.post(
            "/api/demo/scenario", json={"scenario": "normal"}
        ).json()["snapshot"]
        assert all(
            item["vital"] != "spo2" for item in recovered["active_alerts"]
        )

        readings = client.get("/api/readings?limit=20").json()["readings"]
        assert len(readings) >= 3
        baselines = client.get("/api/baselines").json()["baselines"]
        assert set(baselines) == {
            "heart_rate",
            "spo2",
            "temperature_c",
            "respiratory_rate",
        }


def test_duplicate_abnormal_readings_do_not_duplicate_alerts(tmp_path):
    with make_client(tmp_path) as client:
        client.post("/api/demo/start")
        client.post(
            "/api/demo/scenario", json={"scenario": "elevated_heart_rate"}
        )
        snapshot = client.post(
            "/api/demo/scenario", json={"scenario": "elevated_heart_rate"}
        ).json()["snapshot"]
        active = [
            alert
            for alert in snapshot["active_alerts"]
            if alert["vital"] == "heart_rate"
        ]
        assert len(active) == 1
        assert active[0]["severity"] == "warning"


def test_disconnect_and_reconnect(tmp_path):
    with make_client(tmp_path) as client:
        client.post("/api/demo/start")
        disconnected = client.post("/api/demo/disconnect").json()["snapshot"]
        assert disconnected["device"]["connected"] is False
        assert disconnected["overall"]["status"] in {"no_signal", "critical"}
        device_alerts = [
            alert
            for alert in disconnected["active_alerts"]
            if alert["alert_key"] == "device_connection"
        ]
        assert device_alerts

        reconnected = client.post("/api/demo/reconnect").json()["snapshot"]
        assert reconnected["device"]["connected"] is True
        assert all(
            alert["alert_key"] != "device_connection"
            for alert in reconnected["active_alerts"]
        )


def test_history_and_alerts_persist_across_restart(tmp_path):
    with make_client(tmp_path) as client:
        client.post("/api/demo/start")
        client.post("/api/demo/scenario", json={"scenario": "low_spo2"})
        first = client.get("/api/snapshot").json()
        assert first["active_alerts"]

    with make_client(tmp_path) as client:
        persisted = client.get("/api/snapshot").json()
        assert persisted["current"] is not None
        assert persisted["overall"]["status"] == "paused"
        assert any(
            alert["vital"] == "spo2"
            for alert in persisted["active_alerts"]
        )
        readings = client.get("/api/readings?limit=5").json()["readings"]
        assert readings


def test_chat_uses_fallback_without_api_key(tmp_path):
    with make_client(tmp_path) as client:
        client.post("/api/demo/start")
        response = client.post(
            "/api/ai/chat",
            json={"message": "What is my heart rate?", "history": []},
        )
        assert response.status_code == 200
        body = response.json()
        assert body["ai_status"] == "fallback"
        assert "heart rate" in body["reply"].lower()
