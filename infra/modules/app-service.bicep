param namePrefix string
param environment string
param location string
param appServicePlanId string
param keyVaultUri string
param appInsightsConnectionString string
param pgFqdn string
param pgDatabaseName string
param openAiEndpoint string
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
      healthCheckPath: '/healthz'
      appSettings: [
        { name: 'ASPNETCORE_ENVIRONMENT', value: environment == 'production' ? 'Production' : 'Staging' }
        { name: 'APPLICATIONINSIGHTS_CONNECTION_STRING', value: appInsightsConnectionString }
        { name: 'KeyVault__Uri', value: keyVaultUri }
        { name: 'ConnectionStrings__Postgres', value: 'Host=${pgFqdn};Database=${pgDatabaseName};SslMode=Require;Username=@Microsoft.KeyVault(SecretUri=${keyVaultUri}secrets/PgAdminUsername);Password=@Microsoft.KeyVault(SecretUri=${keyVaultUri}secrets/PgAdminPassword)' }
        { name: 'AI__AzureOpenAI__Endpoint', value: openAiEndpoint }
      ]
    }
  }
}

output appId string = app.id
output defaultHostname string = app.properties.defaultHostName
output principalId string = app.identity.principalId
