"""Tests for the safety-precautions feature. No FastAPI needed.
Run:  python tests/test_advice.py     (or: pytest -q tests/test_advice.py)"""
import os
import shutil
import sys
import tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)
_tmp = tempfile.mkdtemp()
os.environ["HM_DB"] = os.path.join(_tmp, "test.db")
os.environ["HM_MODEL"] = os.path.join(_tmp, "model.json")
shutil.copy(os.path.join(ROOT, "health.db"), os.environ["HM_DB"])

import advice  # noqa: E402
import db  # noqa: E402
import levels  # noqa: E402
import service  # noqa: E402

db.init()
db.add_subject("advice-test", "Advice test subject")
FLAGGABLE = ("slightly_abnormal", "needs_checkup", "critical")


def test_library_is_complete():
    lib = advice.library()
    assert lib["disclaimer"] and lib["check_first"] and lib["emergency_signs"]
    for lvl in FLAGGABLE:
        assert lib["general"][lvl]["steps"]
    assert len(lib["conditions"]) == 11
    for cid, c in lib["conditions"].items():
        assert c["name"] and c["indicates"] and c["seek_urgent_help_if"], cid
        for lvl in FLAGGABLE:
            assert len(c[lvl]) >= 2, (cid, lvl)


def test_every_flaggable_metric_has_a_condition():
    specs = db.metrics()
    expect = {"heart_rate": 2, "body_temp": 2, "spo2": 1, "resp_rate": 1, "bp_systolic": 1, "bp_diastolic": 1,
              "cabin_co2": 1, "sleep_hours": 1, "exercise_hours": 1, "radiation": 1}
    for m, n in expect.items():
        assert m in specs, m
        assert len(advice._sides()[m]) == n, m


def test_direction_picks_the_right_condition():
    sp = db.metrics()
    pick = lambda m, v: advice.advice_for(m, v, "needs_checkup", sp[m])["condition"]
    assert pick("heart_rate", 100) == "fast_heart_rate"
    assert pick("heart_rate", 45) == "slow_heart_rate"
    assert pick("body_temp", 38.5) == "fever"
    assert pick("body_temp", 35.5) == "low_body_temperature"
    assert pick("spo2", 92) == "low_blood_oxygen"
    assert advice.advice_for("heart_rate", 65, "normal", sp["heart_rate"]) is None


def test_advice_for_each_astronaut_is_well_formed():
    for sid in ("A1", "A2", "A3"):
        j = service.advice_for_subject(sid)
        assert j["disclaimer"] and j["emergency_signs"]
        codes = [levels.CODE[a["level"]] for a in j["advice"]]
        assert codes == sorted(codes, reverse=True)
        for a in j["advice"]:
            assert a["level"] != "normal" and a["steps"] and a["general_steps"] and a["metrics"]


def test_critical_reading_gets_emergency_steps():
    assert db.add_reading("advice-test", "spo2", 85.0) == "critical"
    a = {x["condition"]: x for x in service.advice_for_subject("advice-test")["advice"]}["low_blood_oxygen"]
    assert a["level"] == "critical" and any("oxygen" in s.lower() for s in a["steps"])
    assert any("medical emergency" in s.lower() for s in a["general_steps"])


def test_blood_pressure_systolic_and_diastolic_merge():
    db.add_reading("advice-test", "bp_systolic", 170.0)
    db.add_reading("advice-test", "bp_diastolic", 105.0)
    bp = [x for x in service.advice_for_subject("advice-test")["advice"] if x["condition"] == "high_blood_pressure"]
    assert len(bp) == 1 and set(bp[0]["metrics"]) == {"bp_systolic", "bp_diastolic"} and bp[0]["level"] == "critical"


def test_unknown_subject_and_library_endpoint():
    try:
        service.advice_for_subject("ZZ")
    except service.NotFound:
        pass
    else:
        raise AssertionError("expected NotFound")
    assert service.precautions()["conditions"]["fever"]["name"].startswith("Fever")


if __name__ == "__main__":
    fails = 0
    for name, fn in list(globals().items()):
        if name.startswith("test_"):
            try:
                fn(); print("PASS", name)
            except Exception as e:  # noqa: BLE001
                fails += 1; print("FAIL", name, type(e).__name__, e)
    sys.exit(1 if fails else 0)
