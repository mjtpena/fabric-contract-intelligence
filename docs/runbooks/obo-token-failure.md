# OBO token failure runbook

## Symptoms

- Sudden 401/403 spikes on OneLake or Fabric REST calls.
- Logs contain `JwtAuth-Failed`, `OBO`, `OneLake`, or token broker failures.
- Customers can load the iframe but contract evaluation cannot read Delta tables.

## Checks

1. Confirm incoming API tokens have the expected audience and tenant issuer.
2. Verify Key Vault is reachable from App Service managed identity.
3. Confirm Entra app client secret or certificate is valid and not expired.
4. Check delegated scopes and admin consent for Fabric/OneLake APIs.
5. Validate clock skew on App Service and token lifetime claims.
6. Search Application Insights by `X-Correlation-Id` to distinguish auth failures from downstream data-plane failures.

## Mitigations

- Rotate the app credential through Key Vault and restart the API slot.
- Re-grant admin consent if scopes were revoked.
- If only one tenant is affected, validate tenant-specific app assignment and workspace permissions.
- Do not switch OneLake data plane access to application identity; OBO is mandatory.
