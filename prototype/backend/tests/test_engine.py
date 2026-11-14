from __future__ import annotations

from app.engine import HealthEngine
from app.simulator import Simulator


def make_reading(**overrides):
    reading = {
        "recorded_at": "2026-01-01T00:00:00Z",
        "heart_rate": 68,
        "spo2": 98,
        "temperature_c": 36.7,
        "respiratory_rate": 15,
        "activity": "rest",
        "quality": "valid",
    }
    reading.update(overrides)
    return reading


def assessment_map(engine: HealthEngine, reading: dict) -> dict[str, object]:
    return {
        assessment.vital: assessment for assessment in engine.assess(reading)
    }


def test_normal_reading_is_normal():
    engine = HealthEngine()
    assessments = assessment_map(engine, make_reading())
    assert {item.status for item in assessments.values()} == {"normal"}


def test_elevated_heart_rate_at_rest_warns():
    engine = HealthEngine()
    assessments = assessment_map(engine, make_reading(heart_rate=130))
    heart = assessments["heart_rate"]
    assert heart.status == "warning"
    assert heart.condition == "heart_rate_high"


def test_critically_high_heart_rate():
    engine = HealthEngine()
    assessments = assessment_map(engine, make_reading(heart_rate=160))
    assert assessments["heart_rate"].status == "critical"


def test_activity_context_prevents_false_high_heart_rate():
    engine = HealthEngine()
    assessments = assessment_map(
        engine, make_reading(heart_rate=118, activity="active")
    )
    assert assessments["heart_rate"].status == "normal"


def test_low_spo2_is_critical():
    engine = HealthEngine()
    assessments = assessment_map(engine, make_reading(spo2=88))
    oxygen = assessments["spo2"]
    assert oxygen.status == "critical"
    assert "< 90%" in oxygen.threshold


def test_high_temperature_and_respiration():
    engine = HealthEngine()
    assessments = assessment_map(
        engine, make_reading(temperature_c=38.7, respiratory_rate=31)
    )
    assert assessments["temperature_c"].status == "warning"
    assert assessments["respiratory_rate"].status == "critical"


def test_out_of_range_sensor_value_is_not_physiological_alert():
    engine = HealthEngine()
    assessments = assessment_map(engine, make_reading(heart_rate=260))
    heart = assessments["heart_rate"]
    assert heart.status == "sensor_error"
    assert heart.condition == "heart_rate_sensor"
    assert heart.severity == "warning"


def test_baseline_learns_resting_heart_rate():
    engine = HealthEngine()
    for _ in range(30):
        reading = make_reading(heart_rate=60)
        assessments = engine.assess(reading)
        engine.update_baselines(reading, assessments)
    baseline = engine.baseline("heart_rate")
    assert baseline.samples == 30
    assert baseline.ready is True
    assert 59 <= baseline.mean <= 61


def test_light_activity_does_not_change_resting_heart_rate_baseline():
    engine = HealthEngine()
    reading = make_reading(heart_rate=90, activity="light")
    engine.update_baselines(reading, engine.assess(reading))
    assert engine.baseline("heart_rate").samples == 0


def test_normal_simulator_does_not_trigger_personal_alerts():
    simulator = Simulator(seed=7)
    engine = HealthEngine()
    for _ in range(60):
        reading = simulator.next_reading()
        assert reading is not None
        payload = reading.model_dump()
        assessments = engine.assess(payload)
        assert all(item.status == "normal" for item in assessments)
        engine.update_baselines(payload, assessments)


def test_resting_heart_rate_can_trigger_personal_baseline_warning():
    engine = HealthEngine()
    for _ in range(20):
        reading = make_reading(heart_rate=60)
        engine.update_baselines(reading, engine.assess(reading))
    assessments = assessment_map(engine, make_reading(heart_rate=92))
    heart = assessments["heart_rate"]
    assert heart.status == "warning"
    assert heart.condition == "heart_rate_high"
    assert "> 90" in heart.threshold


def test_personal_baseline_can_raise_warning_limits():
    engine = HealthEngine()
    for _ in range(20):
        reading = make_reading(spo2=99, temperature_c=36.7)
        engine.update_baselines(reading, engine.assess(reading))
    assessments = assessment_map(engine, make_reading(spo2=95, temperature_c=37.4))
    assert assessments["spo2"].status == "warning"
    assert assessments["temperature_c"].status == "warning"
