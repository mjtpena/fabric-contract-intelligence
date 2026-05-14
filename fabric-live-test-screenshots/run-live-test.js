// Live Fabric workload end-to-end screenshot script.
// Uses the user's existing Chrome profile (logged-in session) via Playwright.
// Saves screenshots to the same directory as this script.

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const OUT_DIR = path.dirname(__filename);
const CHROME_PROFILE = path.join(process.env.LOCALAPPDATA, 'Google', 'Chrome', 'User Data');
const FABRIC_BASE = 'https://app.fabric.microsoft.com';

// Known showcase workspace from prior sessions
const SHOWCASE_WORKSPACE_ID = '8e15a176-ac93-4ed2-9540-818214ab1199';
const API_BASE = 'https://orqentis-production-api.azurewebsites.net';

async function screenshot(page, name) {
  const file = path.join(OUT_DIR, `${name}.png`);
  await page.screenshot({ path: file, fullPage: false });
  console.log(`  [screenshot] ${file}`);
}

async function wait(ms) {
  return new Promise(r => setTimeout(r, ms));
}

(async () => {
  console.log('Launching Chrome with existing profile...');
  const browser = await chromium.launchPersistentContext(CHROME_PROFILE, {
    channel: 'chrome',
    headless: false,
    viewport: { width: 1600, height: 900 },
    args: ['--start-maximized'],
  });

  const page = await browser.newPage();
  page.setDefaultTimeout(60000);

  // ── 1. Fabric home ───────────────────────────────────────────────
  console.log('\n[1] Fabric home');
  await page.goto(FABRIC_BASE, { waitUntil: 'networkidle' });
  await wait(2000);
  await screenshot(page, '01-fabric-home');

  // ── 2. Navigate to showcase workspace ───────────────────────────
  console.log('\n[2] Navigate to showcase workspace');
  await page.goto(`${FABRIC_BASE}/groups/${SHOWCASE_WORKSPACE_ID}`, { waitUntil: 'networkidle' });
  await wait(3000);
  await screenshot(page, '02-workspace-items');

  // ── 3. Open Orqentis workload (look for Contract item) ──────────
  console.log('\n[3] Looking for Orqentis Contract items');
  // Try to find a Contract item card in the workspace
  const contractCard = page.locator('text=OrqentisShowcase').first();
  if (await contractCard.isVisible({ timeout: 10000 }).catch(() => false)) {
    await contractCard.click();
    await wait(3000);
    await screenshot(page, '03-orqentis-item-open');
  } else {
    // Search for any contract items
    await screenshot(page, '03-workspace-no-contract-found');
    console.log('  No contract item found by name, taking workspace screenshot');
  }

  // ── 4. Production API health ─────────────────────────────────────
  console.log('\n[4] Production API health check');
  await page.goto(`${API_BASE}/health/ready`, { waitUntil: 'networkidle' });
  await wait(1000);
  await screenshot(page, '04-api-health-ready');

  // ── 5. API contracts list (authenticated via Fabric token if present) ──
  console.log('\n[5] API /v1/contracts');
  await page.goto(`${API_BASE}/v1/contracts`, { waitUntil: 'networkidle' });
  await wait(1000);
  await screenshot(page, '05-api-contracts-401-or-list');

  // ── 6. Frontend landing ──────────────────────────────────────────
  console.log('\n[6] Frontend at fabric.orqentis.com');
  await page.goto('https://fabric.orqentis.com/', { waitUntil: 'networkidle' });
  await wait(2000);
  await screenshot(page, '06-frontend-landing');

  // ── 7. Go back to workspace and look for any Orqentis items ──────
  console.log('\n[7] Re-check workspace for any Orqentis items');
  await page.goto(`${FABRIC_BASE}/groups/${SHOWCASE_WORKSPACE_ID}`, { waitUntil: 'networkidle' });
  await wait(4000);
  await screenshot(page, '07-workspace-full');

  // Try clicking on first visible item that might be an Orqentis workload item
  const allCards = page.locator('[data-testid="workspace-item-card"], .item-card, [class*="itemCard"], [class*="workspaceItem"]');
  const count = await allCards.count().catch(() => 0);
  console.log(`  Found ${count} item cards`);
  if (count > 0) {
    for (let i = 0; i < Math.min(count, 5); i++) {
      const text = await allCards.nth(i).textContent().catch(() => '');
      console.log(`  Card ${i}: ${text?.substring(0, 80)}`);
    }
  }

  await screenshot(page, '08-workspace-items-detail');

  console.log('\n✅ Done. Screenshots saved to:', OUT_DIR);
  await wait(2000);
  await browser.close();
})().catch(async (err) => {
  console.error('ERROR:', err.message);
  process.exit(1);
});
