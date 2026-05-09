# GitHub Copilot Instructions — Orqentis

> **READ THIS FILE BEFORE WRITING ANY CODE.** This is the single source of truth that
> overrides any default Copilot behaviour. If a rule here conflicts with a generic
> suggestion, the rule here wins.

## 1. What Orqentis is

Orqentis is a **native Microsoft Fabric ISV workload** built on the
[Microsoft Fabric Extensibility Toolkit](https://github.com/microsoft/fabric-extensibility-toolkit)
that enforces **ODCS v3.1.0** data contracts at the **Delta table layer** inside OneLake.

- Frontend: React 18 + TS 5 + Fluent UI v9 + Vite + Monaco + Zustand + `@ms-fabric/workload-client`
- Backend: .NET 8 (ASP.NET Core), EF Core + PostgreSQL, Hangfire scheduler
- AI: Azure OpenAI GPT-4o (primary), Anthropic Claude 3.7 Sonnet (fallback)
- Hosting: Azure App Service (P2v3), Azure Static Web Apps, Azure Key Vault, Azure OpenAI
- Auth: Microsoft Entra ID with **OBO (On-Behalf-Of) token exchange** for OneLake access

Full spec: [`docs/spec.md`](../docs/spec.md). Architecture: [`docs/architecture.md`](../docs/architecture.md).

## 2. Where to look for context

Always reference these in this order:

1. **`.github/copilot-instructions.md`** ← this file
2. **`.ai/context/orqentis.md`** — domain language (ODCS, Delta, Activator)
3. **`.ai/context/fabric.md`** — Fabric platform model (workload, item, manifest)
4. **`.ai/context/architecture.md`** — layered architecture, boundaries, allowed dependencies
5. **`.ai/context/conventions.md`** — code style, naming, error handling, logging
6. **`.ai/commands/sprint-NN-*.md`** — the runbook for the sprint you are working on
7. **`docs/spec.md`** — the authoritative product specification (sections referenced as §N.M)

## 3. Non-negotiable rules

These are taken from the spec §16.1 and apply to every PR.

1. **Read the spec section first.** Each work unit cites a `§` from `docs/spec.md`. Read it
   before coding. If the spec is silent, ask in the PR description, do not invent.
2. **No secrets in code, ever.** Connection strings, API keys, tenant IDs, client secrets:
   all must come from `IConfiguration` (.NET) backed by Azure Key Vault, or from `import.meta.env`
   (Vite) backed by `.env.template`. Never commit `.env` or `appsettings.Development.json`.
3. **Tests alongside implementation.** Every public method in `Orqentis.Engine` and `Orqentis.AI` needs
   xUnit tests. Target: **≥85 % line coverage** on those two projects. Use Moq + FluentAssertions.
4. **Never bypass `OdcsContractValidator`.** If a YAML does not validate against the ODCS
   v3.1.0 JSON Schema, it MUST NOT be persisted with `status='active'`. The validator is
   authoritative; the schema lives at `backend/Orqentis.Engine/Odcs/Schema/odcs-v3.1.0.json`.
5. **AI calls require timeout + fallback.** All LLM calls use a 15-second `CancellationToken`
   timeout. On failure, return an empty template (suggestion) or `null` (score) — never throw
   to the caller. Wrap with Polly retry (3 attempts, exponential backoff) before falling back.
6. **OneLake access is OBO-only.** Every Delta read uses the calling user's delegated token
   exchanged via `Azure.Identity.OnBehalfOfCredential`. Application identity is forbidden for
   data plane operations. (Control plane Fabric REST is also OBO; admin endpoints may use
   Managed Identity — see `.ai/context/architecture.md` §4.)
7. **`X-Correlation-Id` everywhere.** Generated in `CorrelationMiddleware`, propagated to all
   downstream calls (Fabric REST, Activator, OpenAI), logged on every Serilog entry, and
   echoed in every API response header.
8. **Soft delete only.** No `DELETE FROM` statements. Set `deleted_at = NOW()`. Default query
   filter on `OrqentisDbContext` excludes soft-deleted rows.
9. **UTC timestamps.** Use `DateTimeOffset` in C#, ISO-8601 strings in JSON DTOs. Never
   `DateTime` without explicit `Kind`.

## 4. File-path conventions

The repo layout in `docs/spec.md` §4.3 is **exact**. Do not invent new top-level folders.

| What | Where |
|---|---|
| New backend controller | `backend/Orqentis.Api/Controllers/{Name}Controller.cs` |
| New EF entity | `backend/Orqentis.Data/Entities/{Name}.cs` + DbSet + new migration |
| New Engine evaluator | `backend/Orqentis.Engine/Evaluation/{Name}Evaluator.cs` + interface |
| New AI agent | `backend/Orqentis.AI/{Name}Agent.cs`; prompt at `backend/Orqentis.AI/Prompts/{Name}.txt` |
| New React page | `frontend/src/pages/{Name}Page.tsx`; route in `frontend/src/App.tsx` |
| New API client method | `frontend/src/api/{domain}Client.ts` |
| New TS model | `frontend/src/models/{Name}.ts` (mirror backend DTO 1:1) |
| New Bicep module | `infra/modules/{name}.bicep`; wire it into `infra/main.bicep` |
| New ODCS sample | `contracts/examples/{industry}.contract.yaml` |

## 5. Coding patterns the agent must follow

### Backend (.NET 8)

- **DI registration** in `Orqentis.Api/Program.cs` only. Class libraries expose
  `AddOrqentisEngine(IServiceCollection)` extension methods. No service location.
- **Records for DTOs**, classes for EF entities. `required` properties on records.
- **`Result<T>`** pattern (see `Orqentis.Engine/Common/Result.cs`) instead of throwing for
  expected failure. Throwing is reserved for programmer error / unrecoverable.
- **Async all the way.** No `.Result` / `.Wait()`. Pass `CancellationToken ct = default`.
- **Logging:** `_logger.LogInformation("Verb-Noun {ContractId} {RunId}", ...)` with structured
  properties; never string-interpolate.

### Frontend (React 18)

- **Functional components only.**
- **Zustand** for state, one store per domain (`contractStore`, `runStore`, `uiStore`,
  `authStore`). No Redux. No Context except theming.
- **Fluent UI v9** (`@fluentui/react-components`). Never v8. Use theme tokens, never
  hardcoded colours. App inherits Fabric portal theme via the SDK.
- **`useFabricSdk()`** hook wraps the workload client SDK; always go through it.
- **API calls via `frontend/src/api/`** typed clients. Never call `fetch` from a component.
- **Routing:** React Router v6. Routes declared in `App.tsx` only.
- **Monaco editor** loaded via `@monaco-editor/react`; YAML language registered once in
  `frontend/src/monaco/setup.ts`; ODCS IntelliSense via JSON Schema at
  `frontend/public/schemas/odcs-v3.1.0.json`.

### Database

- Snake_case names. UUID PKs (`gen_random_uuid()`). `TIMESTAMPTZ` everywhere.
  Soft delete `deleted_at TIMESTAMPTZ NULL`.
- Migrations are **append-only**. Never edit a merged migration. Add a new one.

## 6. Sprint Runbook System

Each `.ai/commands/sprint-NN-*.md` file contains:

1. **Goal** — one paragraph
2. **Pre-requisites** — completed sprints
3. **Files to create / modify** — exact paths
4. **Interfaces & DTOs** — copy-paste-ready signatures
5. **Acceptance criteria** — measurable, mapped to FR-IDs from spec §12
6. **Test plan** — required unit + integration tests
7. **Out-of-scope** — what NOT to do this sprint (defer to which sprint)

## 7. Pull-request hygiene

Every PR description must include:

- A line linking to the sprint runbook: `Sprint: .ai/commands/sprint-NN-foo.md`
- A line citing the spec section(s) the change implements: `Spec: §9.4, §12 FR-004`
- A checklist confirming the rules in §3 above
- Test coverage delta from the CI report

The PR template (`.github/pull_request_template.md`) enforces this.

## 8. When the agent is stuck

1. Re-read the relevant spec section (`docs/spec.md`).
2. Check `.ai/context/conventions.md`.
3. Copy the shape of an existing similar file.
4. If still stuck, **stop** and surface the question. Do not invent a new pattern silently.

## 9. Response style

- Add a timestamp `YYYY-MM-DD HH:MM UTC` at the end of substantive responses.
- Clean up unsuccessful attempts when finding the correct solution.
- Keep only code that contributes to the working solution.
