import type { WorkloadClientAPI } from '@ms-fabric/workload-client';

/**
 * The live Fabric workload client, set by initialize() in index.ui.tsx
 * AFTER bootstrap() has established the communication channel with the host.
 *
 * Consumers must call getWorkloadClient() at use time (never cache the result
 * at module-load time) because the client does not exist until after bootstrap.
 */
let _workloadClient: WorkloadClientAPI | null = null;

export function setWorkloadClient(client: WorkloadClientAPI): void {
  _workloadClient = client;
}

export function getWorkloadClient(): WorkloadClientAPI | null {
  return _workloadClient;
}

/**
 * Navigate BrowserRouter to targetUrl using the standard popstate bridge.
 *
 * BrowserRouter (from react-router-dom) listens to the 'popstate' window event
 * via its internal createBrowserHistory. Calling replaceState then dispatching
 * a popstate event causes the router to re-render at the new path — no custom
 * History object or unstable APIs required.
 */
export function navigateTo(targetUrl: string): void {
  if (typeof window === 'undefined') return;
  window.history.replaceState(null, '', targetUrl);
  window.dispatchEvent(new PopStateEvent('popstate', { state: window.history.state }));
}
