param namePrefix string
param environment string
param location string
param appServicePlanId string
param keyVaultUri string
param appInsightsConnectionStringSecretUri string
param pgConnectionStringSecretUri string
param azureAdClientSecretSecretUri string
param azureAdTenantId string
param azureAdClientId string
param azureAdAudience string
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
      healthCheckPath: '/health/live'
      appSettings: [
        { name: 'ASPNETCORE_ENVIRONMENT', value: environment == 'production' ? 'Production' : 'Staging' }
        { name: 'APPLICATIONINSIGHTS_CONNECTION_STRING', value: '@Microsoft.KeyVault(SecretUri=${appInsightsConnectionStringSecretUri})' }
        { name: 'ApplicationInsights__ConnectionString', value: '@Microsoft.KeyVault(SecretUri=${appInsightsConnectionStringSecretUri})' }
        { name: 'KeyVault__VaultUri', value: keyVaultUri }
        { name: 'ConnectionStrings__Postgres', value: '@Microsoft.KeyVault(SecretUri=${pgConnectionStringSecretUri})' }
        { name: 'ConnectionStrings__Default', value: '@Microsoft.KeyVault(SecretUri=${pgConnectionStringSecretUri})' }
        { name: 'AzureAd__Instance', value: az.environment().authentication.loginEndpoint }
        { name: 'AzureAd__TenantId', value: azureAdTenantId }
        { name: 'AzureAd__ClientId', value: azureAdClientId }
        { name: 'AzureAd__Audience', value: azureAdAudience }
        { name: 'AzureAd__ClientSecret', value: '@Microsoft.KeyVault(SecretUri=${azureAdClientSecretSecretUri})' }
        { name: 'AI__AzureOpenAI__Endpoint', value: openAiEndpoint }
      ]
    }
  }
}

output appId string = app.id
output appName string = app.name
output defaultHostname string = app.properties.defaultHostName
output principalId string = app.identity.principalId
