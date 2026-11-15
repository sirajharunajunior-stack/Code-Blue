# CODE-BLUE Crew Monitor - Prototype 1

A runnable, end-to-end astronaut health monitoring prototype. A simulated
wearable drives live vital signs through a Python monitoring engine, persistent
SQLite history, rule-based alert detection, optional AI explanations, and a
minimal React dashboard.

All readings and alerts are **simulated demo data**. This is not a medical
device and must not be used for medical decisions.

## What it does

- Streams heart rate, blood oxygen, body temperature, respiratory rate, and
  activity context over WebSocket.
- Detects absolute and personalized-baseline abnormalities with warning and
  critical severity.
- Distinguishes sensor errors and missing telemetry from physiological alerts.
- Creates one active alert per vital, supports acknowledgement, and resolves an
  alert after two consecutive normal readings.
- Generates seven-part alert guidance: detected change, triggering readings,
  meaning, possible factors, immediate actions, escalation, and follow-up.
- Optionally enriches alert guidance and chat through an OpenAI-compatible LLM.
  Without an API key, safe deterministic fallback guidance remains available.
- Persists readings, alerts, acknowledgements, and personal baselines in SQLite.
- Provides Overview, Health, AI Assistant, and Alerts screens.

## Quick start

### 1. Backend

Windows PowerShell:

```powershell
cd prototype/backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

macOS/Linux:

```bash
cd prototype/backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

The API is at `http://localhost:8000`, with interactive docs at
`http://localhost:8000/docs`. The default database is
`prototype/backend/monitor.db` and is created automatically.

### 2. Frontend

In a second terminal:

```bash
cd prototype/frontend
npm install
npm run dev
```

Open `http://localhost:5173`. The Vite development server proxies `/api` and
`/ws` to the backend on port 8000.

### Single-server option

Build the frontend first, then start the backend. FastAPI serves the built UI at
`/` when `prototype/frontend/dist` exists.

```bash
cd prototype/frontend
npm install
npm run build
cd ../backend
uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Open `http://localhost:8000`.

### Reset demo data

Stop the backend and delete `prototype/backend/monitor.db` (plus any
`monitor.db-wal` and `monitor.db-shm` files). A fresh database is created on the
next start.

## Demo flow

1. The monitor starts automatically. Use **Pause** and **Start** to control
   sampling.
2. Select **Low O2** to create a critical alert. The alert appears immediately,
   before any optional AI request finishes.
3. Open **Alerts** and expand **View monitoring guidance** for the full
   explanation, actions, and escalation.
4. Acknowledge the alert to test the alert state.
5. Select **Normal** or **Recovery**. After two consecutive normal readings the
   active alert resolves. **Recovery** ramps values back gradually.
6. Select **Disconnect** to test missing telemetry. The last values remain
   visible with a no-signal state. Select **Reconnect** to resume.
7. Use **High HR**, **High temp**, and **High RR** to exercise warning and
   critical thresholds.

The interface always carries a `DEMO DATA` label.

## AI configuration

The AI integration is optional. Configure it only on the backend; never put API
keys in the frontend.

```bash
# Windows PowerShell
$env:AI_API_KEY = "your-key"
$env:AI_MODEL = "gpt-4o-mini"
uvicorn app.main:app --reload --port 8000
```

```bash
# macOS/Linux
AI_API_KEY=your-key AI_MODEL=gpt-4o-mini uvicorn app.main:app --reload --port 8000
```

| Variable | Default | Purpose |
|---|---|---|
| `AI_API_KEY` | empty | Enables LLM explanations and chat |
| `OPENAI_API_KEY` | empty | Alternative key name |
| `AI_BASE_URL` | `https://api.openai.com/v1` | OpenAI-compatible API base |
| `AI_MODEL` | `gpt-4o-mini` | Chat-completions model |
| `AI_TIMEOUT_SECONDS` | `15` | LLM request timeout |
| `MONITOR_DB` | `prototype/backend/monitor.db` | SQLite database path |
| `MONITOR_TICK_SECONDS` | `2` | Simulator sampling interval |
| `MONITOR_AUTOSTART` | `true` | Start sampling on application startup |
| `CORS_ORIGINS` | local Vite origins | Comma-separated allowed origins |

