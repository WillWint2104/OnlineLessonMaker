#!/usr/bin/env node
// THE COMPOSITION PACK — the layout grammar of the Mathematics worked examples, and the resolver
// that chooses between its named states.
//
//   node scripts/mockups-compositions.mjs [outDir]
//
// THE GOVERNING CORRECTION: a Study page is vertically scrollable, so height is not a scarce
// resource and the resolver does not try to fit a composition into the visible rectangle. The order
// is content semantics -> intrinsic demands -> choose a named state -> allocate width -> let height
// grow -> scroll. It is NOT: take the available rectangle, divide it, shrink things to fit, and
// reject when the two sides do not occupy similar heights.
//
// Four consequences, each of which removed a defect rather than tuned one:
//
//   · EVERY STATE IS A FRESH LAYOUT. A rejected candidate discards all of its computed dimensions
//     and the next state is measured from scratch. The previous build did not do this: a
//     visualInterpretation that failed its test and stacked kept the track allocation from the side
//     candidate it had already rejected — visible in its own report as state "stack" carrying
//     cols [332, 640].
//   · HEIGHT DOES NOT SELECT A LAYOUT, with one named exception. The global occupancy gate is gone;
//     it was semantically wrong for figures, where a 700px plane beside a 180px explanation is a
//     good relationship. What remains is `promptSubstance` on instructionSplit alone, and it
//     SELECTS A DIFFERENT PRIMITIVE rather than rejecting the content.
//   · A THIRD INSTRUCTIONAL SHAPE. `instructionFlow` — a short task, a rule, then the reasoning at
//     its own reading measure — is a legitimate presentation type, not a fallback. Most worked
//     examples are that shape.
//   · FIGURES ARE MEASURED FIRST, and offer the composition a LADDER of scales they can legally be
//     drawn at. The composition picks from what the figure offers; leftover width is never a size.
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

const REM = C.base.rem, px = (r) => Math.round(r * REM), R = C.regions, GAP = px(C.gap.rem);
const FLOOR = C.figure.engineFloor, BOUND = C.figure.boxBound;
const SUBSTANCE = C.primitives.instructionSplit.balance.min;
const SHRINK = C.figure.shrinkPolicy === 'allow';
const LADDER_N = 14;

