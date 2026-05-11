import { useEffect, useMemo, useState } from 'react';
import {
  NotificationToastDuration,
  NotificationType,
  PayloadType,
} from '@ms-fabric/workload-client';
import type { ItemDefinition } from '@ms-fabric/workload-client';
import { useAppStore } from '@/store/appStore';
import { getWorkloadClient } from '@/lib/fabricRuntime';

type ThemeMode = 'dark' | 'light';

interface FabricSdkRuntime {
  isHosted: boolean;
  themeMode: ThemeMode;
  workspaceId: string;
}

interface FabricSdkState extends FabricSdkRuntime {
  isReady: boolean;
}

/** Resolved once per page lifetime — reset is not needed because the client never changes. */
let initializationPromise: Promise<FabricSdkRuntime> | null = null;

const ItemDefinitionPath = 'orqentis/item-definition.json';

export function useFabricSdk() {
  const correlationId = useAppStore((state) => state.correlationId);
  const setCorrelationId = useAppStore((state) => state.setCorrelationId);
  const workspaceIdInStore = useAppStore((state) => state.workspaceId);
  const setWorkspaceId = useAppStore((state) => state.setWorkspaceId);
  const [state, setState] = useState<FabricSdkState>(() => ({
    isHosted: false,
    isReady: false,
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

        setState({
          ...runtime,
          isReady: true,
        });

        if (runtime.workspaceId) {
          setWorkspaceId(runtime.workspaceId);
        }
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
        const client = getWorkloadClient();
        if (!client || !state.isHosted) {
          return '';
        }

        try {
          const result = await client.auth.acquireFrontendAccessToken({ scopes: [] });
          return result.token;
        } catch {
          return '';
        }
      },
      /** Token scoped to api.fabric.microsoft.com — use for Fabric REST API calls (list lakehouses, tables, etc.). */
      getFabricApiToken: async () => {
        const client = getWorkloadClient();
        if (!client || !state.isHosted) {
          return '';
        }

        try {
          const result = await client.auth.acquireFrontendAccessToken({
            scopes: ['https://api.fabric.microsoft.com/.default'],
          });
          return result.token;
        } catch {
          return '';
        }
      },
      isHosted: state.isHosted,
      isReady: state.isReady,
      notifyError: (title: string, message?: string) =>
        openNotification(title, message, NotificationType.Error),
      notifyInfo: (title: string, message?: string) =>
        openNotification(title, message, NotificationType.Info),
      notifySuccess: (title: string, message?: string) =>
        openNotification(title, message, NotificationType.Success),
      /** Load item definition using the Fabric objectId from the route param. */
      loadItemDefinition: async (fabricItemId: string) => {
        if (!state.isHosted || !fabricItemId) {
          return null;
        }

        return readItemDefinition(fabricItemId);
      },
      /** Persist item definition using the Fabric objectId from the route param. */
      saveItemDefinition: async (fabricItemId: string, definition: string) => {
        if (!state.isHosted || !fabricItemId) {
          return;
        }

        await persistItemDefinition(fabricItemId, definition);
      },
      themeMode: state.themeMode,
      workspaceId: workspaceIdInStore ?? state.workspaceId,
    }),
    [correlationId, state.isHosted, state.isReady, state.themeMode, state.workspaceId, workspaceIdInStore],
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
      themeMode: getFallbackThemeMode(),
      workspaceId: searchParams.get('workspaceId') ?? '',
    };

    const client = getWorkloadClient();
    if (!client) {
      return fallbackRuntime;
    }

    try {
      const theme = await client.theme.get();

      return {
        isHosted: true,
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
  const client = getWorkloadClient();
  if (!client) {
    return;
  }

  try {
    await client.notification.open({
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

async function readItemDefinition(itemId: string): Promise<string | null> {
  const client = getWorkloadClient();
  if (!client) {
    return null;
  }

  const result = await client.itemCrud.getItemDefinition({ itemId });
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
  const client = getWorkloadClient();
  if (!client) {
    return;
  }

  let existingDefinition: ItemDefinition | null = null;

  try {
    const result = await client.itemCrud.getItemDefinition({ itemId });
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
      payloadType: PayloadType.InlineBase64,
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
      path: currentPart?.path || ItemDefinitionPath,
      payload,
      payloadType: PayloadType.InlineBase64,
    };
  }

  await client.itemCrud.updateItemDefinition({
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

