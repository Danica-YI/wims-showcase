// Verifies site/index.html in headless Chrome over file://.
// Usage: node capture/check-site.mjs
// Prints one line per check (PASS/FAIL), then ALL PASS or FAILED <n>. Exits 0 only when everything passed.
import { chromium } from 'playwright';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..');
const pageUrl = pathToFileURL(path.join(repoRoot, 'site', 'index.html')).href;

const VIEWPORTS = [
  { width: 1440, height: 900 },
  { width: 390, height: 844 },
];

const REQUIRED_IDS = [
  'walkthrough', 'features', 'roles', 'stock', 'movements', 'alerts', 'orders',
  'suppliers', 'adjustments', 'users', 'search', 'built', 'demo-link',
];

let failed = 0;

function report(name, ok, detail = '') {
  if (ok) {
    console.log(`PASS ${name}`);
  } else {
    failed += 1;
    console.log(`FAIL ${name}: ${detail}`);
  }
}

async function scrollThrough(page) {
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y <= height; y += 400) {
    await page.evaluate((top) => window.scrollTo(0, top), y);
    await page.waitForTimeout(60);
  }
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
}

// Polls until every <img> is complete with a non-zero width, or the timeout passes.
// Returns the list of images still broken at the end.
async function brokenImages(page, timeoutMs = 8000) {
  const deadline = Date.now() + timeoutMs;
  let broken = [];
  while (Date.now() < deadline) {
    broken = await page.evaluate(() =>
      Array.from(document.images)
        .filter((img) => !(img.complete && img.naturalWidth > 0))
        .map((img) => img.getAttribute('src') || '(no src)')
    );
    if (broken.length === 0) break;
    await page.waitForTimeout(150);
  }
  return broken;
}

async function checkViewport(browser, viewport) {
  const label = `${viewport.width}`;
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  const problems = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error' || msg.type() === 'warning') {
      problems.push(`console ${msg.type()}: ${msg.text()}`);
    }
  });
  page.on('pageerror', (err) => problems.push(`page error: ${err.message}`));

  // 1. Open via file://
  await page.goto(pageUrl, { waitUntil: 'load' });

  // 2. Scroll through so lazy images load, then wait for network idle
  await scrollThrough(page);
  await page.waitForLoadState('networkidle');

  // 3. Every <img> is loaded
  const broken = await brokenImages(page);
  report(`${label} images load`, broken.length === 0, `${broken.length} broken: ${broken.slice(0, 5).join(', ')}`);

  // 4. No horizontal overflow
  const overflow = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }));
  report(
    `${label} no horizontal scroll`,
    overflow.scrollWidth <= overflow.innerWidth,
    `scrollWidth ${overflow.scrollWidth} > innerWidth ${overflow.innerWidth}`
  );

  // 5. Required ids exist
  const missing = await page.evaluate((ids) => ids.filter((id) => !document.getElementById(id)), REQUIRED_IDS);
  report(`${label} required ids present`, missing.length === 0, `missing: ${missing.join(', ')}`);

  // 6. Lightbox opens from the first image in #roles and closes on Escape
  await page.locator('#roles img').first().click();
  const openedAfterClick = await page.evaluate(() => document.getElementById('lightbox').open);
  let closedAfterEscape = false;
  if (openedAfterClick) {
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.getElementById('lightbox').open, null, { timeout: 3000 })
      .then(() => { closedAfterEscape = true; })
      .catch(() => {});
  }
  report(
    `${label} lightbox opens and closes`,
    openedAfterClick && closedAfterEscape,
    `opened=${openedAfterClick} closedOnEscape=${closedAfterEscape}`
  );

  // 7. Walkthrough step player: clicking the 3rd step makes it active
  await page.locator('#walkthrough [data-player] [data-step]').nth(2).click();
  const active = await page.getAttribute('#walkthrough [data-player]', 'data-active');
  report(`${label} step player jumps to step 3`, active === '2', `data-active=${active}`);

  // 8. Full-page screenshot
  const shotPath = path.join(repoRoot, `check-${viewport.width}.png`);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(100);
  await page.screenshot({ path: shotPath, fullPage: true });
  report(`${label} screenshot saved`, true);

  // Console and page errors are gathered across the whole run
  report(`${label} no console errors or warnings`, problems.length === 0, problems.slice(0, 5).join(' | '));

  await context.close();
}

async function main() {
  let browser;
  try {
    browser = await chromium.launch({ channel: 'chrome', headless: true });
  } catch (err) {
    report('launch chrome', false, String(err && err.message ? err.message : err).split('\n')[0]);
    console.log('FAILED 1');
    process.exitCode = 1;
    return;
  }

  try {
    for (const viewport of VIEWPORTS) {
      try {
        await checkViewport(browser, viewport);
      } catch (err) {
        failed += 1;
        console.log(`FAIL run at ${viewport.width}px: ${String(err && err.message ? err.message : err).split('\n')[0]}`);
      }
    }
  } finally {
    await browser.close();
  }

  if (failed === 0) {
    console.log('ALL PASS');
    process.exitCode = 0;
  } else {
    console.log(`FAILED ${failed}`);
    process.exitCode = 1;
  }
}

main();
