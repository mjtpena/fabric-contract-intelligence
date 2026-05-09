# FCI Coding Conventions

## Naming

| Element | Convention | Example |
|---|---|---|
| C# class | `PascalCase`, no `I` prefix on impls | `EnforcementOrchestrator` |
| C# interface | `PascalCase` with `I` | `IEnforcementOrchestrator` |
| C# private field | `_camelCase` | `_logger` |
| C# constant | `PascalCase` | `MaxRunDuration` |
| C# async method | suffix `Async` | `RunAsync` |
| TS / React component | `PascalCase` | `ContractEditorPage` |
| TS hook | `useCamelCase` | `useFabricSdk` |
| TS variable / fn | `camelCase` | `loadContract` |
| TS type / interface | `PascalCase` | `ContractDto` |
| DB table | `snake_case` plural | `enforcement_runs` |
| DB column | `snake_case` | `delta_snapshot_version` |
| API route | `kebab-case`, plural nouns | `/contracts/{id}/runs` |
| Bicep module | `kebab-case.bicep` | `app-service.bicep` |
| Sample contract | `kebab-case.contract.yaml` | `healthcare.contract.yaml` |
| Sprint runbook | `sprint-NN-kebab-name.md` | `sprint-03-engine-evaluators.md` |

## C# style

- Implicit usings + nullable reference types **on** for every project.
- File-scoped namespaces.
- `record` for DTOs; `class` for EF entities and stateful services.
- `required` modifier on every non-nullable record property.
- `sealed class` by default; only `unsealed` when sub-classing is part of the contract.
- Prefer expression-bodied members for one-liners.
- Avoid `var` for primitives; use it for obvious types from constructors.
- `Result<T>` (in `FCI.Engine.Common`) for expected failures. Throw only for programmer error.
- All async methods accept `CancellationToken ct = default` as the last parameter.

## Logging (Serilog)

```csharp
_logger.LogInformation(
    "Run-Start ContractId={ContractId} TenantId={TenantId} Trigger={Trigger}",
    contractId, tenantId, trigger);
```

- Verb-Noun event names (`Run-Start`, `Contract-Activated`, `AI-Fallback`).
- Structured properties only — never `$"interpolated {strings}"`.
- Levels: `Trace` (verbose Delta log details), `Debug` (rule evaluation steps),
  `Information` (lifecycle events), `Warning` (recoverable, e.g. AI fallback),
  `Error` (Run status `error`, request 5xx), `Critical` (process-fatal).

## Error handling

- API: every controller wrapped in a `ProblemDetails`-emitting exception filter. RFC 7807 always.
- Engine: returns `Result<EnforcementResult>` — never throws on rule failures.
- Frontend: API errors surfaced via `callNotificationOpen` + the global Fluent UI `Toaster`.

## Testing

- xUnit + Moq + FluentAssertions. Naming: `MethodName_Condition_ExpectedResult`.
  e.g. `RunAsync_LiveSchemaMissingColumn_ReturnsFailedSchemaRule`.
- One Arrange/Act/Assert block per test, separated by blank lines and `// Arrange` etc. comments.
- Test fixtures under `backend/FCI.Tests/Fixtures/`. Sample Delta logs as JSON files in
  `backend/FCI.Tests/Fixtures/delta/`. Sample contracts in `backend/FCI.Tests/Fixtures/contracts/`.
- Coverage thresholds enforced in CI: `FCI.Engine` ≥ 85 %, `FCI.AI` ≥ 85 %, others ≥ 60 %.

## React / TS style

- ESLint + Prettier (configs in `frontend/`). CI fails on lint warnings.
- Components are functions with a typed `Props` interface above them.
- No `any`. Use `unknown` + narrowing if the type is genuinely dynamic.
- One Zustand store per domain, in `frontend/src/store/{domain}Store.ts`. Selectors not whole-store reads.
- API clients in `frontend/src/api/{domain}Client.ts` return strongly typed promises.
- Models in `frontend/src/models/` mirror backend DTOs **1:1** — names and shapes match.
  When the backend changes, the frontend must regenerate (manually for now; OpenAPI codegen later).

## Git & PR

- Branch naming: `feat/sprint-NN-short-slug`, `fix/short-slug`, `chore/short-slug`.
- Conventional Commits (`feat: …`, `fix: …`, `chore: …`, `docs: …`, `test: …`, `refactor: …`).
- One sprint = one PR ideally; multi-PR sprints must each link the runbook.
- PR title format: `[sprint-NN] Short title`.

## Documentation

- Public C# methods: XML docs (`<summary>`, `<param>`, `<returns>`).
- Exported TS types: TSDoc on every property.
- Each new top-level folder gets a `README.md` explaining its purpose.

## Security

- No `eval`, no `Function(...)`, no dynamic SQL string concat. Always parameterised.
- Secrets only via `IConfiguration` (.NET) + Key Vault, or `import.meta.env.VITE_*` (frontend).
  No secrets ever begin with `VITE_` (those are bundled into the client). The frontend has
  *zero* secrets — it gets all credentials from the Fabric SDK at runtime.
- HTTPS only; HSTS enabled in `Program.cs`.
- CORS in `Program.cs` allows only `https://app.fabric.microsoft.com` and the Static Web App origin.
