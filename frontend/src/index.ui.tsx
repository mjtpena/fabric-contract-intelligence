import React from 'react';
import ReactDOM from 'react-dom/client';
import type { InitParams } from '@ms-fabric/workload-client';
import AppShell from './components/AppShell';
import './index.css';

/**
 * UI iframe initialization — called by bootstrap() when Fabric loads this app
 * in "page" or "panel" mode (the visible user-facing iframe).
 *
 * Renders the React app into the #root element. bootstrap() resolves this promise
 * after the call returns, then sends the Fabric host the "bootstrap complete" signal.
 */
export function initialize(_params: InitParams): Promise<void> {
  return new Promise<void>((resolve) => {
    ReactDOM.createRoot(document.getElementById('root')!).render(
      <React.StrictMode>
        <AppShell />
      </React.StrictMode>,
    );
    // Resolve immediately after mounting; React renders asynchronously.
    resolve();
  });
}
