"""Run:  pip install -r requirements-dev.txt && pytest -q
Uses a temporary copy of health.db, so your real database is never touched."""
import os
import shutil
import sys

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


@pytest.fixture(scope="module")
def client(tmp_path_factory):
    tmp = tmp_path_factory.mktemp("db") / "test.db"
    src = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "health.db")
    shutil.copy(src, tmp)
    os.environ["HM_DB"] = str(tmp)
    os.environ["HM_MODEL"] = str(tmp) + ".model.json"
    from fastapi.testclient import TestClient
    import main
    with TestClient(main.app) as c:       # runs lifespan: db.init + live sampler
        yield c


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
    assert client.put("/api/subjects/A1/environment", params={"value": "planetary_surface"}).status_code == 200
    assert client.get("/api/radiation", params={"subject": "A1"}).json()["normal_max_mSv_day"] == 0.9
    assert client.put("/api/subjects/A1/environment", params={"value": "mars"}).status_code == 400
    client.put("/api/subjects/A1/environment", params={"value": "free_space"})


def test_daily_alerts_export(client):
    assert len(client.get("/api/daily", params={"subject": "A3"}).json()) == 7
    assert len(client.get("/api/alerts", params={"subject": "A2", "n": 500}).json()) >= 30
    csv = client.get("/api/export.csv", params={"subject": "A1"}).text.splitlines()
    assert csv[0] == "timestamp,metric,value,status" and len(csv) == 4705


def test_health_shows_sensors(client):
    assert client.get("/api/health").json()["sensors"]


def test_auth_token(client, monkeypatch):
    import config
    monkeypatch.setattr(config, "API_TOKEN", "secret")
    assert client.get("/api/crew").status_code == 401
    assert client.get("/api/crew", headers={"X-API-Token": "secret"}).status_code == 200


def test_precautions_library(client):
    j = client.get("/api/precautions").json()
    assert len(j["conditions"]) == 11 and j["disclaimer"]


def test_advice_endpoint(client):
    j = client.get("/api/advice", params={"subject": "A3"}).json()
    assert {"advice", "emergency_signs", "check_first", "disclaimer"} <= set(j)
    assert all(a["steps"] and a["level"] != "normal" for a in j["advice"])
    assert client.get("/api/advice", params={"subject": "ZZ"}).status_code == 404


def test_post_readings_from_camera(client):
    assert client.post("/api/subjects", json={"id": "cam-t", "name": "Camera test"}).status_code == 200
    r = client.post("/api/readings", json={"subject": "cam-t", "source": "camera",
                                           "readings": [{"metric": "heart_rate", "value": 125}]})
    j = r.json()
    assert r.status_code == 200 and j["results"][0]["level"] == "critical"
    assert j["results"][0]["alerts"] and j["results"][0]["advice"]["steps"]
    assert j["action_plan"]["do_now"] and j["action_plan"]["headline"].startswith("Fast heart rate")
    assert client.get("/api/latest", params={"subject": "cam-t"}).json()["overall_level"] == "critical"


def test_post_readings_validation(client):
    bad = lambda body: client.post("/api/readings", json=body).status_code
    assert bad({"subject": "cam-t", "readings": [{"metric": "heart_rate", "value": 900}]}) == 400
    assert bad({"subject": "ZZ", "readings": [{"metric": "heart_rate", "value": 70}]}) == 404
    assert bad({"subject": "cam-t", "readings": []}) == 422
    assert client.post("/api/subjects", json={"id": "bad id!", "name": "x"}).status_code == 400


def test_camera_page_is_served(client):
    r = client.get("/camera")
    assert r.status_code == 200 and "text/html" in r.headers["content-type"] and "/api/readings" in r.text
