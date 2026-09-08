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

// ── Notes ────────────────────────────────────────────────────────────────────────────────────────
// 01 · 02 — one whole example, then ANOTHER whole example. Neither is a fragment of the other.
{
  const p = await open(1536, 1024, NOTES);
  await shot(p, '01-notes-example-1-complete');
  await p.click(`[data-mx-tab="${EX[1]}"]`); await p.waitForTimeout(420);
  await shot(p, '02-notes-example-2-another-complete');
  await p.close();
}
// 03 · 04 · 05 — the same example at three widths. The content area must survive all of them.
{
  const a = await open(1194, 834, NOTES);   await shot(a, '03-notes-tablet-landscape');  await a.close();
  const b = await open(834, 1112, NOTES);   await shotWhole(b, '04-notes-tablet-portrait-stacked', 834); await b.close();
  const c = await open(414, 896, NOTES);    await shotWhole(c, '05-notes-phone', 414); await c.close();
}
// ── Worked examples ──────────────────────────────────────────────────────────────────────────────
// 06 · 07 · 08 — three demonstrations that differ in kind, each carrying its own supporting visual:
// an equation worked against a table of substitutions (with a step that brings its own coordinates),
// one read off a drawn graph, and one whose argument is about symmetry.
{
  const p = await open(1536, 1024, WEX);
  await shot(p, '06-examples-equation-with-table');
  await p.click('[data-mx-tab="ex-solve"]'); await p.waitForTimeout(460);
  await shot(p, '07-examples-solved-on-the-graph');
  await p.click('[data-mx-tab="ex-symmetry"]'); await p.waitForTimeout(460);
  await shot(p, '08-examples-symmetry-argument');
  await p.close();
}
// 09 · 10 — the same worked example on a tablet and on a phone
{
  const a = await open(834, 1112, WEX);
  await a.click('[data-mx-tab="ex-solve"]'); await a.waitForTimeout(460);
  await shotWhole(a, '09-examples-tablet', 834); await a.close();
  const b = await open(414, 896, WEX);
  await b.click('[data-mx-tab="ex-solve"]'); await b.waitForTimeout(460);
  await shotWhole(b, '10-examples-phone', 414); await b.close();
}
// 11 — the flat output: every authored example, not whichever tab happened to be open
{
  const p = await open(1180, 1024, NOTES);
  await p.evaluate(() => openWorksheet());
  await p.waitForTimeout(700);
  const h = await p.evaluate(() => Math.min(9000, Math.ceil(document.querySelector('#wsSheet').getBoundingClientRect().height) + 40));
  await p.setViewportSize({ width: 1180, height: h });
  await p.waitForTimeout(500);
  await shot(p, '11-flat-worksheet-everything', '#wsSheet');
  const n = await p.evaluate(() => { const s = document.querySelector('#wsSheet');
    return { exs: s.querySelectorAll('h3.ws-mx-reph').length, wex: s.querySelectorAll('.ws-mx-exh').length,
      steps: s.querySelectorAll('.ws-mx-steps > li').length, figs: s.querySelectorAll('.ws-mx-fig').length }; });
  console.log(`   (11: ${n.exs} Notes examples, ${n.wex} worked examples, ${n.steps} solution steps, `
    + `${n.figs} drawings — all of them, none left behind a tab)`);
  await p.close();
}
await browser.close(); server.close();
console.log('\nwrote ' + path.relative(root, OUT));
