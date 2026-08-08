#!/usr/bin/env python3
"""Nightly public-publishing scan for The Crescent Street Twin.

This is intentionally a small, conservative reader of what venues already
publish publicly.  It is not a booking, ordering, or venue-management system:
venues do not pay, opt in, or need to do anything for their public pages to be
read.  A removal request is honoured through the venues configuration.
"""

from __future__ import annotations

import hashlib
import json
import os
import re
import tempfile
import time
import unicodedata
import argparse
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.parse import urljoin, urlparse
from urllib import robotparser

import requests
from bs4 import BeautifulSoup


ROOT = Path(__file__).resolve().parent
VENUES_PATH = ROOT.parent / "assets" / "venues.json"

# These are fixed to the location folders created by the rest of the project.
VENUE_SLUGS = {
    "The Brass Door Pub": "brass-door",
    "Hurley's Irish Pub": "hurleys",
    "Sir Winston Churchill Pub Complexe": "sir-winston-churchill",
    "Brutopia": "brutopia",
    "Ziggy's Pub": "ziggys",
    "Wienstein & Gavino's": "wienstein-gavinos",
}

CONTACT = "contact@example.com"  # Replace before a production deployment.
USER_AGENT = f"EVEglyphDesign CrescentStreetTwin nightly public-info reader (+mailto:{CONTACT})"
REQUEST_TIMEOUT_SECONDS = 15
REQUEST_DELAY_SECONDS = 2
MAX_CONTENT_PAGES_PER_VENUE = 2
MAX_SIGNALS_PER_VENUE = 24

SPECIAL_RE = re.compile(
    r"\b(?:happy\s*hour|specials?|sp[ée]ciaux?|rabais|2\s*(?:for|pour)\s*1)\b",
    re.IGNORECASE,
)
LIVE_MUSIC_RE = re.compile(
    r"\b(?:live\s+music|musique\s+live|bands?|groupes?|d\.?j\.?)\b",
    re.IGNORECASE,
)
EVENT_RE = re.compile(
    r"\b(?:karaoke|karaok[ée]|comedy|humour|open\s+mic|micro\s+ouvert|trivia|quiz|showtime|tonight|ce\s+soir)\b",
    re.IGNORECASE,
)
WEEKDAY_RE = re.compile(
    r"\b(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday|"
    r"lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)\b",
    re.IGNORECASE,
)
DATE_RE = re.compile(
    r"\b(?:\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?|"
    r"(?:jan(?:uary|vier)?|feb(?:ruary|rier)?|mar(?:ch|s)?|apr(?:il|il)?|"
    r"may|mai|jun(?:e)?|jui(?:n|l(?:let)?)|aug(?:ust)?|ao[ûu]t|"
    r"sep(?:tember|tembre)?|oct(?:ober|obre)?|nov(?:ember|embre)?|"
    r"dec(?:ember|embre)?|d[ée]cembre)\.?\s+\d{1,2})\b",
    re.IGNORECASE,
)
TIME_RE = re.compile(
    r"\b(?:[01]?\d|2[0-3])\s*(?:h(?:\s*[0-5]\d)?|:\s*[0-5]\d|"
    r"(?:a\.?m\.?|p\.?m\.?))\b",
    re.IGNORECASE,
)


class PoliteSession:
    """One session with a process-wide two-second gap between web requests."""

    def __init__(self) -> None:
        self.session = requests.Session()
        self.session.headers.update(
            {
                "User-Agent": USER_AGENT,
                "Accept": "text/html,application/xhtml+xml,application/pdf;q=0.4,*/*;q=0.1",
            }
        )
        self.last_request_at = 0.0

    def get(self, url: str) -> requests.Response:
        wait = REQUEST_DELAY_SECONDS - (time.monotonic() - self.last_request_at)
        if wait > 0:
            time.sleep(wait)
        response = self.session.get(url, timeout=REQUEST_TIMEOUT_SECONDS, allow_redirects=True)
        self.last_request_at = time.monotonic()
        return response


