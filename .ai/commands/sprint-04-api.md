# Sprint 4 — API: Controllers, FabricAuthMiddleware, OBO Exchange

## Goal

Stand up the public REST API at `https://api.fabriccontract.io/v1`. Wire up Entra ID JWT
validation, OBO token exchange, the `IEnforcementOrchestrator` from Sprints 2/3, and
`IContractStore` against PostgreSQL via EF Core.

**Spec sections:** §7 (REST API), §4.2, §16.1 (rules), §16.2 Sprint 4.
**FR coverage:** FR-002, FR-003, FR-007, FR-009, FR-010 (tier gating).

## Pre-requisites

Sprints 2, 3 merged. `Orqentis.Data` migrations applied to a dev Postgres (Sprint 1 deliverable).

## Files to create / modify

### `backend/Orqentis.Api/Auth/`

- `FabricAuthMiddleware.cs` — validates Entra Bearer JWT (issuer, audience, signature).
- `IOneLakeTokenBroker.cs` + `OneLakeTokenBroker.cs` — performs OBO via `OnBehalfOfCredential`.
- `TenantContext.cs` (scoped) + `TenantResolutionMiddleware.cs` — derives `TenantId` from `tid`.
- `EnterpriseAttribute.cs` — action filter that 402s Community tenants for paid features.
- `CorrelationMiddleware.cs` — generates / propagates `X-Correlation-Id`.

### `backend/Orqentis.Api/Controllers/`

- `ContractsController.cs` — endpoints from spec §7 table:
  - `GET    /contracts`
  - `POST   /contracts`           (modes: `direct`, `ai_generate` — AI mode 501s in this sprint)
  - `GET    /contracts/{id}`
  - `PUT    /contracts/{id}`
  - `DELETE /contracts/{id}`
  - `GET    /contracts/{id}/versions`
  - `GET    /contracts/{id}/versions/{version}`
- `RunsController.cs`:
  - `POST /contracts/{id}/runs` (manual trigger; uses orchestrator)
  - `GET  /contracts/{id}/runs`
  - `GET  /runs/{runId}`
- `WorkspacesController.cs` (read-only Fabric REST passthrough):
  - `GET /workspaces`
  - `GET /workspaces/{id}/tables`
- `HealthController.cs` — `/health/live`, `/health/ready` (no auth).

### `backend/Orqentis.Api/Services/`

- `IContractStore.cs` + `ContractStore.cs` — EF-backed CRUD + version snapshotting.
  Every `PUT` creates a `contract_versions` row.

### `backend/Orqentis.Api/Program.cs`

Wire up:

- Serilog (Console + Application Insights)
- Authentication: `AddAuthentication("Bearer").AddJwtBearer(...)`
- Authorization (default policy: authenticated user)
- Middleware order: `UseSerilogRequestLogging` → `UseCorrelation` → `UseAuthentication`
  → `UseAuthorization` → `UseTenantResolution` → `MapControllers`
- DI: `services.AddOrqentisEngine()`, `AddOrqentisData(connectionString)`, `AddOrqentisAuth(...)`
- CORS: only `https://app.fabric.microsoft.com` and the Static Web App origin
- Health checks for Postgres + Key Vault
- ProblemDetails (RFC 7807) for all errors

### Tests (`backend/Orqentis.Tests/Orqentis.Api.Tests/`)

- `Controllers/ContractsControllerTests.cs` — uses `WebApplicationFactory<Program>` +
  Testcontainers Postgres.
- `Auth/FabricAuthMiddlewareTests.cs` — fake Entra issuer via `Microsoft.IdentityModel.TestUtils`.
- `Auth/EnterpriseAttributeTests.cs` — Community tenant 402; Enterprise tenant 200.
- `Controllers/RunsControllerTests.cs` — orchestrator mocked; verifies row persistence + result_json.

## DTOs (mirror to TS in Sprint 5)

Place in `backend/Orqentis.Api/Dtos/`. Records, all `required`, ISO-8601 timestamps as `string`.

```csharp
public sealed record ContractSummaryDto(
    Guid Id, string Name, string Status, int Version,
    string? LastRunStatus, DateTimeOffset? LastRunAt);

public sealed record ContractDto(
    Guid Id, string Name, string? Description, string Status,
    int Version, string OdcsYaml, string OwnerEmail,
    string TargetTablePath, Guid TargetLakehouseId,
    bool AiSuggested, string CreatedBy, DateTimeOffset CreatedAt, DateTimeOffset UpdatedAt);

public sealed record CreateContractRequest(
    string Mode,                 // "direct" | "ai_generate"
    string Name, string? Description, string OwnerEmail,
    string TargetTablePath, Guid TargetLakehouseId,
    string? OdcsYaml,            // direct mode
    string? AiHints);            // ai_generate mode (502 in Sprint 4; implemented Sprint 8)
```

## Acceptance criteria

- [ ] Every endpoint in spec §7 (table 16) exists and returns the documented status code.
- [ ] `ContractsController.PUT` creates a new `contract_versions` row on every save.
- [ ] `RunsController.POST` invokes `IEnforcementOrchestrator.RunAsync`, persists the run,
      and returns 202 with the run id.
- [ ] `EnterpriseAttribute` correctly 402s Community tenants on AI endpoints
      (even though they're not implemented yet).
- [ ] All responses include `X-Correlation-Id`.
- [ ] FR-009: integration test proves no service principal secret is used for OneLake;
      OBO exchange happens with the Bearer token.
- [ ] OpenAPI doc generated at `/swagger/v1/swagger.json` with all endpoints.

## Out-of-scope

- AI-mode contract creation → Sprint 8.
- Scheduled runs (Hangfire) → Sprint 7.
- Activator integration → Sprint 9.
- Reports → Sprint 9+.
