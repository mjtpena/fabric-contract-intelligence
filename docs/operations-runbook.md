# Orqentis Operations Runbook

This runbook is for public customer operations of the Orqentis Fabric workload.

## Service endpoints

| Component | Production endpoint |
|---|---|
| Frontend | `https://fabric.orqentis.com` |
| API | `https://orqentis-production-api.azurewebsites.net` |
| Health | `https://orqentis-production-api.azurewebsites.net/health/ready` |
| Support | `https://fabric.orqentis.com/support.html` |

## Service objectives

| Metric | Target |
|---|---|
| API availability | 99.5% monthly for public preview, 99.9% after GA |
| Workload iframe startup | P95 under 3 seconds after Fabric iframe creation |
| Enforcement request acknowledgement | P95 under 5 seconds for `Run now` queueing |
| Incident acknowledgement | Severity 1 within 1 business hour |

## Monitoring checklist

- App Service availability and HTTP 5xx rate
- `/health/ready` status for PostgreSQL and Key Vault
- PostgreSQL CPU, storage, connections, and failed connections
- Static Web App availability and CDN errors
- AI provider timeout/fallback count
- Activator/webhook delivery failures
- Correlation ID presence in API logs and downstream calls

## Incident severity

| Severity | Definition | Response |
|---|---|---|
| Sev 1 | Public workload unavailable, data access broken, or security incident | Acknowledge within 1 business hour, provide customer updates, prioritize rollback/fix |
| Sev 2 | Major feature unavailable for multiple customers | Acknowledge within 4 business hours, provide workaround if available |
| Sev 3 | Single-customer defect or degraded non-critical feature | Triage next business day |
| Sev 4 | Documentation, cosmetic, or enhancement request | Prioritize through backlog |

## Triage flow

1. Confirm the customer tenant, workspace ID, item type, timestamp, and `X-Correlation-Id`.
2. Check production health endpoint and App Service logs for the correlation ID.
3. Check GitHub deployment history for a recent release.
4. Validate whether the issue is frontend iframe load, API auth, OneLake OBO access, database, AI, or Activator delivery.
5. If release-related, redeploy the previous known-good production tag or workflow artifact.
6. Record the incident timeline, root cause, corrective action, and customer communication.

## Rollback

1. Identify the previous successful production release SHA from GitHub Actions.
2. Re-run `Deploy (production)` against that tag or SHA.
3. Confirm `https://fabric.orqentis.com` serves the expected bundle.
4. Confirm `/health/ready` is healthy.
5. Run the live Fabric smoke path: open a contract item, verify the editor loads, verify `/v1/contracts` returns 200.

## Backup and restore

- PostgreSQL flexible server backups must be enabled with retention appropriate for public customers.
- Before a schema migration release, confirm restore point availability.
- Restore drill:
  1. Restore production backup into an isolated server.
  2. Apply current application configuration against restored database in a staging slot.
  3. Run API smoke tests and contract list/report endpoints.
  4. Document elapsed restore time and any manual steps.

## Customer communications

Use the public support page for intake. For Sev 1 and Sev 2 incidents, provide:

- Acknowledgement with incident ID
- Known impact and workaround
- Next update time
- Resolution summary and prevention action
