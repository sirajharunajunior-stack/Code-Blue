# Astronaut Health Monitor: backend

Offline backend for a Raspberry Pi. It serves the astronaut dataset (A1–A3) from `health.db`,
reads the Pi's own sensors (subject `local`), classifies everything into four health levels,
and raises alerts. It is **not a medical device**; levels are informational.

## Run

    pip install -r requirements.txt
    python main.py                      # API reference: http://<pi-ip>:8000/help

On first run, the backend creates `health.db` from the committed fictional demo
snapshot. To use another database, set `HM_DB=/path/to/health.db`.


## Health levels

| Level | Meaning | Action |
|---|---|---|
| `normal` | healthy range | none |
| `slightly_abnormal` | outside the normal range, short of the warning limit | monitor and recheck |
| `needs_checkup` | beyond the warning limit | schedule a medical review |
| `critical` | beyond the critical limit | immediate attention |

Limits live in the `metrics` table, so you can change a threshold in the database without touching code.
Metrics with no lower limit (blood pressure, respiration, CO2) don't flag low values.

## Endpoints (all under `/api`; reference page at `/help`, works offline)

| Endpoint | What it returns |
|---|---|
| `GET /health` | service status and per-sensor status (never needs the token) |
| `GET /subjects`, `PUT /subjects/{id}/environment?value=free_space\|planetary_surface` | crew list; change radiation environment |
| `GET /crew` | everyone at a glance, worst level first, with flagged metrics |
| `GET /latest?subject=A1` | newest reading of each vital and the overall level |
| `GET /history?metric=heart_rate&subject=A1` | all readings; filter with `minutes`, `since`, `until`, `limit` |
| `GET /daily?subject=A1` | sleep, exercise, radiation per day, with levels |
| `GET /radiation?subject=A1` | cumulative dose vs 600 mSv career limit, projected days to limit |
| `POST /readings` | **store readings from a camera, phone or device**: grades them, runs the alert rules, returns level, alerts and precautions |
| `POST /subjects` | add a person to monitor (`{"id": "mira", "name": "Mira"}`) |
| `GET /advice?subject=A1`, `GET /precautions` | safety precautions for everything currently flagged; the full library |
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

## Tests

    python tests/test_core.py                          # logic only, no extra packages
    pip install -r requirements-dev.txt && pytest -q   # full API tests (test_api.py + test_core.py)

Tests initialize isolated temporary databases from the committed demo snapshot.

## Run as a service on the Pi

Copy the folder to `/home/pi/health-monitor`, then:

    sudo cp health-monitor.service /etc/systemd/system/
    sudo systemctl enable --now health-monitor

## Camera monitor (heart rate + breathing from the phone camera)

`GET /camera` serves a page that reads heart rate and breathing from the front camera (remote photoplethysmography,
all processing in the browser) and saves them with `POST /api/readings`, so camera readings are graded with the same
four levels, trigger the same alerts and show the same safety precautions as every other sensor.

**Phones only allow the camera over HTTPS** (or on `localhost`), so serve the backend with a certificate:

    ./make_cert.sh 192.168.1.50                      # your Pi/computer LAN address
    HM_SSL_CERT=certs/cert.pem HM_SSL_KEY=certs/key.pem python main.py
    # on the phone: open https://192.168.1.50:8000/camera and accept the one-time certificate warning

In the page: pick who is being measured (or **+ New**), tap **Start**, fit your face in the oval and stay still.
It saves about every 10 seconds, only while the signal is good. If the backend uses `HM_API_TOKEN`, the page asks for it.
Tip: give each real person their own subject. Don't send camera readings to `local` while the simulated sensors are on
(they write heart rate there too), and don't mix them into the A1-A3 dataset.

Limits: camera heart rate is typically within a few bpm in good, steady light; breathing is rougher; SpO2, blood
pressure and temperature are not measured. Not a medical device.

### `POST /api/readings`

    {"subject": "mira", "source": "camera",
     "readings": [{"metric": "heart_rate", "value": 72}, {"metric": "resp_rate", "value": 15}]}

Valid metrics: heart_rate, resp_rate, spo2, body_temp, bp_systolic, bp_diastolic, cabin_co2 (daily metrics are not
accepted). Implausible values (e.g. heart rate 900) are rejected with 400 and nothing is stored; the whole request
is all-or-nothing. `ts` (epoch seconds) is optional and must be within a day of now.

## Offline operation (spacecraft)

Everything runs on board with no internet: SQLite storage, the alert engine, the safety precautions and the camera
monitor. Nothing is fetched from outside, and a test (`tests/test_offline.py`) fails if code or a served page starts to.

* **Install without internet.** On a computer *with* internet, before launch: `./make_wheelhouse.sh` (or
  `./make_wheelhouse.sh manylinux2014_aarch64 3.11` for a 64-bit Pi on Python 3.11). Copy the whole folder, including
  `wheelhouse/`, to the ship, then `./install_offline.sh`. (These two scripts are untested here; try them on the real target hardware before launch.)
* **Pages that work offline:** `/guide` (the full crew medical guide), `/help` (API reference), `/camera` (camera monitor).
  FastAPI's built-in `/docs` and `/redoc` are switched off because they load their code from a CDN.
* **HTTPS for the camera** uses a local self-signed certificate (`make_cert.sh`); no outside certificate authority needed.
* **Clock:** there is no internet time on board, so the computer's clock must be set correctly (a Pi has no battery clock;
  add an RTC module). Readings older or newer than a day from the clock are refused.
* **Precautions are written for spaceflight:** no gravity-based positions (nothing says lie down or sit upright), CPR
  refers to the on-board microgravity procedure, and the crew medical officer acts first; the mission control flight
  surgeon is contacted when a link is available, with no waiting for a reply.
* **Sending data to the ground** when a link exists: `GET /api/export.csv?subject=<id>` and `GET /api/alerts`.
