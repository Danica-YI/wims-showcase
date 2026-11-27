// Checks that settle() waits for a request an in-page click starts, not just a fixed sleep.
// Usage: node capture/check-settle.mjs
import { chromium } from 'playwright';
import { settle, track } from './settle.mjs';

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage();
track(page);
await page.route('http://settle.test/**', async (route) => {
  if (route.request().url().endsWith('/api')) {
    await new Promise((r) => setTimeout(r, 1500));
    return route.fulfill({ body: 'ok' });
  }
  return route.fulfill({
    contentType: 'text/html',
    body: `<button onclick="fetch('/api').then(r => r.text()).then(t => { document.body.dataset.done = t; })">go</button>`,
  });
});
await page.goto('http://settle.test/');
await settle(page);
await page.click('button');
await settle(page);
const done = await page.evaluate(() => document.body.dataset.done || '');
await browser.close();
const ok = done === 'ok';
console.log(ok ? 'PASS settle waits for a slow in-page request' : `FAIL settle returned before the request finished (done="${done}")`);
process.exit(ok ? 0 : 1);
