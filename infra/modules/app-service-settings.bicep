// Applies app settings *after* Key Vault secrets + RBAC exist, so
// @Microsoft.KeyVault(SecretUri=...) references resolve on first start.
param appServiceName string
param environment string
param keyVaultUri string
param appInsightsConnectionStringSecretUri string
param pgConnectionStringSecretUri string
param azureAdClientSecretSecretUri string
param azureAdTenantId string
param azureAdClientId string
param azureAdAudience string
param openAiEndpoint string

resource app 'Microsoft.Web/sites@2024-04-01' existing = {
  name: appServiceName
}

resource settings 'Microsoft.Web/sites/config@2024-04-01' = {
  parent: app
  name: 'appsettings'
  properties: {
    ASPNETCORE_ENVIRONMENT: environment == 'production' ? 'Production' : 'Staging'
    APPLICATIONINSIGHTS_CONNECTION_STRING: '@Microsoft.KeyVault(SecretUri=${appInsightsConnectionStringSecretUri})'
    'ApplicationInsights__ConnectionString': '@Microsoft.KeyVault(SecretUri=${appInsightsConnectionStringSecretUri})'
    'KeyVault__VaultUri': keyVaultUri
    'ConnectionStrings__Postgres': '@Microsoft.KeyVault(SecretUri=${pgConnectionStringSecretUri})'
    'ConnectionStrings__Default': '@Microsoft.KeyVault(SecretUri=${pgConnectionStringSecretUri})'
    'AzureAd__Instance': az.environment().authentication.loginEndpoint
    'AzureAd__TenantId': azureAdTenantId
    'AzureAd__ClientId': azureAdClientId
    'AzureAd__Audience': azureAdAudience
    'AzureAd__ClientSecret': '@Microsoft.KeyVault(SecretUri=${azureAdClientSecretSecretUri})'
    'AI__AzureOpenAI__Endpoint': openAiEndpoint
  }
}
