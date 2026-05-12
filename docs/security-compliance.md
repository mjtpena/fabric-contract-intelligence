# Orqentis Security and Compliance Readiness

This document records the public-launch security posture for the Orqentis Fabric workload.

## Trust boundaries

| Boundary | Control |
|---|---|
| Fabric portal to workload iframe | Fabric workload client SDK, CSP, and frame ancestors restricted to Fabric/Power BI hosts |
| Frontend to API | Entra token with Orqentis API scope and `X-Correlation-Id` propagation |
| API to OneLake/Fabric | On-Behalf-Of delegated token only; application identity is forbidden for data plane reads |
| API to PostgreSQL | Managed app configuration and Key Vault-backed secrets |
| API to AI providers | Timeout, retry, provider fallback, and no secret logging |
| API to Activator/webhooks | Structured logging, correlation ID, and policy-driven routing |

## Data handling

- Orqentis stores contract metadata, ODCS YAML versions, run results, policy configuration, and audit metadata.
- Orqentis reads Delta table metadata and sampled rule metrics from OneLake using the calling user's delegated token.
- Orqentis does not require customer data plane access through an application credential.
- AI features send only the minimum prompt context needed for contract suggestion, scoring, remediation, or natural-language query.
- Logs must not contain secrets, bearer tokens, connection strings, or raw customer table data.

## Authentication and authorization

- Microsoft Entra ID is the identity provider.
- API access requires bearer tokens for the configured Orqentis app scope.
- OneLake and Fabric REST access use OBO with the signed-in user's delegated permissions.
- Tenant and workspace authorization must be enforced on every contract, run, policy, federation, and report query.
- Soft delete is required for persisted entities; hard deletes are not used for business records.

## Secure engineering gates

| Gate | Enforcement |
|---|---|
| ODCS schema validation | `OdcsContractValidator` blocks invalid YAML from becoming active |
| Correlation IDs | Middleware and clients propagate `X-Correlation-Id` |
| Engine/AI test coverage | CI enforces at least 85% line coverage |
| Live Fabric regression | Manual GitHub workflow validates OBO/OneLake behavior with real credentials |
| Public readiness artifacts | `scripts/Test-PublicReadiness.ps1` validates docs, links, and manifest support URLs |

## Vulnerability management

Before public submission and before every public release:

1. Run `dotnet list backend/Orqentis.sln package --vulnerable --include-transitive`.
2. Run `npm audit --omit=dev` from `frontend`.
3. Review GitHub Dependabot/security alerts.
4. Fix critical and high findings before public rollout.
5. Document accepted risk for any deferred medium/low finding.

## Security contact

Security issues should be reported through `https://fabric.orqentis.com/legal/security.html`.
Do not include secrets or customer data in public issue trackers.