/* ── the server and the app's own stylesheet, read from the CSSOM ─────────────────────────────── */
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
    .map((sh) => { try { return [].slice.call(sh.cssRules).map((r) => r.cssText).join('\n'); } catch (e) { return ''; } }).join('\n'));
  await p.close();
  return css;
})();
for (const [re, what] of [[/\.tp-slide \.tp-fig-grid/, 'the figure grid rule'], [/@font-face/, 'the vendored faces'],
                          [/\.mx-figskin\.tp-slide/, 'the page family’s figure token mapping'], [/\.mx *\{/, 'the .mx token block']])
  if (!re.test(APP_CSS)) throw new Error('the lifted stylesheet is missing ' + what);
console.log(`lifted ${Math.round(APP_CSS.length / 1024)}KB of the app's own stylesheet`);

/* ══ THE FIGURE LAYOUT SIGNATURE ═══════════════════════════════════════════════════════════════
   The inversion this revision is built around. The resolver never asks "how much width is left for
   the graph"; it asks the figure what boxes it can legally occupy, allocates one, and gives the text
   what remains. The signature is a property of the PLANE — it does not depend on any surface — and
   every box in it is found by asking the engine to paint and scoring the painted result: px per
   authored x-unit against px per authored y-unit.

     minimumReadableBox   the smallest box in which the engine still paints square units, never
                          below its own floor (MX_PLOT_MIN_W × MX_PLOT_MIN_H)
     preferredBox         `preferredFraction` of the largest square box — the size the plane wants
     maximumUsefulBox     the largest box whose longer side reaches the bound with square units;
                          past it a plane gains nothing

   A plane can legitimately have ONE legal box, when its aspect makes the floor and the bound meet.
   That is a fact about the plane, and the resolver must be told it rather than discovering it by
   producing a distorted image. */
const figPage = await browser.newPage({ viewport: { width: 1700, height: 1800 }, deviceScaleFactor: 2 });
await figPage.goto(base, { waitUntil: 'load' });
const paintCache = new Map();
const paint = async (key, fig, w, h) => {
  const ck = `${key}|${w}|${h}`;
  if (paintCache.has(ck)) return paintCache.get(ck);
  const r = await figPage.evaluate(async ({ key, fig, w, h }) => {
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
    const per = (a, at) => { const q = labs.filter((t) => t.getAttribute('text-anchor') === a)
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
  paintCache.set(ck, r);
  return r;
};
const SQUARE = 0.006;
const isSquare = (r) => r.ratio != null && Math.abs(r.ratio - 1) <= SQUARE;

/* ── ASKING THE ENGINE FOR A SCALE ─────────────────────────────────────────────────────────────
   What makes a plane legible is a SCALE — px per authored unit — not a box. So the signature is
   three scales, and a box is whatever the engine needs to paint one of them.

   Two earlier attempts are worth recording because they both produced confident nonsense. Defining
   the boxes as "the largest box that still paints square units" made every plane in the pack answer
   720 × 720, because the engine holds square units at almost any box by showing more of the plane —
   squareness is a floor it already guarantees, not a size. Modelling the box as
   `authoredSpan × scale + a fixed gutter` then failed differently: the gutter is not fixed, and which
   axis binds changes with the box, so the model missed by up to 3%.

   What does work is to stop modelling the engine and measure it. Guess a box, paint it, read the px
   per x-unit and per y-unit off the rendered tick labels, and correct both dimensions by the ratio of
   what was asked to what was painted. It converges in three or four paints and needs no theory about
   gutters or binding axes at all. */
const SCALE_TOL = 0.02;
async function boxForScale(key, fig, s) {
  const d = fig.domain, xs = d.xMax - d.xMin, ys = d.yMax - d.yMin;
  let w = Math.round(xs * s + 50), h = Math.round(ys * s + 100);
  for (let i = 0; i < 6; i++) {
    if (w < 60 || h < 60 || w > 4000 || h > 4000) return null;
    const r = await paint(key, fig, w, h);
    if (r.x == null || r.y == null) return null;
    const okx = Math.abs(r.x - s) / s <= SCALE_TOL, oky = Math.abs(r.y - s) / s <= SCALE_TOL;
    if (okx && oky && isSquare(r)) return { w, h, x: r.x, y: r.y, ratio: r.ratio, scale: +s.toFixed(2) };
    const nw = Math.max(60, Math.round(w * Math.min(2, Math.max(0.5, s / r.x))));
    const nh = Math.max(60, Math.round(h * Math.min(2, Math.max(0.5, s / r.y))));
    if (nw === w && nh === h) return null;
    w = nw; h = nh;
  }
  return null;
}
/* the largest scale whose whole box — gutters included — still fits the page's bound */
async function largestScaleWithin(key, fig, lo, hi) {
  let best = null, bestBox = null;
  for (let i = 0; i < 9 && hi - lo > 0.25; i++) {
    const mid = (lo + hi) / 2;
    const box = await boxForScale(key, fig, mid);
    if (box && Math.max(box.w, box.h) <= BOUND) { best = mid; bestBox = box; lo = mid; } else hi = mid;
  }
  return best == null ? null : { s: best, box: bestBox };
}

async function signature(key, f) {
  const fig = f.figure, d = fig.domain;
  const xs = d.xMax - d.xMin, ys = d.yMax - d.yMin;
  /* The floor is a property of the MATHEMATICS: the plot must clear MX_PLOT_MIN_W x MIN_H.
     The bound is a property of the PAGE: the whole box may not exceed it. For an extreme aspect they
     can fail to overlap — a Figure Engine fact, reported rather than hidden. */
  const sMinWanted = Math.max(FLOOR.w / xs, FLOOR.h / ys);
  const top = await largestScaleWithin(key, fig, 4, 260);
  if (!top) throw new Error(`${key}: no box inside the ${BOUND}px bound paints this domain at equal scale`);
  const floorUnreachable = top.s < sMinWanted - 0.01;
  const sMax = top.s, sMin = floorUnreachable ? top.s : sMinWanted;
  const sPref = Math.max(sMin, C.figure.preferredFraction * sMax);

  /* THE LADDER — the sizes this plane can legally be drawn at, each one measured. The composition
     picks an entry from what the figure offers; it never computes a figure size from the width it
     has left over. Ascending, so "the largest that fits" is a scan. */
  const ladder = [];
  for (let i = 0; i < LADDER_N; i++) {
    const s = sMin + (sMax - sMin) * (i / (LADDER_N - 1));
    const b = await boxForScale(key, fig, s);
    if (b && (!ladder.length || b.w > ladder[ladder.length - 1].w)) ladder.push({ s: +s.toFixed(2), w: b.w, h: b.h });
  }
  if (!ladder.length) throw new Error(`${key}: the engine offers no legal box`);
  const nearest = (s) => ladder.reduce((a, e) => Math.abs(e.s - s) < Math.abs(a.s - s) ? e : a, ladder[0]);
  const sig = { sMin, sPref, sMax, ladder, floorUnreachable, wantedFloorScale: +sMinWanted.toFixed(1),
    minReadable: nearest(sMin), preferred: nearest(sPref), maxUseful: nearest(sMax),
    oneLegalScale: sMax - sMin < 0.5, equalScaleRequired: true };
  console.log(`  ${key.padEnd(11)} min ${sig.minReadable.w}×${sig.minReadable.h} @${sMin.toFixed(1)}  `
    + `pref ${sig.preferred.w}×${sig.preferred.h} @${sPref.toFixed(1)}  max ${sig.maxUseful.w}×${sig.maxUseful.h} @${sMax.toFixed(1)}  `
    + `· ${ladder.length} legal size${ladder.length > 1 ? 's' : ''}`
    + (floorUnreachable ? `  [FLOOR UNREACHABLE — the plot needs ${sMinWanted.toFixed(1)} px/unit to clear `
        + `${FLOOR.w}×${FLOOR.h}, and the ${BOUND}px box bound is reached at ${sMax.toFixed(1)}]` : ''));
  return sig;
}

console.log('\nfigure layout signatures — each plane offers the sizes it can legally be drawn at');
const SIG = {};
for (const [key, f] of Object.entries(FIGS)) { if (key.startsWith('_')) continue; SIG[key] = await signature(key, f); }
/* figPage stays open: phase 2 repaints each plane at the box the resolver assigned it, and that must
   be a real paint rather than a cache lookup. Closing it here made the phase-2 squareness check
   vacuous for any box the signature phase had not already tried — and hid a control failure behind a
   "Target page has been closed" crash. */

/* ══ THE PAGE ══════════════════════════════════════════════════════════════════════════════════ */
const tokens = (surface, pad) => `:root{
  --mk-surface-w:${surface}px; --mk-pad:${pad}px; --mk-gap:${GAP}px;
  --mk-rowgap:34px; --mk-stackgap:22px;
  --mk-prompt-max:${px(R.prompt.max)}px; --mk-solution-max:${px(R.solution.max)}px;
  --mk-interp-max:${px(R.interpretation.max)}px; --mk-synthesis-max:${px(R.synthesis.max)}px;
  --mk-prompt-flow-max:${px(R.prompt.max)}px;
}`;
const band = (r) => `min ${R[r].min}rem (${px(R[r].min)}px) · max ${R[r].max}rem (${px(R[r].max)}px) · growth ${R[r].grow}`;
const DIM = {
  prompt: `PROMPT · ${band('prompt')} · origin: ${R.prompt.origin}. A position, not a box.`,
  solution: `SOLUTION · ${band('solution')} · origin: ${R.solution.origin}. The maximum is an allocation ceiling: a track is never given width its region cannot use.`,
  case: `CASE · ${band('case')}. Judged on each complete item's minimum width, never on height.`,
  figure: `FIGURE · measured BEFORE any text track, and offered to the composition as a ladder of legal scales. Leftover width is never a figure size.`,
  interpretation: `INTERPRETATION · ${band('interpretation')}. Takes the remainder beside the plane, capped at its maximum. NO height test: a tall plane beside a short explanation is a good relationship.`,
  order: `content semantics → intrinsic demands → choose a NAMED state → allocate width → height:auto → the page scrolls. There is no target page height in Study mode.`,
  fresh: `EVERY STATE IS A FRESH LAYOUT. A refused candidate discards all of its computed dimensions; the next state is measured from scratch.`,
  substance: `PROMPT SUBSTANCE · the question's content height as a fraction of the row. The ONE place height enters layout selection, and it chooses instructionFlow rather than rejecting the content. Floor ${Math.round(SUBSTANCE * 100)}%.`,
  flow: `instructionFlow is a presentation type, not a fallback: a short task, a rule, then the reasoning at its own reading measure while the page grows downwards.`,
  whitespace: `WHITESPACE · reading margin and structural space are desirable; only unowned width INSIDE an allocated region is a defect.`,
  origins: `ORIGINS · content and secondary-track are permanent. Every region lands on a named origin; nothing is centred because it happens to be narrower than the space around it.`,
  asmStandard: 'instructionSplit | instructionFlow, then synthesis',
  asmSequence: 'repeat(down) over the standard ladder, then synthesis',
  asmPaired: 'repeat(across|down) over the cases, then visualInterpretation(side|stack)',
  asmVisualCheck: 'state 1: instructionSplit | instructionFlow · state 2: visualInterpretation(side|stack)',
  asmExtended: 'states; each takes the ladder its own content needs',
  repeatCount: `The count appears nowhere in the layout, and a repeat's children share one verdict.`,
  repeatAcross: `repeat(across) over the cases: one shared track contract, judged on minimum width.`,
  gates: `A NAMED STATE IS CHOSEN BY WIDTH. Height grows and the page scrolls.`,
  occupancy: `No height test here. The plane is the object being explained; the prose need not fill its height.`,
  deadSpace: `Unused page width may remain as page margin. Only unowned width inside a region is a defect.`,
};
const readFrag = (f) => fs.readFileSync(path.join(SRC, f + '.html'), 'utf8')
  .replace(/\{\{PART:([a-z0-9_-]+)\}\}/gi, (m, p) => fs.readFileSync(path.join(SRC, p + '.part'), 'utf8'))
  .replace(/\{\{DIM:([a-zA-Z]+)\}\}/g, (m, k) => { if (!(k in DIM)) throw new Error('no contract label for ' + k); return DIM[k]; });

const page = (body, surface, pad, opts) => `<!doctype html><html data-theme="mathematics"><head><meta charset="utf-8"><style>
${APP_CSS}
</style><style>
${tokens(surface, pad)}
${KIT}
</style></head><body class="mx${surface <= 500 ? ' mk-narrow' : ''}"><div class="mk-page">
<div class="mk-caption"><span class="mk-caption-k">${opts.k}</span>${opts.c}</div>
<div class="mk-surface"${opts.spec ? ' data-mk-spec' : ''}>${body}</div>
</div></body></html>`;

/* ══ THE RESOLVER, IN THE PAGE ════════════════════════════════════════════════════════════════
   Width-driven. Each family has an explicit ladder of NAMED states; a state is tried, and if it is
   refused the element is reset completely — attribute, grid template, gaps, figure box — before the
   next state is computed. There is no generic fallback that keeps reallocating width until
   something fits, and no state inherits a number from a state that was rejected. */
const RESOLVER = `(cfg) => {
  const { regions:R, sig:SIG, GAP, SUBSTANCE, SHRINK } = cfg;
  const log = [];
  const kids = (el, n) => [].slice.call(el.children).filter((c) => c.getAttribute('data-mk-region') === n);
  const H = (el) => Math.round(el.getBoundingClientRect().height);
  const Wd = (el) => Math.round(el.getBoundingClientRect().width);
  const Lf = (el) => Math.round(el.getBoundingClientRect().left);

  /* A CANDIDATE LEAVES NO RESIDUE. Everything the previous attempt wrote is removed before the next
     one is measured — including the figure's box, which is the residue that survived last time. */
  const reset = (el) => {
    el.removeAttribute('data-mk-state');
    el.style.gridTemplateColumns = ''; el.style.columnGap = ''; el.style.width = '';
    kids(el, 'figure').forEach((h) => { h.style.width = '';
      const box = h.querySelector('[data-mk-figure-box]');
      if (box) { box.style.width = ''; box.style.height = ''; } });
    void el.offsetWidth;
  };

  const alloc = (regs, avail) => {
    const fixed = regs.map(() => null);
    for (let pass = 0; pass < regs.length + 2; pass++) {
      const free = avail - fixed.reduce((s, v) => s + (v || 0), 0);
      const idx = regs.map((r, i) => i).filter((i) => fixed[i] === null);
      if (!idx.length) break;
      const gsum = idx.reduce((s, i) => s + regs[i].grow, 0);
      let clamped = false;
      for (const i of idx) { const w = free * regs[i].grow / gsum;
        if (w > regs[i].max) { fixed[i] = regs[i].max; clamped = true; }
        else if (w < regs[i].min) { fixed[i] = regs[i].min; clamped = true; } }
      if (!clamped) { for (const i of idx) fixed[i] = free * regs[i].grow / gsum; break; }
    }
    return fixed.map((v) => Math.round(v || 0));
  };

  /* THE FIGURE OFFERS; THE COMPOSITION CHOOSES. Never the other way round. */
  const offer = (sg, maxW) => {
    let best = null;
    for (const e of sg.ladder) if (e.w <= maxW && e.s <= sg.sPref + 0.01) best = e;
    return best;
  };
  const atPreferred = (sg) => sg.ladder.reduce((a, e) =>
    Math.abs(e.s - sg.sPref) < Math.abs(a.s - sg.sPref) ? e : a, sg.ladder[0]);

  const putFigure = (el, box) => {
    const host = kids(el, 'figure')[0];
    host.style.width = box.w + 'px';
    const b = host.querySelector('[data-mk-figure-box]');
    b.style.width = box.w + 'px'; b.style.height = box.h + 'px';
  };

  const els = [].slice.call(document.querySelectorAll('[data-mk="instructionSplit"],'
    + '[data-mk="repeat"][data-mk-axis="across"],[data-mk="visualInterpretation"]'));

  for (const el of els) {
    const kind = el.getAttribute('data-mk');
    const rec = { kind, tried: [] };

    if (kind === 'visualInterpretation') {
      const key = kids(el, 'figure')[0].getAttribute('data-mk-figure');
      const sg = SIG[key];
      reset(el);
      const avail = el.clientWidth, inner = avail - GAP;
      const pref = atPreferred(sg);
      let box = null, why = '';
      if (pref.w + GAP + R.interpretation.min <= avail) { box = pref; why = 'at its preferred scale'; }
      else if (SHRINK) {
        const cand = offer(sg, inner - R.interpretation.min);
        if (cand) { box = cand; why = 'reduced to ' + cand.s + ' px/unit, still inside its legal range'; }
      }
      if (box) {
        rec.tried.push({ state: 'side', ok: true, note: 'the plane ' + why });
        el.setAttribute('data-mk-state', 'side');
        putFigure(el, box);
        const rail = Math.min(inner - box.w, R.interpretation.max);
        el.style.gridTemplateColumns = box.w + 'px ' + rail + 'px';
        el.style.columnGap = GAP + 'px';
        rec.state = 'side'; rec.cols = [box.w, rail]; rec.fig = { key, ...box };
        rec.margin = Math.round(inner - box.w - rail);
      } else {
        rec.tried.push({ state: 'side', ok: false,
          note: 'the plane needs ' + pref.w + 'px at its preferred scale'
            + (SHRINK ? ' and its smallest legal size is ' + sg.ladder[0].w + 'px' : ' and shrinkPolicy is hold')
            + ', which leaves under ' + R.interpretation.min + 'px for the rail in ' + avail + 'px' });
        /* FRESH LAYOUT: nothing from the side candidate survives. The plane is re-measured against
           the WHOLE content region, not against what the rejected rail left behind. */
        reset(el);
        const box2 = offer(sg, el.clientWidth) || sg.ladder[0];
        el.setAttribute('data-mk-state', 'stack');
        putFigure(el, box2);
        rec.state = 'stack'; rec.cols = null; rec.fig = { key, ...box2 };
        rec.tried.push({ state: 'stack', ok: true,
          note: 're-measured from scratch against the full ' + el.clientWidth + 'px region' });
        rec.margin = Math.round(el.clientWidth - box2.w);
      }

    } else if (kind === 'repeat') {
      reset(el);
      const n = kids(el, 'case').length, avail = el.clientWidth, inner = avail - GAP * (n - 1);
      const w = alloc(kids(el, 'case').map(() => R.case), inner);
      const sum = w.reduce((s, v) => s + v, 0);
      if (sum <= inner + 0.5) {
        el.setAttribute('data-mk-state', 'across');
        el.style.gridTemplateColumns = w.map((v) => v + 'px').join(' ');
        el.style.columnGap = GAP + 'px';
        rec.state = 'across'; rec.cols = w; rec.margin = Math.round(inner - sum);
        rec.tried.push({ state: 'across', ok: true, note: n + ' cases at ' + w[0] + 'px each' });
      } else {
        rec.tried.push({ state: 'across', ok: false,
          note: n + ' cases need ' + Math.round(sum + GAP * (n - 1)) + 'px and the region is ' + avail + 'px' });
        reset(el);
        el.setAttribute('data-mk-state', 'down');
        rec.state = 'down'; rec.cols = null; rec.margin = 0;
        rec.tried.push({ state: 'down', ok: true, note: 'each case takes the whole region in turn' });
      }

    } else {
      /* instructionSplit -> instructionFlow. The ONE place height enters layout selection, and it
         chooses a different presentation rather than rejecting the content. */
      reset(el);
      const avail = el.clientWidth, inner = avail - GAP;
      const w = alloc([R.prompt, R.solution], inner);
      const fits = w[0] + w[1] <= inner + 0.5;
      let chose = null;
      if (fits) {
        el.setAttribute('data-mk-state', 'split');
        el.style.gridTemplateColumns = w[0] + 'px ' + GAP + 'px ' + w[1] + 'px';
        el.style.columnGap = '0px';
        void el.offsetWidth;
        const ph = H(kids(el, 'prompt')[0]), sh = H(kids(el, 'solution')[0]);
        const row = Math.max(ph, sh);
        rec.substance = row ? +(ph / row).toFixed(3) : 1;
        rec.heights = [ph, sh];
        if (rec.substance >= SUBSTANCE) {
          chose = 'split'; rec.cols = w; rec.margin = Math.round(inner - w[0] - w[1]);
          rec.tried.push({ state: 'split', ok: true,
            note: 'the question fills ' + Math.round(rec.substance * 100) + '% of the row — it is a track' });
        } else {
          rec.tried.push({ state: 'split', ok: false,
            note: 'the question fills ' + Math.round(rec.substance * 100) + '% of the row; below '
              + Math.round(SUBSTANCE * 100) + '% it is a task, not a track' });
        }
      } else {
        rec.tried.push({ state: 'split', ok: false,
          note: 'the two tracks need ' + Math.round(w[0] + GAP + w[1]) + 'px and the region is ' + avail + 'px' });
      }
      if (!chose) {
        reset(el);
        el.setAttribute('data-mk-state', 'flow');
        chose = 'flow'; rec.cols = null; rec.margin = 0;
        rec.tried.push({ state: 'flow', ok: true,
          note: 'the task leads, a rule closes it, the reasoning runs beneath at its own measure' });
      }
      rec.state = chose;
    }

    /* ALIGNMENT ORIGINS — measured, not assumed. */
    const surface = document.querySelector('.mk-surface');
    const content = Lf(surface) + parseFloat(getComputedStyle(surface).paddingLeft);
    rec.origins = { content: Math.round(content),
      secondary: rec.cols && rec.cols.length === 2
        ? Math.round(content + rec.cols[0] + GAP) : null };
    rec.regionLeft = {};
    for (const n of ['prompt', 'solution', 'figure', 'interpretation', 'case', 'title'])
      kids(el, n).forEach((c, i) => { rec.regionLeft[n + (i ? i : '')] = Lf(c); });
    rec.avail = el.clientWidth;
    log.push(rec);
  }
  return log;
}`;

/* ══ RENDER ════════════════════════════════════════════════════════════════════════════════════ */
const PACK = JSON.parse(fs.readFileSync(path.join(SRC, 'pack.json'), 'utf8'));
const SURFACE = C.surfaces;
const padFor = (s) => (s <= 500 ? C.surfacePad.narrow : C.surfacePad.desktop);
const payloads = {};
const REPORT = [];

const shot = async (name, fragName, surfaceName, opts) => {
  const surface = SURFACE[surfaceName], pad = padFor(surface);
  /* PHASE 1 renders each plane as an EMPTY BOX of exactly the size the resolver assigns, so
     occupancy and dead space are measured against the real geometry before anything is painted. */
  const body = readFrag(fragName).replace(/\{\{FIG:([a-z0-9-]+)\}\}/gi, (m, key) => {
    if (!SIG[key]) throw new Error(`${name}: no figure signature for ${key}`);
    return '<div data-mk-figure-box style="position:relative"></div>';
  });

  const p = await browser.newPage({ viewport: { width: surface + 2 * pad + 120, height: 900 }, deviceScaleFactor: 2 });
  const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
  const doc = page(body, surface, pad, opts);
  if (process.env.MK_DUMP) fs.writeFileSync('/tmp/' + name + '.debug.html', doc);
  await p.setContent(doc, { waitUntil: 'load' });
  await p.waitForTimeout(360);

  /* PHASE 1 — layout. Figures are empty boxes of exactly the size the resolver assigns, so occupancy
     and dead space are measured against the real geometry before a single plane is painted. */
  const log = await p.evaluate(`(${RESOLVER})(${JSON.stringify({
    regions: { prompt: { min: px(R.prompt.min), max: px(R.prompt.max), grow: R.prompt.grow },
      solution: { min: px(R.solution.min), max: px(R.solution.max), grow: R.solution.grow },
      case: { min: px(R.case.min), max: px(R.case.max), grow: R.case.grow },
      interpretation: { min: px(R.interpretation.min), max: px(R.interpretation.max), grow: R.interpretation.grow } },
    sig: SIG, GAP, SUBSTANCE, SHRINK })})`);

  /* PHASE 2 — paint. Each plane is solved by the engine at exactly the box the resolver gave it. */
  for (const rec of log) {
    if (!rec.fig) continue;
    const r = await paint(rec.fig.key, FIGS[rec.fig.key].figure, rec.fig.w, rec.fig.h);
    if (!isSquare(r)) throw new Error(`${name}: ${rec.fig.key} at the assigned ${rec.fig.w}×${rec.fig.h} `
      + `paints at ${r.ratio} — the resolver handed the engine a box it cannot render square`);
    rec.fig.x = r.x; rec.fig.y = r.y; rec.fig.ratio = r.ratio;
    await p.evaluate(({ key, html, w, h }) => {
      const host = document.querySelector(`[data-mk-figure="${key}"] [data-mk-figure-box]`);
      host.innerHTML = `<div class="mx-part" data-mx-part="figure" data-fig-viewport style="position:relative;`
        + `width:${w}px;height:${h}px"><div class="mx-figstage"><div class="mx-figskin tp-slide">`
        + html + `</div></div></div>`;
    }, { key: rec.fig.key, html: r.html, w: rec.fig.w, h: rec.fig.h });
  }

  /* THE VERDICT, AND THE LADDER IT WALKED, written onto the page. A reference image that shows an
     arrangement without saying which states were tried and why each was refused is a screenshot. */
  await p.evaluate(({ log, SUBSTANCE }) => {
    const els = [].slice.call(document.querySelectorAll('[data-mk="instructionSplit"],'
      + '[data-mk="repeat"][data-mk-axis="across"],[data-mk="visualInterpretation"]'));
    els.forEach((el, i) => {
      const r = log[i]; if (!r) return;
      const d = document.createElement('div');
      d.className = 'mk-verdict';
      const bits = r.tried.map((t) => (t.ok ? '✓ ' : '✗ ') + t.state + ' — ' + t.note).join('<br>');
      const cols = r.cols ? ' · tracks ' + r.cols.join(' + ') : '';
      const fig = r.fig ? ' · plane ' + r.fig.w + '×' + r.fig.h + ' @' + r.fig.s + ' px/unit' : '';
      const sub = r.substance == null ? '' : ' · question fills ' + Math.round(r.substance * 100)
        + '% of the row (floor ' + Math.round(SUBSTANCE * 100) + '%)';
      d.innerHTML = '<b>' + r.state + '</b>' + r.kind + ' in ' + r.avail + 'px' + cols + fig + sub
        + '<span class="mk-ladder">' + bits + '</span>';
      el.insertAdjacentElement('afterend', d);
    });
  }, { log, SUBSTANCE });

  const measured = await p.evaluate(() => {
    const seen = [];
    const walk = document.createTreeWalker(document.querySelector('.mk-surface'), NodeFilter.SHOW_TEXT);
    for (let n = walk.nextNode(); n; n = walk.nextNode()) {
      const el = n.parentElement;
      if (!el || el.closest('.mk-dim, .mk-note, .mk-verdict') || el.closest('svg')) continue;
      if (!el.getClientRects().length) continue;
      const t = n.nodeValue.replace(/\s+/g, ' ').trim();
      if (t) seen.push(t);
    }
    const rows = [].slice.call(document.querySelectorAll('[data-mk]')).map((el) => {
      const kid = (r) => [].slice.call(el.children).filter((c) => c.getAttribute('data-mk-region') === r);
      const box = (n) => Math.round(n.getBoundingClientRect().width);
      const plane = kid('figure').map((c) => { const q = c.querySelector('[data-mx-part="figure"]');
        return q ? Math.round(q.getBoundingClientRect().width) : null; });
      const tops = (r) => kid(r).map((c) => Math.round(c.getBoundingClientRect().top));
      const rl = [].slice.call(el.children).filter((c) => c.classList.contains('mk-rule'))[0];
      const rule = rl ? { w: Math.round(rl.getBoundingClientRect().width),
        h: Math.round(rl.getBoundingClientRect().height),
        shown: getComputedStyle(rl).display !== 'none' } : null;
      return { kind: el.getAttribute('data-mk'), state: el.getAttribute('data-mk-state'), rule,
        inlineCols: el.style.gridTemplateColumns || '', inlineGap: el.style.columnGap || '',
        w: Math.round(el.getBoundingClientRect().width),
        prompt: kid('prompt').map(box), solution: kid('solution').map(box),
        figure: kid('figure').map(box), interpretation: kid('interpretation').map(box),
        case: kid('case').map(box), plane,
        topsA: tops('prompt').concat(tops('figure')).concat(tops('case')),
        topsB: tops('solution').concat(tops('interpretation')) };
    });
    return { payload: seen.join(' '), rows,
      regions: [].slice.call(document.querySelectorAll('.mk-surface [data-mk-region]'))
        .filter((n) => n.getClientRects().length).map((n) => n.getAttribute('data-mk-region')).join(',') };
  });

  const el = await p.$('.mk-page');
  const bb = await el.boundingBox();
  await p.setViewportSize({ width: surface + 2 * pad + 120, height: Math.ceil(bb.height) + 8 });
  await p.waitForTimeout(180);
  await (await p.$('.mk-page')).screenshot({ path: path.join(OUT, name + '.png') });
  if (errs.length) throw new Error(`${name}: ${errs[0]}`);
  await p.close();
  return { log, measured, surface };
};

/* ── the controls the pack is only trustworthy because of ─────────────────────────────────────── */
function verify(name, log, measured, surface) {
  for (const r of log) {
    /* CONTROL · EVERY REGION IS ON ITS DECLARED ORIGIN. Nothing is centred, and nothing drifts
       because it happens to be narrower than the space around it. */
    const map = C.origins.map[r.kind === 'visualInterpretation' ? 'visualInterpretation:' + r.state
      : r.kind === 'repeat' ? 'repeat:' + r.state
      : r.state === 'flow' ? 'instructionFlow' : 'instructionSplit'] || {};
    for (const [region, want] of Object.entries(map)) {
      const got = r.regionLeft[region];
      if (got == null) continue;
      const origin = want === 'content' ? r.origins.content
        : want === 'secondaryTrack' ? r.origins.secondary : null;
      if (origin == null) continue;
      if (Math.abs(got - origin) > 1)
        throw new Error(`${name}: ${r.kind}/${r.state} put ${region} at ${got}px, `
          + `not on the ${want} origin at ${origin}px`);
    }
    /* CONTROL · NO RESIDUE. A state that was refused may leave nothing behind: a stacked
       visualInterpretation must carry no track allocation at all. */
    if (r.kind === 'visualInterpretation' && r.state === 'stack' && r.cols)
      throw new Error(`${name}: a stacked visualInterpretation still carries a track allocation `
        + `(${r.cols.join(', ')}) from the side candidate it rejected`);
    if (r.kind === 'repeat' && r.state === 'down' && r.cols)
      throw new Error(`${name}: a stacked repeat still carries the across allocation`);
    if (r.state === 'flow' && r.cols)
      throw new Error(`${name}: an instructionFlow still carries the split allocation`);
    /* CONTROL · THE FIGURE WAS OFFERED, NOT LEFT OVER. Its box must be an entry on its own ladder. */
    if (r.fig) {
      const sg = SIG[r.fig.key];
      if (!sg.ladder.some((e) => e.w === r.fig.w && e.h === r.fig.h))
        throw new Error(`${name}: the plane is ${r.fig.w}×${r.fig.h}, which is not one of the sizes `
          + `${r.fig.key} offers — a figure size computed from leftover width`);
      if (r.fig.s > sg.sPref + 0.01)
        throw new Error(`${name}: the plane was drawn past its preferred scale`);
    }
    /* CONTROL · WHITESPACE IS CLASSIFIED. Between the tracks, nothing unowned; past the last track,
       page margin, which is allowed and reported. */
    if (r.cols) {
      const used = r.cols.reduce((a, v) => a + v, 0) + GAP * (r.cols.length - 1);
      if (Math.abs(r.avail - used - (r.margin || 0)) > 1.5)
        throw new Error(`${name}: ${r.avail}px available, ${used}px in tracks and gaps, `
          + `${r.margin}px reported margin — the row does not account for itself`);
    }
  }
  for (const row of measured.rows) {
    if (row.state === 'side' && row.plane[0] != null && row.figure[0] - row.plane[0] > 1)
      throw new Error(`${name}: the figure region is ${row.figure[0]}px around a ${row.plane[0]}px plane`);
    if (row.state === 'stack' && row.plane[0] != null && row.figure[0] - row.plane[0] > 1)
      throw new Error(`${name}: the stacked figure region is ${row.figure[0]}px around a `
        + `${row.plane[0]}px plane — a region claiming width it cannot use`);
    if (row.state === 'side' && row.topsA.length && row.topsB.length
        && Math.abs(row.topsA[0] - row.topsB[0]) > 1)
      throw new Error(`${name}: the two tracks of a side-by-side ${row.kind} do not share a top edge`);
    /* CONTROL · NO RESIDUE, READ OFF THE DOM. A state with no tracks must carry no track
       allocation. Checking the resolver's own record was not enough: the record simply never set
       the field, so a leak in the DOM would have gone straight past. */
    if (['stack', 'flow', 'down'].includes(row.state) && row.inlineCols)
      throw new Error(`${name}: the ${row.kind} in the ${row.state} state still carries `
        + `grid-template-columns: ${row.inlineCols} from a candidate it rejected`);

    /* CONTROL · THE RULE IS THE STATE'S OWN MARK. In a split it is a hairline in the gutter; in a
       flow it closes the task across the region. A state whose rule silently vanished would still
       screenshot plausibly, which is exactly the class of defect this pack keeps finding. */
    if (row.state === 'flow' && row.rule) {
      if (!row.rule.shown) throw new Error(`${name}: an instructionFlow has no rule under its task`);
      if (row.rule.w < row.w * 0.9)
        throw new Error(`${name}: the flow rule is ${row.rule.w}px across a ${row.w}px region`);
      if (row.rule.h !== 1) throw new Error(`${name}: the flow rule is ${row.rule.h}px tall, not a hairline`);
    }
    if (row.state === 'split' && row.rule && (!row.rule.shown || row.rule.w !== 1))
      throw new Error(`${name}: a split's rule is ${row.rule.shown ? row.rule.w + 'px wide' : 'hidden'}, not a hairline in the gutter`);
    if (row.state === 'across' && row.case.length > 1 && new Set(row.case).size !== 1)
      throw new Error(`${name}: repeated cases are not identical widths — ${row.case.join(', ')}`);
  }
}

console.log('\nresolving and rendering');
for (const m of PACK) {
  for (const sName of m.at) {
    const nm = `${m.n}-${m.frag}-${sName}`;
    const { log, measured, surface } = await shot(nm, m.frag, sName, { ...m, spec: false });
    verify(nm, log, measured, surface);
    const key = m.frag;
    if (payloads[key] && payloads[key].payload !== measured.payload) {
      const a = payloads[key].payload, b = measured.payload;
      let i = 0; while (i < a.length && i < b.length && a[i] === b[i]) i++;
      throw new Error(`${nm}: the semantic payload differs from ${payloads[key].name} — a layout proof must `
        + `carry the same content at every width.\n  ${payloads[key].name}: …${a.slice(Math.max(0, i - 40), i + 80)}\n  ${nm}: …${b.slice(Math.max(0, i - 40), i + 80)}`);
    }
    if (payloads[key] && payloads[key].regions !== measured.regions)
      throw new Error(`${nm}: the region sequence differs from ${payloads[key].name}`);
    if (!payloads[key]) payloads[key] = { name: nm, payload: measured.payload, regions: measured.regions };
    for (const r of log) REPORT.push({ image: nm, surface, ...r });
    const line = log.map((r) => `${r.kind}:${r.state}${r.substance != null ? ' ' + Math.round(r.substance * 100) + '%' : ''}`).join('  ');
    console.log(`  ${nm.padEnd(36)} ${String(surface).padStart(4)}px  ${line}`);
  }
}

await figPage.close();
await browser.close(); server.close();

console.log('\nTHE LADDER EACH COMPOSITION WALKED');
console.log('  ' + 'image'.padEnd(38) + 'primitive'.padEnd(22) + 'state'.padEnd(8) + 'why');
for (const r of REPORT)
  for (const t of r.tried)
    console.log('  ' + (t === r.tried[0] ? r.image : '').padEnd(38)
      + (t === r.tried[0] ? r.kind : '').padEnd(22) + (t.ok ? '✓ ' : '✗ ') + t.state.padEnd(6) + t.note);
const flows = REPORT.filter((r) => r.state === 'flow').length;
const stacks = REPORT.filter((r) => r.state === 'stack' || r.state === 'down').length;
console.log(`\n  ${REPORT.length} compositions · ${REPORT.filter((r) => r.state === 'split' || r.state === 'side' || r.state === 'across').length} two-track`
  + ` · ${flows} instructionFlow · ${stacks} stacked`);
console.log('  every plane drawn at a size its own ladder offers; no height test outside promptSubstance');
fs.writeFileSync(path.join(OUT, 'resolver-report.json'), JSON.stringify(REPORT, null, 2));
console.log('\nwrote ' + path.relative(root, OUT));
