param namePrefix string
param environment string
param location string
param suffix string
param adminUsername string

@secure()
param adminPassword string

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
    storage: { storageSizeGB: environment == 'production' ? 256 : 64 }
    backup: {
      backupRetentionDays: environment == 'production' ? 30 : 7
      geoRedundantBackup: environment == 'production' ? 'Enabled' : 'Disabled'
    }
    highAvailability: { mode: environment == 'production' ? 'ZoneRedundant' : 'Disabled' }
  }
}

resource db 'Microsoft.DBforPostgreSQL/flexibleServers/databases@2024-08-01' = {
  parent: server
  name: 'fci'
  properties: { charset: 'UTF8', collation: 'en_US.UTF8' }
}

resource allowAzure 'Microsoft.DBforPostgreSQL/flexibleServers/firewallRules@2024-08-01' = {
  parent: server
  name: 'AllowAzureServices'
  properties: { startIpAddress: '0.0.0.0', endIpAddress: '0.0.0.0' }
}

output serverId string = server.id
output fqdn string = server.properties.fullyQualifiedDomainName
output databaseName string = db.name
