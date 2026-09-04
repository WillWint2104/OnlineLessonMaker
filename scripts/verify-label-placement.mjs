import { chromium } from 'playwright';
import { readFileSync } from 'fs';

// STAGE 2c — figure label placement.
//
// Asserts the placement CONTRACT as a property, not against tuned numbers:
//   1. CLEARANCE is a hard gate — every identifier clears every axis, curve, chord, marker, other identifier
//      and printed tick label by >= FIG_GAP, and sits fully on canvas.
//   2. NEAREST LEGAL — the placed position is the one with the smallest displacement from its own marker among
//      ALL positions in the candidate space that satisfy (1). Checked by re-enumerating the whole space with a
//      plain reference search (no pruning, no early exit) against the same obstacle set that was live when the
//      identifier was placed, and comparing displacements.
//   3. DETERMINISTIC — the same figure solved repeatedly produces byte-identical placements.
//   4. The directional search RESOLVES every fixture: figScanPill (the exhaustive correctness fallback) does not
//      fire, and no identifier falls through to the unplaced state.
//
// Run TWICE over every figure: once at the inline 520x360 box, and once through the FOCUSED workspace at four
// viewports x all five tick densities (FIGX_TICKS). The focused pass is not a formality — the box is a measured
// viewport rather than a constant, and the tick target decides which numbers are reserved, so a label-to-tick
// collision or a non-nearest position can exist there and nowhere else. It reads the identifiers back out of the
// PAINTED SVG and recovers their boxes, so it asserts what is actually on screen, and it builds its reference
// obstacles from the configuration that is live at that moment (e.box, e.st.tt, the axis-name arms).
//
// Fixtures: tests/visual/lessons/figure-labels-baseline.json (isolated · on the axes and tick values · on
// curves and chords · at the viewport edges · long identifiers) and figure-graph-baseline.json (the crowded
// plane, plus the V-at-the-origin case raised at the UI-1 visual review).
const BASE = process.env.BASE || 'http://localhost:8099';
const URL = `${BASE}/lesson-studio.html`;
const FILES = ['tests/visual/lessons/figure-labels-baseline.json', 'tests/visual/lessons/figure-graph-baseline.json',
  'tests/visual/lessons/composable-page-baseline.json'];   // its `figure` block is free coverage — a graph inside a real page
const VIEWPORTS = [[1440, 900], [1024, 768], [834, 1112], [390, 844]];   // the set the other figure contracts use

// CHROMIUM_PATH is an escape hatch for sandboxes that ship a prebuilt Chromium instead of Playwright's own
// download; unset (CI, and a normal `npx playwright install chromium` checkout) it launches exactly as the
// other verify-*.mjs scripts do.
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errs = [];
page.on('pageerror', (e) => errs.push(String(e)));
// The app declares no <link rel="icon">, so any static server logs one automatic /favicon.ico 404. That is the
// harness, not the page — every other request must still succeed.
page.on('console', (m) => { if (m.type() === 'error' && !/favicon\.ico/.test(m.location().url || '')) errs.push(m.text()); });
await page.goto(URL, { waitUntil: 'load' });

const results = [];
const ok = (n, c, extra = '') => { results.push(`${c ? '✓' : '✗'} ${n}${extra ? '  ' + extra : ''}`); if (!c) process.exitCode = 1; };

