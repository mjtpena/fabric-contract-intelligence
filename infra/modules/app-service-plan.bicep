param namePrefix string
param environment string
param location string
param suffix string
param skuName string
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
  properties: { reserved: true }
}

output planId string = plan.id
