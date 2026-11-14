from __future__ import annotations

from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException, Query, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .config import BACKEND_DIR, Settings
from .models import ChatRequest, ScenarioRequest
from .monitor import MonitorService
from .utils import iso_now


def create_app(settings: Settings | None = None) -> FastAPI:
    app_settings = settings or Settings()
    monitor = MonitorService(app_settings)

    @asynccontextmanager
    async def lifespan(_: FastAPI):
        await monitor.startup()
        try:
            yield
        finally:
            await monitor.shutdown()

    app = FastAPI(
        title="ASTRA Crew Monitor Prototype",
        version="1.0.0",
        lifespan=lifespan,
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=list(app_settings.cors_origins),
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.state.monitor = monitor
    app.state.settings = app_settings

    @app.get("/api/health")
    async def api_health() -> dict:
        return {
            "status": "ok",
            "demo": True,
            "monitoring": monitor.monitoring,
            "ai_enabled": monitor.ai.enabled,
            "time": iso_now(),
        }

    @app.get("/api/snapshot")
    async def api_snapshot() -> dict:
        return monitor.snapshot()

    @app.get("/api/readings")
    async def api_readings(limit: int = Query(120, ge=1, le=1000)) -> dict:
        return {"readings": monitor.db.recent_readings(limit)}

    @app.get("/api/baselines")
    async def api_baselines() -> dict:
        return {"baselines": monitor.engine.baselines()}

    @app.get("/api/alerts")
    async def api_alerts(
        limit: int = Query(30, ge=1, le=200),
        active_only: bool = False,
    ) -> dict:
        return {
            "alerts": monitor.db.list_alerts(
                limit=limit, active_only=active_only
            )
        }

    @app.post("/api/alerts/{alert_id}/acknowledge")
    async def acknowledge_alert(alert_id: int) -> dict:
        alert = monitor.db.acknowledge_alert(alert_id)
        if alert is None:
            raise HTTPException(status_code=404, detail="Alert not found")
        await monitor.broadcast(monitor.snapshot())
        return {"alert": alert}

    @app.post("/api/demo/start")
    async def demo_start() -> dict:
        monitor.start_monitoring()
        await monitor.tick()
        return {"snapshot": monitor.snapshot()}

    @app.post("/api/demo/stop")
    async def demo_stop() -> dict:
        await monitor.stop_monitoring()
        return {"snapshot": monitor.snapshot()}

    @app.post("/api/demo/scenario")
    async def demo_scenario(request: ScenarioRequest) -> dict:
        await monitor.set_scenario(request.scenario)
        return {"snapshot": monitor.snapshot()}

    @app.post("/api/demo/disconnect")
    async def demo_disconnect() -> dict:
        await monitor.disconnect()
        return {"snapshot": monitor.snapshot()}

    @app.post("/api/demo/reconnect")
    async def demo_reconnect() -> dict:
        await monitor.reconnect()
        return {"snapshot": monitor.snapshot()}

    @app.post("/api/ai/chat")
    async def ai_chat(request: ChatRequest) -> dict:
        history = [message.model_dump() for message in request.history]
        reply, status = await monitor.ai.chat(
            request.message,
            history,
            monitor.chat_context(),
        )
        return {
            "reply": reply,
            "ai_status": status,
            "generated_at": iso_now(),
        }

    @app.websocket("/ws")
    async def websocket_endpoint(websocket: WebSocket) -> None:
        await websocket.accept()
        await monitor.register(websocket)
        try:
            while True:
                await websocket.receive_text()
        except WebSocketDisconnect:
            pass
        finally:
            monitor.unregister(websocket)

    dist_dir = Path(BACKEND_DIR).parent / "frontend" / "dist"
    if dist_dir.exists():
        app.mount("/", StaticFiles(directory=dist_dir, html=True), name="ui")

    return app


app = create_app()
