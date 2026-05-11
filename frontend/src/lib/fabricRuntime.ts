import { createBrowserHistory } from '@remix-run/router';
import { createWorkloadClient } from '@ms-fabric/workload-client';

/**
 * Singleton browser-history instance shared between the router (AppShell)
 * and the Fabric SDK navigation hook. Must be created before React mounts
 * so that onNavigate events received before the first render are not lost.
 */
export const fabricHistory = createBrowserHistory();

/**
 * Singleton workload client created once for the lifetime of the page iframe.
 * Shared between useFabricSdk and the navigation/action registrations in
 * index.ui.tsx so that all SDK interactions use the same channel.
 */
export const fabricWorkloadClient =
  typeof window === 'undefined' ? null : createWorkloadClient();

// Bridge: when Fabric's host sends an onNavigate event (e.g., user clicks a
// Contract item in the workspace list) it provides targetUrl = the manifest
// editor path + "/" + the Fabric objectId, e.g. "/contracts/editor/64aad0c5-...".
// history.replace pushes that URL into React Router so the correct editor mounts.
if (fabricWorkloadClient) {
  fabricWorkloadClient.navigation.onNavigate((route) => {
    fabricHistory.replace(route.targetUrl);
  });
}
