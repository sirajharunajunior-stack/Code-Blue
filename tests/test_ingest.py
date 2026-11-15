"""Tests for POST /api/readings (camera / device ingest) at the service layer. No FastAPI needed.
Run:  python tests/test_ingest.py     (or: pytest -q tests/test_ingest.py)"""
import os
import sys
import tempfile
import time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)
_tmp = tempfile.mkdtemp()
os.environ["HM_DB"] = os.path.join(_tmp, "test.db")
os.environ["HM_MODEL"] = os.path.join(_tmp, "model.json")

import alerts  # noqa: E402
import config  # noqa: E402
import db  # noqa: E402
import service  # noqa: E402

db.init()
quiet = lambda: alerts.AlertEngine(notifiers=[])           # no buzzer/log noise in tests


def bad(fn, exc=service.BadRequest):
    try:
        fn()
    except exc:
        return True
    return False


def test_add_person_then_ingest_normal_reading():
    assert service.add_subject("cam-1", "Camera user")["name"] == "Camera user"
    r = service.ingest("cam-1", [{"metric": "heart_rate", "value": 68}, {"metric": "resp_rate", "value": 15}], "camera", quiet())
    assert r["saved"] == 2 and r["overall_level"] == "normal" and r["source"] == "camera"
    assert all(x["level"] == "normal" and x["advice"] is None and x["alerts"] == [] for x in r["results"])
    assert db.latest("cam-1")[0] is not None


def test_stored_readings_use_database_thresholds():
    e = quiet()
    lv = lambda m, v: service.ingest("cam-1", [{"metric": m, "value": v}], "camera", e)["results"][0]["level"]
    assert lv("heart_rate", 80) == "slightly_abnormal"     # above 75, below 90
    assert lv("heart_rate", 95) == "needs_checkup"
    assert lv("heart_rate", 115) == "critical"
    assert lv("heart_rate", 45) == "needs_checkup"
    assert lv("resp_rate", 25) == "needs_checkup"


def test_critical_alerts_immediately_and_returns_precautions():
    r = service.ingest("cam-1", [{"metric": "heart_rate", "value": 130}], "camera", quiet())["results"][0]
    assert r["level"] == "critical" and len(r["alerts"]) == 1 and r["alerts"][0]["level"] == "critical"
    assert r["advice"]["condition"] == "fast_heart_rate" and r["advice"]["steps"]
    assert any(a["metric"] == "heart_rate" and a["level"] == "critical" for a in db.alerts("cam-1", 50))


def test_needs_checkup_alert_needs_consecutive_readings():
    e = quiet()
    sid = "cam-2"
    service.add_subject(sid, "Second")
    fired = [bool(service.ingest(sid, [{"metric": "heart_rate", "value": 100, "ts": time.time() + i}], "camera", e)["results"][0]["alerts"])
             for i in range(4)]
    n = config.ALERT_CONSECUTIVE
    assert fired[:n - 1] == [False] * (n - 1) and fired[n - 1] is True


def test_invalid_input_is_rejected_and_nothing_is_stored():
    before = len(db.history("cam-1", "heart_rate"))
    assert bad(lambda: service.ingest("cam-1", [{"metric": "heart_rate", "value": 72}, {"metric": "resp_rate", "value": 999}], "camera", quiet()))
    assert len(db.history("cam-1", "heart_rate")) == before          # all-or-nothing
    assert bad(lambda: service.ingest("cam-1", [{"metric": "heart_rate", "value": 5}], "camera", quiet()))
    assert bad(lambda: service.ingest("cam-1", [{"metric": "heart_rate", "value": float("nan")}], "camera", quiet()))
    assert bad(lambda: service.ingest("cam-1", [{"metric": "heart_rate", "value": "fast"}], "camera", quiet()))
    assert bad(lambda: service.ingest("cam-1", [{"metric": "radiation", "value": 1}], "camera", quiet()))      # daily metric
    assert bad(lambda: service.ingest("cam-1", [{"metric": "nope", "value": 1}], "camera", quiet()))
    assert bad(lambda: service.ingest("cam-1", [{"metric": "heart_rate", "value": 70, "ts": time.time() - 10 * 86400}], "camera", quiet()))
    assert bad(lambda: service.ingest("cam-1", [{"metric": "heart_rate", "value": 70, "ts": float("nan")}], "camera", quiet()))
    assert bad(lambda: service.ingest("cam-1", [{"metric": "heart_rate", "value": 70, "ts": float("inf")}], "camera", quiet()))
    assert bad(lambda: service.ingest("cam-1", [{"metric": "heart_rate", "value": 70, "ts": "not-a-time"}], "camera", quiet()))
    duplicate_ts = time.time()
    assert bad(lambda: service.ingest("cam-1", [
        {"metric": "heart_rate", "value": 70, "ts": duplicate_ts},
        {"metric": "heart_rate", "value": 72, "ts": duplicate_ts},
    ], "camera", quiet()))
    assert bad(lambda: service.ingest("cam-1", [], "camera", quiet()))
    assert bad(lambda: service.ingest("ZZ", [{"metric": "heart_rate", "value": 70}], "camera", quiet()), service.NotFound)


