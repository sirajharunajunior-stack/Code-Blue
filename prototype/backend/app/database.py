from __future__ import annotations

import json
import sqlite3
from contextlib import contextmanager
from pathlib import Path
from typing import Any, Iterator

from .utils import iso_now

SCHEMA = """
CREATE TABLE IF NOT EXISTS readings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    recorded_at TEXT NOT NULL,
    heart_rate REAL,
    spo2 REAL,
    temperature_c REAL,
    respiratory_rate REAL,
    activity TEXT NOT NULL,
    quality TEXT NOT NULL,
    error TEXT,
    is_demo INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_readings_recorded_at
    ON readings(recorded_at);

CREATE TABLE IF NOT EXISTS alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    alert_key TEXT NOT NULL,
    condition TEXT NOT NULL,
    vital TEXT NOT NULL,
    severity TEXT NOT NULL,
    title TEXT NOT NULL,
    value REAL,
    unit TEXT,
    threshold TEXT NOT NULL,
    detected_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    acknowledged_at TEXT,
    resolved_at TEXT,
    ai_status TEXT NOT NULL,
    explanation TEXT NOT NULL,
    recommendation TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_alerts_one_active_per_key
    ON alerts(alert_key) WHERE resolved_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_alerts_detected_at
    ON alerts(detected_at);

CREATE TABLE IF NOT EXISTS baselines (
    vital TEXT PRIMARY KEY,
    mean REAL NOT NULL,
    std REAL NOT NULL,
    samples INTEGER NOT NULL,
    updated_at TEXT NOT NULL
);
"""


def _row_to_reading(row: sqlite3.Row) -> dict[str, Any]:
    data = dict(row)
    data["is_demo"] = bool(data["is_demo"])
    return data


def _row_to_alert(row: sqlite3.Row) -> dict[str, Any]:
    data = dict(row)
    try:
        data["explanation"] = json.loads(data["explanation"])
    except (TypeError, json.JSONDecodeError):
        data["explanation"] = {}
    if data.get("resolved_at"):
        data["status"] = "resolved"
    elif data.get("acknowledged_at"):
        data["status"] = "acknowledged"
    else:
        data["status"] = "active"
    return data


