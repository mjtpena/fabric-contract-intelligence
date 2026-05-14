/**
 * Comprehensive screenshot capture for Orqentis / FCI workload.
 *
 * Captures evidence for ALL features:
 *   - Public landing page
 *   - Contract list (with mock data)
 *   - Contract editor (Monaco YAML)
 *   - Contract detail
 *   - Enforcement run history
 *   - Policy editor
 *   - AI Suggest page
 *   - NL Query page
 *   - Alerts dashboard
 *   - Workspace settings
 *   - Backend API health
 *   - Fabric portal (workload hub)
 *
 * Run:  node scripts/capture-screenshots.mjs
 */

import { chromium } from 'playwright';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..');
const OUT_DIR = join(REPO_ROOT, 'fabric-live-test-screenshots', 'comprehensive');
// Allow local build override: CAPTURE_BASE_URL=http://localhost:4173 node capture-screenshots.mjs
const PROD_URL  = process.env.CAPTURE_BASE_URL || 'https://fabric.orqentis.com';
const API_URL   = 'https://orqentis-production-api.azurewebsites.net';

mkdirSync(OUT_DIR, { recursive: true });

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_CONTRACTS = [
  {
    id: 'c1000000-0000-0000-0000-000000000001',
    name: 'Healthcare Patient Records Contract',
    version: '2.1.0',
    status: 'active',
    ownerEmail: 'data-governance@orqentis.com',
    targetType: 'lakehouse',
    targetLakehouseId: 'lh-001',
    targetTablePath: 'abfss://showcase@onelake.dfs.fabric.microsoft.com/Showcase.Lakehouse/Tables/patient_records',
    createdAt: '2025-11-01T09:00:00Z',
    updatedAt: '2026-04-15T14:22:00Z',
    lastRunAt: '2026-05-14T18:00:00Z',
    lastRunStatus: 'passed',
  },
  {
    id: 'c2000000-0000-0000-0000-000000000002',
    name: 'Financial Transactions Contract',
    version: '1.3.0',
    status: 'active',
    ownerEmail: 'finance-data@orqentis.com',
    targetType: 'lakehouse',
    targetLakehouseId: 'lh-002',
    targetTablePath: 'abfss://showcase@onelake.dfs.fabric.microsoft.com/Showcase.Lakehouse/Tables/transactions',
    createdAt: '2025-12-10T11:00:00Z',
    updatedAt: '2026-03-28T09:10:00Z',
    lastRunAt: '2026-05-14T18:00:00Z',
    lastRunStatus: 'failed',
  },
  {
    id: 'c3000000-0000-0000-0000-000000000003',
    name: 'Supply Chain Inventory Contract',
    version: '1.0.0',
    status: 'draft',
    ownerEmail: 'ops@orqentis.com',
    targetType: 'lakehouse',
    targetLakehouseId: 'lh-003',
    targetTablePath: 'abfss://showcase@onelake.dfs.fabric.microsoft.com/Showcase.Lakehouse/Tables/inventory',
    createdAt: '2026-01-20T08:00:00Z',
    updatedAt: '2026-02-14T17:00:00Z',
    lastRunAt: null,
    lastRunStatus: null,
  },
];

const MOCK_CONTRACT_DETAIL = {
  id: 'c1000000-0000-0000-0000-000000000001',
  name: 'Healthcare Patient Records Contract',
  description: 'ODCS data contract enforcing schema, quality, and access rules for the patient_records Delta table in the Orqentis Showcase Lakehouse.',
  version: '2.1.0',
  status: 'active',
  ownerEmail: 'data-governance@orqentis.com',
  targetType: 'lakehouse',
  targetItemId: 'lh-001',
  targetLakehouseId: 'lh-001',
  targetTablePath: 'abfss://showcase@onelake.dfs.fabric.microsoft.com/Showcase.Lakehouse/Tables/patient_records',
  aiSuggested: false,
  createdBy: 'michael@orqentis.com',
  createdAt: '2025-11-01T09:00:00Z',
  updatedAt: '2026-04-15T14:22:00Z',
  odcsYaml: `dataContractSpecification: 3.1.0
id: c1000000-0000-0000-0000-000000000001
info:
  title: Healthcare Patient Records Contract
  version: 2.1.0
  description: >
    ODCS data contract enforcing schema, quality, and access rules
    for the patient_records Delta table in the Orqentis Showcase Lakehouse.
  owner: data-governance@orqentis.com
  contact:
    name: Orqentis Data Governance
    email: data-governance@orqentis.com

servers:
  - type: azure
    project: OrqentisShowcase
    dataset: Showcase
    path: patient_records

models:
  patient_records:
    description: Core patient demographics and admission records.
    type: table
    fields:
      patient_id:
        type: string
        required: true
        unique: true
        description: UUID primary key
      first_name:
        type: string
        required: true
      last_name:
        type: string
        required: true
      date_of_birth:
        type: date
        required: true
      admission_date:
        type: timestamp
        required: true
      discharge_date:
        type: timestamp
        required: false
      diagnosis_code:
        type: string
        required: true
        pattern: "^[A-Z][0-9]{2}(\\\\.[0-9]{1,4})?$"
      is_active:
        type: boolean
        required: true

quality:
  type: SodaCL
  specification:
    checks for patient_records:
      - row_count > 0
      - duplicate_count(patient_id) = 0
      - missing_count(patient_id) = 0
      - missing_count(first_name) = 0
      - missing_percent(diagnosis_code) < 5
`,
};

