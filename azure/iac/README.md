# IaC — `main.bicep` for The Crescent Street Twin

## Status: unvalidated

This Bicep template has **not** been run through `az bicep build`, `az deployment group validate`, `what-if`, or an actual deployment in this session. It is written to be **syntactically plausible** and to mirror the decisions in `../architecture.md` and `../residency-and-keys.md`, not to be a tested, deploy-ready artifact. Treat every resource block as a first draft that a human with Azure CLI access must lint and dry-run before use. There is no live Azure subscription behind this work — this is a design exercise.

Before attempting any deployment, at minimum run:

```bash
az bicep build --file main.bicep         # syntax/type check
az deployment group validate \
  --resource-group <your-rg> \
  --template-file main.bicep \
  --parameters keyVaultAdminPrincipalId=<a-real-object-id>
az deployment group what-if \
  --resource-group <your-rg> \
  --template-file main.bicep \
  --parameters keyVaultAdminPrincipalId=<a-real-object-id>
```

## What this template deploys

- A Log Analytics workspace (Canada Central, daily quota capped at 1 GB as a conservative pilot guardrail).
- A Key Vault, **Premium tier** (HSM-backed keys), purge protection enabled, RBAC authorization, two CMK keys (`cmk-storage`, `cmk-cosmos`) with 12-month rotation policies.
- A Storage account (`Standard_GRS`, CMK-encrypted via the Key Vault key above) with four containers: the public static-site container (`$web`-equivalent, named `web`), a private scan-digest container, a private media container, and an **immutable** (WORM) provenance-ledger container.
- A Cosmos DB account (serverless capacity mode, single region, CMK-encrypted) with two containers: `consentgrants` (12-month TTL) and `presencecounts` (72-hour rolling TTL).
- A Function App on a Consumption (`Y1`/`Dynamic`) plan, Linux, Python 3.12 runtime, system-assigned managed identity, wired with app settings pointing at the Storage account, Cosmos endpoint, and Key Vault URI.
- Diagnostic settings on Key Vault, Storage blob services, Cosmos DB, and the Function App, all routed to the single Log Analytics workspace, scoped to the `audit` category group (not `allLogs`) — see `../cost-model.md` section 4 for why this scoping choice matters for cost.
- An Azure Policy assignment of the built-in **"Allowed locations"** policy definition, restricting deployments in this resource group to the `location` and `pairedLocation` parameters (defaulting to `canadacentral` and `canadaeast`).

## What a human must configure by hand — this template does NOT do these

