# Orqentis — Architecture

This document is the long-form architecture reference. It expands `.ai/context/architecture.md`
(which is the short, agent-friendly version). When the two diverge, **this document wins**
for humans; **`.ai/context/architecture.md` wins for AI agents** (until both are reconciled).

## 1. Goals & non-goals

**Goals**

- Native Fabric workload UX: lives inside the portal, uses Fluent UI v9, indistinguishable
  from a first-party item type.
- ODCS v3.1.0 fidelity. We faithfully implement the standard; we do not extend it.
- Enforce contracts at the **Delta transaction log** layer (no full table scans for schema
  / freshness). Quality rules go through aggregated SQL — no row-level egress.
- Multi-tenant by design. Tenant boundary = Entra `tid`, enforced via EF query filters and
  a tenant-scoped DI service.
- Enterprise-grade: 99.5 % SLA, OpenTelemetry traces, Key-Vault-backed secrets, Managed
  Identity wherever possible.
- Developer-agent-friendly: every architectural decision is captured in `.ai/context/`,
  `docs/`, or an ADR so coding agents can extend the system without re-deriving it.

**Non-goals**

- Becoming a data catalog (Purview's job).
- Becoming a data quality monitoring platform (Great Expectations / Monte Carlo's job).
- Becoming a pipeline orchestrator (Fabric Data Pipelines' job).
- Supporting non-Delta storage formats. Iceberg / Hudi are out of scope.

## 2. Layered architecture

See the ASCII diagram in `.ai/context/architecture.md` §1. The full enumeration of
components and technologies lives in spec §4.1 (Table 8 of the spec).

The five backend projects:

| Project | Responsibility | Notes |
|---|---|---|
| `Orqentis.Api` | ASP.NET Core Web API. Controllers, middleware, DI wiring. | Only project that knows about HTTP. |
| `Orqentis.Engine` | Pure enforcement logic. Delta log reading, ODCS parsing, rule evaluation. | No DB, no HTTP frameworks. Stateless. |
| `Orqentis.AI` | LLM integrations and prompt assets. | Polly + provider abstraction. |
| `Orqentis.Data` | EF Core + PostgreSQL. Entities, migrations, repository pattern. | No business logic. |
| `Orqentis.Tests` | xUnit + Moq + FluentAssertions. Subdivided by project under test. | Includes `Orqentis.Integration.Tests`. |

Forbidden cycles: `Orqentis.Engine` must never reference `Orqentis.Data`. The Engine is a black box
that takes inputs and returns outputs.

## 3. Data flow — enforcement run

Verbatim from spec §4.2:

1. User triggers enforcement (manual or scheduled) via Orqentis workload item UI.
2. Frontend calls `POST /api/contracts/{id}/runs`.
3. API authenticates and performs OBO exchange to OneLake.
4. `IEnforcementOrchestrator.RunAsync` reads the Delta transaction log (`_delta_log/*.json`).
5. Engine compares live schema against ODCS contract.
6. Engine evaluates quality rules via Fabric SQL endpoint.
7. Result persisted to `enforcement_runs.result_json`.
8. If FAIL/WARN and policy bound to Activator: API triggers Activator rule.
9. Result surfaces in UI with per-rule breakdown.

Steps 4–6 are pure (Engine), 7–8 are side-effects (API), 9 is the UI.

## 4. Authentication & token broker

| Surface | Token | Scope | Lifetime |
|---|---|---|---|
| Inbound API call | Fabric-issued Entra JWT | App audience | passthrough |
| OneLake (data plane) | OBO exchange | `https://storage.azure.com/.default` | in-memory only |
| Fabric REST (control plane) | OBO exchange | `https://api.fabric.microsoft.com/.default` | in-memory only |
| Fabric SQL/Warehouse (data plane) | OBO exchange | `https://database.windows.net/.default` | in-memory only |
| Eventhouse/KQL (data plane) | OBO exchange | `https://kusto.kusto.windows.net/.default` | in-memory only |
| Activator trigger | OBO exchange | Fabric REST scope | in-memory only |
| Azure OpenAI | Managed Identity | data plane MI | rotated by Azure |
| Anthropic Claude | API key from KV | n/a | rotated quarterly |
| PostgreSQL | Managed Identity (preferred) | DB MI | rotated by Azure |

`OnBehalfOfCredential` from `Azure.Identity` performs the exchange. We never persist a
token — not in the DB, not in cache, not in logs. Tokens are passed as `string` parameters
between in-process services and dropped after each request.

## 5. Multi-tenancy

- `tenants.fabric_tenant_id` = Entra `tid` claim. `UNIQUE NOT NULL`.
- All other tables carry `tenant_id UUID FK`.
- `OrqentisDbContext` applies a global query filter
  `HasQueryFilter(x => x.TenantId == _tenantContext.CurrentTenantId)`.
- `TenantResolutionMiddleware` populates `_tenantContext` from the JWT `tid`.
- Tenant id is **never** taken from the request body.
- Cross-tenant data joins are forbidden in normal code paths; admin endpoints (Orqentis
  internal) bypass the filter via `IgnoreQueryFilters()` and require a hard-coded admin
  Entra group.

## 6. Storage & schema

PostgreSQL Flexible Server, version 16. Schema: `public`. All tables follow the spec §5.1
shape (snake_case, UUID PKs, `TIMESTAMPTZ`, soft-delete via `deleted_at`).

Migrations are **append-only SQL files** in `backend/Orqentis.Data/Migrations/V0NN__name.sql`,
applied via [DbUp](https://dbup.readthedocs.io/) at API startup (idempotent). EF Core is
used only as a query/save runtime; we do not let EF generate migrations because we want
the SQL under explicit human review.

## 7. Observability

- **Logs:** Serilog → Azure Log Analytics. Structured JSON. Always include `CorrelationId`,
  `TenantId`, `UserUpn`, plus domain-specific (`ContractId`, `RunId`).
- **Metrics:** `System.Diagnostics.Metrics` → App Insights.
  - `Orqentis.Enforcement.run_duration_ms` (histogram, tag: outcome)
  - `Orqentis.Enforcement.run_outcome_total` (counter, tag: status)
  - `Orqentis.AI.call_latency_ms` (histogram, tag: provider, feature)
  - `Orqentis.AI.fallback_total` (counter, tag: from, to)
  - `Orqentis.Activator.dispatch_latency_ms` (histogram)
- **Traces:** OpenTelemetry auto-instrumentation for ASP.NET Core, EF Core, HttpClient.
  We never log request bodies that may contain ODCS YAML with sensitive table names; only
  metadata (length, hash) at `Information`. Full bodies at `Debug`, off in prod.

## 8. Resilience

| Failure | Detection | Behaviour |
|---|---|---|
| OneLake 401/403 | OBO scope mismatch | 502 to caller; `Orqentis_OneLake_Auth_Failed` event |
| OneLake 5xx / timeout | Polly retry 3× | If still failing → run status `error` |
| Postgres unreachable | EF `DbException` | Health check fails; orchestrator returns 503 |
| Azure OpenAI 429 | Polly retry exponential | Eventually fall back to Claude |
| Anthropic 5xx | Polly retry | Fall back to empty template / null score |
| Activator 5xx | Polly 5× retry | Drop alert; emit `Orqentis_Activator_Drop`; run still ok |

## 9. Performance budgets (spec §13)

| Operation | P95 budget |
|---|---|
| Enforcement run (schema + freshness only, ≤ 1 TB) | 60 s |
| Enforcement run (with quality rules) | 120 s |
| API non-AI endpoint | 500 ms |
| AI contract suggestion | 15 s |

## 10. ADRs (Architecture Decision Records)

We use lightweight ADRs in `docs/adr/NNNN-title.md`. Initial ADRs already in scope:

- `ADR-0001` Use ODCS v3.1.0 (no extensions).
- `ADR-0002` Read-only Delta log access; no Spark required.
- `ADR-0003` PostgreSQL over Azure SQL (cost + JSONB ergonomics).
- `ADR-0004` `Result<T>` over exceptions for expected engine failures.
- `ADR-0005` Hangfire over Azure Functions for scheduled jobs.
- `ADR-0006` Azure OpenAI primary, Anthropic fallback (resilience + capacity).

These will be filled in by the engineers in their respective sprints.
