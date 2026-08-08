# The Crescent Street Twin — Azure Landing Zone

This directory is the Azure landing-zone design for a consent-first digital twin of six bars on rue Crescent, Montréal. It is written, and researched, to actually run this project — not a generic Azure reference architecture — and every service and price claim in it is checked against [Microsoft Learn](https://learn.microsoft.com/) and the official Azure pricing pages, with sources cited inline. It is scoped strictly to this `azure/` directory; the rest of `/home/user/workspace/mtl/` (site build, content, wireframes, scan logic) belongs to other agents and is not touched here.

## What is designed but NOT yet built

**Nothing in this design has been provisioned or deployed.** There is no live Azure subscription behind this work. Specifically:

- The Bicep template in `iac/main.bicep` has not been linted, validated, or deployed — see `iac/README.md` for exactly what a human must do before it could be.
- No Microsoft Entra External ID tenant exists.
- No Key Vault, Cosmos DB account, Storage account, or Function App has been created.
- No CMK key material has been generated.
- No Azure Policy has been assigned in a real subscription.
- All CAD cost figures in `cost-model.md` are estimates built from published unit pricing and secondary sources where the official pricing pages render numbers client-side — not a bill, not a Pricing Calculator export, and not validated against a real subscription's negotiated rates.

This is a **design and research artifact**, meant to be reviewed, corrected, and then actually implemented by whoever provisions the real infrastructure.

## Files in this directory

| File | Contents |
|---|---|
| [`architecture.md`](./architecture.md) | Reference architecture: specific Azure service + SKU/tier per component (static site, nightly job, API layer, consent register, provenance ledger, media/3D blob storage, identity, secrets/CMK, logging/audit, backup), why each was chosen, cost at scale, and the cheaper alternative that was rejected and why. Includes a Mermaid + ASCII diagram and a data-flow table (data class → where stored → retention → who can read → CMK yes/no). |
| [`residency-and-keys.md`](./residency-and-keys.md) | How Canadian residency is actually enforced: region pinning, the built-in Azure Policy "Allowed locations" mechanism and its documented exclusions, which geo-replication settings must stay off (and the one, GRS, that's structurally fine), the hidden cross-region dependency that matters most (Entra ID's non-regional identity platform), Key Vault Premium vs. Managed HSM, key rotation, and an honest split of what CMK genuinely prevents an operator from doing versus what would be theatre to claim. |
| [`cost-model.md`](./cost-model.md) | Monthly CAD cost tables at 6, 20, and 60 venues, itemized by service, with free-tier options called out, assumptions stated explicitly, and the single biggest cost driver identified (Log Analytics ingestion at scale). Ranges, not false precision. |
| [`iac/main.bicep`](./iac/main.bicep) | Bicep template: resource group-scoped resources (Log Analytics, Key Vault Premium with purge protection and CMK keys, Storage account with GRS and an immutable ledger container, Cosmos DB serverless, a Functions Consumption app, diagnostic settings, and an Azure Policy "Allowed locations" assignment). Region-parameterized, defaults to `canadacentral`. Explicitly labeled unvalidated. |
| [`iac/README.md`](./iac/README.md) | What the Bicep template does, and — just as important — the ten things a human must still configure by hand that Bicep cannot fully automate (Entra tenant creation, real CMK-to-resource identity grants, network lockdown, DNS, moderation logic, subscription-scope policy assignment, and more). |
| [`decisions.md`](./decisions.md) | Ten ADR-style entries for the most consequential choices in this design, including ones that deliberately cut against convenience (rejecting Front Door/CDN everywhere, accepting the Entra ID residency gap rather than hiding or "solving" it with an inferior substitute). |

## Hard constraints this design was built against

- All data resident in Canada — Canada Central primary, Canada East for pairing/backup, **nothing replicating to a US region.** (Satisfied for every component except identity — see below.)
- Customer-managed keys, so the operator cannot unilaterally decrypt. (Satisfied for day-to-day operator access via Key Vault Premium RBAC; not a defense against a subscription Owner who elevates their own permissions, or against Microsoft's own infrastructure — see `residency-and-keys.md` section 6 for the honest boundary.)
- An audit log a participating venue can read itself. (Satisfied via a scoped Log Analytics query per venue against a shared workspace — see `decisions.md` ADR-10 for the trade-off accepted.)
- A documented exit path taking data, models, and keys out. (Data lives in standard Blob Storage/Cosmos DB containers exportable by normal Azure tooling; keys live in a Key Vault the operator's own tenant controls; the exit path itself — export scripts, key-transfer procedure — is not yet written as a runbook and should be treated as a near-term follow-up, not assumed complete.)
- **NO biometric template ever created.** Face handling in this design is redaction/removal before storage, never facial embedding/recognition — no component here proposes or requires generating one.
- No query on any surface returns a person. Presence counts are aggregate-only with a rolling TTL (`iac/main.bicep`); location sharing stores only a rounded area, never track history.
- Scale: six venues, one street, low thousands of monthly users — deliberately tiny to start, and every SKU choice in `architecture.md` reflects that (`decisions.md` ADR-1).

## The one constraint this design cannot fully satisfy today

**Identity/sign-in.** Microsoft Entra External ID — the only viable modern Microsoft CIAM product, since Azure AD B2C closed to new customers on May 1, 2025 — is a non-regional service. A Canadian tenant setting maps into a shared "North America" geo that includes US datacenters; the "Go-Local" add-on that would fix this exists only for Australia and Japan, not Canada. This is disclosed in full in `residency-and-keys.md` section 4.1 and `decisions.md` ADR-3/ADR-8, not hidden. The mitigation adopted is to keep the identity directory minimal — credentials and a linkage ID only — while all genuinely sensitive data (location, consent, media, presence) stays in the Canada-Central-pinned, policy-enforceable stores described in `architecture.md`.

## Headline number

At the starting scale of six venues, the estimated total Azure spend is roughly **CAD $10–30 per month** across all services (`cost-model.md`), excluding engineering/operational labor and domain costs. See `cost-model.md` for the full itemized table and the 20- and 60-venue projections.
