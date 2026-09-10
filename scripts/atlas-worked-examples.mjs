#!/usr/bin/env node
// THE WORKED-EXAMPLE ATLAS — six deliberately designed composition templates, rendered for approval.
//
//   node scripts/atlas-worked-examples.mjs [outDir]
//
// THERE IS NO RESOLVER HERE, and that is the point. A template's identity is authored; this build
// only renders one. Nothing measures content in order to choose a composition — no occupancy, no
// growth weights, no height matching, no scoring across candidates, no attempt to fill the available
// space, and no assumption that a page ought to avoid scrolling. The composition resolver that did
// all of those things is retained as research evidence at docs/mockups/compositions/ and its
// layout-selection logic must not be ported into the app.
//
// What is still measured, because it is a property of the material rather than a design decision:
//
//   · a figure's intrinsic legible size, searched by asking the engine to paint and scoring the
//     painted result — px per authored x-unit against px per y-unit;
//   · a figure's MEDIA GEOMETRY CLASS (portrait · balanced · landscape · wide), which is a design
//     input a template maps to an approved subdesign — never a size, and never derived from the
//     surrounding prose;
//   · overflow, unowned space inside a region, and payload identity across widths, all as controls.
//
// The controls that matter most in this pass assert what the reset is for: `data-tpl` is identical
// at every width and for every adversarial payload. A payload may make a page taller. It may never
// change which template the page is.
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
const M = A.measures, FLOOR = { w: 340, h: 255 }, BOUND = 720;

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
/* the largest scale whose BOX WIDTH fits a cap — used to solve a plane for the narrow surface, so a
   figure is always painted at a box the engine renders square rather than a larger one squashed into
   place. (Reusing a pre-painted box at a smaller size distorts it: the engine's label gutters are a
   near-constant number of px and do not scale with the plot.) */
