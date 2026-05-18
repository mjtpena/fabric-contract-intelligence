import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const outDir = resolve(process.cwd(), 'snap');
mkdirSync(outDir, { recursive: true });

const base = 'http://localhost:5173';
const pages = [
  { name: '01-contracts', path: '/contracts?__standalone=1' },
  { name: '02-contract-new', path: '/contracts/new?__standalone=1' },
  { name: '03-policies', path: '/contracts/policies?__standalone=1' },
  { name: '04-ai-suggest', path: '/contracts/ai-suggest?__standalone=1' },
  { name: '05-nl-query', path: '/contracts/ai-query?__standalone=1' },
  { name: '06-alerts', path: '/contracts/alerts?__standalone=1' },
  { name: '07-workspace-settings', path: '/workspace/settings?__standalone=1' },
  { name: '08-runs', path: '/contracts/runs?__standalone=1' },
];

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
const page = await ctx.newPage();

for (const p of pages) {
  try {
    await page.goto(base + p.path, { waitUntil: 'networkidle', timeout: 15000 });
  } catch {
    await page.goto(base + p.path, { waitUntil: 'domcontentloaded', timeout: 15000 });
  }
  await page.waitForTimeout(800);
  await page.screenshot({ path: resolve(outDir, `${p.name}.png`), fullPage: false });
  console.log('captured', p.name);
}

await browser.close();
