/* ── PHONE GRAPH TYPOGRAPHY · AN INVESTIGATION ───────────────────────────────────────────────────
   Asked for after the responsive review: the phone graph's labels are too small to accept as the
   standard presentation of instructional mathematics. This does not change the app. It runs the REAL
   figure engine at the REAL phone plot box, changes the declared type where the engine can see it —
   before the gutters, the viewBox and the box solve — and measures what each candidate does to the
   plane. The mathematics must come through untouched: same domain, same equal-unit scale, same point
   labels, same boundaries. Anything that moves them is reported, not accepted.

   WHY THE DECLARED SIZE IS NOT THE ANSWER ON ITS OWN. The plot is an SVG with a viewBox, painted into
   a box the composition chose, so a `font-size` inside it is in VIEWBOX UNITS and is multiplied by the
   SVG's own scale before a reader sees it. And the scale is NOT the same at every surface: the axis
   gutters are close to a fixed number of viewBox units, so a smaller plot spends proportionally more
   of its viewBox on gutter, the viewBox shrinks less than the box does, and the scale falls. That is
   why the phone is the worst case — it is the surface where the multiplier is smallest.

   THE FEEDBACK LOOP THIS HAS TO MEASURE RATHER THAN PREDICT: bigger labels need bigger gutters, bigger
   gutters mean a bigger viewBox, and a bigger viewBox means a SMALLER scale. Raising the declared size
   therefore does not raise the painted size by the same factor, and it can also change the box the
   solver settles on — which would change the composition. Both are measured below. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { openFigurePage, makePainter, makeSolvers } from './lib/figure-geometry.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FIGS = JSON.parse(fs.readFileSync(path.join(root, 'docs/atlas/worked-examples/src/figures.json'), 'utf8'));
const OUT = path.join(root, 'docs/atlas/phone-typography');
fs.mkdirSync(OUT, { recursive: true });

/* the figure the lesson actually uses for this, and the plot box the approved phone composition gives it */
const PHONE_W = 344;
/* EVERY GRAPH FIGURE IN THE REGISTRY, not just the one the review looked at — plus a deliberate worst
   case the registry does not contain. All five shipped figures put the y-axis near the middle of the
   plane, so none of them tests what happens when the numbering has to fit BESIDE the axis at the left
   edge of the plot. `left-edge-axis` is that case: a domain starting at zero, with two-digit y values
   anchored `end` just left of an axis that is itself at the boundary. If larger type breaks anywhere,
   it breaks there, so it is probed rather than assumed away. */
const SUBJECTS = Object.entries(FIGS)
  .filter(([, v]) => v && typeof v === 'object' && v.figure && v.figure.figure === 'graph')
  .map(([k, v]) => ({ key: k, spec: v.figure }));
SUBJECTS.push({ key: 'left-edge-axis', synthetic: true, spec: {
  figure: 'graph', aspect: 'stretch', grid: true,
  domain: { xMin: 0, xMax: 10, yMin: 0, yMax: 120 },
  objects: [{ type: 'function', expr: 'x*x', label: 'y = x²' }] } });

/* DECLARED sizes. `ships-today` is read from the stylesheet by rendering with no override at all. */
const CANDIDATES = [
  { id: 'ships-today', tick: null },
  { id: 'declared-13', tick: 13 },
  { id: 'declared-14', tick: 14 },
  { id: 'declared-16', tick: 16 },
];

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const figPage = await openFigurePage(browser, 'file://' + path.join(root, 'lesson-studio.html'));

/* the type rule goes in BEFORE the engine measures anything, and the label solver's reservation goes
   with it: the engine hard-codes 11px in two places — the stylesheet and `figTickBoxes`, which
   reserves tick-label boxes as obstacles for the point-label search. Moving one without the other
   would put point labels on top of enlarged numbers, so the prototype moves both. */