Without a key, or when an LLM request fails, the API returns deterministic
fallback guidance and marks `ai_status` as `fallback`. Critical alerts are
created and broadcast before any AI request starts.

The LLM prompts prohibit inventing readings, diagnosis, certainty, medication
advice, and dosage guidance. The backend normalizes AI output, rejects
medication or dosage language, and fills any missing explanation fields from the
fallback.

## Detection behavior

Thresholds and baselines live in `prototype/backend/app/config.py`,
`engine.py`, and `simulator.py`.

- **Absolute thresholds** cover high/low heart rate, low blood oxygen,
  high/low temperature, and high/low respiratory rate.
- **Activity context** raises the expected heart and respiratory rates during
  light or active periods so normal exertion does not create false alerts.
- **Personal baselines** use a rolling window of valid readings. Heart-rate
  baselines use resting readings only. Baselines are marked ready after 12
  samples; absolute thresholds still work while learning.
- **Baseline-aware warning limits** can tighten around the personal range after
  learning, including blood oxygen, temperature, and resting respiratory rate.
  Critical limits remain absolute, and activity context still prevents exercise
  false positives.
- **Sensor errors** are out-of-range or missing values. They create a sensor
  warning and are never treated as a physiological reading.
- **Deduplication** allows one unresolved alert per vital. Continuing abnormal
  readings update that alert instead of creating duplicates; escalation resets
  acknowledgement and refreshes guidance.
- **Resolution** requires two consecutive normal readings.
- **Disconnection** creates a separate wearable-signal alert and preserves the
  last known vitals on screen.

## API

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/health` | Service/demo/AI status |
| `GET` | `/api/snapshot` | Full dashboard snapshot |
| `GET` | `/api/readings?limit=120` | Stored reading history |
| `GET` | `/api/baselines` | Current personal baselines |
| `GET` | `/api/alerts?active_only=false` | Alert history |
| `POST` | `/api/alerts/{id}/acknowledge` | Acknowledge an active alert |
| `POST` | `/api/demo/start` | Start sampling |
| `POST` | `/api/demo/stop` | Pause sampling |
| `POST` | `/api/demo/scenario` | Set demo scenario |
| `POST` | `/api/demo/disconnect` | Simulate signal loss |
| `POST` | `/api/demo/reconnect` | Restore the wearable |
| `POST` | `/api/ai/chat` | Telemetry-grounded assistant |
| `WS` | `/ws` | Live dashboard snapshots |

`POST /api/demo/scenario` accepts:

```json
{
  "scenario": "normal | elevated_heart_rate | low_spo2 | high_temperature | abnormal_respiration | recovery"
}
```

## Tests

```bash
cd prototype/backend
pip install -r requirements-dev.txt
pytest -q
```

```bash
cd prototype/frontend
npm run typecheck
npm run build
```

Backend tests cover thresholds, activity context, baselines, sensor errors,
duplicate prevention, alert acknowledgement/recovery, disconnection,
WebSocket startup, and fallback AI behavior.

## Project structure

```text
prototype/
  backend/
    app/
      main.py        FastAPI routes, lifespan, WebSocket
      monitor.py     sampling loop, alert reconciliation, snapshots
      engine.py      thresholds, activity context, baselines
      simulator.py   demo wearable
      ai.py          LLM prompts, parsing, safe fallbacks
      database.py    SQLite persistence
      config.py      settings and thresholds
    tests/
  frontend/
    src/
      pages/         Overview, Health, AI Assistant, Alerts
      components/    vitals, alerts, controls, charts
      hooks/         WebSocket snapshot state
      lib/           typed API client and formatting
```

## Limitations

- One simulated astronaut and one wearable.
- SQLite is local and not configured for multi-process deployment.
- Trend ranges cover the most recent stored samples; there is no long-term
  analytics or export yet.
- The LLM integration is optional and is not required for detection,
  escalation alerts, or fallback guidance.
- Baseline adaptation is intentionally simple for this prototype.

## Safety boundaries

- The assistant is informational, non-diagnostic, and telemetry-bound.
- Do not use this prototype to make clinical decisions.
- Alerts and actions are demo guidance only.
- A real deployment would require clinical validation, authenticated access,
  audit logging, redundancy, and a regulated medical-device quality process.
