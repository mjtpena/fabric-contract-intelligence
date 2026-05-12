using '../main.bicep'

param environment = 'production'
param location = 'australiaeast'
param namePrefix = 'orqentis'
param keyVaultAdminGroupObjectId = '00000000-0000-0000-0000-000000000000'
param pgAdminUsername = 'orqentisadmin'
param pgAdminPassword = readEnvironmentVariable('PG_ADMIN_PASSWORD', 'CHANGE_ME')
param azureAdTenantId = readEnvironmentVariable('AZURE_AD_TENANT_ID', '')
param azureAdClientId = readEnvironmentVariable('ORQENTIS_APP_CLIENT_ID', '')
param azureAdClientSecret = readEnvironmentVariable('ORQENTIS_APP_CLIENT_SECRET', '')
