# Feature flags

Feature flags are configuration, not code forks.

## Backend pattern

Backend flags are read from `IConfiguration["Features:<Name>"]`. Values come from App Service settings or Key Vault-backed configuration. Prefer boolean names such as `Features:UseHeuristicAiFallback` and `Features:EnableOpsFeatureEndpoint`.

Recommended edge service shape:

```csharp
public interface IFeatureFlagService
{
    bool IsEnabled(string name);
    IReadOnlyDictionary<string, bool> GetAll();
}
```

The default implementation should read the `Features` section, parse booleans strictly, and expose only non-secret flags. A future `/v1/ops/features` endpoint may return safe runtime flags for diagnostics; it must not expose tenant secrets, provider keys, or internal connection strings.

## Frontend pattern

Frontend compile-time flags use `import.meta.env.VITE_FEATURE_*`. These values are bundled into JavaScript and must never contain secrets. Runtime flags may be hydrated from a small authenticated `/v1/ops/features` endpoint when backend support lands.

## Operations

- Add new flags disabled by default.
- Document each flag owner, default, expiry date, and rollback behavior.
- Remove flags after rollout to prevent permanent branching.
