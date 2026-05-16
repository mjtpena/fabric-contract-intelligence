using '../main.bicep'

param environment = 'staging'
param location = 'australiaeast'
param namePrefix = 'orqentis'
// Replace with the object id of the Orqentis "Orqentis Admins" Entra group.
param keyVaultAdminGroupObjectId = '00000000-0000-0000-0000-000000000000'
param pgAdminUsername = 'orqentisadmin'
// In CI, this is sourced from a GitHub Actions secret -> Key Vault, then rotated out-of-band after bootstrap.
param pgAdminPassword = readEnvironmentVariable('PG_ADMIN_PASSWORD', 'CHANGE_ME')
param highAvailabilityMode = 'Disabled'
param storageSizeGB = 32
param azureAdTenantId = readEnvironmentVariable('AZURE_AD_TENANT_ID', '')
param azureAdClientId = readEnvironmentVariable('ORQENTIS_APP_CLIENT_ID', '')
param azureAdClientSecret = readEnvironmentVariable('ORQENTIS_APP_CLIENT_SECRET', '')
param enableAutoscale = false
param autoscaleMaxCapacity = 2
param appServicePlanZoneRedundant = false
param alertEmailAddresses = [readEnvironmentVariable('ALERT_EMAIL_ADDRESS', 'orqentis-alerts@example.com')]
param diagnosticRetentionDays = 30
param enablePrivateEndpoints = false
param postgresActiveConnectionsThreshold = 80
