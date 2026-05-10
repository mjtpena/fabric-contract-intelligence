import { useEffect, useMemo, useState } from 'react';
import {
  NotificationToastDuration,
  NotificationType,
  WorkloadClient,
} from '@ms-fabric/workload-client';
import { useAppStore } from '@/store/appStore';

type ThemeMode = 'dark' | 'light';

interface FabricSdkRuntime {
  isHosted: boolean;
  itemId: string | null;
  themeMode: ThemeMode;
  workspaceId: string;
}

interface FabricSdkState extends FabricSdkRuntime {
  isReady: boolean;
}

const workloadClient = typeof window === 'undefined' ? null : new WorkloadClient();
const initializableWorkloadClient = workloadClient as (WorkloadClient & {
  init?: () => Promise<void>;
}) | null;
let initializationPromise: Promise<FabricSdkRuntime> | null = null;
const ItemDefinitionPath = 'orqentis/item-definition.json';
const InlineBase64PayloadType = 'InlineBase64';

export function useFabricSdk() {
  const correlationId = useAppStore((state) => state.correlationId);
  const setCorrelationId = useAppStore((state) => state.setCorrelationId);
  const workspaceIdInStore = useAppStore((state) => state.workspaceId);
  const setWorkspaceId = useAppStore((state) => state.setWorkspaceId);
  const [state, setState] = useState<FabricSdkState>(() => ({
    isHosted: false,
    isReady: false,
    itemId: null,
    themeMode: getFallbackThemeMode(),
    workspaceId: workspaceIdInStore ?? '',
  }));

  useEffect(() => {
    if (!correlationId) {
      setCorrelationId(createCorrelationId());
    }
  }, [correlationId, setCorrelationId]);

  useEffect(() => {
    let isMounted = true;

    void initializeFabricSdk()
      .then((runtime) => {
        if (!isMounted) {
          return;
        }

        if (runtime.workspaceId) {
          setWorkspaceId(runtime.workspaceId);
        }

        setState({
          ...runtime,
          isReady: true,
        });
      })
      .catch(() => {
        if (!isMounted) {
          return;
        }

        setState((currentState) => ({
          ...currentState,
          isReady: true,
        }));
      });

    return () => {
      isMounted = false;
    };
  }, [setWorkspaceId]);

  return useMemo(
    () => ({
      apiBaseUrl: import.meta.env.VITE_ORQENTIS_API_BASE_URL ?? '',
      correlationId: correlationId ?? '',
      getAccessToken: async () => {
        if (!workloadClient || !state.isHosted) {
          return '';
        }

        try {
          return (await workloadClient.auth.getAccessToken()).token;
        } catch {
          return '';
        }
      },
      isHosted: state.isHosted,
      isReady: state.isReady,
      itemId: state.itemId,
      notifyError: (title: string, message?: string) =>
        openNotification(title, message, NotificationType.Error),
      notifyInfo: (title: string, message?: string) =>
        openNotification(title, message, NotificationType.Info),
      notifySuccess: (title: string, message?: string) =>
        openNotification(title, message, NotificationType.Success),
      loadItemDefinition: async () => {
        if (!state.isHosted || !state.itemId) {
          return null;
        }

        return readItemDefinition(state.itemId);
      },
      saveItemDefinition: async (definition: string) => {
        if (!state.isHosted || !state.itemId) {
          return;
        }

        await persistItemDefinition(state.itemId, definition);
      },
      themeMode: state.themeMode,
      workspaceId: workspaceIdInStore ?? state.workspaceId,
    }),
    [correlationId, state.isHosted, state.isReady, state.itemId, state.themeMode, state.workspaceId, workspaceIdInStore],
  );
}

async function initializeFabricSdk(): Promise<FabricSdkRuntime> {
  if (initializationPromise) {
    return initializationPromise;
  }

  initializationPromise = (async () => {
    const searchParams = typeof window === 'undefined' ? new URLSearchParams() : new URLSearchParams(window.location.search);
    const fallbackRuntime: FabricSdkRuntime = {
      isHosted: false,
      itemId: searchParams.get('itemId'),
      themeMode: getFallbackThemeMode(),
      workspaceId: searchParams.get('workspaceId') ?? '',
    };

    if (!workloadClient) {
      return fallbackRuntime;
    }

    try {
      await initializableWorkloadClient?.init?.();
      const theme = await workloadClient.theme.get();

      return {
        isHosted: true,
        itemId: searchParams.get('itemId'),
        themeMode: getThemeMode(theme.colorScheme, theme.name),
        workspaceId: searchParams.get('workspaceId') ?? '',
      };
    } catch {
      return fallbackRuntime;
    }
  })();

  return initializationPromise;
}

