// =====================================================================================
// Orqentis — main Bicep
// Spec §14.2. Region-pinned to Australia East. Subscription-scope deployment optional;
// this template is resourceGroup-scoped (deploy with: az deployment group create ...).
// =====================================================================================
targetScope = 'resourceGroup'

@description('Environment name (staging | production).')
@allowed(['staging', 'production'])
param environment string

@description('Azure region. Default: australiaeast.')
param location string = 'australiaeast'

@description('Short name prefix for resources, e.g. "orqentis".')
@maxLength(10)
param namePrefix string = 'orqentis'

@description('Object id of the Entra ID group that should have Key Vault Administrator on the vault.')
param keyVaultAdminGroupObjectId string

@description('PostgreSQL admin username. The password is generated and stored in Key Vault.')
param pgAdminUsername string = 'orqentisadmin'

@secure()
@description('PostgreSQL admin password. Pass via parameter file referencing Key Vault or CI secret; the value is written to Key Vault and should be rotated out-of-band after bootstrap.')
param pgAdminPassword string

@description('PostgreSQL HA mode. Production may use ZoneRedundant when the SLA requires it; non-critical environments should remain Disabled.')
@allowed(['Disabled', 'SameZone', 'ZoneRedundant'])
param highAvailabilityMode string = 'Disabled'

@description('PostgreSQL storage size in GiB. Expected launch footprint grows with contract/run metadata; production starts at 128 GiB, staging at 32 GiB.')
@minValue(32)
param storageSizeGB int = environment == 'production' ? 128 : 32

@description('Microsoft Entra tenant id used to validate API bearer tokens.')
param azureAdTenantId string = tenant().tenantId

@description('Microsoft Entra application client id used by the Fabric workload and API.')
param azureAdClientId string

@description('Expected API audience. Defaults to api://{azureAdClientId}.')
param azureAdAudience string = ''

@secure()
@description('Microsoft Entra application client secret used for OBO token exchange. The value is written to Key Vault and should be rotated out-of-band after bootstrap.')
param azureAdClientSecret string

@description('Enable autoscale for the App Service Plan. Production-only by default.')
param enableAutoscale bool = environment == 'production'

@description('Minimum App Service Plan instance count for autoscale.')
@minValue(1)
param autoscaleMinCapacity int = 1

@description('Maximum App Service Plan instance count for autoscale.')
@minValue(1)
param autoscaleMaxCapacity int = environment == 'production' ? 5 : 2

@description('Default App Service Plan instance count for autoscale.')
@minValue(1)
param autoscaleDefaultCapacity int = 1

@description('Enable App Service Plan zone redundancy. Australia East supports zone-redundant PremiumV3 plans; production-only by default.')
param appServicePlanZoneRedundant bool = environment == 'production'

@description('Email recipients for Azure Monitor action group alerts.')
param alertEmailAddresses array = []

@description('Diagnostic retention in Log Analytics. Production keeps 90 days; non-production keeps 30 days.')
param diagnosticRetentionDays int = environment == 'production' ? 90 : 30

@description('Scaffold VNet/private DNS resources for future private endpoint rollout. Private endpoints remain disabled by default pending integration testing and approval.')
param enablePrivateEndpoints bool = false

@description('PostgreSQL active connections alert threshold. Set to 80% of the selected SKU max connections.')
param postgresActiveConnectionsThreshold int = environment == 'production' ? 800 : 80

@description('Tag set applied to every resource.')
param tags object = {
  application: 'fabric-contract-intelligence'
  environment: environment
  owner: 'orqentis'
  costCenter: 'orqentis'
}

var resourceSuffix = uniqueString(resourceGroup().id, environment)
var keyVaultName = substring('${namePrefix}-${environment}-kv-${resourceSuffix}', 0, 24)
var keyVaultUri = 'https://${keyVaultName}.${az.environment().suffixes.keyvaultDns}/'
var postgresConnectionStringSecretName = 'postgres-connection-string'
var azureAdClientSecretSecretName = 'azuread-client-secret'
var appInsightsConnectionStringSecretName = 'application-insights-connection-string'
var postgresConnectionString = 'Host=${postgres.outputs.fqdn};Database=${postgres.outputs.databaseName};SslMode=Require;Username=${pgAdminUsername};Password=${pgAdminPassword}'

module observability 'modules/observability.bicep' = {
  name: 'observability'
  params: {
    namePrefix: namePrefix
    environment: environment
    location: location
    suffix: resourceSuffix
    retentionInDays: diagnosticRetentionDays
    tags: tags
  }
}

