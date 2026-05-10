import { bootstrap } from '@ms-fabric/workload-client';

// When the Fabric auth flow redirects back via a popup, close the popup window.
const url = new URL(window.location.href);
if (url.pathname?.startsWith('/close')) {
  window.close();
}

/**
 * Entry point for the Orqentis workload frontend.
 *
 * bootstrap() detects whether this iframe is loaded in:
 *   - "worker" mode  → hidden background iframe, receives Fabric action callbacks
 *   - "page"/"panel" → visible iframe, renders the React UI
 *
 * Without calling bootstrap(), Fabric never receives the initialization handshake
 * and leaves the workload stuck in a permanent loading state.
 */
void bootstrap({
  initializeWorker: (params) =>
    import('./index.worker').then(({ initialize }) => initialize(params)),
  initializeUI: (params) =>
    import('./index.ui').then(({ initialize }) => initialize(params)),
});
