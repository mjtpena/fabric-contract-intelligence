# PostgreSQL failover runbook

## Symptoms

- `/health/ready` reports `postgres` degraded or unhealthy.
- API requests fail with connection timeouts or PostgreSQL transient errors.
- Azure Monitor reports high CPU, storage exhaustion, failed connections, or failover events.

## Graceful failover sequence

1. Announce incident and freeze deployments.
2. Confirm the current Flexible Server status and latest backup restore point in Azure Portal or CLI.
3. If zone-redundant HA is enabled, trigger planned failover from the PostgreSQL Flexible Server blade or Azure CLI.
4. If HA is unavailable, restore the latest backup to an isolated replacement server.
5. Update the Key Vault/App Service-backed PostgreSQL connection string only after the target server is ready.
6. Restart the API App Service or slot so connection pools are recreated.

## Readiness checks

- `GET https://orqentis-production-api.azurewebsites.net/health/ready` returns healthy.
- Contract list and run history endpoints return 200 for a known test tenant.
- DbUp reports no pending failed migrations.
- Application Insights shows connection failures returning to baseline.

## Backup verification

After recovery, run a restore drill in staging: restore the production backup to an isolated server, point staging at it, run API smoke tests, and record restore time and data consistency checks.
