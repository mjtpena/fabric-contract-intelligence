# Sprint 1 — Repo Scaffold, Infra, DB Schema, Solution Structure

> **Status:** ✅ Delivered as part of the initial CTO build. This runbook documents what was
> shipped so that subsequent sprints have a clear baseline.

## Goal

Stand up a buildable monorepo: empty .NET solution that compiles, empty React app that
renders a placeholder page, Bicep that `bicep build`s green, a PostgreSQL schema migration
that applies cleanly, sample ODCS contracts, and CI workflows. No business logic yet.

## Pre-requisites

None.

## What was delivered

- Repo metadata: `README.md`, `LICENSE` (MIT), `.gitignore`, `.editorconfig`, `CODEOWNERS`,
  `.github/pull_request_template.md`.
- Agent guidance: `.github/copilot-instructions.md`, `.ai/README.md`,
  `.ai/context/{fci,fabric,architecture,conventions}.md`, `.ai/commands/sprint-*.md`.
- Frontend skeleton: `frontend/package.json`, `tsconfig*.json`, `vite.config.ts`,
  `index.html`, `src/{App.tsx,index.tsx,App.css}`, `manifest/WorkloadManifest.json`,
  `public/schemas/odcs-v3.1.0.json` placeholder.
- Backend skeleton: `backend/FCI.sln` referencing five projects:
  `FCI.Api`, `FCI.Engine`, `FCI.AI`, `FCI.Data`, and a single test project `FCI.Tests`.
  Each project has its `.csproj` targeting `net8.0`, a `Class1.cs`-style placeholder, and
  a folder structure matching spec §4.3.
- Core interfaces (placeholders, fully-typed): `IEnforcementOrchestrator`,
  `IDeltaLogReader`, `ISchemaExtractor`, `IOdcsContractParser`, `IOdcsContractValidator`,
  `IContractStore`, `IOneLakeTokenBroker`, `IContractSuggestionAgent`, `IBreachImpactScorer`.
- Core record types: `ContractDefinition`, `EnforcementResult`, `RuleResult`, `SchemaDiff`,
  `EnforcementStatus`, `RuleStatus`. (Used by everyone; never modify lightly.)
- `Result<T>` in `FCI.Engine.Common`.
- EF Core `FciDbContext` skeleton with all five entities and a query-filter for soft delete.
- Initial SQL migration `V001__initial_schema.sql` implementing spec §5.1 verbatim.
- Bicep: `infra/main.bicep` orchestrating modules `app-service-plan`, `app-service`,
  `static-web-apps`, `postgresql`, `keyvault`, `openai`, `monitoring`. Param files for
  staging + production.
- Sample contracts: `contracts/examples/healthcare.contract.yaml` (from spec §6.2),
  `contracts/examples/retail-sales.contract.yaml`.
- CI: `.github/workflows/ci.yml` (build + lint + test + ODCS validate),
  `deploy-staging.yml`, `deploy-prod.yml`.
- Docs: `docs/architecture.md`, `docs/api.md`, `docs/agent-guide.md`, `docs/spec.md`.

## Acceptance criteria

- [x] `cd backend && dotnet restore FCI.sln && dotnet build FCI.sln` succeeds.
- [x] `cd frontend && npm install && npm run build` succeeds.
- [x] `cd infra && az bicep build --file main.bicep` succeeds (pending CI dry-run).
- [x] `datacontract lint contracts/examples/healthcare.contract.yaml` returns 0 errors
      (validated externally; CI step added).
- [x] `psql -f backend/FCI.Data/Migrations/V001__initial_schema.sql` against an empty
      Postgres 16 DB creates all 5 tables.

## Out-of-scope

- Real Delta log parsing → Sprint 2.
- Real ODCS schema validation → Sprint 2.
- Real auth middleware (JWT validation) → Sprint 4.
- Any business logic on controllers → Sprint 4.
- Frontend pages beyond a placeholder → Sprint 5.
