"""Send alerts via Line Notify with optional email fallback."""
import logging
import smtplib
from email.mime.text import MIMEText
from typing import Any

import requests

import config

logger = logging.getLogger(__name__)

LINE_NOTIFY_URL = "https://notify-api.line.me/api/notify"


def send_line_notify(message: str) -> bool:
    if not config.LINE_NOTIFY_TOKEN:
        logger.warning("LINE_NOTIFY_TOKEN not set — skipping Line Notify")
        return False
    try:
        r = requests.post(
            LINE_NOTIFY_URL,
            headers={"Authorization": f"Bearer {config.LINE_NOTIFY_TOKEN}"},
            data={"message": message},
            timeout=15,
        )
        if r.status_code == 200:
            logger.info("Line Notify sent successfully")
            return True
        logger.error("Line Notify failed: %s %s", r.status_code, r.text)
        return False
    except Exception as e:
        logger.error("Line Notify exception: %s", e)
        return False


def send_email_fallback(subject: str, body: str) -> bool:
    if not all([config.SMTP_USER, config.SMTP_PASS, config.EMAIL_TO]):
        logger.warning("Email config incomplete — skipping email fallback")
        return False
    try:
        msg = MIMEText(body, "plain", "utf-8")
        msg["Subject"] = subject
        msg["From"] = config.SMTP_USER
        msg["To"] = config.EMAIL_TO
        with smtplib.SMTP(config.SMTP_HOST, config.SMTP_PORT) as server:
            server.starttls()
            server.login(config.SMTP_USER, config.SMTP_PASS)
            server.send_message(msg)
        logger.info("Email fallback sent to %s", config.EMAIL_TO)
        return True
    except Exception as e:
        logger.error("Email fallback exception: %s", e)
        return False


def notify(message: str) -> None:
    """Try Line Notify first; fall back to email if configured."""
    ok = send_line_notify(message)
    if not ok and config.EMAIL_FALLBACK:
        send_email_fallback("IPO Monitor Alert", message)


# ── Message formatters ──────────────────────────────────────────────────────

def _fmt_upcoming(record: dict[str, Any]) -> str:
    name = record.get("Name", "Unknown")
    industry = record.get("Industry", "")
    board = record.get("Board", "")
    first_date = record.get("First Posting Date", "")
    latest_date = record.get("Latest Posting Date", "")
    return (
        f"  📋 {name}\n"
        f"     Industry: {industry} | Board: {board}\n"
        f"     Posting: {first_date} ~ {latest_date}"
    )


def _fmt_listing(record: dict[str, Any]) -> str:
    code = record.get("Code", "")
    name = record.get("Name", "Unknown")
    listing_date = record.get("Listing Date", "")
    currency = record.get("Currency", "HKD")
    offer_price = record.get("Offer Price", record.get("Listing Price", ""))
    board_lot = record.get("Board Lot", "")
    register_close = record.get("Register Close", "")
    section = record.get("section", "")
    lines = [f"  📊 [{code}] {name}"]
    if section:
        lines.append(f"     Status: {section}")
    if listing_date:
        lines.append(f"     Listing Date: {listing_date}")
    if offer_price:
        lines.append(f"     Price: {currency} {offer_price}")
    if board_lot:
        lines.append(f"     Board Lot: {board_lot} shares")
    if register_close:
        lines.append(f"     Register Close: {register_close}")
    return "\n".join(lines)


def build_alert_message(
    upcoming_diff: dict,
    listing_diff: dict,
    promotions: list[dict],
) -> str | None:
    """Build a combined alert message. Returns None if nothing to report."""
    parts: list[str] = []

    if upcoming_diff.get("new_entries"):
        entries = "\n".join(_fmt_upcoming(r) for r in upcoming_diff["new_entries"])
        parts.append(f"🆕 New Upcoming IPO(s):\n{entries}")

    if listing_diff.get("new_entries"):
        entries = "\n".join(_fmt_listing(r) for r in listing_diff["new_entries"])
        parts.append(f"🔔 New Listing IPO(s) — Subscription Open:\n{entries}")

    if listing_diff.get("status_changes"):
        for change in listing_diff["status_changes"]:
            rec = change["record"]
            code = rec.get("Code", "")
            name = rec.get("Name", "")
            parts.append(
                f"🔄 Status Change: [{code}] {name}\n"
                f"   {change['from']} → {change['to']}"
            )

    if promotions:
        for p in promotions:
            parts.append(
                f"🚀 Upcoming → Listing: {p['name']}\n"
                + _fmt_listing(p["listing_record"])
            )

    if not parts:
        return None

    return "\n\n" + "\n\n".join(parts)
