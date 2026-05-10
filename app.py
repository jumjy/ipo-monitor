"""FastAPI application — serves REST API for the React dashboard."""
import os
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any

from fastapi import BackgroundTasks, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

import config
from diff_engine import load_baseline
from history import append_history, load_history
from scheduler import get_state, run_check, start_background
from scraper import scrape_timetable

BASELINE_UPCOMING = config.DATA_DIR / "baseline_upcoming.json"
BASELINE_LISTING = config.DATA_DIR / "baseline_listing.json"
ENV_FILE = Path(__file__).parent / ".env"


# ── Lifecycle ─────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    from main import run_once

    def _check_and_record():
        result = run_once()
        append_history(result)
        return result

    start_background(_check_and_record)
    yield


app = FastAPI(title="IPO Monitor", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Models ────────────────────────────────────────────────────────────────────

class ConfigUpdate(BaseModel):
    line_notify_token: str | None = None
    check_interval_hours: float | None = None
    email_fallback: bool | None = None
    smtp_host: str | None = None
    smtp_port: int | None = None
    smtp_user: str | None = None
    smtp_pass: str | None = None
    email_to: str | None = None


# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/api/status")
def get_status() -> dict[str, Any]:
    state = get_state()
    upcoming = load_baseline(BASELINE_UPCOMING)
    listing = load_baseline(BASELINE_LISTING)
    return {
        **state,
        "upcoming_count": len(upcoming),
        "listing_count": len(listing),
        "check_interval_hours": config.CHECK_INTERVAL_HOURS,
    }


@app.get("/api/ipo/upcoming")
def get_upcoming() -> list[dict]:
    return load_baseline(BASELINE_UPCOMING)


@app.get("/api/ipo/listing")
def get_listing() -> list[dict]:
    return load_baseline(BASELINE_LISTING)


@app.get("/api/ipo/timetable")
def get_timetable() -> list[dict]:
    try:
        return scrape_timetable()
    except Exception as e:
        return []


@app.post("/api/check")
def trigger_check(background_tasks: BackgroundTasks) -> dict[str, str]:
    from main import run_once

    def _check():
        result = run_check(run_once)
        append_history(result)

    background_tasks.add_task(_check)
    return {"status": "check triggered"}


@app.get("/api/history")
def get_history(limit: int = 50) -> list[dict]:
    return load_history(limit=limit)


@app.get("/api/config")
def get_config() -> dict[str, Any]:
    token = config.LINE_NOTIFY_TOKEN
    masked = ("*" * (len(token) - 4) + token[-4:]) if len(token) > 4 else ("*" * len(token))
    return {
        "line_notify_token_masked": masked,
        "line_notify_token_set": bool(token),
        "check_interval_hours": config.CHECK_INTERVAL_HOURS,
        "email_fallback": config.EMAIL_FALLBACK,
        "smtp_host": config.SMTP_HOST,
        "smtp_port": config.SMTP_PORT,
        "smtp_user": config.SMTP_USER,
        "email_to": config.EMAIL_TO,
    }


@app.put("/api/config")
def update_config(body: ConfigUpdate) -> dict[str, str]:
    """Write changes to .env file and reload config module."""
    lines: list[str] = []
    if ENV_FILE.exists():
        lines = ENV_FILE.read_text(encoding="utf-8").splitlines()

    def _set(key: str, value: str) -> None:
        for i, line in enumerate(lines):
            if line.startswith(f"{key}="):
                lines[i] = f"{key}={value}"
                return
        lines.append(f"{key}={value}")

    if body.line_notify_token is not None:
        _set("LINE_NOTIFY_TOKEN", body.line_notify_token)
    if body.check_interval_hours is not None:
        _set("CHECK_INTERVAL_HOURS", str(body.check_interval_hours))
    if body.email_fallback is not None:
        _set("EMAIL_FALLBACK", str(body.email_fallback).lower())
    if body.smtp_host is not None:
        _set("SMTP_HOST", body.smtp_host)
    if body.smtp_port is not None:
        _set("SMTP_PORT", str(body.smtp_port))
    if body.smtp_user is not None:
        _set("SMTP_USER", body.smtp_user)
    if body.smtp_pass is not None:
        _set("SMTP_PASS", body.smtp_pass)
    if body.email_to is not None:
        _set("EMAIL_TO", body.email_to)

    ENV_FILE.write_text("\n".join(lines) + "\n", encoding="utf-8")

    # Reload config at runtime
    import importlib
    importlib.reload(config)

    return {"status": "config updated"}


@app.get("/api/analytics")
def get_analytics() -> dict[str, Any]:
    """Compute live analytics from current listing + upcoming baselines."""
    import re
    from collections import defaultdict

    listing = load_baseline(BASELINE_LISTING)
    upcoming = load_baseline(BASELINE_UPCOMING)

    THEME_MAP = [
        (["robot", "autonomous", "autom", "lidar", "drone"], "Robotics"),
        (["semiconductor", "chip", "photon", "wafer", "pixel", "circuit", "ic design"], "Semiconductor"),
        (["bio", "pharma", "therapeut", "oncol", "clinical", "genomic", "drug", "biopharma"], "BioHealth"),
        (["energy", "solar", "renewable", "battery", "wind", "green"], "Green Energy"),
        (["medical", "device", "diagnostic", "surgical", "medtech"], "MedTech"),
        (["ai ", "artificial", "software", "cloud", "data", "internet", "algorithm", "media", "tech"], "AI / Software"),
    ]

    def classify(text: str) -> str:
        s = text.lower()
        for keywords, theme in THEME_MAP:
            if any(k in s for k in keywords):
                return theme
        return "Other"

    def parse_price(s: str | None) -> float | None:
        if not s:
            return None
        cleaned = re.sub(r"[^\d.]", "", s.replace(",", ""))
        try:
            return float(cleaned) if cleaned else None
        except ValueError:
            return None

    def parse_sub(s: str | None) -> float | None:
        if not s:
            return None
        cleaned = re.sub(r"[^\d.]", "", s.replace(",", ""))
        try:
            return float(cleaned) if cleaned else None
        except ValueError:
            return None

    theme_agg: dict = defaultdict(lambda: {"count": 0, "names": [], "returns": [], "sub_rates": []})
    ipos: list[dict] = []

    for r in listing:
        name = r.get("Name", "")
        theme = classify(name)
        offer = parse_price(r.get("Offer Price"))
        lst = parse_price(r.get("Listing Price"))
        sub = parse_sub(r.get("Subscription Rate"))
        ret: float | None = None
        if offer and lst and offer > 0:
            ret = round((lst - offer) / offer * 100, 1)

        theme_agg[theme]["count"] += 1
        theme_agg[theme]["names"].append(name)
        if ret is not None:
            theme_agg[theme]["returns"].append(ret)
        if sub is not None:
            theme_agg[theme]["sub_rates"].append(sub)

        if sub is not None or ret is not None:
            ipos.append({"name": name, "code": r.get("Code", ""), "theme": theme,
                         "sub_rate": sub, "return": ret})

    for u in upcoming:
        name = u.get("Name", "")
        theme = classify(u.get("Industry", "") or name)
        theme_agg[theme]["count"] += 1
        theme_agg[theme]["names"].append(name)

    themes: dict[str, Any] = {}
    max_count = max((v["count"] for v in theme_agg.values()), default=1)
    for theme, data in sorted(theme_agg.items(), key=lambda x: -x[1]["count"]):
        rets = data["returns"]
        subs = data["sub_rates"]
        themes[theme] = {
            "count": data["count"],
            "pct": round(data["count"] / max_count * 100),
            "names": data["names"],
            "top_name": data["names"][0] if data["names"] else "",
            "avg_return": round(sum(rets) / len(rets), 1) if rets else None,
            "avg_sub_rate": round(sum(subs) / len(subs)) if subs else None,
        }

    all_rets = [i["return"] for i in ipos if i["return"] is not None]
    all_subs = [i["sub_rate"] for i in ipos if i["sub_rate"] is not None]

    return {
        "themes": themes,
        "ipos": ipos,
        "avg_return": round(sum(all_rets) / len(all_rets), 1) if all_rets else None,
        "avg_sub_rate": round(sum(all_subs) / len(all_subs)) if all_subs else None,
    }


@app.post("/api/test-notify")
def test_notify() -> dict[str, Any]:
    from notifier import send_line_notify
    ok = send_line_notify("\n🔔 IPO Monitor — test notification ✅")
    return {"success": ok}


# ── Static files (React SPA) ───────────────────────────────────────────────────

FRONTEND_DIST = Path(__file__).parent / "frontend" / "dist"

if FRONTEND_DIST.exists():
    app.mount("/assets", StaticFiles(directory=FRONTEND_DIST / "assets"), name="assets")

    @app.get("/{full_path:path}")
    def serve_spa(full_path: str):
        return FileResponse(FRONTEND_DIST / "index.html")
