# FCI Product Specification (Reference Copy)

> The authoritative product spec is `FabricContractIntelligence_Spec_v1.0.docx` at the
> repo root. This file is a Markdown extraction of it for in-IDE reference and AI agent
> consumption. **If the two diverge, the .docx wins** until a follow-up PR rewrites this
> file as the source of truth.

The full text and tables of the spec are extracted into the canonical structure below.
For brevity in this scaffold we do not duplicate the whole 30-page document. Agents must
read the .docx (or the extracted `spec.txt` / `tables.txt` produced during initial build)
when a section needs detail.

## Section index

| § | Title |
|---|---|
| 1 | Executive Summary |
| 2 | Problem Statement |
| 3 | Product Overview (3.1 Identity, 3.2 Tiers) |
| 4 | Architecture (4.1 High-level, 4.2 Data flow, 4.3 Repo structure) |
| 5 | Data Models (5.1 PG schema, 5.2 result_json) |
| 6 | ODCS Contract Standard (6.1 Reference, 6.2 Sample) |
| 7 | REST API Specification (7.1 base, 7.2 auth, 7.3 POST /contracts body) |
| 8 | Frontend Specification (8.1 Manifest, 8.2 Pages, 8.3 ContractEditor) |
| 9 | Enforcement Engine (9.1 Overview, 9.2 Classes, 9.3 Interface, 9.4 Rules) |
| 10 | AI Agent (10.1 Features, 10.2 Suggestion Prompt, 10.3 Scoring rubric) |
| 11 | Fabric Activator Integration |
| 12 | Functional Requirements (MoSCoW) |
| 13 | Non-Functional Requirements |
| 14 | Infrastructure (Bicep) |
| 15 | CI/CD |
| 16 | Agent Execution Guide (16.1 Rules, 16.2 Build order, 16.3 Dependencies) |
| 17 | Revenue Model |
| 18 | Open-Source Strategy |
| 19 | Risk Register |
| 20 | Glossary |

## Critical references for agents

Most agents only need:

- **§4.3** — exact repo layout. The scaffold matches this 1:1.
- **§5.1** — PostgreSQL DDL. Implemented in `backend/FCI.Data/Migrations/V001__initial_schema.sql`.
- **§5.2** — `result_json` shape. Implemented in `backend/FCI.Engine/Models/EnforcementResult.cs`.
- **§6.2** — sample healthcare ODCS contract. Stored at `contracts/examples/healthcare.contract.yaml`.
- **§7** — REST API surface. Mirrored in `docs/api.md`.
- **§9.3** — `IEnforcementOrchestrator` interface. Implemented in
  `backend/FCI.Engine/IEnforcementOrchestrator.cs`.
- **§9.4** — rule evaluation matrix. Authoritative for `SchemaRuleEvaluator`.
- **§10.2** — Contract Suggestion system prompt. Stored at
  `backend/FCI.AI/Prompts/ContractSuggestion.txt`.
- **§10.3** — breach impact scoring rubric. Stored in `BreachImpactScorer.cs` weights.
- **§12** — FR-IDs. Each PR should cite the FR-IDs it satisfies.
- **§16.1** — non-negotiable rules. Mirrored in `.github/copilot-instructions.md` §3.
- **§16.2** — sprint plan. Mirrored in `.ai/commands/sprint-NN-*.md`.

## How to update this file

When the .docx is updated:

1. Re-export with `python-docx` (see `scripts/extract-spec.ps1`).
2. Update this index with any new sections.
3. If a section's content is now stable (no longer evolving), copy the full text in to make
   this file self-contained.
4. Bump the version line in the .docx and commit both together.