async function applyType(t) {
  await figPage.evaluate((tick) => {
    document.querySelectorAll('[data-phone-type]').forEach((n) => n.remove());
    if (!window.__figTickBoxes0) window.__figTickBoxes0 = window.figTickBoxes;
    if (tick == null) { window.figTickBoxes = window.__figTickBoxes0; return; }
    const st = document.createElement('style');
    st.setAttribute('data-phone-type', '1');
    /* the reference label and the point identifier move with the numbering: they are the same
       instructional register, and leaving them behind would just relocate the complaint */
    st.textContent = `.tp-slide .tp-fig-ticklabel{font-size:${tick}px;}`
      + `.tp-slide .tp-fig-reflab{font-size:${(tick + 1).toFixed(1)}px;}`
      + `.tp-slide .tp-fig-ptid{font-size:${(tick + 1.5).toFixed(1)}px;}`;
    document.head.appendChild(st);
    window.figTickBoxes = function (V, tt) {
      const D = V.dom, axisX = V.sx(Math.min(Math.max(0, D.x0), D.x1)), axisY = V.sy(Math.min(Math.max(0, D.y0), D.y1));
      const xT = figNiceTicks(D.x0, D.x1, tt || 5), yT = figNiceTicks(D.y0, D.y1, tt || 5);
      const FS = tick, H = FS * 1.15, wOf = (s) => String(s).length * FS * 0.6 + 2, boxes = [];
      /* the offsets are the engine's own, scaled by the type: 16/8/4 at 11px is 1.45/0.73/0.36 of it */
      const below = FS * 1.45, gap = FS * 0.73, mid = FS * 0.36;
      xT.ticks.forEach((v) => { const w = wOf(figFmtTick(v, xT.decimals)); boxes.push({ x: V.sx(v) - w / 2, y: axisY + below - H * 0.8, w, h: H }); });
      yT.ticks.forEach((v) => { if (Math.abs(v) < 1e-9) return; const w = wOf(figFmtTick(v, yT.decimals)); boxes.push({ x: axisX - gap - w, y: V.sy(v) + mid - H * 0.8, w, h: H }); });
      return boxes;
    };
  }, t);
}

async function measure(W, H, spec) {
  return figPage.evaluate(async ({ spec, W, H }) => {
    document.querySelectorAll('[data-probe-host]').forEach((n) => n.remove());
    const host = document.createElement('div');
    host.setAttribute('data-probe-host', '1');
    host.className = 'mx';
    host.style.cssText = `position:absolute;left:0;top:0;width:${W}px;background:#fff;`;
    host.innerHTML = `<div class="mx-part" data-mx-part="figure" data-fig-viewport
      style="position:relative;width:${W}px;height:${H}px;"><div class="mx-figstage"><div
      class="mx-figskin tp-slide"></div></div></div>`;
    document.querySelector('#slide').appendChild(host);
    host.querySelector('.mx-figskin').innerHTML = fragFigure(mxFigPolicy(spec), 'probe');
    figFitAll();
    await document.fonts.ready;
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    figFitAll();
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

    const svg = host.querySelector('.tp-fig-svg');
    const sr = svg.getBoundingClientRect();
    const vb = (svg.getAttribute('viewBox') || '0 0 1 1').split(/\s+/).map(Number);
    const scale = vb[2] ? sr.width / vb[2] : 1;
    const decl = (sel) => { const el = host.querySelector(sel); return el ? parseFloat(getComputedStyle(el).fontSize) : null; };
    const rel = (el) => { const b = el.getBoundingClientRect();
      return { x: b.x - sr.x, y: b.y - sr.y, w: b.width, h: b.height, t: (el.textContent || '').trim() }; };
    /* X AND Y TICK LABELS ARE TOLD APART BY THE ENGINE'S OWN ANCHOR, not by where they happen to sit.
       A first version split them by vertical position and reported px-per-unit 14.2 against 31.1 on a
       plane whose scale is provably equal - because when the x-axis sits at the BOTTOM of the domain,
       half the y labels fall on the wrong side of any horizontal cut. The engine emits x labels
       `middle` and y labels `end`; that is the fact, so that is the split. */
    const tickEls = [].slice.call(svg.querySelectorAll('.tp-fig-ticklabel'));
    const ticks = tickEls.map(rel);
    const anchorOf = (i) => tickEls[i].getAttribute('text-anchor');
    const refs = [].slice.call(svg.querySelectorAll('.tp-fig-reflab')).map(rel);
    const ids = [].slice.call(svg.querySelectorAll('.tp-fig-ptid')).map(rel);
    const all = [...ticks.map((o) => ({ ...o, k: 'tick' })), ...refs.map((o) => ({ ...o, k: 'ref' })),
      ...ids.map((o) => ({ ...o, k: 'ptid' }))];
    const hit = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
    const clashes = [];
    /* AND THE NEAR MISSES, because "clean" and "one pixel from a collision" are not the same report.
       If a pair that collides at larger type was already almost touching at the shipped size, the
       larger type did not cause the defect — it exposed one. */
    const gap = (a, b) => { const dx = Math.max(b.x - (a.x + a.w), a.x - (b.x + b.w), 0);
      const dy = Math.max(b.y - (a.y + a.h), a.y - (b.y + b.h), 0);
      return +Math.hypot(dx, dy).toFixed(1); };
    const near = [];
    for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) {
      if (hit(all[i], all[j])) { clashes.push(`${all[i].k}"${all[i].t}" x ${all[j].k}"${all[j].t}"`); continue; }
      if (all[i].k === 'tick' && all[j].k === 'tick') continue;
      const g = gap(all[i], all[j]);
      if (g <= 6) near.push(`${all[i].k}"${all[i].t}" ~ ${all[j].k}"${all[j].t}" ${g}px apart`);
    }
    const outside = all.filter((o) => o.x < -0.5 || o.y < -0.5 || o.x + o.w > sr.width + 0.5 || o.y + o.h > sr.height + 0.5)
      .map((o) => `${o.k}"${o.t}"`);
    /* THE MATHEMATICS, read back off the painted plane: px-per-unit on each axis from the tick
       positions themselves, and the tick VALUES, so a changed domain cannot hide behind a pretty box. */
    const v = (s) => parseFloat(s.replace('−', '-'));
    const per = (arr, key) => { const q = arr.map((o) => ({ n: v(o.t), p: o[key] })).filter((o) => isFinite(o.n));
      q.sort((a, b) => a.n - b.n); if (q.length < 2) return null;
      const d = q[q.length - 1].n - q[0].n; return d ? +Math.abs((q[q.length - 1].p - q[0].p) / d).toFixed(3) : null; };
    const xs = ticks.filter((o, i) => anchorOf(i) === 'middle');
    const ys = ticks.filter((o, i) => anchorOf(i) === 'end');
    return { svgW: Math.round(sr.width), svgH: Math.round(sr.height), viewBox: `${Math.round(vb[2])}x${Math.round(vb[3])}`,
      scale: +scale.toFixed(3),
      tickDeclared: decl('.tp-fig-ticklabel'), refDeclared: decl('.tp-fig-reflab'), idDeclared: decl('.tp-fig-ptid'),
      tickPainted: +(decl('.tp-fig-ticklabel') * scale).toFixed(1),
      refPainted: decl('.tp-fig-reflab') == null ? null : +(decl('.tp-fig-reflab') * scale).toFixed(1),
      idPainted: decl('.tp-fig-ptid') == null ? null : +(decl('.tp-fig-ptid') * scale).toFixed(1),
      tickValues: ticks.map((o) => o.t).join(' '), idTexts: ids.map((o) => o.t).join(' '),
      nTicks: ticks.length, nIds: ids.length, nRefs: refs.length,
      pxPerUnit: { x: per(xs, 'x'), y: per(ys, 'y'), nx: xs.length, ny: ys.length }, clashes, near, outside };
  }, { spec, W, H });
}