const MOCK_RUNS = [
  {
    id: 'r1000000-0000-0000-0000-000000000001',
    contractId: 'c1000000-0000-0000-0000-000000000001',
    versionId: 'v2',
    status: 'passed',
    triggeredBy: 'user',
    triggeredAt: '2026-05-14T18:00:00Z',
    completedAt: '2026-05-14T18:00:47Z',
    correlationId: 'corr-001',
    activatorTriggered: false,
    deltaTableVersion: 42,
    breachScore: 0.0,
    resultJson: {
      contractId: 'c1000000-0000-0000-0000-000000000001',
      runId: 'r1000000-0000-0000-0000-000000000001',
      tableVersion: 42,
      overallStatus: 'passed',
      schemaRules: [
        { ruleId: 'schema.column.present', status: 'passed', message: 'All 9 columns present', actual: 9 },
        { ruleId: 'schema.column.type', status: 'passed', message: 'All column types match contract', actual: null },
        { ruleId: 'schema.column.required', status: 'passed', message: 'Required columns: no nulls found', actual: null },
      ],
      qualityRules: [
        { ruleId: 'quality.row_count.min', status: 'passed', message: 'Row count 48,291 exceeds threshold 0', actual: 48291, threshold: 0 },
        { ruleId: 'quality.unique', column: 'patient_id', status: 'passed', message: '0 duplicates found', actual: 0 },
        { ruleId: 'quality.not_null', column: 'first_name', status: 'passed', message: 'No null values', actual: 0 },
        { ruleId: 'quality.pattern', column: 'diagnosis_code', status: 'passed', message: 'ICD-10 pattern matched (0 violations)', actual: 0 },
      ],
      freshnessRule: { ruleId: 'freshness.max_age', status: 'passed', message: 'Table age 2.4 hours < 24 hours', ageHours: 2.4, maxAgeHours: 24 },
      schemaDiff: { addedColumns: [], removedColumns: [], typeChanges: [], nullabilityChanges: [] },
      breachScore: 0.0,
      remediationSuggestions: [],
      completedAt: '2026-05-14T18:00:47Z',
    },
  },
  {
    id: 'r2000000-0000-0000-0000-000000000002',
    contractId: 'c2000000-0000-0000-0000-000000000002',
    versionId: 'v1',
    status: 'failed',
    triggeredBy: 'scheduled',
    triggeredAt: '2026-05-14T18:00:00Z',
    completedAt: '2026-05-14T18:01:12Z',
    correlationId: 'corr-002',
    activatorTriggered: true,
    deltaTableVersion: 17,
    breachScore: 0.82,
    resultJson: {
      contractId: 'c2000000-0000-0000-0000-000000000002',
      runId: 'r2000000-0000-0000-0000-000000000002',
      tableVersion: 17,
      overallStatus: 'failed',
      schemaRules: [
        { ruleId: 'schema.column.present', status: 'failed', message: 'Missing column: currency_code (expected string NOT NULL)', actual: null, expected: 'string' },
      ],
      qualityRules: [
        { ruleId: 'quality.not_null', column: 'amount', status: 'failed', message: '247 null values found (threshold: 0)', actual: 247, threshold: 0 },
        { ruleId: 'quality.row_count.min', status: 'passed', message: 'Row count 129,403 exceeds threshold 0', actual: 129403, threshold: 0 },
        { ruleId: 'quality.unique', column: 'transaction_id', status: 'passed', message: '0 duplicates found', actual: 0 },
      ],
      freshnessRule: null,
      schemaDiff: { addedColumns: [], removedColumns: ['currency_code'], typeChanges: [], nullabilityChanges: [] },
      breachScore: 0.82,
      remediationSuggestions: [
        'Add `currency_code` column (VARCHAR NOT NULL) to the `transactions` table.',
        'Backfill null `amount` values before re-activating the contract.',
      ],
      completedAt: '2026-05-14T18:01:12Z',
    },
  },
];

