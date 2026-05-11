import { bootstrap } from '@ms-fabric/workload-client';

// When the Fabric auth flow redirects back via a popup, close the popup window.
const url = new URL(window.location.href);
if (url.pathname?.startsWith('/close')) {
  window.close();
}

/**
 * Standalone mode: ?__standalone=1 bypasses Fabric bootstrap entirely.
 *
 * Intended for Playwright E2E tests and local dev without a Fabric workspace.
 * A mock WorkloadClientAPI is installed so the React app renders normally.
 * This code path is NEVER reached in production (Fabric never adds this param).
 */
if (url.searchParams.get('__standalone') === '1') {
  void import('./standalone').then(({ bootstrapStandalone }) => bootstrapStandalone());
} else {
  /**
   * Production path: bootstrap() detects whether this iframe is loaded in:
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
}
