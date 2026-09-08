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
const CMP = JSON.parse(fs.readFileSync(path.join(root, 'tests/visual/lessons/mathematics-compositions.json'), 'utf8'));
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
const CX = CMP.slides[0].groups.map((g) => g.id);
const pick = async (p, tab) => { await p.click(`[data-mx-tab="${tab}"]`); await p.waitForTimeout(700); };

// 1 — Notes desktop, Graph and key points, after the redundancy audit.
{ const p = await open(1536, 1024, NOTES); await shot(p, '1-notes-desktop-graph-and-key-points'); await p.close(); }
// 2 — compact, the two shipping substitutions.
{ const p = await open(1536, 1024, WEX); await shot(p, '2-worked-compact-two-examples'); await p.close(); }
// 3 — compact with THREE examples: 2 + 1, from the non-shipping proof fixture.
{ const p = await open(1536, 1024, 0, CMP); await pick(p, CX[0]);
  await shotWhole(p, '3-worked-compact-three-examples-2plus1', 1536); await p.close(); }
// 4 — visual, with the authored y = 16 reference line actually drawn.
{ const p = await open(1536, 1024, WEX); await pick(p, GX[1]);
  await shot(p, '4-worked-visual-solving-for-x-with-reference-line'); await p.close(); }
// 5 — comparison, with the wide shared plane beneath the two cases.
{ const p = await open(1536, 1024, WEX); await pick(p, GX[2]);
  await shotWhole(p, '5-worked-comparison-symmetry-wide-plane', 1536); await p.close(); }
// 6 — extended, the derivation proof.
{ const p = await open(1536, 1024, 0, CMP); await pick(p, CX[1]);
  await shotWhole(p, '6-worked-extended-derivation', 1536); await p.close(); }
// 7 — visual on a portrait tablet: a landscape demonstration area, not a graph that swallows the page.
{ const p = await open(834, 1112, WEX); await pick(p, GX[1]);
  await shotWhole(p, '7-worked-visual-portrait-tablet', 834); await p.close(); }
// 8 — comparison on a phone.
{ const p = await open(414, 896, WEX); await pick(p, GX[2]);
  await shotWhole(p, '8-worked-comparison-phone', 414); await p.close(); }
// 9 — extended, narrow.
{ const p = await open(414, 896, 0, CMP); await pick(p, CX[1]);
  await shotWhole(p, '9-worked-extended-narrow', 414); await p.close(); }
// Supplementary regression evidence, not part of the approval set.
{
  const a = await open(834, 1112, NOTES); await shotWhole(a, '10-supplementary-notes-tablet-stacked', 834); await a.close();
  const p = await open(1180, 1024, NOTES);
  await p.evaluate(() => openWorksheet());
  await p.waitForTimeout(700);
  const h = await p.evaluate(() => Math.min(9000, Math.ceil(document.querySelector('#wsSheet').getBoundingClientRect().height) + 40));
  await p.setViewportSize({ width: 1180, height: h });
  await p.waitForTimeout(500);
  await shot(p, '11-supplementary-flat-worksheet-everything', '#wsSheet');
  const n = await p.evaluate(() => { const s = document.querySelector('#wsSheet');
    return { notes: s.querySelectorAll('.ws-mx-rep > h3.ws-mx-reph').length,
      groups: s.querySelectorAll('.ws-mx-grp').length,
      ex: s.querySelectorAll('.ws-mx-exh').length,
      steps: s.querySelectorAll('.ws-mx-steps > li').length }; });
  console.log(`   (11: ${n.notes} Notes examples, ${n.groups} worked-example groups holding ${n.ex} examples, `
    + `${n.steps} solution steps — all of them, none left behind a tab)`);
  await p.close();
}
await browser.close(); server.close();
console.log('\nwrote ' + path.relative(root, OUT));
