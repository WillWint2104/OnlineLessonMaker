#!/usr/bin/env node
// THE ZONE-CONTRACT PACK — the layout grammar of the Mathematics worked-example compositions.
//
//   node scripts/mockups-compositions.mjs [outDir]
//
// This pack describes a SYSTEM, not a set of screens. Three properties make that a checked fact
// rather than a claim:
//
//  1. NO WIDTH IN THIS PACK IS TYPED. Every track width is computed from the region contracts in
//     `src/contracts.json` — a minimum, a growth weight, a reading measure — and every responsive
//     threshold is generated as the SUM `min + gap + min`. After rendering, the realised widths are
//     measured back out of the browser and compared against an independent computation of the same
//     contract; a disagreement fails the build. A `-spec` image prints the contract AND the width it
//     actually produced, side by side.
//  2. ONE FRAGMENT SERVES EVERY SURFACE. A composition is authored once and rendered at each
//     reference width; the responsive state is chosen by a container query, not by a second file.
//     The build then asserts the semantic payload is character-identical across those renders — the
//     control that catches a narrow proof quietly carrying fewer examples than its desktop twin.
//  3. EVERY PLANE IS THE SHIPPED ENGINE'S OUTPUT, solved at the size the grammar gives it. Sizes are
//     never authored: `figures.json` holds domains only, and the same plane is deliberately a
//     different size in different states, because a realised size was never the contract.
//
// The app is not changed by this script and does not read anything under docs/mockups/.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(root, 'docs/mockups/compositions/src');
const OUT = path.resolve(process.argv[2] || path.join(root, 'docs/mockups/compositions'));
fs.mkdirSync(OUT, { recursive: true });

const C = JSON.parse(fs.readFileSync(path.join(SRC, 'contracts.json'), 'utf8'));
const FIGS = JSON.parse(fs.readFileSync(path.join(SRC, 'figures.json'), 'utf8'));
const KIT = fs.readFileSync(path.join(SRC, 'kit.css'), 'utf8');

/* ── THE CONTRACT, IN ARITHMETIC ───────────────────────────────────────────────────────────────
   Everything below is derived from contracts.json. These functions are the ONLY place a number is
   produced, and they are used three times over: to generate the layout CSS, to generate the state
   thresholds, and — independently of the browser — to predict what the render must measure. */
const REM = C.base.rem;
const px = (rem) => Math.round(rem * REM);
const R = C.regions;
const GAP = px(C.gap.rem);

const FLOOR = {
  instructionSplit: px(R.prompt.min) + GAP + px(R.solution.min),
  repeatAcross: px(R.case.min) + GAP + px(R.case.min),
  visualInterpretation: R.figure.minW + GAP + px(R.interpretation.min),
};

/* resolver step 4, exactly as CSS `minmax(min, Nfr)` performs it: distribute the content region by
   growth weight, freeze any track that would fall below its minimum, redistribute the remainder. */
function twoTrack(surface, a, b) {
  const avail = surface - GAP, wsum = a.grow + b.grow;
  let wa = avail * (a.grow / wsum), wb = avail - wa;
  const amin = px(a.min), bmin = px(b.min);
  if (wa < amin) { wa = amin; wb = avail - amin; }
  else if (wb < bmin) { wb = bmin; wa = avail - bmin; }
  return { a: wa, b: wb };
}

/* A PLANE'S REALISED SIZE. The scale is one number: px per authored unit, the same on both axes.
   It is bounded above by the longer-side bound and by the space available. The legibility floor
   (`minWidth`) is what viability is tested against — but it is an ADVISORY here, not a second
   bound, because the two are not jointly satisfiable for an extreme aspect and the bound is the
   one the engine physically enforces.

   MEASURED, not assumed: handing the shipped engine a box taller than MX_PLOT_H (720px) makes it
   stretch. A 6 x 16 domain in a 340 x 907 box — the box the floor would demand — renders at
   x/y = 0.79, i.e. one x-unit is 79% of one y-unit. So the scale may never exceed `sNat`, and a
   plane whose natural size is already under the floor is reported (`belowFloor`) rather than
   grown into a distortion. See README section 6. */
