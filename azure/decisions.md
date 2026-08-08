# Architecture Decision Records — The Crescent Street Twin (Azure Landing Zone)

Ten most consequential decisions, in the order they most shape the rest of the design. Each entry: decision, alternatives considered, reason. Several of these cut against convenience deliberately — flagged where relevant. Full supporting detail lives in `architecture.md`, `residency-and-keys.md`, and `cost-model.md`; this file is the compressed "why," not a repeat of the "what."

---

## ADR-1: Design for six venues now, not sixty — no headroom baked in "just in case"

**Decision:** Every SKU is chosen for the stated scale (six venues, low thousands of monthly users), not for a hypothetical future scale.

**Alternatives considered:** Provision for 60 venues from day one (bigger Cosmos DB throughput tier, API Management Standard, dedicated App Service plan) to "avoid re-architecting later."

**Reason:** The brief is explicit that the scale is "deliberately tiny to start." Provisioning for scale that doesn't exist yet means paying real money — Managed HSM alone would be ~$2,300–2,400 CAD/month equivalent for a workload that needs a few dollars of key management (`residency-and-keys.md` section 5) — for a hypothetical that may never arrive. Every component chosen here (Functions Consumption, Cosmos DB serverless, Storage) scales up by changing a tier/mode, not by re-architecting, so the "avoid re-architecting" argument for over-provisioning doesn't actually hold.

---

## ADR-2: Azure Storage static website hosting over Azure Static Web Apps

**Decision:** Host the bilingual static site on Storage's built-in static-website feature, not Static Web Apps.

**Alternatives considered:** Static Web Apps (Free or Standard tier), App Service.

**Reason:** Static Web Apps' managed backend (Functions API, staging environments) has no Canada region at all — confirmed via [GitHub Azure/static-web-apps issue #443](https://github.com/Azure/static-web-apps/issues/443) and [Microsoft Q&A: ETA for Static Web Apps in Canada](https://learn.microsoft.com/en-us/answers/questions/529405/eta-for-availabilty-of-static-web-apps-in-canada-r) — and a Microsoft engineer states outright that it is "a global service" with "no data residency guarantees." That directly conflicts with the hard residency constraint. This cuts against convenience: Static Web Apps' free CI/CD-from-GitHub integration and free managed SSL are genuinely nice developer-experience features being given up here.

---

## ADR-3: Microsoft Entra External ID over Azure AD B2C, with the residency gap disclosed rather than hidden

**Decision:** Use Entra External ID for sign-in; explicitly document that it cannot be made Canada-only today.

**Alternatives considered:** Azure AD B2C; a fully custom, self-hosted identity system running only in Canada Central.

