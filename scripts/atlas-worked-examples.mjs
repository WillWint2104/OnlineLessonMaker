#!/usr/bin/env node
// THE WORKED-EXAMPLE ATLAS — a finite library of designed presentations, rendered for approval.
//
//   node scripts/atlas-worked-examples.mjs [outDir]
//
// FOUR INDEPENDENT AXES, and the build's job is to keep them independent:
//
//   COMPOSITION   the spatial relationship of what is visible NOW      authored
//   DISCLOSURE    whether several things are visible at once           authored
//   SCROLL        page · local-y (workspace only) · local-x            authored
//   STATE         a template's own prescribed wide/narrow arrangement  the surface width, alone
//
// THERE IS NO RESOLVER HERE. Nothing measures content in order to choose a composition — no
// occupancy, no growth weights, no height matching, no scoring across candidates, no attempt to fill
// the available space, and no assumption that a page ought to avoid scrolling. The composition
// resolver that did all of those things is retained as research evidence at docs/mockups/compositions/
// and its layout-selection logic must not be ported into the app.
//
// AND NOTHING HERE CREATES OR REMOVES A TAB. Tabs are authored pedagogical structure. `data-active`
// is stamped from the selection in pack.json; the tab bar is rendered in full at every width. The
// build asserts the tab structure — count, labels, panels, nesting — is character-identical to the
// signature authored in pack.json, at every width and in every tab state. "This got tall, so I will
// hide half of it in tabs" is resolver behaviour wearing a different hat.
//
// What IS still measured, because it is a property of the material rather than a design decision:
//
//   · a figure's intrinsic legible size, searched by asking the engine to paint and scoring the
//     painted result — px per authored x-unit against px per y-unit;
//   · a figure's MEDIA GEOMETRY CLASS (portrait · balanced · landscape · wide), the one automatic
//     classification the atlas permits — a design input a composition maps to an approved subdesign,
//     never a size, and never derived from the surrounding prose;
//   · overflow, unowned space inside a region, prose measure, and payload identity, all as controls.
//
// The app is not changed by this script and does not read anything under docs/atlas/.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(root, 'docs/atlas/worked-examples/src');
const OUT = path.resolve(process.argv[2] || path.join(root, 'docs/atlas/worked-examples'));
fs.mkdirSync(OUT, { recursive: true });

const A = JSON.parse(fs.readFileSync(path.join(SRC, 'atlas.json'), 'utf8'));
const FIGS = JSON.parse(fs.readFileSync(path.join(SRC, 'figures.json'), 'utf8'));
const PACK = JSON.parse(fs.readFileSync(path.join(SRC, 'pack.json'), 'utf8'));
const CSS_KIT = fs.readFileSync(path.join(SRC, 'atlas.css'), 'utf8');
/* ATLAS_ONLY=13,18 renders just those reference designs (and measures only the figures they use).
   For iterating and for driving deliberate regressions at each control; the committed images are
   always a full run. */
const ONLY = process.env.ATLAS_ONLY ? new Set(process.env.ATLAS_ONLY.split(',')) : null;
const SELECTED = ONLY ? PACK.filter((e) => ONLY.has(e.n)) : PACK;
if (ONLY && !SELECTED.length) throw new Error('ATLAS_ONLY matched no entry');
const M = A.measures, FLOOR = { w: 340, h: 255 }, BOUND = 720;

/* THE RESPONSIVE STATE COMES FROM ONE NUMBER: the surface width, against a switch point the template
   itself declares. Every named thing in the taxonomy contributes its own; nothing else is consulted. */
const SWITCH = {};
for (const group of [A.compositions, A.collections, A.presentations, A.scroll])
  for (const [k, v] of Object.entries(group))
    if (v && typeof v === 'object' && v.switchAt) SWITCH[k] = v.switchAt;

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

/* the app's own stylesheet, read from the CSSOM — slicing <style> out of the text mis-pairs on the
   file's own comments and silently drops rule blocks */
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

/* ══ FIGURES · intrinsic legibility and media geometry ═════════════════════════════════════════ */
const figPage = await browser.newPage({ viewport: { width: 1700, height: 1800 }, deviceScaleFactor: 2 });
await figPage.goto(base, { waitUntil: 'load' });
/* WAIT FOR THE FACES. A tick label's width is a font metric, and the engine's axis gutters are
   sized from it — so a plane painted before the vendored faces arrive is measured against fallback
   metrics. That made the search non-deterministic between runs: the landscape figure's narrow box
   came back 382x216 once and 169x156 the next time, from identical code. */
