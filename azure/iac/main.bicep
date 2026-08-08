// =====================================================================
// The Crescent Street Twin — Azure landing zone (main.bicep)
//
// STATUS: UNVALIDATED. This template has not been run against a live
// Azure subscription (what -validate / az deployment ... --confirm-with-what-if),
// has not been linted with the Bicep linter/az bicep build in this session,
// and has not been deployed. It is written to be syntactically plausible
// and to reflect the architecture in ../architecture.md and the residency
// controls in ../residency-and-keys.md, not as a tested artifact.
// See README.md in this folder for what a human must configure by hand
// before this could ever be deployed for real (Entra External ID tenant,
// CMK key material, RBAC/access-policy grants, policy assignment scope,
// DNS/custom domain).
//
// Scope: resource-group deployment. Deploy with:
//   az deployment group create --resource-group <rg> --template-file main.bicep
// after creating the resource group itself in canadacentral.
// =====================================================================

targetScope = 'resourceGroup'

// ---------------------------------------------------------------------
// Parameters
// ---------------------------------------------------------------------

@description('Primary Azure region. Defaults to Canada Central per the hard residency constraint. Do not change without re-reading residency-and-keys.md.')
@allowed([
  'canadacentral'
  'canadaeast'
])
param location string = 'canadacentral'

@description('Paired region used only for GRS replication targets and diagnostics. Canada East is the fixed pair of Canada Central and cannot be chosen independently for GRS — documented in residency-and-keys.md section 3.')
param pairedLocation string = 'canadaeast'

@description('Short project prefix used in resource names. Keep lowercase, alphanumeric, <=8 chars for storage-account name compatibility.')
@minLength(3)
@maxLength(8)
param projectPrefix string = 'crescnt'

@description('Environment tag value, e.g. dev, staging, prod. This template has only ever been reasoned about as a single environment — see README.md.')
param environmentName string = 'dev-unvalidated'

@description('Object ID (principal ID) of the managed identity or user that should be granted Key Vault Crypto/Secrets access. Must be supplied at deploy time — no default, because there is no live tenant yet. See README.md.')
param keyVaultAdminPrincipalId string = ''

@description('Tags applied to every resource in this deployment.')
param commonTags object = {
  project: 'crescent-street-twin'
  environment: environmentName
  dataResidency: 'canada-only'
  managedBy: 'bicep-unvalidated'
}

// ---------------------------------------------------------------------
// Variables
// ---------------------------------------------------------------------

var storageAccountName = toLower('${projectPrefix}st${uniqueString(resourceGroup().id)}')
var functionAppName = '${projectPrefix}-func-${uniqueString(resourceGroup().id)}'
var appServicePlanName = '${projectPrefix}-plan-${uniqueString(resourceGroup().id)}'
var cosmosAccountName = toLower('${projectPrefix}-cosmos-${uniqueString(resourceGroup().id)}')
var cosmosDatabaseName = 'crescenttwin'
var consentContainerName = 'consentgrants'
var presenceContainerName = 'presencecounts'
var keyVaultName = toLower('${projectPrefix}kv${uniqueString(resourceGroup().id)}')
var logAnalyticsName = '${projectPrefix}-law-${uniqueString(resourceGroup().id)}'
var ledgerContainerName = 'provenance-ledger'
var mediaContainerName = 'venue-media'
var staticSiteContainerName = 'web'
var digestContainerName = 'scan-digest'

// ---------------------------------------------------------------------
// Log Analytics workspace — created first so diagnostic settings below
// can reference it. Region-pinned per residency-and-keys.md section 4.3.
// ---------------------------------------------------------------------

resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: logAnalyticsName
  location: location
  tags: commonTags
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: 90
    workspaceCapping: {
      dailyQuotaGb: 1 // conservative cap for a six-venue pilot; raise deliberately, do not leave uncapped
    }
  }
}

// ---------------------------------------------------------------------
// Key Vault — Premium tier (HSM-backed keys), purge protection ON.
// See architecture.md section 1.8 and residency-and-keys.md section 5
// for why Premium was chosen over Managed HSM at this scale.
// ---------------------------------------------------------------------

resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: keyVaultName
  location: location
  tags: commonTags
  properties: {
    sku: {
      family: 'A'
      name: 'premium' // HSM-backed keys — required for the CMK claims made in residency-and-keys.md
    }
    tenantId: subscription().tenantId
    enableSoftDelete: true
    softDeleteRetentionInDays: 90
    enablePurgeProtection: true // operator cannot unilaterally destroy key material — see residency-and-keys.md section 6
    enableRbacAuthorization: true
    publicNetworkAccess: 'Disabled' // NOTE: disabling this requires private endpoints to be configured by a human — see README.md
    accessPolicies: [] // using RBAC instead of vault access policies; role assignment below
  }
}

// Role assignment: grant the supplied principal Key Vault Crypto access.
// This is a placeholder — in a real deployment this should be scoped to
// the Function App's managed identity, not a human account, per
// residency-and-keys.md section 6 ("what the operator genuinely cannot decrypt").
resource keyVaultCryptoUserRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = if (!empty(keyVaultAdminPrincipalId)) {
  name: guid(keyVault.id, keyVaultAdminPrincipalId, 'CryptoUser')
  scope: keyVault
  properties: {
    // "Key Vault Crypto User" built-in role GUID
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '12338af0-0e69-4776-bea7-57ae8d297424')
    principalId: keyVaultAdminPrincipalId
    principalType: 'ServicePrincipal'
  }
}

resource keyVaultDiagnostics 'Microsoft.Insights/diagnosticSettings@2021-05-01-preview' = {
  name: 'diag-to-law'
  scope: keyVault
  properties: {
    workspaceId: logAnalytics.id
    logs: [
      {
        categoryGroup: 'audit'
        enabled: true
      }
    ]
    metrics: [
      {
        category: 'AllMetrics'
        enabled: true
      }
    ]
  }
}

// CMK key for Storage account encryption. Rotation policy set per
// residency-and-keys.md section 5 recommendation (12 months).
resource cmkStorageKey 'Microsoft.KeyVault/vaults/keys@2023-07-01' = {
  parent: keyVault
  name: 'cmk-storage'
  properties: {
    kty: 'RSA-HSM'
    keySize: 2048
    rotationPolicy: {
      lifetimeActions: [
        {
          trigger: {
            timeAfterCreate: 'P12M'
          }
          action: {
            type: 'Rotate'
          }
        }
      ]
    }
  }
}

// CMK key for Cosmos DB encryption.
resource cmkCosmosKey 'Microsoft.KeyVault/vaults/keys@2023-07-01' = {
  parent: keyVault
  name: 'cmk-cosmos'
  properties: {
    kty: 'RSA-HSM'
    keySize: 2048
    rotationPolicy: {
      lifetimeActions: [
        {
          trigger: {
            timeAfterCreate: 'P12M'
          }
          action: {
            type: 'Rotate'
          }
        }
      ]
    }
  }
}

// ---------------------------------------------------------------------
// Storage account — hosts the static site, scan digest, media/3D assets,
// and the immutable provenance ledger. GRS replicates automatically and
// exclusively to Canada East — see residency-and-keys.md section 3.
// CMK encryption configured via the Key Vault key above.
// NOTE: the userAssignedIdentity needed for CMK-on-Storage is NOT wired
// up in this template — see README.md, this must be completed by hand
// or in a follow-up module once the identity exists.
// ---------------------------------------------------------------------

resource storageAccount 'Microsoft.Storage/storageAccounts@2023-01-01' = {
  name: storageAccountName
  location: location
  tags: commonTags
  sku: {
    name: 'Standard_GRS' // GRS: Canada Central -> Canada East, automatic, no US hop possible (residency-and-keys.md section 3)
  }
  kind: 'StorageV2'
  properties: {
    minimumTlsVersion: 'TLS1_2'
    allowBlobPublicAccess: true // required only for the $web static-site container; media/ledger containers must override to private at the container level by hand — see README.md
    supportsHttpsTrafficOnly: true
    isHnsEnabled: false
    encryption: {
      keySource: 'Microsoft.Keyvault'
      keyvaultproperties: {
        keyvaulturi: keyVault.properties.vaultUri
        keyname: cmkStorageKey.name
      }
      requireInfrastructureEncryption: true
      services: {
        blob: {
          enabled: true
        }
        file: {
          enabled: true
        }
      }
    }
  }
}

