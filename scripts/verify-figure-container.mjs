#!/usr/bin/env node
// CONTRACT 10 - the figure CONTAINER: responsive sizing, mount/reflow and the interaction lifecycle around
// the re-solve. Stage 4.
//
//   node scripts/verify-figure-container.mjs
//   CHROMIUM_PATH=/opt/pw-browsers/chromium node scripts/verify-figure-container.mjs
//
// WHY A TENTH CONTRACT. Stage 4 derives the figure's viewBox from its host (figFitBox), so the inline box is
// no longer a constant. Nothing already in the suite tests the box the app actually paints:
//   - verify-label-placement    owns NEAREST-LEGAL placement, and solves at FIXED reference boxes.
//   - verify-geometry-semantics owns SEMANTIC LEGALITY, also at fixed boxes.
//   - verify-measure-surface    owns the measurement surface, and its assertions are RATIOS, so they are
//                               scale-invariant and stay green while a figure becomes unreadable.
// All three would pass on a figure painted at 4px per annotation.
//
// LOGICAL CANVAS PIXELS, ALWAYS. `#canvas` is a fixed 1280px surface that is transform:scale()'d to the
// viewport, so a phone shrinks the figure and the body copy identically - annotation:body is a constant 1.48x
// at every viewport. That is the canvas's business, not the engine's, and asserting device px here would
// report a different number per viewport and "fail" on a phone for a reason no figure change can address.
// Sizes are computedFontSize * (stage.offsetWidth / viewBoxWidth): offsetWidth is the PRE-TRANSFORM layout
// box, never getBoundingClientRect(), which would fold the canvas zoom into every number.
//
// INDEPENDENCE. Every verdict is read back from the painted DOM. The one value taken from the app is
// figMinStageWidth(), because the floor is the CONTRACT under assertion, not a derived result - a copy pinned here
// would let the two drift apart silently.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MIME = { '.html': 'text/html', '.json': 'application/json', '.js': 'text/javascript',
  '.mjs': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.glb': 'model/gltf-binary',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml' };

/* THE TYPE BAND, in logical canvas px (Stage 4 D6).
   FLOOR is a hard safety limit for ANY annotation, subordinate units included. PRIMARY_MIN..CEIL is where
   primary annotations should normally land, against 16.5px body copy - an annotation must not outrank the
   prose beside it. SUBORDINATE classes satisfy the FLOOR ONLY and are deliberately not raised toward the
   primary values: Stage 3d made the unit quieter on purpose, and flattening that would undo it. */
const FLOOR = 11, PRIMARY_MIN = 12;
const SUBORDINATE = new Set(['tp-fig-gunit']);
/* THE BOUNDED RESPONSIVE CONTRACT, restated here from the documented constants rather than read out of the
   app. Asking figRespScale() what it returns and then asserting that it returned it would be a tautology; the
   point is to pin the CONTRACT so a drift between these numbers and the app's is exactly what fails.
     stage <= RESP_STAGE0 -> scale 1.00 (the approved narrow rendering is protected)
     between              -> linear
     stage >= RESP_STAGE1 -> scale RESP_MAX, and flat above it
   The old flat 12-15px primary ceiling is obsolete: it was a FLOOR-stage contract, and bounded growth
   necessarily lifts the upper bound with the ramp. The floor is unchanged and absolute. */
const RESP_MIN = 1.00, RESP_MAX = 1.22, RESP_STAGE0 = 420, RESP_STAGE1 = 1089;
const expectScale = (s) => RESP_MIN + (RESP_MAX - RESP_MIN) * Math.max(0, Math.min(1, (s - RESP_STAGE0) / (RESP_STAGE1 - RESP_STAGE0)));
const CEIL_AT = (s) => 15 * expectScale(s);   // the primary ceiling rides the ramp; 15 is its value at scale 1.00
/* Representative absolute sizes, named rather than re-derived, with a tolerance that is round-trip precision
   and not slack in the contract. These are the numbers the maintainer approved from the A/B captures. */
const EXPECT_PX = { 'tp-fig-gvert': { 420: 14.84, 700: 16.19, 1089: 18.08 },
                    'tp-fig-gunit': { 420: 11.18, 700: 12.21, 1089: 13.63 } };
const PX_TOL = 0.15;

const FIXTURES = [
  { file: 'tests/visual/lessons/figure-geometry-baseline.json', kind: 'geometry' },
  { file: 'tests/visual/lessons/figure-measure-surface.json', kind: 'geometry' },
  { file: 'tests/visual/lessons/figure-graph-baseline.json', kind: 'graph' },
];
// Designed environments (ENGINE_SPEC 3.4): geometry is a `mathematics` capability; `quantitative` (graph) is
// declared by geolearn too, so a global type scale has to hold there as well.
const THEMES = { geometry: ['mathematics', 'scholarmath'], graph: ['mathematics', 'scholarmath', 'geolearn'] };