function planeGeom(dom) {
  const xs = dom.xMax - dom.xMin, ys = dom.yMax - dom.yMin;
  const sMin = Math.max(R.figure.minW / xs, R.figure.minH / ys);
  const sNat = R.figure.bound / Math.max(xs, ys);
  return { xs, ys, sMin, sNat, floorWidth: xs * sMin, natWidth: xs * sNat };
}
function solvePlane(dom, avail) {
  const g = planeGeom(dom);
  const s = Math.min(g.sNat, avail / g.xs);
  return { w: Math.round(g.xs * s), h: Math.round(g.ys * s), s,
    atFloor: s <= g.sMin + 0.001 && g.sNat > g.sMin,
    belowFloor: s < g.sMin - 0.001,
    atNatural: Math.abs(s - g.sNat) < 0.001 };
}
/* the visualInterpretation split is viable only while the plane can be drawn at the smallest width
   it may legally take — its legibility floor, or its natural size when that is already smaller —
   AND the interpretation rail still clears its own minimum. */
const viViable = (dom, surface) => {
  const g = planeGeom(dom);
  return Math.min(g.floorWidth, g.natWidth) + GAP + px(R.interpretation.min) <= surface;
};

/* ── GENERATED CSS ─────────────────────────────────────────────────────────────────────────────
   A container query cannot read a custom property, which is a useful constraint: it forces the
   thresholds to be written out as literal sums, so they are produced here by arithmetic on the
   contracts and can never be typed by hand into a stylesheet. */
const tokens = (surface, pad) => `:root{
  --mk-surface-w:${surface}px; --mk-pad:${pad}px; --mk-gap:${GAP}px;
  --mk-rowgap:34px; --mk-stackgap:22px;
  --mk-prompt-min:${px(R.prompt.min)}px;   --mk-prompt-grow:${R.prompt.grow}fr;   --mk-prompt-measure:${px(R.prompt.measure)}px;
  --mk-solution-min:${px(R.solution.min)}px; --mk-solution-grow:${R.solution.grow}fr; --mk-solution-measure:${px(R.solution.measure)}px;
  --mk-case-min:${px(R.case.min)}px;
  --mk-interp-min:${px(R.interpretation.min)}px; --mk-interp-measure:${px(R.interpretation.measure)}px;
  --mk-synthesis-measure:${px(R.synthesis.measure)}px;
}`;
const STATES = `
/* GENERATED FROM contracts.json — each threshold is a sum of two minimums and one gap. */
@container surface (max-width:${FLOOR.instructionSplit - 0.02}px){
  [data-mk="instructionSplit"]{grid-template-columns:minmax(0,1fr);
    grid-template-areas:"title" "prompt" "solution";row-gap:var(--mk-stackgap);}
  [data-mk="instructionSplit"] > [data-mk-region="title"]{margin-bottom:0;}
  [data-mk="instructionSplit"] > .mk-rule{display:none;}
}
@container surface (max-width:${FLOOR.repeatAcross - 0.02}px){
  [data-mk="repeat"][data-mk-axis="across"]{grid-auto-flow:row;grid-auto-columns:minmax(0,1fr);
    row-gap:var(--mk-stackgap);}
}
@container surface (max-width:${FLOOR.visualInterpretation - 0.02}px){
  [data-mk="visualInterpretation"]{grid-template-columns:minmax(0,1fr);
    grid-template-areas:"figure" "interpretation";row-gap:var(--mk-stackgap);}
}`;
for (const [k, v] of Object.entries(FLOOR))
  if (!STATES.includes(String(v - 0.02))) throw new Error('the generated state CSS lost the ' + k + ' threshold');

