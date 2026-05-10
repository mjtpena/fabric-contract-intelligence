param namePrefix string
param environment string
param location string
param suffix string
param tags object

resource oai 'Microsoft.CognitiveServices/accounts@2024-10-01' = {
  name: '${namePrefix}-${environment}-oai-${suffix}'
  location: location
  tags: tags
  kind: 'OpenAI'
  sku: { name: 'S0' }
  properties: {
    customSubDomainName: '${namePrefix}-${environment}-oai-${suffix}'
    publicNetworkAccess: 'Enabled'
  }
}

resource gpt4o 'Microsoft.CognitiveServices/accounts/deployments@2024-10-01' = {
  parent: oai
  name: 'gpt-4o'
  sku: {
    name: 'GlobalStandard'
    capacity: environment == 'production' ? 50 : 10
  }
  properties: {
    model: { format: 'OpenAI', name: 'gpt-4o', version: '2024-11-20' }
  }
}

output endpoint string = oai.properties.endpoint
output accountId string = oai.id
