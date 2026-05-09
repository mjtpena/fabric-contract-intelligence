using '../main.bicep'

param environment = 'production'
param location = 'australiaeast'
param namePrefix = 'fci'
param keyVaultAdminGroupObjectId = '00000000-0000-0000-0000-000000000000'
param pgAdminUsername = 'fciadmin'
param pgAdminPassword = readEnvironmentVariable('PG_ADMIN_PASSWORD', 'CHANGE_ME')
