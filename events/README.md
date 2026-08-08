# Crescent Street events calendar — dataset README

**Compiled:** 7 August 2026
**Coverage window:** 7 August 2026 through 31 December 2026, plus recurring weekly venue programming (which has no end date and is expected to continue indefinitely unless a source says otherwise).
**Scope:** Rue Crescent, downtown Montréal (Ville-Marie borough), and the city-wide/downtown-adjacent festivals and sports fixtures whose crowds spill onto or near Crescent Street.

## What's in this folder

| File | Contents |
|---|---|
| `events.json` | Array of individual event records — festivals, street closures, sports fixtures, and recurring venue nights, each with a real source URL. |
| `sources.md` | Every source consulted, grouped by type, with notes on update cadence, feed format, and `robots.txt` permissiveness. |
| `scan_targets.json` | The subset of sources suitable for an automated nightly scan — only sources whose `robots.txt` permits automated reading. |
| `README.md` | This file. |

## How to read `confidence`

- **`confirmed`** — Stated directly on an official organiser, venue, city, or league source, with a specific date (or specific recurring pattern, e.g. Brutopia's Wednesday–Saturday 22:00 live-band slot). Safe to present as fact, with the citation attached.
- **`announced`** — The event/edition is publicly announced but some specifics (exact route, full closure hours, etc.) are not yet published. Present with the caveat that details are pending.
- **`expected_annual`** — No 2026/2027 date has been published yet, but the event or pattern is annual and a previous edition's source is cited as the basis for the expectation. **This must not be presented as a confirmed date.** It exists so a human or a future scan knows to look for the announcement, and so no one accidentally assumes a specific date.
- **`unverified`** — A venue or organiser has referenced something (e.g. "DJ nights," "various comedy shows," "Nuit Brass") without publishing a day, time, or recurring pattern. Recorded so the *existence* of the offering isn't lost, but the specifics are explicitly not known and must not be invented.

**Hard rule carried over from the task brief: entries marked `expected_annual` or `unverified` must never be rendered to an end user as if they were confirmed facts.** Any consuming application (calendar UI, chatbot, etc.) should visually or textually distinguish these — e.g. "usually happens around X, not yet confirmed for 2026/2027" — rather than showing a bare date or a bare claim.

## Why some 2026 events are already in the past

"Today" for this dataset is 7 August 2026. Several major festivals in scope (the Crescent Street Grand Prix Festival, the F1 Canadian Grand Prix, Jazz Fest, Francos, Just for Laughs, Osheaga, Nuit Blanche/Montréal en Lumière) already took place earlier in 2026. They are still included because:

1. They establish the confirmed *pattern* (dates, hours, footprint) that next year's `expected_annual` entries are based on.
2. A consuming calendar might still want a "this year, for reference" view even after the fact.

Fierté Montréal (festival through Aug 9, parade Aug 9) and all remaining 2026 Montréal Canadiens home games (Oct–Dec) are genuinely upcoming from the 7 August 2026 vantage point.

## The biggest limitation of this dataset

Very little Crescent-Street-specific programming is published in a structured, dated, machine-readable way anywhere on the public web. Four of the six venues in scope (Ziggy's, Wienstein & Gavino's, The Brass Door Pub, and — beyond the bare "live every night" claim — Hurley's) publish **no** recurring schedule of live music, trivia, karaoke, or DJ nights at all. Brutopia is the exception: it publishes a genuine day-by-day calendar with a stated nightly showtime. Sir Winston Churchill publishes only its daily Happy Hour. See `sources.md` for the full breakdown and the report delivered alongside this dataset for the three biggest scanning gaps.

## How to refresh this dataset

1. **Start with `scan_targets.json`.** Poll each URL at its suggested frequency. For `json_api`/`rss` targets, diff against the last-seen content; for `html` targets, diff the extracted table/section described in `what_to_extract`.
2. **Re-run the open-data CSV filter** (`arrondissement == 'Ville-Marie'`) from the Ville de Montréal dataset first — it is the most authoritative and highest-frequency-updating civic source, even though it does not currently name Crescent Street directly.
3. **Re-check the festival "events sitemap" XML feeds** (Jazz Fest, Francos, Osheaga, Montréal en Lumière) for newly announced editions or updated dates.
4. **Re-fetch each venue homepage** listed in `scan_targets.json`. Brutopia's calendar changes weekly (new named performers) even though the underlying weekly *pattern* (Wed–Sat bands at 22:00, Sunday open mic, Monday trivia) is stable — update performer-level detail only if the task requires it; the recurring pattern itself needs re-confirmation only if the venue's site structure changes.
5. **Never invent a date.** If a refresh finds only a month or a vague "usually June" reference, set `start_date`/`end_date` to `null`, record what was published in `notes`, and set `confidence` to `expected_annual` or `unverified` as appropriate — exactly as this dataset does today.
6. **Re-verify `robots.txt`** for each domain periodically (sites change bot policies); update `sources.md` and `scan_targets.json` if a previously-allowed source becomes disallowed, or vice versa.

## Citation discipline

Every event record carries its own `source_url` and `source_name`. When this dataset is rendered into any user-facing page, calendar, or report, each event must remain linked to that source — do not strip citations when repackaging this data downstream.
