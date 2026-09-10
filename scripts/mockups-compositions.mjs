#!/usr/bin/env node
// THE ZONE-CONTRACT PACK — the layout grammar of the Mathematics worked-example compositions, and
// the resolver that decides when each arrangement is actually viable.
//
//   node scripts/mockups-compositions.mjs [outDir]
//
// The governing correction this revision implements: FITTING HORIZONTALLY IS NOT THE SAME AS BEING
// VIABLE. A candidate arrangement must pass four independent conditions —
//
//   width       every region meets its minimum useful width
//   fidelity    every intrinsic asset keeps the size it actually needs; a figure is sized FIRST,
//               from its own layout signature, and the text receives the remainder
//   occupancy   the shorter track fills enough of the row to be a track rather than a fragment
//   dead space  every substantial piece of inline space belongs to a semantic region
//
// — and only a candidate that passes all four is used. Otherwise the resolver stacks, which is a
// safe fallback and not a failure: there can be plenty of width and this content pair still not
// belong side by side.
//
// That is why there are no container queries left in the kit. A query can ask how wide the container
// is. It cannot ask whether the shorter track fills the row, or whether the space beside a plane
// belongs to anything — those are knowable only after a candidate has been laid out. So this build
// lays the candidate out, measures it, and writes the verdict and the track boxes back.
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
const FLOOR = C.figure.engineFloor, BOUND = C.figure.maxUsefulLongSide;
const OCC = C.gates.occupancy.min, DEAD = C.gates.deadSpace.toleranceGaps * GAP;

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
  /* THE FLOOR IS A PROPERTY OF THE MATHEMATICS: the plot area must clear MX_PLOT_MIN_W × MIN_H.
     THE BOUND IS A PROPERTY OF THE PAGE: the whole box may not exceed it. They are different things
     and for an extreme aspect they can fail to overlap — which is a Figure Engine decision, not a
     layout one, so the pack reports it rather than hiding it. */
  const sMinWanted = Math.max(FLOOR.w / xs, FLOOR.h / ys);
  const top = await largestScaleWithin(key, fig, 4, 260);
  if (!top) throw new Error(`${key}: no box inside the ${BOUND}px bound paints this domain at equal scale`);
  const floorUnreachable = top.s < sMinWanted - 0.01;
  const sMax = top.s, sMin = floorUnreachable ? top.s : sMinWanted;
  const sPref = Math.max(sMin, C.figure.preferredFraction * sMax);
  const need = async (s, label) => {
    const b = await boxForScale(key, fig, s);
    if (!b) throw new Error(`${key}: the engine cannot paint ${s.toFixed(1)} px per unit`);
    return { ...b, label };
  };
  const minReadable = await need(sMin, 'minimumReadable');
  const preferred = await need(sPref, 'preferred');
  const maxUseful = { ...top.box, label: 'maximumUseful' };
  const sig = { minReadable, preferred, maxUseful, sMin, sPref, sMax, xs, ys,
    equalScaleRequired: true, floorUnreachable, wantedFloorScale: +sMinWanted.toFixed(1),
    oneLegalScale: sMax - sMin < 0.5 };
  console.log(`  ${key.padEnd(11)} min ${minReadable.w}×${minReadable.h} @${sMin.toFixed(1)}  `
    + `pref ${preferred.w}×${preferred.h} @${sPref.toFixed(1)}  max ${maxUseful.w}×${maxUseful.h} @${sMax.toFixed(1)} px/unit`
    + (floorUnreachable ? `  [FLOOR UNREACHABLE — the plot needs ${sMinWanted.toFixed(1)} px/unit to clear `
        + `${FLOOR.w}×${FLOOR.h}, and the ${BOUND}px bound is reached at ${sMax.toFixed(1)}]`
       : sig.oneLegalScale ? '  [ONE legal scale]' : ''));
  return sig;
}
console.log('\nfigure layout signatures (asked of the engine, not computed from an aspect)');
const SIG = {};
for (const [key, f] of Object.entries(FIGS)) { if (key.startsWith('_')) continue; SIG[key] = await signature(key, f); }

