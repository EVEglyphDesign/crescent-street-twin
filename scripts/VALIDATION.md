# Live validation record

Validated on 2026-08-08 UTC against all six configured public venue sources.

## Aggregate result

The scanner produced `data/tonight.json` and appended a six-record batch to
`data/scan_log.jsonl` on every run. The final live run reported:

| Slug | Status | Candidate signals |
| --- | --- | ---: |
| `hurleys` | `unchanged` | 12 |
| `sir-winston-churchill` | `unchanged` | 24 |
| `brutopia` | `robots_disallowed` | 0 |
| `ziggys` | `unchanged` | 2 |
| `wienstein-gavinos` | `unchanged` | 4 |
| `brass-door` | `source_unreachable` | 0 |

The initial live scan produced four `new` venues with signals; the next live
scan returned `unchanged` for the four readable pages, confirming SHA-256
change detection.

Verbatim examples retained in the digest:

- Hurley’s: “...catch our biweekly specials before they run out, we’re here for
  you, from 11 am to 11 pm everyday....”
- Sir Winston Churchill: “Remember that at Winnie’s , Happy Hour is every day
  from 5 to 7 PM...”

## Respectful failure handling

Brutopia’s `robots.txt` responded with HTTP 403. The scanner treated that as
deny-all, requested neither configured content path, and emitted
`robots_disallowed` with both skipped paths. The Brass Door returned no
supported visible HTML from its configured sources, so it emitted
`source_unreachable`; the other venues completed normally.

## Append-only checks

After the first per-venue run, every `venues/<slug>/history.jsonl` had one
line. After the second run, each had two lines; after the final validation
run, each had three lines. No history file was rewritten or truncated.

The configurable full-repository layout was also live-tested with
`--out-root`: it produced `docs/data/tonight.json`,
`docs/data/scan_log.jsonl`, and all six
`venues/<slug>/scan/{latest.json,history.jsonl}` pairs.