const MOCK_ALERTS = [
  {
    runId: 'r2000000-0000-0000-0000-000000000002',
    contractId: 'c2000000-0000-0000-0000-000000000002',
    contractName: 'Financial Transactions Contract',
    status: 'failed',
    triggeredBy: 'scheduled',
    triggeredAt: '2026-05-14T18:00:00Z',
    completedAt: '2026-05-14T18:01:12Z',
    deltaTableVersion: 17,
    breachScore: 0.82,
    correlationId: 'corr-002',
  },
  {
    runId: 'r1000000-0000-0000-0000-000000000001',
    contractId: 'c1000000-0000-0000-0000-000000000001',
    contractName: 'Healthcare Patient Records Contract',
    status: 'passed',
    triggeredBy: 'user',
    triggeredAt: '2026-05-14T18:00:00Z',
    completedAt: '2026-05-14T18:00:47Z',
    deltaTableVersion: 42,
    breachScore: 0.0,
    correlationId: 'corr-001',
  },
];

const MOCK_POLICY = {
  id: 'p1000000-0000-0000-0000-000000000001',
  name: 'Healthcare Compliance Policy',
  contractId: 'c1000000-0000-0000-0000-000000000001',
  triggerOnFailure: true,
  notifyEmails: ['data-governance@orqentis.com', 'compliance@orqentis.com'],
  activatorEndpoint: 'https://westus.api.fabric.microsoft.com/v1/workspaces/ws-001/activator/items/act-001',
  createdAt: '2025-11-01T10:00:00Z',
};

const MOCK_AI_SUGGESTION = `dataContractSpecification: 3.1.0
id: ai-generated-contract
info:
  title: AI-Generated Supply Chain Contract
  version: 1.0.0
  description: >
    AI-generated ODCS contract based on supply chain inventory data.
    Enforces schema integrity, freshness, and quality thresholds.
  owner: ops@orqentis.com

models:
  inventory:
    description: Supply chain inventory snapshot table.
    type: table
    fields:
      sku_id:
        type: string
        required: true
        unique: true
      product_name:
        type: string
        required: true
      quantity_on_hand:
        type: integer
        required: true
        minimum: 0
      reorder_level:
        type: integer
        required: true
      last_updated:
        type: timestamp
        required: true

quality:
  type: SodaCL
  specification:
    checks for inventory:
      - row_count > 0
      - duplicate_count(sku_id) = 0
      - missing_count(sku_id) = 0
      - values in (quantity_on_hand) >= 0
      - freshness(last_updated) < 24h
`;

const MOCK_NL_RESULTS = {
  query: 'Which contracts failed enforcement in the last 7 days?',
  sql: "SELECT c.name, r.status, r.started_at FROM enforcement_runs r JOIN contracts c ON r.contract_id = c.id WHERE r.status = 'failed' AND r.started_at > NOW() - INTERVAL '7 days' ORDER BY r.started_at DESC",
  results: [
    { name: 'Financial Transactions Contract', status: 'failed', started_at: '2026-05-14T18:00:00Z' },
  ],
  interpretation: 'Found 1 contract with failed enforcement runs in the last 7 days.',
};

const MOCK_WORKSPACE = {
  id: 'ws-001',
  name: 'Orqentis Showcase Workspace',
  capacityId: 'cap-1778375300',
  region: 'West US',
  contractCount: 3,
  activePolicies: 1,
  lastEnforcementAt: '2026-05-14T18:01:12Z',
};

// ─── Utility ──────────────────────────────────────────────────────────────────

async function screenshot(page, filename, opts = {}) {
  const { fullPage = false, waitMs = 800 } = opts;
  await page.waitForTimeout(waitMs);
  const path = join(OUT_DIR, filename);
  await page.screenshot({ path, fullPage });
  console.log(`  ✓  ${filename}`);
  return path;
}

