param namePrefix string
param environment string
param location string
param suffix string
param skuName string

@description('Enables App Service Plan zone redundancy. Use only in production on PremiumV3+ SKUs in supported regions such as Australia East. Expect roughly +30% cost for zone-resilient capacity.')
param zoneRedundant bool = false

param tags object

resource plan 'Microsoft.Web/serverfarms@2024-04-01' = {
  name: '${namePrefix}-${environment}-plan-${suffix}'
  location: location
  tags: tags
  sku: {
    name: skuName
    tier: skuName == 'B2' ? 'Basic' : 'PremiumV3'
  }
  kind: 'linux'
  properties: {
    reserved: true
    zoneRedundant: zoneRedundant
  }
}

output planId string = plan.id
output planName string = plan.name