def test_add_subject_validation():
    assert bad(lambda: service.add_subject("bad id!", "x"))
    assert bad(lambda: service.add_subject("cam-1", "dup"))
    assert bad(lambda: service.add_subject("ok", "  "))


def test_ingested_reading_shows_in_latest_and_crew():
    service.add_subject("cam-3", "Third")
    service.ingest("cam-3", [{"metric": "heart_rate", "value": 118}], "camera", quiet())
    crew = {c["id"]: c for c in service.crew()}
    assert crew["cam-3"]["overall_level"] == "critical"


def test_flagged_reading_comes_with_a_what_to_do_plan():
    e = quiet()
    r = service.ingest("cam-1", [{"metric": "heart_rate", "value": 130}], "camera", e)
    p = r["action_plan"]
    assert p["level"] == "critical" and "Critical" in p["headline"] and "Fast heart rate" in p["headline"]
    assert p["do_now"][0].lower().startswith("treat as a medical emergency")        # level steps first
    assert any("stop all activity" in x.lower() for x in p["do_now"])                 # then condition steps
    assert p["get_urgent_help_if"] and p["emergency_signs"] and p["disclaimer"] and p["check_first"] == []
    n = service.ingest("cam-1", [{"metric": "heart_rate", "value": 70}], "camera", e)
    assert n["action_plan"] is None                                                  # normal: nothing to do


def test_plan_covers_the_worst_flag_and_lists_the_rest():
    r = service.ingest("cam-1", [{"metric": "heart_rate", "value": 95}, {"metric": "resp_rate", "value": 30}], "camera", quiet())
    p = r["action_plan"]
    assert p["level"] == "critical" and "Rapid breathing" in p["headline"]
    assert [x["condition_name"] for x in p["also_flagged"]] == ["Fast heart rate (tachycardia)"]
    s = service.advice_for_subject("cam-1")
    assert s["action_plan"] and s["action_plan"]["do_now"]


def test_every_alert_says_what_to_do():
    service.ingest("cam-1", [{"metric": "heart_rate", "value": 135}], "camera", quiet())
    rows = [a for a in service.alerts("cam-1", 50) if a["level"] in ("critical", "needs_checkup")]
    assert rows and all(a["what_to_do"] and a["what_to_do"]["do_now"] for a in rows)


def test_no_flagged_value_is_ever_left_without_instructions():
    import levels
    specs = db.metrics()
    sweeps = {"heart_rate": (15, 200, 1), "spo2": (60, 100, .5), "body_temp": (30, 42, .1), "resp_rate": (4, 45, .5),
              "bp_systolic": (60, 220, 2), "bp_diastolic": (35, 140, 1), "cabin_co2": (0, 3, .02),
              "sleep_hours": (0, 12, .1), "exercise_hours": (0, 5, .1), "radiation": (0, 5, .05)}
    import advice
    for m, (lo, hi, step) in sweeps.items():
        v = lo
        while v <= hi:
            lvl = levels.classify(specs[m], v)
            if lvl != "normal":
                assert advice.advice_for(m, v, lvl, specs[m]), (m, v, lvl)
            v += step


if __name__ == "__main__":
    fails = 0
    for name, fn in list(globals().items()):
        if name.startswith("test_"):
            try:
                fn(); print("PASS", name)
            except Exception as e:  # noqa: BLE001
                fails += 1; print("FAIL", name, type(e).__name__, e)
    sys.exit(1 if fails else 0)
