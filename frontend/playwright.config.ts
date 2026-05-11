import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E configuration for the Orqentis workload.
 *
 * Tests run against the Vite dev server in standalone mode
 * (?__standalone=1) so they never require a real Fabric host or auth token.
 *
 * To run:  npx playwright test
 * To run against production:  BASE_URL=https://fabric.orqentis.com npx playwright test
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html', { open: 'never' }], ['list']],

  use: {
    baseURL: process.env.BASE_URL ?? 'http://localhost:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  /* Start the Vite dev server before running tests */
  webServer: {
    command: 'npm run dev',
    env: {
      ...process.env,
      VITE_ORQENTIS_API_BASE_URL: 'https://orqentis-api.azurewebsites.net',
    },
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
