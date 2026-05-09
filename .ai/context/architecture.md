# Orqentis Architecture (for AI agents)

> Source of truth: `docs/architecture.md` and `docs/spec.md` §4. This file is the
> *agent-friendly* summary.

## 1. Layers (top → bottom)

```
┌──────────────────────────────────────────────────────────────────┐
│ Fabric Portal (browser)                                          │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ Orqentis Frontend  (React 18 in Fabric iframe)                    │ │
│ │   pages/, components/, hooks/useFabricSdk, store/zustand     │ │
│ └────────────────────────┬─────────────────────────────────────┘ │
└──────────────────────────┼───────────────────────────────────────┘
                           │ HTTPS + Bearer Fabric token
┌──────────────────────────▼───────────────────────────────────────┐
│ Orqentis.Api  (Azure App Service P2v3, .NET 8)                        │
│   Controllers, Middleware (FabricAuth, Correlation, Tenant)      │
└──┬─────────────────┬─────────────────┬──────────────────────────┘
   │                 │                 │
   ▼                 ▼                 ▼
┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐
│Orqentis.Engine│  │ Orqentis.AI   │  │ Orqentis.Data │  │ Activator    │
│ Delta /  │  │ OpenAI / │  │ EF Core  │  │ Fabric REST  │
│ ODCS /   │  │ Claude   │  │ Postgres │  │ (REST out)   │
│ Eval     │  │          │  │          │  │              │
└────┬─────┘  └────┬─────┘  └────┬─────┘  └──────────────┘
     │             │             │
     ▼             ▼             ▼
┌────────────┐  ┌──────────┐  ┌──────────────┐
│ OneLake    │  │ Azure    │  │ PostgreSQL   │
│ Delta logs │  │ OpenAI / │  │ Flexible Srv │
│ (OBO)      │  │ Anthropic│  │              │
└────────────┘  └──────────┘  └──────────────┘
```

## 2. Allowed dependencies (enforced via `dotnet test` architectural fitness later)

```
Orqentis.Api      ──► Orqentis.Engine, Orqentis.AI, Orqentis.Data, Orqentis.Common
Orqentis.Engine   ──► Orqentis.Common               (Delta, Odcs, Evaluation are internal)
Orqentis.AI       ──► Orqentis.Common, Orqentis.Engine.Models  (only the models, never Engine impl)
Orqentis.Data     ──► Orqentis.Common
Orqentis.Tests/*  ──► the project under test + Orqentis.Common
```

`Orqentis.Common` (small): shared `Result<T>`, correlation context, ODCS DTOs.

**Forbidden:** `Orqentis.Engine` referencing `Orqentis.Data`. The engine is pure: it takes inputs
(parsed contract + token), returns outputs (`EnforcementResult`). Persistence is the API
layer's job.

## 3. Data flow: enforcement run (spec §4.2)

1. UI POSTs `/api/contracts/{id}/runs` with `{ }`.
2. `RunsController` validates token, resolves tenant, loads contract via `IContractStore`.
3. `RunsController` performs OBO exchange via `IOneLakeTokenBroker`.
4. `IEnforcementOrchestrator.RunAsync(contract, oneLakeToken, ct)` is called.
5. Orchestrator calls in order:
   `DeltaLogReader` → `SchemaExtractor` → `SchemaRuleEvaluator` →
   `QualityRuleEvaluator` (which uses Fabric SQL endpoint) → `FreshnessEvaluator`.
6. Aggregated `EnforcementResult` is returned.
7. API persists the `EnforcementRun` row + `result_json`.
8. Async tasks fire: AI breach scoring, Activator trigger if FAIL.
9. UI polls `GET /runs/{runId}` (or subscribes via SignalR if added later).

## 4. Auth model

- **All inbound API calls:** Entra ID Bearer token (Fabric-issued). Validated by `FabricAuthMiddleware`.
- **OneLake (data plane):** OBO token, scope `https://storage.azure.com/.default`.
- **Fabric REST (control plane):** OBO token, scope `https://api.fabric.microsoft.com/.default`.
- **Activator trigger:** OBO token (same Fabric REST scope).
- **Azure OpenAI:** Managed Identity of the App Service.
- **PostgreSQL:** Managed Identity (preferred) or Key Vault-stored connection string fallback.
- **Anthropic Claude:** API key from Key Vault (no MI option in 2026).

## 5. Multi-tenancy

Tenants are isolated by `tenant_id UUID FK` on every row, plus the `OrqentisDbContext` global
query filter:

```csharp
modelBuilder.Entity<Contract>().HasQueryFilter(c => c.TenantId == _tenantContext.CurrentTenantId);
```

`TenantResolutionMiddleware` reads the Entra `tid` claim and sets `_tenantContext.CurrentTenantId`
on a scoped service. **Never accept `tenant_id` from request bodies.** Always derive from token.

## 6. Failure modes & resilience

| Dependency | Failure | Behaviour |
|---|---|---|
| OneLake unreachable | `IOException` from `DeltaLogReader` | Run status `error`, message stored, no Activator fire |
| Postgres unreachable | EF `DbException` | API returns 503, retry-able |
| Azure OpenAI 429/timeout | Polly retry → fallback | Suggestion returns empty template; breach score `null` |
| Anthropic 5xx | Polly retry → fallback | Same as above |
| Activator API 5xx | Polly retry (5×) | Run completes successfully; alert dropped + logged at Error level |

All fallbacks are observable via App Insights custom events (`Orqentis_AI_Fallback`,
`Orqentis_Activator_Drop`, etc.).

## 7. Observability

- **Logs:** Serilog → Azure Log Analytics. JSON formatter. Structured properties:
  `CorrelationId`, `TenantId`, `ContractId`, `RunId`, `UserUpn`.
- **Metrics:** App Insights via `System.Diagnostics.Metrics`. Custom meters:
  `Orqentis.Enforcement` (`run_duration_ms`, `run_outcome`), `Orqentis.AI` (`call_latency_ms`,
  `fallback_count`).
- **Traces:** OpenTelemetry auto-instrumentation for ASP.NET Core, EF Core, HttpClient.
  Traces include the OBO exchange but never the token bytes.

## 8. Deployment topology

```
Azure subscription (Orqentis)
└── RG: rg-orqentis-{env}-aue
    ├── App Service Plan (Linux, P2v3 prod / B2 staging)
    │   └── App Service "orqentis-api-{env}"  (.NET 8)
    ├── Static Web App "orqentis-workload-{env}" (React build artifact)
    ├── PostgreSQL Flexible Server "orqentis-pg-{env}"  (PG 16)
    ├── Key Vault "kv-orqentis-{env}"
    ├── Azure OpenAI "oai-orqentis-{env}" (GPT-4o deployment)
    ├── Application Insights "appi-orqentis-{env}"
    └── Log Analytics Workspace "log-orqentis-{env}"
```

Region: **Australia East** for AU customers (data residency in spec §13).

Bicep modules under `infra/modules/` mirror this 1:1.