await figPage.evaluate(() => document.fonts.ready);
const cache = new Map();
const paint = async (key, fig, w, h) => {
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
    /* SETTLE, THEN MEASURE. The first fit of a box does not agree with the second: painting the
       landscape plane at 382x216 measured x/y = 1.045 and then 1.005 on an immediate repeat of the
       identical box. Since `paint` memoises, whichever value came first was the one the whole search
       ran on. Fit twice and read the settled figure. */
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
const SQUARE = 0.006, TOL = 0.02;
const square = (r) => r.ratio != null && Math.abs(r.ratio - 1) <= SQUARE;
/* a box that paints the authored domain at a given px-per-unit, found by measuring rather than
   modelling — the engine's label gutters are not a constant and which axis binds changes with the box */
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
/* THE NARROW SURFACE DOES NOT CHOOSE A SCALE — it gives the figure its full width, and the figure's
   own aspect then decides the height. So this solves for HEIGHT at a fixed width, scanning outward
   from the aspect-implied height until the engine paints one authored x-unit and one authored y-unit
   at the same length.

   It replaces a binary search over scale, which was searching the wrong variable. `boxForScale`
   accepts a candidate only if the painted scale matches AND the plane is square; for the landscape
   plane at ~382px wide the painted ratio sits at 1.005–1.007, straddling the 0.006 tolerance, so
   acceptance flipped on sub-pixel noise and the search collapsed to a 169px plane — which still
   paints perfectly square and still screenshots as a graph. Scanning height finds 382x241 at 1.005.
   (A box is never scaled after painting: reusing a pre-painted box at a smaller size distorts it,
   because the engine's label gutters are a near-constant number of px.) */
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
const classOf = (ratio) => ratio > 1.3 ? 'portrait' : ratio >= 0.75 ? 'balanced' : ratio >= 0.4 ? 'landscape' : 'wide';
const SUBDESIGN = A.figureClasses.mapsTo;

console.log('\nfigures — intrinsic legible size and media-geometry class');
const FIG = {};
/* expand the {{PART:…}} includes before looking for figures — a fragment can reach a plane only
   through a shared body, and scanning the outer file alone reported "no figure graphcheck" */
const expand = (f) => fs.readFileSync(path.join(SRC, f + '.html'), 'utf8')
  .replace(/\{\{PART:([a-z0-9_-]+)\}\}/gi, (m, q) => fs.readFileSync(path.join(SRC, q + '.part'), 'utf8'));
const NEEDED = new Set(SELECTED.flatMap((e) => [...expand(e.frag).matchAll(/\{\{FIG:([a-z0-9-]+)\}\}/gi)].map((m) => m[1])));
for (const [key, f] of Object.entries(FIGS)) {
  if (key.startsWith('_') || (ONLY && !NEEDED.has(key))) continue;
  const d = f.figure.domain, xs = d.xMax - d.xMin, ys = d.yMax - d.yMin;
  const cls = classOf(ys / xs), sub = SUBDESIGN[cls];
  const top = await largestWithin(key, f.figure, 4, 260, BOUND);
  if (!top) throw new Error(`${key}: no box inside the ${BOUND}px bound paints this domain at equal scale`);
  const floor = Math.max(FLOOR.w / xs, FLOOR.h / ys);
  const sPref = Math.max(Math.min(floor, top.s), 0.85 * top.s);
  const pref = (await boxForScale(key, f.figure, sPref)) || top.box;
  /* the width a `down` subdesign gives a wide figure: its own preferred width grown to the atlas's
     wide-figure width, but only ever at a scale the engine paints square */
  const wideTop = await largestWithin(key, f.figure, 4, 260, A.figureClasses.widePreferredWidth);
  const narrowTop = await boxForWidth(key, f.figure, A.surfaces.narrow);
  FIG[key] = { cls, sub, pref: { w: pref.w, h: pref.h, s: +sPref.toFixed(1), x: pref.x, y: pref.y,
      ratio: pref.ratio, html: pref.html },
    wide: wideTop ? { w: wideTop.box.w, h: wideTop.box.h, s: +wideTop.s.toFixed(1), html: wideTop.box.html,
      x: wideTop.box.x, y: wideTop.box.y, ratio: wideTop.box.ratio } : null,
    narrow: narrowTop ? { w: narrowTop.box.w, h: narrowTop.box.h, s: +narrowTop.s.toFixed(1),
      html: narrowTop.box.html, ratio: narrowTop.box.ratio } : null,
    html: pref.html };
  /* CONTROL · A BOX SOLVED FOR A WIDTH MUST USE IT. largestForWidth promises the largest scale that
     fits the cap; a box that comes back far below the cap means the search FAILED and quietly
     returned a small early candidate. Nothing else catches that — a 169px plane in a 169px region
     still paints at ratio 1.000 and screenshots as a graph. */
  if (!narrowTop) throw new Error(`${key}: no box at all fits the ${A.surfaces.narrow}px narrow surface`);
  if (narrowTop.box.w < 0.9 * A.surfaces.narrow)
    throw new Error(`${key}: the narrow box solved to ${narrowTop.box.w}x${narrowTop.box.h} against a `
      + `${A.surfaces.narrow}px cap — the search collapsed rather than converged`);
  if (!square(narrowTop.box))
    throw new Error(`${key}: no height at ${A.surfaces.narrow}px paints this domain at equal unit scale `
      + `(best ${narrowTop.box.w}x${narrowTop.box.h} at ${narrowTop.box.ratio})`);
  console.log(`  ${key.padEnd(11)} ${String(ys / xs).slice(0, 4).padEnd(5)} aspect → ${cls.padEnd(9)} → ${sub.padEnd(5)} `
    + `· preferred ${pref.w}×${pref.h} @${sPref.toFixed(1)} px/unit (${pref.ratio})`
    + (FIG[key].wide ? ` · wide ${wideTop.box.w}×${wideTop.box.h}` : '')
    + (FIG[key].narrow ? ` · narrow ${narrowTop.box.w}×${narrowTop.box.h}` : ''));
}

/* ══ RENDER ════════════════════════════════════════════════════════════════════════════════════ */
const tokens = (surface, pad) => `:root{
  --at-surface:${surface}px; --at-pad:${pad}px; --at-gap:${M.gap}px;
  --at-m-flow:${M.flow}px; --at-m-solution:${M.solution}px; --at-m-interp:${M.interpretation}px;
  --at-m-case:${M.case}px; --at-m-synthesis:${M.synthesis}px;
  --at-split-prompt:${M.splitPromptPct}; --at-split-prompt-max:${M.splitPromptMax}px;
  --at-split-solution-max:${M.splitSolutionMax}px;
  --at-pane-h:${M.paneH}px; --at-pane-min-h:${M.paneMinH}px;
}`;
const readFrag = (f) => fs.readFileSync(path.join(SRC, f + '.html'), 'utf8')
  .replace(/\{\{PART:([a-z0-9_-]+)\}\}/gi, (m, p) => fs.readFileSync(path.join(SRC, p + '.part'), 'utf8'));

const skin = (w, h, html) => `<div class="mx-part" data-mx-part="figure" data-fig-viewport `
  + `style="position:relative;width:${w}px;height:${h}px"><div class="mx-figstage">`
  + `<div class="mx-figskin tp-slide">${html}</div></div></div>`;

const payloads = {}, identity = {}, REPORT = [];

const shot = async (name, entry, state, surfaceName) => {
  const surface = A.surfaces[surfaceName], pad = surfaceName === 'narrow' ? A.surfacePad.narrow : A.surfacePad.desktop;
  let body = readFrag(entry.frag);

  /* THE FIGURE'S SUBDESIGN IS ITS OWN MEDIA GEOMETRY, not the prose around it. */
  const used = [];
  body = body.replace(/\{\{FIG:([a-z0-9-]+)\}\}/gi, (m, key) => {
    const f = FIG[key];
    if (!f) throw new Error(`${name}: no figure ${key}`);
    used.push(key);
    /* Which box: the narrow surface gets a box SOLVED for it; a wide-class figure in its `down`
       subdesign gets the atlas's wide width; otherwise the plane's own preferred legible size.
       A box is never scaled after painting. */
    const box = surfaceName === 'narrow' ? (f.narrow || f.pref) : (f.sub === 'down' && f.wide) ? f.wide : f.pref;
    if (box.w > surface + 1) throw new Error(`${name}: ${key} needs ${box.w}px in a ${surface}px region`);
    return skin(box.w, box.h, box.html);
  });
  for (const key of used)
    body = body.split(`data-fig="${key}"`).join(`data-fig="${key}" data-fig-class="${FIG[key].cls}" data-sub="${FIG[key].sub}"`);

  const doc = `<!doctype html><html data-theme="mathematics"><head><meta charset="utf-8"><style>
${APP_CSS}
</style><style>
${tokens(surface, pad)}
${CSS_KIT}
</style></head><body class="mx${surfaceName === 'narrow' ? ' at-narrow' : ''}"><div class="at-page">
<div class="at-cap"><span class="at-tpl">${entry.demo} · ${surfaceName}${state.k ? ' · tab: ' + state.k : ''}</span>${entry.c}</div>
<div class="at-surface">${body}</div>
<div class="at-note">${entry.demo} — authored, never inferred. Responsive state from the ${surface}px surface alone; the disclosure is the author's and is identical at every width. Height is auto; the page scrolls.</div>
</div></body></html>`;

  const p = await browser.newPage({ viewport: { width: surface + 2 * pad + 120, height: 900 }, deviceScaleFactor: 2 });
  const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
  await p.setContent(doc, { waitUntil: 'load' });

  /* ── the only two things stamped at build time, and neither reads content ────────────────────
     1 · RESPONSIVE STATE, per template, from the surface width against that template's own switch
         point. Every other input — height, occupancy, how much fits — is absent by construction.
     2 · THE AUTHORED TAB SELECTION from pack.json. The bar is rendered whole; this only says which
         panel is open. Nothing here can add, remove or reorder a tab. */
  const stamped = await p.evaluate(({ SWITCH, surface, sel }) => {
    const surf = document.querySelector('.at-surface');
    for (const el of surf.querySelectorAll('[data-tpl]')) {
      const at = SWITCH[el.getAttribute('data-tpl')];
      el.setAttribute('data-state', at && surface < at ? 'narrow' : 'wide');
    }
    for (const el of surf.querySelectorAll('[data-slot="cases"]')) {
      const owner = el.parentElement.closest('[data-state]');
      el.setAttribute('data-state', owner ? owner.getAttribute('data-state') : 'wide');
    }
    const groups = [].slice.call(surf.querySelectorAll('[data-tabs]'));
    const missing = [];
    for (const g of groups) {
      const nm = g.getAttribute('data-tabs'), active = sel[nm];
      if (!active) { missing.push(nm); continue; }
      g.setAttribute('data-active', active);
      for (const b of g.querySelectorAll(':scope > .at-tabbar > .at-tab')) {
        const on = b.getAttribute('data-tab') === active;
        if (on) b.setAttribute('data-on', ''); else b.removeAttribute('data-on');
        b.setAttribute('aria-selected', on ? 'true' : 'false');
      }
      for (const q of g.querySelectorAll(':scope > .at-panel')) {
        if (q.getAttribute('data-panel') === active) q.setAttribute('data-shown', ''); else q.removeAttribute('data-shown');
      }
    }
    return { groups: groups.length, missing, extraSel: Object.keys(sel).filter((k) => !groups.some((g) => g.getAttribute('data-tabs') === k)) };
  }, { SWITCH, surface, sel: state.tabs || {} });
  if (stamped.missing.length) throw new Error(`${name}: tab group(s) ${stamped.missing.join(', ')} were never given an authored selection`);
  if (stamped.extraSel.length) throw new Error(`${name}: pack.json selects tab group(s) ${stamped.extraSel.join(', ')} that this page does not have`);
  await p.waitForTimeout(420);

  const measured = await p.evaluate(({ flow }) => {
    const surf = document.querySelector('.at-surface');
    const vis = (el) => el.getClientRects().length > 0;
    const seen = [];
    const walk = document.createTreeWalker(surf, NodeFilter.SHOW_TEXT);
    for (let n = walk.nextNode(); n; n = walk.nextNode()) {
      const el = n.parentElement;
      if (!el || el.closest('svg') || !vis(el)) continue;
      const t = n.nodeValue.replace(/\s+/g, ' ').trim();
      if (t) seen.push(t);
    }
    /* THE AUTHORED TAB STRUCTURE, read back out of the DOM: nesting depth, group name, every label
       in order, every panel in order — visible or not. This is the string the hard rule protects. */
    const tabSig = [].slice.call(surf.querySelectorAll('[data-tabs]')).map((t) => {
      let depth = 0;
      for (let q = t.parentElement; q && q !== surf; q = q.parentElement) if (q.hasAttribute('data-tabs')) depth++;
      const labels = [].slice.call(t.querySelectorAll(':scope > .at-tabbar > .at-tab'))
        .map((b) => b.textContent.replace(/\s+/g, ' ').trim());
      const panels = [].slice.call(t.querySelectorAll(':scope > .at-panel')).map((b) => b.getAttribute('data-panel'));
      return `${depth}:${t.getAttribute('data-tabs')}[${labels.join('|')}]{${panels.join('|')}}`;
    }).join(' ; ');
    const panels = [].slice.call(surf.querySelectorAll('[data-panel]'))
      .map((q) => ({ id: q.getAttribute('data-panel'), chars: q.textContent.replace(/\s+/g, ' ').trim().length,
        shown: q.hasAttribute('data-shown') }));
    const bars = [].slice.call(surf.querySelectorAll('[data-tabs]')).map((t) => ({
      name: t.getAttribute('data-tabs'),
      on: t.querySelectorAll(':scope > .at-tabbar > .at-tab[data-on]').length,
      shown: t.querySelectorAll(':scope > .at-panel[data-shown]').length,
      /* a nested group inside a closed panel is legitimately not rendered — the bar must be present
         wherever its group is on screen, which is a different claim from "always painted" */
      groupVisible: vis(t), barVisible: vis(t.querySelector(':scope > .at-tabbar')) }));

    const figs = [].slice.call(surf.querySelectorAll('[data-slot="figure"]')).filter(vis).map((r) => {
      const q = r.querySelector('[data-mx-part="figure"]');
      const svg = r.querySelector('.tp-fig-svg');
      let ratio = null;
      if (svg) {
        const vb = (svg.getAttribute('viewBox') || '0 0 1 1').split(/\s+/).map(Number);
        const rect = svg.getBoundingClientRect();
        const labs = [].slice.call(svg.querySelectorAll('.tp-fig-ticklabel'));
        const val = (t) => parseFloat(t.textContent.replace('−', '-'));
        const per = (a, at) => { const z = labs.filter((t) => t.getAttribute('text-anchor') === a)
            .map((t) => ({ v: val(t), px: +t.getAttribute(at) })).filter((o) => isFinite(o.v));
          if (z.length < 2) return null; z.sort((m2, n2) => m2.v - n2.v);
          const d = z[z.length - 1].v - z[0].v; return d ? Math.abs((z[z.length - 1].px - z[0].px) / d) : null; };
        const ux = per('middle', 'x'), uy = per('end', 'y');
        if (ux && uy) ratio = +((ux * rect.width / vb[2]) / (uy * rect.height / vb[3])).toFixed(3);
      }
      return { region: Math.round(r.getBoundingClientRect().width), ratio,
        plane: q ? Math.round(q.getBoundingClientRect().width) : null };
    });

    /* SCROLL, read from computed style rather than from the attribute — the attribute is a claim and
       the computed style is what the page actually does. */
    const scrollers = { y: [], x: [] };
    for (const el of surf.querySelectorAll('*')) {
      if (!vis(el)) continue;
      const cs = getComputedStyle(el);
      /* `overflow-x:auto` with `overflow-y:visible` is not a state CSS has: the spec coerces the
         visible one to auto. So every local-x region also computes overflow-y:auto, and reading the
         computed value alone would report a vertical scroller wherever a wide equation sits. It is
         still checked — below, as "a local-x region must not ALSO clip vertically". */
      const declared = el.getAttribute('data-scroll');
      if (/^(auto|scroll)$/.test(cs.overflowY) && declared !== 'local-x') scrollers.y.push({
        tag: el.tagName.toLowerCase(), declared,
        inPane: !!el.closest('[data-tpl="scroll.persistent-pane"]'),
        live: el.scrollHeight > el.clientHeight + 1,
        xLive: el.scrollWidth > el.clientWidth + 1,
        prose: [].slice.call(el.querySelectorAll('[data-slot]')).map((n) => n.getAttribute('data-slot')) });
      /* and the same coercion in the other direction — a local-y pane computes overflow-x:auto */
      if (/^(auto|scroll)$/.test(cs.overflowX) && declared !== 'local-y') scrollers.x.push({ declared,
        what: el.textContent.replace(/\s+/g, ' ').trim().slice(0, 40),
        w: Math.round(el.getBoundingClientRect().width), sw: el.scrollWidth,
        yLive: el.scrollHeight > el.clientHeight + 1,
        parent: Math.round(el.parentElement.getBoundingClientRect().width) });
    }
    /* PROSE MEASURE. Every visible paragraph of prose inside the teaching surface, against the flow
       measure. Mathematics is excluded — a line of it is not prose and may overflow its own region. */
    const wide = [].slice.call(surf.querySelectorAll('p, .at-st, [data-slot="answer"]'))
      /* a LABEL is not prose — it is a two-word caption belonging to its region, and it is as wide as
         the region it labels (a 896px `down` figure included). Mathematics is not prose either. */
      .filter((n) => vis(n) && !n.closest('[data-scroll="local-x"]')
        && !n.classList.contains('at-sm') && !n.classList.contains('at-lab'))
      .map((n) => ({ w: Math.round(n.getBoundingClientRect().width), t: n.textContent.slice(0, 46) }))
      .filter((n) => n.w > flow + 1);

    const frame = ['html', 'body', '.at-page', '.at-surface'].map((s) => {
      const el = document.querySelector(s), cs = getComputedStyle(el);
      return { s, maxHeight: cs.maxHeight, overflowY: cs.overflowY, height: cs.height };
    });
    const inline = [].slice.call(surf.querySelectorAll('[data-tpl],[data-slot],[data-tabs],[data-scroll],[class^="at-"]'))
      .filter((e) => e.style.width || e.style.gridTemplateColumns || e.style.height || e.style.maxHeight)
      .filter((e) => !e.hasAttribute('data-fig-viewport'))
      .map((e) => e.tagName + '.' + e.className + ':' + e.getAttribute('style'));
    return { payload: seen.join(' '), tabSig, panels, bars, figs, scrollers, wide, frame, inline,
      tpls: [].slice.call(surf.querySelectorAll('[data-tpl]')).map((n) => n.getAttribute('data-tpl')),
      subs: [].slice.call(surf.querySelectorAll('[data-tpl="visual.interpretation"]')).map((n) => n.getAttribute('data-sub')),
      states: [].slice.call(surf.querySelectorAll('[data-tpl]')).map((n) => n.getAttribute('data-state')),
      docH: Math.round(document.documentElement.scrollHeight),
      docW: Math.round(document.documentElement.scrollWidth),
      docCW: Math.round(document.documentElement.clientWidth),
      slots: [].slice.call(surf.querySelectorAll('[data-slot]')).filter(vis).map((n) => n.getAttribute('data-slot')).join(',') };
  }, { flow: M.flow });

  const bb = await (await p.$('.at-page')).boundingBox();
  await p.setViewportSize({ width: surface + 2 * pad + 120, height: Math.ceil(bb.height) + 8 });
  await p.waitForTimeout(180);
  await (await p.$('.at-page')).screenshot({ path: path.join(OUT, name + '.png') });
  if (errs.length) throw new Error(`${name}: ${errs[0]}`);
  await p.close();
  return { measured, surface, surfaceName, used };
};

/* ── the controls ─────────────────────────────────────────────────────────────────────────────── */
function verify(name, entry, state, r) {
  const m = r.measured, narrow = r.surfaceName === 'narrow';
  /* CONTROL · COMPOSITION IDENTITY. The whole point of the reset: a payload may make a page taller;
     it may never change which compositions the page is made of, and neither may a width. */
  const got = m.tpls.join(', ');
  if (got !== entry.tpls.join(', '))
    throw new Error(`${name}: the page is [${got}] but pack.json authored [${entry.tpls.join(', ')}]`);
  /* CONTROL · THE HARD RULE. The authored tab structure — count, labels, panels, nesting — read back
     out of the DOM and compared to the signature in pack.json, character for character, at every
     width and in every tab state. This is what stands between disclosure and resolver behaviour. */
  const wantSig = entry.tabSig || '';
  if (m.tabSig !== wantSig)
    throw new Error(`${name}: the tab structure is\n    ${m.tabSig || '(none)'}\n  but pack.json authored\n    ${wantSig || '(none)'}`);
  for (const b of m.bars) {
    if (b.groupVisible && !b.barVisible)
      throw new Error(`${name}: the ${b.name} tab bar is not rendered at this width`);
    if (b.on !== 1) throw new Error(`${name}: the ${b.name} bar has ${b.on} tabs marked current`);
    if (b.shown !== 1) throw new Error(`${name}: the ${b.name} group shows ${b.shown} panels`);
  }
  /* CONTROL · A TAB HIDES CONTENT, IT DOES NOT REPLACE IT. Every panel carries its material in the
     DOM whether or not it is the open one — otherwise "the structure is identical" is a claim about
     an empty box. */
  for (const q of m.panels)
    if (q.chars < 40) throw new Error(`${name}: panel ${q.id} holds ${q.chars} characters — a tab must hide content, not omit it`);
  /* CONTROL · NO INLINE GEOMETRY outside the figure viewport. Nothing here is resolved at runtime. */
  if (m.inline.length)
    throw new Error(`${name}: inline geometry on ${m.inline.length} element(s) — ${m.inline[0]}`);
  /* CONTROL · A FIGURE REGION CONTAINS A PAINTED PLANE, and is exactly as wide as it. The second
     half is about unowned space; the first is about the plane being there at all — a region holding
     the literal text "undefined" still screenshots as a page. */
  for (const f of m.figs) {
    if (f.plane == null) throw new Error(`${name}: a figure region contains no painted plane`);
    if (f.region - f.plane > 1) throw new Error(`${name}: a figure region is ${f.region}px around a ${f.plane}px plane`);
    if (f.ratio != null && Math.abs(f.ratio - 1) > 0.01)
      throw new Error(`${name}: a plane painted at ${f.ratio} — one x-unit and one y-unit are not the same length`);
  }
  /* CONTROL · PROSE IS MEASURED. Not "declares a maximum and honours it" — that is vacuous where no
     maximum is declared, which is exactly how a repeated child came to run the full canvas. */
  if (m.wide.length)
    throw new Error(`${name}: ${m.wide.length} paragraph(s) run past the ${M.flow}px measure — ${m.wide[0].w}px: “${m.wide[0].t}…”`);
  /* CONTROL · THE PAGE NEVER SCROLLS SIDEWAYS. Local-x is local or it is a defect. */
  if (m.docW > m.docCW + 1)
    throw new Error(`${name}: the page itself scrolls sideways — ${m.docW}px of content in ${m.docCW}px`);
  /* CONTROL · HEIGHT IS NOT A CONSTRAINT. Nothing in the frame bounds or clips the page. */
  for (const f of m.frame) {
    if (f.maxHeight !== 'none') throw new Error(`${name}: ${f.s} declares max-height ${f.maxHeight}`);
    if (!/^(visible)$/.test(f.overflowY)) throw new Error(`${name}: ${f.s} has overflow-y ${f.overflowY}`);
  }
  /* CONTROL · LOCAL-Y IS A WORKSPACE BEHAVIOUR AND NOTHING ELSE. */
  const BANNED = ['question', 'steps', 'solution', 'answer', 'synthesis', 'interpretation'];
  for (const s of m.scrollers.y) {
    if (s.declared !== 'local-y')
      throw new Error(`${name}: a <${s.tag}> scrolls vertically without being declared a local-y pane`);
    if (!s.inPane)
      throw new Error(`${name}: a local-y pane sits outside a persistent-pane workspace`);
    if (!s.live)
      throw new Error(`${name}: a local-y pane does not actually overflow — the proof is inert`);
    if (s.xLive) throw new Error(`${name}: a local-y pane is clipping HORIZONTALLY as well — the coerced `
      + `overflow-x has become a real one`);
    const bad = s.prose.filter((x) => BANNED.includes(x));
    if (bad.length)
      throw new Error(`${name}: ${bad.join(', ')} sits inside a local-y pane — teaching prose is never bounded to control height`);
  }
  const wantY = !!entry.localY && !narrow;
  if (wantY && !m.scrollers.y.length) throw new Error(`${name}: the persistent pane does not scroll — the proof is inert`);
  if (!wantY && m.scrollers.y.length) throw new Error(`${name}: ${m.scrollers.y.length} local-y pane(s) on a page that authored none`);
  /* CONTROL · LOCAL-X IS LOCAL, AND THE PROOF IS LIVE. */
  for (const s of m.scrollers.x) {
    if (s.declared !== 'local-x') throw new Error(`${name}: a region scrolls horizontally without being declared local-x`);
    if (s.sw <= s.w + 1) throw new Error(`${name}: an over-wide region did not overflow — the proof is `
      + `inert. ${s.sw}px of content in ${s.w}px: “${s.what}…”`);
    if (s.w > s.parent + 1) throw new Error(`${name}: an over-wide region widened the region it is in`);
    if (s.yLive) throw new Error(`${name}: a local-x region is clipping VERTICALLY as well — the coerced `
      + `overflow-y has become a real one, and content is hidden inside it`);
  }
  if ((entry.localX || []).includes(state.k || '') && !m.scrollers.x.length)
    throw new Error(`${name}: no live local-x region — the indivisible-material proof is inert`);
  if (entry.minHeight && m.docH < entry.minHeight)
    throw new Error(`${name}: ${m.docH}px tall, but this page exists to prove ${entry.minHeight}px is fine`);
  return m;
}

console.log('\nrendering the atlas');
for (const entry of SELECTED) {
  for (const state of (entry.states || [{ k: '', tabs: {} }])) {
    for (const surfaceName of ['desktop', 'narrow']) {
      const name = `${entry.n}-${entry.demo.replace(/\./g, '-')}${entry.adv ? '-adv' : ''}`
        + `${state.k ? '-' + state.k : ''}-${surfaceName}`;
      const r = await shot(name, entry, state, surfaceName);
      const m = verify(name, entry, state, r);
      /* CONTROL · SAME PAYLOAD AT EVERY WIDTH, and the same slots in the same order. A layout proof
         that shows different material at two widths proves nothing about either. */
      const pk = `${entry.frag}|${state.k}`;
      if (payloads[pk] && payloads[pk].payload !== m.payload) {
        const a = payloads[pk].payload, b = m.payload;
        let i = 0; while (i < a.length && i < b.length && a[i] === b[i]) i++;
        throw new Error(`${name}: the payload differs from ${payloads[pk].name} — a proof must carry the same `
          + `content at every width.\n  …${a.slice(Math.max(0, i - 40), i + 80)}\n  …${b.slice(Math.max(0, i - 40), i + 80)}`);
      }
      if (payloads[pk] && payloads[pk].slots !== m.slots)
        throw new Error(`${name}: the slot sequence differs from ${payloads[pk].name}`);
      if (!payloads[pk]) payloads[pk] = { name, payload: m.payload, slots: m.slots };
      /* CONTROL · THE STRUCTURE IS THE SAME IN EVERY TAB STATE TOO. Opening a different tab must not
         change the compositions on the page or the bar above them. */
      const fk = entry.frag;
      if (identity[fk] && identity[fk].tabSig !== m.tabSig)
        throw new Error(`${name}: the tab structure changed between tab states (vs ${identity[fk].name})`);
      if (identity[fk] && identity[fk].tpls !== m.tpls.join(', '))
        throw new Error(`${name}: the compositions changed between tab states (vs ${identity[fk].name})`);
      if (!identity[fk]) identity[fk] = { name, tabSig: m.tabSig, tpls: m.tpls.join(', ') };

      REPORT.push({ image: name, demo: entry.demo, adv: !!entry.adv, surface: r.surface, tab: state.k || null,
        compositions: m.tpls, states: m.states, subdesigns: m.subs, tabStructure: m.tabSig || null,
        pageHeight: m.docH, localY: m.scrollers.y.length, localX: m.scrollers.x.length,
        figures: r.used.map((k) => `${k}:${FIG[k].cls}→${FIG[k].sub}`) });
      console.log(`  ${name.padEnd(46)} ${String(r.surface).padStart(4)}px  page ${String(m.docH).padStart(5)}px`
        + `  y${m.scrollers.y.length} x${m.scrollers.x.length}  ${r.used.map((k) => FIG[k].cls + '→' + FIG[k].sub).join(' ')}`);
    }
  }
}

await figPage.close(); await browser.close(); server.close();

console.log('\nIDENTITY — authored, and invariant across width, payload and tab state');
for (const d of [...new Set(SELECTED.map((e) => e.demo))]) {
  const rows = REPORT.filter((r) => r.demo === d);
  const h = rows.map((r) => r.pageHeight);
  const sig = [...new Set(rows.map((r) => r.tabStructure || '—'))];
  console.log(`  ${d.padEnd(24)} ${String(rows.length).padStart(2)} renders · page ${Math.min(...h)}–${Math.max(...h)}px`
    + ` (never a constraint) · tabs ${sig.length === 1 ? 'identical' : 'DRIFTED'}`);
}
if (ONLY) console.log('\nATLAS_ONLY — partial run, images for other designs are stale');
else fs.writeFileSync(path.join(OUT, 'atlas-report.json'), JSON.stringify(REPORT, null, 2));
console.log('\nwrote ' + path.relative(root, OUT) + ` — ${REPORT.length} renders, ${SELECTED.length} reference designs`);
