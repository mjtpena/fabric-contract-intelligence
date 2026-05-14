import type { InitParams, ItemActionContext, ItemLikeV2 } from '@ms-fabric/workload-client';
import { createWorkloadClient, NotificationToastDuration, NotificationType, OpenMode } from '@ms-fabric/workload-client';

const WORKLOAD_NAME = 'Org.Orqentis';
const ITEM_DEFINITION_PATH = 'orqentis/item-definition.json';

/** Maps item type suffix → manifest editor path prefix. */
function editorPathForItemType(itemType: string): string {
  const suffix = itemType.substring(itemType.lastIndexOf('.') + 1);
  switch (suffix) {
    case 'ContractPolicy':
      return '/contracts/policies';
    case 'ContractReport':
      return '/contracts/runs';
    default:
      return '/contracts/editor';
  }
}

interface ItemCreationSuccessData {
  item: ItemLikeV2;
}

interface ItemCreationFailureData {
  errorCode?: string;
  resultCode?: string;
}

interface StoredItemDefinition {
  contractId: string | null;
  draft?: unknown;
}

interface EnqueuedRun {
  runId: string;
  contractId: string;
  status: string;
}

/** Scopes for the Orqentis backend API — mirrors useFabricSdk.getBackendApiScopes(). */
function getApiScopes(): string[] {
  const scope = import.meta.env.VITE_ORQENTIS_API_SCOPE as string | undefined;
  if (scope) return [scope];
  const clientId = import.meta.env.VITE_FABRIC_CLIENT_ID as string | undefined;
  return clientId ? [`api://${clientId}/user_impersonation`] : [];
}

function decodeBase64Utf8(value: string): string {
  return decodeURIComponent(escape(atob(value)));
}

/**
 * Worker iframe initialization — called by bootstrap() when Fabric loads this app
 * in "worker" mode (the invisible background iframe).
 *
 * Handles item lifecycle events (creation, destruction) and context-menu/quick-action
 * callbacks. Tab lifecycle events are handled in index.ui.tsx.
 */
export async function initialize(_params: InitParams): Promise<void> {
  const workloadClient = createWorkloadClient();

  workloadClient.action.onAction(async (message) => {
    switch (message.action) {
      case 'item.onCreationSuccess': {
        const { item } = message.data as ItemCreationSuccessData;
        const editorPath = `${editorPathForItemType(item.itemType)}/${item.objectId}`;
        await workloadClient.page.open({
          workloadName: WORKLOAD_NAME,
          route: { path: editorPath },
          mode: OpenMode.ReplaceAll,
        });
        return { succeeded: true };
      }

      case 'item.onCreationFailure': {
        const { errorCode, resultCode } = message.data as ItemCreationFailureData;
        await workloadClient.notification.open({
          title: 'Error creating item',
          notificationType: NotificationType.Error,
          duration: NotificationToastDuration.Medium,
          message: `Failed to create item — error: ${errorCode ?? 'unknown'}, result: ${resultCode ?? 'unknown'}`,
        });
        return {};
      }

      case 'RunContractNow': {
        const ctx = message.data as ItemActionContext;
        const objectId = ctx.item.objectId;
        const apiBase = (import.meta.env.VITE_ORQENTIS_API_BASE_URL as string | undefined) ?? '';

        try {
          // Acquire a delegated backend API token.
          const tokenResult = await workloadClient.auth.acquireFrontendAccessToken({
            scopes: getApiScopes(),
          });
          const token = tokenResult.token;

          // Retrieve the persisted item definition to find the backend contract UUID.
          let contractId: string | null = null;
          try {
            const defResult = await workloadClient.itemCrud.getItemDefinition({ itemId: objectId });
            const parts = defResult.definition.parts ?? [];
            const part =
              parts.find((p) => p.path === ITEM_DEFINITION_PATH) ??
              parts.find((p) => !p.path.endsWith('.platform')) ??
              parts[0];

            if (part?.payload) {
              const parsed = JSON.parse(decodeBase64Utf8(part.payload)) as StoredItemDefinition;
              contractId = parsed.contractId ?? null;
            }
          } catch {
            // Item definition not yet saved — contract hasn't been persisted.
          }

          if (contractId && token) {
            const correlationId =
              typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
                ? crypto.randomUUID()
                : `corr-${Date.now()}`;

            const response = await fetch(`${apiBase}/v1/contracts/${contractId}/runs`, {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
                'X-Correlation-Id': correlationId,
              },
            });

            if (response.ok) {
              const run = (await response.json()) as EnqueuedRun;
              await workloadClient.notification.open({
                title: 'Enforcement run started',
                notificationType: NotificationType.Success,
                duration: NotificationToastDuration.Medium,
                message: 'Contract enforcement run was queued successfully.',
              });
              await workloadClient.page.open({
                workloadName: WORKLOAD_NAME,
                route: { path: `/contracts/${run.contractId ?? contractId}/runs` },
                mode: OpenMode.ReplaceAll,
              });
              return { result: 'success' };
            }
          }
        } catch {
          // Fall through to navigation fallback.
        }

        // Fallback: open the contract editor so the user can save and run manually.
        await workloadClient.notification.open({
          title: 'Open contract to run',
          notificationType: NotificationType.Info,
          duration: NotificationToastDuration.Medium,
          message: 'Save the contract first, then use the Run Now button in the ribbon.',
        });
        await workloadClient.page.open({
          workloadName: WORKLOAD_NAME,
          route: { path: `/contracts/editor/${objectId}` },
          mode: OpenMode.ReplaceAll,
        });
        return { result: 'success' };
      }

      case 'OpenContractDetail': {
        const ctx = message.data as ItemActionContext;
        const objectId = ctx.item.objectId;
        await workloadClient.page.open({
          workloadName: WORKLOAD_NAME,
          route: { path: `/contracts/editor/${objectId}` },
          mode: OpenMode.ReplaceAll,
        });
        return { result: 'success' };
      }

      default:
        return { result: 'success' };
    }
  });
}