/* ── THE ANNOTATION LAYER — generated from the same contracts that drive the layout ───────────── */
const band = (r) => `min ${R[r].min}rem (${px(R[r].min)}px) · growth weight ${R[r].grow} · prose measure ${R[r].measure}rem (${px(R[r].measure)}px)`;
const DIM = {
  prompt: `PROMPT TRACK · ${band('prompt')}. No fill, no border, no stretching — a track is a position.`,
  solution: `SOLUTION TRACK · ${band('solution')}. The measure caps the prose, not the track: surplus width stays unused.`,
  case: `CASE · ${band('case')}. Repeated children share one track contract, so the count cannot change the geometry.`,
  figure: `FIGURE · content-sized. Intrinsic aspect preserved, longer side bounded at ${R.figure.bound}px, floored at ${R.figure.minW} × ${R.figure.minH}px. Never fr-sized, never distorted.`,
  interpretation: `INTERPRETATION RAIL · ${band('interpretation')}. Takes the remainder beside the plane, so no space is left unclaimed.`,
  splitFloor: `instructionSplit is viable while the content region ≥ ${px(R.prompt.min)} + ${GAP} + ${px(R.solution.min)} = ${FLOOR.instructionSplit}px. Below it: stack.`,
  acrossFloor: `repeat(across) is viable while the content region ≥ ${px(R.case.min)} + ${GAP} + ${px(R.case.min)} = ${FLOOR.repeatAcross}px.`,
  viFloor: `visualInterpretation is viable while the content region ≥ the plane's own legible minimum + ${GAP} + ${px(R.interpretation.min)} (≥ ${FLOOR.visualInterpretation}px for an ordinary aspect).`,
  repeatCount: `Three examples here; the geometry is identical at two, four or ten. The count appears nowhere in the layout — repeat(down) is a column of identical children, which is why a 2 + 1 arrangement cannot be expressed.`,
  repeatAcross: `repeat(across) over the cases: auto-flow columns sharing one track contract. Two cases are two columns; the arrangement is not designed per count.`,
  asmStandard: C.compositions.standard.assembly,
  asmSequence: C.compositions.sequence.assembly,
  asmPaired: C.compositions.pairedVisual.assembly,
  asmVisualCheck: C.compositions.visualCheck.assembly,
  asmExtended: C.compositions.extended.assembly,
};

/* ── the app's own material, read from the CSSOM (slicing <style> out of the text mis-pairs on the
      file's own comments and silently drops rule blocks) ───────────────────────────────────────── */
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
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});

const APP_CSS = await (async () => {
  const p = await browser.newPage();
  await p.goto(base, { waitUntil: 'load' });
  const css = await p.evaluate(() => [].slice.call(document.styleSheets)
    .map((sh) => { try { return [].slice.call(sh.cssRules).map((r) => r.cssText).join('\n'); } catch (e) { return ''; } })
    .join('\n'));
  await p.close();
  return css;
})();
for (const [re, what] of [[/\.tp-slide \.tp-fig-grid/, 'the figure grid rule'], [/@font-face/, 'the vendored faces'],
                          [/\.mx-figskin\.tp-slide/, 'the page family’s figure token mapping'], [/\.mx *\{/, 'the .mx token block']])
  if (!re.test(APP_CSS)) throw new Error('the lifted stylesheet is missing ' + what);
console.log(`lifted ${Math.round(APP_CSS.length / 1024)}KB of the app's own stylesheet`);

/* ── SOLVE EVERY PLANE AT EVERY SURFACE, BY ASKING THE ENGINE ─────────────────────────────────
   The figure row of the contract says "engine-derived", and this is that, literally. A plane's box
   is not computed from its domain and hoped for: it is SEARCHED FOR, and the search is scored by
   the painted result — px per authored x-unit against px per authored y-unit, read off the tick
   labels of the rendered SVG.

   That is necessary, not fastidious. MEASURED on the shipped engine: a 24 x 8 domain in a 720 x 255
   box — the box its own aspect asks for — renders at x/y = 1.79, because the engine reserves a fixed
   pixel gutter for axis labels which a shallow box is mostly made of. The same domain at 720 x 420
   renders at 1.003. No closed-form box aspect predicts that, so the build bisects the slack axis
   until the plane is square and fails outright if no box in [minW..bound] can be.

   The consequence for the contract is the point of it: a plane's realised size is a RESULT of its
   domain, the engine's own gutters and the space the grammar can spare — never a number in a spec. */
const figPage = await browser.newPage({ viewport: { width: 1700, height: 1600 }, deviceScaleFactor: 2 });
await figPage.goto(base, { waitUntil: 'load' });

const paint = (key, fig, w, h) => figPage.evaluate(async ({ key, fig, w, h }) => {
  const host = document.createElement('div');
  host.className = 'mx';
  host.style.cssText = `position:absolute;left:-4000px;top:0;width:${w}px;`;
  host.innerHTML = `<div class="mx-part" data-mx-part="figure" data-fig-viewport
    style="position:relative;width:${w}px;height:${h}px;"><div class="mx-figstage"><div
    class="mx-figskin tp-slide"></div></div></div>`;
  document.querySelector('#slide').appendChild(host);
  host.querySelector('.mx-figskin').innerHTML = fragFigure(mxFigPolicy(fig), 'mk-' + key);
  figFitAll();
  await new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res)));
  const el = host.querySelector('.tp-fig'), svg = el.querySelector('.tp-fig-svg');
  const vb = (svg.getAttribute('viewBox') || '0 0 1 1').split(/\s+/).map(Number);
  const rect = svg.getBoundingClientRect();
  const labs = [].slice.call(svg.querySelectorAll('.tp-fig-ticklabel'));
  const val = (t) => parseFloat(t.textContent.replace('−', '-'));
  const per = (anchor, at) => { const q = labs.filter((t) => t.getAttribute('text-anchor') === anchor)
      .map((t) => ({ v: val(t), px: +t.getAttribute(at) })).filter((o) => isFinite(o.v));
    if (q.length < 2) return null; q.sort((m, n) => m.v - n.v);
    const d = q[q.length - 1].v - q[0].v; return d ? Math.abs((q[q.length - 1].px - q[0].px) / d) : null; };
  const ux = per('middle', 'x'), uy = per('end', 'y');
  const x = ux == null ? null : +(ux * rect.width / vb[2]).toFixed(2);
  const y = uy == null ? null : +(uy * rect.height / vb[3]).toFixed(2);
  const html = el.outerHTML;
  host.remove();
  return { html, x, y, ratio: (x && y) ? +(x / y).toFixed(3) : null };
}, { key, fig, w, h });

