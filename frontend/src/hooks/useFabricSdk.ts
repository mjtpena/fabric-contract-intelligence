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
      saveItemDefinition: async (_definition: string) => undefined,
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