async function installApiMocks(page) {
  const API = API_URL;

  // Broad catch-all: intercept ALL requests to the API and route them
  await page.route(`${API}/**`, async (route) => {
    const url = route.request().url();
    const method = route.request().method();
    const path = url.replace(API, '').split('?')[0];

    // ── Contracts ─────────────────────────────────────────────────
    if (path === '/v1/contracts' && method === 'GET') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_CONTRACTS) });
    }
    if (path === '/v1/contracts' && method === 'POST') {
      return route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ ...MOCK_CONTRACT_DETAIL, id: 'c-new-id' }) });
    }
    if (path.match(/^\/v1\/contracts\/[^/]+$/) && method === 'GET') {
      const id = path.split('/').pop();
      const contract = MOCK_CONTRACTS.find(c => c.id.startsWith(id?.substring(0, 4) ?? '')) ?? MOCK_CONTRACT_DETAIL;
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ...MOCK_CONTRACT_DETAIL, ...contract }) });
    }
    if (path.match(/^\/v1\/contracts\/[^/]+$/) && (method === 'PUT' || method === 'PATCH')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_CONTRACT_DETAIL) });
    }
    if (path.match(/^\/v1\/contracts\/[^/]+$/) && method === 'DELETE') {
      return route.fulfill({ status: 204 });
    }

    // ── Contract versions ─────────────────────────────────────────
    if (path.match(/^\/v1\/contracts\/[^/]+\/versions$/)) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([
        { id: 'v1', contractId: MOCK_CONTRACT_DETAIL.id, version: '2.0.0', createdAt: '2026-01-01T00:00:00Z', odcsYaml: '' },
        { id: 'v2', contractId: MOCK_CONTRACT_DETAIL.id, version: '2.1.0', createdAt: '2026-04-15T00:00:00Z', odcsYaml: MOCK_CONTRACT_DETAIL.odcsYaml },
      ]) });
    }

    // ── Contract runs ─────────────────────────────────────────────
    if (path.match(/^\/v1\/contracts\/[^/]+\/runs$/) && method === 'GET') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_RUNS) });
    }
    if (path.match(/^\/v1\/contracts\/[^/]+\/runs$/) && method === 'POST') {
      return route.fulfill({ status: 202, contentType: 'application/json', body: JSON.stringify({ runId: 'r-new', contractId: MOCK_CONTRACT_DETAIL.id, status: 'queued' }) });
    }

    // ── Individual run ────────────────────────────────────────────
    if (path.match(/^\/v1\/runs\/[^/]+$/) && method === 'GET') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_RUNS[0]) });
    }

    // ── Reports / audit ───────────────────────────────────────────
    if (path === '/v1/reports/audit') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_ALERTS) });
    }

    // ── Workspaces ────────────────────────────────────────────────
    if (path === '/v1/workspaces') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([MOCK_WORKSPACE]) });
    }

    // ── Activator rules ───────────────────────────────────────────
    if (path === '/v1/activator/rules') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([
        { id: 'rule-001', name: 'Notify Data Owner', description: 'Send email notification to data owner when breach detected', actionType: 'notify' },
        { id: 'rule-002', name: 'Teams Alert', description: 'Post alert to Microsoft Teams channel', actionType: 'webhook' },
        { id: 'rule-003', name: 'Block Pipeline', description: 'Halt downstream data pipeline via Fabric Activator', actionType: 'activator' },
      ]) });
    }

    // ── Policies ──────────────────────────────────────────────────
    if (path === '/v1/policies' && method === 'POST') {
      return route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(MOCK_POLICY) });
    }
    if (path.match(/^\/v1\/policies/)) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([MOCK_POLICY]) });
    }

    // ── AI ────────────────────────────────────────────────────────
    if (path === '/v1/ai/suggest-contract') {
      await new Promise(r => setTimeout(r, 800));
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
        odcsYaml: MOCK_AI_SUGGESTION,
        rationale: ['Inferred schema from column names', 'Detected PHI data patterns', 'Applied ODCS v3.1.0 freshness defaults'],
        modelUsed: 'gpt-4o',
        latencyMs: 812,
      }) });
    }
    if (path === '/v1/ai/query') {
      await new Promise(r => setTimeout(r, 500));
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_NL_RESULTS) });
    }

    // ── Federation ────────────────────────────────────────────────
    if (path.startsWith('/v1/federation')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ items: [], nextCursor: null }) });
    }

    // ── Health ────────────────────────────────────────────────────
    if (path.startsWith('/health')) {
      return route.continue(); // Let health endpoints pass through
    }

    // ── Swagger ───────────────────────────────────────────────────
    if (path.startsWith('/swagger')) {
      return route.continue();
    }

    // Catch-all: return empty 200 so no 401 bleeds through
    console.warn(`  [mock] Unhandled ${method} ${path} → 200 {}`);
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
}