const SQUARE = 0.006;                       /* one x-unit and one y-unit within 0.6% of each other */
async function fitPlane(key, fig, avail) {
  const g = planeGeom(fig.domain);
  let w = Math.round(Math.max(R.figure.minW, Math.min(g.natWidth, avail, R.figure.bound)));
  const tried = [];
  for (let narrowing = 0; narrowing < 5 && w >= R.figure.minW; narrowing++) {
    /* start from the box this domain's own aspect asks for, clamped into the legal range */
    let h = Math.round(Math.min(R.figure.bound, Math.max(R.figure.minH, g.ys * (w / g.xs))));
    let m = await paint(key, fig, w, h);
    tried.push(`${w}x${h}:${m.ratio}`);
    if (m.ratio != null && Math.abs(m.ratio - 1) <= SQUARE) return { w, h, ...m, tried };
    /* the ratio falls as the box grows taller, so bisect the slack axis */
    let lo = m.ratio > 1 ? h : R.figure.minH, hi = m.ratio > 1 ? R.figure.bound : h;
    for (let i = 0; i < 14 && hi - lo > 1; i++) {
      const mid = Math.round((lo + hi) / 2);
      const mm = await paint(key, fig, w, mid);
      tried.push(`${w}x${mid}:${mm.ratio}`);
      if (mm.ratio != null && Math.abs(mm.ratio - 1) <= SQUARE) return { w, h: mid, ...mm, tried };
      if (mm.ratio > 1) lo = mid; else hi = mid;
    }
    w = Math.round(w * 0.88);               /* no legal height at this width — narrow and retry */
  }
  throw new Error(`${key}: no box between ${R.figure.minW}px and ${R.figure.bound}px renders this `
    + `domain at equal scale — the engine's label gutters make it impossible. Tried ${tried.join(', ')}`);
}

const solved = {};
for (const [key, f] of Object.entries(FIGS)) {
  if (key.startsWith('_')) continue;
  solved[key] = {};
  for (const [sName, surface] of Object.entries(C.surfaces)) {
    if (sName.startsWith('_')) continue;
    const dom = f.figure.domain, g = planeGeom(dom);
    const split = viViable(dom, surface);
    const avail = split ? surface - GAP - px(R.interpretation.min) : surface;
    const box = await fitPlane(key, f.figure, avail);
    if (Math.max(box.w, box.h) > R.figure.bound + 1)
      throw new Error(`${key} at ${sName}: solved to ${box.w}×${box.h}, past the ${R.figure.bound}px bound`);
    if (box.w < R.figure.minW - 1 || box.h < R.figure.minH - 1)
      throw new Error(`${key} at ${sName}: solved to ${box.w}×${box.h}, under the ${R.figure.minW}×${R.figure.minH}px legibility floor`);
    solved[key][sName] = { ...box, split };
    const why = box.w >= Math.min(g.natWidth, avail, R.figure.bound) - 1 ? 'natural width'
      : box.w <= R.figure.minW + 1 ? 'at the legibility floor' : 'fitted to the track';
    console.log(`  ${key} @ ${sName}(${surface}) -> ${box.w}×${box.h}px  [${why}]  `
      + `${box.x}/${box.y} px per unit (${box.ratio})  ${box.tried.length} probe${box.tried.length > 1 ? 's' : ''}`);
  }
}
await figPage.close();