for (const file of FILES) {
  const lesson = JSON.parse(readFileSync(file, 'utf8'));
  const report = await page.evaluate((L) => {
    const box = { W: 520, H: 360, padL: 40, padR: 18, padT: 16, padB: 30 };   // FIG_BOX0 — fragFigure's FIRST-PASS box. Since Stage 4 the painted inline box is re-solved from the host (figFitBox), so this is a fixed REFERENCE box for the solver property, not the box the app ends up painting. Contract 10 owns the painted one.
    const SHIFTS = [0, 14, -14, 28, -28, 42, -42, 56, -56];                   // must mirror figPlacePill's own list
    // Reference search: every candidate, no pruning, no early exit — the nearest that clears by >= gap.
    const nearestLegal = (ax, ay, size, pd, obst, gap, bounds) => {
      const { w, h } = size, dirs = figDirs(pd);
      let bd = Infinity;
      for (let d = gap; d <= 340; d += 8) for (const [ux, uy] of dirs) {
        const perp = [-uy, ux];
        for (const s of SHIFTS) {
          const cx = ax + ux * (d + w / 2) + perp[0] * s, cy = ay + uy * (d + h / 2) + perp[1] * s;
          const b = { x: cx - w / 2, y: cy - h / 2, w, h };
          if (Math.max(0, 2 - b.x, 2 - b.y, b.x + b.w - (bounds.W - 2), b.y + b.h - (bounds.H - 2)) > 0) continue;
          if (figClear(b, obst) < gap) continue;
          const disp = Math.hypot(cx - ax, cy - ay);
          if (disp < bd) bd = disp;
        }
      }
      return bd;
    };
    const figs = [];
    L.slides.forEach((s) => (s.blocks || []).forEach((b) => { if (b.type === 'figure') figs.push(b); }));
    return figs.map((b) => {
      const M = figGraph(b, box), V = M.V, bounds = { W: box.W, H: box.H };
      const sig = JSON.stringify(M.layout.map((L2) => [L2.p.id, L2.box]));
      const again = JSON.stringify(figGraph(b, box).layout.map((L2) => [L2.p.id, L2.box]));
      const furn = figTickBoxes(V, 5), o = figObstacles(M.pts, V, M.painted);
      // Replay figLayoutPills' sequence so each identifier is judged against the obstacles IT actually faced.
      const placed = [], out = [];
      M.layout.forEach((L2) => {
        const obst = { arms: o.arms, pts: o.pts, boxes: furn.concat(placed) };
        const size = figPillSize(L2.p.id), pd = figPrimaryDir(L2.px, o.axisX);
        const disp = Math.hypot(L2.box.x + L2.box.w / 2 - L2.px, L2.box.y + L2.box.h / 2 - L2.py);
        const off = Math.max(0, 2 - L2.box.x, 2 - L2.box.y, L2.box.x + L2.box.w - (bounds.W - 2), L2.box.y + L2.box.h - (bounds.H - 2));
        out.push({
          id: L2.p.id, via: L2.via, valid: L2.valid, disp, onCanvas: off <= 0,
          clear: figClear(L2.box, obst),
          tickClear: furn.length ? Math.min(...furn.map((f) => figBoxBox(L2.box, f))) : Infinity,
          nearest: nearestLegal(L2.px, L2.py, size, pd, obst, FIG_GAP, bounds),
        });
        placed.push(L2.box);
      });
      return { title: b.title, gap: FIG_GAP, stable: sig === again, pills: out };
    });
  }, lesson);

  const name = file.split('/').pop();
  for (const f of report) {
    const t = `${name} · ${String(f.title).slice(0, 46)}`;
    const n = f.pills.length;
    const worstClear = Math.min(...f.pills.map((p) => p.clear));
    const worstTick = Math.min(...f.pills.map((p) => p.tickClear));
    const offCanvas = f.pills.filter((p) => !p.onCanvas);
    // 2 — nearest-legal only constrains the directional search; figScanPill is a correctness fallback.
    const ranked = f.pills.filter((p) => p.via === 'dir');
    const notNearest = ranked.filter((p) => p.disp > p.nearest + 1e-6);
    const maxDisp = Math.max(...f.pills.map((p) => p.disp));
    ok(`${t} — clearance >= GAP (${f.gap})`, worstClear >= f.gap - 1e-9, `worst ${worstClear.toFixed(1)} over ${n}`);
    ok(`${t} — clears the printed tick labels`, worstTick >= f.gap - 1e-9, `worst ${worstTick.toFixed(1)}`);
    ok(`${t} — every identifier on canvas`, offCanvas.length === 0, offCanvas.map((p) => p.id).join(',') || 'all');
    ok(`${t} — nearest legal position`, notNearest.length === 0,
      notNearest.length ? notNearest.map((p) => `${p.id} ${p.disp.toFixed(1)} vs ${p.nearest.toFixed(1)}`).join(' · ') : `max displacement ${maxDisp.toFixed(1)}`);
    ok(`${t} — directional search resolved every identifier`, f.pills.every((p) => p.via === 'dir' && p.valid), f.pills.filter((p) => p.via !== 'dir').map((p) => `${p.id}:${p.via}`).join(',') || `${n}/${n} via dir`);
    ok(`${t} — deterministic across solves`, f.stable);
  }
}

