# AI provider outage runbook

## Symptoms

- Suggestion or scoring requests time out or return fallback output.
- Logs show `AI-Fallback`, Azure OpenAI 429/5xx, or Anthropic provider errors.
- Users see empty suggestion templates or unavailable scores instead of request failures.

## Expected behavior

The router attempts Azure OpenAI first, then Anthropic fallback, then heuristic/empty output according to the AI timeout and fallback rules. The caller should not receive raw provider exceptions.

## Checks

1. Check Azure OpenAI resource health and regional status.
2. Check Anthropic status and configured API limits.
3. Query Application Insights for fallback volume and latency.
4. Confirm Key Vault-backed provider credentials are available.

## Mitigation

Provider order should be configuration-driven through `LlmRouter` settings. To prefer Anthropic during an Azure OpenAI outage, update the provider-order configuration in App Service/Key Vault, restart the API slot, and monitor fallback volume. Restore Azure OpenAI as primary once health and latency stabilize.
