# Orqentis Customer Onboarding and Offboarding

This guide is the customer-facing operational path for public preview and ISV launch.

## Prerequisites

- Microsoft Fabric tenant with workload extensibility enabled.
- Fabric capacity assigned to the target workspace.
- Tenant admin approval for the Orqentis workload package.
- Workspace Admin or Member role for users who create and manage contracts.
- Lakehouse with Delta tables that the signed-in user can read.

## Tenant onboarding

1. Confirm the customer tenant has approved the Orqentis workload.
2. Assign the Fabric capacity to the target workspace.
3. Open Fabric and create an Orqentis Data Contract item.
4. Select a Lakehouse and Delta table.
5. Save a draft contract and validate ODCS schema.
6. Activate the contract.
7. Run enforcement and confirm a report row appears.
8. Configure policy alert routing for Enterprise tenants.

## Pilot acceptance test

| Step | Expected outcome |
|---|---|
| Open Orqentis workload item | Iframe loads without a blank page |
| List workspace contracts | Contracts are scoped to the current workspace/tenant |
| Select Lakehouse and table | Dropdowns populate through backend Fabric proxy using OBO |
| Activate contract | Invalid ODCS YAML cannot become active |
| Run enforcement | Run status and report are persisted |
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
