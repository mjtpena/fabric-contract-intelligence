# Orqentis

> Data contracts for Fabric data products. Native to Microsoft Fabric.

[![CI](https://github.com/mjtpena/fabric-contract-intelligence/actions/workflows/ci.yml/badge.svg)](./.github/workflows/ci.yml)

Orqentis is a native Microsoft Fabric ISV workload that brings **ODCS v3.1.0**-compliant data
contract definition, version control, enforcement, and AI-powered suggestions to the Fabric
platform. Contracts can bind to Lakehouses, Warehouses, Eventhouse/KQL databases, Semantic
Models, and Fabric SQL databases. Lakehouse/Delta enforcement is the first fully executable
target; the shared target model keeps the contract workflow Fabric-wide.

## AI value proposition

Orqentis uses AI to make Fabric governance operational, not just conversational. The angle for
customers and investors is a governed feedback loop:

| AI capability | Customer outcome |
|---|---|
| Contract co-author | Data teams start from generated ODCS drafts instead of blank YAML, reducing time-to-first-contract. |
| Breach impact scorer | Failures become explainable risk signals ranked by downstream business impact. |
| Remediation advisor | Producers receive concrete next actions for schema, freshness, and quality breaches. |
| Natural-language governance | Platform owners can ask who owns a data product, what changed, and which contracts are failing without reading YAML or logs. |

This positions Orqentis as the **AI control plane for trusted Fabric data products**: contract
authoring, enforcement evidence, risk explanation, and remediation workflow in one native Fabric
experience.

## Tiers

| | **Community** (free) | **Enterprise** (AUD $299/workspace/mo) |
|---|---|---|
| Workspaces | 1 | Unlimited |
| Contracts | 20 | Unlimited |
| Manual enforcement | ✅ | ✅ |
| Scheduled enforcement | ❌ | ✅ |
| AI contract suggestion | ❌ | ✅ |
| Activator alerting | ❌ | ✅ |
| Cross-workspace federation | ❌ | ✅ |
| Audit reports (PDF) | ❌ | ✅ |
| Purview integration | ❌ | ✅ |

See `docs/spec.md` §3.2 for the full matrix.

## Architecture (one-paragraph summary)

A React 18 / Fluent UI v9 micro-frontend hosted inside the Fabric portal iframe via the
Fabric Extensibility SDK, talking to a .NET 8 API in Azure App Service. The
**Orqentis Enforcement Engine** reads OneLake Delta transaction logs using OBO-delegated tokens,
diffs live schema against ODCS contracts, evaluates quality + freshness rules, and persists
results to PostgreSQL. Contract metadata now targets Fabric data products beyond Lakehouse so
Warehouse, Eventhouse/KQL, Semantic Model, and Fabric SQL validation adapters can use the same
binding model. AI features (contract suggestion, breach scoring, NL query) are
brokered via Azure OpenAI with an Anthropic Claude fallback. Breach alerts fire through
**Fabric Activator**.

```
Fabric Portal (iframe)
  └── React frontend ─────────────────► Orqentis.Api (App Service)
                                         ├── Orqentis.Engine ──► OneLake Delta tables (OBO)
                                         ├── Orqentis.AI ─────► Azure OpenAI / Claude
                                         ├── Orqentis.Data ───► PostgreSQL
                                         └── Activator ──► Fabric Activator
```

Full diagram + ADRs: [`docs/architecture.md`](docs/architecture.md).

## Repository layout

```
fabric-contract-intelligence/
├── .ai/                    AI agent context + per-sprint runbooks
├── .github/                Copilot instructions, workflows, templates
├── frontend/               React 18 + Vite + Fluent UI v9
├── backend/                .NET 8 solution
│   ├── Orqentis.Api/            ASP.NET Core Web API
│   ├── Orqentis.Engine/         Enforcement Engine class library
│   ├── Orqentis.AI/             AI Agent class library
│   ├── Orqentis.Data/           EF Core + PostgreSQL
│   └── Orqentis.Tests/          xUnit test projects
├── infra/                  Azure Bicep IaC
├── contracts/examples/     Sample ODCS v3.1.0 contracts
└── docs/                   Architecture, API, agent guide, full spec
```

## Quick start (developers)

> **Prerequisites:** Node.js 20+, .NET 8 SDK, PowerShell 7, Azure CLI, a Fabric tenant
> with workspace + capacity, and an Entra app registration.

```powershell
# 1. Install frontend deps
cd frontend; npm install

# 2. Restore backend
cd ..\backend; dotnet restore Orqentis.sln

# 3. Apply DB migrations (requires local PostgreSQL or container)
dotnet ef database update --project Orqentis.Data --startup-project Orqentis.Api

# 4. Run frontend (in one shell)
cd ..\frontend; npm run dev

# 5. Run backend (in another shell)
cd ..\backend\Orqentis.Api; dotnet run
```

The Fabric workload manifest (`frontend/manifest/WorkloadManifest.json`) is published to a
Fabric tenant via the Self-Service Workload Publishing flow — see
[`docs/agent-guide.md`](docs/agent-guide.md) §6 for the publish runbook.

## For AI coding agents

**READ FIRST:** [`.github/copilot-instructions.md`](.github/copilot-instructions.md). Then,
before touching any code, open the relevant sprint runbook in [`.ai/commands/`](.ai/commands).
The build order, file paths, interfaces, and acceptance criteria are all pre-specified.

**Core rules** (full list in `docs/agent-guide.md` §16.1):

1. Never hardcode connection strings, API keys, or tenant IDs. All secrets via Key Vault / env vars.
2. Always write unit tests alongside implementation. ≥85% line coverage on `Orqentis.Engine` and `Orqentis.AI`.
3. Never bypass `OdcsContractValidator`. A YAML that fails validation must not be saved as `active`.
4. AI LLM calls require a 15-second timeout and a graceful fallback (empty template / null score).
5. All Delta table access uses the **OBO** token of the calling user. Never an app-level credential.
6. All API responses include an `X-Correlation-Id` header.

## Licence

MIT — see [`LICENSE`](LICENSE). Bundled OSS dependencies retain their original licences.

## Status

**Production pilot ready.** Core workload features are implemented, CI/CD is green,
Engine/AI coverage gates are enforced, and live Fabric evidence is tracked in
[`docs/test-scenarios.md`](docs/test-scenarios.md). Public ISV launch readiness is
tracked by [`docs/isv-publish-checklist.md`](docs/isv-publish-checklist.md) and enforced by
`scripts/Test-PublicReadiness.ps1`.
