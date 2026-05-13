# Orqentis Customer Onboarding and Offboarding

This guide is the customer-facing operational path for public preview and ISV launch.

## Prerequisites

- Microsoft Fabric tenant with workload extensibility enabled.
- Fabric capacity assigned to the target workspace.
- Tenant admin approval for the Orqentis workload package.
- Workspace Admin or Member role for users who create and manage contracts.
- At least one Fabric data product the signed-in user can read: Lakehouse, Warehouse,
  Eventhouse/KQL database, Semantic Model, or Fabric SQL database.

## Tenant onboarding

1. Confirm the customer tenant has approved the Orqentis workload.
2. Assign the Fabric capacity to the target workspace.
3. Open Fabric and create an Orqentis Data Contract item.
4. Select the Fabric target type and target item.
5. For Lakehouse targets, select a Delta table; for other target types, enter the governed
   object path or name.
6. Use AI suggestion where available to create the first ODCS draft, or paste an existing
   ODCS v3.1.0 contract.
7. Save a draft contract and validate ODCS schema.
8. Activate the contract.
9. Run enforcement and confirm a report row appears for the selected target.
10. Review AI breach scoring/remediation where available, then configure policy alert routing
    for Enterprise tenants.

## Enterprise entitlement

Enterprise upgrades are handled manually until marketplace billing is live. Customers should open
`https://fabric.orqentis.com/support.html` and provide the Microsoft Entra tenant ID, Fabric
workspace ID, billing contact, and requested start date. The operational approval and provisioning
steps are documented in `docs/entitlement-process.md`.

## Pilot acceptance test

| Step | Expected outcome |
|---|---|
| Open Orqentis workload item | Iframe loads without a blank page |
| List workspace contracts | Contracts are scoped to the current workspace/tenant |
| Select Fabric target | Target picker supports Lakehouse, Warehouse, Eventhouse/KQL, Semantic Model, and Fabric SQL targets through backend Fabric proxy using OBO |
| Select Lakehouse and table | Lakehouse table dropdowns populate through backend Fabric proxy using OBO |
| Activate contract | Invalid ODCS YAML cannot become active |
| Run enforcement | Run status and report are persisted for Lakehouse, Warehouse, Eventhouse/KQL, Semantic Model, or Fabric SQL targets |
| Bind target metadata | Contracts save with the selected Fabric item and governed object path/name |
| Review AI output | AI-generated suggestions, scoring, remediation, and natural-language query fail safely if model calls are unavailable |
| Trigger policy alert | Alert route records success/failure with correlation ID |

## Offboarding

1. Export required contract YAML, run reports, and policy configuration.
2. Disable or remove alert routes.
3. Remove Orqentis items from customer workspaces if requested.
4. Soft-delete tenant/workspace records through the supported administrative path.
5. Confirm no direct production database access remains for the tenant.

## Support intake

Collect the following before escalation:

- Tenant ID or customer name
- Workspace ID
- Item type and item ID
- Approximate timestamp and timezone
- `X-Correlation-Id` from the browser/API response if available
- Screenshot or exact error text

Support page: `https://fabric.orqentis.com/support.html`