// ── PASS B — the FOCUSED workspace, every viewport x every tick density ────────────────────────────────────
// figxPaint solves through a MEASURED box and reserves the numbering at the density Options is set to, so both
// inputs to placement differ from the inline pass. Reads the painted identifiers back out of the SVG.
const FOCUS_FILES = ['tests/visual/lessons/figure-graph-baseline.json', 'tests/visual/lessons/figure-labels-baseline.json'];
for (const [vw, vh] of VIEWPORTS) {
  const fp = await browser.newPage({ viewport: { width: vw, height: vh } });
  const ferrs = [];
  fp.on('pageerror', (e) => ferrs.push(String(e)));
  fp.on('console', (m) => { if (m.type() === 'error' && !/favicon\.ico/.test(m.location().url || '')) ferrs.push(m.text()); });
  await fp.goto(URL, { waitUntil: 'load' });
  for (const file of FOCUS_FILES) {
    const lesson = JSON.parse(readFileSync(file, 'utf8'));
    for (let si = 0; si < lesson.slides.length; si++) {
      if (!(lesson.slides[si].blocks || []).some((b) => b.type === 'figure')) continue;
      await fp.evaluate(({ d, i }) => { LESSON = d; cur = i; TP_RUNTIME = {}; render(); }, { d: lesson, i: si });
      await fp.click('.tp-fig-expand');
      await fp.waitForTimeout(320);
      await fp.click('.tp-figx-optsbtn');            // Tick density lives behind Options (progressive disclosure)
      await fp.waitForTimeout(160);
      const densities = await fp.$$eval('[data-figx-tt] option', (o) => o.map((x) => x.value));
      for (const tt of densities) {
        await fp.selectOption('[data-figx-tt]', tt);
        await fp.waitForTimeout(220);
        const r = await fp.evaluate(() => {
          const SHIFTS = [0, 14, -14, 28, -28, 42, -42, 56, -56];
          const nearestLegal = (ax, ay, size, pd, obst, gap, bounds) => {
            const { w, h } = size, dirs = figDirs(pd); let bd = Infinity;
            for (let d = gap; d <= 340; d += 8) for (const [ux, uy] of dirs) { const perp = [-uy, ux];
              for (const sh of SHIFTS) {
                const cx = ax + ux * (d + w / 2) + perp[0] * sh, cy = ay + uy * (d + h / 2) + perp[1] * sh;
                const b = { x: cx - w / 2, y: cy - h / 2, w, h };
                if (Math.max(0, 2 - b.x, 2 - b.y, b.x + b.w - (bounds.W - 2), b.y + b.h - (bounds.H - 2)) > 0) continue;
                if (figClear(b, obst) < gap) continue;
                const disp = Math.hypot(cx - ax, cy - ay); if (disp < bd) bd = disp;
              } }
            return bd;
          };
          // FIGX accumulates every registered figure across renders, so key [0] is not necessarily the OPEN one.
          // Read the id off the panel that is actually reparented into the body-level focus root.
          const pel = document.querySelector('#figfocus [data-figx]');
          if (!pel) return { err: 'no panel in #figfocus' };
          const xid = pel.getAttribute('data-figx'), e = FIGX[xid], M = e && e.M;
          if (!M) return { err: 'no solved model for ' + xid };
          const svg = pel.querySelector('[data-figx-svg]');
          const marks = [...svg.querySelectorAll('.tp-fig-pt')], texts = [...svg.querySelectorAll('.tp-fig-ptid')];
          // Recover each identifier's collision BOX from what was painted: figPill draws the text at the box
          // centre, dropped by FIG_LABFS*0.35, and the box is figPillSize(id). Exact inverse, no re-derivation.
          const painted = texts.map((t) => { const id = t.textContent, sz = figPillSize(id);
            const cx = +t.getAttribute('x'), cy = +t.getAttribute('y') - FIG_LABFS * 0.35;
            return { id, box: { x: cx - sz.w / 2, y: cy - sz.h / 2, w: sz.w, h: sz.h }, size: sz }; });
          const furn = figTickBoxes(M.V, e.st.tt), nm = e.st.names ? figxNameArms(M.V, e.box) : [];
          const o = figObstacles(M.pts, M.V, (M.painted || []).concat(nm));
          const bounds = { W: e.box.W, H: e.box.H };
          const byId = Object.create(null); M.pts.forEach((p) => { byId[p.id] = p; });
          const placed = [], out = [];
          for (const pn of painted) {
            const p = byId[pn.id]; if (!p) return { err: 'painted identifier ' + pn.id + ' has no point' };
            const px = M.V.sx(p.x), py = M.V.sy(p.y);
            const obst = { arms: o.arms, pts: o.pts, boxes: furn.concat(placed) };
            const off = Math.max(0, 2 - pn.box.x, 2 - pn.box.y, pn.box.x + pn.box.w - (bounds.W - 2), pn.box.y + pn.box.h - (bounds.H - 2));
            out.push({ id: pn.id, onCanvas: off <= 0, clear: figClear(pn.box, obst),
              tickClear: furn.length ? Math.min(...furn.map((f) => figBoxBox(pn.box, f))) : Infinity,
              disp: Math.hypot(pn.box.x + pn.box.w / 2 - px, pn.box.y + pn.box.h / 2 - py),
              nearest: nearestLegal(px, py, pn.size, figPrimaryDir(px, o.axisX), obst, FIG_GAP, bounds) });
            placed.push(pn.box);
          }
          const sigOf = () => JSON.stringify(figLayoutPills(M.pts, M.V, e.box, (M.painted || []).concat(nm), furn).map((L2) => [L2.p.id, L2.box]));
          return { tt: e.st.tt, box: e.box.W + 'x' + e.box.H, marks: marks.length, texts: texts.length,
            stable: sigOf() === sigOf(), pills: out };
        });
        const t = `${vw}×${vh} · ${file.split('/').pop().replace('-baseline.json', '')} s${si} · ≈${tt} ticks`;
        if (r.err) { ok(t, false, r.err); continue; }
        const worstClear = Math.min(...r.pills.map((p) => p.clear));
        const worstTick = Math.min(...r.pills.map((p) => p.tickClear));
        // These boxes are recovered from the PAINTED SVG, and figNum serialises coordinates at 3dp — so a
        // recovered centre is within 0.0005 per axis of the solver's own, and a displacement within ~0.001.
        // EPS is that round-trip precision, not a tolerance on the contract: the inline pass above compares
        // solver values directly and uses none. Anything a real placement bug moves is orders of magnitude bigger.
        const EPS = 0.005;
        const notNearest = r.pills.filter((p) => p.disp > p.nearest + EPS);
        ok(`${t} — clears everything incl. tick labels`, worstClear >= 6 - EPS && worstTick >= 6 - EPS,
          `clear ${worstClear.toFixed(1)} · tick ${worstTick.toFixed(1)} · box ${r.box}`);
        ok(`${t} — on canvas, one identifier per marker`, r.pills.every((p) => p.onCanvas) && r.marks === r.texts,
          `${r.texts} ids / ${r.marks} markers`);
        ok(`${t} — nearest legal position`, notNearest.length === 0,
          notNearest.length ? notNearest.map((p) => `${p.id} ${p.disp.toFixed(1)} vs ${p.nearest.toFixed(1)}`).join(' · ')
            : `max displacement ${Math.max(...r.pills.map((p) => p.disp)).toFixed(1)}`);
        ok(`${t} — deterministic`, r.stable);
      }
      await fp.keyboard.press('Escape');
      await fp.waitForTimeout(200);
    }
  }
  ok(`${vw}×${vh} — no console errors in the focused workspace`, ferrs.length === 0, ferrs.slice(0, 2).join(' | '));
  await fp.close();
}