const server = http.createServer((req, res) => {
  const rel = decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'lesson-studio.html';
  if (rel === 'favicon.ico') { res.writeHead(204); return res.end(); }
  const file = path.join(root, rel);
  if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end('nf'); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}/`;

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errs = [];
page.on('pageerror', (e) => errs.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error' && !/favicon\.ico/.test(m.location().url || '')) errs.push(m.text()); });
await page.goto(base + 'lesson-studio.html', { waitUntil: 'load' });

const results = [];
const ok = (n, c, extra = '') => { results.push(`${c ? 'PASS' : 'FAIL'} ${n}${extra ? '  ' + extra : ''}`); if (!c) process.exitCode = 1; };
const note = (s) => results.push('     . ' + s);
// Every named expectation must be OBSERVED. An assertion that never ran is not a pass - this suite has
// shipped a green run over silently skipped checks before, so absence is tracked rather than assumed.
const seenClasses = new Set();
const seenExpect = new Set();   // every named representative size must actually be observed

// -- in-page helpers, installed once ---------------------------------------------------------------------
await page.evaluate(() => {
  window.__T = { calls: 0, repaints: 0, relayouts: 0 };
  const orig = figInlineSolve;
  figInlineSolve = function (f) { window.__T.calls++; const r = orig(f); if (r) window.__T.repaints++; return r; };
  /* The RESOLVER needs its own counter. Counting repaints alone missed a removed idempotence guard entirely:
     figResolveLayout would rewrite data-fig-layout on every pass while figInlineSolve, still idempotent on
     data-fig-box, reported no repaint — a redundant DOM write per pass that the suite called clean. */
  const origL = figResolveLayout;
  figResolveLayout = function (f) { const r = origL(f); if (r) window.__T.relayouts++; return r; };
  window.__load = (L, theme) => { LESSON = JSON.parse(JSON.stringify(L)); LESSON.meta.theme = theme;
    document.documentElement.dataset.theme = theme; go(0); return LESSON.slides.length; };
  window.__figs = () => [...document.querySelectorAll('#slide .tp-fig[data-fig-fit]')];
  /* Drive the STAGE width, not the parent's. figInlineSolve measures `.tp-fig-stage`, and the shell's padding
     and border sit between the two (~26px), so setting the parent to the floor would test a stage ~26px BELOW
     it - which is how the first draft of this file reported a relaxed dart "at 420" that was really at 394.
     Set the parent, read the stage back, correct once for the chrome, and verify the target was hit. */
  window.__stage = (px) => { const figs = window.__figs();
    figs.forEach((f) => { const h = f.parentElement; h.style.width = px + 'px'; h.style.maxWidth = px + 'px'; });
    figs.forEach((f) => { const st = f.querySelector('.tp-fig-stage'), h = f.parentElement;
      const chrome = f.parentElement.offsetWidth - st.offsetWidth;
      h.style.width = (px + chrome) + 'px'; h.style.maxWidth = (px + chrome) + 'px'; });
    figFitAll();
    return figs.map((f) => f.querySelector('.tp-fig-stage').offsetWidth); };
  window.__k = (f) => { const svg = f.querySelector('.tp-fig-svg');
    return f.querySelector('.tp-fig-stage').offsetWidth / +svg.getAttribute('viewBox').split(/\s+/)[2]; };
  window.__text = () => { const out = [];
    window.__figs().forEach((f) => { const svg = f.querySelector('.tp-fig-svg'); if (!svg) return;
      const k = window.__k(f);
      svg.querySelectorAll('text,tspan').forEach((t) => {
        const fs = parseFloat(getComputedStyle(t).fontSize), txt = (t.textContent || '').trim();
        if (!fs || !txt) return;
        out.push({ cls: t.getAttribute('class') || '(none)', px: fs * k, txt: txt.slice(0, 16) }); }); });
    return out; };
  /* Stage 3d containment, read from the PAINTED geometry: figDraw.measure puts the value and its unit in one
     <text> immediately after the <rect> that reserves it, so the pair is adjacent siblings and the check is a
     bbox comparison, not a re-derivation of the sizing rule. */
  window.__containment = () => { const bad = [];
    window.__figs().forEach((f) => f.querySelectorAll('.tp-fig-gpill').forEach((rect) => {
      const t = rect.nextElementSibling; if (!t || t.tagName !== 'text') return;
      const rb = rect.getBBox(), tb = t.getBBox();
      const over = Math.max(rb.x - tb.x, tb.x + tb.width - (rb.x + rb.width), rb.y - tb.y, tb.y + tb.height - (rb.y + rb.height));
      if (over > 0.5) bad.push({ txt: t.textContent, over: +over.toFixed(2) }); }));
    return bad; };
  /* `relaxed` is a property of the SOLVE, not of the DOM, so it is re-solved from the registered block at the
     box the figure is actually painted at - figFitBox of the measured host, the same input the paint used. */
  window.__relaxed = () => { const out = [];
    window.__figs().forEach((f) => { if (f.dataset.tpFigKind !== 'geometry') return;
      const xb = f.querySelector('[data-figx-open]'), e = xb && FIGX[xb.dataset.figxOpen];
      if (!e || !e.b) return;
      const M = figGeometry(e.b, figFitBox(f.querySelector('.tp-fig-stage').offsetWidth));
      (M.labels || []).forEach((L2) => { if (L2.relaxed) out.push(L2.text); }); });
    return out; };
  window.__sig = () => window.__figs().map((f) => f.querySelector('.tp-fig-stage').innerHTML).join('|');
});

// == A/B/C/D: band, containment and the geometry floor, per fixture x theme x host =======================
for (const fx of FIXTURES) {
  const lesson = JSON.parse(fs.readFileSync(path.join(root, fx.file), 'utf8'));
  const floor = await page.evaluate((k) => figMinStageWidth({ figure: k }), fx.kind);   // the CONTRACT, from the app
  const stages = [1089, 700, 530, floor + 40, floor];                              // widest .. exactly the floor (all STAGE widths)
  const short = path.basename(fx.file);
  for (const theme of THEMES[fx.kind]) {
    let lo = { px: Infinity }, hi = { px: -Infinity }, texts = 0, renders = 0;
    const band = [], contain = [], relax = [];
    const slides = await page.evaluate(({ L, t }) => window.__load(L, t), { L: lesson, t: theme });
    for (const stageW of stages) {
      for (let i = 0; i < slides; i++) {
        const r = await page.evaluate(({ i, stageW }) => { go(i); const widths = window.__stage(stageW);
          return { rows: window.__text(), bad: window.__containment(), rel: window.__relaxed(),
                   n: window.__figs().length, widths };
        }, { i, stageW });
        // The stage really is at the width this row claims - otherwise every number below is about a
        // different figure than the one named, which is exactly the defect this guard was added for.
        const offBy = r.widths.filter((w) => Math.abs(w - stageW) > 1.5);
        if (offBy.length) ok(`${path.basename(fx.file)} - ${theme} - stage width honoured at ${stageW}`, false, `got ${offBy.join(', ')}`);
        renders += r.n; texts += r.rows.length;
        for (const t of r.rows) {
          seenClasses.add(t.cls);
          if (t.px < lo.px) lo = { ...t, stageW, slide: i };
          if (t.px > hi.px) hi = { ...t, stageW, slide: i };
          if (t.px < FLOOR - 1e-6) band.push(`${t.cls} "${t.txt}" ${t.px.toFixed(2)}px < ${FLOOR} floor (stage ${stageW}, slide ${i})`);
          else if (!SUBORDINATE.has(t.cls) && (t.px < PRIMARY_MIN - 1e-6 || t.px > CEIL_AT(stageW) + 1e-6))
            band.push(`${t.cls} "${t.txt}" ${t.px.toFixed(2)}px outside ${PRIMARY_MIN}-${CEIL_AT(stageW).toFixed(2)} (stage ${stageW}, slide ${i})`);
          const want = EXPECT_PX[t.cls] && EXPECT_PX[t.cls][stageW];
          if (want != null) { seenExpect.add(`${t.cls}@${stageW}`);
            if (Math.abs(t.px - want) > PX_TOL) band.push(`${t.cls} "${t.txt}" ${t.px.toFixed(2)}px != approved ${want} at stage ${stageW}`); }
        }
        r.bad.forEach((b) => contain.push(`"${b.txt}" spills ${b.over}px (stage ${stageW}, slide ${i})`));
        r.rel.forEach((t) => relax.push(`"${t}" at stage ${stageW} (slide ${i})`));
      }
    }
    const tag = `${short} - ${theme}`;
    ok(`${tag} - annotations were actually measured`, texts > 0 && renders > 0, `${renders} figure renders - ${texts} text nodes`);
    ok(`${tag} - every annotation inside the logical-px band`, band.length === 0,
      band.length ? band.slice(0, 3).join(' | ') : `min ${lo.px.toFixed(2)} ${lo.cls} - max ${hi.px.toFixed(2)} ${hi.cls}`);
    ok(`${tag} - measurement text stays inside its own surface`, contain.length === 0, contain.slice(0, 3).join(' | '));
    if (fx.kind === 'geometry')
      ok(`${tag} - no Stage 3c relaxed placement at or above the ${floor}px geometry stage floor`, relax.length === 0, relax.slice(0, 3).join(' | '));
    note(`${tag}: smallest ${lo.px.toFixed(2)}px ${lo.cls} "${lo.txt}" @stage ${lo.stageW} slide ${lo.slide} - largest ${hi.px.toFixed(2)}px ${hi.cls} "${hi.txt}" @stage ${hi.stageW} slide ${hi.slide}`);
  }
}
/* == THE BOUNDED RESPONSIVE RAMP ==========================================================================
   Measured as a RATIO of rendered size to the same role's size at the ramp start, so the observed scale is
   derived from pixels only — no production constant or helper is consulted to decide what the answer should
   be. The expected curve comes from the contract restated at the top of this file. */
{
  const lesson = JSON.parse(fs.readFileSync(path.join(root, 'tests/visual/lessons/figure-geometry-baseline.json'), 'utf8'));
  const PROBE = [340, RESP_STAGE0, 530, 700, 900, RESP_STAGE1, 1250];   // includes one BELOW the ramp and one ABOVE the ceiling
  await page.evaluate(({ L }) => window.__load(L, 'mathematics'), { L: lesson });
  const got = {};
  for (const w of PROBE) {
    const r = await page.evaluate(({ w }) => { go(0); const widths = window.__stage(w);
      const out = {};
      window.__figs().forEach((f) => { const svg = f.querySelector('.tp-fig-svg');
        const k = f.querySelector('.tp-fig-stage').offsetWidth / +svg.getAttribute('viewBox').split(/\s+/)[2];
        svg.querySelectorAll('text,tspan').forEach((t) => { const cls = t.getAttribute('class');
          const fz = parseFloat(getComputedStyle(t).fontSize);
          if (cls && fz && !(cls in out)) out[cls] = fz * k; }); });
      return { out, widths }; }, { w });
    got[w] = r;
  }
  const baseAt = got[RESP_STAGE0].out;
  const scaleAt = (w) => { const a = got[w].out['tp-fig-gvert'], b = baseAt['tp-fig-gvert']; return a && b ? a / b : null; };
  const stagesOk = PROBE.every((w) => got[w].widths.every((x) => Math.abs(x - w) <= 1.5));
  ok('the ramp probe hit every stage width it claims', stagesOk,
    PROBE.map((w) => `${w}->${got[w].widths.join('/')}`).join(' '));

  /* figFitBox rounds the box to whole viewBox units (W = round(stage / k)), so the REALISED scale carries up to
   ~0.5/W of quantisation — 0.17% at the narrowest box probed here. RTOL is that rounding, not slack in the
   contract: a real ramp error is orders of magnitude larger, and the ramp assertion above still holds to 1%. */
  const RTOL = 0.004;
  const rows = PROBE.map((w) => ({ w, obs: scaleAt(w), exp: expectScale(w) }));
  const bad = rows.filter((r) => r.obs == null || Math.abs(r.obs - r.exp) > 0.01);
  ok('the responsive scale follows the contracted ramp', bad.length === 0,
    bad.length ? bad.map((r) => `stage ${r.w}: observed ${r.obs && r.obs.toFixed(3)} vs contracted ${r.exp.toFixed(3)}`).join(' | ')
      : rows.map((r) => `${r.w}:${r.obs.toFixed(3)}`).join(' '));
  ok(`at and below the ramp start the scale is ${RESP_MIN.toFixed(2)}`,
    Math.abs(scaleAt(340) - RESP_MIN) <= RTOL && Math.abs(scaleAt(RESP_STAGE0) - RESP_MIN) <= RTOL,
    `340 -> ${scaleAt(340).toFixed(4)} · ${RESP_STAGE0} -> ${scaleAt(RESP_STAGE0).toFixed(4)} (±${RTOL} box rounding)`);
  ok('the scale is monotonically non-decreasing across the ramp',
    PROBE.every((w, i2) => i2 === 0 || scaleAt(w) >= scaleAt(PROBE[i2 - 1]) - RTOL),
    PROBE.map((w) => scaleAt(w).toFixed(3)).join(' <= '));
  ok('the scale never drops below 1.00', PROBE.every((w) => scaleAt(w) >= RESP_MIN - RTOL));
  ok(`typography STOPS growing above the ramp end (${RESP_STAGE1}px)`,
    Math.abs(scaleAt(1250) - scaleAt(RESP_STAGE1)) <= RTOL && Math.abs(scaleAt(1250) - RESP_MAX) <= RTOL,
    `${RESP_STAGE1} -> ${scaleAt(RESP_STAGE1).toFixed(4)} · 1250 -> ${scaleAt(1250).toFixed(4)} · ceiling ${RESP_MAX}`);

  /* The hierarchy must survive the ramp: one multiplier, so the ORDER and the Stage 3d unit:value RATIO are
     invariants, not coincidences. If a per-role scaler ever crept in, these are what would catch it. */
  const ORDER = ['tp-fig-gvert', 'tp-fig-gsym', 'tp-fig-gprose', 'tp-fig-gsmeas', 'tp-fig-gunit'];
  const orderBad = [];
  for (const w of PROBE) { const o = got[w].out;
    const have = ORDER.filter((c) => o[c] != null);
    for (let n = 1; n < have.length; n++) if (o[have[n]] > o[have[n - 1]] + 1e-9) orderBad.push(`stage ${w}: ${have[n]} > ${have[n - 1]}`); }
  ok('role ordering survives the ramp at every stage width', orderBad.length === 0, orderBad.slice(0, 3).join(' | '));

  /* The unit:value ratio needs a figure that HAS a unit. The geometry baseline's first slide has none, so
     probing it there passed while dividing by undefined — a vacuous green, which is the exact failure mode
     this suite has shipped before. Measured on the fixture that carries `8 cm`, and it FAILS if no unit is
     ever seen rather than passing on an empty set. */
  const surf = JSON.parse(fs.readFileSync(path.join(root, 'tests/visual/lessons/figure-measure-surface.json'), 'utf8'));
  await page.evaluate(({ L }) => window.__load(L, 'mathematics'), { L: surf });
  const ratios = [];
  for (const w of PROBE) {
    const o = await page.evaluate(({ w }) => { go(2); window.__stage(w);
      const out = {};
      window.__figs().forEach((f) => { const svg = f.querySelector('.tp-fig-svg');
        const k = f.querySelector('.tp-fig-stage').offsetWidth / +svg.getAttribute('viewBox').split(/\s+/)[2];
        svg.querySelectorAll('.tp-fig-gunit,.tp-fig-gsmeas').forEach((t) => { const c = t.getAttribute('class');
          if (!(c in out)) out[c] = parseFloat(getComputedStyle(t).fontSize) * k; }); });
      return out; }, { w });
    if (o['tp-fig-gunit'] && o['tp-fig-gsmeas']) ratios.push({ w, r: o['tp-fig-gunit'] / o['tp-fig-gsmeas'] });
  }
  ok('the unit:value ratio was actually measurable', ratios.length === PROBE.length,
    `${ratios.length}/${PROBE.length} stage widths produced both a unit and a value`);
  ok('the Stage 3d unit:value ratio survives the ramp (0.852 everywhere)',
    ratios.length > 0 && ratios.every((x) => Math.abs(x.r - 0.852) < 0.005),
    ratios.map((x) => `${x.w}:${x.r.toFixed(4)}`).join(' '));
}
ok('every named representative size was observed', seenExpect.size === 6,
  `${seenExpect.size}/6: ${[...seenExpect].sort().join(' ')}`);
ok('every inline text class was exercised', seenClasses.size >= 10, `${seenClasses.size} classes: ${[...seenClasses].sort().join(' ')}`);

/* THE FLOOR IS LOAD-BEARING. A floor that nothing ever needed would be decoration, and a green run would say
   nothing. Below it, the dense fixtures MUST relax - that is the measured reason 420 exists. */
{
  const lesson = JSON.parse(fs.readFileSync(path.join(root, 'tests/visual/lessons/figure-geometry-baseline.json'), 'utf8'));
  const floor = await page.evaluate(() => figMinStageWidth({ figure: 'geometry' }));
  const slides = await page.evaluate(({ L }) => window.__load(L, 'mathematics'), { L: lesson });
  let below = 0;
  for (let i = 0; i < slides; i++) {
    const rel = await page.evaluate(({ i, stageW }) => { go(i); window.__stage(stageW); return window.__relaxed(); }, { i, stageW: floor - 90 });   // stage width, per __stage
    below += rel.length;
  }
  ok(`the ${floor}px geometry stage floor is load-bearing (dense figures DO relax below it)`, below > 0,
    `${below} relaxed labels at stage ${floor - 90}, none at or above ${floor}`);
}

/* == E: MOUNT, OBSERVER AND REFLOW INVARIANTS =============================================================
   The C2 re-solve is a DOM mutation on an already-wired slide, which is the part of it that can go wrong
   quietly: the callout hit-targets and dialogs carry per-element listeners collected once by wirePackTyped,
   so re-emitting them would leave dead buttons on the focus rail with nothing visibly broken until a learner
   taps one. These assertions pin the lifecycle rather than the pixels. */
{
  const graph = JSON.parse(fs.readFileSync(path.join(root, 'tests/visual/lessons/figure-graph-baseline.json'), 'utf8'));
  const geo = JSON.parse(fs.readFileSync(path.join(root, 'tests/visual/lessons/figure-geometry-baseline.json'), 'utf8'));

  // E1/E2 - the observer is installed once, and a re-solve at an unchanged stage width is a no-op.
  const idem = await page.evaluate(({ L }) => {
    window.__load(L, 'mathematics'); window.__stage(700);
    const before = _figRO; setupFigureObserver(); setupFigureObserver();
    const sameRO = _figRO === before;
    const c0 = window.__T.repaints; figFitAll(); figFitAll(); figFitAll();
    return { sameRO, extra: window.__T.repaints - c0, figs: window.__figs().length };
  }, { L: graph });
  ok('observer setup is idempotent across repeated calls', idem.sameRO, 'setupFigureObserver() re-entered without replacing the observer');
  ok('a re-solve at an unchanged stage width does no work', idem.extra === 0, `${idem.extra} repaints from 3 extra figFitAll() passes over ${idem.figs} figures`);
  // Same idempotence, for the LAYOUT half: a settled placement must not be rewritten on every pass.
  const idemL = await page.evaluate(({ L }) => {
    window.__load(L, 'mathematics');
    for (let i = 0; i < LESSON.slides.length; i++) { go(i); figFitAll(); }   // settle every placed figure once
    go(3); figFitAll();
    const c0 = window.__T.relayouts; figFitAll(); figFitAll(); figFitAll();
    return { extra: window.__T.relayouts - c0 };
  }, { L: JSON.parse(fs.readFileSync(path.join(root, 'tests/visual/lessons/figure-placement-baseline.json'), 'utf8')) });
  ok('a settled placement is not rewritten on every pass', idemL.extra === 0,
    `${idemL.extra} layout writes from 3 extra figFitAll() passes at an unchanged width`);

  // E3/E4 - only the <svg> is replaced; the callout nodes keep their identity and move.
  const swap = await page.evaluate(({ L }) => {
    window.__load(L, 'mathematics');
    let slide = -1, n = 0;
    for (let i = 0; i < LESSON.slides.length; i++) { go(i); window.__stage(700);
      n = document.querySelectorAll('#slide .tp-fig-hit').length; if (n > 0) { slide = i; break; } }
    if (slide < 0) return { none: true };
    const stage = document.querySelector('#slide .tp-fig-stage');
    const svg0 = stage.querySelector('.tp-fig-svg');
    const hits = [...stage.querySelectorAll('.tp-fig-hit')], cos = [...stage.querySelectorAll('.tp-fig-callout')];
    hits.forEach((h, j) => { h.__tag = 'hit' + j; }); cos.forEach((c, j) => { c.__tag = 'co' + j; });
    const left0 = hits.map((h) => h.style.left);
    window.__stage(460);
    const hits2 = [...stage.querySelectorAll('.tp-fig-hit')], cos2 = [...stage.querySelectorAll('.tp-fig-callout')];
    return { slide, n,
      svgReplaced: stage.querySelector('.tp-fig-svg') !== svg0,
      sameHits: hits2.length === hits.length && hits2.every((h, j) => h.__tag === 'hit' + j),
      sameCos: cos2.length === cos.length && cos2.every((c, j) => c.__tag === 'co' + j),
      moved: hits2.some((h, j) => h.style.left !== left0[j]) };
  }, { L: graph });
  ok('a slide with callouts was found to test against', !swap.none && swap.n > 0, swap.none ? 'no .tp-fig-hit in the graph fixture' : `${swap.n} callouts on slide ${swap.slide}`);
  if (!swap.none) {
    ok('the re-solve replaces the <svg>', swap.svgReplaced);
    ok('callout hit-targets keep their DOM identity across a re-solve', swap.sameHits, 'the nodes carry wirePackTyped listeners and must not be re-emitted');
    ok('callout dialogs keep their DOM identity across a re-solve', swap.sameCos);
    ok('callout positions are updated by the re-solve', swap.moved);
  }

  // E5 - the surviving listener still works: a click after the re-solve opens the callout.
  if (!swap.none) {
    await page.evaluate(({ L, slide }) => { window.__load(L, 'mathematics'); go(slide); window.__stage(700); window.__stage(460); }, { L: graph, slide: swap.slide });
    const before = await page.evaluate(() => document.querySelector('#slide .tp-fig-callout').hidden);
    await page.click('#slide .tp-fig-hit');
    await page.waitForTimeout(120);
    const opened = await page.evaluate(() => [...document.querySelectorAll('#slide .tp-fig-callout')].some((c) => !c.hidden));
    ok('a callout still opens after the re-solve (listeners survived)', before === true && opened === true, `hidden before ${before} - some open after ${opened}`);
    await page.keyboard.press('Escape'); await page.waitForTimeout(120);
  }

  // E6 - two figures in one host stay independent.
  const two = await page.evaluate(({ L }) => {
    window.__load(L, 'mathematics');
    let slide = -1;
    for (let i = 0; i < LESSON.slides.length; i++) { go(i); if (window.__figs().length >= 2) { slide = i; break; } }
    if (slide < 0) return { none: true };
    window.__stage(700);
    const ids = window.__figs().map((f) => f.querySelector('[data-figx-open]').dataset.figxOpen);
    const boxes = window.__figs().map((f) => f.dataset.figBox);
    return { slide, ids, distinct: new Set(ids).size === ids.length, registered: ids.every((i2) => !!FIGX[i2]), boxes };
  }, { L: geo });
  ok('a slide with two figures was found to test against', !two.none, two.none ? 'none in the geometry fixture' : `slide ${two.slide}`);
  if (!two.none) {
    ok('two figures in one host get distinct ids', two.distinct, two.ids.join(' '));
    ok('two figures register two independent FIGX entries', two.registered);
    ok('both figures re-solved to their own box', two.boxes.every((b) => b && b !== '520x360'), two.boxes.join(' '));
  }

  // E7 - a resize settles. If the re-solve could feed its own observer this count would keep climbing.
  const loop = await page.evaluate(async ({ L }) => {
    window.__load(L, 'mathematics'); go(0); window.__stage(700);
    window.__stage(460);
    const a = window.__T.repaints;
    await new Promise((r) => setTimeout(r, 500));
    return { grew: window.__T.repaints - a };
  }, { L: graph });
  ok('a resize does not feed the observer back into itself', loop.grew === 0, `${loop.grew} further repaints in the 500ms after the resize settled`);

  // E8 - wide -> narrow -> wide is deterministic.
  const det = await page.evaluate(({ L }) => {
    window.__load(L, 'mathematics'); go(0);
    window.__stage(700); const a = window.__sig();
    window.__stage(460); const mid = window.__sig();
    window.__stage(700); const b = window.__sig();
    return { same: a === b, changed: a !== mid };
  }, { L: graph });
  ok('wide -> narrow -> wide returns identical figure DOM', det.same);
  ok('...and the narrow state really was different (the round trip was not a no-op)', det.changed);

  // E9 - a callout-count mismatch bails BEFORE mutating. Proving no corruption is the whole requirement here;
  // Stage 4 deliberately builds no user-facing error path for it.
  if (!swap.none) {
    const bail = await page.evaluate(({ L, slide }) => {
      window.__load(L, 'mathematics'); go(slide); window.__stage(700);
      const fig = window.__figs()[0], stage = fig.querySelector('.tp-fig-stage');
      const hit = stage.querySelector('.tp-fig-hit'); if (!hit) return { none: true };
      const vb0 = stage.querySelector('.tp-fig-svg').getAttribute('viewBox');
      const box0 = fig.dataset.figBox;
      hit.remove();                                   // force the count mismatch
      fig.parentElement.style.width = '460px'; fig.parentElement.style.maxWidth = '460px';
      /* Caught deliberately: without the guard the forEach indexes past the end of `hits` and THROWS, which
         propagates out of figFitAll and out of renderCanvas. A thrown mismatch is a failure of this
         assertion, not of the harness - catching it keeps the control legible instead of killing the run. */
      let ret, threw = null;
      try { ret = figInlineSolve(fig); } catch (e) { threw = String(e && e.message || e); }
      return { ret, threw, vbSame: stage.querySelector('.tp-fig-svg').getAttribute('viewBox') === vb0,
        boxSame: fig.dataset.figBox === box0, stillHasSvg: !!stage.querySelector('.tp-fig-svg') };
    }, { L: graph, slide: swap.slide });
    ok('a callout-count mismatch bails before mutating', bail.threw === null && bail.ret === false && bail.vbSame && bail.boxSame && bail.stillHasSvg,
      bail.threw ? `THREW: ${bail.threw}` : `returned ${bail.ret} - viewBox unchanged ${bail.vbSame} - data-fig-box unchanged ${bail.boxSame} - svg intact ${bail.stillHasSvg}`);
  }
}

/* == C6: THE PLACEMENT RESOLVER ===========================================================================
   A placement is an INTENT. `contained` and `beside` may only keep their shape while the figure still gets
   figMinStageWidth() of usable stage — and, for `beside`, while the prose column is still worth reading.
   Otherwise the layout relaxes. The expected mode is computed HERE from the measured available width, the
   measured shell chrome and the app's own minimum, using this file's copy of the layout geometry — so it is a
   prediction to check the resolver against, not a question put to the resolver. That the prediction lands
   exactly also proves the JS constants and the CSS agree, which is otherwise a duplication nobody tests. */
const L_CONTAINED = 0.78, L_GAP = 24, L_MIN_PROSE = 260;   // must match FIG_CONTAINED_FRAC / FIG_BESIDE_GAP / FIG_BESIDE_MIN_PROSE and the CSS
const expectMode = (authored, avail, chrome, min) => {
  if (authored === 'contained') return (avail * L_CONTAINED - chrome >= min) ? 'contained' : 'full';
  if (authored === 'beside') { const col = (avail - L_GAP) / 2;
    return (col - chrome >= min && col >= L_MIN_PROSE) ? 'beside' : 'stacked'; }
  return authored;
};
{
  const lesson = JSON.parse(fs.readFileSync(path.join(root, 'tests/visual/lessons/figure-placement-baseline.json'), 'utf8'));
  await page.evaluate(({ L }) => { window.__load(L, 'mathematics');
    window.__avail = (px) => { document.querySelectorAll('#slide .tp-frag').forEach((fr) => {
      fr.style.width = px + 'px'; fr.style.maxWidth = px + 'px'; }); figFitAll(); };
    window.__lay = () => { const f = document.querySelector('#slide .tp-fig'); if (!f) return null;
      const w = f.parentElement && f.parentElement.classList.contains('tp-figl') ? f.parentElement : null;
      const st = f.querySelector('.tp-fig-stage');
      const xb = f.querySelector('[data-figx-open]'), e = xb && FIGX[xb.dataset.figxOpen];
      const pr = w && w.querySelector('.tp-figl-text');
      const er = f.querySelector('.tp-fig-err');
      return { authored: f.dataset.figPlacement || '', mode: w ? w.dataset.figLayout : null, wrapped: !!w,
        stage: st ? st.offsetWidth : 0, chrome: st ? f.offsetWidth - st.offsetWidth : 0,
        min: (e && e.b) ? figMinStageWidth(e.b) : null, prose: pr ? pr.offsetWidth : null,
        proseText: pr ? (pr.textContent || '').trim().length : 0,
        avail: (w ? w.parentElement : f.parentElement).offsetWidth,
        err: er ? er.textContent.trim() : '' }; };
  }, { L: lesson });
  const AVAIL = [1089, 916, 915, 756, 755, 700, 600, 572, 571, 480, 420];   // includes both sides of each measured transition
  const slides = await page.evaluate(() => LESSON.slides.length);
  const modeFails = [], starved = [], predFails = [];
  let contained = 0, beside = 0, stacked = 0, full = 0, checked = 0;
  for (let i = 0; i < slides; i++) for (const avail of AVAIL) {
    const r = await page.evaluate(({ i, avail }) => { go(i); window.__avail(avail); return window.__lay(); }, { i, avail });
    if (!r || !r.authored) continue;
    checked++;
    const want = expectMode(r.authored, r.avail, r.chrome, r.min);
    if (r.mode !== want) predFails.push(`slide ${i} @${avail}: resolver said "${r.mode}", predicted "${want}" (avail ${r.avail}, chrome ${r.chrome}, min ${r.min})`);
    // The contract that matters, independent of which mode was chosen: a REDUCED layout never starves the figure.
    if ((r.mode === 'contained' || r.mode === 'beside') && r.stage < r.min)
      starved.push(`slide ${i} @${avail}: kept "${r.mode}" with stage ${r.stage} < min ${r.min}`);
    if (r.mode === 'beside' && (r.prose == null || r.proseText === 0))
      modeFails.push(`slide ${i} @${avail}: "beside" without a rendered prose column`);
    if (r.mode === 'stacked' && r.prose != null && r.stage < r.avail - r.chrome - 2)
      modeFails.push(`slide ${i} @${avail}: stacked figure kept a narrow column (stage ${r.stage} of ${r.avail})`);
    if (r.mode === 'contained') contained++; else if (r.mode === 'beside') beside++;
    else if (r.mode === 'stacked') stacked++; else if (r.mode === 'full') full++;
  }
  ok('placement resolution was actually exercised', checked > 0 && contained > 0 && beside > 0 && stacked > 0 && full > 0,
    `${checked} placed renders — contained ${contained} · beside ${beside} · stacked ${stacked} · full ${full}`);
  ok('the resolved mode matches an independent prediction at every width', predFails.length === 0, predFails.slice(0, 3).join(' | '));
  ok('a reduced layout never starves the figure below its minimum stage', starved.length === 0, starved.slice(0, 3).join(' | '));
  ok('beside always has its prose, and a stacked figure recovers the width', modeFails.length === 0, modeFails.slice(0, 3).join(' | '));

  // The transition is sharp and repeatable: three identical sweeps across it, both directions.
  const sweep = await page.evaluate(() => { const seq = [];
    for (let n = 0; n < 3; n++) for (const w of [1000, 760, 756, 754, 760, 1000]) { go(3); window.__avail(w);
      const f = document.querySelector('#slide .tp-fig');
      seq.push(f.parentElement.dataset.figLayout); }
    return seq; });
  const pass1 = sweep.slice(0, 6).join(',');
  ok('repeated resize across the transition does not oscillate',
    sweep.slice(6, 12).join(',') === pass1 && sweep.slice(12, 18).join(',') === pass1, pass1);

  // Interaction state survives a beside <-> stacked transition: the figure element and its FIGX entry are the
  // same objects, not torn down and rebuilt.
  const keep = await page.evaluate(() => { go(3); window.__avail(1000);
    const f0 = document.querySelector('#slide .tp-fig'); f0.__tag = 'keep';
    const id0 = f0.querySelector('[data-figx-open]').dataset.figxOpen, e0 = FIGX[id0];
    window.__avail(600); window.__avail(1000);
    const f1 = document.querySelector('#slide .tp-fig');
    const id1 = f1.querySelector('[data-figx-open]').dataset.figxOpen;
    return { sameNode: f1.__tag === 'keep', sameId: id0 === id1, sameEntry: FIGX[id1] === e0 }; });
  ok('a beside <-> stacked transition preserves the figure and its interaction state',
    keep.sameNode && keep.sameId && keep.sameEntry, JSON.stringify(keep));

  // Errors, and the C5 behaviour that must not have changed.
  const errs2 = await page.evaluate(() => { const out = {};
    for (let i = 0; i < LESSON.slides.length; i++) { go(i); window.__avail(1089);
      const f = document.querySelector('#slide .tp-fig'); if (!f) continue;
      const bl = LESSON.slides[i].blocks[0];
      const er = f.querySelector('.tp-fig-err');
      out[i] = { authored: bl.placement === undefined ? '(omitted)' : JSON.stringify(bl.placement),
        hasText: !!(bl.text && String(bl.text).trim()), wrapped: f.parentElement.classList.contains('tp-figl'),
        attr: f.getAttribute('data-fig-placement'), err: er ? er.textContent.trim() : '' }; }
    return out; });
  const noProse = Object.values(errs2).filter((x) => x.authored === '"beside"' && !x.hasText);
  ok('`beside` with no prose reports once and falls back to the default figure', noProse.length > 0
    && noProse.every((x) => !x.wrapped && x.attr === null && /needs companion prose/.test(x.err)),
    noProse.length ? `${noProse.length} case(s), first: wrapped=${noProse[0].wrapped} attr=${noProse[0].attr}` : 'no such case in the fixture');
  const bad = Object.values(errs2).filter((x) => x.authored === '"sidebar"');
  ok('an unrecognised placement still reports and falls back (C5 behaviour unchanged)', bad.length > 0
    && bad.every((x) => !x.wrapped && x.attr === null && /is not a figure placement/.test(x.err)),
    bad.length ? `wrapped=${bad[0].wrapped} attr=${bad[0].attr}` : 'no such case in the fixture');
  const unused = Object.values(errs2).filter((x) => x.hasText && x.authored === '"contained"');
  ok('`text` outside `beside` is reported rather than silently dropped', unused.length > 0
    && unused.every((x) => /only read by placement "beside"/.test(x.err)), `${unused.length} case(s)`);
  const plain = Object.values(errs2).filter((x) => x.authored === '(omitted)');
  ok('a figure with no placement gains no wrapper', plain.length > 0 && plain.every((x) => !x.wrapped && x.attr === null),
    `${plain.length} case(s)`);
}

ok('no console errors / page errors', errs.length === 0, errs.slice(0, 3).join(' | '));

console.log(results.join('\n'));
const a = results.filter((r) => /^(PASS|FAIL)/.test(r));
console.log(a.filter((r) => r.startsWith('PASS')).length + '/' + a.length + ' passed');
await browser.close(); server.close();
