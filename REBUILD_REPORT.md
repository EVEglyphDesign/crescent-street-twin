# Crescent Street Twin — dark image-led rebuild: final report

## Deploy arguments (parent must re-run these verbatim so the app surfaces in main chat)

```json
{
  "project_path": "/home/user/workspace/mtl/site",
  "site_name": "Crescent Street Twin — EVEglyphDesign",
  "entry_point": "index.html",
  "should_validate": true
}
```

Tool: `deploy_website`. `publish_website` was NOT called. `share_file` was NOT called.
Result: 34 files uploaded, asset_id `e4e9d634-623f-4059-b154-c13076d369bf`.

## Screens (16 routes)

| Route | Screen |
|---|---|
| `#/tonight` | Home — full-bleed hero_street.jpg, nightly-scan strip (live digest), 3 metric tiles, Brass Door anchor card, other five venues |
| `#/places` | All six venues, photo on every card |
| `#/venue/brass-door` | Full detail (anchor, "First place twinned") |
| `#/venue/hurleys` | Full detail |
| `#/venue/sir-winston-churchill` | Full detail |
| `#/venue/brutopia` | Full detail |
| `#/venue/ziggys` | Full detail |
| `#/venue/wienstein-gavinos` | Full detail |
| `#/live` | Live updating, stage photos, provenance |
| `#/scan` | Nightly automatic scan log, per-venue rows, status chips, "Correct this" |
| `#/account` | Sign-in stub, opt-in toggles, Revoke everything |
| `#/consent` | Consent register, default DENY |
| `#/room` | 3D room scan, view pills |
| `#/street` | Street density, "No query ever returns a person" |
| `#/governance` | Governance |
| `#/credits` | Every photo credited + every venue fact sourced |

Each venue is a real full detail screen (own route, own hero photo, hours, known-for, address, source link, tonight's signals, full menu by section, order block), not a shared modal. Slugs are exactly `brass-door`, `hurleys`, `sir-winston-churchill`, `brutopia`, `ziggys`, `wienstein-gavinos`, matching `data/venues/<slug>.json`.

## Verification

- Playwright QA script `/home/user/workspace/mtl/qa.py`, viewport 390×844, every route × EN and FR, top + bottom (+ mid on long screens). Screenshots in `/home/user/workspace/mtl/site_qa/` (85+ PNGs).
- Final run: `problems: []`, `failed_requests: []`, `console_errors: []`.
- `scrollWidth === 390` asserted on every route in both languages — no horizontal scroll.
- Zero image 404s; zero broken `<img>` (`naturalWidth > 0` on all). All 19 images (13 photos + 6 generated) ship and are used.
- Inter loads locally (`document.fonts.check('16px Inter') === true`), fonts served from `fonts/`.
- Screens visually reviewed one by one, both languages: tonight, places, all six venue details, live, scan, account (incl. revoked state), consent, room, street, governance, credits.
- `file://` smoke test passed: 6 scan rows render from bundled fallback, scrollWidth 390, 0 broken images. The `fetch()` of `data/tonight.json` is blocked under `file://` by the browser; the failure is caught and the app silently falls back to bundled demo data, exactly as specified.

## Functional checks (asserted, not just eyeballed)

- Brass Door → `https://www.ubereats.com/ca/store/brass-door-pub-2171-rue-crescent/CeygJ0tnQXCRcgpwByncVw`, `target="_blank" rel="noopener"`.
- Wienstein & Gavino's → `https://www.ubereats.com/ca/store/wienstein-and-gavinos/QkVAdy3-RUyakf0Yr2t1Jw`, same attributes.
- Other four venues: **0** delivery buttons, exactly one "Dine-in only" line each. No URL was fabricated or pattern-guessed.
- Menus with `menu_source: "not published"` show item names + "price not published" and the banner "Prices not published — menu supplied by the venue" / « Prix non publiés — menu fourni par l'établissement ». No price was invented anywhere.
- Account: all toggles `false` on load; facial recognition permanently disabled ("Unavailable by design"); Location "Always" requires a second confirm dialog before flipping; "Revoke everything" resets all toggles to false.
- Consent register: "Deny by default" → "1 permission active" after grant → back to deny after revoke.
- Scan screen: 6 rows; `source_unreachable` (Ziggy's) and `robots_disallowed` (Wienstein & Gavino's) rendered honestly; low-confidence signals carry a visible "unverified" / « non vérifié » chip.
- Tab bar: 5 tabs, 62px tall plus safe-area inset, active tab orange.
- Language toggle swaps copy, placeholders and `html[lang]`, and persists via a feature-detected store with in-memory fallback (no raw `localStorage`).

## Live data binding

`data/tonight.json` is fetched at load by both the home strip and the Scan screen, validated (`validDigest()`), and silently falls back to bundled `DEMO_TONIGHT` if missing or malformed. A realistic hand-written digest ships today: `generated_at` 2026-08-07T04:12:00-04:00, 6 venues, 4 new, with bilingual snippets and the two non-OK statuses above.

## Late polish in this final pass

- Photo filters lightened (`brightness 0.78 → 0.88` on `.photo img`, `0.80 → 0.86` on venue cards) — the room-scan and detail heroes were reading murky.
- Removed the duplicated "Dine-in only — Dine-in only …" wording on the four dine-in venues.
- French confidence labels were leaking English words ("Confiance high") — now élevée / moyenne / faible.
- Ziggy's gallery given a second image.
- Wide screens: the app is now a centred 460px phone column with hairline side borders on a near-black field, instead of stretching images across a desktop window. Mobile at 390px is unchanged.

## Not done / caveats

- Nothing in the brief was skipped. Two honest limitations worth flagging to the operator:
  - Under `file://`, `fetch('data/tonight.json')` is blocked by the browser and Chrome logs a console message before the app's catch swallows it. Behaviour is correct (bundled fallback renders) but the console line is unavoidable without dropping `fetch`. Over http/GitHub Pages it loads normally.
  - The deploy preview thumbnail renders at desktop width; the design target is 390×844. All QA was done at 390×844.