/* ══ STAGE 2c FOR GEOMETRY — added at Stage 4 ══════════════════════════════════════════════════════════
   Stage 2c's note said Stage 3 owed a review of the geometry crowded/long cases. Checked at Stage 4 planning:
   the fixtures exist and verify-geometry-semantics asserts every anchor in them — but that gate owns SEMANTIC
   LEGALITY (is this position still in its allowed region?), which is a different question from the property
   this file owns (among the positions that are legal, did the search take the NEAREST, or did it drift?).
   No geometry figure was asserted for nearest-legal anywhere. Stage 4 makes that a live dependency rather than
   historical debt, because container-aware sizing deliberately feeds geometry a different box, so the whole
   candidate space moves with the host.

   INDEPENDENCE. Everything that decides the verdict is re-derived here: the region predicates from raw
   coordinates, box/segment clearance from scratch, and the candidate space enumerated with NO pruning and no
   early exit. figPlacePill, figScanPill, figGeomPlace, figClear, figBoxSeg and figDirs are never called.
   What IS taken from the model is the figure and the schedule — M.arms / M.vpts (the drawn geometry), each
   label's anchor and reserved size, and the order labels were placed in. Those are the INPUTS to the property;
   asserting them is Stage 3's job and verify-geometry-semantics's. The question here is: given this figure and
   this order, is the chosen position the nearest legal one?

   The candidate space is well defined without knowing the engine's primary direction: figDirs returns a FIXED
   set of eight directions and only SORTS it by agreement with pd, so the SET of candidates is pd-independent
   and only tie-breaking is not. The reference enumerates all eight.

   The property is two-sided, which is what stops it being vacuous when the directional search finds nothing:
     · the directional space admits a legal candidate  ⇒ the label must be placed AT that minimum displacement
     · it admits none                                  ⇒ the label must NOT have been placed directionally
   so a figure whose labels all fall through to the exhaustive scan cannot pass by having nothing to check. */
