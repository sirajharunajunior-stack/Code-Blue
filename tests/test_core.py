"""Tests for the logic behind the API. No FastAPI needed.
Run:  python tests/test_core.py     (or: pytest -q tests/test_core.py)
Initializes an isolated database from the committed demo snapshot."""
import json
import os
import sys
import tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)

_tmp = tempfile.mkdtemp()
os.environ["HM_DB"] = os.path.join(_tmp, "test.db")
os.environ["HM_MODEL"] = os.path.join(_tmp, "model.json")

import alerts as alerts_mod  # noqa: E402
import config  # noqa: E402
import db  # noqa: E402
import levels  # noqa: E402
import sampler as sampler_mod  # noqa: E402
import sensors as sensors_mod  # noqa: E402
import service  # noqa: E402
import train  # noqa: E402

db.init()
LV = ("normal", "slightly_abnormal", "needs_checkup", "critical")


def raises(exc, fn, *a):
    try:
        fn(*a)
    except exc:
        return True
    return False


def test_every_stored_level_is_reproduced():
    m = db.metrics()
    with db.conn() as c:
        # astronaut data only: a running server also stores live readings under 'local'
        rows = c.execute("SELECT metric,value,status,level FROM readings WHERE subject_id IN ('A1','A2','A3')").fetchall()
    assert len(rows) == 3528
    for r in rows:
        lv = levels.classify(m[r["metric"]], r["value"])
        assert (lv, levels.STATUS[lv]) == (r["level"], r["status"])


def test_level_boundaries():
    hr = db.metrics()["heart_rate"]
    assert [levels.classify(hr, v) for v in (65, 80, 95, 120, 45, 35)] == \
        ["normal", "slightly_abnormal", "needs_checkup", "critical", "needs_checkup", "critical"]
    bp = db.metrics()["bp_systolic"]                   # one-sided: low is fine
    assert levels.classify(bp, 100) == "normal" and levels.classify(bp, 130) == "slightly_abnormal"


def test_subjects_latest_history():
    assert {"A1", "A2", "A3"} <= {s["id"] for s in service.subjects()}
    j = service.latest("A1")
    assert len(j["latest"]) == 7 and j["overall_level"] in LV
    h = service.history("A1", "heart_rate")
    assert len(h) == 168 and {"ts", "value", "status", "level"} <= set(h[0])
    assert service.history("A1", "heart_rate", minutes=60)
    assert len(service.history("A1", "heart_rate", limit=10)) == 10
    assert raises(service.NotFound, service.history, "A1", "nope")
    assert raises(service.NotFound, service.latest, "ZZ")
    assert raises(service.BadRequest, service.history, "A1", "sleep_hours")


def test_levels_and_colors():
    j = service.levels_info()
    assert [l["name"] for l in j["levels"]] == list(LV)
    assert all(l["color"].startswith("#") for l in j["levels"]) and "heart_rate" in j["ranges"]


def test_crew_sorted_worst_first():
    crew = service.crew()
    codes = [levels.CODE[c["overall_level"]] for c in crew]
    assert codes == sorted(codes, reverse=True)
    assert all({"color", "label", "flagged"} <= set(c) for c in crew)


def test_radiation_and_environment():
    assert service.radiation("A1")["normal_max_mSv_day"] == 1.3
    assert service.radiation("A1")["career_limit_mSv"] == 600
    service.set_environment("A1", "planetary_surface")
    assert service.radiation("A1")["normal_max_mSv_day"] == 0.9
    assert raises(service.BadRequest, service.set_environment, "A1", "mars")
    service.set_environment("A1", "free_space")
    r = service.radiation("A3")
    assert r["cumulative_mSv"] > 0 and r["projected_days_to_limit"] > 0


def test_daily_alerts_export():
    assert len(service.daily("A3")) == 7
    assert len(service.alerts("A2", 500)) >= 30
    lines = "".join(service.export_csv("A1")).splitlines()
    assert lines[0] == "timestamp,metric,value,status" and len(lines) == 1177
    assert raises(service.NotFound, lambda: next(service.export_csv("ZZ")))


def test_alert_engine_rules():
    config.ALERT_COOLDOWN_S = 0
    sent = []
    eng = alerts_mod.AlertEngine(notifiers=[sent.append], baseline=alerts_mod.Baseline("/nonexistent"))
    n0 = len(db.alerts("T1", 100))
    # critical fires immediately
    assert len(eng.check("T1", "heart_rate", 130, "critical", ts=1000)) == 1
    # needs_checkup fires only on the 3rd in a row
    out = [eng.check("T1", "heart_rate", 100, "needs_checkup", ts=2000 + i) for i in range(3)]
    assert [len(o) for o in out] == [0, 0, 1]
    # a normal reading resets the streak
    eng.check("T1", "heart_rate", 70, "normal", ts=3000)
    assert eng.check("T1", "heart_rate", 100, "needs_checkup", ts=3001) == []
    assert len(db.alerts("T1", 100)) - n0 == 2 and len(sent) == 2


