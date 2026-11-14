"""Astronaut health-monitoring API.   Run:  python main.py     Docs: http://<pi-ip>:8000/docs

Set HM_API_TOKEN to require an X-API-Token header on every /api route except /api/health.
"""
import hmac
import time
from contextlib import asynccontextmanager
from typing import Optional

import uvicorn
from fastapi import APIRouter, Depends, FastAPI, Header, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

import config
import db
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
    yield
    if app.state.sampler:
        app.state.sampler.stop()


app = FastAPI(title="Astronaut Health Monitor", version="1.0", lifespan=lifespan,
              description="Offline health-monitoring backend. Not a medical device: all levels are informational.")
if config.CORS_ORIGINS:
    app.add_middleware(CORSMiddleware, allow_origins=config.CORS_ORIGINS, allow_methods=["*"], allow_headers=["*"])


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


@api.put("/subjects/{sid}/environment", tags=["crew"])
def set_environment(sid: str, value: str = Query(..., description="free_space or planetary_surface")):
    return call(service.set_environment, sid, value)


@api.get("/crew", tags=["crew"], summary="Everyone at a glance, worst level first")
def crew():
    return call(service.crew)


@api.get("/latest", tags=["vitals"])
def latest(subject: str = subj()):
    return call(service.latest, subject)


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

if __name__ == "__main__":
    uvicorn.run(app, host=config.HOST, port=config.PORT)
