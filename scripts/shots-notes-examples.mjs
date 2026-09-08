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
const stage = async (p, id) => { await p.click(`[data-mx-state="${id}"]`); await p.waitForTimeout(900); };
/* THE RENDERED TRANSFORM, per axis: engine units per math unit times the paint scale of that axis. */
const scales = (p) => p.evaluate(() => {
  const out = [];
  document.querySelectorAll('.mx-part[data-mx-part="figure"] .tp-fig').forEach((fig) => {
    const svg = fig.querySelector('.tp-fig-svg');
    if (!svg || !svg.getBoundingClientRect().width) return;
    const vb = svg.getAttribute('viewBox').split(/\s+/).map(Number), r = svg.getBoundingClientRect();
    const kx = r.width / vb[2], ky = r.height / vb[3];
    const labs = [].slice.call(svg.querySelectorAll('.tp-fig-ticklabel'));
    const val = (t) => parseFloat(t.textContent.replace('\u2212', '-'));
    const grab = (a, at) => labs.filter((t) => t.getAttribute('text-anchor') === a)
      .map((t) => ({ v: val(t), px: +t.getAttribute(at) })).filter((o) => isFinite(o.v));
    const per = (a) => { if (a.length < 2) return null; a.sort((m, n) => m.v - n.v);
      const d = a[a.length - 1].v - a[0].v; return d ? Math.abs((a[a.length - 1].px - a[0].px) / d) : null; };
    const ux = per(grab('middle', 'x')), uy = per(grab('end', 'y'));
    if (ux == null || uy == null) return;
    out.push({ x: +(ux * kx).toFixed(2), y: +(uy * ky).toFixed(2), ratio: +((ux * kx) / (uy * ky)).toFixed(3),
      plot: Math.round(r.width) + '×' + Math.round(r.height) });
  });
  return out; });
const report = async (p, name, why) => {
  console.log(`      ${name} — ${why}`);
  const sc = await scales(p);
  if (!sc.length) { console.log('        (no coordinate plane in this composition)'); return; }
  sc.forEach((o) => console.log(`        px/x-unit ${o.x} · px/y-unit ${o.y} · ratio ${o.ratio} `
    + `(authored 1:1) in a ${o.plot} plot` + (Math.abs(o.ratio - 1) <= 0.05 ? '  ✓' : '  ✗ DISTORTED')));
};

// 1 — Notes desktop.
{ const p = await open(1536, 1024, NOTES); await shotWhole(p, '1-notes-desktop', 1536);
  await report(p, '1 Notes desktop', 'concepts beside one exploration surface; the plane is the subject of its panel'); await p.close(); }
// 2 — compact, three examples (2 + 1).
{ const p = await open(1536, 1024, 0, CMP); await pick(p, CX[0]);
  await shotWhole(p, '2-compact-three-examples', 1536);
  await report(p, '2 Compact ×3', 'three short examples of one skill: 2 + 1, the third centred, no reserved visual region'); await p.close(); }
// 3 — standard, one example.
{ const p = await open(1536, 1024, 0, CMP); await pick(p, CX[1]);
  await shotWhole(p, '3-standard-single-example', 1536);
  await report(p, '3 Standard', 'one ordinary example needing no major representation: a centred reading measure, not half an empty canvas'); await p.close(); }
// 4 · 5 — staged: algebra, then the graph its own surface.
{ const p = await open(1536, 1024, WEX); await pick(p, GX[1]);
  await shotWhole(p, '4-staged-worked-solution', 1536);
  await report(p, '4 Staged 1/2', 'the algebra reaches its answer without scrolling past a full-height plane');
  await stage(p, 'graph'); await shotWhole(p, '5-staged-graph-check', 1536);
  await report(p, '5 Staged 2/2', 'an equal-scale plane too tall to embed gets its own state instead of being flattened'); await p.close(); }
// 6 — comparison, desktop.
{ const p = await open(1536, 1024, WEX); await pick(p, GX[2]);
  await shotWhole(p, '6-comparison-desktop', 1536);
  await report(p, '6 Comparison', 'two cases whose relationship is the teaching point, side by side'); await p.close(); }
// 7 — extended, first state.
{ const p = await open(1536, 1024, 0, CMP); await pick(p, CX[2]);
  await shotWhole(p, '7-extended-first-state', 1536);
  await report(p, '7 Extended 1/3', 'a long derivation read in authored stages rather than one expanding document'); await p.close(); }
// 8 — comparison, phone.
{ const p = await open(414, 896, WEX); await pick(p, GX[2]);
  await shotWhole(p, '8-comparison-phone', 414);
  await report(p, '8 Comparison phone', 'the cases stack; local state navigation survives'); await p.close(); }
// 9 — staged visual state, phone.
{ const p = await open(414, 896, WEX); await pick(p, GX[1]); await stage(p, 'graph');
  await shotWhole(p, '9-staged-graph-check-phone', 414);
  await report(p, '9 Staged 2/2 phone', 'a smaller box of the same shape — never a different shape'); await p.close(); }
// 10 — the tablet width where the compact set changes structure.
{ const p = await open(980, 1200, 0, CMP); await pick(p, CX[0]);
  await shotWhole(p, '10-compact-tablet-structure-change', 980);
  await report(p, '10 Compact at 980px', 'below the measure where two examples still read as examples, the set stacks'); await p.close(); }
await browser.close(); server.close();
console.log('\nwrote ' + path.relative(root, OUT));
