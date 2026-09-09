#!/usr/bin/env node
// THE STAGE C PROOF SET — Notes and Worked Examples, rendered from the authored quadratic lesson.
//
//   node scripts/shots-notes-examples.mjs [outDir]
//
// Every page here is drawn from tests/visual/lessons/mathematics-shell.json. Nothing is posed: the tabs,
// their labels and their order, the concept list, the examples and their steps are what the JSON says.
// scripts/verify-notes-examples.mjs is the gate; this is the picture of what it asserts.
//
// THE PRIMITIVE IS THE PROOF. One worked example is one named-region rectangle — TITLE spanning, QUESTION |
// WORKED SOLUTION on one line, ANSWER the final band of the working — and `standard` is one instance of it,
// `sequence` is N. Shots 1–5 show that same rectangle at one, two and three examples, split and stacked;
// 6–8 the comparison as three zones and, below its floors, as two stages; 9 the graph check as two sibling
// regions. Nothing is posed and nothing is centred.
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

/* THE VIABILITY WIDTH IS FOUND, NOT ASSUMED. The floors are read from the properties the app publishes and
   the surface is MEASURED at each candidate viewport — the shell's own width is never a constant here —
   so the transition proofs are taken one pixel of surface either side of where the composition changes. */
const floors = await (async () => {
  const p = await open(1536, 1000, WEX);
  const f = await p.evaluate(() => { const cs = getComputedStyle(document.querySelector('.mx-wex'));
    const n = (k) => parseInt(cs.getPropertyValue(k), 10);
    return { ask: n('--mx-ask-min'), plot: n('--mx-plot-min-w'), zone: n('--mx-zone-pad') }; });
  await p.close(); return f;
})();
const NEED = 2 * (floors.ask + floors.zone) + floors.plot + 2 * floors.zone + 2;
const innerAt = async (w) => { const p = await open(w, 1100, WEX); await pick(p, GX[2]);
  const inner = await p.evaluate(() => { const s = document.querySelector('[data-mx-panel]:not([hidden]) .mx-wexsurface');
    const cs = getComputedStyle(s); return Math.round(s.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)); });
  await p.close(); return inner; };
let lo = 1000, hi = 1700;                                   /* the viewport whose surface is exactly NEED */
while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (await innerAt(mid) >= NEED) hi = mid; else lo = mid; }
const VIABLE = hi;
console.log(`comparison viability: ${NEED}px of surface (2 × (${floors.ask} + ${floors.zone}) + ${floors.plot} + 2 × ${floors.zone} + 2)`
  + ` → measured at a ${VIABLE}px viewport with the rail open (${await innerAt(VIABLE)}px inner; ${await innerAt(VIABLE - 1)}px one pixel narrower)\n`);

// THE NINE PROOFS THE MAINTAINER NAMED, then the two transition widths.
// 1 · 2 — standard: one instance of the primitive, split and stacked.
{ const p = await open(1536, 1024, 0, CMP); await pick(p, CX[1]);
  await shotWhole(p, '1-standard-1536', 1536);
  await report(p, '1 Standard 1536px', 'TITLE spanning · QUESTION | WORKED SOLUTION on one line · ANSWER the final band of the working'); await p.close(); }
{ const p = await open(414, 896, 0, CMP); await pick(p, CX[1]);
  await shotWhole(p, '2-standard-414', 414);
  await report(p, '2 Standard 414px', 'the same regions in the same order — title, question, worked solution, answer — no rule, one inset'); await p.close(); }
// 3 · 4 · 5 — sequence: N instances of the same primitive, at 2, at 3, and stacked.
{ const p = await open(1536, 1024, WEX); await pick(p, GX[0]);
  await shotWhole(p, '3-sequence-2-1536', 1536);
  await report(p, '3 Sequence × 2 1536px (the shipping Substitution page)', 'two identical instances, full width, a rule between them, the synthesis after both'); await p.close(); }
{ const p = await open(1536, 1024, 0, CMP); await pick(p, CX[0]);
  await shotWhole(p, '4-sequence-3-1536', 1536);
  await report(p, '4 Sequence × 3 1536px', 'the same two examples plus a third — identical geometry at every count, no 2 + 1, nothing centred'); await p.close(); }
{ const p = await open(414, 896, WEX); await pick(p, GX[0]);
  await shotWhole(p, '5-sequence-414', 414);
  await report(p, '5 Sequence 414px', 'each instance stacks internally before the next begins; the relationship follows the whole sequence'); await p.close(); }
// 6 · 7 · 8 — comparison: three zones while viable, staged when not.
{ const p = await open(1536, 1024, WEX); await pick(p, GX[2]);
  await shotWhole(p, '6-comparison-wide-1536', 1536);
  await report(p, '6 Symmetry 1536px', 'CASE A | VISUAL EXPLANATION | CASE B — three zones on one line, rules the full height, the plane at natural scale'); await p.close(); }
{ const p = await open(414, 896, WEX); await pick(p, GX[2]);
  await shotWhole(p, '7-comparison-workings-414', 414);
  await report(p, '7 Symmetry 1/2 Workings 414px', 'two instances of the normal primitive, both complete — the picture is NOT between them');
  await stage(p, 'visual'); await shotWhole(p, '8-comparison-visual-414', 414);
  await report(p, '8 Symmetry 2/2 Visual explanation 414px', 'GRAPH, then the authored relationship — after both workings'); await p.close(); }
// 9 — the staged graph check: GRAPH | INTERPRETATION.
{ const p = await open(1536, 1024, WEX); await pick(p, GX[1]);
  await stage(p, 'graph'); await shotWhole(p, '9-graph-check-1536', 1536);
  await report(p, '9 Graph check 1536px', 'GRAPH | INTERPRETATION as sibling regions with one top edge and one rule; the plane at its natural size and equal scale'); await p.close(); }
// 10 · 11 — one pixel of surface either side of viability, so only the composition changes.
{ const p = await open(VIABLE, 1100, WEX); await pick(p, GX[2]);
  await shotWhole(p, '10-comparison-just-above-viability', VIABLE);
  await report(p, `10 Symmetry at ${VIABLE}px — just ABOVE viability`, 'the surface is exactly what three zones need: still simultaneous'); await p.close(); }
{ const p = await open(VIABLE - 1, 1100, WEX); await pick(p, GX[2]);
  await shotWhole(p, '11-comparison-just-below-viability', VIABLE - 1);
  await report(p, `11 Symmetry at ${VIABLE - 1}px — just BELOW viability`, 'one pixel less: a staged relationship, not a squeezed bridge'); await p.close(); }

await browser.close(); server.close();
console.log('\nwrote ' + path.relative(root, OUT));
