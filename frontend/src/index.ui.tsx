import React from 'react';
import ReactDOM from 'react-dom/client';
import type { InitParams, ItemTabActionContext } from '@ms-fabric/workload-client';
import { createWorkloadClient } from '@ms-fabric/workload-client';
import { setWorkloadClient, getWorkloadClient, navigateTo } from './lib/fabricRuntime';
import { useAppStore } from './store/appStore';
import AppShell from './components/AppShell';
import ErrorBoundary from './components/ErrorBoundary';
import './index.css';

/** Extract workspaceId from a URL string (checks both query params). */
function extractWorkspaceId(url: string): string | null {
  try {
    const qIndex = url.indexOf('?');
    if (qIndex === -1) return null;
    return new URLSearchParams(url.slice(qIndex + 1)).get('workspaceId');
  } catch {
    return null;
  }
}

/**
 * UI iframe initialization — called by bootstrap() when Fabric loads this app
 * in "page" or "panel" mode (the visible user-facing iframe).
 *
 * In standalone/test mode (?__standalone=1) the mock WorkloadClient is already
 * set via setWorkloadClient() before this function runs, so we skip
 * createWorkloadClient() and use whatever client is already installed.
 */
export function initialize(params: InitParams): Promise<void> {
  // In Fabric mode: create the real SDK client after bootstrap has established
  // the postMessage channel. In standalone/test mode: the mock is already set.
  if (!getWorkloadClient()) {
    setWorkloadClient(createWorkloadClient());
  }
  const client = getWorkloadClient()!;

  // ── Extract workspaceId BEFORE React renders ──────────────────────────────
  // Fabric passes workspaceId as a query param in bootstrapPath (and sometimes
  // the current window URL). We prime the Zustand store here so the very first
  // render sees the correct workspaceId — avoids the race where
  // initializeFabricSdk reads it from window.location before replaceState runs.
  const initialWorkspaceId =
    extractWorkspaceId(params.bootstrapPath ?? '') ??
    extractWorkspaceId(window.location.search);

  if (initialWorkspaceId) {
    useAppStore.getState().setWorkspaceId(initialWorkspaceId);
  }

  // If Fabric hinted the initial path via bootstrapPath AND the browser URL is
  // still at '/', navigate to it now so BrowserRouter mounts at the right route.
  if (params.bootstrapPath && window.location.pathname === '/') {
    window.history.replaceState(null, '', params.bootstrapPath);
  }

  // Wire subsequent in-session navigations (e.g., user clicks another item tab).
  // Also capture workspaceId updates from each navigation event.
  client.navigation.onNavigate((route) => {
    const wsId = extractWorkspaceId(route.targetUrl);
    if (wsId) {
      useAppStore.getState().setWorkspaceId(wsId);
    }
    navigateTo(route.targetUrl);
  });

  // Tab lifecycle is handled by the UI iframe; item creation is in index.worker.ts.
  client.action.onAction(async ({ action, data }) => {
    switch (action) {
      case 'item.tab.onInit': {
        const ctx = data as ItemTabActionContext;
        return { title: ctx.id ? 'Contract' : 'Orqentis' };
      }
      case 'item.tab.canDeactivate':
        return { canDeactivate: true };
      case 'item.tab.onDeactivate':
        return {};
      case 'item.tab.canDestroy':
        return { canDestroy: true };
      case 'item.tab.onDestroy':
        return {};
      case 'item.tab.onDelete':
        return {};
      default:
        return {};
    }
  });

  return new Promise<void>((resolve) => {
    const root = document.getElementById('root');
    if (!root) {
      console.error('[Orqentis] Unable to mount UI: #root was not found.');
      resolve();
      return;
    }

    ReactDOM.createRoot(root).render(
      <React.StrictMode>
        <ErrorBoundary>
          <AppShell />
        </ErrorBoundary>
      </React.StrictMode>,
    );
    resolve();
  });
}
