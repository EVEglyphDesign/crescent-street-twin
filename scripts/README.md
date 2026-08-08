# Crescent Street Twin — nightly public venue scan

The scanner powers the nightly digest for **The Crescent Street Twin**. It reads
only the specials, live music, events, and hours-related details that the six
configured Crescent Street venues already publish on their public web pages.
It does not log in, submit forms, place orders, or infer facts from private
sources.

## Venue-first operating principle

No venue pays and no venue has to opt in for the scanner to read material it
has already published publicly. A venue can be removed at any time: send the
venue name and its public site to the [removal contact](mailto:contact@example.com),
then remove or disable its record in the
[venue configuration](../assets/venues.json) before the next nightly run.

## Safety and cadence

- The scanner runs once nightly at 08:10 UTC (04:10 in Toronto while EDT is in
  effect), with an on-demand run available to maintainers.
- It identifies itself as `EVEglyphDesign CrescentStreetTwin nightly public-info
  reader` and includes a contact placeholder in its User-Agent.
- It uses a 15-second timeout, does not aggressively retry, reads at most two
  configured content pages per venue, and waits at least two seconds between
  web requests.
- It fetches and parses each origin’s `robots.txt` with Python’s
  `urllib.robotparser`. A disallowed path is not read and is recorded as
  `robots_disallowed`; a 401 or 403 response is treated as a deny-all rule.
  Another unavailable `robots.txt` causes a safe `source_unreachable` result
  instead of bypassing the uncertainty.
- Candidate text is deliberately conservative. Low-confidence candidates are
  **unverified** leads, not facts asserted by the digest.

The scheduled workflow is kept as
[`workflow_scan.yml`](workflow_scan.yml) so it can be installed as
`.github/workflows/scan.yml`. By default it writes the front-end digest and an
append-only operational log under `data/`, plus one folder per venue under
`venues/`.

## Run locally

```bash
python -m pip install requests beautifulsoup4
python scan_venues.py
```

Run the command from this directory. The scanner reads
[`../assets/venues.json`](../assets/venues.json), writes `data/tonight.json`
atomically, appends exactly one record per venue to `data/scan_log.jsonl`, and
writes `venues/<slug>/latest.json` plus the append-only
`venues/<slug>/history.jsonl`.

To use the layout of the full repository without changing the script, run it
from that repository’s root:

```bash
python scan/scan_venues.py --out-root .
```

`--out-root` writes the aggregate files to `docs/data/tonight.json` and
`docs/data/scan_log.jsonl`; it writes each venue’s files to
`venues/<slug>/scan/latest.json` and `venues/<slug>/scan/history.jsonl`.
The standalone workflow uses this mode.

## Extraction rules

The scanner first reduces visible HTML to whitespace-collapsed text. It then
captures a maximum 160-character public-page excerpt around conservative
matches. Every signal has a `type` of `special`, `live_music`, `event`, or
`hours_change`, its source page, and `high`, `medium`, or `low` confidence.

Keyword and pattern list:

- **Specials:** `happy hour`, `special`, `spécial`, `rabais`, `2 for 1`,
  `2 pour 1`
- **Live music:** `live music`, `musique live`, `band`, `groupe`, `DJ`
- **Events:** `karaoke`, `karaoké`, `comedy`, `humour`, `open mic`,
  `micro ouvert`, `trivia`, `quiz`, `showtime`, `tonight`, `ce soir`
- **Hours/date context:** English and French weekday names; calendar dates;
  times such as `21h`, `9pm`, and `22:00`

`high` requires a stronger pairing, such as an event/music term with a time or
date, or a special with a time/date, price, percentage, or `2 for 1` wording.
An isolated time or weekday is `low`; it is displayed as unverified.

## Output schemas

### `data/tonight.json`

This is the current front-end digest. `content_hash` is retained strictly for
the next run’s change detection. `last_seen` is an ISO-8601 UTC timestamp for
the last successful visible-text read; it remains the prior value if a source
is unavailable.

```json
{
  "generated_at": "2026-08-08T01:10:00Z",
  "venue_count": 6,
  "new_count": 2,
  "venues": [
    {
      "name": "string",
      "slug": "brass-door | hurleys | sir-winston-churchill | brutopia | ziggys | wienstein-gavinos",
      "address": "string",
      "status": "new | unchanged | source_unreachable | robots_disallowed",
      "signals": [
        {
          "snippet": "string (maximum 160 characters)",
          "type": "special | live_music | event | hours_change",
          "source_url": "string",
          "confidence": "high | medium | low"
        }
      ],
      "last_seen": "ISO-8601 UTC timestamp or null",
      "source_urls": {
        "source_url": "string or null",
        "menu_source_url": "string or null"
      },
      "content_hash": "SHA-256 hex string or null",
      "http_status": {
        "source URL string": 200
      },
      "robots_disallowed_urls": ["optional string array"]
    }
  ]
}
```

Status meanings:

- `new`: visible page text changed since the prior digest (the scanner keeps
  candidate signals for review).
- `unchanged`: the normalised visible text has the same SHA-256 hash as the
  prior successful read, or a text-only change had no candidate signal to
  present as a digest item.
- `source_unreachable`: no configured page yielded readable visible HTML.
- `robots_disallowed`: one or more configured paths were disallowed and were
  skipped. The skipped paths are listed in `robots_disallowed_urls`.

### `data/scan_log.jsonl`

This is an **append-only** JSON Lines audit log. The scanner opens it with
append semantics and writes one object for every configured venue on every
run; it never rewrites or truncates prior records.

```json
{
  "timestamp": "ISO-8601 UTC timestamp",
  "slug": "fixed location slug",
  "venue": "string",
  "status": "new | unchanged | source_unreachable | robots_disallowed",
  "signal_count": 0,
  "content_hash": "SHA-256 hex string or null",
  "http_status": {
    "source URL string": 200
  },
  "error": "string or null"
}
```

`http_status` may contain `null` for a blocked, invalid, or failed request.
The scanner continues after any one venue fails, so a single unreachable or
disallowed site cannot prevent the rest of the nightly digest from being
produced.

### Per-venue `latest.json`

Each configured location has one current result in its own folder. The
standalone scanner uses `venues/<slug>/latest.json`; the repository mode uses
`venues/<slug>/scan/latest.json`.

```json
{
  "generated_at": "ISO-8601 UTC timestamp",
  "slug": "fixed location slug",
  "name": "string",
  "address": "string",
  "status": "new | unchanged | source_unreachable | robots_disallowed",
  "signals": ["same signal objects as tonight.json"],
  "content_hash": "SHA-256 hex string or null",
  "last_seen": "ISO-8601 UTC timestamp or null",
  "http_status": {
    "source URL string": 200
  },
  "source_urls": {
    "source_url": "string or null",
    "menu_source_url": "string or null"
  }
}
```

### Per-venue `history.jsonl`

Each location’s `history.jsonl` is append-only. It receives exactly one
JSON-object line for that venue for every scanner run and uses the same fields
as an aggregate `scan_log.jsonl` record (`timestamp`, `slug`, `venue`,
`status`, `signal_count`, `content_hash`, `http_status`, and `error`). It is
never replaced or truncated.
