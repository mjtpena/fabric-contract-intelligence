# Deploy rollback runbook

## When to rollback

Rollback if production health checks fail, customer-facing APIs return sustained 5xx, or a release causes data access/authentication regressions.

## Slot-swap rollback

1. Identify the last successful production deployment SHA or tag in GitHub Actions.
2. If using deployment slots, swap the previous healthy slot back into production.
3. If no healthy slot remains, rerun `Deploy (production)` for the last known-good tag or SHA.
4. Validate `https://fabric.orqentis.com` serves the expected bundle.
5. Validate `https://orqentis-production-api.azurewebsites.net/health/ready`.
6. Run the live Fabric smoke path: open a contract item, load the editor, and verify `/v1/contracts` returns 200.

## Database rollback rules

Migrations are append-only. Never edit or delete an applied migration. If a schema change is faulty, ship a new forward-fix migration. For data corruption, restore to an isolated PostgreSQL server first and coordinate customer-impact review before any production cutover.
