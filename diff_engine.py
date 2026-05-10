"""Compare previous vs current IPO data and detect changes."""
import json
import logging
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)


def _key(record: dict[str, Any], fields: list[str]) -> str:
    """Build a stable identity key from the most reliable fields."""
    for field in fields:
        val = record.get(field, "").strip()
        if val:
            return val
    return json.dumps(record, sort_keys=True)


def diff_upcoming(old: list[dict], new: list[dict]) -> dict[str, list]:
    """Detect new / removed entries in the Upcoming IPO list.

    Identity key: Name (company names are unique enough for upcoming list).
    """
    old_keys = {_key(r, ["Name"]): r for r in old}
    new_keys = {_key(r, ["Name"]): r for r in new}

    added = [new_keys[k] for k in new_keys if k not in old_keys]
    removed = [old_keys[k] for k in old_keys if k not in new_keys]
    return {"new_entries": added, "removed_entries": removed}


def diff_listing(old: list[dict], new: list[dict]) -> dict[str, list]:
    """Detect new / removed entries in the Listing IPO list.

    Identity key: Code first, then Name.
    Also flags if an IPO moved from 'Listing IPO' to 'Listing IPO (Application Closed)'.
    """
    old_keys = {_key(r, ["Code", "Name"]): r for r in old}
    new_keys = {_key(r, ["Code", "Name"]): r for r in new}

    added = [new_keys[k] for k in new_keys if k not in old_keys]
    removed = [old_keys[k] for k in old_keys if k not in new_keys]

    # Detect status changes (open → closed application)
    status_changes = []
    for k in old_keys:
        if k in new_keys:
            old_sec = old_keys[k].get("section", "")
            new_sec = new_keys[k].get("section", "")
            if old_sec != new_sec:
                status_changes.append({
                    "record": new_keys[k],
                    "from": old_sec,
                    "to": new_sec,
                })

    return {
        "new_entries": added,
        "removed_entries": removed,
        "status_changes": status_changes,
    }


def detect_upcoming_to_listing(
    upcoming_old: list[dict],
    upcoming_new: list[dict],
    listing_new: list[dict],
) -> list[dict]:
    """Detect IPOs that disappeared from Upcoming and appeared in Listing."""
    old_upcoming_names = {_key(r, ["Name"]) for r in upcoming_old}
    new_upcoming_names = {_key(r, ["Name"]) for r in upcoming_new}
    new_listing_names = {_key(r, ["Name", "Code"]) for r in listing_new}

    # Names that left the upcoming list
    left_upcoming = old_upcoming_names - new_upcoming_names

    promotions = []
    for listing_record in listing_new:
        listing_name = _key(listing_record, ["Name", "Code"])
        # Check if any departed upcoming company name is a substring of listing name
        for name in left_upcoming:
            if name and (name in listing_name or listing_name in name):
                promotions.append({
                    "name": listing_record.get("Name", listing_name),
                    "listing_record": listing_record,
                })
                break

    return promotions


def load_baseline(path: Path) -> list[dict]:
    if not path.exists():
        return []
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception as e:
        logger.warning("Failed to load baseline %s: %s", path, e)
        return []


def save_baseline(path: Path, data: list[dict]) -> None:
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    logger.info("Saved baseline: %s (%d records)", path.name, len(data))
