/**
 * Standalone bootstrap — used when ?__standalone=1 is in the URL.
 *
 * Bypasses the Fabric SDK's bootstrap() (which requires a real Fabric host
 * and postMessage channel) so the React app can be exercised in isolation
 * by Playwright E2E tests and local development without a Fabric workspace.
 *
 * Never imported outside of this context — main.tsx gates on the URL param.
 */
import { createMockWorkloadClient } from './mockWorkloadClient';
import { setWorkloadClient } from '@/lib/fabricRuntime';

export async function bootstrapStandalone(): Promise<void> {
  const searchParams = new URLSearchParams(window.location.search);

  // Simulate Fabric setting the initial path via bootstrapPath.
  const bootstrapPath = searchParams.get('bootstrapPath') ?? '/contracts';
  if (window.location.pathname === '/' || window.location.pathname === '') {
    window.history.replaceState(null, '', bootstrapPath);
  }

  // Install mock client before React mounts (same ordering as real initialize()).
  setWorkloadClient(createMockWorkloadClient());

  // Dynamically import the UI entry so it is excluded from the production bundle.
  const { initialize } = await import('@/index.ui');
  await initialize({
    bootstrapPath,
    environmentName: 'Development',
  } as unknown as Parameters<typeof initialize>[0]);
}
