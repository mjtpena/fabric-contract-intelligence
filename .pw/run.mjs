import { chromium } from 'playwright';
import readline from 'node:readline';
import fs from 'node:fs';
import path from 'node:path';

const USER_DATA_DIR = process.env.PW_USER_DATA || 'C:\\Users\\mjtpena\\.copilot\\session-state\\8f593bf2-cbfe-406b-afc6-29ae9a1150a0\\files\\pw-chrome-profile';
const NUPKG = 'C:\\Users\\mjtpena\\dev\\fabric-workloads\\fabric-contract-intelligence\\frontend\\dist\\manifest\\Org.Orqentis.0.7.0.nupkg';

fs.mkdirSync(USER_DATA_DIR, { recursive: true });

const ctx = await chromium.launchPersistentContext(USER_DATA_DIR, {
  headless: false,
  channel: 'chrome',
  viewport: { width: 1400, height: 900 },
  args: ['--start-maximized'],
});

const page = ctx.pages()[0] || await ctx.newPage();

// Capture console messages from all frames (including cross-origin iframes)
const consoleLog = [];
ctx.on('page', (p) => {
  p.on('console', (msg) => {
    const e = `[${msg.type()}] ${msg.location().url} :: ${msg.text()}`;
    consoleLog.push(e);
  });
  p.on('pageerror', (err) => consoleLog.push(`[pageerror] ${p.url()} :: ${err.message}\n${err.stack}`));
});
page.on('console', (msg) => {
  const e = `[${msg.type()}] ${msg.location().url} :: ${msg.text()}`;
  consoleLog.push(e);
});
page.on('pageerror', (err) => consoleLog.push(`[pageerror] ${page.url()} :: ${err.message}\n${err.stack}`));
page.on('frameattached', (frame) => {
  consoleLog.push(`[frameattached] ${frame.url()}`);
});

// Listen for control commands via stdin
const rl = readline.createInterface({ input: process.stdin });
console.log('READY');
console.log('Commands: GOTO <url> | CLICK <selector> | TYPE <selector> :: <text> | UPLOAD <selector> :: <path> | EVAL <js> | FRAME_EVAL <urlSubstr> :: <js> | FRAME_TEXT <urlSubstr> | FRAMES | LOG | LOGCLEAR | WAIT <ms> | SCREENSHOT <path> | TITLE | URL | HTML <selector> | EXIT');

for await (const line of rl) {
  const trimmed = line.trim();
  if (!trimmed) continue;
  try {
    if (trimmed === 'EXIT') { await ctx.close(); process.exit(0); }
    if (trimmed === 'TITLE') { console.log('OK:', await page.title()); continue; }
    if (trimmed === 'URL') { console.log('OK:', page.url()); continue; }
    if (trimmed.startsWith('GOTO ')) {
      const url = trimmed.slice(5);
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
      console.log('OK:', page.url());
      continue;
    }
    if (trimmed.startsWith('WAIT ')) {
      const ms = parseInt(trimmed.slice(5), 10);
      await page.waitForTimeout(ms);
      console.log('OK');
      continue;
    }
    if (trimmed.startsWith('CLICK ')) {
      const sel = trimmed.slice(6);
      await page.click(sel, { timeout: 30000 });
      console.log('OK');
      continue;
    }
    if (trimmed.startsWith('TYPE ')) {
      const rest = trimmed.slice(5);
      const idx = rest.indexOf(' :: ');
      const sel = rest.slice(0, idx);
      const text = rest.slice(idx + 4);
      await page.fill(sel, text);
      console.log('OK');
      continue;
    }
    if (trimmed.startsWith('PICKFILE ')) {
      const rest = trimmed.slice(9);
      const idx = rest.indexOf(' :: ');
      const sel = rest.slice(0, idx);
      const file = rest.slice(idx + 4);
      const [chooser] = await Promise.all([
        page.waitForEvent('filechooser', { timeout: 30000 }),
        page.click(sel),
      ]);
      await chooser.setFiles(file);
      console.log('OK');
      continue;
    }
    if (trimmed.startsWith('CLICKTEXT ')) {
      const txt = trimmed.slice(10);
      await page.getByText(txt, { exact: false }).first().click({ timeout: 30000 });
      console.log('OK');
      continue;
    }
    if (trimmed.startsWith('UPLOAD ')) {
      const rest = trimmed.slice(7);
      const idx = rest.indexOf(' :: ');
      const sel = rest.slice(0, idx);
      const file = rest.slice(idx + 4);
      const input = await page.$(sel);
      if (!input) throw new Error('selector not found');
      await input.setInputFiles(file);
      console.log('OK');
      continue;
    }
    if (trimmed.startsWith('SCREENSHOT ')) {
      const file = trimmed.slice(11);
      await page.screenshot({ path: file, fullPage: true });
      console.log('OK:', file);
      continue;
    }
    if (trimmed.startsWith('HTML ')) {
      const sel = trimmed.slice(5);
      const el = await page.$(sel);
      const html = el ? (await el.innerHTML()).slice(0, 8000) : '(not found)';
      console.log('OK:', html);
      continue;
    }
    if (trimmed.startsWith('EVAL ')) {
      const expr = trimmed.slice(5);
      const result = await page.evaluate(expr);
      console.log('OK:', JSON.stringify(result));
      continue;
    }
    if (trimmed === 'FRAMES') {
      const fs2 = page.frames().map(f => ({ url: f.url(), name: f.name() }));
      console.log('OK:', JSON.stringify(fs2));
      continue;
    }
    if (trimmed === 'LOG') {
      console.log('OK: ===LOG START===');
      for (const e of consoleLog.slice(-200)) console.log(e);
      console.log('OK: ===LOG END===');
      continue;
    }
    if (trimmed === 'LOGCLEAR') {
      consoleLog.length = 0;
      console.log('OK');
      continue;
    }
    if (trimmed.startsWith('FRAME_EVAL ')) {
      const rest = trimmed.slice(11);
      const idx = rest.indexOf(' :: ');
      const sub = rest.slice(0, idx);
      const expr = rest.slice(idx + 4);
      const frame = page.frames().find(f => f.url().includes(sub));
      if (!frame) { console.log('ERR: frame not found'); continue; }
      const result = await frame.evaluate(expr);
      console.log('OK:', JSON.stringify(result));
      continue;
    }
    if (trimmed.startsWith('FRAME_TEXT ')) {
      const sub = trimmed.slice(11);
      const frame = page.frames().find(f => f.url().includes(sub));
      if (!frame) { console.log('ERR: frame not found'); continue; }
      const text = await frame.evaluate(() => document.body ? document.body.innerText : '(no body)');
      console.log('OK:', JSON.stringify(String(text).slice(0, 4000)));
      continue;
    }
    console.log('ERR: unknown command');
  } catch (e) {
    console.log('ERR:', e.message);
  }
}
