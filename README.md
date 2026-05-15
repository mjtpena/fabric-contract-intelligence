# Orqentis

> **Contract-bound data for every AI agent on Microsoft Fabric.**

[![CI](https://github.com/mjtpena/fabric-contract-intelligence/actions/workflows/ci.yml/badge.svg)](./.github/workflows/ci.yml)

Orqentis is the **AI Readiness and Data Security layer for AI agents on Microsoft Fabric**.
It is a native Fabric ISV workload that enforces **ODCS v3.1.0** data contracts at the
OneLake Delta layer — the one place every Fabric Copilot, Fabric Data Agent, Copilot Studio
skill, and Microsoft 365 Copilot grounding query reads from. Every enforcement run executes
under the calling user's OBO-delegated identity, producing the per-inference data trust
evidence that EU AI Act Article 10, NIST AI RMF, and ISO/IEC 42001 auditors demand.

📄 **Positioning, demo script, and investor materials:** [`docs/positioning/`](./docs/positioning/README.md)

## The problem

Microsoft Copilot in Fabric is answering board-level questions today. The answer is confident.
The data is often 72 hours stale, schema-drifted, unlabelled for sensitivity, or being read by
an agent running with broader permissions than the user who asked the question. These are not
AI model failures — they are data infrastructure failures, and no Fabric-native tool enforces
contractual schema, freshness, quality, and identity guarantees on the Delta tables that AI
agents ground on. See [`docs/positioning/ai-readiness.md`](./docs/positioning/ai-readiness.md)
for the full narrative and the *six broken promises* every Fabric AI deployment is quietly making.

## The five capabilities

| Capability | What it does | Primary buyer |
|---|---|---|
| **Agent-Ready Contract Co-Author** | AI generates an ODCS v3.1.0 draft from the actual Delta log profile — schema, 30-day freshness pattern, PII column detection — edited in Monaco with full IntelliSense inside the Fabric portal. | Head of Data Governance |
| **AI Blast-Radius Scorer** | At breach time, traverses the Fabric lineage graph and severity-ranks every Copilot session, semantic model, Fabric Data Agent, and Copilot Studio skill grounded on the broken contract. | Fabric Platform Owner |
| **Pre-Copilot Contract Gate** | Low-latency Contract Status REST endpoint; tags semantic models `contract-status: BREACH`; suppresses or warns Copilot grounding before stale data reaches agents. | Chief AI Officer |
| **AI Act Evidence Pack** | One-click PDF/JSON bundle: run history, OBO identity log, MIP labels, Delta log versions, mapped to EU AI Act Art. 10/13, NIST AI RMF MEASURE, ISO/IEC 42001. | Chief Data Officer |
| **AI Governance Assistant** | Natural-language queries across the contract estate — *"Which contracts feed our M365 Copilot?"* — returns a ranked, actionable list. | All five personas |

Full demo (12 minutes, 7 scenes): [`docs/positioning/mvp-demo-script.md`](./docs/positioning/mvp-demo-script.md).
Competitive matrix vs Purview, Informatica, Collibra, Atlan, Monte Carlo, Securiti, Immuta,
Lakera/Protect AI: [`docs/positioning/competitive-matrix.md`](./docs/positioning/competitive-matrix.md).

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
results to PostgreSQL. Target adapters read Warehouse/Fabric SQL metadata through delegated SQL,
Eventhouse/KQL metadata through delegated Kusto, and Semantic Model definitions through Fabric
REST/TMDL. AI features (contract suggestion, breach scoring, NL query) are
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

**Production pilot ready and public ISV launch candidate.** Core workload features are implemented,
CI/CD is green, Engine/AI coverage gates are enforced, and live Fabric evidence is tracked in
[`docs/test-scenarios.md`](docs/test-scenarios.md). Public ISV launch readiness is tracked by
[`docs/isv-publish-checklist.md`](docs/isv-publish-checklist.md), the interim Enterprise upgrade
flow is documented in [`docs/entitlement-process.md`](docs/entitlement-process.md), and readiness
artifacts are enforced by `scripts\Test-PublicReadiness.ps1`.
