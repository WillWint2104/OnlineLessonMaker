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
      /* EVERY PAINTED TEXT, so a caller can ask whether any two of them overlap. The engine drops
         tick labels rather than colliding them, so the only thing that ever collides is the labels
         the AUTHOR wrote — which is exactly what legibility means here. */
      const isTick = new Set(labs);
      const texts = [].slice.call(svg.querySelectorAll('text')).map((t) => {
        const bb = t.getBBox();
        return { x: bb.x, y: bb.y, w: bb.width, h: bb.height, tick: isTick.has(t) };
      });
      let overlaps = 0, tickOverlaps = 0;
      for (let i = 0; i < texts.length; i++) for (let j = i + 1; j < texts.length; j++) {
        const a2 = texts[i], b2 = texts[j];
        if (a2.x < b2.x + b2.w && b2.x < a2.x + a2.w && a2.y < b2.y + b2.h && b2.y < a2.y + a2.h) {
          overlaps++; if (a2.tick && b2.tick) tickOverlaps++;
        }
      }
      /* THE PAINTED TICK SET, as values and as text. Under equal unit scale the engine expands the
         shorter domain to fill the plot rect and then derives its ticks FROM THE EXPANDED RANGE, so
         a narrow plane can print a scale the author never wrote. Overlap alone cannot see that. */
      const ticks = labs.map((t) => ({ v: val(t), s: t.textContent.trim(),
        axis: t.getAttribute('text-anchor') === 'middle' ? 'x' : 'y' })).filter((t) => isFinite(t.v));
      const html = el.outerHTML;
      host.remove();
      return { html, x, y, texts: texts.length, overlaps, tickOverlaps, ticks, ratio: (x && y) ? +(x / y).toFixed(3) : null };
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
  /* THE SEED IS A GUESS AT THE ENGINE'S GUTTERS, AND ITS ERROR IS AMPLIFIED BY THE ASPECT RATIO.
     `h0` assumes 50px of horizontal chrome and 100px of vertical; a real box differing by Δgx and Δgy
     lands (ys/xs)·Δgx + Δgy away from it. At 1:1 that is small and a ±80 window always caught it. At
     20:9 it is not: the `tall` calibration plane needed offset 98 at 722px, 148 at 956px and 190 at
     1152px, so the window silently missed every wide span and the atlas read that as "no equal-unit
     box exists" — a property of the instrument reported as a property of the design. It is what made
     `primary` look impossible for a tall object.

     The fix is one re-seed, and it is deliberately ADDITIVE: the ±80 scan from `h0` runs first and
     unchanged, so every box that already solved returns the same first square hit it always did. Only
     when that scan comes back empty is the best-effort measurement used to re-aim — the painted box
     reports px-per-unit on each axis, so the height the plane is short by is exactly ys·(x − y) — and
     a second ±80 scan runs around the corrected seed. Still a search over painted boxes; still no
     modelled gutter. */
  async function boxForWidth(key, fig, w) {
    const d = fig.domain, xs = d.xMax - d.xMin, ys = d.yMax - d.yMin;
    let best = null;
    async function scan(seed) {
      for (let off = 0; off <= 80; off += 2) {
        for (const h of (off === 0 ? [seed] : [seed + off, seed - off])) {
          if (h < 80) continue;
          const r = await paint(key, fig, w, h);
          if (r.x == null || r.y == null) continue;
          const err = Math.abs(r.ratio - 1);
          if (!best || err < best.err) best = { err, box: { w, h, ...r } };
          if (square(r)) return { s: r.x, box: { w, h, ...r } };
        }
      }
      return null;
    }
    const first = await scan(Math.round((ys / xs) * (w - 50) + 100));
    if (first) return first;
    if (best) {
      const aim = Math.round(best.box.h + ys * (best.box.x - best.box.y));
      if (aim >= 80 && Math.abs(aim - best.box.h) > 2) {
        const second = await scan(aim);
        if (second) return second;
      }
    }
    return best ? { s: best.box.x, box: best.box, err: best.err } : null;
  }
  return { boxForWidth };
}

/* ══ WHAT THE MEDIA MAY REPORT ═════════════════════════════════════════════════════════════════
   CAPABILITY, NEVER FOOTPRINT. A graph may say what it NEEDS; it may never say what it would LIKE.
   "I would like to be 488px wide" is how tiny media ended up on large pages, so nothing here returns
   a preferred size. The exchange the architecture wants is:

       pattern: "I am giving you a 7-column media slot."
       graph:   "At that width I need 814px of height to show this domain faithfully."
       page:    "Fine. I scroll."

   MINIMUM LEGIBLE WIDTH is the narrowest painted width at which NO TWO OF THE TEXTS THE FIGURE
   PAINTS OVERLAP. It is measured by painting and looking, not modelled — and it is measured because
   the engine's own behaviour had to be discovered rather than assumed:

     · it NEVER collides tick labels; below a certain width it DROPS them instead;
     · it never shrinks type — 11px at every width from 200px to 1152px;
     · the labelled-tick count is not monotonic in width, so "retains its full labelling" is not a
       usable definition and was discarded after measuring it;
     · what does collide, and the only thing that does, is the AUTHORED objects' own labels — the
       point and line labels the figure was written with.

   So legibility, for this engine, is exactly: the labels the author wrote are all readable. */
