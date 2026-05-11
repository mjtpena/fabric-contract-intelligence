import React from 'react';
import ReactDOM from 'react-dom/client';
import type { InitParams, ItemTabActionContext } from '@ms-fabric/workload-client';
import { createWorkloadClient } from '@ms-fabric/workload-client';
import { setWorkloadClient, getWorkloadClient, navigateTo } from './lib/fabricRuntime';
import AppShell from './components/AppShell';
import ErrorBoundary from './components/ErrorBoundary';
import './index.css';

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

  // If Fabric hinted the initial path via bootstrapPath AND the browser URL is
  // still at '/', navigate to it now so BrowserRouter mounts at the right route.
  if (params.bootstrapPath && window.location.pathname === '/') {
    window.history.replaceState(null, '', params.bootstrapPath);
  }

  // Wire subsequent in-session navigations (e.g., user clicks another item tab).
  client.navigation.onNavigate((route) => {
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
    ReactDOM.createRoot(document.getElementById('root')!).render(
      <React.StrictMode>
        <ErrorBoundary>
          <AppShell />
        </ErrorBoundary>
      </React.StrictMode>,
    );
    resolve();
  });
}