def test_cooldown_and_broken_notifier():
    config.ALERT_COOLDOWN_S = 300
    def bad(a): raise RuntimeError("boom")
    sent = []
    eng = alerts_mod.AlertEngine(notifiers=[bad, sent.append], baseline=alerts_mod.Baseline("/nonexistent"))
    assert len(eng.check("T2", "spo2", 85, "critical", ts=5000)) == 1
    assert eng.check("T2", "spo2", 85, "critical", ts=5010) == []          # inside cooldown
    assert len(eng.check("T2", "spo2", 85, "critical", ts=5400)) == 1      # after cooldown
    assert len(sent) == 2                                                   # broken notifier didn't block
    config.ALERT_COOLDOWN_S = 0


def test_alert_persistence_failure_does_not_start_cooldown():
    eng = alerts_mod.AlertEngine(notifiers=[], baseline=alerts_mod.Baseline("/nonexistent"))
    original = db.add_alert
    attempts = 0

    def fail_once(*args, **kwargs):
        nonlocal attempts
        attempts += 1
        if attempts == 1:
            raise OSError("database unavailable")
        return original(*args, **kwargs)

    db.add_alert = fail_once
    try:
        assert raises(OSError, eng.check, "T3", "spo2", 85, "critical", 6000)
        assert len(eng.check("T3", "spo2", 85, "critical", 6001)) == 1
    finally:
        db.add_alert = original


def test_concurrent_alert_checks_respect_one_cooldown():
    from concurrent.futures import ThreadPoolExecutor

    previous_cooldown = config.ALERT_COOLDOWN_S
    config.ALERT_COOLDOWN_S = 300
    try:
        eng = alerts_mod.AlertEngine(notifiers=[], baseline=alerts_mod.Baseline("/nonexistent"))
        with ThreadPoolExecutor(max_workers=8) as pool:
            results = list(pool.map(
                lambda _: eng.check("T4", "spo2", 85, "critical", 7000),
                range(8)))
        assert sum(len(result) for result in results) == 1
        assert len([a for a in db.alerts("T4", 100) if a["level"] == "critical"]) == 1
    finally:
        config.ALERT_COOLDOWN_S = previous_cooldown


def test_disabled_simulation_does_not_report_cabin_sensor():
    previous_simulation = config.SIMULATE
    try:
        config.SIMULATE = False
        assert raises(NotImplementedError, sensors_mod.CabinSensor)
    finally:
        config.SIMULATE = previous_simulation


def test_new_database_bootstraps_and_reinitializes():
    original_path = config.DB_PATH
    try:
        with tempfile.TemporaryDirectory() as directory:
            config.DB_PATH = os.path.join(directory, "fresh.db")
            db.init()
            first = len(db.history("A1", "heart_rate"))
            db.init()
            assert first == 168 and len(db.history("A1", "heart_rate")) == first
            assert {"A1", "A2", "A3", config.LOCAL_SUBJECT} <= {s["id"] for s in db.subjects()}
    finally:
        config.DB_PATH = original_path


def test_train_and_baseline_drift():
    mdl = train.train(config.DB_PATH, config.MODEL_PATH)
    assert {"A1", "A2", "A3"} <= set(mdl["subjects"]) and "heart_rate" in mdl["subjects"]["A1"]
    base = alerts_mod.Baseline(config.MODEL_PATH)
    assert base.loaded
    hour0 = mdl["subjects"]["A1"]["heart_rate"]["hours"]["0"]["mean"]   # 1794614400 is 00:00 UTC
    assert abs(base.zscore("A1", "heart_rate", 1794614400, hour0)) < 0.01
    assert base.zscore("A1", "heart_rate", 1794614400, 120.0) > 10      # far above this person's night-time normal
    config.ALERT_COOLDOWN_S = 0
    eng = alerts_mod.AlertEngine(notifiers=[], baseline=base)
    # 3 values far from this person's normal (still inside the hard limits) -> baseline alert
    got = [eng.check("A1", "heart_rate", 120.0, "critical", ts=9000 + i) for i in range(3)]
    assert any(a["source"] == "baseline" for o in got for a in o)


def test_sampler_writes_live_readings():
    config.ALERT_COOLDOWN_S = 300
    s = sampler_mod.Sampler(alerts_mod.AlertEngine(notifiers=[], baseline=alerts_mod.Baseline("/nonexistent")))
    s.sample_once()
    assert all(v["ok"] for v in s.status.values()) and s.status
    j = service.latest(config.LOCAL_SUBJECT)
    assert {r["metric"] for r in j["latest"]} == {"heart_rate", "spo2", "body_temp", "resp_rate", "cabin_co2"}
    # astronaut data is untouched by live sampling and retention
    db.prune_live()
    assert len(service.history("A1", "heart_rate")) == 168


if __name__ == "__main__":
    fails = 0
    for name, fn in list(globals().items()):
        if name.startswith("test_"):
            try:
                fn(); print("PASS", name)
            except Exception as e:  # noqa: BLE001
                fails += 1; print("FAIL", name, type(e).__name__, e)
    sys.exit(1 if fails else 0)