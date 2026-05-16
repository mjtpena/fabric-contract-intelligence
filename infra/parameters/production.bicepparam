using '../main.bicep'

param environment = 'production'
param location = 'australiaeast'
param namePrefix = 'orqentis'
param keyVaultAdminGroupObjectId = '00000000-0000-0000-0000-000000000000'
param pgAdminUsername = 'orqentisadmin'
// Initial bootstrap secret only; rotate in Key Vault out-of-band after deployment.
param pgAdminPassword = readEnvironmentVariable('PG_ADMIN_PASSWORD', 'CHANGE_ME')
param highAvailabilityMode = 'ZoneRedundant'
param storageSizeGB = 256
param azureAdTenantId = readEnvironmentVariable('AZURE_AD_TENANT_ID', '')
param azureAdClientId = readEnvironmentVariable('ORQENTIS_APP_CLIENT_ID', '')
param azureAdClientSecret = readEnvironmentVariable('ORQENTIS_APP_CLIENT_SECRET', '')
param enableAutoscale = true
param autoscaleMaxCapacity = 5
param appServicePlanZoneRedundant = true
param alertEmailAddresses = [readEnvironmentVariable('ALERT_EMAIL_ADDRESS', 'orqentis-alerts@example.com')]
param diagnosticRetentionDays = 90
param enablePrivateEndpoints = false
param postgresActiveConnectionsThreshold = 800
