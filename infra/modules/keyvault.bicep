param namePrefix string
param environment string
param location string
param suffix string
param vaultName string = substring('${namePrefix}-${environment}-kv-${suffix}', 0, 24)
param adminGroupObjectId string
param appServicePrincipalId string = ''
param postgresConnectionStringSecretName string = 'postgres-connection-string'

@secure()
param postgresConnectionString string = ''

param azureAdClientSecretSecretName string = 'azuread-client-secret'

@secure()
param azureAdClientSecret string = ''

param appInsightsConnectionStringSecretName string = 'application-insights-connection-string'
param appInsightsConnectionString string = ''
param tags object

resource kv 'Microsoft.KeyVault/vaults@2024-04-01-preview' = {
  name: vaultName
  location: location
  tags: tags
  properties: {
    tenantId: subscription().tenantId
    sku: { family: 'A', name: 'standard' }
    enableRbacAuthorization: true
    enableSoftDelete: true
    softDeleteRetentionInDays: 90
    enablePurgeProtection: environment == 'production' ? true : null
    publicNetworkAccess: 'Enabled'
  }
}

resource adminAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(kv.id, adminGroupObjectId, 'kvadmin')
  scope: kv
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '00482a5a-887f-4fb3-b363-3b7fe8e74483')
    principalId: adminGroupObjectId
  }
}

resource appSecretsUserAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = if (!empty(appServicePrincipalId)) {
  name: guid(kv.id, appServicePrincipalId, 'kv-secrets-user')
  scope: kv
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '4633458b-17de-408a-b874-0445c86b69e6')
    principalId: appServicePrincipalId
    principalType: 'ServicePrincipal'
  }
}

// Bootstrap placeholders only: initial secret values are provided through secure deployment
// parameters and must be rotated out-of-band immediately after one-time environment setup.
resource postgresSecret 'Microsoft.KeyVault/vaults/secrets@2024-04-01-preview' = if (!empty(postgresConnectionString)) {
  parent: kv
  name: postgresConnectionStringSecretName
  properties: { value: postgresConnectionString }
}

resource azureAdClientSecretResource 'Microsoft.KeyVault/vaults/secrets@2024-04-01-preview' = if (!empty(azureAdClientSecret)) {
  parent: kv
  name: azureAdClientSecretSecretName
  properties: { value: azureAdClientSecret }
}

resource appInsightsSecret 'Microsoft.KeyVault/vaults/secrets@2024-04-01-preview' = if (!empty(appInsightsConnectionString)) {
  parent: kv
  name: appInsightsConnectionStringSecretName
  properties: { value: appInsightsConnectionString }
}

output vaultId string = kv.id
output vaultName string = kv.name
output vaultUri string = kv.properties.vaultUri
output postgresConnectionStringSecretUri string = '${kv.properties.vaultUri}secrets/${postgresConnectionStringSecretName}'
output azureAdClientSecretSecretUri string = '${kv.properties.vaultUri}secrets/${azureAdClientSecretSecretName}'
output appInsightsConnectionStringSecretUri string = '${kv.properties.vaultUri}secrets/${appInsightsConnectionStringSecretName}'
