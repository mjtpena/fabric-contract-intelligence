param namePrefix string
param environment string
param location string
param suffix string
param apiBackendResourceId string
param tags object

var swaLocation = location == 'australiaeast' ? 'eastasia' : location

resource swa 'Microsoft.Web/staticSites@2024-04-01' = {
  name: '${namePrefix}-${environment}-swa-${suffix}'
  location: swaLocation
  tags: tags
  sku: { name: environment == 'production' ? 'Standard' : 'Free', tier: environment == 'production' ? 'Standard' : 'Free' }
  properties: {
    repositoryUrl: 'https://github.com/mjtpena/fabric-contract-intelligence'
    branch: 'main'
    buildProperties: { skipGithubActionWorkflowGeneration: true }
  }
}

resource backendLink 'Microsoft.Web/staticSites/linkedBackends@2024-04-01' = if (environment == 'production') {
  parent: swa
  name: 'orqentis-api'
  properties: { backendResourceId: apiBackendResourceId, region: location }
}

output defaultHostname string = swa.properties.defaultHostname
output swaId string = swa.id
