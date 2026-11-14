"""One class per physical sensor. Each read() returns {metric_name: value}.

A sensor that cannot be found falls back to simulated values (HM_SIMULATE=1, the default),
so the whole pipeline runs on any machine. Set HM_SIMULATE=0 to treat a missing sensor as an error.
Metric names match the `metrics` table: heart_rate, spo2, body_temp, resp_rate, cabin_co2 ...
"""
import glob
import math
import random
import time
from typing import Dict

import config


class Sensor:
    name = "sensor"
    metrics: tuple = ()

    def __init__(self):
        self.simulated = False
        self.setup()

    def setup(self):
        pass

    def read(self) -> Dict[str, float]:
        raise NotImplementedError


def _circadian(amp: float, period_s: float = 86400.0) -> float:
    return amp * math.sin(2 * math.pi * time.time() / period_s)


class TemperatureSensor(Sensor):
    """DS18B20 on the Pi 1-Wire bus (/sys/bus/w1/devices/28-*), else simulated."""
    name = "temperature"
    metrics = ("body_temp",)

    def setup(self):
        self.path = next(iter(glob.glob("/sys/bus/w1/devices/28-*/w1_slave")), None)
        if not self.path:
            if not config.SIMULATE:
                raise RuntimeError("DS18B20 not found")
            self.simulated = True

    def read(self):
        if self.simulated:
            return {"body_temp": round(36.9 + _circadian(0.25) + random.gauss(0, 0.08), 2)}
        with open(self.path) as f:
            lines = f.read().splitlines()
        if not lines[0].endswith("YES"):
            raise IOError("DS18B20 CRC error")
        return {"body_temp": round(int(lines[1].split("t=")[1]) / 1000.0, 2)}


class HeartRateSpO2Sensor(Sensor):
    """MAX30102 (I2C). TODO: implement `_read_hardware` with a MAX30102 driver.
    Until then it is simulated. With HM_SIMULATE=0 it raises, and the failure is shown in /api/health."""
    name = "max30102"
    metrics = ("heart_rate", "spo2")

    def setup(self):
        self.simulated = True
        if not config.SIMULATE:
            raise NotImplementedError("MAX30102 driver not written yet (see sensors.py)")

    def _read_hardware(self) -> Dict[str, float]:
        raise NotImplementedError

    def read(self):
        return {"heart_rate": round(66 + _circadian(6) + random.gauss(0, 2), 1),
                "spo2": round(min(100.0, 97.5 + random.gauss(0, 0.6)), 1)}


class CabinSensor(Sensor):
    """Cabin air (CO2 %, breathing rate). Simulated; replace with an NDIR CO2 sensor (e.g. SCD30/SCD41)."""
    name = "cabin"
    metrics = ("cabin_co2", "resp_rate")

    def setup(self):
        self.simulated = True

    def read(self):
        return {"cabin_co2": round(max(0.05, 0.40 + random.gauss(0, 0.03)), 3),
                "resp_rate": round(max(6.0, 15 + random.gauss(0, 1.2)), 1)}


def build_sensors():
    """Create every sensor; one that fails to start is reported but doesn't block the others."""
    sensors, errors = [], {}
    for cls in (TemperatureSensor, HeartRateSpO2Sensor, CabinSensor):
        try:
            sensors.append(cls())
        except Exception as e:  # noqa: BLE001
            errors[cls.name] = f"{type(e).__name__}: {e}"
    return sensors, errors
