param namePrefix string
param environment string
param location string
param suffix string
param adminGroupObjectId string
param tags object

resource kv 'Microsoft.KeyVault/vaults@2024-04-01-preview' = {
  name: substring('${namePrefix}-${environment}-kv-${suffix}', 0, 24)
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
    // Key Vault Administrator
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '00482a5a-887f-4fb3-b363-3b7fe8e74483')
    principalId: adminGroupObjectId
  }
}

output vaultId string = kv.id
output vaultUri string = kv.properties.vaultUri
