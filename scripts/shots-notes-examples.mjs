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
const pick = async (p, tab) => { await p.click(`[data-mx-tab="${tab}"]`); await p.waitForTimeout(750); };
/* THE RENDERED TRANSFORM, per axis: engine units per math unit times the paint scale of that axis. */
const scales = (p) => p.evaluate(() => {
  const out = [];
  document.querySelectorAll('.mx-part[data-mx-part="figure"] .tp-fig').forEach((fig) => {
    const svg = fig.querySelector('.tp-fig-svg');
    if (!svg || !fig.offsetWidth) return;
    const vb = svg.getAttribute('viewBox').split(/\s+/).map(Number), r = svg.getBoundingClientRect();
    const kx = r.width / vb[2], ky = r.height / vb[3];
    const labs = [].slice.call(svg.querySelectorAll('.tp-fig-ticklabel'));
    const val = (t) => parseFloat(t.textContent.replace('\u2212', '-'));
    const grab = (anchor, attr) => labs.filter((t) => t.getAttribute('text-anchor') === anchor)
      .map((t) => ({ v: val(t), px: +t.getAttribute(attr) })).filter((o) => isFinite(o.v));
    const per = (a) => { if (a.length < 2) return null; a.sort((m, n) => m.v - n.v);
      const d = a[a.length - 1].v - a[0].v; return d ? Math.abs((a[a.length - 1].px - a[0].px) / d) : null; };
    const ux = per(grab('middle', 'x')), uy = per(grab('end', 'y'));
    if (ux == null || uy == null) return;
    out.push({ x: +(ux * kx).toFixed(2), y: +(uy * ky).toFixed(2), ratio: +((ux * kx) / (uy * ky)).toFixed(3),
      plot: Math.round(r.width) + '×' + Math.round(r.height) });
  });
  return out; });
const report = async (p, name) => { const sc = await scales(p);
  sc.forEach((o) => console.log(`      ${name}: authored 1:1 → rendered ${o.ratio}:1 `
    + `(x ${o.x}px/unit, y ${o.y}px/unit) in a ${o.plot} plot`
    + (Math.abs(o.ratio - 1) <= 0.05 ? '  ✓' : '  ✗ DISTORTED'))); };

// 1 · 2 — Notes.
{ const p = await open(1536, 1024, NOTES); await shotWhole(p, '1-notes-desktop', 1536); await report(p, '1'); await p.close(); }
{ const p = await open(834, 1112, NOTES); await shotWhole(p, '2-notes-tablet', 834); await report(p, '2'); await p.close(); }
// 3 · 4 — compact: the anatomy, then the 2 + 1 contract.
{ const p = await open(1536, 1024, WEX); await shotWhole(p, '3-compact-two-examples-question-solution-answer', 1536); await p.close(); }
{ const p = await open(1536, 1024, 0, CMP); await pick(p, CX[0]);
  await shotWhole(p, '4-compact-three-examples-centred-2plus1', 1536); await p.close(); }
// 5 · 6 — visual: natural graph geometry, then the tablet where it stacks and the page grows.
{ const p = await open(1536, 1024, WEX); await pick(p, GX[1]);
  await shotWhole(p, '5-visual-solving-for-x-desktop', 1536); await report(p, '5'); await p.close(); }
{ const p = await open(834, 1112, WEX); await pick(p, GX[1]);
  await shotWhole(p, '6-visual-solving-for-x-tablet-scrolls', 834); await report(p, '6'); await p.close(); }
// 7 · 8 — comparison: the natural shared plane, and the phone.
{ const p = await open(1536, 1024, WEX); await pick(p, GX[2]);
  await shotWhole(p, '7-comparison-symmetry-desktop', 1536); await report(p, '7'); await p.close(); }
{ const p = await open(414, 896, WEX); await pick(p, GX[2]);
  await shotWhole(p, '8-comparison-symmetry-phone', 414); await report(p, '8'); await p.close(); }
// 9 · 10 — extended: reading flow → visual breakout → reading flow.
{ const p = await open(1536, 1024, 0, CMP); await pick(p, CX[1]);
  await shotWhole(p, '9-extended-derivation-desktop', 1536); await report(p, '9'); await p.close(); }
{ const p = await open(414, 896, 0, CMP); await pick(p, CX[1]);
  await shotWhole(p, '10-extended-derivation-narrow', 414); await report(p, '10'); await p.close(); }
// Supplementary regression evidence, not part of the approval set.
{
  const p = await open(1180, 1024, NOTES);
  await p.evaluate(() => openWorksheet());
  await p.waitForTimeout(700);
  const h = await p.evaluate(() => Math.min(9000, Math.ceil(document.querySelector('#wsSheet').getBoundingClientRect().height) + 40));
  await p.setViewportSize({ width: 1180, height: h });
  await p.waitForTimeout(500);
  await shot(p, '11-supplementary-flat-worksheet-everything', '#wsSheet');
  await p.close();
}
await browser.close(); server.close();
console.log('\nwrote ' + path.relative(root, OUT));
