# Orqentis — Agent Guide

> The single starting point for any AI coding agent (or human contributor) working on Orqentis.
> This document is a long-form companion to `.github/copilot-instructions.md` and the
> sprint runbooks in `.ai/commands/`.

## 1. Read these in order

1. [`README.md`](../README.md) — what Orqentis is, why it exists.
2. [`.github/copilot-instructions.md`](../.github/copilot-instructions.md) — the rules.
3. [`.ai/context/orqentis.md`](../.ai/context/orqentis.md) — domain language.
4. [`.ai/context/fabric.md`](../.ai/context/fabric.md) — Fabric platform model.
5. [`.ai/context/architecture.md`](../.ai/context/architecture.md) — agent-friendly arch.
6. [`.ai/context/conventions.md`](../.ai/context/conventions.md) — code style.
7. [`docs/architecture.md`](architecture.md) — long-form arch reference.
8. [`docs/api.md`](api.md) — REST API reference.
9. [`docs/spec.md`](spec.md) — the canonical product specification.

Then open the runbook for the sprint you're in: `.ai/commands/sprint-NN-*.md`.

## 2. Local development

```powershell
# Backend
cd backend
dotnet restore Orqentis.sln
dotnet build Orqentis.sln
dotnet test Orqentis.sln

# Frontend
cd ../frontend
npm install
npm run dev          # Vite dev server on http://localhost:5173
npm run lint
npm run test         # Vitest

# Database (one-shot; assumes local Postgres 16 on :5432 with db `orqentis`)
psql -U postgres -d orqentis -f ../backend/Orqentis.Data/Migrations/V001__initial_schema.sql
```

Copy `frontend/.env.template` → `frontend/.env.dev` and `backend/Orqentis.Api/appsettings.template.json`
→ `backend/Orqentis.Api/appsettings.Development.json`. Fill in the placeholder values from your
own dev Entra app + Fabric tenant. Both files are gitignored.

## 3. Sprint plan (recommended build order)

Verbatim from spec §16.2. Sprint 1 is the deliverable of the initial CTO build; everything
else is open work.

| Sprint | Weeks | Work units | Depends on |
|---|---|---|---|
| 1 | 1–2 | Repo scaffold, Bicep, PG schema + EF migrations, .NET solution structure | — |
| 2 | 3–4 | DeltaLogReader, SchemaExtractor, OdcsContractParser, OdcsContractValidator | Sprint 1 |
| 3 | 5–6 | SchemaRuleEvaluator, FreshnessEvaluator, EnforcementOrchestrator + tests | Sprint 2 |
| 4 | 7–8 | ContractsController, RunsController, FabricAuthMiddleware, OBO exchange | 1, 3 |
| 5 | 9–10 | Fabric manifest, ContractListPage, ContractEditorPage (Monaco + ODCS IntelliSense) | 4 |
| 6 | 11–12 | EnforcementRunPage, WorkspaceSettingsPage, integration tests, workload publishing | 5 |
| 7 | 13–15 | QualityRuleEvaluator (null_rate, uniqueness, regex), scheduled enforcement | 3, 6 |
| 8 | 16–18 | ContractSuggestionAgent, BreachImpactScorer, AISuggestPage | 4, 7 |
| 9 | 19–20 | Fabric Activator integration, PolicyEditorPage, AlertsDashboard | 7 |

Each sprint has a runbook in `.ai/commands/`. **Do not freelance** — execute the runbook.

## 4. The non-negotiable rules

(Mirrors `.github/copilot-instructions.md` §3 and spec §16.1.)

1. Read the spec section first. Cite it in your PR.
2. No secrets in code, ever. Key Vault + env vars only.
3. Tests alongside implementation. ≥85 % coverage on `Orqentis.Engine` and `Orqentis.AI`.
4. Never bypass `OdcsContractValidator` for active contracts.
5. AI calls have 15 s timeout + graceful fallback.
6. OneLake access is OBO-only. Never an app credential.
7. Every response includes `X-Correlation-Id`.
8. Soft delete only — never `DELETE FROM`.
9. UTC timestamps; never `DateTime` without explicit `Kind`.

## 5. Common tasks — quick reference

