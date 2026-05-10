"""Background scheduler — runs check every N hours as a daemon thread."""
import logging
import threading
import time
from datetime import datetime, timedelta
from typing import Callable

import config

logger = logging.getLogger(__name__)

_lock = threading.Lock()
_state: dict = {
    "last_check": None,
    "next_check": None,
    "is_running": False,
}


def get_state() -> dict:
    return dict(_state)


def run_check(check_fn: Callable) -> dict:
    """Run check_fn with lock to prevent concurrent runs. Returns result."""
    if not _lock.acquire(blocking=False):
        logger.info("Check already running — skipped")
        return {"skipped": True}
    try:
        _state["is_running"] = True
        result = check_fn()
        _state["last_check"] = datetime.now().isoformat(timespec="seconds")
        _state["next_check"] = (
            datetime.now() + timedelta(hours=config.CHECK_INTERVAL_HOURS)
        ).isoformat(timespec="seconds")
        return result
    finally:
        _state["is_running"] = False
        _lock.release()


def start_background(check_fn: Callable) -> None:
    """Start background scheduler thread. Call once at app startup."""
    def _loop():
        # Initial run
        run_check(check_fn)
        while True:
            time.sleep(config.CHECK_INTERVAL_HOURS * 3600)
            run_check(check_fn)

    t = threading.Thread(target=_loop, daemon=True, name="ipo-scheduler")
    t.start()
    logger.info("Background scheduler started (interval=%.1fh)", config.CHECK_INTERVAL_HOURS)


# ── Legacy CLI daemon (kept for python main.py --daemon) ─────────────────────

def start_daemon() -> None:
    from main import run_once
    start_background(run_once)
    logger.info("Daemon running — press Ctrl+C to stop")
    try:
        while True:
            time.sleep(60)
    except KeyboardInterrupt:
        logger.info("Daemon stopped")
