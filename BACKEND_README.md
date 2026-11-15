# Astronaut Health Monitor

## Prototype 1: live AI crew monitor

The current runnable prototype lives in [`prototype/`](prototype/README.md). It
adds a simulated live wearable, FastAPI/WebSocket monitoring service, SQLite
history, rule-based alerting with personal baselines, optional OpenAI-compatible
AI explanations, and a React/Tailwind/Recharts dashboard.

Quick start:

```bash
cd prototype/backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

```bash
cd prototype/frontend
npm install
npm run dev
```

Open `http://localhost:5173`. All data is simulated demo data and the prototype
is not for medical decisions. See [`prototype/README.md`](prototype/README.md)
for configuration, demo controls, API details, and tests.

## Legacy: Raspberry Pi backend

Offline backend for a Raspberry Pi. It serves the astronaut dataset (A1–A3) from `health.db`,
reads the Pi's own sensors (subject `local`), classifies everything into four health levels,
and raises alerts. It is **not a medical device**; levels are informational.

## Run

    pip install -r requirements.txt
    python main.py                      # http://<pi-ip>:8000/docs

`health.db` must be next to `main.py` (or set `HM_DB=/path/to/health.db`).

## Frontend

`frontend/` is the ASTRA Next.js interface: biometrics, body explorer, guided
assessments and hazard countermeasures. It runs on an exported demonstration
snapshot, so the backend does not need to be running:

    cd frontend
    npm install
    npm run dev                         # http://localhost:3000

See `frontend/README.md` for the screen map, data provenance, regeneration
(`python scripts/export-demo-data.py`) and how to point the data layer at this
API.

## Health levels

| Level | Meaning | Action |
|---|---|---|
| `normal` | healthy range | none |
| `slightly_abnormal` | outside the normal range, short of the warning limit | monitor and recheck |
| `needs_checkup` | beyond the warning limit | schedule a medical review |
| `critical` | beyond the critical limit | immediate attention |

Limits live in the `metrics` table, so you can change a threshold in the database without touching code.
Metrics with no lower limit (blood pressure, respiration, CO2) don't flag low values.

## Endpoints (all under `/api`, docs at `/docs`)

| Endpoint | What it returns |
|---|---|
| `GET /api/health` | service status and per-sensor status (never needs the token) |
| `GET /subjects`, `PUT /subjects/{id}/environment?value=free_space\|planetary_surface` | crew list; change radiation environment |
| `GET /crew` | everyone at a glance, worst level first, with flagged metrics |
| `GET /latest?subject=A1` | newest reading of each vital and the overall level |
| `GET /history?metric=heart_rate&subject=A1` | all readings; filter with `minutes`, `since`, `until`, `limit` |
| `GET /daily?subject=A1` | sleep, exercise, radiation per day, with levels |
| `GET /radiation?subject=A1` | cumulative dose vs 600 mSv career limit, projected days to limit |
| `GET /alerts?subject=A1&n=50` | newest alerts |
| `GET /levels`, `GET /limits` | level names/colours/ranges; thresholds |
| `GET /export.csv?subject=A1` | vitals as CSV |

`subject` defaults to `local` (the Pi's live sensors). `minutes` counts back from the newest reading, so it also works on the dataset.

## Alerts

* critical → immediately
* needs check-up → after 3 readings in a row (`HM_ALERT_CONSECUTIVE`)
* baseline drift → ≥3.5 SD from the person's own normal for that hour, 3 in a row (needs `model.json`)
* cooldown between repeats (`HM_ALERT_COOLDOWN_S`, default 300 s). Notifiers are pluggable in `alerts.py`
  (`log_notifier` now, `buzzer_notifier` is a stub for a GPIO buzzer/LED).

## Training the baseline

    python train.py        # reads health.db, writes model.json

Learns each person's mean and spread per metric per hour of day (flagged readings excluded, outliers trimmed).
Retrain weekly. Without `model.json` only the hard limits are used.

## Sensors

`sensors.py` has one class per sensor. `TemperatureSensor` uses a DS18B20 if found; everything else is simulated.
**Still to do:** `HeartRateSpO2Sensor._read_hardware()` (MAX30102 driver) and a real CO2 sensor in `CabinSensor`.
Set `HM_SIMULATE=0` to make a missing sensor an error instead of falling back to simulation.

## Settings (environment variables)

`HM_DB`, `HM_MODEL`, `HM_HOST`, `HM_PORT`, `HM_API_TOKEN` (requires `X-API-Token` header), `HM_SAMPLER` (0 = no live sensors),
`HM_SAMPLE_SECONDS`, `HM_SIMULATE`, `HM_RETENTION_DAYS` (live readings only; astronaut data is never deleted),
`HM_ALERT_CONSECUTIVE`, `HM_ALERT_COOLDOWN_S`, `HM_BASELINE_Z`, `HM_CORS`.

## Production notes

* Run **one** Uvicorn process. The sampler owns the live sensor loop, so multiple
  workers would record the same reading several times.
* Set `HM_API_TOKEN` in any shared environment. Without it, every `/api` route is
  readable by anyone who can reach the port. `GET /api/health` stays public for
  liveness checks.
* Keep the API behind a TLS reverse proxy and restrict `HM_CORS` to the deployed
  frontend origin.
* `HM_SIMULATE=1` is the default. Set it to `0` so a missing sensor is reported
  as an error instead of silently substituting simulated values.
* The sampler prunes only the `local` subject after `HM_RETENTION_DAYS`; astronaut
  records are never deleted.
* `/api/health` reports `sample_age_seconds`, `sampler_ok` and `sensors_ok`, so a
  stuck sampler or failed sensor shows up as `degraded`.

## Tests

    python tests/test_core.py                          # logic only, no extra packages
    pip install -r requirements-dev.txt && pytest -q   # full API tests (test_api.py + test_core.py)

Tests use a temporary copy of `health.db`.

## Run as a service on the Pi

Copy the folder to `/home/pi/health-monitor`, then:

    sudo cp health-monitor.service /etc/systemd/system/
    sudo systemctl enable --now health-monitor
