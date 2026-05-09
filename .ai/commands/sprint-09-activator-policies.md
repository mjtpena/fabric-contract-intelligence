# Sprint 9 — Fabric Activator Integration, Policy Editor, Alerts Dashboard

## Goal

Close the loop on enforcement: when a Run fails (or warns, per policy), trigger the
configured Fabric Activator rule. Provide a Policy editor for binding contracts to
schedules and Activator rules, and an Alerts Dashboard for ops triage.

**Spec sections:** §11, §8.2 PolicyEditorPage / AlertsDashboard, §16.2 Sprint 9.
**FR coverage:** FR-012, FR-018 (cross-workspace federation foundations), FR-024 (webhooks).

## Pre-requisites

Sprints 7 (policies in DB), 8 (breach scoring populates Activator context).

## Files to create / modify

### `backend/Orqentis.Api/Services/`

- `IActivatorClient.cs` + `ActivatorClient.cs` — Polly-wrapped HTTP client for Fabric Activator.
- `IBreachAlertDispatcher.cs` + `BreachAlertDispatcher.cs` — chooses path based on policy:
  Activator vs direct webhook vs Slack (FR-024).
- Add `Webhooks/SlackWebhookSender.cs`, `Webhooks/GenericWebhookSender.cs`.

### `RunsController` integration

After breach scoring completes (Sprint 8), evaluate the policy:

```csharp
if (run.Status == EnforcementStatus.Failed
    || (run.Status == EnforcementStatus.Warned && policy.AlertOnWarn))
{
    await _alertDispatcher.DispatchAsync(run, policy, ct);
    run.ActivatorTriggered = true;
}
```

Activator REST call shape (verbatim from spec §11.3):

```
POST https://api.fabric.microsoft.com/v1/workspaces/{workspaceId}/reflex/rules/{ruleId}/trigger
Authorization: Bearer {fabricToken}
{
  "context": {
    "contractId": "...", "contractName": "...", "tablePath": "...",
    "runId": "...", "status": "failed", "breachScore": 78.4,
    "violatedRules": 3, "runUrl": "https://app.fabric.microsoft.com/..."
  }
}
```

### Frontend

- `frontend/src/pages/PolicyEditorPage.tsx` — Fluent UI Wizard from toolkit:
  Step 1 cron schedule, Step 2 alert behaviour (on-fail / on-warn), Step 3 Activator
  rule picker (or "Create new" deep-link to Activator), Step 4 review.
- `frontend/src/pages/AlertsDashboard.tsx` — Fluent UI `DataGrid` of recent alerts with
  filter by tenant / status / severity / date range.
- `frontend/src/components/Activator/RulePicker.tsx` — calls Fabric REST to list Activator
  rules in the current workspace.

### Tests

- `Services/ActivatorClientTests.cs` — verifies request URL/payload exactly matches §11.3.
- `Services/BreachAlertDispatcherTests.cs` — covers the policy decision matrix.
- Integration test: `EndToEnd_ContractFails_ActivatorRuleFires` against a real Activator
  rule wired to a test Teams channel.

### Cross-workspace federation foundation (FR-018)

- New SQL migration: `workspace_links` table mapping a tenant → workspaces it federates.
- Read-only API: `GET /federation/contracts` returns contracts across linked workspaces
  for an Enterprise tenant. Pagination via cursor.
- Frontend: a workspace switcher control on `ContractListPage` for Enterprise tenants.

## Acceptance criteria

- [ ] FR-012: Activator triggered within 30 s of run FAIL completion (median); failures
      surfaced as a `Orqentis_Activator_Drop` event in App Insights, never thrown.
- [ ] FR-018: Enterprise tenant sees contracts from all linked workspaces in a unified list.
- [ ] FR-024: a tenant configured with a Slack webhook receives a formatted Slack message
      on FAIL when Activator is not configured.
- [ ] PolicyEditorPage wizard saves a complete policy + cron schedule + alert routing
      in one round trip.

## Out-of-scope

- PDF audit export (FR-021) → next sprint.
- Microsoft Purview integration (FR-020) → next sprint.
