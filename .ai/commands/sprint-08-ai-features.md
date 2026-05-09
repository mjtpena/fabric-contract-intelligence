# Sprint 8 — AI Features: Contract Suggestion, Breach Scoring, Remediation, NL Query

## Goal

Add the four AI features (Enterprise tier only) per spec §10:

1. **Contract Suggestion** — generate ODCS YAML from a Delta table schema + hints.
2. **Breach Impact Scoring** — async after each Run.
3. **Remediation Suggestions** — included in `EnforcementResult.RemediationSuggestions`.
4. **Natural Language Query** — `POST /ai/query` over the contract registry.

**Spec sections:** §10, §16.2 Sprint 8.
**FR coverage:** FR-013, FR-014, FR-015, FR-019.

## Pre-requisites

Sprints 4 (API), 7 (full enforcement results to score).

## Files to create / modify

### `backend/Orqentis.AI/`

- `IContractSuggestionAgent.cs` + `ContractSuggestionAgent.cs`
- `IBreachImpactScorer.cs` + `BreachImpactScorer.cs`
- `IRemediationAdvisor.cs` + `RemediationAdvisor.cs`
- `INaturalLanguageQueryHandler.cs` + `NaturalLanguageQueryHandler.cs`
- `LlmRouter.cs` — picks GPT-4o (primary) vs Claude 3.7 Sonnet (fallback) with Polly.
- `Prompts/ContractSuggestion.txt` — verbatim from spec §10.2.
- `Prompts/BreachImpact.txt`, `Prompts/Remediation.txt`, `Prompts/NaturalLanguageQuery.txt`.

### `backend/Orqentis.Api/Controllers/`

- `AiController.cs`:
  - `POST /ai/suggest-contract`  → `IContractSuggestionAgent`
  - `POST /ai/query`             → `INaturalLanguageQueryHandler`
- Add `[Enterprise]` attribute on every action.

### Wire-up changes

- `RunsController.POST /contracts/{id}/runs`: after persisting the run, queue an async
  Hangfire job that:
  1. Calls `IBreachImpactScorer.ScoreAsync(...)` and updates `enforcement_runs.breach_score`.
  2. Calls `IRemediationAdvisor.SuggestAsync(...)` and updates the `remediationSuggestions`
     array inside `result_json`.
- `ContractsController.POST` (mode `ai_generate`): calls `IContractSuggestionAgent`.

### Frontend

- `frontend/src/pages/AISuggestPage.tsx` — Table picker → AI generates YAML →
  user edits in Monaco → Save.
- `frontend/src/pages/NLQueryPage.tsx` — text input → results list (linked to ContractDetail).
- Breach score gauge in `EnforcementRunPage` becomes live.

### Tests

- `AI/ContractSuggestionAgentTests.cs` — fake LLM client returns canned YAML; agent
  validates result via `OdcsContractValidator` before returning.
- `AI/BreachImpactScorerTests.cs` — fake LLM; verify weighting per spec §10.3.
- `AI/LlmRouterTests.cs` — primary fails 3× → fallback invoked → fallback fails → empty
  template / null score returned.

## Rules (must enforce)

- 15-second timeout on every LLM call (`CancellationTokenSource`).
- Polly retry: 3 attempts, exponential backoff (1 s, 2 s, 4 s).
- If both providers fail: `ContractSuggestion` returns `EmptyTemplate.Yaml`;
  `BreachScore` returns `null`; `Remediation` returns `[]`. Never throws to caller.
- All AI inputs/outputs logged with correlation id; raw prompts logged at `Debug` level only.
- AI features 402 for Community tenants — enforced by `[Enterprise]`.

## Breach score rubric (spec §10.3)

| Factor | Weight |
|---|---|
| Rule severity profile | 35 % |
| Consumer count | 25 % |
| Downstream AI dependency | 20 % |
| Column criticality | 15 % |
| Freshness margin | 5 % |

The agent must include the per-factor breakdown in its narrative output and persist it
to a `breach_score_breakdown` JSONB column (add a migration this sprint).

## Acceptance criteria

- [ ] FR-013: `POST /ai/suggest-contract` returns a YAML that passes `OdcsContractValidator`.
- [ ] FR-014: breach score available within 10 s of run completion (P95).
- [ ] FR-015: every failed rule yields ≥ 1 remediation suggestion that mentions the
      specific column name.
- [ ] FR-019: NL query returns relevant contracts; explanation rendered alongside.
- [ ] Test coverage on `Orqentis.AI` ≥ 85 %.
- [ ] No prompt strings hard-coded in `.cs` — all in `Prompts/*.txt`.

## Out-of-scope

- Activator integration (next sprint).
- Audit / health PDF reports → Sprint 9 stretch.
