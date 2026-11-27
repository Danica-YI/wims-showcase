// Dev helper: tiles PNGs from a folder into one image for quick review. node capture/contact-sheet.mjs <dir> <out.png> [regex] [cols]
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const [dir, out, prefix = '', cols = '4'] = process.argv.slice(2);
const files = fs.readdirSync(dir).filter(f => f.endsWith('.png') && new RegExp(prefix).test(f)).sort();
const w = Math.floor(1600 / Number(cols));
const html = `<body style="margin:0;display:grid;grid-template-columns:repeat(${cols},${w}px);gap:4px;background:#333;font:11px sans-serif;color:#fff">${files.map(f => `<div><img src="${pathToFileURL(path.resolve(dir, f))}" style="width:${w}px;display:block"><div>${f}</div></div>`).join('')}</body>`;
const b = await chromium.launch({ channel: 'chrome' });
const p = await b.newPage({ viewport: { width: 1600 + 4 * Number(cols), height: 400 } });
const tmp = out.replace(/.png$/, '.html'); fs.writeFileSync(tmp, html); await p.goto(pathToFileURL(path.resolve(tmp)).href); await p.waitForLoadState('load'); fs.rmSync(tmp);
await p.screenshot({ path: out, fullPage: true }); await b.close();
console.log(`${files.length} tiles -> ${out}`);
