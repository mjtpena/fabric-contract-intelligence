import React from 'react';
import ReactDOM from 'react-dom/client';
import type { InitParams, ItemTabActionContext } from '@ms-fabric/workload-client';
import { fabricWorkloadClient } from './lib/fabricRuntime';
import AppShell from './components/AppShell';
import './index.css';

/**
 * UI iframe initialization — called by bootstrap() when Fabric loads this app
 * in "page" or "panel" mode (the visible user-facing iframe).
 *
 * Registers tab lifecycle action handlers then renders the React app.
 * Navigation (onNavigate) is already wired in fabricRuntime.ts at module load
 * time so that route changes are captured even before this function runs.
 */
export function initialize(_params: InitParams): Promise<void> {
  // Tab lifecycle is handled by the UI iframe; item creation is in index.worker.ts.
  if (fabricWorkloadClient) {
    fabricWorkloadClient.action.onAction(async ({ action, data }) => {
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
  }

  return new Promise<void>((resolve) => {
    ReactDOM.createRoot(document.getElementById('root')!).render(
      <React.StrictMode>
        <AppShell />
      </React.StrictMode>,
    );
    resolve();
  });
}
