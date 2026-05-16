# Contributing

Read `.github/copilot-instructions.md` before making changes. It is the repository source of truth for architecture, coding rules, tests, and PR hygiene.

## Branching

Use trunk-based development. Create short-lived branches from `main` such as `feat/sprint-03-engine-evaluators`, `fix/dbup-fatal`, or `chore/dependabot-ci`.

## Commits

Use Conventional Commits: `feat:`, `fix:`, `chore:`, `docs:`, `test:`, `refactor:`. Keep each commit focused and do not include secrets or local environment files.

## Pull requests

- Link the sprint runbook or issue.
- Cite the implemented spec section.
- Include test evidence and any known follow-up work.
- Keep PRs small enough for review within one business day.

## Local validation

```powershell
cd backend
dotnet restore Orqentis.sln
dotnet build Orqentis.sln
dotnet test Orqentis.sln

cd ..\frontend
npm ci
npm run lint
npm run typecheck
npm run build
npm test
npm run test:coverage
```

## Pre-commit hooks

Run `npm --prefix frontend install` once to install Husky. The hook runs `lint-staged` for ESLint fixes and Prettier formatting on staged frontend files.
