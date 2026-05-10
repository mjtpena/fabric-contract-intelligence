import type { InitParams } from '@ms-fabric/workload-client';
import { createWorkloadClient } from '@ms-fabric/workload-client';

/**
 * Worker iframe initialization — called by bootstrap() when Fabric loads this app
 * in "worker" mode (the invisible background iframe).
 *
 * The worker iframe receives action callbacks from the Fabric host (item lifecycle
 * events, context-menu actions, quick-action items, etc.).
 */
export async function initialize(_params: InitParams): Promise<void> {
  const workloadClient = createWorkloadClient();

  workloadClient.action.onAction(async (message) => {
    switch (message.action) {
      // Item editor tab lifecycle (defined in ContractItem.json editorTab)
      case 'item.tab.onDeactivate':
      case 'item.tab.canDeactivate':
      case 'item.tab.canDestroy':
      case 'item.tab.onDestroy':
      case 'item.tab.onDelete':
        return { result: 'success' };

      // Item creation dialog callbacks
      case 'item.onCreationSuccess':
      case 'item.onCreationFailure':
        return { result: 'success' };

      // Quick-action: run contract now (triggered from workspace item row)
      case 'RunContractNow':
        return { result: 'success' };

      // Context-menu: open contract detail
      case 'OpenContractDetail':
        return { result: 'success' };

      default:
        return { result: 'success' };
    }
  });
}
