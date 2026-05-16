// PostgreSQL Flexible Server for Orqentis metadata.
// Storage is parameterized because contract/run metadata grows gradually with tenant adoption;
// launch defaults are 128 GiB production and 32 GiB staging, with explicit increases after usage telemetry.
param namePrefix string
param environment string
param location string
param suffix string
param adminUsername string

@secure()
param adminPassword string

@description('PostgreSQL high availability mode. ZoneRedundant roughly doubles DB compute cost (~$450-700/mo on D4ds_v5) and should be enabled only when the production SLA requires 99.99% DB availability.')
@allowed(['Disabled', 'SameZone', 'ZoneRedundant'])
param highAvailabilityMode string = 'Disabled'

@description('Provisioned PostgreSQL storage in GiB.')
@minValue(32)
param storageSizeGB int = 128

param tags object

resource server 'Microsoft.DBforPostgreSQL/flexibleServers@2024-08-01' = {
  name: '${namePrefix}-${environment}-pg-${suffix}'
  location: location
  tags: tags
  sku: {
    name: environment == 'production' ? 'Standard_D4ds_v5' : 'Standard_B2ms'
    tier: environment == 'production' ? 'GeneralPurpose' : 'Burstable'
  }
  properties: {
    version: '16'
    administratorLogin: adminUsername
    administratorLoginPassword: adminPassword
    storage: { storageSizeGB: storageSizeGB }
    backup: {
      backupRetentionDays: environment == 'production' ? 30 : 7
      geoRedundantBackup: environment == 'production' ? 'Enabled' : 'Disabled'
    }
    highAvailability: { mode: highAvailabilityMode }
  }
}

resource db 'Microsoft.DBforPostgreSQL/flexibleServers/databases@2024-08-01' = {
  parent: server
  name: 'orqentis'
  properties: { charset: 'UTF8', collation: 'en_US.UTF8' }
}

resource allowAzure 'Microsoft.DBforPostgreSQL/flexibleServers/firewallRules@2024-08-01' = {
  parent: server
  name: 'AllowAzureServices'
  properties: { startIpAddress: '0.0.0.0', endIpAddress: '0.0.0.0' }
}

output serverId string = server.id
output serverName string = server.name
output fqdn string = server.properties.fullyQualifiedDomainName
output databaseName string = db.name
