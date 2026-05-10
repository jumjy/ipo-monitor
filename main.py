"""IPO Monitor — core runner.

Usage:
    python main.py              Run once and exit
    python main.py --daemon     Run on a recurring schedule
    python main.py --dry-run    Scrape + diff, print changes, do NOT notify
    python main.py --test-notify Send a test Line Notify message
"""
import argparse
import logging
import sys
from typing import Any

import config
from diff_engine import (
    detect_upcoming_to_listing,
    diff_listing,
    diff_upcoming,
    load_baseline,
    save_baseline,
)
from notifier import build_alert_message, notify, send_line_notify
from scraper import scrape_listing_ipo, scrape_upcoming_ipo

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler(config.LOG_DIR / "ipo_monitor.log", encoding="utf-8"),
    ],
)
logger = logging.getLogger(__name__)

BASELINE_UPCOMING = config.DATA_DIR / "baseline_upcoming.json"
BASELINE_LISTING = config.DATA_DIR / "baseline_listing.json"


def run_once(dry_run: bool = False) -> dict[str, Any]:
    """Run one check cycle. Returns a result dict describing what changed."""
    logger.info("=== IPO Monitor check started ===")

    old_upcoming = load_baseline(BASELINE_UPCOMING)
    old_listing = load_baseline(BASELINE_LISTING)

    try:
        new_upcoming = scrape_upcoming_ipo()
        new_listing = scrape_listing_ipo()
    except Exception as e:
        logger.error("Scrape failed: %s", e)
        return {"error": str(e)}

    # First run: save baselines, no diff
    if not old_upcoming and not old_listing:
        logger.info("First run — saving baselines")
        save_baseline(BASELINE_UPCOMING, new_upcoming)
        save_baseline(BASELINE_LISTING, new_listing)
        return {"first_run": True, "upcoming_count": len(new_upcoming), "listing_count": len(new_listing)}

    up_diff = diff_upcoming(old_upcoming, new_upcoming)
    lst_diff = diff_listing(old_listing, new_listing)
    promotions = detect_upcoming_to_listing(old_upcoming, new_upcoming, new_listing)

    if up_diff["new_entries"]:
        logger.info("New upcoming IPOs: %s", [r.get("Name") for r in up_diff["new_entries"]])
    if up_diff["removed_entries"]:
        logger.info("Removed from upcoming: %s", [r.get("Name") for r in up_diff["removed_entries"]])
    if lst_diff["new_entries"]:
        logger.info("New listing IPOs: %s", [r.get("Name") for r in lst_diff["new_entries"]])
    if lst_diff["status_changes"]:
        logger.info("Status changes: %d", len(lst_diff["status_changes"]))
    if promotions:
        logger.info("Upcoming→Listing: %s", [p["name"] for p in promotions])

    message = build_alert_message(up_diff, lst_diff, promotions)
    if message:
        logger.info("Alert:\n%s", message)
        if not dry_run:
            notify(message)
    else:
        logger.info("No changes detected")

    if not dry_run:
        save_baseline(BASELINE_UPCOMING, new_upcoming)
        save_baseline(BASELINE_LISTING, new_listing)

    logger.info("=== IPO Monitor check complete ===")

    return {
        "first_run": False,
        "upcoming_count": len(new_upcoming),
        "listing_count": len(new_listing),
        "new_upcoming": up_diff["new_entries"],
        "removed_upcoming": up_diff["removed_entries"],
        "new_listing": lst_diff["new_entries"],
        "status_changes": lst_diff["status_changes"],
        "promotions": promotions,
        "has_changes": message is not None,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="IPO Monitor")
    parser.add_argument("--daemon", action="store_true")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--test-notify", action="store_true")
    args = parser.parse_args()

    if args.test_notify:
        ok = send_line_notify("\n🔔 IPO Monitor — test notification ✅")
        sys.exit(0 if ok else 1)

    if args.daemon:
        from scheduler import start_daemon
        start_daemon()
    else:
        run_once(dry_run=args.dry_run)


if __name__ == "__main__":
    main()