const rows = [];
for (const subj of SUBJECTS) for (const c of CANDIDATES) {
  const KEY = subj.key, spec = subj.spec;
  await applyType(c.tick);
  /* THE BOX IS RE-SOLVED FOR EVERY CANDIDATE, with a fresh painter so nothing is served from a cache
     that was filled at a different type. If bigger labels change the box the solver settles on, that
     is a change to the COMPOSITION and has to be visible here rather than discovered later. */
  const { boxForWidth } = makeSolvers(makePainter(figPage));
  let box = null, solveNote = '';
  try { box = await boxForWidth(KEY, spec, PHONE_W); } catch (e) { solveNote = String(e.message || e); }
  const H = box ? Math.round(box.box ? box.box.h : box.h) : 453;
  const m = await measure(PHONE_W, H, spec);
  rows.push({ figure: KEY, synthetic: !!subj.synthetic, ...c, solvedH: H, solveNote, ...m });
  if (KEY === 'symmetry') {
    const el = await figPage.$('[data-probe-host] .tp-fig');
    if (el) await el.screenshot({ path: path.join(OUT, `phone-type__${c.id}.png`) });
  }
}
/* THE FOUR PHONE PLANES SIDE BY SIDE, so the decision is made from the picture rather than the table.
   Same figure, same plot box, same mathematics — only the declared type differs. */
{
  const cards = CANDIDATES.map((c) => {
    const r = rows.find((x) => x.figure === 'symmetry' && x.id === c.id);
    return `<figure><figcaption>${c.id}${c.tick == null ? ' (the stylesheet as it ships)' : ''}`
      + ` — declared ${r.tickDeclared}px, <b>painted ${r.tickPainted}px</b></figcaption>`
      + `<img src="phone-type__${c.id}.png"></figure>`;
  }).join('');
  const pg = await browser.newPage({ viewport: { width: 1600, height: 1100 }, deviceScaleFactor: 1 });
  /* WRITTEN TO A FILE AND NAVIGATED TO, not handed to setContent. A page built by setContent has no
     origin, so Chromium refuses its `file://` subresources and the strip comes out with four empty
     frames — which reads as "the renders are blank" rather than "the images never loaded". */
  const docHtml = `<!doctype html><meta charset="utf-8"><style>
    body{margin:0;background:#f4f4f2;font:13px/1.5 ui-monospace,Menlo,monospace;}
    h1{margin:0;padding:14px 22px;background:#111;color:#fff;font:600 13px/1.5 ui-monospace,Menlo,monospace;letter-spacing:.05em;}
    .row{display:flex;align-items:flex-start;gap:0;padding:0 0 26px;}
    figure{margin:0;flex:0 0 auto;width:400px;padding:14px 18px;}
    figcaption{margin:0 0 10px;color:#2b3b34;}
    img{width:363px;height:auto;display:block;background:#fff;border:1px solid #dcdcd8;}
    </style><h1>PHONE GRAPH TYPOGRAPHY — symmetry at the approved 344px phone plot box; only the declared type differs</h1>
    <div class="row">${cards}</div>`;
  const docPath = path.join(OUT, '_comparison.html');
  fs.writeFileSync(docPath, docHtml);
  await pg.goto('file://' + docPath, { waitUntil: 'load' });
  await pg.evaluate(() => Promise.all([].slice.call(document.images).map((i) => i.complete ? null : new Promise((r) => { i.onload = i.onerror = r; }))));
  await pg.waitForTimeout(150);
  const bb = await (await pg.$('body')).boundingBox();
  await pg.setViewportSize({ width: Math.ceil(bb.width), height: Math.ceil(bb.height) + 4 });
  await pg.waitForTimeout(120);
  await pg.screenshot({ path: path.join(OUT, 'PHONE-TYPE__comparison.png'), fullPage: true });
  await pg.close();
  fs.unlinkSync(docPath);
}
await browser.close();

