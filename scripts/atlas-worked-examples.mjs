#!/usr/bin/env node
// THE WORKED-EXAMPLE ATLAS — a finite library of designed presentations, rendered for approval.
//
//   node scripts/atlas-worked-examples.mjs [outDir]
//
// THE ONE RULE: THE AUTHOR CHOOSES THE INSTRUCTIONAL STRUCTURE. THE RENDERER CHOOSES ONLY THE
// PRESCRIBED RESPONSIVE STATE AND MEDIA SUBDESIGN BELONGING TO THAT STRUCTURE.
//
// FOUR FROZEN AXES, and the build's job is to keep them independent:
//
//   COMPOSITION      what is visible together, and where                  authored
//   COLLECTION       if there are several related things, which are shown authored
//   SCROLL           which surface is allowed to move (y and x, separately) authored
//   MEDIA GEOMETRY   which approved subdesign the media shape permits     the figure's own geometry
//
// The responsive state is not a fifth axis: it is the prescribed wide/narrow arrangement OF a
// composition, from the surface width alone, and it can never select a different composition.
//
// Nothing decides anything from: the number of words · the height of anything · occupancy ·
// whitespace · the number of solution steps · how tall the page turned out.
//
// THERE IS NO RESOLVER HERE. Nothing measures content in order to choose a composition — no
// occupancy, no growth weights, no height matching, no scoring across candidates, no attempt to fill
// the available space, and no assumption that a page ought to avoid scrolling. The composition
// resolver that did all of those things is retained as research evidence at docs/mockups/compositions/
// and its layout-selection logic must not be ported into the app.
//
// AND NOTHING HERE CREATES OR REMOVES A TAB. Tabs are authored pedagogical structure, in two
// semantically distinct kinds — collection.tabs (SEVERAL SIBLING ITEMS; SELECT ONE) and views.tabs
// (ONE OBJECT, SEEN SEVERAL WAYS). The kind is encoded, not merely styled, and the affordance is
// keyed on the kind rather than on nesting depth. `data-active`
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
import { openFigurePage, measureFigures } from './lib/figure-geometry.mjs';

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
const M = A.measures;

/* THE RESPONSIVE STATE COMES FROM ONE NUMBER: the surface width, against a switch point the
   composition itself declares. Keyed by the AUTHORED name, because that is what `data-tpl` carries;
   the resolved name (visual.side / visual.down) is what media geometry produces from it. */
const SWITCH = {};
for (const [resolved, v] of Object.entries(A.compositions)) {
  if (resolved === '_' || !v || typeof v !== 'object') continue;
  if (typeof v.switchAt === 'number') SWITCH[v.authored] = v.switchAt;
}
SWITCH['scroll.pane'] = A.scroll.y.pane.switchAt;

const RESOLVED = new Set(Object.keys(A.compositions).filter((k) => k !== '_'));

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

/* ══ FIGURES · the media-geometry contract, from its ONE OWNER ════════════════════════════════
   This used to be a second copy of the search, living beside the one in scripts/lib. They agreed
   until they did not: the class bands were hardcoded here while atlas.json declared them, so
   retuning the grammar silently changed nothing. */
const figPage = await openFigurePage(browser, base);
/* expand the {{PART:…}} includes before looking for figures — a fragment can reach a plane only
   through a shared body, and scanning the outer file alone reported "no figure graphcheck" */
const expand = (f) => fs.readFileSync(path.join(SRC, f + '.html'), 'utf8')
  .replace(/\{\{PART:([a-z0-9_-]+)\}\}/gi, (m, q) => fs.readFileSync(path.join(SRC, q + '.part'), 'utf8'));
/* A REQUEST IS A FIGURE AT AN AUTHORED SIZE. The size is part of the placeholder because it is the
   author's decision, exactly like the figure itself — `{{FIG:symmetry@standard}}`. */
const ALL = new Set(PACK.flatMap((e) => [...expand(e.frag).matchAll(/\{\{FIG:([a-z0-9-]+@[a-z]+)\}\}/gi)].map((m) => m[1])));
const NEEDED = new Set(SELECTED.flatMap((e) => [...expand(e.frag).matchAll(/\{\{FIG:([a-z0-9-]+@[a-z]+)\}\}/gi)].map((m) => m[1])));
console.log('\nfigures — authored media size, media-geometry class, and one realised box per surface');
const FIG = await measureFigures({ figPage, A, FIGS, want: ONLY ? NEEDED : ALL, log: console.log });

