"""One class per physical sensor. Each read() returns {metric_name: value}.

A sensor that cannot be found falls back to simulated values (HM_SIMULATE=1, the default),
so the whole pipeline runs on any machine. Set HM_SIMULATE=0 to treat a missing sensor as an error.
Metric names match the `metrics` table: heart_rate, spo2, body_temp, resp_rate, cabin_co2 ...
"""
import glob
import logging
import math
import random
import statistics
import threading
import time
from collections import deque
from typing import Dict

import config

MAX30102_ADDRESS = 0x57
SCD41_ADDRESS = 0x62
MAX30102_SAMPLE_RATE = 25  # 100 Hz configured rate with four-sample FIFO averaging.
log = logging.getLogger("sensors")


def _open_i2c_bus():
    try:
        from smbus2 import SMBus
    except ImportError as exc:
        raise RuntimeError("I2C sensors require smbus2; install the root requirements on the Raspberry Pi") from exc
    return SMBus(1)


def _scd41_crc(data: bytes) -> int:
    crc = 0xFF
    for byte in data:
        crc ^= byte
        for _ in range(8):
            crc = ((crc << 1) ^ 0x31) & 0xFF if crc & 0x80 else (crc << 1) & 0xFF
    return crc


def _scd41_word(data: bytes) -> int:
    if len(data) != 3 or _scd41_crc(data[:2]) != data[2]:
        raise IOError("SCD41 CRC error")
    return (data[0] << 8) | data[1]


def _decode_scd41_measurement(data: bytes) -> Dict[str, float]:
    if len(data) != 9:
        raise IOError("SCD41 returned an incomplete measurement")
    co2_ppm = _scd41_word(data[0:3])
    _scd41_word(data[3:6])
    _scd41_word(data[6:9])
    return {"cabin_co2": round(co2_ppm / 10000.0, 3)}


def _decode_max30102_samples(raw):
    if len(raw) % 6:
        raise IOError("MAX30102 returned an incomplete FIFO frame")
    samples = []
    for offset in range(0, len(raw), 6):
        red = ((raw[offset] << 16) | (raw[offset + 1] << 8) | raw[offset + 2]) & 0x3FFFF
        ir = ((raw[offset + 3] << 16) | (raw[offset + 4] << 8) | raw[offset + 5]) & 0x3FFFF
        samples.append((red, ir))
    return samples


