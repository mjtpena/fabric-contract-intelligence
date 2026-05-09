# Orqentis

> Data contracts, enforced at the Delta layer. Native to Microsoft Fabric.

[![CI](https://github.com/mjtpena/fabric-contract-intelligence/actions/workflows/ci.yml/badge.svg)](./.github/workflows/ci.yml)

Orqentis is a native Microsoft Fabric ISV workload that brings **ODCS v3.1.0**-compliant data
contract definition, version control, enforcement, and AI-powered suggestions to the Fabric
platform. Orqentis fills a provably unoccupied gap: no existing tool enforces data contracts
natively at the Delta table layer inside Microsoft Fabric.

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
results to PostgreSQL. AI features (contract suggestion, breach scoring, NL query) are
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

🚧 **Initial scaffold** — Sprint 1 deliverable. Subsequent sprints are tracked in
[`docs/agent-guide.md`](docs/agent-guide.md) §16.2 and `.ai/commands/sprint-*.md`.
