import math
import sys
from types import SimpleNamespace

import pytest


def _sensors():
    import sensors
    return sensors


def _encoded_word(value):
    sensors = _sensors()
    pair = bytes((value >> 8, value & 0xFF))
    return pair + bytes((sensors._scd41_crc(pair),))


def test_scd41_crc_matches_reference_vector():
    sensors = _sensors()
    assert sensors._scd41_crc(bytes((0xBE, 0xEF))) == 0x92


def test_scd41_decodes_co2_and_validates_all_word_crcs():
    sensors = _sensors()
    packet = _encoded_word(5000) + _encoded_word(25000) + _encoded_word(30000)
    assert sensors._decode_scd41_measurement(packet) == {"cabin_co2": 0.5}

    corrupted = packet[:-1] + bytes((packet[-1] ^ 0x01,))
    with pytest.raises(IOError, match="CRC"):
        sensors._decode_scd41_measurement(corrupted)


def test_max30102_decodes_fifo_samples_and_rejects_partial_frames():
    sensors = _sensors()
    raw = bytes((0x03, 0x01, 0x02, 0x02, 0x03, 0x04))
    assert sensors._decode_max30102_samples(raw) == [(0x30102, 0x20304)]
    with pytest.raises(IOError, match="incomplete"):
        sensors._decode_max30102_samples(raw[:-1])


def test_max30102_estimator_tracks_synthetic_pulse_rate():
    sensors = _sensors()
    count = sensors.MAX30102_SAMPLE_RATE * 12
    red = [round(90000 + 2000 * math.sin(2 * math.pi * 1.2 * i / sensors.MAX30102_SAMPLE_RATE))
           for i in range(count)]
    ir = [round(100000 + 5000 * math.sin(2 * math.pi * 1.2 * i / sensors.MAX30102_SAMPLE_RATE))
          for i in range(count)]

    heart_rate, spo2 = sensors._estimate_max30102(red, ir)
    assert 68 <= heart_rate <= 76
    assert 95 <= spo2 <= 100


class _FakeI2CMessage:
    def __init__(self, operation, address, data):
        self.operation = operation
        self.address = address
        self.data = data

    def __bytes__(self):
        return self.data


class _FakeI2CMessageFactory:
    @staticmethod
    def write(address, data):
        return _FakeI2CMessage("write", address, bytes(data))

    @staticmethod
    def read(address, size):
        return _FakeI2CMessage("read", address, bytes(size))


class _FakeSCD41Bus:
    def __init__(self):
        self.command = None
        self.closed = False

    def i2c_rdwr(self, message):
        if message.operation == "write":
            self.command = int.from_bytes(message.data, "big")
        elif self.command == 0xE4B8:
            message.data = _encoded_word(1)
        elif self.command == 0xEC05:
            message.data = _encoded_word(5000) + _encoded_word(25000) + _encoded_word(30000)
        else:
            raise AssertionError("Unexpected SCD41 read command")

    def close(self):
        self.closed = True


def test_scd41_hardware_mode_reports_co2_only_and_closes_bus(monkeypatch):
    sensors = _sensors()
    bus = _FakeSCD41Bus()
    monkeypatch.setattr(sensors.config, "SIMULATE", False)
    monkeypatch.setattr(sensors, "_open_i2c_bus", lambda: bus)
    monkeypatch.setattr(sensors.time, "sleep", lambda _: None)
    monkeypatch.setitem(sys.modules, "smbus2", SimpleNamespace(i2c_msg=_FakeI2CMessageFactory))

    sensor = sensors.CabinSensor()
    try:
        assert sensor.metrics == ("cabin_co2",)
        assert sensor.read() == {"cabin_co2": 0.5}
    finally:
        sensor.close()
    assert bus.closed
