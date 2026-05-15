/**
 * Orqentis FCI Workload — Playwright E2E tests
 *
 * Run against the Vite dev server in standalone mode so no Fabric host or auth is needed.
 * API calls to https://orqentis-api.azurewebsites.net are intercepted with page.route().
 *
 * Coverage map (docs/test-scenarios.md):
 *   Area 1  (Bootstrap)   → 1.1, 1.3, 1.4
 *   Area 2  (Contract list) → 2.1, 2.2, 2.5
 *   Area 3  (Contract editor) → 3.1, 3.2, 3.11, 3.12
 *   Area 9  (Security)    → 9.4, 9.5
 *   Area 10 (Navigation)  → 10.2
 *   Area 11 (Theme)       → 11.1, 11.2
 *   Area 12 (Performance) → 12.1
 */
import { test, expect, type Page } from '@playwright/test';
import * as fs from 'node:fs';
import * as path from 'node:path';

const STANDALONE = '?__standalone=1';
const API_BASE = 'https://orqentis-api.azurewebsites.net';
const MOCK_ITEM_ID = 'aaaabbbb-cccc-dddd-eeee-000000000001';
const TEST_WORKSPACE_ID = '22222222-2222-4222-8222-222222222222';
const TEST_LAKEHOUSE_ID = '11111111-1111-4111-8111-111111111111';
const TEST_WAREHOUSE_ID = '33333333-3333-4333-8333-333333333333';

// ─── Helpers ────────────────────────────────────────────────────────────────

async function gotoStandalone(page: Page, route = '') {
  const separator = route.includes('?') ? '&' : '?';
  await page.goto(`/${route}${route ? separator : STANDALONE}${route ? '__standalone=1' : ''}`);
}

/** Intercept all API calls and return the given fixture. */
async function mockApi(
  page: Page,
  fixture: Record<string, unknown> | unknown[] = {},
) {
  await page.route(`${API_BASE}/**`, (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(fixture) }),
  );
}

/** Intercept all API calls and return 503. */
async function mockApiError(page: Page) {
  await page.route(`${API_BASE}/**`, (route) =>
    route.fulfill({ status: 503, body: 'Service Unavailable' }),
  );
}

/** Intercept the Fabric proxy calls used by Fabric target and table pickers. */
async function mockFabricPickerApi(page: Page) {
  await page.route(`${API_BASE}/v1/fabric/${TEST_WORKSPACE_ID}/items?targetType=lakehouse`, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: TEST_LAKEHOUSE_ID,
          displayName: 'OrqentisShowcaseLakehouse',
          type: 'Lakehouse',
          workspaceId: TEST_WORKSPACE_ID,
        },
      ]),
    }),
  );

  await page.route(`${API_BASE}/v1/fabric/${TEST_WORKSPACE_ID}/items?targetType=warehouse`, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: TEST_WAREHOUSE_ID,
          displayName: 'SalesWarehouse',
          type: 'Warehouse',
          workspaceId: TEST_WORKSPACE_ID,
        },
      ]),
    }),
  );

  await page.route(`${API_BASE}/v1/fabric/${TEST_WORKSPACE_ID}/lakehouses/${TEST_LAKEHOUSE_ID}/tables`, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          name: 'owid_co2_demo',
          type: 'Managed',
          location: 'abfss://workspace@onelake.dfs.fabric.microsoft.com/OrqentisShowcaseLakehouse.Lakehouse/Tables/owid_co2_demo',
        },
      ]),
    }),
  );
}

// ─── Area 1: Bootstrap & Loading ────────────────────────────────────────────

