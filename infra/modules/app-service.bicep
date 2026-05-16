param namePrefix string
param environment string
param location string
param appServicePlanId string
param tags object

resource app 'Microsoft.Web/sites@2024-04-01' = {
  name: '${namePrefix}-${environment}-api'
  location: location
  tags: tags
  kind: 'app,linux'
  identity: { type: 'SystemAssigned' }
  properties: {
    serverFarmId: appServicePlanId
    httpsOnly: true
    siteConfig: {
      linuxFxVersion: 'DOTNETCORE|8.0'
      alwaysOn: environment == 'production'
      ftpsState: 'Disabled'
      minTlsVersion: '1.2'
      healthCheckPath: '/health/live'
      // App settings are applied by app-service-settings.bicep AFTER Key Vault
      // is provisioned, so KV references resolve on the first cold start.
    }
  }
}

output appId string = app.id
output appName string = app.name
output defaultHostname string = app.properties.defaultHostName
output principalId string = app.identity.principalId