async function openNotification(
  title: string,
  message: string | undefined,
  notificationType: NotificationType,
): Promise<void> {
  if (!workloadClient) {
    return;
  }

  try {
    await workloadClient.notification.open({
      duration: NotificationToastDuration.Medium,
      message,
      notificationType,
      title,
    });
  } catch {
    return;
  }
}

function createCorrelationId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `corr-${Date.now()}`;
}

function getThemeMode(colorScheme?: string, themeName?: string): ThemeMode {
  const rawValue = `${colorScheme ?? ''} ${themeName ?? ''}`.toLowerCase();
  return rawValue.includes('dark') ? 'dark' : 'light';
}

function getFallbackThemeMode(): ThemeMode {
  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  return 'light';
}

type ItemDefinitionPart = {
  path: string;
  payload: string;
  payloadType: string;
};

type ItemDefinition = {
  format: string;
  parts: ItemDefinitionPart[];
};

type ItemCrudClient = {
  getItemDefinition: (params: { itemId: string }) => Promise<{ definition: ItemDefinition }>;
  updateItemDefinition: (params: {
    itemId: string;
    payload: { definition: ItemDefinition };
  }) => Promise<unknown>;
};

function getItemCrudClient(): ItemCrudClient | null {
  const candidate = workloadClient as (WorkloadClient & { itemCrud?: ItemCrudClient }) | null;
  if (!candidate?.itemCrud?.getItemDefinition || !candidate.itemCrud.updateItemDefinition) {
    return null;
  }

  return candidate.itemCrud;
}

async function readItemDefinition(itemId: string): Promise<string | null> {
  const itemCrud = getItemCrudClient();
  if (!itemCrud) {
    return null;
  }

  const result = await itemCrud.getItemDefinition({ itemId });
  const parts = result.definition.parts ?? [];
  if (parts.length === 0) {
    return null;
  }

  const targetPart =
    parts.find((part) => part.path === ItemDefinitionPath)
    ?? parts.find((part) => !part.path.endsWith('.platform'))
    ?? parts[0];

  if (!targetPart?.payload) {
    return null;
  }

  return decodeBase64Utf8(targetPart.payload);
}

async function persistItemDefinition(itemId: string, definitionText: string): Promise<void> {
  const itemCrud = getItemCrudClient();
  if (!itemCrud) {
    return;
  }

  let existingDefinition: ItemDefinition | null = null;

  try {
    const result = await itemCrud.getItemDefinition({ itemId });
    existingDefinition = result.definition;
  } catch {
    existingDefinition = null;
  }

  const payload = encodeBase64Utf8(definitionText);
  const parts = existingDefinition?.parts ? [...existingDefinition.parts] : [];
  const format = existingDefinition?.format ?? 'Default';

  if (parts.length === 0) {
    parts.push({
      path: ItemDefinitionPath,
      payload,
      payloadType: InlineBase64PayloadType,
    });
  } else {
    const partIndex =
      parts.findIndex((part) => part.path === ItemDefinitionPath) >= 0
        ? parts.findIndex((part) => part.path === ItemDefinitionPath)
        : parts.findIndex((part) => !part.path.endsWith('.platform')) >= 0
          ? parts.findIndex((part) => !part.path.endsWith('.platform'))
          : 0;

    const currentPart = parts[partIndex];
    parts[partIndex] = {
      path: currentPart.path || ItemDefinitionPath,
      payload,
      payloadType: InlineBase64PayloadType,
    };
  }

  await itemCrud.updateItemDefinition({
    itemId,
    payload: {
      definition: {
        format,
        parts,
      },
    },
  });
}

function encodeBase64Utf8(value: string): string {
  return btoa(unescape(encodeURIComponent(value)));
}

function decodeBase64Utf8(value: string): string {
  return decodeURIComponent(escape(atob(value)));
}