class OutputPaths:
    """Resolve either this scanner's layout or the eventual repository layout."""

    def __init__(self, out_root: str | None) -> None:
        if out_root is None:
            self.aggregate_data_dir = ROOT / "data"
            self.venues_dir = ROOT / "venues"
        else:
            # In the full repository, public data belongs under docs/data and
            # each location owns its scan directory.
            repository_root = Path(out_root).expanduser().resolve()
            self.aggregate_data_dir = repository_root / "docs" / "data"
            self.venues_dir = repository_root / "venues"

    @property
    def tonight_path(self) -> Path:
        return self.aggregate_data_dir / "tonight.json"

    @property
    def log_path(self) -> Path:
        return self.aggregate_data_dir / "scan_log.jsonl"

    def venue_latest_path(self, slug: str) -> Path:
        return self.venues_dir / slug / ("scan/latest.json" if self.uses_repository_layout else "latest.json")

    def venue_history_path(self, slug: str) -> Path:
        return self.venues_dir / slug / ("scan/history.jsonl" if self.uses_repository_layout else "history.jsonl")

    @property
    def uses_repository_layout(self) -> bool:
        return self.aggregate_data_dir.name == "data" and self.aggregate_data_dir.parent.name == "docs"


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def collapse_whitespace(value: str) -> str:
    return re.sub(r"\s+", " ", unicodedata.normalize("NFKC", value)).strip()


def normalise_for_hash(value: str) -> str:
    return collapse_whitespace(value).casefold()


def atomic_json_write(path: Path, value: Any) -> None:
    """Replace a JSON file only after its complete replacement is on disk."""

    path.parent.mkdir(parents=True, exist_ok=True)
    encoded = (json.dumps(value, ensure_ascii=False, indent=2) + "\n").encode("utf-8")
    fd, temporary_name = tempfile.mkstemp(prefix=f".{path.name}.", dir=path.parent)
    try:
        with os.fdopen(fd, "wb") as temporary:
            temporary.write(encoded)
            temporary.flush()
            os.fsync(temporary.fileno())
        os.replace(temporary_name, path)
    finally:
        if os.path.exists(temporary_name):
            os.unlink(temporary_name)


def append_jsonl_atomically(path: Path, value: dict[str, Any]) -> None:
    """Append one whole JSONL record in a single O_APPEND write; never rewrites history."""

    path.parent.mkdir(parents=True, exist_ok=True)
    line = (json.dumps(value, ensure_ascii=False, separators=(",", ":")) + "\n").encode("utf-8")
    descriptor = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_APPEND, 0o644)
    try:
        os.write(descriptor, line)
        os.fsync(descriptor)
    finally:
        os.close(descriptor)


def load_previous(paths: OutputPaths) -> dict[str, dict[str, Any]]:
    if not paths.tonight_path.exists():
        return {}
    try:
        digest = json.loads(paths.tonight_path.read_text(encoding="utf-8"))
        return {item["name"]: item for item in digest.get("venues", []) if "name" in item}
    except (OSError, json.JSONDecodeError):
        # A bad state file must not stop a nightly scan.
        return {}


def is_http_url(value: str) -> bool:
    parsed = urlparse(value)
    return parsed.scheme in {"http", "https"} and bool(parsed.netloc)


def page_text(response: requests.Response) -> str:
    """Return visible textual content from an HTML response, not scripts or markup."""

    content_type = response.headers.get("Content-Type", "").lower()
    if "html" not in content_type and "xhtml" not in content_type:
        return ""
    soup = BeautifulSoup(response.content, "html.parser")
    for ignored in soup(["script", "style", "noscript", "template", "svg"]):
        ignored.decompose()
    return collapse_whitespace(soup.get_text(" ", strip=True))


def short_snippet(text: str, start: int, end: int) -> str:
    """Centre a match in a compact, display-safe excerpt no longer than 160 chars."""

    width = 160
    left = max(0, start - 72)
    right = min(len(text), end + 72)
    snippet = collapse_whitespace(text[left:right])
    if left:
        snippet = "…" + snippet
    if right < len(text):
        snippet += "…"
    if len(snippet) <= width:
        return snippet
    clipped = snippet[: width - 1].rstrip()
    return clipped + "…"


def confidence_for(kind: str, snippet: str) -> str:
    time_or_date = bool(TIME_RE.search(snippet) or DATE_RE.search(snippet) or WEEKDAY_RE.search(snippet))
    has_price_or_discount = bool(
        re.search(r"(?:\$|€|£|\d+\s*%|\b2\s*(?:for|pour)\s*1\b)", snippet, re.IGNORECASE)
    )
    if kind == "special" and (time_or_date or has_price_or_discount):
        return "high"
    if kind in {"live_music", "event"} and time_or_date:
        return "high"
    if kind == "hours_change" and (TIME_RE.search(snippet) and (DATE_RE.search(snippet) or WEEKDAY_RE.search(snippet))):
        return "medium"
    if kind in {"special", "live_music", "event"}:
        return "medium"
    return "low"