resource blobServices 'Microsoft.Storage/storageAccounts/blobServices@2023-01-01' = {
  parent: storageAccount
  name: 'default'
  properties: {
    isVersioningEnabled: true // cheap first line of defense against accidental overwrite/delete — architecture.md section 1.10
    deleteRetentionPolicy: {
      enabled: true
      days: 30
    }
    containerDeleteRetentionPolicy: {
      enabled: true
      days: 30
    }
  }
}

resource staticSiteContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-01-01' = {
  parent: blobServices
  name: staticSiteContainerName
  properties: {
    publicAccess: 'Blob' // intentional — this is the public static site
  }
}

resource digestContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-01-01' = {
  parent: blobServices
  name: digestContainerName
  properties: {
    publicAccess: 'None'
  }
}

resource mediaContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-01-01' = {
  parent: blobServices
  name: mediaContainerName
  properties: {
    publicAccess: 'None'
  }
}

// Provenance ledger container — immutability policy applied.
// NOTE: Bicep/ARM support for immutability policies on containers varies
// by API version and in some cases requires a separate call after
// container creation (time-based retention policies need the container's
// immutableStorageWithVersioning feature enabled at the ACCOUNT level,
// which is not toggled above — see README.md, this is one of the pieces
// most likely to need manual correction / a second deployment pass).
resource ledgerContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-01-01' = {
  parent: blobServices
  name: ledgerContainerName
  properties: {
    publicAccess: 'None'
    immutableStorageWithVersioning: {
      enabled: true
    }
  }
}

resource storageDiagnostics 'Microsoft.Insights/diagnosticSettings@2021-05-01-preview' = {
  name: 'diag-to-law'
  scope: blobServices
  properties: {
    workspaceId: logAnalytics.id
    logs: [
      {
        categoryGroup: 'audit'
        enabled: true
      }
    ]
    metrics: [
      {
        category: 'Transaction'
        enabled: true
      }
    ]
  }
}

// ---------------------------------------------------------------------
// Cosmos DB — serverless account for the consent register, opt-in
// location, and presence counters. Single-region by design (serverless
// accounts cannot be multi-region) — see architecture.md section 1.4.
// ---------------------------------------------------------------------

resource cosmosAccount 'Microsoft.DocumentDB/databaseAccounts@2023-11-15' = {
  name: cosmosAccountName
  location: location
  tags: commonTags
  kind: 'GlobalDocumentDB'
  properties: {
    databaseAccountOfferType: 'Standard'
    locations: [
      {
        locationName: location
        failoverPriority: 0
        isZoneRedundant: true
      }
    ]
    capabilities: [
      {
        name: 'EnableServerless'
      }
    ]
    keyVaultKeyUri: '${keyVault.properties.vaultUri}keys/${cmkCosmosKey.name}' // CMK for Cosmos DB — architecture.md section 1.4 / residency-and-keys.md section 5
    publicNetworkAccess: 'Enabled' // NOTE: tighten to 'Disabled' + private endpoint by hand for production — see README.md
    isVirtualNetworkFilterEnabled: false
    minimalTlsVersion: 'Tls12'
  }
}

resource cosmosDatabase 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases@2023-11-15' = {
  parent: cosmosAccount
  name: cosmosDatabaseName
  properties: {
    resource: {
      id: cosmosDatabaseName
    }
  }
}

resource consentContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2023-11-15' = {
  parent: cosmosDatabase
  name: consentContainerName
  properties: {
    resource: {
      id: consentContainerName
      partitionKey: {
        paths: [
          '/venueId'
        ]
        kind: 'Hash'
      }
      defaultTtl: 31536000 // 12 months, matches the consent-expiry hard constraint; revocation is an explicit field update, not reliant on TTL alone
    }
  }
}

resource presenceContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2023-11-15' = {
  parent: cosmosDatabase
  name: presenceContainerName
  properties: {
    resource: {
      id: presenceContainerName
      partitionKey: {
        paths: [
          '/venueId'
        ]
        kind: 'Hash'
      }
      defaultTtl: 259200 // 72 hours — rolling presence-count window, aggregate only, never a per-person record (hard constraint: no query returns a person)
    }
  }
}

resource cosmosDiagnostics 'Microsoft.Insights/diagnosticSettings@2021-05-01-preview' = {
  name: 'diag-to-law'
  scope: cosmosAccount
  properties: {
    workspaceId: logAnalytics.id
    logs: [
      {
        categoryGroup: 'audit'
        enabled: true
      }
    ]
    metrics: [
      {
        category: 'Requests'
        enabled: true
      }
    ]
  }
}