async function goStandalone(page, path, opts = {}) {
  const { waitForSelector } = opts;
  const url = `${PROD_URL}/?__standalone=1&bootstrapPath=${encodeURIComponent(path)}`;
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
  if (waitForSelector) {
    await page.waitForSelector(waitForSelector, { timeout: 10000 }).catch(() => {});
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const browser = await chromium.launch({ headless: true });

const manifest = [];

async function capture(label, fn) {
  console.log(`\n📷  ${label}`);
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 800 });
  const files = [];
  try {
    await fn(page, files);
  } catch (err) {
    console.error(`  ✗ ERROR in "${label}":`, err.message);
    const errFile = `error-${label.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.png`;
    await page.screenshot({ path: join(OUT_DIR, errFile), fullPage: false }).catch(() => {});
    files.push(errFile);
  } finally {
    await page.close();
  }
  manifest.push({ label, files });
}

// ══════════════════════════════════════════════════════════════════════════════
// 1. PUBLIC LANDING PAGE
// ══════════════════════════════════════════════════════════════════════════════

await capture('1. Public Landing Page — Hero', async (page, files) => {
  await page.goto(PROD_URL, { waitUntil: 'networkidle', timeout: 20000 });
  await page.waitForTimeout(500);
  files.push(await screenshot(page, '01a-landing-hero.png', { fullPage: false }));
  files.push(await screenshot(page, '01b-landing-full.png', { fullPage: true, waitMs: 300 }));
});

// ══════════════════════════════════════════════════════════════════════════════
// 2. BACKEND API HEALTH
// ══════════════════════════════════════════════════════════════════════════════