const GEO_FILES = ['tests/visual/lessons/figure-geometry-baseline.json',
                   'tests/visual/lessons/figure-measure-surface.json'];   // the crowded/long/dense cases the Stage 2c note named, plus Stage 3d's density ceiling
/* Three boxes across the range Stage 4 now feeds geometry. The two narrow ones are taken from figFitBox itself
   so they are the boxes the app really paints at those hosts — the box is an INPUT to the property, not the
   thing under test, and pinning copies of it here would rot the moment figFitBox changed. */
const GEO_HOSTS = [null, 530, 340];                                       // null → FIG_BOX0, the reference box
const geoLessons = Object.fromEntries(GEO_FILES.map((f) => [f, JSON.parse(readFileSync(f, 'utf8'))]));
const geoOut = await page.evaluate(({ files, hosts, lessons }) => {
  // ── region predicates, re-derived from raw geometry (same derivations as verify-geometry-semantics) ──
  const inPoly = (ring, x, y) => { let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) { const [ax, ay] = ring[i], [bx, by] = ring[j];
      if (((ay > y) !== (by > y)) && (x < (bx - ax) * (y - ay) / ((by - ay) || 1e-12) + ax)) inside = !inside; }
    return inside; };
  const wrapPi = (a) => { const t = Math.atan2(Math.sin(a), Math.cos(a)); return t < -Math.PI + 1e-9 ? Math.PI : t; };
  const inWedge = (v, p, q, x, y) => { const al = Math.atan2(p[1] - v[1], p[0] - v[0]), be = Math.atan2(q[1] - v[1], q[0] - v[0]);
    const d = wrapPi(be - al), rel = wrapPi(Math.atan2(y - v[1], x - v[0]) - al), e = 1e-7;
    return d >= 0 ? (rel >= -e && rel <= d + e) : (rel <= e && rel >= d - e); };
  const outHalf = (a, b, ring, x, y) => { const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
    const ex = b[0] - a[0], ey = b[1] - a[1], m = Math.hypot(ex, ey) || 1; let nx = -ey / m, ny = ex / m;
    if (ring && inPoly(ring, mx + nx * 4, my + ny * 4)) { nx = -nx; ny = -ny; }
    return (x - mx) * nx + (y - my) * ny > 0; };
  const regionFor = (S) => {
    if (!S) return null;
    if (S.k === 'angle') return (x, y) => inWedge(S.v, S.p, S.q, x, y) && (!S.ring || inPoly(S.ring, x, y));
    if (S.k === 'side')  return (x, y) => outHalf(S.a, S.b, S.ring, x, y);
    if (S.k === 'vertex') return (x, y) => !(S.ring && inPoly(S.ring, x, y));
    return null; };
  // ── clearance, re-implemented (never figClear/figBoxSeg) ──
  const segSeg = (ax, ay, bx, by, cx, cy, dx, dy) => {
    const d1x = bx - ax, d1y = by - ay, d2x = dx - cx, d2y = dy - cy, den = d1x * d2y - d1y * d2x;
    if (Math.abs(den) > 1e-12) { const t = ((cx - ax) * d2y - (cy - ay) * d2x) / den, u = ((cx - ax) * d1y - (cy - ay) * d1x) / den;
      if (t >= 0 && t <= 1 && u >= 0 && u <= 1) return 0; }
    const ptSeg = (px, py, x1, y1, x2, y2) => { const vx = x2 - x1, vy = y2 - y1, L = vx * vx + vy * vy;
      const t = L ? Math.max(0, Math.min(1, ((px - x1) * vx + (py - y1) * vy) / L)) : 0;
      return Math.hypot(px - (x1 + t * vx), py - (y1 + t * vy)); };
    return Math.min(ptSeg(ax, ay, cx, cy, dx, dy), ptSeg(bx, by, cx, cy, dx, dy), ptSeg(cx, cy, ax, ay, bx, by), ptSeg(dx, dy, ax, ay, bx, by)); };
  const boxSeg = (b, ax, ay, bx2, by2) => { const inB = (px, py) => px >= b.x && px <= b.x + b.w && py >= b.y && py <= b.y + b.h;
    if (inB(ax, ay) || inB(bx2, by2)) return 0;
    const E = [[b.x, b.y, b.x + b.w, b.y], [b.x + b.w, b.y, b.x + b.w, b.y + b.h], [b.x + b.w, b.y + b.h, b.x, b.y + b.h], [b.x, b.y + b.h, b.x, b.y]];
    let m = Infinity; for (const e of E) m = Math.min(m, segSeg(ax, ay, bx2, by2, e[0], e[1], e[2], e[3])); return m; };
  const boxPt = (b, px, py) => { const cx = Math.max(b.x, Math.min(px, b.x + b.w)), cy = Math.max(b.y, Math.min(py, b.y + b.h)); return Math.hypot(px - cx, py - cy); };
  const boxBox = (a, b) => { const dx = Math.max(0, a.x - (b.x + b.w), b.x - (a.x + a.w)), dy = Math.max(0, a.y - (b.y + b.h), b.y - (a.y + a.h)); return Math.hypot(dx, dy); };
  const clearOf = (box, arms, pts, boxes) => { let m = Infinity;
    for (const s of arms) m = Math.min(m, boxSeg(box, s[0], s[1], s[2], s[3]));
    for (const p of pts) m = Math.min(m, boxPt(box, p[0], p[1]) - (p[2] || 0));
    for (const q of boxes) m = Math.min(m, boxBox(box, q));
    return m; };
  // ── the candidate space, enumerated with NO pruning and no early exit ──
  const GAP = 6;
  const DIRS = [[1, -1], [-1, -1], [1, 1], [-1, 1], [1, 0], [-1, 0], [0, -1], [0, 1]].map(([x, y]) => { const n = Math.hypot(x, y); return [x / n, y / n]; });
  const SHIFTS = [0, 14, -14, 28, -28, 42, -42, 56, -56];
  const refNearest = (ax, ay, w, h, arms, pts, boxes, ok, W, H) => { let best = Infinity;
    for (let d = GAP; d <= 340; d += 8) for (const [ux, uy] of DIRS) { const px = -uy, py = ux;
      for (const s of SHIFTS) { const cx = ax + ux * (d + w / 2) + px * s, cy = ay + uy * (d + h / 2) + py * s;
        if (ok && !ok(cx, cy)) continue;
        const box = { x: cx - w / 2, y: cy - h / 2, w, h };
        if (Math.max(0, 2 - box.x, 2 - box.y, box.x + box.w - (W - 2), box.y + box.h - (H - 2)) > 0) continue;
        if (clearOf(box, arms, pts, boxes) < GAP) continue;
        const disp = Math.hypot(cx - ax, cy - ay); if (disp < best) best = disp; } }
    return best; };

  const out = [];
  for (const f of files) {
    const lesson = lessons[f];
    for (const host of hosts) {
      const box = host == null ? FIG_BOX0 : figFitBox(host);
      lesson.slides.forEach((sl, si) => (sl.blocks || []).forEach((bl) => {
        if (bl.type !== 'figure' || bl.figure !== 'geometry') return;
        const M = figGeometry(bl, box), labels = M.labels || [];
        const rows = [];
        labels.forEach((L, i) => {
          const S = L.sem; if (!S) return;
          const okFn = regionFor(S); if (!okFn) return;
          const prev = labels.slice(0, i).map((x) => x.box);
          const w = L.box.w, h = L.box.h, cx = L.box.x + w / 2, cy = L.box.y + h / 2;
          const off = Math.max(0, 2 - L.box.x, 2 - L.box.y, L.box.x + w - (box.W - 2), L.box.y + h - (box.H - 2));
          /* A RELAXED label is one the engine could not place inside its region at all: Stage 3c's documented
             last resort re-runs the search with `ok` dropped and REPORTS the weakened association. So the
             reference has to model the same two phases — measuring a relaxed label against the
             region-constrained space would score the engine on a search it did not run. */
          const rel = !!L.relaxed;
          rows.push({ text: L.text, k: S.k, via: L.via, relaxed: rel,
            disp: Math.hypot(cx - L.ax, cy - L.ay),
            clear: clearOf(L.box, M.arms, M.vpts, prev),
            inRegion: okFn(cx, cy), onCanvas: off <= 0,
            nearest: refNearest(L.ax, L.ay, w, h, M.arms, M.vpts, prev, rel ? null : okFn, box.W, box.H) });
        });
        out.push({ file: f, fig: bl.title || ('slide ' + si), box: box.W + 'x' + box.H, host, rows,
          errs: (M.errors || []).length });
      }));
    }
  }
  return out;
}, { files: GEO_FILES, hosts: GEO_HOSTS, lessons: geoLessons });

