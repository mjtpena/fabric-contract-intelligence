param namePrefix string
param environment string
param location string
param appServicePlanId string

@minValue(1)
param minCapacity int = 1

@minValue(1)
param maxCapacity int = 3

@minValue(1)
param defaultCapacity int = 1

param tags object

resource autoscale 'Microsoft.Insights/autoscalesettings@2022-10-01' = {
  name: '${namePrefix}-${environment}-api-autoscale'
  location: location
  tags: tags
  properties: {
    enabled: true
    targetResourceUri: appServicePlanId
    profiles: [
      {
        name: 'cpu-autoscale'
        capacity: {
          minimum: string(minCapacity)
          maximum: string(maxCapacity)
          default: string(defaultCapacity)
        }
        rules: [
          {
            metricTrigger: {
              metricName: 'CpuPercentage'
              metricNamespace: 'Microsoft.Web/serverfarms'
              metricResourceUri: appServicePlanId
              timeGrain: 'PT1M'
              statistic: 'Average'
              timeWindow: 'PT10M'
              timeAggregation: 'Average'
              operator: 'GreaterThan'
              threshold: 70
            }
            scaleAction: {
              direction: 'Increase'
              type: 'ChangeCount'
              value: '1'
              cooldown: 'PT5M'
            }
          }
          {
            metricTrigger: {
              metricName: 'CpuPercentage'
              metricNamespace: 'Microsoft.Web/serverfarms'
              metricResourceUri: appServicePlanId
              timeGrain: 'PT1M'
              statistic: 'Average'
              timeWindow: 'PT10M'
              timeAggregation: 'Average'
              operator: 'LessThan'
              threshold: 30
            }
            scaleAction: {
              direction: 'Decrease'
              type: 'ChangeCount'
              value: '1'
              cooldown: 'PT10M'
            }
          }
        ]
      }
    ]
  }
}

output autoscaleSettingId string = autoscale.id
