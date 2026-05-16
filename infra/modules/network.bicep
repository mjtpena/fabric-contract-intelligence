param namePrefix string
param environment string
param location string
param suffix string
param enablePrivateEndpoints bool = false
param tags object

var vnetName = '${namePrefix}-${environment}-vnet-${suffix}'
var mergedTags = union(tags, {
  privateEndpointGoLive: enablePrivateEndpoints ? 'approved' : 'disabled-pending-validation'
})

resource vnet 'Microsoft.Network/virtualNetworks@2024-05-01' = {
  name: vnetName
  location: location
  tags: mergedTags
  properties: {
    addressSpace: {
      addressPrefixes: ['10.42.0.0/16']
    }
    subnets: [
      {
        name: 'snet-appservice-integration'
        properties: {
          addressPrefix: '10.42.1.0/24'
          delegations: [
            {
              name: 'app-service-delegation'
              properties: { serviceName: 'Microsoft.Web/serverFarms' }
            }
          ]
          privateEndpointNetworkPolicies: 'Disabled'
        }
      }
      {
        name: 'snet-postgres-delegated'
        properties: {
          addressPrefix: '10.42.2.0/24'
          delegations: [
            {
              name: 'postgres-flexible-server-delegation'
              properties: { serviceName: 'Microsoft.DBforPostgreSQL/flexibleServers' }
            }
          ]
          privateEndpointNetworkPolicies: 'Disabled'
        }
      }
    ]
  }
}

resource postgresPrivateDns 'Microsoft.Network/privateDnsZones@2024-06-01' = {
  name: 'privatelink.postgres.database.azure.com'
  location: 'global'
  tags: tags
}

resource postgresPrivateDnsLink 'Microsoft.Network/privateDnsZones/virtualNetworkLinks@2024-06-01' = {
  parent: postgresPrivateDns
  name: '${vnet.name}-link'
  location: 'global'
  properties: {
    registrationEnabled: false
    virtualNetwork: { id: vnet.id }
  }
}

// TODO: enable private endpoint resources once this VNet is provisioned, network routing is approved,
// and App Service VNet integration/PostgreSQL private connectivity have passed staging tests.
output vnetId string = vnet.id
output appServiceSubnetId string = '${vnet.id}/subnets/snet-appservice-integration'
output postgresDelegatedSubnetId string = '${vnet.id}/subnets/snet-postgres-delegated'
output privateEndpointsEnabled bool = enablePrivateEndpoints
