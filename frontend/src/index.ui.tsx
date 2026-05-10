import React from 'react';
import ReactDOM from 'react-dom/client';
import { FluentProvider, webDarkTheme, webLightTheme } from '@fluentui/react-components';
import { BrowserRouter } from 'react-router-dom';
import type { InitParams } from '@ms-fabric/workload-client';
import App from './App';
import { useFabricSdk } from './hooks/useFabricSdk';
import './index.css';

function AppShell() {
  const { themeMode } = useFabricSdk();

  return (
    <FluentProvider theme={themeMode === 'dark' ? webDarkTheme : webLightTheme}>
      <BrowserRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
        <App />
      </BrowserRouter>
    </FluentProvider>
  );
}

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
