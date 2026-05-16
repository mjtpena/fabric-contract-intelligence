# WAF compliance summary

Source audits are stored in `.copilot/session-state/8f593bf2-cbfe-406b-afc6-29ae9a1150a0/files/`:

- `waf-security.md`
- `waf-reliability.md`
- `waf-performance.md`
- `waf-cost.md`
- `waf-opex.md`

| Pillar | Status before | Status after this PR | Open items | Next-sprint owner |
|---|---|---|---|---|
| Security | Partial: no Dependabot/security scan stage; some identity and secret-hardening findings remain. | Improved: Dependabot, NuGet/npm audits, CodeQL, and Trivy are wired. | OBO token caching, Key Vault-only PostgreSQL connection string, full secret rotation drills. | Platform/security |
| Reliability | Partial: health and backup runbooks existed, but failover and rollback procedures were thin. | Improved: DbUp failures now stop startup; failover, rollback, and AI/OBO runbooks are documented. | Health-check path/Bicep fixes, automated smoke rollback, restore-drill automation. | Platform/infra |
| Performance efficiency | Partial: performance scenarios documented, but operational tuning docs were limited. | Improved: slow-endpoint queries and rate-limit tuning runbook added. | Load-test automation, capacity thresholds, provider latency budgets. | Performance owner |
| Cost optimization | Partial: cost levers documented outside the repo but not summarized in WAF tracking. | Improved: compliance summary tracks cost pillar follow-up. | Scheduled non-prod shutdowns, budget alerts, AI token spend dashboards. | FinOps/platform |
| Operational excellence | Partial: CI/build was strong, but security scans, ADRs, release notes, runbooks, and ownership docs were missing. | Improved: Dependabot, CI security job, frontend coverage step, release-please, ADRs, observability docs, CODEOWNERS, contributing docs, and on-call/SLA docs added. | Branch protection enforcement, alert Bicep resources, automated drift remediation, feature endpoint implementation. | Platform engineering |