def extract_signals(text: str, source_url: str) -> list[dict[str, str]]:
    """Extract conservative candidates, preserving the exact public-page wording."""

    patterns = (
        ("special", SPECIAL_RE),
        ("live_music", LIVE_MUSIC_RE),
        ("event", EVENT_RE),
        ("hours_change", re.compile(rf"(?:{WEEKDAY_RE.pattern}|{DATE_RE.pattern}|{TIME_RE.pattern})", re.IGNORECASE)),
    )
    candidates: list[dict[str, str]] = []
    seen: set[tuple[str, str]] = set()
    for kind, pattern in patterns:
        for match in pattern.finditer(text):
            snippet = short_snippet(text, match.start(), match.end())
            key = (kind, snippet.casefold())
            if key in seen:
                continue
            seen.add(key)
            candidates.append(
                {
                    "snippet": snippet,
                    "type": kind,
                    "source_url": source_url,
                    "confidence": confidence_for(kind, snippet),
                }
            )
            if len(candidates) >= MAX_SIGNALS_PER_VENUE:
                return candidates
    return candidates


def read_robots(
    page_url: str, polite: PoliteSession, robots_cache: dict[str, tuple[robotparser.RobotFileParser | None, str | None]]
) -> tuple[robotparser.RobotFileParser | None, str | None]:
    """Read and parse robots.txt once per origin using urllib.robotparser."""

    parsed = urlparse(page_url)
    origin = f"{parsed.scheme}://{parsed.netloc}"
    if origin in robots_cache:
        return robots_cache[origin]
    robots_url = urljoin(origin, "/robots.txt")
    rules = robotparser.RobotFileParser()
    rules.set_url(robots_url)
    try:
        response = polite.get(robots_url)
        if response.status_code == 404:
            rules.parse([])
            result: tuple[robotparser.RobotFileParser | None, str | None] = (rules, None)
        elif response.status_code in {401, 403}:
            # Match urllib.robotparser's conservative behaviour for access
            # denial: do not treat an inaccessible robots file as permission.
            rules.disallow_all = True
            result = (rules, None)
        elif response.status_code >= 400:
            result = (None, f"robots.txt returned HTTP {response.status_code}")
        else:
            rules.parse(response.text.splitlines())
            result = (rules, None)
    except requests.RequestException as exc:
        result = (None, f"robots.txt unreachable: {exc.__class__.__name__}")
    robots_cache[origin] = result
    return result


