# The Crescent Street Twin

> **Wireframe notice.** This repository contains a WIREFRAME with demo data. It is not a live service, a surveillance product, or an operating venue platform.

## What this is

The Crescent Street Twin is a consent-first digital-twin concept for a small group of bars on rue Crescent in downtown Montréal, beginning with The Brass Door Pub at 2171 rue Crescent. The public surface will gather the specials, live music, and events that participating venues have already chosen to publish, while leaving personal participation strictly opt-in.

## The six venues

| Venue | Address | Primary source |
| --- | --- | --- |
| The Brass Door Pub | 2171 Rue Crescent, Montréal, QC H3G 2C1 | [The Brass Door Pub official site](https://brassdoor.pub/) |
| Hurley’s Irish Pub | 1225 Rue Crescent, Montréal, QC H3G 2B1 | [Hurley’s Irish Pub official site](https://www.hurleysirishpub.com/) |
| Sir Winston Churchill Pub Complexe | 1455–1459 Rue Crescent, Montréal, QC H3G 2B2 | [Sir Winston Churchill Pub Complexe official site](https://www.swcpc.com/) |
| Brutopia | 1219 Rue Crescent, Montréal, QC H3G 2B1 | [Brutopia official site](https://www.brutopia.net/) |
| Ziggy’s Pub | 1470 Rue Crescent, Montréal, QC H3G 2B6 | [Ziggy’s Pub official site](https://ziggyspub.ca/) |
| Wienstein & Gavino’s | 1434 Rue Crescent, Montréal, QC H3G 2B6 | [Wienstein & Gavino’s official site](https://www.wgmtl.com/) |

Detailed fact provenance, menu-price publication status, and delivery verification are in [SOURCES.md](SOURCES.md).

## The nightly scan — and why it costs venues nothing

A nightly automated scan is intended to republish only the specials, live-music notices, and events that venues already publish publicly. The planned scan writes its output to `docs/data/` for the public site to read; it does not ask venues to buy software, supply a feed, or pay a listing fee. The goal is a lightweight public index, not a new operational burden for venue teams.

## Consent is layer zero

Any personal-data feature is designed around these constraints:

- **Default-deny:** nothing personal is collected or shared until a person actively opts in.
- **Audience-scoped:** a person chooses who, if anyone, may receive an authorized share.
- **Purpose-bound:** a consent applies only to the stated purpose, not to a general profile.
- **Expiring:** consent expires after 12 months unless the person renews it.
- **Revocable:** one action revokes a consent and stops future use under it.
- **No biometric template:** the project does not create facial, voice, gait, or other biometric templates.
- **Minors are out of scope:** no participation pathway is intended for people under the age of majority.

## Opt-in location and media sharing

Signed-in people could elect to share location or photo/video material only after a specific opt-in. A location share should be limited by audience, purpose, and time. A photo or video share should be limited by the same controls, with visible consent state and a practical deletion/revocation path. Neither feature is required to use the public venue information, and neither is represented as active in this wireframe.

## A governed Canadian tenant

The intended production posture is a Canadian data tenant in Canada Central or Canada East, overseen by a small council that includes independent Québec counsel. The design calls for customer-managed keys, a subscriber-readable audit log, and an exit right so subscribers can leave with a clear record and without artificial lock-in. This is a governance target for a future service, not a claim that this static wireframe currently provides those controls.

## Removing a venue or a person

A venue can request removal or correction of its listing, and a person can request removal of personal material or exercise revocation. Until a service contact process is implemented, use the contact route published by the relevant venue or repository owner; requests should identify the material, the requested action, and a way to verify authority. The intended response is to stop further publication or sharing promptly while the request is assessed.

## Repository layout

```text
README.md          Repository front door and project commitments
SOURCES.md         Venue-fact provenance and delivery/price status
CREDITS.md         Photograph licences and AI-illustration labels
venues/            One self-contained folder per location; see [venues/README.md](venues/README.md)
venues/<slug>/     Venue record, factual venue page, and media/consent/scan placeholders
docs/              GitHub Pages surface
docs/index.html    Temporary placeholder, to be replaced by the site
docs/data/         Future aggregate nightly scan outputs
```

## Licensing and image credits

Photographs are used under their own licences, recorded individually in [CREDITS.md](CREDITS.md). AI-generated illustrations are explicitly marked as such in the same file. This repository does not claim a single replacement licence for third-party photographs.
