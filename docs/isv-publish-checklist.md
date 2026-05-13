# Orqentis Public ISV Publish Checklist

This checklist is the release gate for publishing Orqentis as a public Microsoft Fabric ISV workload.
It turns public-launch readiness into verifiable artifacts, owners, and evidence paths.

## Launch decision

Public publish is allowed only when every required gate below is complete and the latest
`scripts/Test-PublicReadiness.ps1` run passes in CI.

## Marketplace and Fabric submission package

| Gate | Required evidence |
|---|---|
| Partner Center offer metadata | Product name, short summary, long description, categories, keywords, pricing tier, support URL, privacy URL, terms URL |
| AI value proposition | Listing copy explains contract co-authoring, breach impact scoring, remediation guidance, and natural-language governance without claiming autonomous data modification |
| Fabric workload package | Latest `production-workload-package` artifact from `.github/workflows/deploy-prod.yml` |
| Screenshots | Contract editor, contract report, Lakehouse/table evidence captured under `prod-verification` session artifacts |
| Demo script | Customer walkthrough in `docs/customer-onboarding.md` |
| Support links | `https://fabric.orqentis.com/support.html` and Product manifest support links |
| Legal links | `https://fabric.orqentis.com/legal/privacy.html`, `terms.html`, `license.html`, `security.html` |
| Admin deployment docs | Tenant admin prerequisites and install steps in `docs/customer-onboarding.md` |

## Security, privacy, and compliance

| Gate | Required evidence |
|---|---|
| Threat model accepted | `docs/security-compliance.md` reviewed for auth, tenant isolation, OneLake OBO, AI, and alerting flows |
| Secrets audit | No committed secrets; production secrets only in GitHub/Azure Key Vault; CI secret scan remains green |
| Dependency scan | `npm audit --omit=dev` and `dotnet list package --vulnerable` reviewed before public submission |
| Pen test or security review | Findings triaged; critical/high issues fixed before publish |
| Privacy review | Public privacy page published and data-handling behavior matches `docs/security-compliance.md` |
| Incident process | On-call, severity matrix, and customer communications documented in `docs/operations-runbook.md` |

## Operational readiness

| Gate | Required evidence |
|---|---|
| CI green | `.github/workflows/ci.yml` passes on main |
| Production deploy green | `.github/workflows/deploy-prod.yml` passes for the release SHA |
| Live Fabric regression | `.github/workflows/live-fabric-tests.yml` passes against the release tenant before broad rollout |
| Health checks | `/health/ready` returns healthy for PostgreSQL and Key Vault |
| Rollback path | Previous production workflow artifact or git tag can be redeployed |
| Backup and restore | PostgreSQL backup retention and restore procedure documented in `docs/operations-runbook.md` |
| Observability | Correlation IDs, App Service logs, DB health, AI fallback, and alert delivery are monitored |
| AI reliability | LLM timeout, retry, fallback, and no-throw behavior verified for suggestion, scoring, remediation, and natural-language query |

## Customer and commercial readiness

| Gate | Required evidence |
|---|---|
| Tenant onboarding | Steps in `docs/customer-onboarding.md` completed for a pilot tenant |
| Tenant offboarding | Data export/delete and workload disable process documented |
| Tier enforcement | Community/Enterprise limits configured and tested |
| Entitlement process | Manual entitlement process documented until marketplace billing integration is live |
| Support SLA | Public support page states channels, severities, and response targets |
| Buyer narrative | Sales/demo script positions Orqentis as the AI control plane for trusted Fabric data products, not only a Lakehouse validator |

## Release sign-off record

For every public release, record:

- Release SHA and tag
- Production deployment run URL
- CI run URL
- Live Fabric regression run URL
- Security review owner and date
- Operations owner and date
- Product/Partner Center owner and date