await capture('2. Backend API — Health Endpoints', async (page, files) => {
  await page.goto(`${API_URL}/health/ready`, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(600);
  files.push(await screenshot(page, '02a-api-health-ready.png'));

  await page.goto(`${API_URL}/health/live`, { waitUntil: 'domcontentloaded', timeout: 15000 });
  files.push(await screenshot(page, '02b-api-health-live.png'));
});

// ══════════════════════════════════════════════════════════════════════════════
// 3. CONTRACT LIST PAGE
// ══════════════════════════════════════════════════════════════════════════════

await capture('3. Contract List Page', async (page, files) => {
  await installApiMocks(page);
  await goStandalone(page, '/contracts', { waitForSelector: '[data-testid="contract-list"], .fui-DataGrid, h2' });
  await page.waitForTimeout(1200);
  files.push(await screenshot(page, '03a-contract-list.png'));

  // Scroll down if there are more contracts
  await page.evaluate(() => window.scrollTo(0, 300));
  files.push(await screenshot(page, '03b-contract-list-scrolled.png', { waitMs: 400 }));
});

// ══════════════════════════════════════════════════════════════════════════════
// 4. CONTRACT EDITOR — New Contract
// ══════════════════════════════════════════════════════════════════════════════

await capture('4. Contract Editor — New Contract', async (page, files) => {
  await installApiMocks(page);
  await goStandalone(page, '/contracts/new', { waitForSelector: '.fui-Button, h2' });
  // Click "Start drafting" to open the Monaco editor
  const btns = await page.$$('button');
  for (const btn of btns) {
    const txt = await btn.textContent().catch(() => '');
    if (txt?.includes('Start drafting')) { await btn.click(); break; }
  }
  // Wait up to 30s for Monaco to fully render (uses local bundle, not CDN)
  await page.waitForSelector('.monaco-editor .view-lines', { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(1000);
  files.push(await screenshot(page, '04a-contract-editor-new.png'));

  // Scroll to Monaco view-lines using JS (avoids Playwright stability error with automaticLayout)
  const monacoLines = await page.$('.monaco-editor .view-lines');
  if (monacoLines) {
    await page.evaluate((el) => el.scrollIntoView({ behavior: 'instant', block: 'center' }), monacoLines);
    await page.waitForTimeout(800);
    files.push(await screenshot(page, '04b-contract-editor-monaco.png'));
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// 5. CONTRACT EDITOR — Existing Contract (via Fabric item route)
// ══════════════════════════════════════════════════════════════════════════════

await capture('5. Contract Editor — Fabric Item (loaded)', async (page, files) => {
  await installApiMocks(page);
  const itemObjectId = 'c1000000-0000-0000-0000-000000000001';
  await goStandalone(page, `/contracts/editor/${itemObjectId}`, { waitForSelector: 'h2, .fui-Title2' });
  // Wait up to 30s for Monaco to fully render (uses local bundle, not CDN)
  await page.waitForSelector('.monaco-editor .view-lines', { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(1000);
  files.push(await screenshot(page, '05a-contract-editor-fabric-item.png'));

  // Scroll to Monaco view-lines using JS (avoids Playwright stability error with automaticLayout)
  const monacoLines = await page.$('.monaco-editor .view-lines');
  if (monacoLines) {
    await page.evaluate((el) => el.scrollIntoView({ behavior: 'instant', block: 'center' }), monacoLines);
    await page.waitForTimeout(1000);
    files.push(await screenshot(page, '05b-contract-editor-monaco-yaml.png'));
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// 6. CONTRACT DETAIL PAGE
// ══════════════════════════════════════════════════════════════════════════════

await capture('6. Contract Detail Page', async (page, files) => {
  await installApiMocks(page);
  await goStandalone(page, '/contracts/c1000000-0000-0000-0000-000000000001', { waitForSelector: '[data-testid], h2, .fui-Title2' });
  await page.waitForTimeout(1200);
  files.push(await screenshot(page, '06a-contract-detail.png'));
  files.push(await screenshot(page, '06b-contract-detail-full.png', { fullPage: true, waitMs: 300 }));
});

// ══════════════════════════════════════════════════════════════════════════════
// 7. ENFORCEMENT RUN PAGE — Run History
// ══════════════════════════════════════════════════════════════════════════════

await capture('7. Enforcement Run Page — Run History', async (page, files) => {
  await installApiMocks(page);
  const fabricRunItemId = 'ri-001';
  await goStandalone(page, `/contracts/runs/${fabricRunItemId}`, { waitForSelector: '[data-testid], h2, .fui-Title2, .fui-DataGrid' });
  await page.waitForTimeout(1500);
  files.push(await screenshot(page, '07a-enforcement-run-history.png'));
  files.push(await screenshot(page, '07b-enforcement-run-full.png', { fullPage: true, waitMs: 400 }));
});

// ══════════════════════════════════════════════════════════════════════════════
// 8. ENFORCEMENT RUN DETAIL — Specific Run
// ══════════════════════════════════════════════════════════════════════════════

await capture('8. Enforcement Run Detail — Rule Results', async (page, files) => {
  await installApiMocks(page);
  await goStandalone(page, '/contracts/c1000000-0000-0000-0000-000000000001/runs/r1000000-0000-0000-0000-000000000001', { waitForSelector: '[data-testid], h2, .fui-Title2' });
  await page.waitForTimeout(1500);
  files.push(await screenshot(page, '08a-run-detail-passed.png'));
  files.push(await screenshot(page, '08b-run-detail-full.png', { fullPage: true, waitMs: 400 }));
});

// ══════════════════════════════════════════════════════════════════════════════
// 9. POLICY EDITOR PAGE
// ══════════════════════════════════════════════════════════════════════════════

await capture('9. Policy Editor Page', async (page, files) => {
  await installApiMocks(page);
  const policyItemId = 'p1000000-0000-0000-0000-000000000001';
  await goStandalone(page, `/contracts/policies/${policyItemId}`, { waitForSelector: '[data-testid], h2, .fui-Title2, .fui-Field' });
  await page.waitForTimeout(1200);
  files.push(await screenshot(page, '09a-policy-editor.png'));
  files.push(await screenshot(page, '09b-policy-editor-full.png', { fullPage: true, waitMs: 300 }));
});

// ══════════════════════════════════════════════════════════════════════════════
// 10. AI SUGGEST PAGE
// ══════════════════════════════════════════════════════════════════════════════

await capture('10. AI Suggest Page', async (page, files) => {
  await installApiMocks(page);
  await goStandalone(page, '/contracts/ai-suggest', { waitForSelector: 'h2, .fui-Title2, input' });
  await page.waitForTimeout(1000);
  files.push(await screenshot(page, '10a-ai-suggest-empty.png'));

  // Fill in the first visible text input
  const allInputs = await page.$$('input[type="text"], input:not([type])');
  for (const input of allInputs) {
    const visible = await input.isVisible().catch(() => false);
    if (visible) {
      await input.fill('Healthcare patient records with PHI columns');
      break;
    }
  }
  await page.waitForTimeout(400);
  files.push(await screenshot(page, '10b-ai-suggest-filled.png'));
});

// ══════════════════════════════════════════════════════════════════════════════
// 11. AI SUGGEST — After generation
// ══════════════════════════════════════════════════════════════════════════════

await capture('11. AI Suggest Page — Generated Contract', async (page, files) => {
  await installApiMocks(page);
  await goStandalone(page, '/contracts/ai-suggest', { waitForSelector: 'input, textarea, h2' });
  // Wait for Monaco to be fully ready (using local bundle now)
  await page.waitForSelector('.monaco-editor .view-lines', { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(500);

  // Step 1: Switch to Warehouse type using Fluent UI Combobox (input[role="combobox"])
  // The input value attribute holds the current selection text
  const comboboxInputs = await page.$$('input[role="combobox"]');
  for (const cb of comboboxInputs) {
    const val = await cb.inputValue().catch(() => '');
    if (val?.toLowerCase().includes('lakehouse')) {
      await cb.click();
      await page.waitForTimeout(300);
      const warehouseOpt = await page.waitForSelector('[role="option"]:has-text("Warehouse")', { timeout: 3000 }).catch(() => null);
      if (warehouseOpt) {
        await warehouseOpt.click();
        await page.waitForTimeout(600);
      }
      break;
    }
  }

  // Step 2: Fill description textarea
  const textareas = await page.$$('textarea');
  for (const ta of textareas) {
    const visible = await ta.isVisible().catch(() => false);
    if (visible) {
      await ta.fill('Healthcare patient records - PHI data with ICD-10 diagnosis codes');
      break;
    }
  }
  await page.waitForTimeout(300);

  // Step 3: Click the Generate draft button (now enabled because targetTablePath is set for Warehouse)
  const buttons = await page.$$('button');
  for (const btn of buttons) {
    const text = await btn.textContent().catch(() => '');
    const disabled = await btn.isDisabled().catch(() => true);
    if (!disabled && text?.toLowerCase().includes('generate')) {
      await btn.click();
      break;
    }
  }

  // Step 4: Wait for mock API response (800ms) + React state update + Monaco to show YAML
  await page.waitForTimeout(2000);
  await page.waitForSelector('.monaco-editor .view-lines', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(800);

  files.push(await screenshot(page, '11a-ai-suggest-result.png'));
  // Scroll into Monaco and capture YAML detail
  const monacoLines = await page.$('.monaco-editor .view-lines');
  if (monacoLines) {
    await page.evaluate((el) => el.scrollIntoView({ behavior: 'instant', block: 'center' }), monacoLines);
    await page.waitForTimeout(600);
    files.push(await screenshot(page, '11b-ai-suggest-monaco.png'));
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// 12. NL QUERY PAGE
// ══════════════════════════════════════════════════════════════════════════════

await capture('12. Natural Language Query Page', async (page, files) => {
  await installApiMocks(page);
  await goStandalone(page, '/contracts/ai-query', { waitForSelector: 'h2, .fui-Title2, input' });
  await page.waitForTimeout(800);
  files.push(await screenshot(page, '12a-nl-query-empty.png'));

  // Fill in query - use the actual placeholder text from NLQueryPage.tsx
  const queryInput = await page.$('input[placeholder*="CO2"], input[placeholder*="Find contracts"], input[placeholder*="natural"], input');
  if (queryInput) {
    await queryInput.fill('Which contracts failed enforcement in the last 7 days?');
    await page.waitForTimeout(300);
  }
  files.push(await screenshot(page, '12b-nl-query-filled.png'));

  // Submit - click Search button
  const buttons = await page.$$('button');
  for (const btn of buttons) {
    const text = await btn.textContent().catch(() => '');
    const disabled = await btn.isDisabled().catch(() => true);
    if (!disabled && (text?.includes('Search') || text?.includes('Run') || text?.includes('Query') || text?.includes('Ask'))) {
      await btn.click();
      await page.waitForTimeout(1500);
      break;
    }
  }
  files.push(await screenshot(page, '12c-nl-query-result.png'));
});

// ══════════════════════════════════════════════════════════════════════════════
// 13. ALERTS DASHBOARD
// ══════════════════════════════════════════════════════════════════════════════

await capture('13. Alerts Dashboard Page', async (page, files) => {
  await installApiMocks(page);
  await goStandalone(page, '/contracts/alerts', { waitForSelector: '[data-testid], h2, .fui-Title2, .fui-DataGrid' });
  await page.waitForTimeout(1500);
  files.push(await screenshot(page, '13a-alerts-dashboard.png'));
  files.push(await screenshot(page, '13b-alerts-dashboard-full.png', { fullPage: true, waitMs: 300 }));
});

// ══════════════════════════════════════════════════════════════════════════════
// 14. WORKSPACE SETTINGS PAGE
// ══════════════════════════════════════════════════════════════════════════════

await capture('14. Workspace Settings Page', async (page, files) => {
  await installApiMocks(page);
  await goStandalone(page, '/workspace/settings', { waitForSelector: '[data-testid], h2, .fui-Title2, .fui-Field' });
  await page.waitForTimeout(1200);
  files.push(await screenshot(page, '14a-workspace-settings.png'));
  files.push(await screenshot(page, '14b-workspace-settings-full.png', { fullPage: true, waitMs: 300 }));
});

// ══════════════════════════════════════════════════════════════════════════════
// 15. FABRIC PORTAL — Workload Hub
// ══════════════════════════════════════════════════════════════════════════════

await capture('15. Fabric Portal — Workload Hub', async (page, files) => {
  await page.goto('https://app.fabric.microsoft.com/workloadhub/Org.Orqentis', {
    waitUntil: 'networkidle', timeout: 30000
  });
  await page.waitForTimeout(2000);
  files.push(await screenshot(page, '15a-fabric-workload-hub.png'));
  files.push(await screenshot(page, '15b-fabric-workload-hub-full.png', { fullPage: true, waitMs: 500 }));
});

// ══════════════════════════════════════════════════════════════════════════════
// 16. VALIDATION — Contract YAML valid vs invalid
// ══════════════════════════════════════════════════════════════════════════════

await capture('16. Contract Validation — Valid YAML', async (page, files) => {
  await installApiMocks(page);
  await goStandalone(page, '/contracts/new', { waitForSelector: '.monaco-editor, [class*="editor"], .fui-Field' });
  await page.waitForTimeout(2000);

  // Look for validate button
  const validateBtn = await page.$('button:has-text("Validate"), button:has-text("validate")');
  if (validateBtn) {
    await validateBtn.click();
    await page.waitForTimeout(1000);
    files.push(await screenshot(page, '16a-validation-result.png'));
  } else {
    files.push(await screenshot(page, '16a-editor-validate-area.png'));
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// 17. API — Swagger / OpenAPI Docs
// ══════════════════════════════════════════════════════════════════════════════

await capture('17. Backend API — Swagger Docs', async (page, files) => {
  await page.goto(`${API_URL}/swagger`, { waitUntil: 'networkidle', timeout: 20000 });
  await page.waitForTimeout(1500);
  files.push(await screenshot(page, '17a-api-swagger.png'));
  files.push(await screenshot(page, '17b-api-swagger-full.png', { fullPage: true, waitMs: 500 }));
});

// ══════════════════════════════════════════════════════════════════════════════
// 18. RUN ENFORCEMENT — Trigger from list page
// ══════════════════════════════════════════════════════════════════════════════

await capture('18. Run Enforcement — Trigger from Contract List', async (page, files) => {
  await installApiMocks(page);
  await goStandalone(page, '/contracts', { waitForSelector: '.fui-DataGrid, h2, [data-testid]' });
  await page.waitForTimeout(1500);
  files.push(await screenshot(page, '18a-contract-list-before-run.png'));

  // Look for "Run" or play button
  const runBtn = await page.$('button[title*="Run"], button:has-text("Run Now"), button:has-text("Run")');
  if (runBtn) {
    await runBtn.click();
    await page.waitForTimeout(1200);
    files.push(await screenshot(page, '18b-run-triggered-toast.png'));
  } else {
    files.push(await screenshot(page, '18b-no-run-button-visible.png'));
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// Done — write manifest
// ══════════════════════════════════════════════════════════════════════════════

await browser.close();

writeFileSync(
  join(OUT_DIR, 'manifest.json'),
  JSON.stringify(manifest, null, 2),
);

console.log(`\n✅  Done. ${manifest.length} features captured.`);
console.log(`   Output: ${OUT_DIR}`);
console.log('\nFeature summary:');
for (const m of manifest) {
  const ok = m.files.length > 0;
  console.log(`  ${ok ? '✓' : '✗'}  ${m.label}  (${m.files.length} screenshot${m.files.length !== 1 ? 's' : ''})`);
}