/* ── RENDER ────────────────────────────────────────────────────────────────────────────────────── */
const PACK = [
  { n: '01', frag: 'standard', at: ['desktop'], spec: true, k: 'standard · desktop',
    c: 'instructionSplit(prompt, solution) + synthesis. The two track widths on this page were computed from the region contracts — no percentage was typed anywhere.' },
  { n: '02', frag: 'standard', at: ['narrow'], k: 'standard · narrow',
    c: 'The same fragment below the split floor: the primitive falls back to stack, and the regions keep their semantic order on one inset.' },
  { n: '03', frag: 'sequence', at: ['desktop'], spec: true, k: 'sequence · desktop',
    c: 'repeat(down, standard). Not a sequence layout — the same instructionSplit as image 01, repeated. Three examples, but nothing in the geometry knows that.' },
  { n: '04', frag: 'sequence', at: ['narrow'], k: 'sequence · narrow',
    c: 'The same three examples, rendered from the same file. Each row reaches the split floor at the same width, so the sequence stacks as one.' },
  { n: '05', frag: 'pairedvisual', at: ['desktop'], spec: true, k: 'pairedVisual · desktop',
    c: 'repeat(across, case) + visualInterpretation(visual, interpretation). The old full-width shared visual left an unexplained empty region beside it; the interpretation rail is what that region was for.' },
  { n: '06', frag: 'pairedvisual', at: ['middle'], k: 'pairedVisual · an undesigned width',
    c: 'A width nobody designed for: above the repeat-across floor, below the visualInterpretation floor. The cases stay side by side and the figure pair stacks. This middle state was not authored — it is what the grammar produces here.' },
  { n: '07', frag: 'pairedvisual', at: ['narrow'], k: 'pairedVisual · narrow',
    c: 'Case A, case B, the shared visual, the interpretation. The plane never appears between the two cases in any state.' },
  { n: '08', frag: 'visualcheck', at: ['desktop'], spec: true, k: 'visualCheck · desktop',
    c: 'State 1 is an instructionSplit; state 2 is a visualInterpretation. visualCheck introduces no layout of its own — it is two states choosing two existing primitives.' },
  { n: '09', frag: 'visualcheck', at: ['narrow'], k: 'visualCheck · narrow',
    c: 'Both states stack. The plane is a different size here than at 08 because the space available to it is different — the aspect is not.' },
  { n: '10', frag: 'extended', at: ['desktop'], k: 'extended · local states',
    c: 'Three states, three primitives: instructionSplit, visualInterpretation, stack. A derivation is paginated, never stretched.' },
  { n: '11', frag: 'adv-long-question', at: ['desktop'], spec: true, k: 'adversarial · long question',
    c: 'The prompt is the taller track. Neither track is a box, so nothing is stretched to match.' },
  { n: '12', frag: 'adv-long-solution', at: ['desktop'], spec: true, k: 'adversarial · long solution',
    c: 'The shape that produced the original defect: a seven-step solution beside a one-line question.' },
  { n: '13', frag: 'adv-wide-equation', at: ['desktop'], spec: true, k: 'adversarial · over-wide mathematics',
    c: 'A line wider than its track. It scrolls locally; it does not take width from the question, shrink the type, or change the composition.' },
  { n: '14', frag: 'adv-portrait-graph', at: ['desktop'], spec: true, k: 'adversarial · portrait plane',
    c: 'An aspect taller than the longer-side bound allows. The floor wins, the plane is drawn at its smallest legible scale, and the page gets taller.' },
  { n: '15', frag: 'adv-landscape-graph', at: ['desktop'], spec: true, k: 'adversarial · landscape plane · split holds',
    c: 'A 24 × 8 domain. At its bound the plane is 720px wide, leaving the interpretation rail 400px — just above its 384px minimum. The split holds, and nothing was squeezed to make it.' },
  { n: '15b', frag: 'adv-landscape-graph', at: ['middle'], k: 'adversarial · landscape plane · split abandoned',
    c: 'The same fragment where that arithmetic fails: the plane plus the gap plus the rail\u2019s minimum no longer fit. The split is abandoned rather than the plane squeezed — resolver rule 8.' },
  { n: '16', frag: 'standard', at: ['floor'], spec: true, k: 'threshold · at the floor',
    c: `The content region is exactly ${FLOOR.instructionSplit}px — the computed sum. Both tracks sit on their minimums and the split still holds.` },
  { n: '17', frag: 'standard', at: ['belowFloor'], k: 'threshold · one pixel below',
    c: `One pixel narrower. Nothing else changed, and the primitive falls back to stack — the switch is the arithmetic, not a chosen breakpoint.` },
];
const SURFACE = { ...C.surfaces, floor: FLOOR.instructionSplit, belowFloor: FLOOR.instructionSplit - 1 };
const padFor = (s) => (s <= 500 ? C.surfacePad.narrow : C.surfacePad.desktop);
const figSurface = (s) => (s >= C.surfaces.desktop ? 'desktop' : s >= C.surfaces.middle ? 'middle' : 'narrow');