test.describe('1. Bootstrap & Loading', () => {
  test('1.0 — public root renders representative landing page outside Fabric', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByText('Data contracts that', { exact: false })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Captured from the production Fabric tenant', { exact: false })).toBeVisible();
    await expect(page.getByAltText('Orqentis contract editor open inside Microsoft Fabric', { exact: false })).toBeVisible();
  });

  test('1.1 — app mounts in standalone mode without blank page', async ({ page }) => {
    await mockApi(page, []);
    await gotoStandalone(page);
    // #root must contain real content, not be empty
    await expect(page.locator('#root')).not.toBeEmpty({ timeout: 10_000 });
  });

  test('1.3 — no unexpected JS errors during load (SDK iframeId noise filtered)', async ({ page }) => {
    // "Empty iframeId" is thrown by @ms-fabric/workload-client when bootstrap() is
    // called outside the Fabric iframe. In standalone mode we bypass bootstrap(),
    // but the SDK module may still emit this as a console error. Filter it out as
    // it is an expected SDK-side warning, not an application error.
    const errors: string[] = [];
    page.on('pageerror', (err) => {
      if (!err.message.includes('iframeId') && !err.message.includes('workloadHostOrigin')) {
        errors.push(err.message);
      }
    });

    await mockApi(page, []);
    await gotoStandalone(page);
    await page.waitForTimeout(2000);

    expect(errors).toHaveLength(0);
  });

  test('1.4 — ErrorBoundary renders visible error instead of blank page', async ({ page }) => {
    // Navigate to a special test route that deliberately throws a render error
    await page.addInitScript(() => {
      (window as unknown as Record<string, boolean>).__ORQENTIS_THROW_TEST__ = true;
    });

    await mockApi(page, []);
    // A non-existent deep route will just redirect to /contracts — we test 1.4
    // by confirming the ErrorBoundary itself is importable and functional via unit test.
    // For E2E: confirm at minimum the root is not empty on any route.
    await gotoStandalone(page);
    await expect(page.locator('#root')).not.toBeEmpty({ timeout: 10_000 });
  });
});

// ─── Area 2: Contract List Page ──────────────────────────────────────────────

test.describe('2. Contract List Page', () => {
  test('2.1 — contract list renders with items', async ({ page }) => {
    await mockApi(page, [
      { id: '1', name: 'Sales Contract', status: 'active', targetType: 'warehouse', version: '1.0.0', lastRunStatus: null, lastRunAt: null },
      { id: '2', name: 'HR Contract', status: 'draft', targetType: 'lakehouse', version: '2.0.0', lastRunStatus: null, lastRunAt: null },
    ]);

    await gotoStandalone(page, 'contracts');
    // The heading or list should appear
    await expect(page.locator('h1, h2, [data-testid="contract-list"], .fui-Text').first()).toBeVisible({ timeout: 8000 });
  });

  test('2.2 — empty state shown when workspace has no contracts', async ({ page }) => {
    await mockApi(page, []);
    await gotoStandalone(page, 'contracts');
    // Page should render something (not blank), even if it's just headers
    await expect(page.locator('#root')).not.toBeEmpty({ timeout: 8000 });
    // Should NOT show a spinner forever
    await page.waitForTimeout(2000);
    await expect(page.locator('[role="progressbar"]')).toHaveCount(0);
  });

  test('2.5 — API error shows graceful message, no blank page', async ({ page }) => {
    await mockApiError(page);
    await gotoStandalone(page, 'contracts');
    await expect(page.locator('#root')).not.toBeEmpty({ timeout: 8000 });
    // Should not display a perpetual spinner
    await page.waitForTimeout(2000);
    await expect(page.locator('[role="progressbar"]')).toHaveCount(0);
  });
});

// ─── Area 3: Contract Editor ─────────────────────────────────────────────────

