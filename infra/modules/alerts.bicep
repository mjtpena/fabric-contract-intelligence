param namePrefix string
param environment string
param appServiceId string
param postgresServerId string
param keyVaultId string
param actionEmailAddresses array = []
param postgresActiveConnectionsThreshold int = 80
param tags object

var actionGroupName = '${namePrefix}-${environment}-alerts'
var actionGroupShortName = substring('${namePrefix}${environment}', 0, min(length('${namePrefix}${environment}'), 12))

resource actionGroup 'Microsoft.Insights/actionGroups@2023-01-01' = {
  name: actionGroupName
  location: 'global'
  tags: tags
  properties: {
    groupShortName: actionGroupShortName
    enabled: true
    emailReceivers: [for (email, i) in actionEmailAddresses: {
      name: 'email-${i}'
      emailAddress: email
      useCommonAlertSchema: true
    }]
    smsReceivers: []
    webhookReceivers: []
    eventHubReceivers: []
    itsmReceivers: []
    azureAppPushReceivers: []
    automationRunbookReceivers: []
    voiceReceivers: []
    logicAppReceivers: []
    azureFunctionReceivers: []
    armRoleReceivers: []
  }
}

resource app5xxAlert 'Microsoft.Insights/metricAlerts@2018-03-01' = {
  name: '${namePrefix}-${environment}-api-5xx'
  location: 'global'
  tags: tags
  properties: {
    description: 'App Service HTTP 5xx responses exceed the WAF threshold over 5 minutes.'
    severity: 2
    enabled: true
    scopes: [appServiceId]
    evaluationFrequency: 'PT1M'
    windowSize: 'PT5M'
    criteria: {
      'odata.type': 'Microsoft.Azure.Monitor.SingleResourceMultipleMetricCriteria'
      allOf: [
        {
          name: 'Http5xx'
          criterionType: 'StaticThresholdCriterion'
          metricName: 'Http5xx'
          metricNamespace: 'Microsoft.Web/sites'
          operator: 'GreaterThan'
          threshold: 5
          timeAggregation: 'Total'
        }
      ]
    }
    actions: [{ actionGroupId: actionGroup.id }]
  }
}

resource appResponseTimeAlert 'Microsoft.Insights/metricAlerts@2018-03-01' = {
  name: '${namePrefix}-${environment}-api-response-time'
  location: 'global'
  tags: tags
  properties: {
    description: 'App Service response time exceeds 2 seconds over 5 minutes.'
    severity: 2
    enabled: true
    scopes: [appServiceId]
    evaluationFrequency: 'PT1M'
    windowSize: 'PT5M'
    criteria: {
      'odata.type': 'Microsoft.Azure.Monitor.SingleResourceMultipleMetricCriteria'
      allOf: [
        {
          name: 'HttpResponseTime'
          criterionType: 'StaticThresholdCriterion'
          metricName: 'HttpResponseTime'
          metricNamespace: 'Microsoft.Web/sites'
          operator: 'GreaterThan'
          threshold: 2
          timeAggregation: 'Average'
        }
      ]
    }
    actions: [{ actionGroupId: actionGroup.id }]
  }
}

resource postgresCpuAlert 'Microsoft.Insights/metricAlerts@2018-03-01' = {
  name: '${namePrefix}-${environment}-pg-cpu'
  location: 'global'
  tags: tags
  properties: {
    description: 'PostgreSQL CPU exceeds 80% over 10 minutes.'
    severity: 2
    enabled: true
    scopes: [postgresServerId]
    evaluationFrequency: 'PT1M'
    windowSize: 'PT10M'
    criteria: {
      'odata.type': 'Microsoft.Azure.Monitor.SingleResourceMultipleMetricCriteria'
      allOf: [
        {
          name: 'cpu_percent'
          criterionType: 'StaticThresholdCriterion'
          metricName: 'cpu_percent'
          metricNamespace: 'Microsoft.DBforPostgreSQL/flexibleServers'
          operator: 'GreaterThan'
          threshold: 80
          timeAggregation: 'Average'
        }
      ]
    }
    actions: [{ actionGroupId: actionGroup.id }]
  }
}

resource postgresStorageAlert 'Microsoft.Insights/metricAlerts@2018-03-01' = {
  name: '${namePrefix}-${environment}-pg-storage'
  location: 'global'
  tags: tags
  properties: {
    description: 'PostgreSQL storage used exceeds 80%.'
    severity: 2
    enabled: true
    scopes: [postgresServerId]
    evaluationFrequency: 'PT5M'
    windowSize: 'PT15M'
    criteria: {
      'odata.type': 'Microsoft.Azure.Monitor.SingleResourceMultipleMetricCriteria'
      allOf: [
        {
          name: 'storage_percent'
          criterionType: 'StaticThresholdCriterion'
          metricName: 'storage_percent'
          metricNamespace: 'Microsoft.DBforPostgreSQL/flexibleServers'
          operator: 'GreaterThan'
          threshold: 80
          timeAggregation: 'Average'
        }
      ]
    }
    actions: [{ actionGroupId: actionGroup.id }]
  }
}

resource postgresConnectionsAlert 'Microsoft.Insights/metricAlerts@2018-03-01' = {
  name: '${namePrefix}-${environment}-pg-connections'
  location: 'global'
  tags: tags
  properties: {
    description: 'PostgreSQL active connections exceed 80% of the SKU max connection target.'
    severity: 2
    enabled: true
    scopes: [postgresServerId]
    evaluationFrequency: 'PT1M'
    windowSize: 'PT10M'
    criteria: {
      'odata.type': 'Microsoft.Azure.Monitor.SingleResourceMultipleMetricCriteria'
      allOf: [
        {
          name: 'active_connections'
          criterionType: 'StaticThresholdCriterion'
          metricName: 'active_connections'
          metricNamespace: 'Microsoft.DBforPostgreSQL/flexibleServers'
          operator: 'GreaterThan'
          threshold: postgresActiveConnectionsThreshold
          timeAggregation: 'Average'
        }
      ]
    }
    actions: [{ actionGroupId: actionGroup.id }]
  }
}

resource keyVaultThrottlingAlert 'Microsoft.Insights/metricAlerts@2018-03-01' = {
  name: '${namePrefix}-${environment}-kv-throttled'
  location: 'global'
  tags: tags
  properties: {
    description: 'Key Vault throttled requests detected.'
    severity: 2
    enabled: true
    scopes: [keyVaultId]
    evaluationFrequency: 'PT1M'
    windowSize: 'PT5M'
    criteria: {
      'odata.type': 'Microsoft.Azure.Monitor.SingleResourceMultipleMetricCriteria'
      allOf: [
        {
          name: 'ServiceApiHit429'
          criterionType: 'StaticThresholdCriterion'
          metricName: 'ServiceApiHit'
          metricNamespace: 'Microsoft.KeyVault/vaults'
          dimensions: [
            {
              name: 'StatusCode'
              operator: 'Include'
              values: ['429']
            }
          ]
          operator: 'GreaterThan'
          threshold: 0
          timeAggregation: 'Total'
        }
      ]
    }
    actions: [{ actionGroupId: actionGroup.id }]
  }
}

output actionGroupId string = actionGroup.id