const readFrag = (f) => fs.readFileSync(path.join(SRC, f + '.html'), 'utf8')
  .replace(/\{\{PART:([a-z0-9_-]+)\}\}/gi, (m, p) => fs.readFileSync(path.join(SRC, p + '.part'), 'utf8'))
  .replace(/\{\{DIM:([a-zA-Z]+)\}\}/g, (m, k) => { if (!(k in DIM)) throw new Error('no contract label for ' + k); return DIM[k]; });

const payloads = {};
const shot = async (name, fragName, surfaceName, opts) => {
  const surface = SURFACE[surfaceName], pad = padFor(surface), narrow = surface <= 500;
  let html = readFrag(fragName);
  const fs2 = figSurface(surface);
  for (const [key, per] of Object.entries(solved)) {
    const f = per[fs2];
    html = html.split(`{{FIG:${key}}}`).join(
      `<div class="mx-part" data-mx-part="figure" data-fig-viewport style="position:relative;`
      + `width:${f.w}px;height:${f.h}px;max-width:100%"><div class="mx-figstage"><div class="mx-figskin tp-slide">`
      + f.html + '</div></div></div>');
  }
  const left = html.match(/\{\{[A-Z]+:([a-z0-9-]+)\}\}/i);
  if (left) throw new Error(`${name}: unresolved placeholder ${left[0]}`);

  const doc = `<!doctype html><html data-theme="mathematics"><head><meta charset="utf-8"><style>
${APP_CSS}
</style><style>
${tokens(surface, pad)}
${KIT}
${STATES}
</style></head><body class="mx${narrow ? ' mk-narrow' : ''}"><div class="mk-page">
<div class="mk-caption"><span class="mk-caption-k">${opts.k}</span>${opts.c}</div>
<div class="mk-surface"${opts.spec ? ' data-mk-spec' : ''}>${html}</div>
</div></body></html>`;

  const p = await browser.newPage({ viewport: { width: surface + 2 * pad + 120, height: 900 }, deviceScaleFactor: 2 });
  const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
  if (process.env.MK_DUMP) fs.writeFileSync(path.join(OUT, name + '.debug.html'), doc);
  await p.setContent(doc, { waitUntil: 'load' });
  await p.waitForTimeout(420);

  /* MEASURE THE RENDER BACK. The realised widths are read off the page and written into the
     annotation, so a `-spec` image shows the contract and the width that contract produced. */
  const measured = await p.evaluate(() => {
    const out = { states: [], payload: '', regions: [] };
    document.querySelectorAll('[data-mk-measure]').forEach((el) => {
      const r = el.getAttribute('data-mk-measure');
      const owner = el.closest('[data-mk-region="' + r + '"]') || el.parentElement;
      el.insertAdjacentHTML('beforeend', ' <b>Realised here: ' + Math.round(owner.getBoundingClientRect().width) + 'px.</b>');
    });
    document.querySelectorAll('[data-mk]').forEach((el) => {
      const kids = [].slice.call(el.children);
      const pick = (r) => kids.filter((c) => c.getAttribute('data-mk-region') === r)
        .map((c) => Math.round(c.getBoundingClientRect().width));
      const tops = (r) => kids.filter((c) => c.getAttribute('data-mk-region') === r)
        .map((c) => Math.round(c.getBoundingClientRect().top));
      out.states.push({ kind: el.getAttribute('data-mk'), axis: el.getAttribute('data-mk-axis'),
        prompt: pick('prompt'), solution: pick('solution'), figure: pick('figure'),
        plane: kids.filter((c) => c.getAttribute('data-mk-region') === 'figure')
          .map((c) => { const q = c.querySelector('[data-mx-part="figure"]');
            return q ? Math.round(q.getBoundingClientRect().width) : null; }),
        interpretation: pick('interpretation'), case: pick('case'),
        topsA: tops('prompt').concat(tops('figure')).concat(tops('case')),
        topsB: tops('solution').concat(tops('interpretation')),
        w: Math.round(el.getBoundingClientRect().width) });
    });
    /* THE PAYLOAD IS WHAT IS ON THE SCREEN. `textContent` would include a subtree hidden at this
       width, which is precisely the regression this control exists for — a composition that quietly
       drops its third example on a phone would compare equal. Walk the rendered text instead: a
       node with no client rects is not on the page. */
    const seen = [];
    const walk = document.createTreeWalker(document.querySelector('.mk-surface'), NodeFilter.SHOW_TEXT);
    for (let n = walk.nextNode(); n; n = walk.nextNode()) {
      const el = n.parentElement;
      if (!el || el.closest('.mk-dim, .mk-note') || el.closest('svg')) continue;
      if (!el.getClientRects().length) continue;
      const t = n.nodeValue.replace(/\s+/g, ' ').trim();
      if (t) seen.push(t);
    }
    out.payload = seen.join(' ');
    out.regions = [].slice.call(document.querySelectorAll('.mk-surface [data-mk-region]'))
      .filter((n) => n.getClientRects().length)
      .map((n) => n.getAttribute('data-mk-region')).join(',');
    return out;
  });

  const el = await p.$('.mk-page');
  const bb = await el.boundingBox();
  await p.setViewportSize({ width: surface + 2 * pad + 120, height: Math.ceil(bb.height) + 8 });
  await p.waitForTimeout(180);
  await (await p.$('.mk-page')).screenshot({ path: path.join(OUT, name + '.png') });
  if (errs.length) throw new Error(`${name}: ${errs[0]}`);
  await p.close();
  return { measured, surface };
};

