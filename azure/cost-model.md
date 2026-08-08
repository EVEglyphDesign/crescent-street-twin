# Cost Model — The Crescent Street Twin

All figures are **estimates, not quotes**, per Microsoft's own disclaimer on every Azure pricing page ("Prices are estimates only and are not intended as actual price quotes... actual pricing may vary depending on the type of agreement entered with Microsoft, date of purchase, and the currency exchange rate" — [Azure API Management pricing](https://azure.microsoft.com/en-us/pricing/details/api-management/), same boilerplate appears on every Azure pricing page checked for this document). Several official Azure pricing pages render their numeric values via client-side JavaScript keyed to browser geolocation and could not be extracted as static text during this research pass — where that happened, a secondary/aggregator source is cited alongside and the number is explicitly flagged as **unverified against the primary source**. USD-to-CAD figures use an approximate rate of **1 USD ≈ 1.40 CAD**, per [WSJ: USD to CAD Exchange Rate](https://www.wsj.com/market-data/quotes/fx/USDCAD) (late July 2026). Ranges are given, not false precision — treat every number here as "order of magnitude," to be replaced with a real Azure Pricing Calculator estimate (in CAD, in-portal, with the actual subscription's negotiated rates if any) before any budget commitment.

## 1. Assumptions (stated explicitly)

| Assumption | 6 venues | 20 venues | 60 venues |
|---|---|---|---|
| Monthly active users | ~1,500 (low thousands, per constraint) | ~5,000 | ~15,000 |
| Nightly scan job runs | 30/month, ~6 page-fetches each, a few seconds of compute each | 30/month, ~20 fetches each | 30/month, ~60 fetches each |
| API calls (consent, revoke, read digest, upload, presence) | ~10 per active user per month ≈ 15,000/month | ≈ 50,000/month | ≈ 150,000/month |
| Consent register documents | ~1,500 active grants, small JSON docs (<2 KB each) | ~5,000 | ~15,000 |
| Photos/video uploaded per venue per month | ~50 photos + ~5 short videos, avg 3 MB/photo, 30 MB/video ≈ 300 MB/venue/month | same per-venue rate × 20 ≈ 6 GB/month new | same per-venue rate × 60 ≈ 18 GB/month new |
| 3D room models | 1 per venue, ~50–200 MB each (one-time + occasional updates) | 20 models | 60 models |
| Ledger records | ~1 hash record per consent event + per media upload ≈ 2,000/month, <1 KB each | ≈ 7,000/month | ≈ 20,000/month |
| Diagnostic log volume | ~0.5–1 GB/month ingested (audit category group only, not allLogs) | ~2–3 GB/month | ~6–10 GB/month |
| Cumulative media+3D storage after 12 months | ~4–5 GB | ~15–20 GB | ~50–60 GB |

These are working assumptions for order-of-magnitude estimation, not measured data — there is no live deployment yet.

## 2. Monthly cost table by service, at each scale

All figures in **CAD**, rounded to a sensible range. "—" means effectively zero / within a permanent free grant.

