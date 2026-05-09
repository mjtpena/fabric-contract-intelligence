# Microsoft Fabric Platform Context (for FCI)

This file gives an agent just enough Fabric platform knowledge to build FCI correctly.
For depth, see https://learn.microsoft.com/fabric/extensibility-toolkit.

## What is Fabric?

Microsoft Fabric is an integrated SaaS analytics platform whose core fabric primitive is
**OneLake** — a tenant-scoped data lake exposed via the ABFSS protocol
(`abfss://{workspace}@onelake.dfs.fabric.microsoft.com/{lakehouse}.Lakehouse/Tables/{table}`).
Workloads (Lakehouse, Data Warehouse, Power BI, Notebooks, Pipelines) are unified inside the
Fabric portal at https://app.fabric.microsoft.com.

## What is a Workload?

A **Workload** is an extensibility surface that adds new **Item Types** to the Fabric portal.
Workloads consist of:

- A **frontend bundle** (React) hosted by the ISV, loaded inside a sandboxed iframe in the
  Fabric portal, and communicating with the host via the `@ms-fabric/workload-client` SDK
  (`postMessage`-based).
- A **backend service** (any language; we use .NET 8) hosted in the ISV's Azure environment,
  reached by the frontend via direct HTTPS calls.
- A **Workload Manifest** (`WorkloadManifest.json`) declaring item types, icons, capabilities,
  and routes. Published via Self-Service Workload Publishing in the Fabric admin portal.

FCI declares four item types: `Contract`, `ContractPolicy`, `ContractRun`, `ContractReport`.

## Workload SDK essentials

```ts
import { workloadClient } from "@ms-fabric/workload-client";
await workloadClient.init();             // handshake with the host portal
const ctx = await workloadClient.getWorkspaceContext(); // workspace, tenant, capacity ids
const token = await workloadClient.acquireFabricToken({ scopes: [ "FabricRest.Read" ] });
workloadClient.callNotificationOpen({ ... });   // user-visible toast
workloadClient.saveItemDefinition(...);          // persist item state
```

Always wrap the SDK in `frontend/src/hooks/useFabricSdk.ts` so the rest of the app can be
unit-tested without the SDK loaded.

## Authentication & OBO

The Fabric portal hands the workload an **Entra ID access token** scoped to the workload's
Entra app registration. Backend behaviour:

1. Frontend calls FCI API with `Authorization: Bearer {fabricToken}`.
2. `FabricAuthMiddleware` validates the JWT (issuer = `https://sts.windows.net/{tenant}/`,
   audience = FCI API app id).
3. For OneLake access, the API performs an **OBO exchange**:
   `OnBehalfOfCredential(clientId, clientSecret, fabricToken)` → token with
   `https://storage.azure.com/.default` scope.
4. The OBO token is used for ABFSS reads. **Never persist this token.** It is in-memory only.

For Fabric REST control-plane calls, exchange instead for `https://api.fabric.microsoft.com/.default`.

## Activator (Reflex)

Fabric **Activator** (formerly Reflex) is a built-in alerting service. FCI does not deliver
notifications itself — it triggers Activator rules and lets Activator route to Teams,
Email, or webhooks. Trigger endpoint:

```
POST https://api.fabric.microsoft.com/v1/workspaces/{workspaceId}/reflex/rules/{ruleId}/trigger
Authorization: Bearer {fabricToken}
Content-Type: application/json

{ "context": { "contractId": "...", "status": "failed", "breachScore": 78.4, ... } }
```

See `docs/spec.md` §11.

## Where Fabric is *not* a thing

- Fabric does not provide a managed contract enforcement service. (That is FCI's wedge.)
- Fabric does not provide an ODCS parser. (FCI ships one in `FCI.Engine.Odcs`.)
- Fabric does not host arbitrary backend services for ISVs — backends live in the ISV's Azure.

## Toolkit alignment

FCI is *built on* the Microsoft Fabric Extensibility Toolkit but uses its own repo layout
(see `docs/spec.md` §4.3) optimised for an ISV product. We borrow these toolkit patterns:

- The `.ai/` and `.github/copilot-instructions.md` agent guidance pattern.
- Mandatory `ItemEditor` component shape for item editor pages.
- `Tooltip + ToolbarButton` pattern for ribbon actions.
- `homeToolbarActions` (mandatory) + optional `additionalToolbars` ribbon model.
- Theme-aware components via Fluent UI v9 tokens, never hardcoded colours.
- `OneLakeView` component when browsing OneLake folder structures.
