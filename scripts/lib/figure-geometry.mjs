// FIGURE GEOMETRY — the media-size and media-geometry contracts, with ONE owner.
//
// Extracted so the atlas and the lesson renderer cannot drift: a figure's realised width is an input
// to the frozen `visual.side` switch point, and two copies of that number is two grammars.
//
// FIVE STEPS, AND EACH ANSWERS EXACTLY ONE QUESTION:
//
//     media type → SEMANTIC MEDIA SIZE → geometry class → approved subdesign → responsive state
//
// This module owns the middle three. What it measures:
//
//   · a plane's MEDIA GEOMETRY CLASS (portrait · balanced · landscape · wide) from the authored domain;
//   · its REALISED BOX per surface — the widest width in the AUTHORED size class's band whose measured
//     box clears that class's height ceiling, at equal unit scale, with the mathematics untouched;
//   · the derived `visual.side` switch point, from the realised width alone.
//
// IT DOES NOT DECIDE HOW LARGE A FIGURE SHOULD BE. That is `mediaSize`, authored, and it arrives here
// as a name. Geometry can say what shape a plane must keep; it can never say how much importance the
// plane deserves — a supporting number-line and a major explanatory graph can share an aspect ratio.
// Treating the old `preferredWidth` as the final display size is exactly how a 488x625 symmetry graph
// ended up on a 1152px desktop page: mathematically perfect, instructionally a thumbnail.
//
// It never reads prose, step counts, rendered heights, occupancy or dead space. The only numbers that
// leave here are the figure's own and the frozen tokens in atlas.json.
export const SQUARE = 0.006, TOL = 0.02;
export const square = (r) => r.ratio != null && Math.abs(r.ratio - 1) <= SQUARE;
/* THE BANDS COME FROM THE GRAMMAR, NOT FROM HERE. They were hardcoded in this module while
   atlas.json declared them in prose, so retuning the grammar changed nothing and the two quietly
   disagreed. One owner: the numbers live in `mediaGeometry.bands` and this reads them. */
export const classOf = (ratio, bands) => ratio > bands.portraitAbove ? 'portrait'
  : ratio >= bands.balancedAbove ? 'balanced'
  : ratio >= bands.landscapeAbove ? 'landscape' : 'wide';

export async function openFigurePage(browser, base) {
  const page = await browser.newPage({ viewport: { width: 1700, height: 1800 }, deviceScaleFactor: 2 });
  await page.goto(base, { waitUntil: 'load' });
  /* WAIT FOR THE FACES. A tick label's width is a font metric and the engine's axis gutters are
     sized from it, so a plane painted before the vendored faces arrive is measured against fallback
     metrics. That made the search non-deterministic between runs. */
  await page.evaluate(() => document.fonts.ready);
  return page;
}

export function makePainter(figPage) {
  const cache = new Map();
  return async function paint(key, fig, w, h) {
    const ck = `${key}|${w}|${h}`;
    if (cache.has(ck)) return cache.get(ck);
    const r = await figPage.evaluate(async ({ key, fig, w, h }) => {
      const host = document.createElement('div');
      host.className = 'mx';
      host.style.cssText = `position:absolute;left:-4000px;top:0;width:${w}px;`;
      host.innerHTML = `<div class="mx-part" data-mx-part="figure" data-fig-viewport
        style="position:relative;width:${w}px;height:${h}px;"><div class="mx-figstage"><div
        class="mx-figskin tp-slide"></div></div></div>`;
      document.querySelector('#slide').appendChild(host);
      host.querySelector('.mx-figskin').innerHTML = fragFigure(mxFigPolicy(fig), 'at-' + key);
      /* SETTLE, THEN MEASURE. The first fit of a box does not agree with the second — the same box
         measured x/y = 1.045 and then 1.005 on an immediate repeat — and since paints are memoised,
         whichever came first was what the entire search ran on. */
      figFitAll();
      await document.fonts.ready;
      await new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res)));
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
    cache.set(ck, r);
    return r;
  };
}

