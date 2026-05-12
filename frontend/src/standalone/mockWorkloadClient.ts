/**
 * Mock WorkloadClientAPI used in standalone / E2E test mode.
 *
 * Enables the React app to mount and render without a real Fabric host.
 * All SDK calls silently no-op or return plausible stub values.
 *
 * NEVER imported in production code — only referenced by src/standalone/index.ts
 * which is only imported when ?__standalone=1 is present in the URL.
 */
import type { WorkloadClientAPI } from '@ms-fabric/workload-client';
import { NotificationType } from '@ms-fabric/workload-client';

const noop = () => {};
const asyncNoop = async () => {};

export function createMockWorkloadClient(): WorkloadClientAPI {
  return {
    auth: {
      acquireFrontendAccessToken: async () => ({ token: 'mock-access-token' }),
      acquireBackendAccessToken: async () => ({ token: 'mock-backend-token' }),
    },
    theme: {
      get: async () => ({
        colorScheme: 'light',
        name: 'Fluent',
      }),
      onChange: noop,
    },
    notification: {
      open: async ({ title, notificationType }: { title: string; notificationType?: NotificationType }) => {
        const prefix = notificationType === NotificationType.Error ? '[ERROR]'
          : notificationType === NotificationType.Success ? '[SUCCESS]'
          : '[INFO]';
        console.info(`${prefix} Toast: ${title}`);
      },
      hide: asyncNoop,
    },
    navigation: {
      navigate: asyncNoop,
      onNavigate: noop,
    },
    action: {
      onAction: (_handler: unknown) => {
        // no-op: no Fabric action events outside iframe
        return noop;
      },
      execute: asyncNoop,
    },
    itemCrud: {
      getItem: async ({ itemId }: { itemId: string }) => ({
        item: {
          description: 'Standalone test item',
          displayName: 'Standalone Test Contract',
          folderId: 'standalone-folder',
          id: itemId,
          tags: [],
          type: 'Org.Orqentis.Contract',
          workspaceId: 'standalone-workspace',
        },
      }),
      getItemDefinition: async ({ itemId }: { itemId: string }) => {
        const persistedState = JSON.stringify({
          contractId: null,
          draft: {
            commitMessage: '',
            description: 'Sample standalone contract',
            name: 'Standalone Test Contract',
            odcsYaml: [
              'dataContractSpecification: 3.1.0',
              `id: ${itemId}`,
              'info:',
              '  title: Standalone Test Contract',
              '  version: 1.0.0',
              '  description: Created in standalone/test mode',
            ].join('\n'),
            ownerEmail: 'test@example.com',
            status: 'draft',
            targetLakehouseId: '00000000-0000-0000-0000-000000000000',
            targetTablePath:
              'abfss://workspace@onelake.dfs.fabric.microsoft.com/Lakehouse.Lakehouse/Tables/test_table',
            version: '1.0.0',
          },
        });

        return {
          definition: {
            format: 'Default',
            parts: [
              {
                path: 'orqentis/item-definition.json',
                payload: btoa(persistedState),
                payloadType: 'InlineBase64',
              },
            ],
          },
        };
      },
      updateItemDefinition: asyncNoop,
      createItem: asyncNoop,
      deleteItem: asyncNoop,
    },
    dialog: {
      open: async () => ({ result: 'cancelled' }),
    },
    panel: {
      open: asyncNoop,
      close: asyncNoop,
    },
    settings: {
      get: async () => ({}),
      set: asyncNoop,
    },
  } as unknown as WorkloadClientAPI;
}
