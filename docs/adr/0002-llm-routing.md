# ADR 0002: LLM routing

## Context

AI-assisted contract suggestions and scoring must remain resilient when a provider is throttled, degraded, or regionally unavailable.

## Decision

Route LLM calls to Azure OpenAI as the primary provider, Anthropic as fallback, and deterministic heuristic/empty outputs as the final safe fallback.

## Status

Accepted.

## Consequences

All LLM calls require timeout, retry, and fallback behavior. Operators can change provider order through configuration during outages. User experience degrades gracefully instead of surfacing raw provider errors.