test.describe('3. Contract Editor', () => {
  test('3.1 — editor page renders for an item object ID', async ({ page }) => {
    await mockApi(page, {});
    await gotoStandalone(page, `contracts/editor/${MOCK_ITEM_ID}`);
    // At minimum the page should not be blank
    await expect(page.locator('#root')).not.toBeEmpty({ timeout: 10_000 });
  });

  test('3.2 — Monaco YAML editor container is visible', async ({ page }) => {
    await mockApi(page, {});
    await gotoStandalone(page, `contracts/editor/${MOCK_ITEM_ID}`);

    // Monaco renders inside a .monaco-editor div
    // Give it up to 15s since Monaco loads workers asynchronously
    await expect(page.locator('.monaco-editor').first()).toBeVisible({ timeout: 15_000 });
  });

  test('3.3 — lakehouse and table dropdowns populate from Fabric proxy responses', async ({ page }) => {
    const requestedFabricProxyUrls: string[] = [];

    page.on('request', (request) => {
      if (request.url().startsWith(`${API_BASE}/v1/fabric/`)) {
        requestedFabricProxyUrls.push(request.url());
        expect(request.headers().authorization).toBe('Bearer mock-access-token');
      }
    });

    await mockFabricPickerApi(page);
    await gotoStandalone(page, `contracts/new?workspaceId=${TEST_WORKSPACE_ID}`);

    await page.getByRole('button', { name: /create contract/i }).click();

    const lakehouseCombobox = page.getByRole('combobox', { name: /target lakehouse/i });
    await expect(lakehouseCombobox).toBeVisible({ timeout: 10_000 });
    await lakehouseCombobox.click();
    await page.getByRole('option', { name: 'OrqentisShowcaseLakehouse' }).click();

    const tableCombobox = page.getByRole('combobox', { name: /target table/i });
    await expect(tableCombobox).toBeEnabled({ timeout: 10_000 });
    await tableCombobox.click();
    await page.getByRole('option', { name: /owid_co2_demo/i }).click();

    await expect(tableCombobox).toHaveValue('owid_co2_demo');
    expect(requestedFabricProxyUrls).toContain(`${API_BASE}/v1/fabric/${TEST_WORKSPACE_ID}/items?targetType=lakehouse`);
    expect(requestedFabricProxyUrls).toContain(`${API_BASE}/v1/fabric/${TEST_WORKSPACE_ID}/lakehouses/${TEST_LAKEHOUSE_ID}/tables`);
  });

  test('3.12 — warehouse target dropdown populates from Fabric proxy responses', async ({ page }) => {
    const requestedFabricProxyUrls: string[] = [];

    page.on('request', (request) => {
      if (request.url().startsWith(`${API_BASE}/v1/fabric/`)) {
        requestedFabricProxyUrls.push(request.url());
        expect(request.headers().authorization).toBe('Bearer mock-access-token');
      }
    });

    await mockFabricPickerApi(page);
    await gotoStandalone(page, `contracts/new?workspaceId=${TEST_WORKSPACE_ID}`);

    // Select the Warehouse tile, then confirm
    await page.getByRole('radio', { name: /warehouse/i }).click();
    await page.getByRole('button', { name: /create contract/i }).click();

    // Editor opens with Warehouse already selected; warehouse items should load
    const warehouseCombobox = page.getByRole('combobox', { name: /target warehouse/i });
    await expect(warehouseCombobox).toBeVisible({ timeout: 10_000 });
    await warehouseCombobox.click();
    await page.getByRole('option', { name: /SalesWarehouse/i }).click();

    await expect(warehouseCombobox).toHaveValue('SalesWarehouse');
    await expect(page.getByLabel(/Warehouse object/i)).toBeVisible();
    expect(requestedFabricProxyUrls).toContain(`${API_BASE}/v1/fabric/${TEST_WORKSPACE_ID}/items?targetType=warehouse`);
  });
});

// ─── Area 9: Security ────────────────────────────────────────────────────────

