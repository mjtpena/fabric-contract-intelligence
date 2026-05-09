# Sprint 5 — Frontend: Manifest, ContractListPage, ContractEditorPage

## Goal

Ship the first user-facing surface inside the Fabric portal: a Contract list page and a
split-pane Contract editor (Monaco YAML on the left, live validation panel on the right).

**Spec sections:** §8.1, §8.2, §8.3, §16.2 Sprint 5.
**FR coverage:** FR-001, FR-008, FR-017 (partial: editor; diff later).

## Pre-requisites

Sprint 4 merged (real API endpoints behind `/contracts` and `/contracts/{id}`).

## Files to create / modify

### Manifest

- `frontend/manifest/WorkloadManifest.json`
  - `workloadId`: `Datachain.FabricContractIntelligence`
  - Item types: `Contract`, `ContractPolicy`, `ContractReport` (each with iconSmall/iconLarge,
    edit URL, capabilities)
- `frontend/manifest/items/ContractItem/ContractItem.json` + `.xml` (per toolkit pattern)
- `frontend/public/icons/` — placeholder SVGs (16×16 and 32×32) per item type.

### Pages

- `frontend/src/pages/ContractListPage.tsx`
  - Fluent UI `DataGrid` over `useContracts()` hook.
  - Columns: name, status badge, last run, version, actions (Open, Run Now).
  - Empty state: "No contracts yet — create one" CTA.
- `frontend/src/pages/ContractEditorPage.tsx`
  - Mandatory `ItemEditor` from `frontend/src/components/ItemEditor` (toolkit pattern).
  - Ribbon: `homeToolbarActions` = `[Save, Activate, RunNow, VersionHistory]`,
    `additionalToolbars` = `[AiImproveToolbar (Enterprise badge)]`.
  - Center panel: `<ContractEditorSplitPane>` 55 % Monaco / 45 % validation panel.
  - Initial view determined by `getInitialView(loaded)` — `"empty"` if no draft yet.
- `frontend/src/pages/ContractDetailPage.tsx` — read-only view with version history list.

### Components

- `frontend/src/components/ContractEditor/MonacoYamlEditor.tsx`
  - `@monaco-editor/react` with YAML + ODCS JSON Schema attached.
  - Theme tokens from Fabric SDK (light/dark).
  - Custom snippets for `schema entry`, `quality rule`, `freshness block`.
- `frontend/src/components/ContractEditor/ValidationPanel.tsx`
  - Calls `GET /contracts/{id}/validate` via `contractClient.validate(yaml)` debounced 500 ms.
  - Renders error list, schema preview `DataGrid`, "Preview against live table" button.
- `frontend/src/components/StatusBadge.tsx` — chips for draft/active/deprecated/archived.

### State, hooks, API

- `frontend/src/store/contractStore.ts` — Zustand store: `contracts`, `loading`,
  `loadAll`, `loadOne`, `save`, `activate`.
- `frontend/src/hooks/useContract.ts` — selector wrapper.
- `frontend/src/hooks/useFabricSdk.ts` — implemented properly this sprint (Sprint 1 stub).
- `frontend/src/api/contractClient.ts` — typed wrappers for `GET/POST/PUT/DELETE /contracts`.
- `frontend/src/models/Contract.ts` — TS interfaces matching `ContractDto` from Sprint 4.

### Monaco / ODCS schema

- `frontend/src/monaco/setup.ts` — register YAML language, attach
  `/schemas/odcs-v3.1.0.json` for IntelliSense.
- `frontend/public/schemas/odcs-v3.1.0.json` — Sprint 1 placeholder; populate with the real
  schema this sprint.

### Tests

- `frontend/src/pages/__tests__/ContractListPage.test.tsx` — Vitest + React Testing Library.
- `frontend/src/components/ContractEditor/__tests__/MonacoYamlEditor.test.tsx` — mock Monaco.
- Smoke test: editor mounts, types YAML, validation panel updates within 500 ms (timer-based).

## ItemEditor scaffolding

Per `.ai/context/fabric.md`:

- ALWAYS use `frontend/src/components/ItemEditor` (mandatory).
- ALWAYS use `useViewNavigation()` from `ItemEditorDefaultView`.
- NEVER add scrolling inside views — the ItemEditor handles overflow.
- Define ribbon actions via factories: `createSaveAction()`, `createSettingsAction()`,
  plus a custom `createActivateAction()` and `createRunNowAction()` co-located in
  `frontend/src/components/ItemEditor/actions/`.

## Acceptance criteria

- [ ] FR-008: `WorkloadManifest.json` validates against the Fabric Workload manifest schema;
      `Contract` item type appears in the "New Item" dialog of a test workspace.
- [ ] FR-001: User types ODCS YAML into Monaco; invalid YAML surfaces an error in the
      validation panel within 500 ms.
- [ ] Saving a contract creates a row via `POST /contracts` and refreshes the list.
- [ ] Vitest coverage on `frontend/src/components/ContractEditor` ≥ 80 %.
- [ ] No `@fluentui/react` v8 imports anywhere.

## Out-of-scope

- AI Suggest page → Sprint 8.
- Run history page → Sprint 6.
- Policy / alerts pages → Sprint 9.
- Diff editor (FR-017 full) → Sprint 6.