async function largestForWidth(key, fig, lo, hi, capW) {
  let best = null;
  for (let i = 0; i < 9 && hi - lo > 0.25; i++) {
    const mid = (lo + hi) / 2, b = await boxForScale(key, fig, mid);
    if (b && b.w <= capW) { best = { s: mid, box: b }; lo = mid; } else hi = mid;
  }
  return best;
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
const SUBDESIGN = { portrait: 'side', balanced: 'side', landscape: 'down', wide: 'down' };

console.log('\nfigures — intrinsic legible size and media-geometry class');
const FIG = {};
for (const [key, f] of Object.entries(FIGS)) {
  if (key.startsWith('_')) continue;
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
  const narrowW = A.surfaces.narrow - 2 * A.surfacePad.narrow + 2 * A.surfacePad.narrow;
  const narrowTop = await largestForWidth(key, f.figure, 4, Math.max(5, sPref), A.surfaces.narrow);
  FIG[key] = { cls, sub, pref: { w: pref.w, h: pref.h, s: +sPref.toFixed(1), x: pref.x, y: pref.y,
      ratio: pref.ratio, html: pref.html },
    wide: wideTop ? { w: wideTop.box.w, h: wideTop.box.h, s: +wideTop.s.toFixed(1), html: wideTop.box.html,
      x: wideTop.box.x, y: wideTop.box.y, ratio: wideTop.box.ratio } : null,
    narrow: narrowTop ? { w: narrowTop.box.w, h: narrowTop.box.h, s: +narrowTop.s.toFixed(1),
      html: narrowTop.box.html, ratio: narrowTop.box.ratio } : null,
    html: pref.html };
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
}`;
const readFrag = (f) => fs.readFileSync(path.join(SRC, f + '.html'), 'utf8')
  .replace(/\{\{PART:([a-z0-9_-]+)\}\}/gi, (m, p) => fs.readFileSync(path.join(SRC, p + '.part'), 'utf8'));

const skin = (w, h, html) => `<div class="mx-part" data-mx-part="figure" data-fig-viewport `
  + `style="position:relative;width:${w}px;height:${h}px"><div class="mx-figstage">`
  + `<div class="mx-figskin tp-slide">${html}</div></div></div>`;

const payloads = {}, identity = {}, REPORT = [];

const shot = async (name, entry, surfaceName) => {
  const surface = A.surfaces[surfaceName], pad = surfaceName === 'narrow' ? A.surfacePad.narrow : A.surfacePad.desktop;
  const tpl = A.templates[entry.tpl];
  /* THE RESPONSIVE STATE IS PRESCRIBED BY THE TEMPLATE, from the surface width alone. It is not
     searched, and it can only rearrange this template — never select another. */
  const state = (tpl.switchAt && surface < tpl.switchAt) ? 'narrow' : 'wide';
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
    const box = surfaceName === 'narrow' ? (f.narrow || f.pref)
      : (f.sub === 'down' && state === 'wide' && f.wide) ? f.wide : f.pref;
    if (box.w > surface + 1) throw new Error(`${name}: ${key} needs ${box.w}px in a ${surface}px region`);
    return skin(box.w, box.h, box.html);
  });
  for (const key of used) {
    const f = FIG[key];
    body = body.split(`data-fig="${key}"`).join(`data-fig="${key}" data-fig-class="${f.cls}" `
      + `data-sub="${f.sub}" data-state="${state}"`);
  }
  body = body.replace(/(<div data-slot="cases")/g, `$1 data-state="${state}"`);
  body = body.replace(/(<article data-tpl="[^"]+")/g, `$1 data-state="${state}"`);

  const doc = `<!doctype html><html data-theme="mathematics"><head><meta charset="utf-8"><style>
${APP_CSS}
</style><style>
${tokens(surface, pad)}
${CSS_KIT}
</style></head><body class="mx${surfaceName === 'narrow' ? ' at-narrow' : ''}"><div class="at-page">
<div class="at-cap"><span class="at-tpl">${entry.tpl} · ${surfaceName} · ${state}</span>${entry.c}</div>
<div class="at-surface">${body}</div>
<div class="at-note">Template <b>${entry.tpl}</b> — authored, never inferred. Responsive state <b>${state}</b>${tpl.switchAt ? ` (prescribed below ${tpl.switchAt}px)` : ' (this template has no state change)'}. Height is auto; the page scrolls.</div>
</div></body></html>`;

  const p = await browser.newPage({ viewport: { width: surface + 2 * pad + 120, height: 900 }, deviceScaleFactor: 2 });
  const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
  await p.setContent(doc, { waitUntil: 'load' });
  await p.waitForTimeout(420);

  const measured = await p.evaluate(() => {
    const surf = document.querySelector('.at-surface');
    const seen = [];
    const walk = document.createTreeWalker(surf, NodeFilter.SHOW_TEXT);
    for (let n = walk.nextNode(); n; n = walk.nextNode()) {
      const el = n.parentElement;
      if (!el || el.closest('svg')) continue;
      if (!el.getClientRects().length) continue;
      const t = n.nodeValue.replace(/\s+/g, ' ').trim();
      if (t) seen.push(t);
    }
    const art = surf.querySelector('[data-tpl]');
    const figs = [].slice.call(surf.querySelectorAll('[data-slot="figure"]')).map((r) => {
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
        plane: q ? Math.round(q.getBoundingClientRect().width) : null,
        sub: (r.closest('[data-sub]') || {}).getAttribute ? r.closest('[data-sub]').getAttribute('data-sub') : null };
    });
    const scrollers = [].slice.call(surf.querySelectorAll('.at-scroll')).map((s) => ({
      w: Math.round(s.getBoundingClientRect().width), sw: s.scrollWidth,
      parent: Math.round(s.parentElement.getBoundingClientRect().width) }));
    /* every prose region's rendered width, against the measure its template declares */
    const measured = [].slice.call(surf.querySelectorAll('[data-slot]')).map((n) => ({
      slot: n.getAttribute('data-slot'),
      w: Math.round(n.getBoundingClientRect().width),
      max: getComputedStyle(n).maxWidth }));
    const inline = [].slice.call(surf.querySelectorAll('[data-tpl],[data-slot],[class^="at-"]'))
      .filter((e) => e.style.width || e.style.gridTemplateColumns || e.style.height)
      .filter((e) => !e.hasAttribute('data-fig-viewport'))
      .map((e) => e.tagName + '.' + e.className + ':' + e.getAttribute('style'));
    return { payload: seen.join(' '), tpl: art ? art.getAttribute('data-tpl') : null,
      state: art ? art.getAttribute('data-state') : null,
      surfaceW: Math.round(surf.clientWidth - parseFloat(getComputedStyle(surf).paddingLeft) * 2),
      regions: measured,
      docH: Math.round(document.documentElement.scrollHeight), figs, scrollers, inline,
      slots: [].slice.call(surf.querySelectorAll('[data-slot]')).map((n) => n.getAttribute('data-slot')).join(',') };
  });

  const el = await p.$('.at-page');
  const bb = await el.boundingBox();
  await p.setViewportSize({ width: surface + 2 * pad + 120, height: Math.ceil(bb.height) + 8 });
  await p.waitForTimeout(180);
  await (await p.$('.at-page')).screenshot({ path: path.join(OUT, name + '.png') });
  if (errs.length) throw new Error(`${name}: ${errs[0]}`);
  await p.close();
  return { measured, state, surface, used };
};

/* ── the controls ─────────────────────────────────────────────────────────────────────────────── */
function verify(name, entry, r) {
  const m = r.measured;
  /* CONTROL · TEMPLATE IDENTITY. The whole point of the reset: a payload may make a page taller; it
     may never change which template the page is, and neither may a width. */
  if (m.tpl !== entry.tpl)
    throw new Error(`${name}: rendered as ${m.tpl} but the JSON authored ${entry.tpl}`);
  const key = entry.tpl;
  if (identity[key] && identity[key].tpl !== m.tpl)
    throw new Error(`${name}: template identity drifted from ${identity[key].name}`);
  identity[key] = { name, tpl: m.tpl };
  /* CONTROL · NO INLINE GEOMETRY outside the figure viewport. Nothing here is resolved at runtime. */
  if (m.inline.length)
    throw new Error(`${name}: inline geometry on ${m.inline.length} element(s) — ${m.inline[0]}`);
  /* CONTROL · A FIGURE REGION CONTAINS A PAINTED PLANE, and is exactly as wide as it. The second
     half is about unowned space; the first is about the plane being there at all — a region holding
     the literal text "undefined" still screenshots as a page, and the width check skips it because
     there is no plane to measure. */
  for (const f of m.figs) {
    if (f.plane == null)
      throw new Error(`${name}: a figure region contains no painted plane`);
    if (f.region - f.plane > 1)
      throw new Error(`${name}: a figure region is ${f.region}px around a ${f.plane}px plane`);
    if (f.ratio != null && Math.abs(f.ratio - 1) > 0.01)
      throw new Error(`${name}: a plane painted at ${f.ratio} — one x-unit and one y-unit are not the same length`);
  }
  /* CONTROL · CONTROLLED MEASURE. A region that declares a maximum must honour it. Without this the
     "controlled measure" invariant is an assertion in a document rather than a property of the page,
     and a stacked example quietly stretches its prose across the whole canvas. */
  for (const g of m.regions) {
    if (!/px$/.test(g.max)) continue;
    const cap = parseFloat(g.max);
    if (g.w > cap + 1)
      throw new Error(`${name}: the ${g.slot} region is ${g.w}px against its declared ${cap}px measure`);
  }
  /* CONTROL · OVERFLOW IS LOCAL. An unsettable line scrolls inside its own region and does not
     widen the region it is in. */
  for (const s of m.scrollers) {
    if (s.sw <= s.w + 1) throw new Error(`${name}: the over-wide line did not overflow — the proof is inert`);
    if (s.w > s.parent + 1) throw new Error(`${name}: an over-wide line widened its region`);
  }
  return m;
}

console.log('\nrendering the atlas');
for (const entry of PACK) {
  for (const surfaceName of ['desktop', 'narrow']) {
    const name = `${entry.n}-${entry.tpl.replace('.', '-')}${entry.adv ? '-adv' : ''}-${surfaceName}`;
    const r = await shot(name, entry, surfaceName);
    const m = verify(name, entry, r);
    const pk = entry.frag;
    if (payloads[pk] && payloads[pk].payload !== m.payload) {
      const a = payloads[pk].payload, b = m.payload;
      let i = 0; while (i < a.length && i < b.length && a[i] === b[i]) i++;
      throw new Error(`${name}: the payload differs from ${payloads[pk].name} — a template proof must carry `
        + `the same content at every width.\n  …${a.slice(Math.max(0, i - 40), i + 80)}\n  …${b.slice(Math.max(0, i - 40), i + 80)}`);
    }
    if (payloads[pk] && payloads[pk].slots !== m.slots)
      throw new Error(`${name}: the slot sequence differs from ${payloads[pk].name}`);
    if (!payloads[pk]) payloads[pk] = { name, payload: m.payload, slots: m.slots };
    REPORT.push({ image: name, tpl: entry.tpl, adv: !!entry.adv, surface: r.surface, state: r.state,
      pageHeight: m.docH, figures: r.used.map((k) => `${k}:${FIG[k].cls}→${FIG[k].sub}`) });
    console.log(`  ${name.padEnd(42)} ${String(r.surface).padStart(4)}px  ${r.state.padEnd(6)} `
      + `page ${String(m.docH).padStart(5)}px  ${r.used.map((k) => FIG[k].cls + '→' + FIG[k].sub).join(' ')}`);
  }
}

await figPage.close(); await browser.close(); server.close();

console.log('\nTEMPLATE IDENTITY — authored, and invariant across width and payload');
for (const t of Object.keys(A.templates)) {
  const rows = REPORT.filter((r) => r.tpl === t);
  const states = [...new Set(rows.map((r) => r.state))].join(' / ');
  const heights = rows.map((r) => r.pageHeight);
  console.log(`  ${t.padEnd(26)} ${rows.length} renders · states ${states.padEnd(15)}`
    + `page height ${Math.min(...heights)}–${Math.max(...heights)}px (never a constraint)`);
}
fs.writeFileSync(path.join(OUT, 'atlas-report.json'), JSON.stringify(REPORT, null, 2));
console.log('\nwrote ' + path.relative(root, OUT) + ` — ${REPORT.length} renders, ${PACK.length} payloads, 6 templates`);