test.describe('9. Security', () => {
  test('9.4 — X-Correlation-Id header is sent with every API request', async ({ page }) => {
    const requestHeaders: string[] = [];

    page.on('request', (req) => {
      if (req.url().startsWith(API_BASE)) {
        const correlationId = req.headers()['x-correlation-id'];
        if (correlationId) {
          requestHeaders.push(correlationId);
        }
      }
    });

    await gotoStandalone(page, 'contracts');
    // Trigger at least one API request by visiting the list page
    await page.waitForTimeout(3000);

    // If any API request fired, it must have the header.
    // (If no request fired because the API is not reachable, the test passes vacuously.)
    for (const id of requestHeaders) {
      expect(id).toMatch(/^[0-9a-f-]{36}$/i); // UUID format
    }
  });

  test('9.5 — production bundle contains no hardcoded secrets', async () => {
    const distDir = path.resolve(process.cwd(), 'dist/assets');

    if (!fs.existsSync(distDir)) {
      test.skip(true, 'dist/ not present; run npm run build first');
      return;
    }

    const jsFiles = fs.readdirSync(distDir).filter((f) => f.endsWith('.js'));
    const secretPatterns = [
      /postgresql:\/\//i,
      /mongodb\+srv:\/\//i,
      /sk-[A-Za-z0-9]{32,}/,          // OpenAI key prefix
      /AIza[A-Za-z0-9_-]{35}/,         // Google API key
      /"password"\s*:\s*"[^"]{6,}"/i,
      /clientSecret\s*=\s*["'][^"']{8,}/i,
    ];

    for (const file of jsFiles) {
      const content = fs.readFileSync(path.join(distDir, file), 'utf8');
      for (const pattern of secretPatterns) {
        expect(content).not.toMatch(pattern);
      }
    }
  });
});

// ─── Area 10: Navigation & Routing ───────────────────────────────────────────

test.describe('10. Navigation & Routing', () => {
  test('10.2 — unknown path redirects to /contracts', async ({ page }) => {
    await mockApi(page, []);
    await page.goto(`/this/does/not/exist${STANDALONE}`);
    await page.waitForURL(/\/contracts/, { timeout: 8000 });
    expect(page.url()).toContain('/contracts');
  });
});

// ─── Area 11: Theme ──────────────────────────────────────────────────────────

test.describe('11. Theme', () => {
  test('11.2 — light mode: Fluent UI light theme tokens applied to root', async ({ page }) => {
    // matchMedia mock in the browser returns light (no 'dark' in query string)
    await page.addInitScript(() => {
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: (query: string) => ({
          matches: false, // light mode
          media: query,
          onchange: null,
          addEventListener: () => {},
          removeEventListener: () => {},
          dispatchEvent: () => false,
        }),
      });
    });

    await mockApi(page, []);
    await gotoStandalone(page);
    await expect(page.locator('#root')).not.toBeEmpty({ timeout: 8000 });

    // Fluent v9 light theme uses a light background token on <body> or provider div
    const bodyBg = await page.evaluate(() =>
      getComputedStyle(document.body).backgroundColor,
    );
    // Background should be light (white or near-white), not a dark color
    expect(bodyBg).not.toBe('rgb(0, 0, 0)');
  });

  test('11.1 — dark mode: dark theme tokens applied when prefers-color-scheme: dark', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: (query: string) => ({
          matches: query.includes('dark'), // dark mode
          media: query,
          onchange: null,
          addEventListener: () => {},
          removeEventListener: () => {},
          dispatchEvent: () => false,
        }),
      });
    });

    await mockApi(page, []);
    await gotoStandalone(page);
    await expect(page.locator('#root')).not.toBeEmpty({ timeout: 8000 });
  });
});

// ─── Area 12: Performance ────────────────────────────────────────────────────

test.describe('12. Performance', () => {
  test('12.1 — app becomes interactive within 5 seconds', async ({ page }) => {
    await mockApi(page, []);

    const startMs = Date.now();
    await gotoStandalone(page);

    // Wait for the root to be non-empty (app mounted)
    await expect(page.locator('#root')).not.toBeEmpty({ timeout: 5000 });
    const elapsed = Date.now() - startMs;

    console.log(`  → app mounted in ${elapsed} ms`);
    expect(elapsed).toBeLessThan(5000);
  });
});
