#!/usr/bin/env node
// THE STAGE C PROOF SET — Notes and Worked Examples, rendered from the authored quadratic lesson.
//
//   node scripts/shots-notes-examples.mjs [outDir]
//
// Every page here is drawn from tests/visual/lessons/mathematics-shell.json. Nothing is posed: the tabs,
// their labels and their order, the concept list, the examples and their steps are what the JSON says.
// scripts/verify-notes-examples.mjs is the gate; this is the picture of what it asserts.
//
// A tab is an ALTERNATIVE COMPLETE EXAMPLE. Shots 01 and 02 are the proof of that: each shows one whole
// mathematical idea — its drawing, its coordinates and its stated relationship together — so switching
// tabs means "show me another example of this concept", never "fetch the missing half of this one".
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.resolve(process.argv[2] || path.join(root, 'screenshots', 'notes-examples'));
fs.mkdirSync(OUT, { recursive: true });
const MIME = { '.html': 'text/html', '.json': 'application/json', '.woff2': 'font/woff2', '.png': 'image/png', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]);
  const p = path.join(root, u === '/' ? '/lesson-studio.html' : u);
  if (!p.startsWith(root) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
  res.end(fs.readFileSync(p));
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}/lesson-studio.html`;
const FIX = JSON.parse(fs.readFileSync(path.join(root, 'tests/visual/lessons/mathematics-shell.json'), 'utf8'));
const NOTES = FIX.slides.findIndex((s) => s.type === 'notes');
const WEX = FIX.slides.findIndex((s) => s.type === 'workedExamples');

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const open = async (w, h, slide, L = FIX) => {
  const p = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
  await p.goto(base, { waitUntil: 'load' });
  await p.evaluate(({ L, s }) => { LESSON = JSON.parse(JSON.stringify(L)); render(); go(s); }, { L, s: slide });
  await p.waitForTimeout(520);
  return p;
};
const shot = async (p, name, sel) => {
  const t = sel ? await p.$(sel) : p;
  await (t && t.screenshot ? t : p).screenshot({ path: path.join(OUT, name + '.png') });
  console.log(name);
};
/* STACKED, THE PAGE ITSELF IS THE SCROLLER — `.mx-page`, not the document — so a viewport-sized shot would
   crop at the tab strip and read exactly like the failure this stage was rejected for. The proof has to show
   what a learner reaches by scrolling, so the viewport is grown to the page's own scroll height first. */
/* Growing the viewport also grows the drawing (`height:min(46vh,…)`), which grows the page again — so the
   height is settled by iteration rather than by one measurement, and the shot is taken once it stops moving. */
const shotWhole = async (p, name, w) => {
  const need = () => p.evaluate(() => { const e = document.querySelector('.mx-page');
    return Math.min(4600, Math.ceil((e.scrollHeight - e.clientHeight) + window.innerHeight) + 24); });
  for (let i = 0, h = 0; i < 4; i++) {
    const next = await need();
    if (next <= h) break;
    h = next; await p.setViewportSize({ width: w, height: h }); await p.waitForTimeout(600);
  }
  await shot(p, name);
};
const EX = FIX.slides[NOTES].examples.map((e) => e.id);
const GX = FIX.slides[WEX].groups.map((g) => g.id);

// 1 · 2 — Notes on the desktop, after the surface cleanup.
{
  const p = await open(1536, 1024, NOTES);
  await shot(p, '1-notes-desktop-example-1');
  await p.click(`[data-mx-tab="${EX[1]}"]`); await p.waitForTimeout(520);
  await shot(p, '2-notes-desktop-example-2-table-to-graph');
  await p.close();
}
// 3 — Notes stacked on a portrait tablet: stable knowledge first, then a complete exploration.
{
  const a = await open(834, 1112, NOTES); await shotWhole(a, '3-notes-portrait-tablet-stacked', 834); await a.close();
}
// 4 · 5 · 6 — one shot per composition type, on the desktop.
{
  const p = await open(1536, 1024, WEX);
  await shot(p, '4-worked-compact-substitution-desktop');
  await p.click(`[data-mx-tab="${GX[1]}"]`); await p.waitForTimeout(560);
  await shot(p, '5-worked-visual-solving-for-x-desktop');
  await p.click(`[data-mx-tab="${GX[2]}"]`); await p.waitForTimeout(560);
  await shotWhole(p, '6-worked-comparison-symmetry-desktop', 1536);
  await p.close();
}
// 7 · 8 — the compact group on a tablet, the visual group on a portrait tablet.
{
  const a = await open(1194, 834, WEX); await shotWhole(a, '7-worked-compact-tablet', 1194); await a.close();
  const b = await open(834, 1112, WEX);
  await b.click(`[data-mx-tab="${GX[1]}"]`); await b.waitForTimeout(560);
  await shotWhole(b, '8-worked-visual-portrait-tablet', 834); await b.close();
}
// 9 — phone.
{
  const p = await open(414, 896, WEX); await shotWhole(p, '9-worked-examples-phone', 414); await p.close();
}
// Supplementary regression evidence, not part of the approval set.
{
  const p = await open(1180, 1024, NOTES);
  await p.evaluate(() => openWorksheet());
  await p.waitForTimeout(700);
  const h = await p.evaluate(() => Math.min(9000, Math.ceil(document.querySelector('#wsSheet').getBoundingClientRect().height) + 40));
  await p.setViewportSize({ width: 1180, height: h });
  await p.waitForTimeout(500);
  await shot(p, '10-supplementary-flat-worksheet-everything', '#wsSheet');
  const n = await p.evaluate(() => { const s = document.querySelector('#wsSheet');
    return { notes: s.querySelectorAll('.ws-mx-rep > h3.ws-mx-reph').length,
      groups: s.querySelectorAll('.ws-mx-grp').length,
      ex: s.querySelectorAll('.ws-mx-exh').length,
      steps: s.querySelectorAll('.ws-mx-steps > li').length }; });
  console.log(`   (10: ${n.notes} Notes examples, ${n.groups} worked-example groups holding ${n.ex} examples, `
    + `${n.steps} solution steps — all of them, none left behind a tab)`);
  await p.close();
}
await browser.close(); server.close();
console.log('\nwrote ' + path.relative(root, OUT));