/* ══ THE PAGE ══════════════════════════════════════════════════════════════════════════════════ */
const tokens = (surface, pad) => `:root{
  --mk-surface-w:${surface}px; --mk-pad:${pad}px; --mk-gap:${GAP}px;
  --mk-rowgap:34px; --mk-stackgap:22px;
  --mk-prompt-max:${px(R.prompt.max)}px; --mk-solution-max:${px(R.solution.max)}px;
  --mk-interp-max:${px(R.interpretation.max)}px; --mk-synthesis-max:${px(R.synthesis.max)}px;
}`;
const band = (r) => `min ${R[r].min}rem (${px(R[r].min)}px) · max ${R[r].max}rem (${px(R[r].max)}px) · growth ${R[r].grow}`;
const DIM = {
  prompt: `PROMPT TRACK · ${band('prompt')}. A position, not a box: no fill, no border, no stretching.`,
  solution: `SOLUTION TRACK · ${band('solution')}. The maximum is an allocation ceiling, not only a prose cap — a track is never given width its region cannot use.`,
  case: `CASE · ${band('case')}. Repeated children share one track contract and one verdict.`,
  figure: `FIGURE · sized FIRST, from its own layout signature, before any text is allocated. Never 1fr, never the space that happens to be free.`,
  interpretation: `INTERPRETATION RAIL · ${band('interpretation')}. Takes the remainder beside the plane, capped at its maximum.`,
  gates: `A CANDIDATE MUST PASS · width · figure fidelity · vertical occupancy ≥ ${Math.round(OCC * 100)}% · no unowned space between or inside tracks. Otherwise it stacks — a safe fallback, not a failure.`,
  occupancy: `OCCUPANCY = the shorter track's content height ÷ the row's height. Below ${Math.round(OCC * 100)}% the short region is a fragment beside a wall, not a track.`,
  deadSpace: `DEAD SPACE · no unowned width between two tracks or inside one. Space past the last track is page margin, and is reported rather than failed — stacking to avoid it makes it larger, not smaller.`,
  repeatCount: `Three examples here; the geometry is identical at two, four or ten. The count appears nowhere in the layout — and a repeat's children share ONE verdict, so a gate can never leave row 2 stacked between two split siblings.`,
  repeatAcross: `repeat(across) over the cases: one shared track contract, so two cases are two columns and the arrangement is not designed per count.`,
  asmStandard: C.compositions.standard.assembly,
  asmSequence: C.compositions.sequence.assembly,
  asmPaired: C.compositions.pairedVisual.assembly,
  asmVisualCheck: C.compositions.visualCheck.assembly,
  asmExtended: C.compositions.extended.assembly,
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

/* ══ THE RESOLVER, IN THE PAGE ═════════════════════════════════════════════════════════════════ */
const RESOLVER = `(cfg) => {
  const { regions:R, sig:SIG, GAP, OCC, DEAD } = cfg;
  const log = [];
  const alloc = (regs, avail) => {                 /* weighted, clamped to [min,max], redistributed */
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
    return fixed.map((v) => v || 0);
  };
  const kids = (el, name) => [].slice.call(el.children).filter((c) => c.getAttribute('data-mk-region') === name);
  const H = (el) => Math.round(el.getBoundingClientRect().height);

  const els = [].slice.call(document.querySelectorAll('[data-mk="instructionSplit"],'
    + '[data-mk="repeat"][data-mk-axis="across"],[data-mk="visualInterpretation"]'));

  /* ── 4 · build the candidate. Intrinsic assets are sized first. ───────────────────────────── */
  const cand = [];
  for (const el of els) {
    const kind = el.getAttribute('data-mk');
    const avail = el.clientWidth, inner = avail - GAP;
    const rec = { el, kind, avail, reject: null, note: '' };
    if (kind === 'visualInterpretation') {
      const host = kids(el, 'figure')[0];
      const key = host.getAttribute('data-mk-figure'), sg = SIG[key];
      /* FIGURE FIRST, AND IN SCALE. The plane takes its preferred px-per-unit, reduced only within
         [minimumReadable .. preferred], never below its floor, and never merely to preserve a split. */
      const room = inner - R.interpretation.min;
      /* the widest scale this room can hold, read off the plane's own preferred box */
      const perPx = sg.preferred.w / sg.sPref;              /* px of box per px-per-unit of scale */
      const roomScale = room / perPx;
      const sc = Math.min(sg.sPref, Math.max(sg.sMin, Math.min(roomScale, sg.sMax)));
      if (roomScale < sg.sMin - 0.01) {
        rec.reject = 'fidelity';
        rec.note = 'the plane needs ' + Math.round(sg.minReadable.w) + 'px to stay at its '
          + sg.sMin.toFixed(1) + ' px/unit floor, and only ' + Math.round(room) + 'px is free beside a '
          + R.interpretation.min + 'px rail';
      } else {
        rec.fig = { key, scale: +sc.toFixed(3),
          w: Math.round(sg.preferred.w * sc / sg.sPref), h: Math.round(sg.preferred.h * sc / sg.sPref) };
        const rail = Math.min(inner - rec.fig.w, R.interpretation.max);
        rec.cols = [rec.fig.w, rail];
        /* DEAD SPACE, AS AN INVARIANT RATHER THAN A REJECTION — see the note below. What is forbidden
           is unowned space BETWEEN the tracks or INSIDE one; space past the last track is page margin.
           Rejecting trailing space here made the resolver strictly worse: it stacked a 386px plane to
           avoid 94px of trailing space and thereby produced 766px of it. */
        rec.trailing = Math.round(inner - rec.fig.w - rail);
      }
    } else {
      const regs = kind === 'repeat' ? kids(el, 'case').map(() => R.case) : [R.prompt, R.solution];
      const n = regs.length, innerN = avail - GAP * (n - 1);
      const w = alloc(regs, innerN);
      const sum = w.reduce((s, v) => s + v, 0);
      if (sum > innerN + 0.5) { rec.reject = 'width';
        rec.note = 'the minimums sum to ' + Math.round(sum + GAP * (n - 1)) + 'px in ' + avail + 'px'; }
      else { rec.cols = w.map((v) => Math.round(v)); rec.trailing = Math.round(innerN - sum); }
    }
    cand.push(rec);
  }

  /* apply every surviving candidate, then measure it */
  for (const rec of cand) {
    rec.el.setAttribute('data-mk-state', rec.reject ? 'stack' : 'split');
    if (!rec.reject) {
      if (rec.fig) { const h = kids(rec.el, 'figure')[0].querySelector('[data-mk-figure-box]');
        h.style.width = rec.fig.w + 'px'; h.style.height = rec.fig.h + 'px'; }
      if (rec.kind === 'instructionSplit') {
        /* the hairline is a real column of the split, not a gap */
        rec.el.style.gridTemplateColumns = rec.cols[0] + 'px ' + GAP + 'px ' + rec.cols[1] + 'px';
        rec.el.style.columnGap = '0px';
      } else {
        rec.el.style.gridTemplateColumns = rec.cols.map((c) => c + 'px').join(' ');
        rec.el.style.columnGap = GAP + 'px';
      }
    }
  }
  document.body.getBoundingClientRect();

  /* ── 5 · the occupancy gate, measured on the laid-out candidate ───────────────────────────── */
  for (const rec of cand) {
    if (rec.reject) continue;
    const names = rec.kind === 'visualInterpretation' ? ['figure', 'interpretation']
      : rec.kind === 'repeat' ? ['case'] : ['prompt', 'solution'];
    const hs = [].concat.apply([], names.map((n) => kids(rec.el, n).map(H)));
    const row = Math.max.apply(null, hs), low = Math.min.apply(null, hs);
    rec.occ = row ? +(low / row).toFixed(3) : 1;
    rec.heights = hs;
    if (rec.occ < OCC) { rec.reject = 'occupancy';
      rec.note = 'the shorter track fills ' + Math.round(rec.occ * 100) + '% of a ' + row + 'px row'; }
  }

  /* a repeat's children share ONE verdict — the strictest decides */
  for (const rec of cand) {
    if (rec.kind !== 'instructionSplit') continue;
    const grp = rec.el.closest('[data-mk="repeat"][data-mk-axis="down"]');
    if (!grp) continue;
    rec.group = true;
    const sibs = cand.filter((o) => o.kind === 'instructionSplit'
      && o.el.closest('[data-mk="repeat"][data-mk-axis="down"]') === grp);
    const bad = sibs.find((o) => o.reject);
    if (bad) for (const o of sibs) if (!o.reject) {
      o.reject = bad.reject; o.inherited = true;
      o.note = 'a sibling row in this repeat failed the ' + bad.reject + ' gate (' + bad.note + '), and a repeat\\'s children share one verdict';
    }
  }

  /* ── 6-8 · apply the verdicts ─────────────────────────────────────────────────────────────── */
  for (const rec of cand) {
    if (!rec.reject) continue;
    rec.el.setAttribute('data-mk-state', 'stack');
    rec.el.style.gridTemplateColumns = '';
    rec.el.style.columnGap = '';
    if (rec.fig || rec.kind === 'visualInterpretation') {
      const host = kids(rec.el, 'figure')[0];
      if (host) { const key = host.getAttribute('data-mk-figure'), sg = SIG[key];
        /* stacked, the plane still takes its own preferred scale, and may use the whole region up to
           its maximum useful scale — beyond which a wider box is only blank plane */
        const perPx = sg.preferred.w / sg.sPref;
        const sc = Math.min(sg.sPref, Math.max(sg.sMin, Math.min(rec.avail / perPx, sg.sMax)));
        const w = Math.round(sg.preferred.w * sc / sg.sPref), h = Math.round(sg.preferred.h * sc / sg.sPref);
        const b = host.querySelector('[data-mk-figure-box]');
        b.style.width = w + 'px'; b.style.height = h + 'px';
        /* THE REGION IS THE PLANE, STACKED AS WELL AS SPLIT. A full-width figure region around a
           386px plane claims 766px it can never use, which is the same defect as a 736px track
           around a 600px plane — only harder to see because nothing sits beside it. Shrinking the
           region to its content does not move a pixel of the image; it moves the ownership of the
           space from the composition to the page margin, which is what the rule is actually about. */
        host.style.width = w + 'px';
        rec.fig = { key, w, h, scale: +sc.toFixed(3) };
        rec.stackedTrailing = Math.round(rec.avail - w);
      }
    }
  }
  document.body.getBoundingClientRect();

  for (const rec of cand) log.push({ kind: rec.kind, avail: rec.avail, state: rec.reject ? 'stack' : 'split',
    reject: rec.reject, note: rec.note, cols: rec.cols || null, occ: rec.occ == null ? null : rec.occ,
    heights: rec.heights || null, fig: rec.fig || null, trailing: rec.trailing == null ? null : rec.trailing,
    stackedTrailing: rec.stackedTrailing == null ? null : rec.stackedTrailing, inherited: !!rec.inherited });
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
  await p.setContent(page(body, surface, pad, opts), { waitUntil: 'load' });
  await p.waitForTimeout(360);

  /* PHASE 1 — layout. Figures are empty boxes of exactly the size the resolver assigns, so occupancy
     and dead space are measured against the real geometry before a single plane is painted. */
  const log = await p.evaluate(`(${RESOLVER})(${JSON.stringify({
    regions: { prompt: { min: px(R.prompt.min), max: px(R.prompt.max), grow: R.prompt.grow },
      solution: { min: px(R.solution.min), max: px(R.solution.max), grow: R.solution.grow },
      case: { min: px(R.case.min), max: px(R.case.max), grow: R.case.grow },
      interpretation: { min: px(R.interpretation.min), max: px(R.interpretation.max), grow: R.interpretation.grow } },
    sig: SIG, GAP, OCC, DEAD })})`);

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

  /* the verdict, written onto the page */
  await p.evaluate(({ log, OCC, DEAD }) => {
    const els = [].slice.call(document.querySelectorAll('[data-mk="instructionSplit"],'
      + '[data-mk="repeat"][data-mk-axis="across"],[data-mk="visualInterpretation"]'));
    els.forEach((el, i) => {
      const r = log[i]; if (!r) return;
      const d = document.createElement('p');
      d.className = 'mk-verdict';
      if (r.reject) d.setAttribute('data-mk-reject', r.reject);
      const occ = r.occ == null ? '' : ` · occupancy ${Math.round(r.occ * 100)}% (floor ${Math.round(OCC * 100)}%)`;
      const cols = r.cols ? ` · tracks ${r.cols.join(' + ')}` : '';
      const fig = r.fig ? ` · plane ${r.fig.w}×${r.fig.h}` : '';
      d.innerHTML = '<b>' + (r.reject ? 'stack' : 'split') + '</b>' + r.kind + ' in ' + r.avail + 'px'
        + cols + fig + occ + (r.reject ? ' — REJECTED by the ' + r.reject + ' gate: ' + r.note : ' — all four gates pass');
      el.insertAdjacentElement('afterend', d);
    });
  }, { log, OCC, DEAD });

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
      return { kind: el.getAttribute('data-mk'), state: el.getAttribute('data-mk-state'),
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
  for (const row of measured.rows) {
    if (row.state === 'split' && row.topsA.length && row.topsB.length
        && Math.abs(row.topsA[0] - row.topsB[0]) > 1)
      throw new Error(`${name}: the two tracks of a split ${row.kind} do not share a top edge`);
    if (row.kind === 'visualInterpretation' && row.plane[0] != null && row.figure[0] - row.plane[0] > 1)
      throw new Error(`${name}: the figure region is ${row.figure[0]}px around a ${row.plane[0]}px plane `
        + `in the ${row.state} state — ${row.figure[0] - row.plane[0]}px inside a region that cannot use it`);
    if (row.state === 'split' && row.case.length > 1 && new Set(row.case).size !== 1)
      throw new Error(`${name}: repeated cases are not identical widths — ${row.case.join(', ')}`);
  }
  for (const r of log) {
    if (r.state === 'split') {
      if (r.occ != null && r.occ < OCC) throw new Error(`${name}: a split survived at ${Math.round(r.occ * 100)}% occupancy, under the ${Math.round(OCC * 100)}% floor`);
      /* nothing unowned BETWEEN the tracks: the assigned columns plus the gaps must reach the last
         track's right edge exactly. Trailing space past it is page margin and is reported, not failed. */
      const cols = r.cols || [];
      const used = cols.reduce((s, v) => s + v, 0) + GAP * (cols.length - 1);
      if (cols.length && r.trailing != null && Math.abs(r.avail - used - r.trailing) > 1.5)
        throw new Error(`${name}: a split's tracks and gaps do not account for its width — `
          + `${r.avail}px available, ${Math.round(used)}px in tracks and gaps, ${r.trailing}px trailing`);
    }
    if (r.fig && r.fig.ratio != null && Math.abs(r.fig.ratio - 1) > SQUARE)
      throw new Error(`${name}: a plane painted at ${r.fig.ratio}`);
  }
  /* the states must be reachable from the same content at every surface */
  const prior = payloads[name.replace(/-(desktop|middle|narrow|wide)$/, '')];
  return prior;
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
    const line = log.map((r) => `${r.kind}:${r.state}${r.reject ? '(' + r.reject + ')' : ''}${r.occ != null ? ' ' + Math.round(r.occ * 100) + '%' : ''}`).join('  ');
    console.log(`  ${nm.padEnd(36)} ${String(surface).padStart(4)}px  ${line}`);
  }
}

await browser.close(); server.close();

console.log('\nEVERY OCCUPANCY THE PACK MEASURED — the data the threshold should be argued from');
console.log('  ' + 'image'.padEnd(36) + 'primitive'.padEnd(22) + 'heights'.padEnd(18) + 'occupancy   verdict');
for (const r of REPORT.filter((x) => x.occ != null))
  console.log('  ' + r.image.padEnd(36) + r.kind.padEnd(22)
    + (r.heights || []).join(' / ').padEnd(18) + String(Math.round(r.occ * 100) + '%').padStart(6)
    + '      ' + r.state + (r.reject ? ' (' + r.reject + ')' : ''));
const rej = REPORT.filter((r) => r.reject);
console.log(`\n  ${REPORT.length} arrangements resolved · ${rej.length} rejected — `
  + Object.entries(rej.reduce((a, r) => (a[r.reject] = (a[r.reject] || 0) + 1, a), {}))
      .map(([k, v]) => `${k} ${v}`).join(', '));
fs.writeFileSync(path.join(OUT, 'resolver-report.json'), JSON.stringify(REPORT, null, 2));
console.log('\nwrote ' + path.relative(root, OUT));
