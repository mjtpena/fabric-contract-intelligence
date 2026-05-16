# Observability

Orqentis uses Application Insights and Log Analytics for API telemetry, dependency tracking, and structured Serilog events. Every incident investigation should start with the customer tenant, workspace, timestamp, and `X-Correlation-Id`.

## Alert ownership

Infrastructure owns Azure Monitor metric alerts in Bicep. Alerts should route to the shared action group for the production workload and page the on-call engineer for Sev 1 symptoms. Docs and runbooks here define response ownership; Bicep defines the concrete alert resources and action group wiring.

## Required alert routes

- App Service HTTP 5xx burst: page primary on-call, notify engineering channel.
- Slow endpoint latency: notify engineering channel, page if sustained for customer-facing APIs.
- PostgreSQL CPU/storage/connections: notify platform, page if `/health/ready` is degraded.
- OBO token failures: page identity/platform owner.
- AI provider failures or fallback exhaustion: notify AI owner, page if suggestions/scoring are unavailable.

## Common Kusto queries

### 5xx burst

```kusto
requests
| where timestamp > ago(30m)
| where cloud_RoleName has "orqentis-api"
| where resultCode startswith "5"
| summarize count(), sampleCorrelationIds=make_set(customDimensions["CorrelationId"], 10) by bin(timestamp, 5m), name, resultCode
| order by timestamp desc
```

### Slow endpoints

```kusto
requests
| where timestamp > ago(1h)
| where cloud_RoleName has "orqentis-api"
| summarize p95=percentile(duration, 95), count() by name, bin(timestamp, 5m)
| where p95 > 2000ms
| order by p95 desc
```

### OBO failures

```kusto
traces
| where timestamp > ago(2h)
| where message has_any ("OBO", "OneLake", "JwtAuth-Failed", "Unauthorized")
| project timestamp, severityLevel, message, customDimensions, operation_Id
| order by timestamp desc
```

### AI provider down or falling back

```kusto
traces
| where timestamp > ago(2h)
| where message has_any ("AI-Fallback", "AzureOpenAI", "Anthropic", "LlmRouter")
| summarize count() by message, severityLevel, bin(timestamp, 5m)
| order by timestamp desc
```