/* WHAT THE MEDIA MAY SAY ABOUT ITSELF — CAPABILITY, NEVER FOOTPRINT.

   It is asked one question, about widths it did not choose: OF THESE APPROVED SPANS, WHICH CAN YOU
   RENDER FAITHFULLY? The answer is a subset of a set someone else supplied. There is no crossing
   number in the return value a caller could mistake for a display size — "I would like to be 488px
   wide" is not expressible here, which is how tiny media ended up on large pages.

   IT JUDGES THE SOLVED BOX, NOT A GUESSED ONE. An earlier version painted at a seed height
   `round(aspect*(w-50)+100)` and judged that. The seed is the HARNESS's guess at gutters, and the
   verdict moved with it: `symmetry` at a 382px slot is clean at h=498, prints x = ±6 for an
   authored ±5 at h=398, and prints decimals at h=698. That made the answer a property of the
   measuring instrument rather than of the media. It now asks `boxForWidth` for the box the RENDERER
   would actually use at that slot width and judges that — the same solve, the same memoised paint,
   the same pixels the page gets.

   LEGIBLE AT A SLOT WIDTH means three categorical things at once. The first version asked only the
   first and was wrong for three figures out of four:

   1 NO COLLISION — no two painted texts overlap.
   2 FIDELITY — every painted tick value lies inside the AUTHORED domain on its own axis. Under
     equal unit scale the engine expands the shorter domain to fill the plot rect and derives its
     ticks from the EXPANDED range, so a narrow plane can print a scale the author never wrote. A
     plane showing a domain the author did not write is not legible, however cleanly it is set.
   3 STABILITY — the painted tick set is the one the same figure prints at full width. This catches
     fabricated precision inside the domain — −7.5, −5.0, −2.5 … for an authored ±7, one decimal
     place more than the scale has.

   ASKING EACH APPROVED SPAN IS ALSO WHY THERE IS NO MONOTONICITY ASSUMPTION LEFT TO BREAK. There was
   one, and it broke: `roots` is clean at 264px, collides at 296 and 328, and is clean again at 360 —
   an illegible BAND, not a threshold, so no single crossing width describes it and a binary search
   for one returns whichever edge it lands on. `diagnose()` still finds that number, for a human
   reading a build log, and says when it is unsafe; nothing in the system decides anything with it. */
const EPS = 1e-9;
function makeJudge(fig, boxForWidth, key) {
  const d = fig.domain, aspect = (d.yMax - d.yMin) / (d.xMax - d.xMin);
  const sig = (r) => r.ticks.map((t) => `${t.axis}${t.s}`).join(' ');
  const inAuthored = (t) => t.axis === 'x'
    ? (t.v >= d.xMin - EPS && t.v <= d.xMax + EPS)
    : (t.v >= d.yMin - EPS && t.v <= d.yMax + EPS);
  return { aspect, sig,
    async box(w) { const b = await boxForWidth(key, fig, Math.round(w)); return b && b.box; },
    async why(w, refSig) {
      const r = await this.box(w);
      if (!r) return { ok: false, because: ['no box fits this slot width at all'] };
      if (!square(r)) return { ok: false, because: [`no height in this slot paints the domain at equal unit scale (best ${r.w}×${r.h} at ${r.ratio})`] };
      const outside = r.ticks.filter((t) => !inAuthored(t));
      const drifted = refSig != null && sig(r) !== refSig;
      return { ok: r.overlaps === 0 && !outside.length && !drifted, h: r.h,
        because: [r.overlaps ? `${r.overlaps} text overlap(s)${r.tickOverlaps ? ` (${r.tickOverlaps} between tick labels)` : ''}` : null,
          outside.length ? `tick(s) outside the authored domain: ${outside.map((t) => `${t.axis}=${t.s}`).join(', ')}` : null,
          drifted ? 'a different tick set from the same figure at full width' : null].filter(Boolean) };
    } };
}

export async function capability(boxForWidth, key, fig, widths = []) {
  const REF = 1152;
  const J = makeJudge(fig, boxForWidth, key);
  const refBox = await J.box(REF);
  const refSig = refBox ? J.sig(refBox) : null;
  const full = await J.why(REF, refSig);
  const legible = {};
  for (const w of [...new Set(widths)].sort((a, b) => a - b)) legible[w] = await J.why(w, refSig);
  return { aspect: +J.aspect.toFixed(3), equalUnitScale: true, focusAvailable: true,
    illegible: !full.ok, legible };
}

/* FOR A HUMAN READING A BUILD LOG, and for nothing else. It reports the narrowest width a binary
   search reaches AND whether that search was sound for this figure; a caller that used the number
   to size anything would be reintroducing the defect this module exists to remove. */
export async function diagnose(boxForWidth, key, fig) {
  const REF = 1152;
  const J = makeJudge(fig, boxForWidth, key);
  const refBox = await J.box(REF);
  const refSig = refBox ? J.sig(refBox) : null;
  const clean = async (w) => (await J.why(w, refSig)).ok;
  if (!(await clean(REF))) return { crossing: null, nonMonotonic: null, because: [] };
  let lo = 120, hi = REF;
  while (hi - lo > 8) { const mid = Math.round((lo + hi) / 2); if (await clean(mid)) hi = mid; else lo = mid; }
  let nonMonotonic = null;
  for (let i = 1; i <= 10 && !nonMonotonic; i++) {
    const w = Math.min(REF, hi + Math.round(i * (REF - hi) / 10));
    if (!(await clean(w))) nonMonotonic = `legible at ${hi}px and not at ${w}px`;
  }
  for (let i = 1; i <= 5 && !nonMonotonic; i++) {
    const w = Math.max(120, hi - 8 * i);
    if (await clean(w)) nonMonotonic = `illegible at ${hi - 8}px and legible at ${w}px`;
  }
  return { crossing: hi, nonMonotonic, because: (await J.why(Math.max(120, hi - 8), refSig)).because };
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
  while (box.h > H && w > minW) { w = Math.max(minW, w - 4); box = await solve(w); }
  if (box.h > H) return { box: bot, bound: 'height', yielded: false };
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
