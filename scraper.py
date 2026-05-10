"""Scraper for etnet.com.hk IPO page."""
import json
import logging
import re
import time
from typing import Any

import requests
from bs4 import BeautifulSoup, Comment

logger = logging.getLogger(__name__)

URL = "https://www.etnet.com.hk/www/eng/stocks/ci_ipo.php"
HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0 Safari/537.36"
    )
}


def _fetch_raw(retries: int = 3, backoff: float = 5.0) -> str:
    last_err: Exception | None = None
    for attempt in range(1, retries + 1):
        try:
            r = requests.get(URL, headers=HEADERS, timeout=20)
            r.raise_for_status()
            return r.text
        except Exception as e:
            last_err = e
            logger.warning("Fetch attempt %d/%d failed: %s", attempt, retries, e)
            if attempt < retries:
                time.sleep(backoff * attempt)
    raise RuntimeError(f"Failed to fetch {URL} after {retries} attempts") from last_err


def _fetch(retries: int = 3, backoff: float = 5.0) -> BeautifulSoup:
    last_err: Exception | None = None
    for attempt in range(1, retries + 1):
        try:
            r = requests.get(URL, headers=HEADERS, timeout=20)
            r.raise_for_status()
            return BeautifulSoup(r.text, "lxml")
        except Exception as e:
            last_err = e
            logger.warning("Fetch attempt %d/%d failed: %s", attempt, retries, e)
            if attempt < retries:
                time.sleep(backoff * attempt)
    raise RuntimeError(f"Failed to fetch {URL} after {retries} attempts") from last_err


def _extract_between_comments(soup: BeautifulSoup, start_marker: str, end_marker: str) -> BeautifulSoup | None:
    start = soup.find(string=lambda t: isinstance(t, Comment) and start_marker in t)
    if not start:
        return None
    fragments = []
    for sib in start.next_siblings:
        if isinstance(sib, Comment) and end_marker in sib:
            break
        fragments.append(str(sib))
    return BeautifulSoup("".join(fragments), "lxml")


def _table_to_dicts(table) -> list[dict[str, str]]:
    rows = table.find_all("tr")
    if not rows:
        return []
    headers = [th.get_text(" ", strip=True) for th in rows[0].find_all(["th", "td"])]
    results = []
    for row in rows[1:]:
        cells = [td.get_text(" ", strip=True) for td in row.find_all(["th", "td"])]
        if not any(cells):
            continue
        padded = cells + [""] * (len(headers) - len(cells))
        results.append(dict(zip(headers, padded)))
    return results


def scrape_upcoming_ipo() -> list[dict[str, Any]]:
    """Scrape 'Upcoming IPO (Passed Hearing)' section.

    Returns list of dicts with keys: Name, Industry, Board,
    First Posting Date, Latest Posting Date.
    """
    soup = _fetch()
    section = _extract_between_comments(soup, "Begin NEW_IPO", "END_NEW_IPO")
    if not section:
        logger.warning("Upcoming IPO section not found")
        return []
    table = section.find("table")
    if not table:
        return []
    records = _table_to_dicts(table)
    # Strip noise like ' Listing in N Days' appended to names
    for r in records:
        if "Name" in r:
            r["Name"] = r["Name"].split(" Listing in ")[0].strip()
    logger.info("Upcoming IPO: %d records", len(records))
    return records


def scrape_listing_ipo() -> list[dict[str, Any]]:
    """Scrape 'Listing IPO' (open subscription) and 'Listing IPO (Application Closed)'.

    Returns list of dicts, each with a 'section' key indicating which section
    it came from: 'Listing IPO' or 'Listing IPO (Application Closed)'.
    """
    soup = _fetch()

    detail_starts = [
        c for c in soup.find_all(string=lambda t: isinstance(t, Comment) and "Begin IPO Detail" in t)
    ]

    results: list[dict[str, Any]] = []

    for start in detail_starts:
        end = start.find_next(string=lambda t: isinstance(t, Comment) and "End IPO Detail" in t)
        fragments = []
        for sib in start.next_siblings:
            if sib is end:
                break
            fragments.append(str(sib))
        sec_soup = BeautifulSoup("".join(fragments), "lxml")

        header_div = sec_soup.find("div", class_="DivTemplateBHdr")
        if not header_div:
            continue
        section_name = header_div.get_text(strip=True)

        # Only process Listing IPO sections
        if "Listing IPO" not in section_name:
            continue

        table = sec_soup.find("table", class_="figureTable")
        if not table:
            continue

        records = _table_to_dicts(table)
        for r in records:
            if "Name" in r:
                r["Name"] = r["Name"].split(" IPO Closing")[0].split(" Listing in ")[0].strip()
            r["section"] = section_name

        results.extend(records)
        logger.info("%s: %d records", section_name, len(records))

    return results


def scrape_timetable() -> list[dict[str, Any]]:
    """Scrape IPO timetable dates from the embedded JS `var listing` variable.

    Returns list of dicts with keys:
    stockcode, name, applicationstart, applicationend, resultdate, listdate, remindereng
    """
    html = _fetch_raw()
    m = re.search(r'var listing\s*=\s*(\{.*?\});', html, re.DOTALL)
    if not m:
        logger.warning("IPO timetable JS variable not found")
        return []
    try:
        data = json.loads(m.group(1))
    except json.JSONDecodeError as e:
        logger.error("Failed to parse listing JS variable: %s", e)
        return []

    entries = data.get("listingipos", [])
    results = []
    for e in entries:
        results.append({
            "stockcode": e.get("stockcode", ""),
            "name": e.get("nameeng", e.get("namechitc", "")),
            "applicationstart": e.get("applicationstart", ""),
            "applicationend": e.get("applicationend", ""),
            "resultdate": e.get("resultdate", ""),
            "listdate": e.get("listdate", ""),
            "remindereng": e.get("remindereng", ""),
        })
    logger.info("Timetable: %d entries", len(results))
    return results