/* ── CONTROL 1 · THE WIDTHS ARE THE CONTRACT'S, NOT THE DESIGNER'S, AND CONTROL 2 · TRACKS
      TOP-ALIGN. Run over BOTH renders of an annotated image: the annotation layer is review
      furniture, and a dimension printed on a page the annotation itself reshaped is a lie. */
function geometry(name, measured, surface) {
  for (const st of measured.states) {
      if (st.kind === 'instructionSplit' && st.prompt.length && st.solution.length) {
        const stacked = st.prompt[0] > st.w - 2;
        if (stacked) {
          if (surface >= FLOOR.instructionSplit) throw new Error(`${name}: stacked at ${surface}px, at or above the ${FLOOR.instructionSplit}px floor`);
        } else {
          if (surface < FLOOR.instructionSplit) throw new Error(`${name}: split at ${surface}px, below the ${FLOOR.instructionSplit}px floor`);
          const want = twoTrack(surface, R.prompt, R.solution);
          for (const [k, got, exp] of [['prompt', st.prompt[0], want.a], ['solution', st.solution[0], want.b]])
            if (Math.abs(got - exp) > 1.5)
              throw new Error(`${name}: the ${k} track measured ${got}px where the contract computes ${Math.round(exp)}px`);
        }
      }
      if (st.kind === 'repeat' && st.axis === 'across' && st.case.length > 1) {
        const acrossNow = st.case[0] < st.w - 2;
        if (acrossNow) {
          const each = (surface - GAP * (st.case.length - 1)) / st.case.length;
          for (const got of st.case)
            if (Math.abs(got - each) > 1.5) throw new Error(`${name}: a case measured ${got}px where the contract computes ${Math.round(each)}px`);
          if (new Set(st.case).size !== 1) throw new Error(`${name}: the repeated cases are not identical widths — ${st.case.join(', ')}`);
        }
      }
      if (st.kind === 'visualInterpretation' && st.figure.length && st.interpretation.length) {
        const sideBySide = st.interpretation[0] < st.w - 2;
        /* THE PLANE IS THE TRACK. A figure track wider than the plane it holds is the unexplained
           empty region this composition was redesigned to remove — measure the plane, not the box
           around it, or a one-keyword regression walks straight past. */
        if (sideBySide && st.plane[0] != null && st.figure[0] - st.plane[0] > 1)
          throw new Error(`${name}: the figure track is ${st.figure[0]}px around a ${st.plane[0]}px plane — `
            + `${st.figure[0] - st.plane[0]}px beside the plane belongs to nothing`);
        if (sideBySide && Math.abs((st.figure[0] + GAP + st.interpretation[0]) - st.w) > 2)
          throw new Error(`${name}: the figure pair leaves ${st.w - st.figure[0] - GAP - st.interpretation[0]}px unclaimed beside the plane`);
        if (sideBySide && st.interpretation[0] < px(R.interpretation.min) - 1)
          throw new Error(`${name}: the interpretation rail is ${st.interpretation[0]}px, under its ${px(R.interpretation.min)}px minimum`);
      }
      /* ── CONTROL 2 · TRACKS TOP-ALIGN, NOTHING IS CENTRED ──────────────────────────────────── */
      if (st.topsA.length && st.topsB.length && st.topsA[0] !== undefined) {
        const same = Math.abs(st.topsA[0] - st.topsB[0]) <= 1;
        const stackedNow = st.w - 2 <= Math.max(...[].concat(st.prompt, st.figure, st.case, [0]));
        if (!stackedNow && !same) throw new Error(`${name}: the two tracks of a ${st.kind} do not share a top edge`);
      }
    }
}

