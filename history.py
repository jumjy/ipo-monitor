"""Manage alert history stored in data/history.json."""
import json
import logging
from datetime import datetime
from pathlib import Path
from typing import Any

import config

logger = logging.getLogger(__name__)
HISTORY_FILE = config.DATA_DIR / "history.json"


def load_history(limit: int = 50) -> list[dict[str, Any]]:
    if not HISTORY_FILE.exists():
        return []
    try:
        entries = json.loads(HISTORY_FILE.read_text(encoding="utf-8"))
        return entries[-limit:][::-1]  # newest first
    except Exception as e:
        logger.warning("Failed to load history: %s", e)
        return []


def append_history(result: dict[str, Any]) -> None:
    """Append a check result to history if there were changes."""
    if not result.get("has_changes"):
        return
    entries: list[dict] = []
    if HISTORY_FILE.exists():
        try:
            entries = json.loads(HISTORY_FILE.read_text(encoding="utf-8"))
        except Exception:
            entries = []

    entry = {
        "timestamp": datetime.now().isoformat(timespec="seconds"),
        "new_upcoming": result.get("new_upcoming", []),
        "removed_upcoming": result.get("removed_upcoming", []),
        "new_listing": result.get("new_listing", []),
        "status_changes": result.get("status_changes", []),
        "promotions": result.get("promotions", []),
    }
    entries.append(entry)

    # Keep last 200 entries
    if len(entries) > 200:
        entries = entries[-200:]

    HISTORY_FILE.write_text(json.dumps(entries, ensure_ascii=False, indent=2), encoding="utf-8")
    logger.info("History updated (%d total entries)", len(entries))
