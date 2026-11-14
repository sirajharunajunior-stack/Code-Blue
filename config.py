"""All settings come from environment variables (HM_*), with safe defaults."""
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))


def _bool(name: str, default: bool) -> bool:
    return os.environ.get(name, str(default)).strip().lower() in ("1", "true", "yes", "on")


DB_PATH = os.environ.get("HM_DB", os.path.join(BASE_DIR, "health.db"))
MODEL_PATH = os.environ.get("HM_MODEL", os.path.join(BASE_DIR, "model.json"))

HOST = os.environ.get("HM_HOST", "0.0.0.0")
PORT = int(os.environ.get("HM_PORT", "8000"))

# If set, every /api route except /api/health needs an X-API-Token header.
# Read at request time (config.API_TOKEN), so it can be changed in tests.
API_TOKEN = os.environ.get("HM_API_TOKEN", "")

# The Pi's own live sensors are stored under this subject id.
LOCAL_SUBJECT = os.environ.get("HM_LOCAL_SUBJECT", "local")
SAMPLE_SECONDS = float(os.environ.get("HM_SAMPLE_SECONDS", "5"))
SAMPLER_ENABLED = _bool("HM_SAMPLER", True)
SIMULATE = _bool("HM_SIMULATE", True)          # fall back to simulated values
RETENTION_DAYS = int(os.environ.get("HM_RETENTION_DAYS", "30"))  # live subject only

# Alert engine
ALERT_CONSECUTIVE = int(os.environ.get("HM_ALERT_CONSECUTIVE", "3"))
ALERT_COOLDOWN_S = float(os.environ.get("HM_ALERT_COOLDOWN_S", "300"))
BASELINE_Z = float(os.environ.get("HM_BASELINE_Z", "3.5"))

CORS_ORIGINS = [o for o in os.environ.get("HM_CORS", "").split(",") if o]
