# Orqentis Entitlement Process

This process covers Community to Enterprise upgrades until marketplace billing and automated
entitlement APIs are live.

## Customer request

Customers request Enterprise access through `https://fabric.orqentis.com/support.html` and include:

- Customer organization name.
- Microsoft Entra tenant ID.
- Fabric workspace ID or workspace name.
- Billing contact.
- Requested start date and number of workspaces.

## Approval and provisioning

1. Sales or customer success confirms commercial approval.
2. Operations verifies the tenant and workspace IDs against the customer request.
3. Operations records the approval in the release/customer tracker.
4. Operations provisions Enterprise tier through the supported tenant configuration path.
5. Operations confirms the workspace settings page shows Enterprise access and sends the customer
   the onboarding guide.

## Controls

- Default tier is Community.
- Enterprise-only API paths continue to enforce the `[Enterprise]` gate and return HTTP 402 for
  Community tenants.
- No customer secrets are requested for entitlement.
- Offboarding follows `docs/customer-onboarding.md`: export customer artifacts, disable alert
  routes, remove workload items if requested, and soft-delete tenant/workspace records.

## Customer-facing support response

Use this response when a customer asks to upgrade:

> Thanks for requesting Orqentis Enterprise. Please send your Microsoft Entra tenant ID, Fabric
> workspace ID, billing contact, and requested start date. We will verify the workspace, provision
> Enterprise entitlement manually while marketplace billing is in progress, and confirm when the
> workspace is ready.
