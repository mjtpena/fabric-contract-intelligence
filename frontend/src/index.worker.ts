import type { InitParams } from '@ms-fabric/workload-client';
import { createWorkloadClient, ItemLikeV2, NotificationToastDuration, NotificationType, OpenMode } from '@ms-fabric/workload-client';

const WORKLOAD_NAME = 'Org.Orqentis';

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

      case 'RunContractNow':
        return { result: 'success' };

      case 'OpenContractDetail':
        return { result: 'success' };

      default:
        return { result: 'success' };
    }
  });
}