### Add a new EF entity
1. Create `backend/Orqentis.Data/Entities/{Name}.cs`.
2. Add `DbSet<{Name}> {Names}` to `OrqentisDbContext`.
3. Add a new SQL migration `V0NN__add_{name}.sql`.
4. Add a soft-delete query filter and tenant filter in `OnModelCreating`.
5. Add a repository or store class in `Orqentis.Api/Services/`.

### Add a new API endpoint
1. Add the action to the relevant controller (or create a new one).
2. Add request/response DTOs to `backend/Orqentis.Api/Dtos/`.
3. Mirror to `frontend/src/models/` and `frontend/src/api/{domain}Client.ts`.
4. Add controller-level tests in `backend/Orqentis.Tests/Orqentis.Api.Tests/Controllers/`.
5. Update `docs/api.md` if the endpoint is new (not in spec §7).

### Add a new quality rule type
1. Define the rule shape in `ContractDefinition.Quality`.
2. Extend `RuleSqlBuilder` to emit the SQL.
3. Extend `QualityRuleEvaluator` to interpret the result.
4. Add a tests fixture to `backend/Orqentis.Tests/Fixtures/quality/`.
5. Document the rule in `docs/spec.md` §9.4 (in a follow-up doc PR).

## 6. Workload publishing runbook (Sprint 6 deliverable)

1. Build and package the workload from the repo root:

   ```powershell
   .\scripts\Publish-Workload.ps1 `
     -FrontendUrl https://fabric.orqentis.com `
     -FrontendAppId <entra-app-guid>
   ```

   This script runs `npm run build`, builds the Fabric XML/NuGet manifest package from
   `frontend/manifest/`, and emits `frontend/dist/manifest/Org.Orqentis.{version}.nupkg`.
   `Org.Orqentis` is the private-tenant workload ID used for self-service publishing without a
   Partner Center registration.
2. Sign in to the Fabric admin portal as a tenant admin.
3. Navigate to **Workload Hub** → **Self-Service Workload Publishing**.
4. Upload the `.nupkg`. Verify item types appear: `Contract`, `ContractPolicy`,
   `ContractReport`.
5. After the upload succeeds, optionally automate assignment from the repo root:

   ```powershell
   .\scripts\Publish-Workload.ps1 -SkipBuild -FrontendUrl https://fabric.orqentis.com -FrontendAppId <entra-app-guid> -AssignType Tenant
   .\scripts\Publish-Workload.ps1 -SkipBuild -FrontendUrl https://fabric.orqentis.com -FrontendAppId <entra-app-guid> -AssignType Capacity -AssignTargetId <capacity-guid>
   .\scripts\Publish-Workload.ps1 -SkipBuild -FrontendUrl https://fabric.orqentis.com -FrontendAppId <entra-app-guid> -AssignType Workspace -AssignTargetId <workspace-guid>
   ```

   Assignment uses the Fabric Admin REST API via the active Azure CLI session. The upload itself
   is still portal-only; the script will fail fast with a clear message if the workload is not yet
   visible in `GET /v1/admin/workloads`.
6. Smoke test: open the workspace → New Item → choose `Contract` → editor renders, then open a
   `Contract Report` item and confirm the run page loads.
7. Live integration tests require these secrets/environment variables before running
   `dotnet test backend\Orqentis.Tests\Orqentis.Integration.Tests\Orqentis.Integration.Tests.csproj`:
   `FABRIC_TEST_TENANT_ID`, `FABRIC_TEST_WORKSPACE_ID`, `FABRIC_TEST_CAPACITY_ID`,
   `FABRIC_TEST_API_BASE_URL`, `FABRIC_TEST_BEARER_TOKEN`,
   `FABRIC_TEST_PASSED_CONTRACT_ID`, and `FABRIC_TEST_DRIFTED_CONTRACT_ID`.

## 7. PR checklist (full version is in `.github/pull_request_template.md`)

- Title: `[sprint-NN] Short title`
- Branch: `feat/sprint-NN-short-slug`
- Description: link to runbook + spec sections + FR-IDs.
- All checks in the PR template ticked.
- Coverage delta non-negative on touched projects.

## 8. When you don't know what to do

Stop. Open `.ai/context/conventions.md`. Find the closest existing pattern. If still
unsure, **say so** — leave a comment in the PR description and ping `@orqentis/orqentis-core`.
Do not invent a new architectural pattern silently.