module postgres 'modules/postgresql.bicep' = {
  name: 'postgres'
  params: {
    namePrefix: namePrefix
    environment: environment
    location: location
    suffix: resourceSuffix
    adminUsername: pgAdminUsername
    adminPassword: pgAdminPassword
    highAvailabilityMode: highAvailabilityMode
    storageSizeGB: storageSizeGB
    tags: tags
  }
}

module openai 'modules/openai.bicep' = {
  name: 'openai'
  params: {
    namePrefix: namePrefix
    environment: environment
    location: location
    suffix: resourceSuffix
    tags: tags
  }
}

module appPlan 'modules/app-service-plan.bicep' = {
  name: 'app-plan'
  params: {
    namePrefix: namePrefix
    environment: environment
    location: location
    suffix: resourceSuffix
    skuName: environment == 'production' ? 'P2v3' : 'B2'
    zoneRedundant: appServicePlanZoneRedundant
    tags: tags
  }
}

module api 'modules/app-service.bicep' = {
  name: 'api'
  params: {
    namePrefix: namePrefix
    environment: environment
    location: location
    appServicePlanId: appPlan.outputs.planId
    keyVaultUri: keyVaultUri
    appInsightsConnectionStringSecretUri: '${keyVaultUri}secrets/${appInsightsConnectionStringSecretName}'
    pgConnectionStringSecretUri: '${keyVaultUri}secrets/${postgresConnectionStringSecretName}'
    azureAdClientSecretSecretUri: '${keyVaultUri}secrets/${azureAdClientSecretSecretName}'
    azureAdTenantId: azureAdTenantId
    azureAdClientId: azureAdClientId
    azureAdAudience: empty(azureAdAudience) ? 'api://${azureAdClientId}' : azureAdAudience
    openAiEndpoint: openai.outputs.endpoint
    tags: tags
  }
}

module keyvault 'modules/keyvault.bicep' = {
  name: 'keyvault'
  params: {
    namePrefix: namePrefix
    environment: environment
    location: location
    suffix: resourceSuffix
    vaultName: keyVaultName
    adminGroupObjectId: keyVaultAdminGroupObjectId
    appServicePrincipalId: api.outputs.principalId
    postgresConnectionStringSecretName: postgresConnectionStringSecretName
    postgresConnectionString: postgresConnectionString
    azureAdClientSecretSecretName: azureAdClientSecretSecretName
    azureAdClientSecret: azureAdClientSecret
    appInsightsConnectionStringSecretName: appInsightsConnectionStringSecretName
    appInsightsConnectionString: observability.outputs.appInsightsConnectionString
    tags: tags
  }
}

module autoscale 'modules/app-service-autoscale.bicep' = if (enableAutoscale) {
  name: 'app-autoscale'
  params: {
    namePrefix: namePrefix
    environment: environment
    location: location
    appServicePlanId: appPlan.outputs.planId
    minCapacity: autoscaleMinCapacity
    maxCapacity: autoscaleMaxCapacity
    defaultCapacity: autoscaleDefaultCapacity
    tags: tags
  }
}

module swa 'modules/static-web-apps.bicep' = {
  name: 'swa'
  params: {
    namePrefix: namePrefix
    environment: environment
    location: location
    suffix: resourceSuffix
    tags: tags
  }
}

module network 'modules/network.bicep' = {
  name: 'network'
  params: {
    namePrefix: namePrefix
    environment: environment
    location: location
    suffix: resourceSuffix
    enablePrivateEndpoints: enablePrivateEndpoints
    tags: tags
  }
}

module diagnostics 'modules/diagnostics.bicep' = {
  name: 'diagnostics'
  params: {
    environment: environment
    workspaceId: observability.outputs.workspaceId
    appServiceName: api.outputs.appName
    postgresServerName: postgres.outputs.serverName
    keyVaultName: keyvault.outputs.vaultName
    staticWebAppName: swa.outputs.swaName
  }
}

module alerts 'modules/alerts.bicep' = {
  name: 'alerts'
  params: {
    namePrefix: namePrefix
    environment: environment
    appServiceId: api.outputs.appId
    postgresServerId: postgres.outputs.serverId
    keyVaultId: keyvault.outputs.vaultId
    actionEmailAddresses: alertEmailAddresses
    postgresActiveConnectionsThreshold: postgresActiveConnectionsThreshold
    tags: tags
  }
}

output apiHostname string = api.outputs.defaultHostname
output swaHostname string = swa.outputs.defaultHostname
output appInsightsConnectionString string = observability.outputs.appInsightsConnectionString
output logAnalyticsWorkspaceId string = observability.outputs.workspaceId
