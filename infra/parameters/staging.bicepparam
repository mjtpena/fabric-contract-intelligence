using '../main.bicep'

param environment = 'staging'
param location = 'australiaeast'
param namePrefix = 'fci'
// Replace with the object id of the Datachain "FCI Admins" Entra group.
param keyVaultAdminGroupObjectId = '00000000-0000-0000-0000-000000000000'
param pgAdminUsername = 'fciadmin'
// In CI, this is sourced from a GitHub Actions secret -> Key Vault.
param pgAdminPassword = readEnvironmentVariable('PG_ADMIN_PASSWORD', 'CHANGE_ME')