console.log('\nrendering the pack');
const report = [];
for (const m of PACK) {
  for (const sName of m.at) {
    const name = `${m.n}-${m.frag}-${sName}`;
    const { measured, surface } = await shot(name, m.frag, sName, { ...m, spec: false });

    geometry(name, measured, surface);
    /* ── CONTROL 3 · ONE PAYLOAD PER COMPOSITION, WHATEVER THE SURFACE ──────────────────────── */
    const prior = payloads[m.frag];
    if (prior && prior.payload !== measured.payload) {
      const a = prior.payload, b = measured.payload;
      let i = 0; while (i < a.length && i < b.length && a[i] === b[i]) i++;
      throw new Error(`${name}: the semantic payload differs from ${prior.name} — a layout proof must carry the same content at every width.\n`
        + `  ${prior.name}: …${a.slice(Math.max(0, i - 40), i + 80)}\n  ${name}: …${b.slice(Math.max(0, i - 40), i + 80)}`);
    }
    if (prior && prior.regions !== measured.regions)
      throw new Error(`${name}: the region sequence differs from ${prior.name}\n  ${prior.regions}\n  ${measured.regions}`);
    if (!prior) payloads[m.frag] = { name, payload: measured.payload, regions: measured.regions };

    const kinds = measured.states.map((s) => s.kind + (s.axis ? ':' + s.axis : '')).join(' + ') || 'stack';
    report.push({ name, surface, kinds });
    console.log(`  ${name.padEnd(34)} ${String(surface).padStart(4)}px  ${kinds}`);
    if (m.spec) {
      const ann = await shot(name + '-spec', m.frag, sName, { ...m, spec: true });
      geometry(name + '-spec', ann.measured, surface);
      const a = JSON.stringify(measured.states.map((x) => [x.kind, x.prompt, x.solution, x.figure, x.case, x.interpretation]));
      const b2 = JSON.stringify(ann.measured.states.map((x) => [x.kind, x.prompt, x.solution, x.figure, x.case, x.interpretation]));
      if (a !== b2) throw new Error(`${name}: the annotation layer moved the layout — a -spec image would `
        + `print dimensions for a page nobody sees.\n  plain: ${a}\n  spec:  ${b2}`);
      console.log(`  ${(name + '-spec').padEnd(34)} geometry identical to the plain render`);
    }
  }
}

await browser.close(); server.close();
console.log('\nCONTRACT SUMMARY');
console.log(`  gap ${GAP}px · instructionSplit floor ${FLOOR.instructionSplit}px · repeat(across) floor ${FLOOR.repeatAcross}px · visualInterpretation floor ${FLOOR.visualInterpretation}px`);
for (const s of ['desktop', 'middle', 'narrow']) {
  const t = twoTrack(C.surfaces[s], R.prompt, R.solution);
  const ok = C.surfaces[s] >= FLOOR.instructionSplit;
  console.log(`  instructionSplit @ ${String(C.surfaces[s]).padStart(4)}px -> ` + (ok
    ? `${Math.round(t.a)} / ${Math.round(t.b)}  (${(100 * t.a / (t.a + t.b)).toFixed(1)}% / ${(100 * t.b / (t.a + t.b)).toFixed(1)}%)` : 'stack'));
}
console.log('\n  the same plane, realised at each surface:');
for (const [k, per] of Object.entries(solved))
  console.log(`    ${k.padEnd(11)} ` + ['desktop', 'middle', 'narrow'].map((s) => `${s} ${per[s].w}×${per[s].h}`).join('  ·  '));
console.log('\nwrote ' + path.relative(root, OUT) + ` — ${report.length} states, ${PACK.filter((m) => m.spec).length} annotated`);
