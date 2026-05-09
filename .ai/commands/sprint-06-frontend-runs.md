# Sprint 6 — Frontend: EnforcementRunPage, WorkspaceSettingsPage, Integration Suite

## Goal

Surface enforcement runs (per-rule breakdown, schema diff, remediation) and the workspace
settings page (tier, API key, Activator setup hints, Purview link). Add an end-to-end
integration test suite that exercises the full Sprint 1–6 happy path against a live test
Fabric capacity.

**Spec sections:** §8.2, §8.3, §16.2 Sprint 6.
**FR coverage:** FR-007 (UI), FR-017 (full diff editor), FR-008 (publish flow).

## Pre-requisites

Sprint 5 merged.

## Files to create / modify

### Pages

- `frontend/src/pages/EnforcementRunPage.tsx`
  - Header: status chip, started/completed timestamps, breach score gauge (placeholder
    until Sprint 8 fills `breachScore`).
  - Tabs: "Schema Rules", "Quality Rules", "Freshness", "Schema Diff", "Remediation".
  - Schema Diff tab uses Monaco's `DiffEditor` (FR-017).
  - Remediation tab renders the `remediationSuggestions` array as a checklist.
- `frontend/src/pages/WorkspaceSettingsPage.tsx`
  - Tier card (current tier, days remaining for Enterprise).
  - API key generation (only for tenants opting into machine-to-machine).
  - Activator setup wizard launcher (deep link to Sprint 9 page).
  - Purview connection status pill.

### Components

- `frontend/src/components/RunResult/RuleResultsTable.tsx` — Fluent UI `DataGrid`
  showing rule id, column, status, message, expected vs actual.
- `frontend/src/components/RunResult/SchemaDiffViewer.tsx` — wraps Monaco `DiffEditor`.
- `frontend/src/components/RunResult/BreachScoreGauge.tsx` — D3-free SVG gauge.

### State, hooks, API

- `frontend/src/store/runStore.ts` — Zustand: list runs for a contract, current run detail.
- `frontend/src/hooks/useEnforcementRun.ts` — polls `/runs/{id}` every 3 s while status is `running`.
- `frontend/src/api/runClient.ts` — typed wrappers for run endpoints from Sprint 4.

### Integration tests

Add a dedicated job in `.github/workflows/deploy-staging.yml`:

```yaml
- name: Run integration tests
  run: dotnet test backend/FCI.Tests/FCI.Integration.Tests --logger:trx
  env:
    FABRIC_TEST_TENANT_ID: ${{ secrets.FABRIC_TEST_TENANT_ID }}
    FABRIC_TEST_WORKSPACE_ID: ${{ secrets.FABRIC_TEST_WORKSPACE_ID }}
    FABRIC_TEST_CAPACITY_ID: ${{ secrets.FABRIC_TEST_CAPACITY_ID }}
```

Tests live under `backend/FCI.Tests/FCI.Integration.Tests/`:

- `EndToEnd_HealthcareContract_PassesAllRules` — hits a seeded test Lakehouse table.
- `EndToEnd_SchemaDrift_FailsCorrectRule` — uses a deliberately drifted test table.

### Workload publishing

- `scripts/Publish-Workload.ps1` — automates the Self-Service Workload Publishing flow.
- `docs/agent-guide.md` §6 — write the publish runbook.

## Acceptance criteria

- [ ] FR-007: Enforcement run UI renders all sections from §5.2 result JSON.
- [ ] FR-017: Diff editor shows side-by-side YAML between any two contract versions.
- [ ] Integration test suite green against a real Fabric test capacity.
- [ ] FCI workload published to at least one private-preview Fabric tenant.
- [ ] Lighthouse a11y score ≥ 90 on Editor and Run pages.

## Out-of-scope

- Quality rule UI (data only renders if Sprint 7 exists; placeholders OK).
- AI features → Sprint 8.
- Policy editor / alerts dashboard → Sprint 9.