// ---------------------------------------------------------------------
// Function App — Consumption plan, hosts both the nightly timer-trigger
// scan job and the HTTP-triggered API layer. See architecture.md
// sections 1.2 and 1.3 for why Consumption was chosen over Container
// Apps Jobs / API Management / App Service.
// ---------------------------------------------------------------------

resource appServicePlan 'Microsoft.Web/serverfarms@2023-01-01' = {
  name: appServicePlanName
  location: location
  tags: commonTags
  sku: {
    name: 'Y1' // Consumption plan SKU
    tier: 'Dynamic'
  }
  properties: {
    reserved: true // Linux
  }
}

resource functionApp 'Microsoft.Web/sites@2023-01-01' = {
  name: functionAppName
  location: location
  tags: commonTags
  kind: 'functionapp,linux'
  identity: {
    type: 'SystemAssigned' // used to grant scoped Key Vault + Cosmos + Storage access; see README.md for the role-assignment step this template does NOT perform
  }
  properties: {
    serverFarmId: appServicePlan.id
    httpsOnly: true
    siteConfig: {
      linuxFxVersion: 'PYTHON|3.12'
      minTlsVersion: '1.2'
      appSettings: [
        {
          name: 'AzureWebJobsStorage__accountName'
          value: storageAccountName
        }
        {
          name: 'COSMOS_ACCOUNT_ENDPOINT'
          value: cosmosAccount.properties.documentEndpoint
        }
        {
          name: 'KEY_VAULT_URI'
          value: keyVault.properties.vaultUri
        }
        {
          name: 'FUNCTIONS_WORKER_RUNTIME'
          value: 'python'
        }
        {
          name: 'FUNCTIONS_EXTENSION_VERSION'
          value: '~4'
        }
      ]
    }
  }
}

resource functionAppDiagnostics 'Microsoft.Insights/diagnosticSettings@2021-05-01-preview' = {
  name: 'diag-to-law'
  scope: functionApp
  properties: {
    workspaceId: logAnalytics.id
    logs: [
      {
        categoryGroup: 'audit'
        enabled: true
      }
      {
        category: 'FunctionAppLogs'
        enabled: true
      }
    ]
    metrics: [
      {
        category: 'AllMetrics'
        enabled: true
      }
    ]
  }
}

// ---------------------------------------------------------------------
// Azure Policy assignment — restrict allowed locations to Canadian
// regions only. Built-in policy definition, effect Deny.
// See residency-and-keys.md section 2 for the documented exclusions
// (resource groups themselves, 'global'-region resources, and
// b2cDirectories resources) that this policy CANNOT cover.
//
// NOTE: this is assigned at RESOURCE GROUP scope here for template
// simplicity. The recommendation in residency-and-keys.md section 2 is
// to assign at SUBSCRIPTION or management-group scope instead — that
// requires a separate subscription-scoped Bicep file/deployment
// (targetScope = 'subscription'), which a human must run separately.
// See README.md.
// ---------------------------------------------------------------------

var allowedLocationsPolicyDefinitionId = '/providers/Microsoft.Authorization/policyDefinitions/e56962a6-4747-49cd-b67b-bf8b01975c4c' // built-in "Allowed locations" policy

resource allowedLocationsPolicyAssignment 'Microsoft.Authorization/policyAssignments@2022-06-01' = {
  name: 'allowed-locations-canada-only'
  properties: {
    displayName: 'Allowed locations: Canada Central and Canada East only'
    policyDefinitionId: allowedLocationsPolicyDefinitionId
    enforcementMode: 'Default' // 'Default' enforces the Deny effect defined in the built-in policy's parameters below
    parameters: {
      listOfAllowedLocations: {
        value: [
          location
          pairedLocation
        ]
      }
    }
  }
}

// ---------------------------------------------------------------------
// Outputs
// ---------------------------------------------------------------------

output storageAccountNameOut string = storageAccountName
output staticWebsiteHostname string = storageAccount.properties.primaryEndpoints.web
output functionAppNameOut string = functionAppName
output functionAppPrincipalId string = functionApp.identity.principalId
output cosmosAccountEndpoint string = cosmosAccount.properties.documentEndpoint
output keyVaultUriOut string = keyVault.properties.vaultUri
output logAnalyticsWorkspaceIdOut string = logAnalytics.id