const GEPS = 1e-6;                                                        // solver values compared directly — this is float noise, not a tolerance on the contract
let geoRows = 0, geoDir = 0, geoScan = 0, geoNone = 0, geoWorstDisp = 0;
for (const g of geoOut) {
  const t = `geometry · ${g.fig} · ${g.box}${g.host ? ` (host ${g.host})` : ' (reference)'}`;
  /* Vacuity guard. A figure with no semantic labels checks nothing — but the author-error fixture is SUPPOSED
     to produce none, and the model says so by reporting errors. Absent labels AND no reported error is the
     silent case worth failing on. */
  if (!g.rows.length) { ok(`${t} — has annotations to check`, g.errs > 0,
    g.errs > 0 ? `no labels, and the figure reports ${g.errs} author error(s) — expected` : 'no labels and no reported error — the assertions below would not have run'); continue; }
  geoRows += g.rows.length;
  for (const r of g.rows) { if (r.via === 'dir') geoDir++; else if (r.via === 'scan') geoScan++; else geoNone++;
    if (r.via !== 'none' && r.disp > geoWorstDisp) geoWorstDisp = r.disp; }
  // 1. LEGALITY, by this file's own reckoning — a placed label clears everything and is in its own region.
  const placed = g.rows.filter((r) => r.via !== 'none');
  const relaxed = placed.filter((r) => r.relaxed);
  // Clearance and canvas hold for EVERY placed label. The region holds for every label the engine did not
  // report as relaxed — a relaxed one is outside its region BY CONSTRUCTION and says so.
  const illegal = placed.filter((r) => !(r.clear >= 6 - GEPS && r.onCanvas && (r.relaxed || r.inRegion)));
  ok(`${t} — every placed label is legal (clearance + region + on canvas)`, illegal.length === 0,
    illegal.length ? illegal.map((r) => `"${r.text}" clear ${r.clear.toFixed(2)} region ${r.inRegion} canvas ${r.onCanvas}`).join(' · ')
      : `${g.rows.length} labels · worst clearance ${Math.min(...placed.map((r) => r.clear)).toFixed(2)}`
        + (relaxed.length ? ` · ${relaxed.length} RELAXED (engine reported): ${relaxed.map((r) => `"${r.text}"`).join(' ')}` : ''));
  // 2. NEAREST LEGAL — the Stage 2c property, two-sided so it cannot pass by having nothing to check.
  const drifted = g.rows.filter((r) => r.via === 'dir' && isFinite(r.nearest) && r.disp > r.nearest + GEPS);
  const missed = g.rows.filter((r) => r.via === 'dir' && !isFinite(r.nearest));
  const skipped = g.rows.filter((r) => r.via !== 'dir' && !r.relaxed && isFinite(r.nearest));
  ok(`${t} — nearest legal position`, drifted.length === 0 && missed.length === 0 && skipped.length === 0,
    (drifted.length || missed.length || skipped.length)
      ? [...drifted.map((r) => `"${r.text}" drifted ${r.disp.toFixed(1)} vs ${r.nearest.toFixed(1)}`),
         ...missed.map((r) => `"${r.text}" placed directionally where the reference finds nothing legal`),
         ...skipped.map((r) => `"${r.text}" fell to ${r.via} while a legal candidate existed at ${r.nearest.toFixed(1)}`)].join(' · ')
      : `${g.rows.filter((r) => r.via === 'dir').length} directional · max displacement ${Math.max(0, ...g.rows.filter((r) => r.via === 'dir').map((r) => r.disp)).toFixed(1)}`);
}
ok('geometry — the nearest-legal assertions actually ran', geoRows > 0 && geoDir > 0,
  `${geoRows} annotations · ${geoDir} directional / ${geoScan} scan / ${geoNone} unplaced · worst displacement ${geoWorstDisp.toFixed(1)}`);

ok('no console errors / page errors', errs.length === 0, errs.slice(0, 3).join(' | '));
console.log(results.join('\n'));
console.log(results.filter((r) => r.startsWith('✓')).length + '/' + results.length + ' passed');
await browser.close();
