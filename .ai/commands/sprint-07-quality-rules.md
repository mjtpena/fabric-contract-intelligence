# Sprint 7 — Quality Rule Evaluator + Scheduled Enforcement (Hangfire)

## Goal

Implement quality rules (`null_rate`, `uniqueness`, `regex`, `custom_sql`) by issuing
aggregated SQL via the Fabric SQL endpoint, and enable scheduled enforcement runs via
Hangfire backed by PostgreSQL.

**Spec sections:** §9.4 quality rules, §11 partial, §16.2 Sprint 7.
**FR coverage:** FR-005, FR-011, FR-016, FR-022.

## Pre-requisites

Sprints 3 (orchestrator), 4 (API), 6 (UI to display results).

## Files to create / modify

### `backend/Orqentis.Engine/Evaluation/`

- `IQualityRuleEvaluator.cs` + `QualityRuleEvaluator.cs`
- `IFabricSqlClient.cs` + `FabricSqlClient.cs` — Polly-wrapped HTTP client to Fabric SQL endpoint.
- `RuleSqlBuilder.cs` — converts a quality rule into a single aggregated SELECT.

### `backend/Orqentis.Api/Services/`

- `Scheduling/IEnforcementScheduler.cs` + `HangfireEnforcementScheduler.cs`
- `Scheduling/ScheduledRunJob.cs` — invoked by Hangfire; calls orchestrator with a
  service-principal-on-behalf-of-user pattern documented in `architecture.md`.
- Add Hangfire wiring to `Program.cs`: `services.AddHangfire(c => c.UsePostgreSqlStorage(...))`.

### `backend/Orqentis.Api/Controllers/`

- `PoliciesController.cs` (new):
  - `GET    /policies`
  - `POST   /policies`
  - `PUT    /policies/{id}`
  - `DELETE /policies/{id}`
- A policy with `schedule_cron != null` registers/updates a recurring Hangfire job.

### Frontend

- `frontend/src/pages/PolicyListPage.tsx` (Should-have, deferred-stretch).
- `frontend/src/pages/PolicyEditorPage.tsx` — cron input, on-fail/on-warn toggles,
  Activator placeholder (wired Sprint 9), email recipients.

### Tests

- `Evaluation/QualityRuleEvaluatorTests.cs`
  - `null_rate` 0.05 vs threshold 0.01 → Failed/Warned per severity.
  - `uniqueness` 0.999 vs threshold 1.0 → Failed.
  - `regex` 0.96 vs threshold 0.95 → Passed.
  - `custom_sql` returns 0 rows → Passed; > 0 rows → Failed.
- `Scheduling/ScheduledRunJobTests.cs` — fakes Hangfire context, verifies orchestrator call.
- Integration: `EndToEnd_SchedulePolicyFiresWithin120Seconds`.

## SQL templates

Examples that `RuleSqlBuilder` must produce verbatim:

```sql
-- null_rate
SELECT CAST(SUM(CASE WHEN [{col}] IS NULL THEN 1 ELSE 0 END) AS FLOAT) / COUNT(*) AS null_rate
FROM [{schema}].[{table}];

-- uniqueness
SELECT CAST(COUNT(DISTINCT [{col}]) AS FLOAT) / COUNT(*) AS uniqueness
FROM [{schema}].[{table}];

-- regex (Fabric SQL supports LIKE; for full regex use SQL endpoint regex extension)
SELECT CAST(SUM(CASE WHEN [{col}] LIKE '{pattern}' THEN 1 ELSE 0 END) AS FLOAT) / COUNT(*) AS regex_pass_rate
FROM [{schema}].[{table}];
```

`custom_sql` rules are passed through verbatim with **mandatory parameter binding** for any
user-supplied values (parser rejects rules containing unbound `{...}` placeholders).

## Acceptance criteria

- [ ] FR-005: null_rate and uniqueness match hand-verified SQL on the test Lakehouse.
- [ ] FR-011: a policy with `*/2 * * * *` triggers within ±2 minutes of schedule.
- [ ] FR-016: regex rule applies threshold as pass-rate (not just any-match).
- [ ] FR-022: custom_sql rule rejects unparameterised `${...}` patterns.
- [ ] Coverage on `Orqentis.Engine.Evaluation` ≥ 90 %.

## Out-of-scope

- AI breach scoring → Sprint 8.
- Activator alert delivery → Sprint 9.
