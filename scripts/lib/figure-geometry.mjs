// FIGURE GEOMETRY — the media-geometry contract, with ONE owner.
//
// Extracted so the atlas and the lesson renderer cannot drift: a figure's preferred width is an
// input to the frozen `visual.side` switch point, and two copies of that number is two grammars.
//
// What this measures, and what it refuses to:
//
//   · a plane's INTRINSIC LEGIBLE SIZE, searched by asking the shipped Figure Engine to paint and
//     scoring the painted result — px per authored x-unit against px per authored y-unit;
//   · its MEDIA GEOMETRY CLASS (portrait · balanced · landscape · wide) from the authored domain;
//   · one box per surface, each SOLVED at the width it will occupy.
//
// It never reads prose, step counts, rendered heights, occupancy or dead space. The only numbers
// that leave here are the figure's own.
export const SQUARE = 0.006, TOL = 0.02, FLOOR = { w: 340, h: 255 }, BOUND = 720;
export const square = (r) => r.ratio != null && Math.abs(r.ratio - 1) <= SQUARE;
export const classOf = (ratio) => ratio > 1.3 ? 'portrait' : ratio >= 0.75 ? 'balanced'
  : ratio >= 0.4 ? 'landscape' : 'wide';

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

/* a box that paints the authored domain at a given px-per-unit, found by measuring rather than
   modelling — the engine's label gutters are not a constant, and which axis binds changes with
   the box */
export function makeSolvers(paint) {
  async function boxForScale(key, fig, s) {
    const d = fig.domain, xs = d.xMax - d.xMin, ys = d.yMax - d.yMin;
    let w = Math.round(xs * s + 50), h = Math.round(ys * s + 100);
    for (let i = 0; i < 6; i++) {
      if (w < 60 || h < 60 || w > 4000 || h > 4000) return null;
      const r = await paint(key, fig, w, h);
      if (r.x == null || r.y == null) return null;
      if (Math.abs(r.x - s) / s <= TOL && Math.abs(r.y - s) / s <= TOL && square(r)) return { w, h, ...r };
      const nw = Math.max(60, Math.round(w * Math.min(2, Math.max(0.5, s / r.x))));
      const nh = Math.max(60, Math.round(h * Math.min(2, Math.max(0.5, s / r.y))));
      if (nw === w && nh === h) return null;
      w = nw; h = nh;
    }
    return null;
  }
  /* A SURFACE DOES NOT CHOOSE A SCALE — it offers a width, and the figure's own aspect decides the
     height. So this solves for HEIGHT at a fixed width. It replaced a binary search over scale,
     which was searching the wrong variable and collapsed to a 169px plane that still painted
     perfectly square. */
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
  async function largestWithin(key, fig, lo, hi, cap) {
    let best = null;
    for (let i = 0; i < 9 && hi - lo > 0.25; i++) {
      const mid = (lo + hi) / 2, b = await boxForScale(key, fig, mid);
      if (b && Math.max(b.w, b.h) <= cap) { best = { s: mid, box: b }; lo = mid; } else hi = mid;
    }
    return best;
  }
  return { boxForScale, boxForWidth, largestWithin };
}

/* THE MEDIA-GEOMETRY CONTRACT for one set of figures: class, subdesign, preferred box, one box per
   surface, and the derived `visual.side` switch point.

   THE SWITCH POINT IS A RESPONSIVE VIABILITY CALCULATION, NOT A LAYOUT CHOICE. It asks only:
   can the prescribed side-by-side subdesign physically satisfy its two minimum regions?

       side is viable when   availableWidth ≥ figurePreferredWidth + gap + minInterpretationWidth

   `figurePreferredWidth` comes only from this contract; `gap` and `minInterpretation` are fixed
   design-system tokens. Prose length, rendered height, step count, occupancy and dead space are
   not inputs and are not available here. Crossing the threshold changes the prescribed responsive
   state only — the authored composition is untouched — and because it is a pure width comparison,
   resizing back across it restores the side state exactly, carrying nothing from the state before.

   `visual.down` has no switch point at all: media already assigned the down subdesign stays down,
   however wide the monitor. */
export async function measureFigures({ figPage, A, FIGS, keys, log }) {
  const paint = makePainter(figPage);
  const { boxForScale, boxForWidth, largestWithin } = makeSolvers(paint);
  const M = A.measures, SUB = A.mediaGeometry.resolves.visual;
  const SURFACES = Object.keys(A.surfaces);
  const FIG = {};
  for (const [key, f] of Object.entries(FIGS)) {
    if (key.startsWith('_') || (keys && !keys.has(key))) continue;
    const d = f.figure.domain, xs = d.xMax - d.xMin, ys = d.yMax - d.yMin;
    const cls = classOf(ys / xs), sub = SUB[cls];
    const top = await largestWithin(key, f.figure, 4, 260, BOUND);
    if (!top) throw new Error(`${key}: no box inside the ${BOUND}px bound paints this domain at equal scale`);
    const floor = Math.max(FLOOR.w / xs, FLOOR.h / ys);
    const sPref = Math.max(Math.min(floor, top.s), 0.85 * top.s);
    const pref = (await boxForScale(key, f.figure, sPref)) || top.box;

    const box = {};
    for (const sName of SURFACES) {
      const avail = A.surfaces[sName];
      const target = sub === 'down' ? Math.min(A.mediaGeometry.widePreferredWidth, avail)
                                    : Math.min(pref.w, avail);
      if (target === pref.w) { box[sName] = pref; continue; }
      const b = await boxForWidth(key, f.figure, target);
      if (!b) throw new Error(`${key}: no box at all fits the ${target}px ${sName} target`);
      if (b.box.w < 0.9 * target)
        throw new Error(`${key}: the ${sName} box solved to ${b.box.w}x${b.box.h} against a ${target}px `
          + `target — the search collapsed rather than converged`);
      if (!square(b.box))
        throw new Error(`${key}: no height at ${target}px paints this domain at equal unit scale `
          + `(best ${b.box.w}x${b.box.h} at ${b.box.ratio})`);
      box[sName] = b.box;
    }
    const switchAt = sub === 'side' ? pref.w + M.gap + M.minInterpretation : null;
    FIG[key] = { cls, sub, resolved: 'visual.' + sub, switchAt, pref, box, html: pref.html };
    if (log) log(`  ${key.padEnd(11)} ${String(ys / xs).slice(0, 4).padEnd(5)} aspect → ${cls.padEnd(9)} `
      + `→ visual.${sub.padEnd(5)} · preferred ${pref.w}×${pref.h} @${sPref.toFixed(1)} px/unit (${pref.ratio})`
      + (switchAt ? ` · side viable at ≥${switchAt}px` : ' · no switch point')
      + ' · boxes ' + SURFACES.map((n) => `${n[0]}${box[n].w}×${box[n].h}`).join(' '));
  }
  return FIG;
}
