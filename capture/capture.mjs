// Captures every WIMS screen from the local stack into site/media/.
// Usage: node capture/capture.mjs [--only <prefix>] [--out <dir>]
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, startStack } from './stack.mjs';
import { seed } from './seed.mjs';
import { PASSWORD } from './data.mjs';
import { flows } from './flows.mjs';

const arg = name => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : undefined; };
const OUT = path.resolve(arg('--out') || path.join(ROOT, 'site', 'media'));
const ONLY = arg('--only');
const VIEWPORT = { width: 1280, height: 800 };

// [file name, role, path] for the static page shots.
export const pageShots = [
  ['roles-1-login', null, '/login'],
  ['roles-2-admin-dashboard', 'admin', '/dashboard'],
  ['roles-3-staff-dashboard', 'staff', '/dashboard'],
  ['stock-1-list', 'admin', '/stocks'],
  ['movements-1-inbound', 'admin', '/inbound'],
  ['movements-2-outbound', 'staff', '/outbound'],
  ['alerts-1-list', 'admin', '/alerts'],
  ['orders-1-list', 'admin', '/orders'],
  ['suppliers-1-list', 'admin', '/suppliers'],
  ['adjustments-1-admin', 'admin', '/adjustments'],
  ['adjustments-2-staff', 'staff', '/adjustments'],
  ['users-1-list', 'admin', '/users'],
  ['search-1-results', 'admin', '/search?q=safety'],
];

export async function settle(page) {
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(400);
}

export async function shoot(page, name) {
  const file = path.join(OUT, `${name}.png`);
  await page.screenshot({ path: file });
  console.log(`  ${name}.png ${(fs.statSync(file).size / 1024) | 0} KB`);
}

async function newSession(browser, webUrl, role) {
  const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1.5 });
  const page = await context.newPage();
  page.on('pageerror', e => console.log(`  [pageerror] ${e.message}`));
  page.on('console', m => { if (m.type() === 'error') console.log(`  [console:${role || 'anon'}] ${m.text().slice(0, 160)}`); });
  page.on('response', r => { if (r.status() >= 400) console.log(`  [http:${role || 'anon'}] ${r.status()} ${r.request().method()} ${r.url()}`); });
  if (role) {
    await page.goto(webUrl + '/login');
    await page.fill('input[type=email]', `${role}@wims.demo`);
    await page.fill('input[type=password]', PASSWORD);
    await page.click('button[type=submit]');
    await page.waitForURL('**/dashboard');
    await settle(page);
  }
  return { context, page };
}

const stack = await startStack();
let failed = false;
try {
  await seed(stack);
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const sessions = {};
  const session = async role => (sessions[role ||= 'anon'] ||= await newSession(browser, stack.webUrl, role === 'anon' ? null : role));

  for (const [name, role, route] of pageShots) {
    if (ONLY && !name.startsWith(ONLY)) continue;
    const { page } = await session(role);
    await page.goto(stack.webUrl + route);
    await settle(page);
    await shoot(page, name);
  }
  for (const flow of flows) {
    if (ONLY && !flow.name.startsWith(ONLY)) continue;
    console.log(`flow ${flow.name}`);
    try {
      await flow.run({ session, shoot: (page, n) => shoot(page, `${flow.name}-${n}`), settle, webUrl: stack.webUrl });
    } catch (e) {
      for (const [r, s] of Object.entries(sessions)) await s.page.screenshot({ path: path.join(ROOT, `debug-${flow.name}-${r}.png`) });
      throw e;
    }
  }
  await browser.close();
} catch (e) {
  failed = true;
  console.error('CAPTURE FAILED:', e.message);
} finally {
  await stack.stop();
}
process.exit(failed ? 1 : 0);
