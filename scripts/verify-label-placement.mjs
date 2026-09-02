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
//   4. The directional search RESOLVES every fixture: figScanPill (the exhaustive correctness fallback, which is
//      not displacement-ranked) does not fire, and no identifier falls through to the unplaced state.
//
// Fixtures: tests/visual/lessons/figure-labels-baseline.json (isolated · on the axes and tick values · on
// curves and chords · at the viewport edges · long identifiers) and figure-graph-baseline.json (the crowded
// plane, plus the V-at-the-origin case raised at the UI-1 visual review).
const BASE = process.env.BASE || 'http://localhost:8099';
const URL = `${BASE}/lesson-studio.html`;
const FILES = ['tests/visual/lessons/figure-labels-baseline.json', 'tests/visual/lessons/figure-graph-baseline.json'];

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
    const box = { W: 520, H: 360, padL: 40, padR: 18, padT: 16, padB: 30 };   // fragFigure's inline box
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

ok('no console errors / page errors', errs.length === 0, errs.slice(0, 3).join(' | '));
console.log(results.join('\n'));
console.log(results.filter((r) => r.startsWith('✓')).length + '/' + results.length + ' passed');
await browser.close();
