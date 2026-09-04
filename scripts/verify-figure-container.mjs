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
// figMinHost(), because the floor is the CONTRACT under assertion, not a derived result - a copy pinned here
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
const FLOOR = 11, PRIMARY_MIN = 12, CEIL = 15;
const SUBORDINATE = new Set(['tp-fig-gunit']);

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

// -- in-page helpers, installed once ---------------------------------------------------------------------
await page.evaluate(() => {
  window.__T = { calls: 0, repaints: 0 };
  const orig = figInlineSolve;
  figInlineSolve = function (f) { window.__T.calls++; const r = orig(f); if (r) window.__T.repaints++; return r; };
  window.__load = (L, theme) => { LESSON = JSON.parse(JSON.stringify(L)); LESSON.meta.theme = theme;
    document.documentElement.dataset.theme = theme; go(0); return LESSON.slides.length; };
  window.__figs = () => [...document.querySelectorAll('#slide .tp-fig[data-fig-fit]')];
  /* Drive the STAGE width, not the parent's. figInlineSolve measures `.tp-fig-stage`, and the shell's padding
     and border sit between the two (~26px), so setting the parent to the floor would test a stage ~26px BELOW
     it - which is how the first draft of this file reported a relaxed dart "at 420" that was really at 394.
     Set the parent, read the stage back, correct once for the chrome, and verify the target was hit. */
  window.__host = (px) => { const figs = window.__figs();
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
  const floor = await page.evaluate((k) => figMinHost({ figure: k }), fx.kind);   // the CONTRACT, from the app
  const hosts = [1089, 700, 530, floor + 40, floor];                              // widest .. exactly the floor
  const short = path.basename(fx.file);
  for (const theme of THEMES[fx.kind]) {
    let lo = { px: Infinity }, hi = { px: -Infinity }, texts = 0, renders = 0;
    const band = [], contain = [], relax = [];
    const slides = await page.evaluate(({ L, t }) => window.__load(L, t), { L: lesson, t: theme });
    for (const host of hosts) {
      for (let i = 0; i < slides; i++) {
        const r = await page.evaluate(({ i, host }) => { go(i); const widths = window.__host(host);
          return { rows: window.__text(), bad: window.__containment(), rel: window.__relaxed(),
                   n: window.__figs().length, widths };
        }, { i, host });
        // The stage really is at the width this row claims - otherwise every number below is about a
        // different figure than the one named, which is exactly the defect this guard was added for.
        const offBy = r.widths.filter((w) => Math.abs(w - host) > 1.5);
        if (offBy.length) ok(`${path.basename(fx.file)} - ${theme} - stage width honoured at ${host}`, false, `got ${offBy.join(', ')}`);
        renders += r.n; texts += r.rows.length;
        for (const t of r.rows) {
          seenClasses.add(t.cls);
          if (t.px < lo.px) lo = { ...t, host, slide: i };
          if (t.px > hi.px) hi = { ...t, host, slide: i };
          if (t.px < FLOOR - 1e-6) band.push(`${t.cls} "${t.txt}" ${t.px.toFixed(2)}px < ${FLOOR} floor (host ${host}, slide ${i})`);
          else if (!SUBORDINATE.has(t.cls) && (t.px < PRIMARY_MIN - 1e-6 || t.px > CEIL + 1e-6))
            band.push(`${t.cls} "${t.txt}" ${t.px.toFixed(2)}px outside ${PRIMARY_MIN}-${CEIL} (host ${host}, slide ${i})`);
        }
        r.bad.forEach((b) => contain.push(`"${b.txt}" spills ${b.over}px (host ${host}, slide ${i})`));
        r.rel.forEach((t) => relax.push(`"${t}" at host ${host} (slide ${i})`));
      }
    }
    const tag = `${short} - ${theme}`;
    ok(`${tag} - annotations were actually measured`, texts > 0 && renders > 0, `${renders} figure renders - ${texts} text nodes`);
    ok(`${tag} - every annotation inside the logical-px band`, band.length === 0,
      band.length ? band.slice(0, 3).join(' | ') : `min ${lo.px.toFixed(2)} ${lo.cls} - max ${hi.px.toFixed(2)} ${hi.cls}`);
    ok(`${tag} - measurement text stays inside its own surface`, contain.length === 0, contain.slice(0, 3).join(' | '));
    if (fx.kind === 'geometry')
      ok(`${tag} - no Stage 3c relaxed placement at or above the ${floor}px geometry floor`, relax.length === 0, relax.slice(0, 3).join(' | '));
    note(`${tag}: smallest ${lo.px.toFixed(2)}px ${lo.cls} "${lo.txt}" @host ${lo.host} slide ${lo.slide} - largest ${hi.px.toFixed(2)}px ${hi.cls} "${hi.txt}" @host ${hi.host} slide ${hi.slide}`);
  }
}
ok('every inline text class was exercised', seenClasses.size >= 10, `${seenClasses.size} classes: ${[...seenClasses].sort().join(' ')}`);

/* THE FLOOR IS LOAD-BEARING. A floor that nothing ever needed would be decoration, and a green run would say
   nothing. Below it, the dense fixtures MUST relax - that is the measured reason 420 exists. */
{
  const lesson = JSON.parse(fs.readFileSync(path.join(root, 'tests/visual/lessons/figure-geometry-baseline.json'), 'utf8'));
  const floor = await page.evaluate(() => figMinHost({ figure: 'geometry' }));
  const slides = await page.evaluate(({ L }) => window.__load(L, 'mathematics'), { L: lesson });
  let below = 0;
  for (let i = 0; i < slides; i++) {
    const rel = await page.evaluate(({ i, host }) => { go(i); window.__host(host); return window.__relaxed(); }, { i, host: floor - 90 });   // stage width, per __host
    below += rel.length;
  }
  ok(`the ${floor}px geometry floor is load-bearing (dense figures DO relax below it)`, below > 0,
    `${below} relaxed labels at host ${floor - 90}, none at or above ${floor}`);
}

/* == E: MOUNT, OBSERVER AND REFLOW INVARIANTS =============================================================
   The C2 re-solve is a DOM mutation on an already-wired slide, which is the part of it that can go wrong
   quietly: the callout hit-targets and dialogs carry per-element listeners collected once by wirePackTyped,
   so re-emitting them would leave dead buttons on the focus rail with nothing visibly broken until a learner
   taps one. These assertions pin the lifecycle rather than the pixels. */
{
  const graph = JSON.parse(fs.readFileSync(path.join(root, 'tests/visual/lessons/figure-graph-baseline.json'), 'utf8'));
  const geo = JSON.parse(fs.readFileSync(path.join(root, 'tests/visual/lessons/figure-geometry-baseline.json'), 'utf8'));

  // E1/E2 - the observer is installed once, and a re-solve at an unchanged host is a no-op.
  const idem = await page.evaluate(({ L }) => {
    window.__load(L, 'mathematics'); window.__host(700);
    const before = _figRO; setupFigureObserver(); setupFigureObserver();
    const sameRO = _figRO === before;
    const c0 = window.__T.repaints; figFitAll(); figFitAll(); figFitAll();
    return { sameRO, extra: window.__T.repaints - c0, figs: window.__figs().length };
  }, { L: graph });
  ok('observer setup is idempotent across repeated calls', idem.sameRO, 'setupFigureObserver() re-entered without replacing the observer');
  ok('a re-solve at an unchanged host does no work', idem.extra === 0, `${idem.extra} repaints from 3 extra figFitAll() passes over ${idem.figs} figures`);

  // E3/E4 - only the <svg> is replaced; the callout nodes keep their identity and move.
  const swap = await page.evaluate(({ L }) => {
    window.__load(L, 'mathematics');
    let slide = -1, n = 0;
    for (let i = 0; i < LESSON.slides.length; i++) { go(i); window.__host(700);
      n = document.querySelectorAll('#slide .tp-fig-hit').length; if (n > 0) { slide = i; break; } }
    if (slide < 0) return { none: true };
    const stage = document.querySelector('#slide .tp-fig-stage');
    const svg0 = stage.querySelector('.tp-fig-svg');
    const hits = [...stage.querySelectorAll('.tp-fig-hit')], cos = [...stage.querySelectorAll('.tp-fig-callout')];
    hits.forEach((h, j) => { h.__tag = 'hit' + j; }); cos.forEach((c, j) => { c.__tag = 'co' + j; });
    const left0 = hits.map((h) => h.style.left);
    window.__host(460);
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
    await page.evaluate(({ L, slide }) => { window.__load(L, 'mathematics'); go(slide); window.__host(700); window.__host(460); }, { L: graph, slide: swap.slide });
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
    window.__host(700);
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
    window.__load(L, 'mathematics'); go(0); window.__host(700);
    window.__host(460);
    const a = window.__T.repaints;
    await new Promise((r) => setTimeout(r, 500));
    return { grew: window.__T.repaints - a };
  }, { L: graph });
  ok('a resize does not feed the observer back into itself', loop.grew === 0, `${loop.grew} further repaints in the 500ms after the resize settled`);

  // E8 - wide -> narrow -> wide is deterministic.
  const det = await page.evaluate(({ L }) => {
    window.__load(L, 'mathematics'); go(0);
    window.__host(700); const a = window.__sig();
    window.__host(460); const mid = window.__sig();
    window.__host(700); const b = window.__sig();
    return { same: a === b, changed: a !== mid };
  }, { L: graph });
  ok('wide -> narrow -> wide returns identical figure DOM', det.same);
  ok('...and the narrow state really was different (the round trip was not a no-op)', det.changed);

  // E9 - a callout-count mismatch bails BEFORE mutating. Proving no corruption is the whole requirement here;
  // Stage 4 deliberately builds no user-facing error path for it.
  if (!swap.none) {
    const bail = await page.evaluate(({ L, slide }) => {
      window.__load(L, 'mathematics'); go(slide); window.__host(700);
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

ok('no console errors / page errors', errs.length === 0, errs.slice(0, 3).join(' | '));

console.log(results.join('\n'));
const a = results.filter((r) => /^(PASS|FAIL)/.test(r));
console.log(a.filter((r) => r.startsWith('PASS')).length + '/' + a.length + ' passed');
await browser.close(); server.close();