| Service | Unit pricing (source) | 6 venues | 20 venues | 60 venues |
|---|---|---|---|---|
| Storage — static site + digest + media + ledger (Standard, GRS) | Storage transactions/GB + GRS multiplier; official page renders values client-side, so using [Azure Storage redundancy overview](https://learn.microsoft.com/en-us/azure/storage/common/storage-redundancy) for GRS mechanics and typical published GRS rates ≈ $0.045 USD/GB (~$0.063 CAD/GB) as a working figure, per [n2ws.com: Azure Backup Pricing](https://n2ws.com/blog/azure-backup-pricing) analog rates — **unverified against primary pricing page, flagged** | $2–5 | $5–12 | $15–35 |
| Azure Functions, Consumption (nightly job + HTTP API) | $0.000016/GB-s + $0.20/million executions, free grant 400,000 GB-s + 1M executions/month — [Azure Functions pricing](https://azure.microsoft.com/en-us/pricing/details/functions/) | — (within free grant) | — to $2 | $2–10 |
| Cosmos DB for NoSQL, serverless (consent register + location + presence) | Pay per RU consumed + storage, no free tier in serverless mode — [Azure Cosmos DB serverless pricing](https://azure.microsoft.com/en-ca/pricing/details/cosmos-db/serverless/) | $3–8 | $8–20 | $20–50 |
| Blob immutable storage overhead (ledger WORM container) | Same Blob Storage rates as above; immutability itself adds no separate fee, only the underlying storage — [Microsoft Learn: Overview of immutable storage for blob data](https://learn.microsoft.com/en-us/azure/storage/blobs/immutable-storage-overview) | <$1 | $1–2 | $2–5 |
| Key Vault Premium (CMK, HSM-backed keys) | ≈$1/key/month + $0.03/10,000 transactions — [Azure Key Vault pricing](https://azure.microsoft.com/en-us/pricing/details/key-vault/), corroborated by [pump.co: Azure Key Vault Pricing guide](https://www.pump.co/blog/azure-key-vault-pricing/); assume 3–5 keys (Storage CMK, Cosmos CMK, spare/rotation) | $5–10 | $8–15 | $10–20 |
| Log Analytics workspace (audit-category logs only, Basic/Analytics mix) | ≈$2.30/GB Analytics Logs, ≈$0.50/GB Basic Logs, first 5 GB/month free — [Azure Monitor pricing](https://azure.microsoft.com/en-us/pricing/details/monitor/), figures corroborated via [monitoringcost.com: Azure Monitor cost 2026](https://monitoringcost.com/azure-monitor-cost) — **primary page unverified, flagged** | — to $3 | $3–8 | $8–20 |
| Microsoft Entra External ID | MAU-based; free-tier threshold conflicts between sources (50,000 per [cerberauth.com](https://www.cerberauth.com/blog/azure-ad-b2c-deprecated-what-to-do-next/) vs. 100,000 per [envisionit.com](https://envisionit.com/resources/articles/microsoft-to-end-sale-of-azure-ad-b2bb2c-on-may-1-2025-shifting-to-entra-id-external-identities)) — **not verified against a primary Microsoft Entra External ID pricing page, flagged as an open item** | — (likely within free tier under either threshold) | — (likely within free tier) | — (likely within free tier, but closest to a threshold — recheck at this scale) |
| **Total (excluding one-time/human costs)** | | **≈ $10–27/month** | **≈ $25–60/month** | **≈ $60–140/month** |

**Headline number for the six-venue starting scale: roughly CAD $10–30 per month**, not counting engineering/operational labor, domain registration, or the one-time cost of building and testing the system.

## 3. Free-tier / dev-test options called out

- **Azure Functions Consumption plan free grant** (400,000 GB-s + 1,000,000 executions/month, permanent, not a 12-month trial) covers essentially all compute for the nightly job and the API layer at 6 and likely 20 venues — [Azure Functions pricing](https://azure.microsoft.com/en-us/pricing/details/functions/).
- **Log Analytics first 5 GB/month per billing account** is free — [Azure Monitor pricing](https://azure.microsoft.com/en-us/pricing/details/monitor/) — enough to cover the 6-venue audit-log estimate above with room to spare.
- **Cosmos DB's standard free tier (1,000 RU/s + 25 GB) does NOT apply to serverless accounts** — [Microsoft Learn: Serverless (consumption-based) account type](https://learn.microsoft.com/en-us/azure/cosmos-db/serverless) — this is worth restating here because it is easy to assume the free tier applies and be wrong; it is why Cosmos DB shows a real dollar figure above even at 6 venues.
- **Azure Container Apps Consumption free grant** (180,000 vCPU-s, 360,000 GiB-s, 2,000,000 requests/month, per subscription) — [Azure Container Apps pricing](https://azure.microsoft.com/en-us/pricing/details/container-apps/) — is not used in the primary recommendation (Functions was chosen instead, see `architecture.md` §1.2–1.3) but would be equally free at this scale if adopted as the fallback compute option.
- **Azure "dev/test" pricing** was not modeled here because dev/test discounted rates apply to non-production Visual Studio/MSDN-linked subscriptions — this project is (eventually) production-facing consent and personal-data infrastructure, so dev/test pricing is inappropriate for the live environment, though it could reasonably be used for a pre-production/staging copy if one is stood up later.

## 4. Single biggest cost driver

At **six venues**, no single service dominates — the total is small and roughly evenly split between Storage, Cosmos DB, and Key Vault, each in the low single digits to low tens of CAD.

At **twenty and especially sixty venues**, the pattern shifts: **Log Analytics ingestion and Cosmos DB request-unit consumption become the two fastest-growing lines**, because both scale roughly linearly with user activity (API calls, consent events, media uploads generate both a Cosmos write and a diagnostic log line), while Functions, Key Vault, and immutable-storage overhead grow much more slowly. **If forced to name one single biggest driver at the 60-venue scale, it is Log Analytics ingestion** — because unlike Cosmos DB (which has a hard, predictable per-operation cost) log volume tends to grow faster than expected once diagnostic settings are turned on for every resource (a known operational surprise, not specific to this project), and because the `allLogs` category group (as opposed to the narrower `audit` category group this design recommends — `architecture.md` §1.9) can silently multiply ingested volume by 5–10x if misconfigured. This is a configuration risk to actively manage, not an inherent property of the workload — keeping diagnostic settings scoped to the `audit` category group, and routing high-volume/low-value log types to the cheaper Basic or Auxiliary Logs tiers (~$0.50/GB and ~$0.05/GB respectively vs. ~$2.30/GB for Analytics Logs — [Azure Monitor pricing](https://azure.microsoft.com/en-us/pricing/details/monitor/)), is the single highest-leverage cost control in this entire architecture at scale.

## 5. What is not in this table

- Domain registration/DNS, which is outside Azure's billing entirely.
- Any paid Microsoft Entra External ID tier beyond the free MAU threshold, pending the open verification item in §2.
- Human labor: development, moderation review of uploaded photos/video (face-removal QA), venue onboarding, and incident response.
- Azure Backup vault fees — deliberately not adopted in this design; see `architecture.md` §1.10 and `decisions.md` for the reasoning.
- Any Azure Front Door/CDN spend — deliberately not adopted; see `architecture.md` §1.1 and `residency-and-keys.md` §3.
- Currency-conversion risk: Azure bills in the currency tied to the billing account/agreement, using Microsoft's own London-close-based monthly conversion process described on every pricing page footnote — actual CAD amounts will vary month to month even if usage is flat.
