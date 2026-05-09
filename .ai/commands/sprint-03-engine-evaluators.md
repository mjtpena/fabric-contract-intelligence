# Sprint 3 — Engine Evaluators: Schema, Freshness, Orchestrator

## Goal

Implement the **evaluate** half of the Enforcement Engine: compare a `DeltaSchema` against
a `ContractDefinition.Schema`, evaluate freshness against the latest commit, and aggregate
all rule results into an `EnforcementResult` via the orchestrator.

**Spec sections:** §9, especially §9.4 (rule evaluation logic table).
**FR coverage:** FR-003, FR-004, FR-006, FR-007.

## Pre-requisites

Sprint 2 merged. `IDeltaLogReader`, `ISchemaExtractor`, `IOdcsContractParser`,
`IOdcsContractValidator` working.

## Files to create / modify

### `backend/Orqentis.Engine/Evaluation/`

- `ISchemaRuleEvaluator.cs` + `SchemaRuleEvaluator.cs` — implements the five `schema.*` rules.
- `IFreshnessEvaluator.cs` + `FreshnessEvaluator.cs` — implements `freshness.max_age`.
- `RuleResult.cs` — already in `Orqentis.Engine/Models/` from Sprint 1; extend if needed.
- `SchemaDiff.cs` — record describing `AddedColumns`, `RemovedColumns`, `TypeChanges`,
  `NullabilityChanges`, `PartitionChange`.

### `backend/Orqentis.Engine/`

- `IEnforcementOrchestrator.cs` + `EnforcementOrchestrator.cs` — composes the engine.
- `EnforcementResult.cs` — already in `Orqentis.Engine/Models/`; ensure it matches spec §9.3.
- `EnforcementStatus.cs` (`Passed | Warned | Failed | Error`).

### Tests

- `Evaluation/SchemaRuleEvaluatorTests.cs`
  - Each rule has a happy-path test + at least one failure test.
  - Drift table cases: missing column, extra column, type change, nullability mismatch,
    partition mismatch.
- `Evaluation/FreshnessEvaluatorTests.cs`
  - Inside SLA → Passed.
  - Just over SLA + severity warning → Warned.
  - Way over SLA + severity error → Failed.
- `EnforcementOrchestratorTests.cs`
  - Fully mocked: schema OK + quality skipped + freshness OK → overallStatus Passed.
  - Schema fail + freshness OK → overallStatus Failed (severity rolls up).
  - Engine throws → overallStatus Error, message captured.

## Rule evaluation matrix (must match spec §9.4 verbatim)

| Rule ID | Failing status | Severity override |
|---|---|---|
| `schema.column.present` | Failed | Always Error |
| `schema.column.type` | Failed | Always Error |
| `schema.column.nullable` | Failed | Per contract `required` |
| `schema.column.extra` | Warned | Configurable |
| `schema.partition.match` | Warned | Per contract |
| `freshness.max_age` | Warned/Failed | Per `freshness.severity` |

## Orchestrator algorithm

```
RunAsync(contract, oboToken, ct):
    snapshot = await _delta.ReadAsync(contract.Server.Path, oboToken, ct)
    schemaResults = _schemaEval.Evaluate(snapshot.Schema, contract.Schema)
    freshnessResult = _freshnessEval.Evaluate(snapshot.LastModifiedUtc, contract.Freshness)
    qualityResults = []   # Sprint 7 wires real evaluator
    diff = SchemaDiff.Compute(snapshot.Schema, contract.Schema)
    overall = AggregateStatus(schemaResults, qualityResults, freshnessResult)
    return EnforcementResult { ... }

AggregateStatus rule:
    Failed if any rule.Status == Failed (and severity == Error)
    Warned if any rule.Status == Warned or Failed-with-Warning-severity
    else Passed
```

## Acceptance criteria

- [ ] All rule IDs from spec §9.4 are emitted by `SchemaRuleEvaluator` for the relevant scenarios.
- [ ] `EnforcementOrchestrator` produces a `result_json` shape that matches spec §5.2 byte-for-byte
      (exclusive of generated UUIDs/timestamps).
- [ ] FR-004 acceptance: ≥ 90 % test coverage on `SchemaRuleEvaluator`.
- [ ] FR-007 acceptance: full result is serialisable to JSON and round-trips back via `System.Text.Json`.
- [ ] No reflection at runtime in the engine (perf).

## Out-of-scope

- `QualityRuleEvaluator` → Sprint 7.
- AI breach scoring → Sprint 8.
- API integration → Sprint 4.