/* THE BOX IS MEASURED, NEVER MODELLED — the engine's label gutters are not a constant, and which axis
   binds changes with the box. A SURFACE DOES NOT CHOOSE A SCALE: it offers a width, and the figure's
   own aspect decides the height. So this solves for HEIGHT at a fixed width. It replaced a binary
   search over scale, which was searching the wrong variable and collapsed to a 169px plane that still
   painted perfectly square. */
export function makeSolvers(paint) {
  async function boxForWidth(key, fig, w) {
    const d = fig.domain, xs = d.xMax - d.xMin, ys = d.yMax - d.yMin;
    const h0 = Math.round((ys / xs) * (w - 50) + 100);
    let best = null;
    for (let off = 0; off <= 80; off += 2) {
      for (const h of (off === 0 ? [h0] : [h0 + off, h0 - off])) {
        if (h < 80) continue;
        const r = await paint(key, fig, w, h);
        if (r.x == null || r.y == null) continue;
        const err = Math.abs(r.ratio - 1);
        if (!best || err < best.err) best = { err, box: { w, h, ...r } };
        if (square(r)) return { s: r.x, box: { w, h, ...r } };
      }
    }
    return best ? { s: best.box.x, box: best.box, err: best.err } : null;
  }
  return { boxForWidth };
}

/* A REQUEST IS A FIGURE AT AN AUTHORED SIZE — `symmetry@standard`. The size is never optional and
   never defaulted: a default would be the renderer deciding how important the author's figure is. */
export const parseRequest = (req, sizes) => {
  const [key, size] = String(req).split('@');
  if (!size) throw new Error(`the figure "${key}" was asked for with no mediaSize — one of `
    + `${sizes.join(', ')} must be authored, because a default would be the renderer deciding how `
    + `important the figure is`);
  if (!sizes.includes(size)) throw new Error(`"${key}" asks for mediaSize "${size}" — the frozen `
    + `vocabulary is ${sizes.join(', ')}`);
  return { key, size };
};

/* THE SIZE CLASS PRESCRIBES A WIDTH BAND AND A HEIGHT CEILING; THE GEOMETRY DECIDES WHAT SHAPE THAT
   BECOMES. Realised by measurement: take the widest width the band allows, and if the measured box
   is taller than the class's ceiling, bring the WIDTH down — never squash the plane — until it is
   not. The plane's mathematics and equal unit scale are untouched throughout.

   The affine step is only how the next width to MEASURE is chosen; every number that survives is a
   measured one. Nothing here can read prose, height of surrounding content, occupancy or step count:
   the inputs are the authored domain, the authored size class and the surface. */
async function realise(key, fig, bounds, avail, boxForWidth, label) {
  const maxW = Math.min(bounds.max, avail), minW = Math.min(bounds.min, avail), H = bounds.maxHeight;
  const solve = async (w) => {
    const b = await boxForWidth(key, fig, w);
    if (!b) throw new Error(`${label}: no box at all fits a ${w}px width`);
    if (b.box.w < 0.9 * w)
      throw new Error(`${label}: the box solved to ${b.box.w}x${b.box.h} against a ${w}px target — `
        + `the search collapsed rather than converged`);
    if (!square(b.box))
      throw new Error(`${label}: no height at ${w}px paints this domain at equal unit scale `
        + `(best ${b.box.w}x${b.box.h} at ${b.box.ratio})`);
    return b.box;
  };
  const top = await solve(maxW);
  if (top.h <= H) return { box: top, bound: 'width', yielded: false };
  if (maxW <= minW) return { box: top, bound: 'height', yielded: true };
  const bot = await solve(minW);
  /* LEGIBILITY OUTRANKS THE CEILING. A plane so tall that even the band minimum overruns is still
     drawn at the minimum — it is never shrunk below the size class the author chose — and the build
     says so rather than silently producing a figure nobody asked for. */
  if (bot.h > H) return { box: bot, bound: 'height', yielded: true };
  const slope = (top.h - bot.h) / (maxW - minW);
  let w = Math.max(minW, Math.min(maxW, Math.floor(minW + (H - bot.h) / slope)));
  let box = await solve(w);
  for (let i = 0; i < 12 && box.h > H && w > minW; i++) { w = Math.max(minW, w - 4); box = await solve(w); }
  if (box.h > H) return { box: bot, bound: 'height', yielded: true };
  return { box, bound: 'height', yielded: false };
}