/* CONTROL · THE SIZE CLASS MOVES THE PLANE, AND NOTHING ELSE. Two sizes of one figure must keep the
   same geometry class and the same subdesign, and must actually paint at a different px-per-unit —
   a bounded wrapper around an unchanged plane would satisfy every other measurement on the page. */
{
  const byFig = {};
  for (const [req, f] of Object.entries(FIG)) (byFig[f.key] ||= []).push(f);
  let proved = 0;
  for (const [key, list] of Object.entries(byFig)) {
    if (list.length < 2) continue;
    for (const f of list.slice(1)) {
      if (f.cls !== list[0].cls || f.sub !== list[0].sub)
        throw new Error(`${key}: mediaSize changed the geometry class or subdesign `
          + `(${list[0].size} → ${list[0].cls}/${list[0].sub}, ${f.size} → ${f.cls}/${f.sub}) — `
          + `size and shape are separate axes`);
      if (f.pref.w === list[0].pref.w || f.pref.x === list[0].pref.x)
        throw new Error(`${key}: ${f.size} and ${list[0].size} realise the same plane `
          + `(${f.pref.w}px at ${f.pref.x} px/unit) — the size class did nothing`);
      proved++;
    }
  }
  if (!ONLY && !proved) throw new Error('no figure was authored at two sizes, so nothing proves that '
    + 'mediaSize changes the plane rather than a wrapper around it');
  if (proved) console.log(`  control · ${proved} size pair(s): same class, same subdesign, a genuinely different plane`);
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

const payloads = {}, identity = {}, AFFORD = {}, REPORT = [];
/* names that appear as data-tpl but are not compositions — a collection, a views group, or the
   persistent-pane template are structures, not arrangements of visible content */
const NON_COMPOSITION = new Set([...Object.keys(A.collections), 'scroll.pane'].filter((k) => k !== '_'));

/* CONTROL · THE JSON DESCRIBES INTENT, NOT LAYOUT ARITHMETIC. Run once, over the authored files
   themselves, because the principle is about what an author is allowed to write — not about what
   the page happens to render. A lesson says WHAT IT IS; it never tells CSS how to improvise. */
const ARITHMETIC = '\\b(leftWidth|rightWidth|colWidth|occupancy|preferSplit|maxDeadSpace'
  + '|growthWeight|trackWeight|minReadableBox|preferredBox|maximumUsefulBox|deadSpace'
  + '|fitScore|candidateScore)\\b';
for (const f of ['pack.json', 'figures.json', ...fs.readdirSync(SRC).filter((n) => /\.(html|part)$/.test(n))]) {
  const t = fs.readFileSync(path.join(SRC, f), 'utf8');
  const hit = new RegExp(ARITHMETIC).exec(t);
  if (hit) throw new Error(`${f} carries the layout-arithmetic key "${hit[1]}" — authored files say what `
    + `the lesson IS, never how CSS should improvise`);
}

const shot = async (name, entry, state, surfaceName) => {
  const surface = A.surfaces[surfaceName], pad = A.surfacePad[surfaceName];
  let body = readFrag(entry.frag);

  /* THE FIGURE'S SUBDESIGN IS ITS OWN MEDIA GEOMETRY, not the prose around it. */
  const used = [];
  body = body.replace(/\{\{FIG:([a-z0-9-]+@[a-z]+)\}\}/gi, (m, key) => {
    const f = FIG[key];
    if (!f) throw new Error(`${name}: no figure ${key}`);
    used.push(key);
    /* Which box: the one the AUTHORED SIZE CLASS realises on this surface — the widest width in its
       band whose measured box clears its height ceiling. A box is never scaled after painting. */
    const box = f.box[surfaceName];
    if (box.w > surface + 1) throw new Error(`${name}: ${key} needs ${box.w}px in a ${surface}px region`);
    return skin(box.w, box.h, box.html);
  });
  for (const key of used)
    body = body.split(`data-fig="${key}"`).join(`data-fig="${key}" data-fig-class="${FIG[key].cls}" `
      + `data-media-size="${FIG[key].size}" data-sub="${FIG[key].sub}"`);
  /* the derived switch point travels by figure key, because it is the FIGURE'S property */
  const figSwitch = {};
  for (const key of used) figSwitch[key] = FIG[key].switchAt;

  const doc = `<!doctype html><html data-theme="mathematics"><head><meta charset="utf-8"><style>
${APP_CSS}
</style><style>
${tokens(surface, pad)}
${CSS_KIT}
</style></head><body class="mx${surfaceName === 'desktop' ? '' : ' at-' + surfaceName}"><div class="at-page">
<div class="at-cap"><span class="at-tpl">${entry.demo} · ${surfaceName} ${surface}px${state.k ? ' · tab: ' + state.k : ''}</span>${entry.c}</div>
<div class="at-surface">${body}</div>
<div class="at-note">${entry.demo} — the author chose this structure; the renderer chose only the prescribed responsive state (from the ${surface}px surface alone) and the media subdesign. The disclosure is the author's and is identical at every width. Height is auto; the page scrolls.</div>
</div></body></html>`;

  const p = await browser.newPage({ viewport: { width: surface + 2 * pad + 120, height: 900 }, deviceScaleFactor: 2 });
  const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
  await p.setContent(doc, { waitUntil: 'load' });

  /* ── the only two things stamped at build time, and neither reads content ────────────────────
     1 · RESPONSIVE STATE, per template, from the surface width against that template's own switch
         point. Every other input — height, occupancy, how much fits — is absent by construction.
     2 · THE AUTHORED TAB SELECTION from pack.json. The bar is rendered whole; this only says which
         panel is open. Nothing here can add, remove or reorder a tab. */
  const stamped = await p.evaluate(({ SWITCH, figSwitch, surface, sel }) => {
    const surf = document.querySelector('.at-surface');
    for (const el of surf.querySelectorAll('[data-tpl]')) {
      /* a figure-bearing composition uses the switch point derived from ITS figure; everything
         else uses the constant its composition declares. Both are prescribed. */
      const fig = el.getAttribute('data-fig');
      const at = fig && figSwitch[fig] != null ? figSwitch[fig] : SWITCH[el.getAttribute('data-tpl')];
      el.setAttribute('data-state', at && surface < at ? 'narrow' : 'wide');
    }
    /* comparison.sharedVisual resolves .side / .down from ITS SHARED FIGURE — the one the visual
       inside it carries. Copying the suffix up is the resolution step the grammar names; it is not
       a measurement, and the base composition is untouched either way. */
    for (const el of surf.querySelectorAll('[data-tpl="comparison.sharedVisual"]')) {
      const v = el.querySelector('[data-tpl="visual"][data-sub]');
      if (v) el.setAttribute('data-sub', v.getAttribute('data-sub'));
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
      /* SELECTING A TAB BRINGS IT FULLY INTO VIEW. The strip is one scrolling row, so the current
         item must not be half off the end. Set outright rather than animated — a render must be
         reproducible, and a smooth scroll is a race. */
      const bar = g.querySelector(':scope > .at-tabbar');
      const on = bar && bar.querySelector('.at-tab[data-on]');
      if (on && bar.scrollWidth > bar.clientWidth) {
        const l = on.offsetLeft, r = l + on.offsetWidth;
        if (l < bar.scrollLeft) bar.scrollLeft = l;
        else if (r > bar.scrollLeft + bar.clientWidth) bar.scrollLeft = r - bar.clientWidth;
      }
    }
    return { groups: groups.length, missing, extraSel: Object.keys(sel).filter((k) => !groups.some((g) => g.getAttribute('data-tabs') === k)) };
  }, { SWITCH, figSwitch, surface, sel: state.tabs || {} });
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
      return `${depth}:${t.getAttribute('data-tabs-kind')}:${t.getAttribute('data-tabs')}`
        + `[${labels.join('|')}]{${panels.join('|')}}`;
    }).join(' ; ');
    /* THE AFFORDANCE IS KEYED ON THE KIND, NOT ON DEPTH. Read back what each group actually paints,
       so "the distinction is encoded, not merely styled" is a property of the page. */
    const affordance = [].slice.call(surf.querySelectorAll('[data-tabs]')).map((t) => {
      let depth = 0;
      for (let q = t.parentElement; q && q !== surf; q = q.parentElement) if (q.hasAttribute('data-tabs')) depth++;
      const bar = t.querySelector(':scope > .at-tabbar');
      const on = t.querySelector(':scope > .at-tabbar > .at-tab[data-on]');
      const cb = getComputedStyle(bar), co = on ? getComputedStyle(on) : null;
      const tabs = [].slice.call(bar.querySelectorAll('.at-tab'));
      const rows = new Set(tabs.map((b) => b.offsetTop)).size;
      const br = bar.getBoundingClientRect(), orc = on ? on.getBoundingClientRect() : null;
      return { rows, scrolls: bar.scrollWidth > bar.clientWidth + 1,
        activeWhole: !orc || (orc.left >= br.left - 1 && orc.right <= br.right + 1),
        kind: t.getAttribute('data-tabs-kind'), depth,
        sig: co ? [cb.borderBottomWidth, cb.borderTopWidth, cb.borderRadius,
                   co.backgroundColor, co.borderBottomWidth, co.borderRadius].join('/') : 'no-current-tab' };
    });
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
      const own = r.closest('[data-tpl]');
      return { region: Math.round(r.getBoundingClientRect().width), ratio,
        plane: q ? Math.round(q.getBoundingClientRect().width) : null,
        planeH: q ? Math.round(q.getBoundingClientRect().height) : null,
        size: own && own.getAttribute('data-media-size'), fig: own && own.getAttribute('data-fig') };
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
      const dx = el.getAttribute('data-scroll-x'), dy = el.getAttribute('data-scroll-y');
      /* the tab strip's overflow-x:auto coerces overflow-y to auto too, exactly as a local-x region
         does — neither is a vertical scroller */
      if (/^(auto|scroll)$/.test(cs.overflowY) && dx !== 'local' && dx !== 'tabstrip') scrollers.y.push({
        tag: el.tagName.toLowerCase(), declared: dy,
        inPane: !!el.closest('[data-tpl="scroll.pane"]'),
        live: el.scrollHeight > el.clientHeight + 1,
        xLive: el.scrollWidth > el.clientWidth + 1,
        prose: [].slice.call(el.querySelectorAll('[data-slot]')).map((n) => n.getAttribute('data-slot')) });
      /* and the same coercion in the other direction — a local-y pane computes overflow-x:auto */
      if (/^(auto|scroll)$/.test(cs.overflowX) && dy !== 'pane') scrollers.x.push({ declared: dx,
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
      .filter((n) => vis(n) && !n.closest('[data-scroll-x="local"]')
        && !n.classList.contains('at-sm') && !n.classList.contains('at-lab'))
      .map((n) => ({ w: Math.round(n.getBoundingClientRect().width), t: n.textContent.slice(0, 46) }))
      .filter((n) => n.w > flow + 1);

    /* THE FRAME MUST HOLD THE SURFACE. A page whose frame is narrower than the surface inside it
       clips the right-hand edge of every line, and the document never scrolls sideways while it
       happens — so the document-level control is blind to it. Measured here instead. */
    const pg = document.querySelector('.at-page');
    const clip = { sw: pg.scrollWidth, cw: pg.clientWidth };
    const frame = ['html', 'body', '.at-page', '.at-surface'].map((s) => {
      const el = document.querySelector(s), cs = getComputedStyle(el);
      return { s, maxHeight: cs.maxHeight, overflowY: cs.overflowY, height: cs.height };
    });
    const inline = [].slice.call(surf.querySelectorAll('[data-tpl],[data-slot],[data-tabs],[data-scroll-x],[data-scroll-y],[class^="at-"]'))
      .filter((e) => e.style.width || e.style.gridTemplateColumns || e.style.height || e.style.maxHeight)
      .filter((e) => !e.hasAttribute('data-fig-viewport'))
      .map((e) => e.tagName + '.' + e.className + ':' + e.getAttribute('style'));
    return { clip, payload: seen.join(' '), tabSig, affordance, panels, bars, figs, scrollers, wide, frame, inline,
      tpls: [].slice.call(surf.querySelectorAll('[data-tpl]')).map((n) => n.getAttribute('data-tpl')),
      resolved: [].slice.call(surf.querySelectorAll('[data-tpl]')).map((n) => {
        const t = n.getAttribute('data-tpl'), sb = n.getAttribute('data-sub');
        return sb ? t + '.' + sb : t; }),
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
  /* CONTROL · MEDIA GEOMETRY RESOLVES WITHIN THE FROZEN VOCABULARY. A subdesign may change the
     suffix; it may never produce a name the grammar does not contain, and it may never change the
     base composition. comparison.sharedVisual with a wide figure is still comparison.sharedVisual. */
  for (let i = 0; i < m.resolved.length; i++) {
    const r = m.resolved[i];
    if (!RESOLVED.has(r) && !RESOLVED.has(m.tpls[i]) && !NON_COMPOSITION.has(m.tpls[i]))
      throw new Error(`${name}: ${r} is not a name in the frozen vocabulary`);
    if (!r.startsWith(m.tpls[i]))
      throw new Error(`${name}: ${m.tpls[i]} resolved to ${r} — a subdesign changed the composition`);
  }
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
  /* CONTROL · THE TWO TAB KINDS ARE ENCODED, NOT MERELY STYLED. collection.tabs means SEVERAL
     SIBLING ITEMS; views.tabs means ONE OBJECT SEEN SEVERAL WAYS. A group's affordance must be the
     one its KIND declares, identically at every nesting depth — keying it on depth (as an earlier
     pass did) renders a top-level views.tabs as an item selector and lies about what the tabs mean. */
  for (const g of m.affordance) {
    if (!g.kind) throw new Error(`${name}: a tab group declares no kind`);
    if (g.sig === 'no-current-tab') throw new Error(`${name}: the ${g.kind} group paints no current tab`);
    /* CONTROL · THE STRIP IS ONE ROW, AND THE CURRENT ITEM IS WHOLE. Four tabs falling onto a
       second line reads as an accident; a current tab half off the end is worse. */
    if (g.rows !== 1)
      throw new Error(`${name}: the ${g.kind} tab strip wrapped onto ${g.rows} rows — it must stay one `
        + `row and scroll, never wrap`);
    if (!g.activeWhole)
      throw new Error(`${name}: the current tab in the ${g.kind} strip is not fully in view`);
    if (!AFFORD[g.kind]) AFFORD[g.kind] = { name, sig: g.sig, depth: g.depth };
    else if (AFFORD[g.kind].sig !== g.sig)
      throw new Error(`${name}: a ${g.kind} group at depth ${g.depth} paints a different affordance `
        + `from the one at depth ${AFFORD[g.kind].depth} in ${AFFORD[g.kind].name} — the kind is being `
        + `styled by position rather than by meaning`);
  }
  /* CONTROL · NO INLINE GEOMETRY outside the figure viewport. Nothing here is resolved at runtime. */
  if (m.inline.length)
    throw new Error(`${name}: inline geometry on ${m.inline.length} element(s) — ${m.inline[0]}`);
  /* CONTROL · A FIGURE REGION CONTAINS A PAINTED PLANE, and is exactly as wide as it. The second
     half is about unowned space; the first is about the plane being there at all — a region holding
     the literal text "undefined" still screenshots as a page. */
  for (const f of m.figs) {
    if (f.plane == null) throw new Error(`${name}: a figure region contains no painted plane`);
    if (f.region - f.plane > 1) throw new Error(`${name}: a figure region is ${f.region}px around a ${f.plane}px plane`);
    /* CONTROL · A BOUNDED WRAPPER IS NOT A SIZE. The PAINTED PLANE itself has to occupy the width the
       authored size class prescribes for this surface. */
    if (!f.size) throw new Error(`${name}: a figure is painted with no authored mediaSize`);
    {
      const bd = A.mediaSize.classes[f.size].bounds[r.surfaceName], av = r.surface;
      const lo = Math.min(bd.min, av), hi = Math.min(bd.max, av);
      if (f.plane < lo - 1 || f.plane > hi + 1)
        throw new Error(`${name}: ${f.fig} painted ${f.plane}px wide — outside the ${f.size} band `
          + `${lo}-${hi}px for a ${av}px surface`);
    }
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
  /* CONTROL · THE FRAME HOLDS THE SURFACE. Overflow inside the page clips text without ever making
     the document scroll, so it needs its own measurement. */
  if (m.clip.sw > m.clip.cw + 1)
    throw new Error(`${name}: the page frame is ${m.clip.cw}px around ${m.clip.sw}px of surface — `
      + `the right-hand edge of every line is being clipped`);
  /* CONTROL · HEIGHT IS NOT A CONSTRAINT. Nothing in the frame bounds or clips the page. */
  for (const f of m.frame) {
    if (f.maxHeight !== 'none') throw new Error(`${name}: ${f.s} declares max-height ${f.maxHeight}`);
    if (!/^(visible)$/.test(f.overflowY)) throw new Error(`${name}: ${f.s} has overflow-y ${f.overflowY}`);
  }
  /* CONTROL · LOCAL-Y IS A WORKSPACE BEHAVIOUR AND NOTHING ELSE. */
  const BANNED = ['question', 'steps', 'solution', 'answer', 'synthesis', 'interpretation'];
  for (const s of m.scrollers.y) {
    if (s.declared !== 'pane')
      throw new Error(`${name}: a <${s.tag}> scrolls vertically without declaring scroll.y = pane`);
    if (!s.inPane)
      throw new Error(`${name}: a scroll.y = pane region sits outside a persistent-pane template`);
    if (!s.live)
      throw new Error(`${name}: the pane does not actually overflow — the proof is inert`);
    if (s.xLive) throw new Error(`${name}: a scroll.y = pane region is clipping HORIZONTALLY as well — `
      + `the coerced overflow-x has become a real one`);
    const bad = s.prose.filter((x) => BANNED.includes(x));
    if (bad.length)
      throw new Error(`${name}: ${bad.join(', ')} sits inside a scroll.y = pane region — teaching prose `
        + `is never bounded to control height, and the pane is not a way to make a lesson look shorter`);
  }
  const wantY = !!entry.paneY && !narrow;
  if (wantY && !m.scrollers.y.length) throw new Error(`${name}: the persistent pane does not scroll — the proof is inert`);
  if (!wantY && m.scrollers.y.length)
    throw new Error(`${name}: ${m.scrollers.y.length} vertically scrolling region(s) on a page that authored scroll.y = page`);
  /* CONTROL · LOCAL-X IS LOCAL, AND THE PROOF IS LIVE. */
  /* CONTROL · ONLY A PERMITTED CONTRACT MAY SCROLL SIDEWAYS. Two exist: `local` for authored
     indivisible material, and `tabstrip` for the one-row tab strip. Anything else is a defect. */
  for (const s of m.scrollers.x) {
    if (s.declared !== 'local' && s.declared !== 'tabstrip')
      throw new Error(`${name}: a region scrolls horizontally without a contract that permits it`);
    if (s.declared === 'tabstrip') continue;
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
    for (const surfaceName of (entry.surfaces || ['desktop', 'narrow'])) {
      const name = `${entry.n}-${entry.demo.replace(/[.=]/g, '-')}${entry.adv ? '-adv' : ''}`
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

      REPORT.push({ image: name, demo: entry.demo, frag: entry.frag, adv: !!entry.adv, surface: r.surface,
        surfaceName: r.surfaceName, tab: state.k || null,
        authored: m.tpls, resolved: m.resolved, states: m.states, tabStructure: m.tabSig || null,
        pageHeight: m.docH, scrollYPane: m.scrollers.y.length, scrollXLocal: m.scrollers.x.length,
        figures: r.used.map((k) => `${k}:${FIG[k].cls}→${FIG[k].resolved}`) });
      console.log(`  ${name.padEnd(50)} ${String(r.surface).padStart(4)}px  page ${String(m.docH).padStart(5)}px`
        + `  y${m.scrollers.y.length} x${m.scrollers.x.length}  `
        + `${[...new Set(m.resolved)].filter((t) => t.includes('.')).join(' ')}`);
    }
  }
}

await figPage.close(); await browser.close(); server.close();

console.log('\nIDENTITY — authored, and invariant across width, payload and tab state');
for (const d of [...new Set(SELECTED.map((e) => e.demo))]) {
  const rows = REPORT.filter((r) => r.demo === d);
  const h = rows.map((r) => r.pageHeight);
  const sig = [...new Set(rows.map((r) => r.tabStructure || '—'))];
  /* group the drift check by FRAGMENT, not by demo: a normal and an adversarial payload share a
     demo name and legitimately hold different numbers of children. Comparing across them reported a
     DRIFT that was not one — a summary line that cries wolf is worse than no summary line. */
  const comp = [...new Set(rows.map((r) => r.frag))].map((f) =>
    [...new Set(rows.filter((r) => r.frag === f).map((r) => r.authored.join(',')))].length);
  console.log(`  ${d.padEnd(24)} ${String(rows.length).padStart(2)} renders · page ${Math.min(...h)}–${Math.max(...h)}px`
    + ` (never a constraint) · compositions ${comp.every((c) => c === 1) ? 'identical' : 'DRIFTED'}`
    + ` · tabs ${sig.length === 1 ? 'identical' : 'DRIFTED'}`);
}
console.log('\nTHE TWO TAB KINDS — one affordance each, at every depth');
for (const [k, v] of Object.entries(AFFORD)) console.log(`  ${k.padEnd(11)} ${v.sig}`);
if (ONLY) console.log('\nATLAS_ONLY — partial run, images for other designs are stale');
else fs.writeFileSync(path.join(OUT, 'atlas-report.json'), JSON.stringify(REPORT, null, 2));
console.log('\nwrote ' + path.relative(root, OUT) + ` — ${REPORT.length} renders, ${SELECTED.length} reference designs`);