const f = (x, n = 6) => String(x).padStart(n);
console.log(`\nPHONE GRAPH TYPOGRAPHY — every graph figure at the approved phone plot width of ${PHONE_W}px\n`);
console.log('  figure                  candidate      declared  painted   scale  solvedH  viewBox      verdict');
for (const r of rows) {
  const bad = r.clashes.length || r.outside.length || r.solveNote;
  console.log(`  ${(r.figure + (r.synthetic ? ' *' : '')).padEnd(22)} ${r.id.padEnd(13)} `
    + `${f(r.tickDeclared, 8)} ${f(r.tickPainted, 8)} ${f(r.scale, 7)} ${f(r.solvedH, 7)}  ${String(r.viewBox).padEnd(11)} `
    + `${bad ? 'FAILS' : 'clean'}`);
  if (r.clashes.length) console.log(`      COLLISIONS: ${r.clashes.slice(0, 3).join(' | ')}`);
  if ((r.near || []).length) console.log(`      NEAR MISS: ${r.near.slice(0, 3).join(' | ')}`);
  if (r.outside.length) console.log(`      OUTSIDE THE PLOT: ${r.outside.slice(0, 4).join(', ')}`);
  if (r.solveNote) console.log(`      SOLVER: ${r.solveNote}`);
}
console.log('\n  * = a probe, not a shipped figure: the y-axis at the left edge with two-digit numbering.');
console.log('\nDID THE MATHEMATICS MOVE? each figure\'s ticks and point labels, across the candidates');
{
  const byFig = new Map();
  for (const r of rows) { if (!byFig.has(r.figure)) byFig.set(r.figure, []); byFig.get(r.figure).push(r); }
  for (const [k, list] of byFig) {
    const ticks = new Set(list.map((r) => r.tickValues));
    const ids = new Set(list.map((r) => r.idTexts));
    const hs = new Set(list.map((r) => r.solvedH));
    const vbs = new Set(list.map((r) => r.viewBox));
    const same = ticks.size === 1 && ids.size === 1 && hs.size === 1 && vbs.size === 1;
    console.log(`  ${k.padEnd(22)} ${same ? 'UNCHANGED' : 'MOVED'} — ticks ${ticks.size}, point labels ${ids.size}, `
      + `solved height ${[...hs].join('/')}, viewBox ${[...vbs].join('/')}`);
    if (!same) { console.log(`      ticks: ${[...ticks].join('  VS  ')}`); console.log(`      labels: ${[...ids].join('  VS  ')}`); }
  }
}
fs.writeFileSync(path.join(OUT, 'phone-typography.json'), JSON.stringify(rows, null, 2) + '\n');
console.log(`\nwrote ${path.relative(root, OUT)}`);
