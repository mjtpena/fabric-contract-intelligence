# @orqentis/pipeline-activity

> Microsoft Fabric Pipeline **write-gate** + cross-platform Node CLI for any
> CI/CD runner. Phase 1 Epic 1.2 of the Orqentis Data Security for AI plan.

Blocks a pipeline / job from writing to a Delta table when its governing
ODCS contract is in a violated state.

---

## Option A — Fabric Pipeline Web Activity (no install)

1. In your Fabric Pipeline, add a **Web Activity** named `Orqentis Contract Gate`.
2. Copy the configuration from [`web-activity.json`](./web-activity.json):
   - **URL**: `@concat(pipeline().globalParameters.orqentisBaseUrl, '/v1/contracts/', pipeline().parameters.contractId)`
   - **Method**: `GET`
   - **Headers**:
     - `X-Api-Key` → `@pipeline().globalParameters.orqentisApiKey`
     - `X-Correlation-Id` → `@pipeline().RunId`
3. Add global parameters `orqentisBaseUrl` and `orqentisApiKey` (the latter as
   a Key Vault reference).
4. Add an **If Condition** activity downstream with this expression:

   ```
   @or(
     equals(toLower(activity('Orqentis Contract Gate').output.status), 'violated'),
     equals(toLower(coalesce(activity('Orqentis Contract Gate').output.lastRunStatus, '')), 'failed')
   )
   ```

5. In the **True** branch, add a **Fail** activity with the message
   `Orqentis contract is in a blocking state — pipeline halted.`

That's the entire gate. No code to deploy.

---

## Option B — Node CLI (`orqentis-gate`)

For GitHub Actions, Azure DevOps, Jenkins, or anywhere Fabric Pipeline's
Web Activity is not available:

```bash
npm install -g @orqentis/pipeline-activity
ORQENTIS_API_URL=https://<your-orqentis-api> \
ORQENTIS_API_KEY=<workspace-api-key> \
  orqentis-gate 9a1f2c3d-0000-0000-0000-000000000001
```

### Exit codes

| Code | Meaning |
|---|---|
| 0 | Contract is OK — proceed |
| 2 | Configuration / invocation error |
| 3 | Contract is in a blocking state (gate triggered) |
| 4 | Transport / API error (and `--allow-offline` was not set) |

### Flags

| Flag | Effect |
|---|---|
| `--allow-offline` | Treat transport errors as pass (default: fail-closed). |
| `--block-status=violated,blocked,archived` | Override blocking contract statuses. |
| `--block-run=failed,blocked` | Override blocking last-run statuses. |

### GitHub Actions example

```yaml
- name: Orqentis contract gate
  env:
    ORQENTIS_API_URL: ${{ secrets.ORQENTIS_API_URL }}
    ORQENTIS_API_KEY: ${{ secrets.ORQENTIS_API_KEY }}
  run: npx -y @orqentis/pipeline-activity orqentis-gate ${{ vars.CONTRACT_ID }}
```

---

## Why fail-closed by default

Following Orqentis' security default (`docs/spec.md` §3.5): an unreachable
API blocks the write. Set `--allow-offline` only when a stale view of
the contract is explicitly acceptable.
