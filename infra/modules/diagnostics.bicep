param environment string
param workspaceId string
param appServiceName string
param postgresServerName string
param keyVaultName string
param staticWebAppName string

resource appService 'Microsoft.Web/sites@2024-04-01' existing = {
  name: appServiceName
}

resource postgresServer 'Microsoft.DBforPostgreSQL/flexibleServers@2024-08-01' existing = {
  name: postgresServerName
}

resource keyVault 'Microsoft.KeyVault/vaults@2024-04-01-preview' existing = {
  name: keyVaultName
}

resource staticWebApp 'Microsoft.Web/staticSites@2024-04-01' existing = {
  name: staticWebAppName
}

// Retention is controlled at the Log Analytics workspace level (diagnosticSettings
// retentionPolicy is no longer supported for newly created settings).
var logs = [
  {
    categoryGroup: 'allLogs'
    enabled: true
  }
]
var metrics = [
  {
    category: 'AllMetrics'
    enabled: true
  }
]

resource appServiceDiagnostics 'Microsoft.Insights/diagnosticSettings@2021-05-01-preview' = {
  name: 'send-to-law'
  scope: appService
  properties: {
    workspaceId: workspaceId
    logs: logs
    metrics: metrics
  }
}

resource postgresDiagnostics 'Microsoft.Insights/diagnosticSettings@2021-05-01-preview' = {
  name: 'send-to-law'
  scope: postgresServer
  properties: {
    workspaceId: workspaceId
    logs: logs
    metrics: metrics
  }
}

resource keyVaultDiagnostics 'Microsoft.Insights/diagnosticSettings@2021-05-01-preview' = {
  name: 'send-to-law'
  scope: keyVault
  properties: {
    workspaceId: workspaceId
    logs: logs
    metrics: metrics
  }
}

resource staticWebAppDiagnostics 'Microsoft.Insights/diagnosticSettings@2021-05-01-preview' = {
  name: 'send-to-law'
  scope: staticWebApp
  properties: {
    workspaceId: workspaceId
    logs: logs
    metrics: metrics
  }
}

output retentionInDays int = environment == 'production' ? 90 : 30
