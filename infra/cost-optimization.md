# Infrastructure cost operations

## Staging scheduled teardown recommendation

Do not deploy this automation until staging maintenance windows are approved. Use a Logic App with a managed identity that has Contributor on the staging resource group.

Resource graph:

```kusto
Resources
| where resourceGroup =~ '<staging-rg>'
| where type in~ ('microsoft.web/sites', 'microsoft.web/serverfarms', 'microsoft.dbforpostgresql/flexibleservers')
| project id, name, type, location
```

Stop outside business hours:

```powershell
az postgres flexible-server stop --resource-group <staging-rg> --name <pg-server-name>
az webapp stop --resource-group <staging-rg> --name <api-app-name>
```

Start before business hours:

```powershell
az postgres flexible-server start --resource-group <staging-rg> --name <pg-server-name>
az webapp start --resource-group <staging-rg> --name <api-app-name>
```

Keep the App Service Plan because the web app requires it, but autoscale remains disabled in staging and `alwaysOn` is false.

## Reservation / savings plan recommendation

Purchase reservations through Cost Management + Billing, not Bicep:

- App Service: 1-year, no-upfront Azure savings plan sized to steady production `P2v3` Linux App Service Plan usage in Australia East. Apply at shared subscription scope if Orqentis is the only P2v3 workload; otherwise use resource-group scope.
- PostgreSQL Flexible Server: 1-year reserved capacity, no-upfront, `D4ds_v5`, Australia East, matching the production flexible server. Apply at resource-group scope to avoid consuming the reservation with unrelated PostgreSQL servers.

Re-evaluate after 30 days of Application Insights and PostgreSQL metrics. If CPU and memory remain low, downshift to P1v3 / D2ds_v5 before purchasing or renewing capacity.
