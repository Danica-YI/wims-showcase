// settle(page): wait until the page has finished what the last navigation or click started.
// waitForLoadState('networkidle') alone returns at once after an in-page click in a single-page app,
// so track(page) counts requests in flight and settle waits for 500 ms with none (at most 15 s).
const inflight = new WeakMap();
const QUIET_MS = 500;
const MAX_MS = 15000;

/** Start counting a page's requests in flight; call once, right after the page is created. */
export function track(page) {
  inflight.set(page, 0);
  const done = () => inflight.set(page, Math.max(0, inflight.get(page) - 1));
  page.on('request', () => inflight.set(page, inflight.get(page) + 1));
  page.on('requestfinished', done);
  page.on('requestfailed', done);
}

export async function settle(page) {
  await page.waitForLoadState('networkidle');
  const deadline = Date.now() + MAX_MS;
  let quietSince = Date.now();
  while (Date.now() < deadline) {
    if ((inflight.get(page) ?? 0) > 0) quietSince = Date.now();
    else if (Date.now() - quietSince >= QUIET_MS) break;
    await page.waitForTimeout(50);
  }
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(400);
}