class Database:
    def __init__(self, path: Path) -> None:
        self.path = Path(path)

    def _connect(self) -> sqlite3.Connection:
        connection = sqlite3.connect(self.path, timeout=10)
        connection.row_factory = sqlite3.Row
        connection.execute("PRAGMA journal_mode=WAL")
        connection.execute("PRAGMA foreign_keys=ON")
        return connection

    @contextmanager
    def _connection(self) -> Iterator[sqlite3.Connection]:
        connection = self._connect()
        try:
            yield connection
            connection.commit()
        finally:
            connection.close()

    def initialize(self) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        with self._connection() as connection:
            connection.executescript(SCHEMA)

    def insert_reading(self, reading: dict[str, Any]) -> dict[str, Any]:
        with self._connection() as connection:
            cursor = connection.execute(
                """
                INSERT INTO readings (
                    recorded_at, heart_rate, spo2, temperature_c,
                    respiratory_rate, activity, quality, error, is_demo
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    reading["recorded_at"],
                    reading.get("heart_rate"),
                    reading.get("spo2"),
                    reading.get("temperature_c"),
                    reading.get("respiratory_rate"),
                    reading.get("activity", "rest"),
                    reading.get("quality", "valid"),
                    reading.get("error"),
                    1,
                ),
            )
            row = connection.execute(
                "SELECT * FROM readings WHERE id = ?", (cursor.lastrowid,)
            ).fetchone()
        return _row_to_reading(row)

    def recent_readings(self, limit: int = 120) -> list[dict[str, Any]]:
        limit = max(1, min(limit, 2000))
        with self._connection() as connection:
            rows = connection.execute(
                """
                SELECT * FROM (
                    SELECT * FROM readings ORDER BY id DESC LIMIT ?
                ) ORDER BY id ASC
                """,
                (limit,),
            ).fetchall()
        return [_row_to_reading(row) for row in rows]

    def latest_reading(self) -> dict[str, Any] | None:
        with self._connection() as connection:
            row = connection.execute(
                "SELECT * FROM readings ORDER BY id DESC LIMIT 1"
            ).fetchone()
        return _row_to_reading(row) if row else None

    def get_alert(self, alert_id: int) -> dict[str, Any] | None:
        with self._connection() as connection:
            row = connection.execute(
                "SELECT * FROM alerts WHERE id = ?", (alert_id,)
            ).fetchone()
        return _row_to_alert(row) if row else None

    def get_active_alert(self, alert_key: str) -> dict[str, Any] | None:
        with self._connection() as connection:
            row = connection.execute(
                "SELECT * FROM alerts WHERE alert_key = ? AND resolved_at IS NULL",
                (alert_key,),
            ).fetchone()
        return _row_to_alert(row) if row else None

    def list_alerts(
        self, limit: int = 30, active_only: bool = False
    ) -> list[dict[str, Any]]:
        limit = max(1, min(limit, 200))
        where = "WHERE resolved_at IS NULL" if active_only else ""
        with self._connection() as connection:
            rows = connection.execute(
                f"SELECT * FROM alerts {where} ORDER BY id DESC LIMIT ?",
                (limit,),
            ).fetchall()
        return [_row_to_alert(row) for row in rows]

    def create_alert(self, alert: dict[str, Any]) -> dict[str, Any]:
        try:
            with self._connection() as connection:
                cursor = connection.execute(
                    """
                    INSERT INTO alerts (
                        alert_key, condition, vital, severity, title, value,
                        unit, threshold, detected_at, updated_at, ai_status,
                        explanation, recommendation
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        alert["alert_key"],
                        alert["condition"],
                        alert["vital"],
                        alert["severity"],
                        alert["title"],
                        alert.get("value"),
                        alert.get("unit"),
                        alert["threshold"],
                        alert["detected_at"],
                        alert["updated_at"],
                        alert["ai_status"],
                        json.dumps(alert["explanation"]),
                        alert["recommendation"],
                    ),
                )
                alert_id = cursor.lastrowid
        except sqlite3.IntegrityError:
            existing = self.get_active_alert(alert["alert_key"])
            if existing is None:
                raise
            return existing
        created = self.get_alert(alert_id)
        assert created is not None
        return created

    def update_active_alert(
        self,
        alert_id: int,
        *,
        severity: str,
        value: float | None,
        updated_at: str,
        clear_acknowledged: bool = False,
        explanation: dict[str, Any] | None = None,
        recommendation: str | None = None,
        ai_status: str | None = None,
        threshold: str | None = None,
        title: str | None = None,
    ) -> dict[str, Any] | None:
        assignments = [
            "severity = ?",
            "value = ?",
            "updated_at = ?",
        ]
        parameters: list[Any] = [severity, value, updated_at]
        if clear_acknowledged:
            assignments.append("acknowledged_at = NULL")
        if explanation is not None:
            assignments.append("explanation = ?")
            parameters.append(json.dumps(explanation))
        if recommendation is not None:
            assignments.append("recommendation = ?")
            parameters.append(recommendation)
        if ai_status is not None:
            assignments.append("ai_status = ?")
            parameters.append(ai_status)
        if threshold is not None:
            assignments.append("threshold = ?")
            parameters.append(threshold)
        if title is not None:
            assignments.append("title = ?")
            parameters.append(title)
        parameters.append(alert_id)
        with self._connection() as connection:
            connection.execute(
                f"UPDATE alerts SET {', '.join(assignments)} WHERE id = ?",
                parameters,
            )
        return self.get_alert(alert_id)

    def set_alert_ai(
        self,
        alert_id: int,
        *,
        explanation: dict[str, Any],
        recommendation: str,
        ai_status: str,
    ) -> dict[str, Any] | None:
        with self._connection() as connection:
            connection.execute(
                """
                UPDATE alerts
                SET explanation = ?, recommendation = ?, ai_status = ?, updated_at = ?
                WHERE id = ?
                """,
                (
                    json.dumps(explanation),
                    recommendation,
                    ai_status,
                    iso_now(),
                    alert_id,
                ),
            )
        return self.get_alert(alert_id)

    def acknowledge_alert(self, alert_id: int) -> dict[str, Any] | None:
        acknowledged_at = iso_now()
        with self._connection() as connection:
            connection.execute(
                """
                UPDATE alerts SET acknowledged_at = COALESCE(acknowledged_at, ?)
                WHERE id = ? AND resolved_at IS NULL
                """,
                (acknowledged_at, alert_id),
            )
        return self.get_alert(alert_id)

    def resolve_active_alerts_for_vital(self, vital: str) -> int:
        with self._connection() as connection:
            cursor = connection.execute(
                """
                UPDATE alerts SET resolved_at = ?, updated_at = ?
                WHERE vital = ? AND resolved_at IS NULL
                """,
                (iso_now(), iso_now(), vital),
            )
        return cursor.rowcount

    def resolve_active_alert_for_key(self, alert_key: str) -> int:
        with self._connection() as connection:
            cursor = connection.execute(
                """
                UPDATE alerts SET resolved_at = ?, updated_at = ?
                WHERE alert_key = ? AND resolved_at IS NULL
                """,
                (iso_now(), iso_now(), alert_key),
            )
        return cursor.rowcount

    def save_baseline(
        self, vital: str, mean: float, std: float, samples: int
    ) -> None:
        with self._connection() as connection:
            connection.execute(
                """
                INSERT INTO baselines (vital, mean, std, samples, updated_at)
                VALUES (?, ?, ?, ?, ?)
                ON CONFLICT(vital) DO UPDATE SET
                    mean = excluded.mean,
                    std = excluded.std,
                    samples = excluded.samples,
                    updated_at = excluded.updated_at
                """,
                (vital, mean, std, samples, iso_now()),
            )

    def load_baselines(self) -> list[dict[str, Any]]:
        with self._connection() as connection:
            rows = connection.execute(
                "SELECT * FROM baselines ORDER BY vital"
            ).fetchall()
        return [dict(row) for row in rows]