def scan_venue(
    venue: dict[str, Any],
    previous: dict[str, Any] | None,
    polite: PoliteSession,
    robots_cache: dict[str, tuple[robotparser.RobotFileParser | None, str | None]],
    timestamp: str,
) -> tuple[dict[str, Any], dict[str, Any]]:
    """Scan no more than the configured primary and menu URLs for one venue."""

    configured_urls: list[str] = []
    for key in ("source_url", "menu_source_url"):
        candidate = venue.get(key)
        if isinstance(candidate, str) and candidate and candidate not in configured_urls:
            configured_urls.append(candidate)
    configured_urls = configured_urls[:MAX_CONTENT_PAGES_PER_VENUE]

    texts: list[tuple[str, str]] = []
    signals: list[dict[str, str]] = []
    http_status: dict[str, int | None] = {}
    errors: list[str] = []
    blocked_urls: list[str] = []

    for source_url in configured_urls:
        if not is_http_url(source_url):
            errors.append(f"invalid URL: {source_url}")
            http_status[source_url] = None
            continue
        rules, robots_error = read_robots(source_url, polite, robots_cache)
        if robots_error:
            errors.append(f"{source_url}: {robots_error}")
            http_status[source_url] = None
            continue
        assert rules is not None
        if not rules.can_fetch(USER_AGENT, source_url):
            blocked_urls.append(source_url)
            errors.append(f"robots_disallowed: {source_url}")
            http_status[source_url] = None
            continue
        try:
            response = polite.get(source_url)
            http_status[source_url] = response.status_code
            response.raise_for_status()
            text = page_text(response)
            if not text:
                errors.append(f"{source_url}: no supported visible HTML text")
                continue
            texts.append((source_url, text))
            signals.extend(extract_signals(text, source_url))
        except requests.RequestException as exc:
            errors.append(f"{source_url}: {exc.__class__.__name__}")

    # De-duplicate exact candidate records when two configured URLs expose the same wording.
    unique_signals: list[dict[str, str]] = []
    seen_signals: set[tuple[str, str, str]] = set()
    for signal in signals:
        key = (signal["type"], signal["snippet"].casefold(), signal["source_url"])
        if key not in seen_signals:
            seen_signals.add(key)
            unique_signals.append(signal)

    normalised_text = "\n".join(f"{url}\n{normalise_for_hash(text)}" for url, text in texts)
    content_hash = hashlib.sha256(normalised_text.encode("utf-8")).hexdigest() if texts else None
    previous_hash = previous.get("content_hash") if previous else None

    if blocked_urls:
        status = "robots_disallowed"
    elif not texts:
        status = "source_unreachable"
    elif content_hash != previous_hash and unique_signals:
        status = "new"
    else:
        # Status is signal-oriented: a text-only change without any candidate
        # signal is retained in the hash but does not create a new digest item.
        status = "unchanged"

    result = {
        "slug": venue["slug"],
        "name": venue["name"],
        "address": venue.get("address", ""),
        "status": status,
        "signals": unique_signals,
        "last_seen": timestamp if texts else (previous or {}).get("last_seen"),
        "source_urls": {
            "source_url": venue.get("source_url"),
            "menu_source_url": venue.get("menu_source_url"),
        },
        "content_hash": content_hash,
        "http_status": http_status,
    }
    if blocked_urls:
        result["robots_disallowed_urls"] = blocked_urls

    log_record = {
        "timestamp": timestamp,
        "slug": venue["slug"],
        "venue": venue["name"],
        "status": status,
        "signal_count": len(unique_signals),
        "content_hash": content_hash,
        "http_status": http_status,
        "error": "; ".join(errors) if errors else None,
    }
    return result, log_record


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Read publicly published Crescent Street venue information once nightly."
    )
    parser.add_argument(
        "--out-root",
        help=(
            "Write using the full repository layout rooted here: docs/data/ and "
            "venues/<slug>/scan/. Without this option, write under this scan directory."
        ),
    )
    arguments = parser.parse_args()
    paths = OutputPaths(arguments.out_root)

    try:
        venues = json.loads(VENUES_PATH.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        print(f"Cannot read venue configuration: {exc}")
        return 2
    if not isinstance(venues, list):
        print("Venue configuration must be a JSON array.")
        return 2

    for venue in venues:
        name = venue.get("name")
        if name not in VENUE_SLUGS:
            print(f"No fixed location slug is configured for venue: {name!r}")
            return 2
        venue["slug"] = VENUE_SLUGS[name]

    timestamp = utc_now()
    previous_by_name = load_previous(paths)
    polite = PoliteSession()
    robots_cache: dict[str, tuple[robotparser.RobotFileParser | None, str | None]] = {}
    scanned: list[dict[str, Any]] = []

    for venue in venues:
        try:
            result, log_record = scan_venue(
                venue, previous_by_name.get(venue.get("name")), polite, robots_cache, timestamp
            )
        except Exception as exc:  # Last-resort isolation: one venue must never halt the nightly digest.
            result = {
                "name": venue.get("name", "Unknown venue"),
                "slug": venue.get("slug", "unknown"),
                "address": venue.get("address", ""),
                "status": "source_unreachable",
                "signals": [],
                "last_seen": previous_by_name.get(venue.get("name", ""), {}).get("last_seen"),
                "source_urls": {
                    "source_url": venue.get("source_url"),
                    "menu_source_url": venue.get("menu_source_url"),
                },
                "content_hash": None,
                "http_status": {},
            }
            log_record = {
                "timestamp": timestamp,
                "slug": result["slug"],
                "venue": result["name"],
                "status": "source_unreachable",
                "signal_count": 0,
                "content_hash": None,
                "http_status": {},
                "error": f"unexpected scanner error: {exc.__class__.__name__}",
            }
        scanned.append(result)
        append_jsonl_atomically(paths.log_path, log_record)
        per_venue_latest = {
            "generated_at": timestamp,
            "slug": result["slug"],
            "name": result["name"],
            "address": result["address"],
            "status": result["status"],
            "signals": result["signals"],
            "content_hash": result["content_hash"],
            "last_seen": result["last_seen"],
            "http_status": result["http_status"],
            "source_urls": result["source_urls"],
        }
        if "robots_disallowed_urls" in result:
            per_venue_latest["robots_disallowed_urls"] = result["robots_disallowed_urls"]
        atomic_json_write(paths.venue_latest_path(result["slug"]), per_venue_latest)
        append_jsonl_atomically(paths.venue_history_path(result["slug"]), log_record)

    digest = {
        "generated_at": timestamp,
        "venue_count": len(scanned),
        "new_count": sum(1 for venue in scanned if venue["status"] == "new"),
        "venues": scanned,
    }
    atomic_json_write(paths.tonight_path, digest)
    print(json.dumps(digest, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
