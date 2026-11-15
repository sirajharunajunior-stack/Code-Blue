"""All settings come from environment variables (HM_*), with safe defaults."""
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))


def _bool(name: str, default: bool) -> bool:
    return os.environ.get(name, str(default)).strip().lower() in ("1", "true", "yes", "on")


def _number(name: str, default, cast=float):
    """Read a numeric setting, failing loudly instead of starting misconfigured."""
    raw = os.environ.get(name)
    if raw is None or raw.strip() == "":
        return default
    try:
        return cast(raw)
    except ValueError as exc:
        raise RuntimeError(f"{name} must be a number, got {raw!r}") from exc


DB_PATH = os.environ.get("HM_DB", os.path.join(BASE_DIR, "health.db"))
MODEL_PATH = os.environ.get("HM_MODEL", os.path.join(BASE_DIR, "model.json"))

HOST = os.environ.get("HM_HOST", "0.0.0.0")
PORT = _number("HM_PORT", 8000, int)
if not 0 < PORT < 65536:
    raise RuntimeError("HM_PORT must be between 1 and 65535")

# If set, every /api route except /api/health needs an X-API-Token header.
# Read at request time (config.API_TOKEN), so it can be changed in tests.
API_TOKEN = os.environ.get("HM_API_TOKEN", "").strip()

# The Pi's own live sensors are stored under this subject id.
LOCAL_SUBJECT = os.environ.get("HM_LOCAL_SUBJECT", "local")
SAMPLE_SECONDS = _number("HM_SAMPLE_SECONDS", 5.0)
if SAMPLE_SECONDS <= 0:
    raise RuntimeError("HM_SAMPLE_SECONDS must be greater than zero")
SAMPLER_ENABLED = _bool("HM_SAMPLER", True)
SIMULATE = _bool("HM_SIMULATE", True)          # fall back to simulated values
RETENTION_DAYS = _number("HM_RETENTION_DAYS", 30, int)  # live subject only
if RETENTION_DAYS < 1:
    raise RuntimeError("HM_RETENTION_DAYS must be at least 1")

# Alert engine
ALERT_CONSECUTIVE = _number("HM_ALERT_CONSECUTIVE", 3, int)
ALERT_COOLDOWN_S = _number("HM_ALERT_COOLDOWN_S", 300.0)
BASELINE_Z = _number("HM_BASELINE_Z", 3.5)
if ALERT_CONSECUTIVE < 1:
    raise RuntimeError("HM_ALERT_CONSECUTIVE must be at least 1")
if ALERT_COOLDOWN_S < 0:
    raise RuntimeError("HM_ALERT_COOLDOWN_S cannot be negative")
if BASELINE_Z <= 0:
    raise RuntimeError("HM_BASELINE_Z must be greater than zero")

CORS_ORIGINS = [o.strip() for o in os.environ.get("HM_CORS", "").split(",") if o.strip()]