/* THE CONTRACT for one set of requests: geometry class, approved subdesign, the realised box per
   surface, and the derived `visual.side` switch point.

   THE SWITCH POINT IS A RESPONSIVE VIABILITY CALCULATION, NOT A LAYOUT CHOICE. It asks only:
   can the prescribed side-by-side subdesign physically satisfy its two minimum regions?

       side is viable when   availableWidth >= figureRealisedWidth + gap + minInterpretationWidth

   `figureRealisedWidth` is the figure at its authored size class, unconstrained by any surface —
   one number per request, from this contract only; `gap` and `minInterpretation` are fixed
   design-system tokens. Prose length, rendered height, step count, occupancy and dead space are not
   inputs and are not available here. Crossing the threshold changes the prescribed responsive state
   only — the authored composition is untouched — and because it is a pure width comparison, resizing
   back across it restores the side state exactly, carrying nothing from the state before.

   `visual.down` has no switch point at all: media already assigned the down subdesign stays down,
   however wide the monitor. */
export async function measureFigures({ figPage, A, FIGS, want, log }) {
  const paint = makePainter(figPage);
  const { boxForWidth } = makeSolvers(paint);
  const M = A.measures, SUB = A.mediaGeometry.resolves.visual;
  const SIZES = Object.keys(A.mediaSize.classes);
  const SURFACES = Object.keys(A.surfaces);
  const FIG = {};
  for (const req of want) {
    if (FIG[req]) continue;
    const { key, size } = parseRequest(req, SIZES);
    const f = FIGS[key];
    if (!f) throw new Error(`no figure "${key}" — the set is ${Object.keys(FIGS).filter((k) => k[0] !== '_').join(', ')}`);
    const d = f.figure.domain, xs = d.xMax - d.xMin, ys = d.yMax - d.yMin;
    const cls = classOf(ys / xs, A.mediaGeometry.bands), sub = SUB[cls];
    const bounds = A.mediaSize.classes[size].bounds;

    /* THE FIGURE AT ITS AUTHORED IMPORTANCE, unconstrained by any one surface. This is what the
       switch point is derived from, and it is the desktop band because that is where the size class
       is fully expressible. */
    const want0 = await realise(key, f.figure, bounds.desktop, Infinity, boxForWidth, `${req} desktop`);
    const pref = want0.box;
    const box = {}, bound = {}, yielded = [];
    for (const sName of SURFACES) {
      const r = await realise(key, f.figure, bounds[sName], A.surfaces[sName], boxForWidth, `${req} ${sName}`);
      box[sName] = r.box; bound[sName] = r.bound;
      if (r.yielded) yielded.push(sName);
    }
    const switchAt = sub === 'side' ? pref.w + M.gap + M.minInterpretation : null;
    FIG[req] = { key, size, cls, sub, resolved: 'visual.' + sub, switchAt, pref, box, bound, yielded, html: pref.html };
    if (log) log(`  ${req.padEnd(20)} ${String(ys / xs).slice(0, 4).padEnd(5)} aspect -> ${cls.padEnd(9)}`
      + ` -> visual.${sub.padEnd(5)} · ${size} realises ${pref.w}x${pref.h} (${pref.ratio}, ${bound.desktop}-bound)`
      + (switchAt ? ` · side viable at >=${switchAt}px` : ' · no switch point')
      + ' · boxes ' + SURFACES.map((n) => `${n[0]}${box[n].w}x${box[n].h}`).join(' ')
      + (yielded.length ? `  [CEILING YIELDED TO THE BAND MINIMUM at ${yielded.join(', ')}]` : ''));
  }
  return FIG;
}
