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
@description('PostgreSQL admin password. Pass via parameter file referencing Key Vault.')
param pgAdminPassword string

@description('Microsoft Entra tenant id used to validate API bearer tokens.')
param azureAdTenantId string = tenant().tenantId

@description('Microsoft Entra application client id used by the Fabric workload and API.')
param azureAdClientId string

@description('Expected API audience. Defaults to api://{azureAdClientId}.')
param azureAdAudience string = ''

@secure()
@description('Microsoft Entra application client secret used for OBO token exchange.')
param azureAdClientSecret string

@description('Tag set applied to every resource.')
param tags object = {
  application: 'fabric-contract-intelligence'
  environment: environment
  owner: 'orqentis'
  costCenter: 'orqentis'
}

var resourceSuffix = uniqueString(resourceGroup().id, environment)

module monitoring 'modules/monitoring.bicep' = {
  name: 'monitoring'
  params: {
    namePrefix: namePrefix
    environment: environment
    location: location
    suffix: resourceSuffix
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
    adminGroupObjectId: keyVaultAdminGroupObjectId
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
    keyVaultUri: keyvault.outputs.vaultUri
    appInsightsConnectionString: monitoring.outputs.appInsightsConnectionString
    pgFqdn: postgres.outputs.fqdn
    pgDatabaseName: postgres.outputs.databaseName
    pgAdminUsername: pgAdminUsername
    pgAdminPassword: pgAdminPassword
    azureAdTenantId: azureAdTenantId
    azureAdClientId: azureAdClientId
    azureAdAudience: empty(azureAdAudience) ? 'api://${azureAdClientId}' : azureAdAudience
    azureAdClientSecret: azureAdClientSecret
    openAiEndpoint: openai.outputs.endpoint
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

output apiHostname string = api.outputs.defaultHostname
output swaHostname string = swa.outputs.defaultHostname
output appInsightsConnectionString string = monitoring.outputs.appInsightsConnectionString
