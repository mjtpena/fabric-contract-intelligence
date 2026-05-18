# orqentis (Python SDK)

> ODCS contract read-gate for Microsoft Fabric notebooks and Spark jobs.
> Phase 1 Epic 1.3 of the Orqentis Data Security for AI plan.

## Install

```bash
pip install orqentis
```

## Quick start

```python
import os
from orqentis import orqentis_gate

os.environ["ORQENTIS_API_URL"] = "https://orqentis-production-api-wpfm376m4v5cu.azurewebsites.net"
os.environ["ORQENTIS_API_KEY"] = "<workspace-api-key>"

@orqentis_gate("9a1f2c3d-0000-0000-0000-000000000001")
def load_claims(spark):
    return spark.read.format("delta").load("Tables/claims")

df = load_claims(spark)
```

If the contract status is `violated`, `blocked`, or `archived`, or its last
enforcement run is `failed` / `blocked`, the call raises
`ContractBlockedError` *before* the function body executes — your notebook
never touches the data.

## Configuration

| Option | Env var | Default |
|---|---|---|
| Base URL | `ORQENTIS_API_URL` | (required) |
| API key | `ORQENTIS_API_KEY` | (required) |
| Timeout | constructor only | `15.0` seconds |
| Fail-closed on transport errors | `allow_offline=False` (decorator arg) | `True` (fail closed) |

## Custom blocking rules

```python
@orqentis_gate(
    contract_id,
    blocking_statuses={"violated", "draft"},      # also block drafts
    blocking_run_statuses={"failed"},             # ignore "blocked" runs
)
def loader():
    ...
```

## Why fail-closed

Following Orqentis' security default (`docs/spec.md` §3.5): if the SDK
cannot reach the API, the read is blocked. Set `allow_offline=True` only
when a notebook is permitted to fall back to a stale view of the contract.

## Development

```bash
cd connector/orqentis-python-sdk
pip install -e .[test]
pytest
```

The SDK has **zero runtime dependencies** so it can ship into locked-down
Fabric Spark pools without dependency-resolution risk.