def _estimate_max30102(red_samples, ir_samples, sample_rate=MAX30102_SAMPLE_RATE):
    if len(red_samples) != len(ir_samples) or len(ir_samples) < sample_rate * 4:
        raise RuntimeError("MAX30102 is warming up; keep a steady finger on the sensor")

    ir_dc = statistics.mean(ir_samples)
    red_dc = statistics.mean(red_samples)
    if ir_dc < 5000 or red_dc < 5000:
        raise RuntimeError("MAX30102 finger signal is too weak")

    window = max(3, round(sample_rate * 0.4))
    prefix = [0.0]
    for sample in ir_samples:
        prefix.append(prefix[-1] + sample)
    ac = []
    half = window // 2
    for index, sample in enumerate(ir_samples):
        start = max(0, index - half)
        end = min(len(ir_samples), index + half + 1)
        baseline = (prefix[end] - prefix[start]) / (end - start)
        ac.append(sample - baseline)

    threshold = statistics.pstdev(ac) * 0.2
    min_gap = round(sample_rate * 60 / 180)
    peaks = []
    for index in range(1, len(ac) - 1):
        if ac[index] <= threshold or ac[index] < ac[index - 1] or ac[index] <= ac[index + 1]:
            continue
        if peaks and index - peaks[-1] < min_gap:
            if ac[index] > ac[peaks[-1]]:
                peaks[-1] = index
        else:
            peaks.append(index)
    if len(peaks) < 3:
        raise RuntimeError("MAX30102 pulse signal is too weak or noisy")

    intervals = [right - left for left, right in zip(peaks, peaks[1:])]
    bpm = sample_rate * 60 / statistics.median(intervals)
    if not 35 <= bpm <= 200:
        raise RuntimeError("MAX30102 pulse estimate is outside the supported signal range")

    red_ac = math.sqrt(statistics.mean((sample - red_dc) ** 2 for sample in red_samples))
    ir_ac = math.sqrt(statistics.mean((sample - ir_dc) ** 2 for sample in ir_samples))
    if red_ac <= 0 or ir_ac <= 0:
        raise RuntimeError("MAX30102 oxygen signal is too weak")
    ratio = (red_ac / red_dc) / (ir_ac / ir_dc)
    spo2 = -45.060 * ratio ** 2 + 30.354 * ratio + 94.845
    if not 70 <= spo2 <= 100:
        raise RuntimeError("MAX30102 oxygen estimate is outside the supported signal range")
    return round(bpm, 1), round(spo2, 1)


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

    def close(self):
        pass


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
    """Experimental MAX30102 pulse and oxygen estimates over I2C."""
    name = "max30102"
    metrics = ("heart_rate", "spo2")

    def setup(self):
        self._samples = deque(maxlen=MAX30102_SAMPLE_RATE * 12)
        if config.SIMULATE:
            self.simulated = True
            return
        self._bus = _open_i2c_bus()
        if self._bus.read_byte_data(MAX30102_ADDRESS, 0xFF) != 0x15:
            raise RuntimeError("MAX30102 not found at I2C address 0x57")
        self._write_register(0x09, 0x40)
        deadline = time.monotonic() + 1.0
        while self._read_register(0x09) & 0x40:
            if time.monotonic() >= deadline:
                raise TimeoutError("MAX30102 reset did not complete")
            time.sleep(0.01)
        self._write_register(0x08, 0x4F)
        self._write_register(0x09, 0x03)
        self._write_register(0x0A, 0x27)
        self._write_register(0x0C, 0x24)
        self._write_register(0x0D, 0x24)
        for register in (0x04, 0x05, 0x06):
            self._write_register(register, 0)
        self._samples_lock = threading.Lock()
        self._reader_stop = threading.Event()
        self._reader_error = None
        self._reader_thread = threading.Thread(target=self._collect_fifo, name="max30102-fifo", daemon=True)
        self._reader_thread.start()

    def _read_hardware(self) -> Dict[str, float]:
        if self._reader_error is not None:
            raise RuntimeError("MAX30102 FIFO reader failed") from self._reader_error
        with self._samples_lock:
            samples = list(self._samples)
        red, ir = zip(*samples) if samples else ((), ())
        bpm, spo2 = _estimate_max30102(red, ir)
        return {"heart_rate": bpm, "spo2": spo2}

    def _collect_fifo(self):
        while not self._reader_stop.wait(0.05):
            try:
                with self._samples_lock:
                    self._read_fifo()
            except Exception as exc:
                self._reader_error = exc
                log.exception("MAX30102 FIFO polling failed")
                return

    def close(self):
        if self.simulated:
            return
        self._reader_stop.set()
        self._reader_thread.join(timeout=1)
        self._bus.close()

    def _read_register(self, register):
        return self._bus.read_byte_data(MAX30102_ADDRESS, register)

    def _write_register(self, register, value):
        self._bus.write_byte_data(MAX30102_ADDRESS, register, value)

    def _read_fifo(self):
        write_pointer = self._read_register(0x04) & 0x1F
        read_pointer = self._read_register(0x06) & 0x1F
        overflow = self._read_register(0x05) & 0x1F
        if overflow:
            self._write_register(0x05, 0)
            self._write_register(0x04, write_pointer)
            self._write_register(0x06, write_pointer)
            self._samples.clear()
            return
        available = (write_pointer - read_pointer) & 0x1F
        while available:
            count = min(available, 4)
            raw = self._bus.read_i2c_block_data(MAX30102_ADDRESS, 0x07, count * 6)
            if len(raw) != count * 6:
                raise IOError("MAX30102 returned an incomplete FIFO frame")
            self._samples.extend(_decode_max30102_samples(raw))
            available -= count

    def read(self):
        if self.simulated:
            return {"heart_rate": round(66 + _circadian(6) + random.gauss(0, 2), 1),
                    "spo2": round(min(100.0, 97.5 + random.gauss(0, 0.6)), 1)}
        return self._read_hardware()


class CabinSensor(Sensor):
    """SCD41 cabin CO2 sensor. Respiration is provided by simulation or the camera monitor."""
    name = "cabin"
    metrics = ("cabin_co2", "resp_rate")

    def setup(self):
        if config.SIMULATE:
            self.simulated = True
            return
        self._bus = _open_i2c_bus()
        from smbus2 import i2c_msg

        self._i2c_msg = i2c_msg
        self.metrics = ("cabin_co2",)
        self._command(0x3F86)
        time.sleep(0.5)
        self._command(0x21B1)

    def read(self):
        if self.simulated:
            return {"cabin_co2": round(max(0.05, 0.40 + random.gauss(0, 0.03)), 3),
                    "resp_rate": round(max(6.0, 15 + random.gauss(0, 1.2)), 1)}

        deadline = time.monotonic() + 6.0
        while True:
            ready = _scd41_word(self._read_command(0xE4B8, 3))
            if ready & 0x07FF:
                return _decode_scd41_measurement(self._read_command(0xEC05, 9))
            if time.monotonic() >= deadline:
                raise TimeoutError("SCD41 measurement did not become ready")
            time.sleep(0.1)

    def _command(self, command):
        message = self._i2c_msg.write(SCD41_ADDRESS, [command >> 8, command & 0xFF])
        self._bus.i2c_rdwr(message)

    def _read_command(self, command, size):
        self._command(command)
        time.sleep(0.001)
        message = self._i2c_msg.read(SCD41_ADDRESS, size)
        self._bus.i2c_rdwr(message)
        return bytes(message)

    def close(self):
        if not self.simulated:
            try:
                self._command(0x3F86)
            finally:
                self._bus.close()


def build_sensors():
    """Create every sensor; one that fails to start is reported but doesn't block the others."""
    sensors, errors = [], {}
    for cls in (TemperatureSensor, HeartRateSpO2Sensor, CabinSensor):
        try:
            sensors.append(cls())
        except Exception as e:  # noqa: BLE001
            errors[cls.name] = f"{type(e).__name__}: {e}"
    return sensors, errors