**Reason:** Azure AD B2C has been closed to new-customer purchases since May 1, 2025 — [Microsoft Learn: Azure AD B2C FAQ](https://learn.microsoft.com/en-us/azure/active-directory-b2c/faq) — so it was never a real option for a new project regardless of residency. Entra External ID is Microsoft's supported forward path, but it is non-regional; Canada maps into a shared "North America" geo with the US — [Microsoft Learn: Microsoft Entra ID and data residency](https://learn.microsoft.com/en-us/entra/fundamentals/data-residency), confirmed for Canada specifically at [Microsoft Q&A: Canada only Geo for Entra ID?](https://learn.microsoft.com/en-us/answers/questions/1515933/canada-only-geo-for-entra-id). A custom identity system would be fully region-pinnable but trades a well-audited, mainstream identity platform for a hand-rolled one holding passwords and sessions — a materially worse security posture for a marginal residency gain on data (account credentials) that is, by design, the least sensitive data class in this whole system. **This is the single most consequential compromise in the entire architecture, and it is disclosed prominently rather than papered over** (`residency-and-keys.md` section 4.1). This cuts against the letter of the "all data resident in Canada" constraint — deliberately, and openly, rather than pretending a compliant option exists when it does not.

---

## ADR-4: Blob immutable storage (WORM) for the provenance ledger, not a database append-only table

**Decision:** The content-hash provenance ledger lives in a Blob Storage container with a time-based immutability (WORM) policy, not in a Cosmos DB or SQL table with application-level append-only enforcement.

**Alternatives considered:** Cosmos DB container with no update/delete exposed in the API; a SQL table with triggers rejecting UPDATE/DELETE.

**Reason:** Immutable blob storage is *platform-enforced* — once the retention policy is set, even a subscription Owner cannot modify or delete the blob until the retention period lapses, per [Microsoft Learn: Overview of immutable storage for blob data](https://learn.microsoft.com/en-us/azure/storage/blobs/immutable-storage-overview). A database-level append-only pattern is *policy-enforced* — it depends on nobody with sufficient privilege bypassing the application layer. For a ledger whose entire value proposition is being evidence a venue or auditor did not write themselves, the stronger, platform-level guarantee is worth the small added operational complexity of a second storage pattern alongside Cosmos DB.

---

## ADR-5: Azure Functions Consumption, not Container Apps Jobs, for the nightly scan job (with Container Apps Jobs as the documented fallback)

**Decision:** Run the nightly scan job as a Functions Consumption timer trigger, not a Container Apps Job.

**Alternatives considered:** Container Apps Jobs (confirmed fully available in Canada Central, per [Azure Container Apps region availability](https://microsoft.github.io/azure-container-apps/aca-getting-started/region-availability.html)); a VM-based cron job.

**Reason:** Both Functions and Container Apps Jobs are effectively free at this workload's size (`cost-model.md`). Functions was chosen because a simple scheduled fetch-and-write script needs no container build/packaging pipeline — lower operational overhead for a six-venue pilot. The decision explicitly names Container Apps Jobs as the fallback the moment the scan logic needs a heavier runtime (e.g., a headless browser for JS-rendered venue pages) than the Functions Consumption sandbox comfortably supports, so this is a reversible choice, not a one-way door.

---

## ADR-6: No Front Door/CDN anywhere in this design, including for the public static site

**Decision:** Reject Azure Front Door/CDN entirely, even for the public, non-personal static assets that would otherwise be the safest possible use case for a CDN.

**Alternatives considered:** Front Door/CDN in front of the public site only (not personal-data endpoints).

**Reason:** Front Door is architecturally global, "not tied to any specific Azure region," and is one of the services Microsoft's own EU Data Boundary documentation lists as structurally excluded from regional residency guarantees for that reason — [Microsoft Learn: Services excluded from the EU Data Boundary](https://learn.microsoft.com/en-us/privacy/eudb/eu-data-boundary-excluded-services). Technically, using it only for the public static site would probably be safe in practice — no personal data lives there. **This cuts directly against convenience and performance**: a global edge cache would measurably improve load times for a bilingual mobile-first site. The decision is to decline it anyway, to keep the "nothing leaves Canada" claim simple, uniform, and easy for a non-specialist to audit across the whole system rather than requiring them to trust a component-by-component exception list.

---

## ADR-7: GRS (Canada Central → Canada East) as the backup mechanism, not Azure Backup

**Decision:** Rely on Storage account GRS plus blob versioning/soft-delete, not a separate Azure Backup vault, for data protection and disaster recovery.

**Alternatives considered:** Azure Backup (vault-based), with its per-protected-instance fee.

**Reason:** GRS's secondary region is fixed to the account's paired region and cannot be redirected — Microsoft's own example scenario is literally "Canada Central... GRS storage to replicate data to the paired region, Canada East" — [Microsoft Learn: Azure region pairs and nonpaired regions](https://learn.microsoft.com/en-us/azure/reliability/regions-paired). This makes GRS one of the very few settings in this whole design that is *structurally* incapable of violating the residency constraint, rather than merely configured correctly today. Combined with the immutability policy already required for the ledger (ADR-4) and cheap/free versioning and soft-delete, this covers the realistic failure modes (accidental deletion, regional outage) without Azure Backup's added per-instance vault fee (`cost-model.md` section 2). Azure Backup remains the documented upgrade path if a future compliance requirement demands vault-level point-in-time restore SLAs distinct from storage-native redundancy.

---

## ADR-8: Accept the Entra ID non-regional limitation rather than block the project on a non-existent Canada-only identity provider

**Decision:** Proceed with Entra External ID, scope-reduce what it holds, and disclose the gap — rather than delaying the project until Microsoft ships Go-Local for Canada, or building a bespoke identity system to force full compliance.

**Alternatives considered:** Wait for Microsoft to extend the Go-Local residency add-on to Canada (currently Australia and Japan only); build and operate a fully custom, Canada-only identity system; evaluate a third-party CIAM vendor with an explicit Canada-residency guarantee.

**Reason:** There is no committed timeline for Go-Local reaching Canada. A custom identity system shifts risk from "residency gap in a mainstream, well-audited platform" to "we now operate our own password/session security," which is a worse trade for the sensitive data in this system (which lives in Cosmos DB/Blob Storage, not Entra ID, per ADR-3). A third-party CIAM vendor was not evaluated in this research pass and is flagged as legitimate future work, not ruled out — but was not adopted now because it introduces a *third* vendor's residency and security posture into the trust boundary without the same weight of Microsoft-Learn-level verification this document holds itself to for every other claim.

---

## ADR-9: Cosmos DB serverless over Table Storage for the consent register

**Decision:** Store consent grants (and opt-in location, and presence counters) in Cosmos DB for NoSQL, serverless mode, not Azure Table Storage.

**Alternatives considered:** Table Storage in the same Storage account already used for static site/media/ledger — cheaper, and already present in the architecture.

**Reason:** Table Storage would be materially cheaper and is equally available in Canada Central as a foundational service. Cosmos DB was chosen instead for two capabilities the consent-register logic specifically needs: native per-item TTL (used here for the 12-month grant expiry and the 72-hour presence-count rolling window, both encoded directly in `iac/main.bicep`), and a real query language for "does this audience/purpose/surface combination currently have a live, unrevoked grant" lookups — which Table Storage would otherwise require reimplementing in application code, increasing the risk of a consent-logic bug given how central default-deny/one-action-revocation is to this project's actual purpose. This is a case where the *cheaper* option was rejected because the *correctness* cost of reimplementing TTL and query logic outweighs the dollar savings at this scale (`cost-model.md` shows the delta is a few dollars a month, not enough to justify the added application-logic risk).

---

## ADR-10: A single shared Log Analytics workspace with scoped queries per venue, not one workspace per venue

**Decision:** All diagnostic logs land in one Canada-Central Log Analytics workspace; each venue's "audit log it can read itself" is a scoped, filtered query/report against that shared workspace, not a dedicated workspace per venue.

**Alternatives considered:** One Log Analytics workspace per venue, giving each venue direct RBAC access to their own workspace.

**Reason:** Six (and eventually up to sixty) separate workspaces multiplies the per-workspace overhead (each has its own ingestion minimums, retention configuration, and policy/diagnostic-setting wiring) for a benefit — perfect data isolation between venues — that a well-scoped query/RBAC filter already delivers at the query layer. A shared workspace also makes the operator's own cross-venue operational monitoring simpler, which matters because the operator is the one actually responsible for keeping the system running. The trade-off, stated honestly: a shared workspace means the platform *could* technically expose one venue's data to another if the query-scoping logic has a bug — a real risk that a fully separate-workspace-per-venue design would eliminate structurally. This is accepted here as proportionate to a six-venue pilot; it should be revisited if venues start treating each other as competitors whose activity data must never be cross-visible even in principle, or at a scale where the number of separate workspaces stops being an operational burden.
