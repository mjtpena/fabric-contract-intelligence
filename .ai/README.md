# `.ai/` — AI Agent Knowledge Base for Orqentis

This folder is consumed by GitHub Copilot, Copilot Agent Mode, Claude Code, Cursor, and any
other AI coding assistant working on this repo. It mirrors the structure used by the parent
[Microsoft Fabric Extensibility Toolkit](https://github.com/microsoft/fabric-extensibility-toolkit).

## Layout

```
.ai/
├── context/              ← background knowledge an agent needs before coding
│   ├── orqentis.md            ← Orqentis domain language (ODCS, Delta, contracts, runs, policies)
│   ├── fabric.md         ← Microsoft Fabric platform model (workload, item, manifest, OBO)
│   ├── architecture.md   ← layered architecture, allowed dependencies, data flow
│   └── conventions.md    ← code style, naming, error handling, logging, testing
└── commands/             ← per-sprint runbooks the agent executes
    ├── sprint-01-scaffold.md
    ├── sprint-02-engine-foundations.md
    ├── sprint-03-engine-evaluators.md
    ├── sprint-04-api.md
    ├── sprint-05-frontend-editor.md
    ├── sprint-06-frontend-runs.md
    ├── sprint-07-quality-rules.md
    ├── sprint-08-ai-features.md
    └── sprint-09-activator-policies.md
```

## How to use

1. Open `.github/copilot-instructions.md` (the entry point).
2. Read the four `context/` files top to bottom. They are short by design.
3. Pick the sprint runbook from `commands/` and execute it linearly.
4. Each sprint runbook references a section of `docs/spec.md` (the canonical product spec)
   and a list of FR-IDs (functional requirements) it satisfies.

> **Rule:** an agent should never modify `.ai/` content as part of normal feature work.
> Architecture changes belong in their own PR with a CTO/Architect review.
