# Rate-limit tuning runbook

## Goal

Tune per-endpoint limits without redeploying application code.

## Pattern

Rate limits should be configuration-driven through App Service settings or Key Vault-backed configuration under `RateLimits:<Endpoint>:<Setting>`. Example settings include permit limit, replenishment period, queue limit, and enabled/disabled state.

## Procedure

1. Identify the endpoint, tenant impact, and current throttle signals in Application Insights.
2. Update the App Service setting for the target endpoint only.
3. Restart or recycle the API slot if runtime reload is not enabled.
4. Verify 429 rate, latency, and backend dependency saturation for 30 minutes.
5. Document the new value, reason, owner, and expiry date.

## Guardrails

Do not raise limits to mask database, OneLake, or AI provider incidents. Prefer tenant-specific mitigations when one customer creates disproportionate load.
