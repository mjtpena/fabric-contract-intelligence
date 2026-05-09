## Sprint runbook
Sprint: <!-- e.g. .ai/commands/sprint-03-engine-evaluators.md -->

## Spec sections implemented
Spec: <!-- e.g. §9.4, §12 FR-004 -->

## Summary
<!-- 2-3 sentences. What changed and why. -->

## Type of change
- [ ] New feature (non-breaking)
- [ ] Bug fix (non-breaking)
- [ ] Breaking change
- [ ] Refactor (no behavioural change)
- [ ] Documentation
- [ ] Infra / CI

## Non-negotiable rules checklist (`.github/copilot-instructions.md` §3)
- [ ] No secrets, connection strings, API keys, or tenant IDs hardcoded
- [ ] Unit tests added; coverage on `Orqentis.Engine` / `Orqentis.AI` ≥ 85 %
- [ ] No bypass of `OdcsContractValidator` for active contracts
- [ ] AI calls (if any) have 15s timeout + graceful fallback
- [ ] OneLake access uses OBO delegated tokens only
- [ ] All API responses include `X-Correlation-Id`
- [ ] Soft-delete pattern preserved (no `DELETE FROM`)
- [ ] Timestamps are UTC (`DateTimeOffset` / ISO-8601)

## Test evidence
<!-- Paste relevant test output, screenshot, or coverage delta -->

## Out-of-scope deferral
<!-- What you intentionally did not do, and which sprint will pick it up -->
