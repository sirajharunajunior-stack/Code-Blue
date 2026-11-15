"""Astronaut health-monitoring API.   Run:  python main.py     Reference: http://<pi-ip>:8000/help (offline)

Set HM_API_TOKEN to require an X-API-Token header on every /api route except /api/health.
"""
import hmac
import os
import time
from contextlib import asynccontextmanager
from typing import List, Optional

import uvicorn
from fastapi import APIRouter, Depends, FastAPI, Header, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse, StreamingResponse
from pydantic import BaseModel, Field

import advice as advice_lib   # the /advice endpoint below is also called advice
import alerts as alerts_mod
import config
import db
import guide
import service
from sampler import Sampler


@asynccontextmanager
async def lifespan(app: FastAPI):
    db.init()
    app.state.sampler = None
    if config.SAMPLER_ENABLED:
        app.state.sampler = Sampler()
        app.state.sampler.sample_once()      # so /api/health has data straight away
        app.state.sampler.start()
    # one alert engine shared by the sensors and POST /api/readings, so streaks and cooldowns agree
    app.state.engine = app.state.sampler.engine if app.state.sampler else alerts_mod.AlertEngine()
    yield
    if app.state.sampler:
        app.state.sampler.stop()


app = FastAPI(title="Astronaut Health Monitor", version="1.0", lifespan=lifespan,
              docs_url=None, redoc_url=None,      # FastAPI's /docs and /redoc load their code from a CDN: blank without internet
              description="Offline health-monitoring backend. Not a medical device: all levels are informational.")
if config.CORS_ORIGINS:
    app.add_middleware(CORSMiddleware, allow_origins=config.CORS_ORIGINS, allow_methods=["*"], allow_headers=["*"])


class ReadingIn(BaseModel):
    metric: str = Field(..., description="heart_rate, resp_rate, spo2, body_temp, bp_systolic, bp_diastolic or cabin_co2")
    value: float
    ts: Optional[float] = Field(None, description="epoch seconds; default: now")


class IngestIn(BaseModel):
    subject: str = Field(config.LOCAL_SUBJECT, description="who the readings belong to")
    source: str = Field("api", max_length=40, description="e.g. 'camera'")
    readings: List[ReadingIn] = Field(..., min_length=1, max_length=20)


class SubjectIn(BaseModel):
    id: str = Field(..., description="1-32 letters, digits, '-' or '_'")
    name: str


def require_token(x_api_token: str = Header(default="")):
    token = config.API_TOKEN                     # read per request
    if token and not hmac.compare_digest(x_api_token.encode(), token.encode()):
        raise HTTPException(401, "missing or invalid X-API-Token")


def call(fn, *a, **kw):
    """Run a service function and turn its errors into HTTP errors."""
    try:
        return fn(*a, **kw)
    except service.NotFound as e:
        raise HTTPException(404, str(e))
    except service.BadRequest as e:
        raise HTTPException(400, str(e))


api = APIRouter(prefix="/api", dependencies=[Depends(require_token)])

def subj():
    return Query(config.LOCAL_SUBJECT, description="subject id, e.g. A1 (default: the live sensors)")


@app.get("/api/health", tags=["status"])
def health():
    sampler = app.state.sampler
    return {"status": "ok", "time": service.iso(time.time()), "db": config.DB_PATH,
            "sensors": sampler.status if sampler else {},
            "baseline_model": bool(sampler and sampler.engine.baseline.loaded)}


@api.get("/subjects", tags=["crew"])
def subjects():
    return call(service.subjects)


@api.post("/subjects", tags=["crew"], summary="Add a person to monitor")
def add_subject(body: SubjectIn):
    return call(service.add_subject, body.id, body.name)


@api.put("/subjects/{sid}/environment", tags=["crew"])
def set_environment(sid: str, value: str = Query(..., description="free_space or planetary_surface")):
    return call(service.set_environment, sid, value)


@api.get("/crew", tags=["crew"], summary="Everyone at a glance, worst level first")
def crew():
    return call(service.crew)


@api.get("/latest", tags=["vitals"])
def latest(subject: str = subj()):
    return call(service.latest, subject)


@api.post("/readings", tags=["vitals"],
          summary="Store readings from a camera, app or device; grade them, run the alert rules, return precautions")
def post_readings(body: IngestIn, request: Request):
    readings = [{"metric": r.metric, "value": r.value, "ts": r.ts} for r in body.readings]
    return call(service.ingest, body.subject, readings, body.source, request.app.state.engine)


@api.get("/history", tags=["vitals"], summary="Readings of one metric (all of them unless filtered)")
def history(metric: str, subject: str = subj(),
            minutes: Optional[float] = Query(None, gt=0, description="last N minutes up to the newest reading"),
            since: Optional[float] = Query(None, description="epoch seconds"),
            until: Optional[float] = Query(None, description="epoch seconds"),
            limit: Optional[int] = Query(None, ge=1, le=100000, description="newest N rows")):
    return call(service.history, subject, metric, minutes, since, until, limit)


@api.get("/daily", tags=["vitals"], summary="Sleep, exercise and radiation per day")
def daily(subject: str = subj()):
    return call(service.daily, subject)


@api.get("/radiation", tags=["vitals"], summary="Cumulative dose vs career limit")
def radiation(subject: str = subj()):
    return call(service.radiation, subject)


@api.get("/alerts", tags=["alerts"])
def alerts(subject: Optional[str] = None, n: int = Query(50, ge=1, le=5000)):
    return call(service.alerts, subject, n)


@api.get("/levels", tags=["reference"], summary="The four health levels, colours and ranges per metric")
def levels_info():
    return call(service.levels_info)


@api.get("/limits", tags=["reference"], summary="Thresholds for every metric")
def limits():
    return call(service.limits)


@api.get("/precautions", tags=["advice"], summary="The full safety-precautions library")
def precautions():
    return call(service.precautions)


@api.get("/advice", tags=["advice"], summary="Safety precautions for everything currently flagged for a person")
def advice(subject: str = subj()):
    return call(service.advice_for_subject, subject)


@api.get("/export.csv", tags=["export"])
def export_csv(subject: str = subj()):
    gen = call(service.export_csv, subject)
    first = call(next, gen)                     # raises 404 now, not halfway through the stream
    def stream():
        yield first
        yield from gen
    return StreamingResponse(stream(), media_type="text/csv",
                             headers={"Content-Disposition": f'attachment; filename="{subject}.csv"'})


app.include_router(api)


@app.get("/guide", include_in_schema=False, response_class=HTMLResponse)
def guide_page():
    """The full crew medical guide as a plain offline page (no JavaScript, nothing fetched from the internet)."""
    return HTMLResponse(guide.render_guide(advice_lib.library()))


@app.get("/help", include_in_schema=False, response_class=HTMLResponse)
def help_page():
    """Offline API reference (replaces /docs)."""
    return HTMLResponse(guide.render_help(app.openapi()))


@app.get("/camera", include_in_schema=False)
def camera_page():
    """Camera heart-rate / breathing monitor. Served from here so it can call /api on the same origin.
    Phones only allow the camera over https:// (see make_cert.sh) or on localhost."""
    return FileResponse(os.path.join(config.BASE_DIR, "static", "camera.html"), media_type="text/html")


if __name__ == "__main__":
    tls = {"ssl_certfile": config.SSL_CERT, "ssl_keyfile": config.SSL_KEY} if config.SSL_CERT and config.SSL_KEY else {}
    uvicorn.run(app, host=config.HOST, port=config.PORT, **tls)
