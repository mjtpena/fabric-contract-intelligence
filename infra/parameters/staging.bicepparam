using '../main.bicep'

param environment = 'staging'
param location = 'australiaeast'
param namePrefix = 'orqentis'
// Replace with the object id of the Orqentis "Orqentis Admins" Entra group.
param keyVaultAdminGroupObjectId = '00000000-0000-0000-0000-000000000000'
param pgAdminUsername = 'orqentisadmin'
// In CI, this is sourced from a GitHub Actions secret -> Key Vault.
param pgAdminPassword = readEnvironmentVariable('PG_ADMIN_PASSWORD', 'CHANGE_ME')