1. **Create the resource group itself**, in `canadacentral`, before running this template. The template's `targetScope` is `resourceGroup` — it assumes the group already exists.
2. **Create the Microsoft Entra External ID tenant.** This is fundamentally a portal-driven, one-time tenant-creation workflow, not something a resource-group-scoped Bicep template provisions — and per `../residency-and-keys.md` section 4.1, no Azure configuration option makes this tenant Canada-only today regardless of how it's created. A human must create the tenant, configure user flows/sign-in policies, and register the application — then feed the resulting tenant ID/client ID into the Function App's configuration (not currently wired into this template's app settings).
3. **Supply a real `keyVaultAdminPrincipalId`.** The template accepts this as a parameter with an empty default specifically so it does not silently skip a security-relevant role assignment without the deployer noticing — but there is no live principal to grant yet (no tenant, no deployed Function App identity to reference at parameter-input time in a single pass). In practice this requires either a two-pass deployment (deploy once to create the Function App's system-assigned identity, capture its `principalId` from the `functionAppPrincipalId` output, then redeploy or run a second targeted `az role assignment create` / a second Bicep module granting that identity — not a human account — `Key Vault Crypto User` scoped to the vault).
4. **Generate and manage the actual CMK key material lifecycle beyond initial creation.** The template creates the two HSM-backed keys and sets a 12-month rotation policy, but does not configure Storage's or Cosmos DB's user-assigned-identity-based access to those keys (Storage CMK via Key Vault typically wants either a system- or user-assigned managed identity with `wrapKey`/`unwrapKey`/`get` permissions on the specific key — this template sets `keySource: Microsoft.Keyvault` and the key URI, but the underlying identity-to-key permission grant is a follow-up step, most cleanly done with `az keyvault set-policy` or an RBAC role assignment against the Storage account's own managed identity, which the template does not create for Storage itself).
5. **Enable `immutableStorageWithVersioning` at the storage-account level, if the API version in use requires it as an account-level feature flag** before per-container immutability policies take effect. Immutable-storage/versioning Bicep/ARM support has shifted across API versions; the container-level property in this template (`immutableStorageWithVersioning.enabled: true`) is written per the general shape described in [Microsoft Learn: Overview of immutable storage for blob data](https://learn.microsoft.com/en-us/azure/storage/blobs/immutable-storage-overview), but a human must confirm the exact account-level toggle and API version combination against the current ARM schema at deploy time — this is exactly the kind of thing `az deployment group validate` will catch and this exercise could not.
6. **Set `publicNetworkAccess: 'Disabled'` plus a working private-endpoint/VNet setup**, if network-level lockdown is desired in production. The template currently sets Key Vault's public network access to `Disabled` (which will break the Function App's access unless a private endpoint or trusted-services exception is separately configured — not included here) and leaves Cosmos DB and Storage on `Enabled` with a comment flagging it. A human must decide the actual network topology (private endpoints require a VNet, subnets, and DNS zone configuration well beyond this single resource-group template) and reconcile these settings consistently.
7. **Assign the "Allowed locations" policy at subscription or management-group scope**, not just this resource group, if the intent is to prevent *any* future resource — in this group or a sibling one — from landing outside Canada. This template assigns the policy at resource-group scope only, per `../residency-and-keys.md` section 2's recommendation that subscription-level assignment is the more robust choice; a subscription-scoped assignment requires a separate `targetScope = 'subscription'` Bicep file and `az deployment sub create`, which is not included here to keep this template deployable against a single resource group without requiring subscription-level permissions.
8. **DNS / custom domain** for the static site and API, and the associated TLS certificate — not modeled in this template.
9. **Face-removal / photo-video moderation logic** — this is application code that must run *before* the write to the media Blob container, not an Azure resource this template can represent. The hard constraint "faces of other people removed before storage" and "no biometric template ever created" must be enforced in that application code path, and audited independently of this infrastructure template.
10. **Actual production-grade `enforcementMode` review, exemptions, and a remediation task** for the Allowed-locations policy assignment, and for the diagnostic-settings policy initiative mentioned in `../architecture.md` section 1.9 (this template wires per-resource diagnostic settings directly rather than via the `DeployIfNotExists` policy initiative Microsoft recommends for "at scale" enforcement — see [Microsoft Learn: Create diagnostic settings at scale using built-in policies](https://learn.microsoft.com/en-us/azure/azure-monitor/platform/diagnostic-settings-policy-built-in) — adopting that initiative instead of/in addition to the direct diagnostic-settings resources here is a reasonable next step once more resources exist than this template covers).

## Parameters summary

| Parameter | Default | Notes |
|---|---|---|
| `location` | `canadacentral` | Restricted to `canadacentral`/`canadaeast` via the `@allowed` decorator |
| `pairedLocation` | `canadaeast` | Used for policy allow-list only; GRS pairing itself is automatic, not parameterized (see `../residency-and-keys.md` section 3) |
| `projectPrefix` | `crescnt` | Used to build resource names; keep short for Storage account name length limits |
| `environmentName` | `dev-unvalidated` | Tag value only |
| `keyVaultAdminPrincipalId` | `''` (empty) | Must be supplied — see manual step 3 above |
| `commonTags` | project/environment/residency tags | Applied to every resource |
