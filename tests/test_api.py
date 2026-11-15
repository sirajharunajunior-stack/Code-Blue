"""Run:  pip install -r requirements-dev.txt && pytest -q
Uses a temporary copy of health.db, so your real database is never touched."""
import os
import shutil
import sys

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


@pytest.fixture(scope="module")
def client(tmp_path_factory):
    """Point the whole process at a throw-away copy, even if another test module
    imported config/db during collection (config values are read at import time)."""
    import config
    tmp = tmp_path_factory.mktemp("db") / "test.db"
    src = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "health.db")
    shutil.copy(src, tmp)
    old_db, old_model = config.DB_PATH, config.MODEL_PATH
    config.DB_PATH = str(tmp)
    config.MODEL_PATH = str(tmp) + ".model.json"
    os.environ["HM_DB"] = config.DB_PATH
    os.environ["HM_MODEL"] = config.MODEL_PATH
    from fastapi.testclient import TestClient
    import main
    try:
        with TestClient(main.app) as c:   # runs lifespan: db.init + live sampler
            assert config.DB_PATH == str(tmp)
            yield c
    finally:
        config.DB_PATH, config.MODEL_PATH = old_db, old_model
        os.environ["HM_DB"] = old_db
        os.environ["HM_MODEL"] = old_model


def test_subjects(client):
    ids = [s["id"] for s in client.get("/api/subjects").json()]
    assert {"A1", "A2", "A3"} <= set(ids)


def test_latest_has_level_and_overall(client):
    j = client.get("/api/latest", params={"subject": "A1"}).json()
    assert len(j["latest"]) == 7 and j["overall_level"] in ("normal", "slightly_abnormal", "needs_checkup", "critical")


def test_history_and_filters(client):
    h = client.get("/api/history", params={"metric": "heart_rate", "subject": "A1"}).json()
    assert len(h) == 672 and {"ts", "value", "status", "level"} <= set(h[0])
    assert client.get("/api/history", params={"metric": "nope", "subject": "A1"}).status_code == 404
    assert client.get("/api/latest", params={"subject": "ZZ"}).status_code == 404
    assert client.get("/api/history", params={"metric": "sleep_hours", "subject": "A1"}).status_code == 400
    assert client.get("/api/history", params={"metric": "heart_rate", "subject": "A1", "limit": 0}).status_code == 422
    assert len(client.get("/api/history", params={"metric": "heart_rate", "subject": "A1", "limit": 5}).json()) == 5


def test_levels_and_colors(client):
    j = client.get("/api/levels").json()
    assert [l["name"] for l in j["levels"]] == ["normal", "slightly_abnormal", "needs_checkup", "critical"]
    assert all(l["color"].startswith("#") for l in j["levels"])
    assert "heart_rate" in j["ranges"]


def test_crew_sorted_worst_first(client):
    crew = client.get("/api/crew").json()
    codes = {"normal": 0, "slightly_abnormal": 1, "needs_checkup": 2, "critical": 3}
    assert [codes[c["overall_level"]] for c in crew] == sorted((codes[c["overall_level"]] for c in crew), reverse=True)
    assert all({"color", "label", "flagged"} <= set(c) for c in crew)


def test_radiation_and_environment(client):
    r = client.get("/api/radiation", params={"subject": "A1"}).json()
    assert r["normal_max_mSv_day"] == 1.3 and r["career_limit_mSv"] == 600
    assert r["level_today"] in ("normal", "slightly_abnormal", "needs_checkup", "critical")
    assert client.put("/api/subjects/A1/environment", params={"value": "planetary_surface"}).status_code == 200
    assert client.get("/api/radiation", params={"subject": "A1"}).json()["normal_max_mSv_day"] == 0.9
    assert client.put("/api/subjects/A1/environment", params={"value": "mars"}).status_code == 400
    assert client.put("/api/subjects/ZZ/environment", params={"value": "free_space"}).status_code == 404
    client.put("/api/subjects/A1/environment", params={"value": "free_space"})


def test_daily_alerts_export(client):
    assert len(client.get("/api/daily", params={"subject": "A3"}).json()) == 7
    assert len(client.get("/api/alerts", params={"subject": "A2", "n": 500}).json()) >= 30
    assert client.get("/api/alerts", params={"subject": "ZZ"}).status_code == 404
    assert client.get("/api/alerts", params={"n": 0}).status_code == 422
    csv = client.get("/api/export.csv", params={"subject": "A1"}).text.splitlines()
    assert csv[0] == "timestamp,metric,value,status" and len(csv) == 4705
    assert client.get("/api/export.csv", params={"subject": "ZZ"}).status_code == 404


def test_reference_endpoints(client):
    limits = client.get("/api/limits").json()
    assert {m["name"] for m in limits} >= {"heart_rate", "sleep_hours", "radiation"}
    assert all("kind" in m and "unit" in m for m in limits)


def test_health_shows_sensors(client):
    h = client.get("/api/health").json()
    assert h["sensors"] and h["db"] == "test.db" and h["db_ok"] is True
    assert h["status"] == "ok"


def test_auth_token(client, monkeypatch):
    import config
    monkeypatch.setattr(config, "API_TOKEN", "secret")
    assert client.get("/api/crew").status_code == 401
    assert client.get("/api/crew", headers={"X-API-Token": "wrong"}).status_code == 401
    assert client.get("/api/crew", headers={"X-API-Token": "secret"}).status_code == 200
    # The liveness endpoint stays public for the service manager / reverse proxy.
    assert client.get("/api/health").status_code == 200
