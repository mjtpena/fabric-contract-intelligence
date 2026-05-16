param namePrefix string
param environment string
param location string
param suffix string
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

output defaultHostname string = swa.properties.defaultHostname
output swaId string = swa.id
output swaName string = swa.name
