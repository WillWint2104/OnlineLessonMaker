#!/usr/bin/env node
// THE WORKBOOK — Stage B.
//
//   node scripts/verify-workbook.mjs
//   CHROMIUM_PATH=/opt/pw-browsers/chromium node scripts/verify-workbook.mjs
//
// Every stroke here is drawn with real pointer events through the real canvas, and read back either from
// the response store or from the painted pixels — never from a stub. The three controls the brief asks for
// are the spine of the file, because each one names a way this could look right and be wrong:
//
//   · sheets could share one stroke array, and every sheet would show the same work;
//   · the workspace could be DOM-local, and leaving the page would quietly discard it;
//   · responses could be keyed by slide index, and reordering the lesson would hand a student's working
//     to another question.
//
// Each is driven to failure deliberately, so the corresponding pass is evidence rather than assertion.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const results = [];
let failed = false;
const ok = (n, c, extra = '') => { results.push(`${c ? 'PASS' : 'FAIL'} ${n}${extra ? '  ' + extra : ''}`); if (!c) failed = true; };
const note = (s) => results.push('     · ' + s);
const ran = new Set(); const mark = (k) => ran.add(k);

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

const FIX = JSON.parse(fs.readFileSync(path.join(root, 'tests/visual/lessons/mathematics-shell.json'), 'utf8'));
const PRACTICE = FIX.slides.findIndex((s) => s.type === 'practice');
/* The page navigated AWAY to, so "navigating away and back" is a real journey between two authored pages
   rather than a literal index that only agrees with the fixture while its slides keep this order. */
const NOTES = FIX.slides.findIndex((s) => s.type === 'notes');
const PAGE_ID = FIX.slides[PRACTICE].id, RESP_ID = FIX.slides[PRACTICE].workspace.id;

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const pageErrs = [];
const open = async (w = 1536, h = 1024, L = FIX, slide = PRACTICE) => {
  const p = await browser.newPage({ viewport: { width: w, height: h },
    permissions: ['clipboard-read', 'clipboard-write'] });   // the paste check needs a real clipboard
  p.on('pageerror', (e) => pageErrs.push(String(e)));
  await p.goto(base, { waitUntil: 'load' });
  await p.evaluate(({ L, slide }) => { LESSON = JSON.parse(JSON.stringify(L)); render(); go(slide); }, { L, slide });
  return p;
};
/* A real stroke: pointer down, several moves, up — through the canvas the student sees. */
const draw = async (p, pts, pressure) => {
  // Draw through the VISIBLE window, not the canvas: since the paper can be taller than the window, a
  // fraction of the canvas rect can fall outside the viewport, where a pointer cannot go.
  const box = await (await p.$('.mx-sheet')).boundingBox();
  const at = ([x, y]) => [box.x + x * box.width, box.y + y * box.height];
  await p.mouse.move(...at(pts[0]));
  await p.mouse.down(pressure ? { button: 'left' } : {});
  for (const q of pts.slice(1)) await p.mouse.move(...at(q), { steps: 8 });
  await p.mouse.up();
};
const inked = (p) => p.evaluate(() => { const c = document.querySelector('.mx-wbcanvas');
  const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 8) n++; return n; });
const doc = (p) => p.evaluate(([pg, rid]) => { const e = tpRespGet(pg, rid);
  return e ? { kind: e.kind, current: e.value.current, pages: e.value.pages.map((x) => ({ id: x.id, n: x.ink.length })) } : null;
}, [PAGE_ID, RESP_ID]);

// ══ 1. the pen writes, and it writes through the app's own stroke engine ══════════════════════════
mark('pen');
{
  const p = await open();
  ok('the workbook is the shared ink engine, not a second implementation', await p.evaluate(() =>
    !!document.querySelector('.mx-wb.tp-ink-pad[data-tp-ink][data-tp-resp-page][data-tp-resp-id][data-tp-resp-slot]')));
  const before = await inked(p);
  await draw(p, [[.12, .25], [.3, .18], [.45, .34], [.62, .2]]);
  await draw(p, [[.12, .5], [.42, .56]]);
  const after = await inked(p), d1 = await doc(p);
  ok('a drawn stroke paints ink and lands in the response store',
     before === 0 && after > 500 && d1.kind === 'workbook' && d1.pages[0].n === 2, `${after} inked pixels, ${d1.pages[0].n} strokes`);
  const widths = await p.evaluate(([pg, rid]) => { const st = tpRespGet(pg, rid).value.pages[0].ink[0].p;
    return { n: st.length, pr: [...new Set(st.map((q) => q.pr))] }; }, [PAGE_ID, RESP_ID]);
  ok('the stroke carries a pressure sample per point (constant on a mouse, variable on a pen)',
     widths.n > 3 && widths.pr.length >= 1, `${widths.n} points, pressure values ${widths.pr.join('/')}`);
  const er = await p.evaluate(() => { document.querySelector('[data-tp-ink-tool="eraser"]').click();
    return document.querySelector('[data-tp-ink-tool="eraser"]').getAttribute('aria-pressed'); });
  await draw(p, [[.12, .25], [.62, .2]]);
  const afterErase = await inked(p);
  ok('the eraser is a tool of the same engine and removes ink', er === 'true' && afterErase < after,
     `${after} → ${afterErase} inked pixels`);
  await p.evaluate(() => { document.querySelector('[data-tp-ink-tool="pen"]').click(); document.querySelector('[data-tp-ink-clear]').click(); });
  const cleared = await inked(p), dCleared = await doc(p);
  ok('Clear empties the sheet and the stored strokes with it', cleared === 0 && dCleared.pages[0].n === 0);
  await p.close();
}

// ══ 2. sheets — and the control that they are not one array ═══════════════════════════════════════
mark('sheets');
{
  const p = await open();
  await draw(p, [[.15, .3], [.5, .25]]);
  await p.click('[data-mx-sheet-add]');
  const onNew = await inked(p);
  await draw(p, [[.2, .7], [.75, .72]]);
  await draw(p, [[.3, .8], [.6, .8]]);
  const d = await doc(p);
  ok('a new sheet starts blank and takes its own strokes',
     onNew === 0 && d.pages.length === 2 && d.pages[0].n === 1 && d.pages[1].n === 2 && d.current === 'w2',
     d.pages.map((x) => `${x.id}:${x.n}`).join(' · '));
  const back = await p.evaluate(() => { document.querySelector('[data-mx-sheet="w1"]').click();
    const c = document.querySelector('.mx-wbcanvas');
    const px = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    let n = 0; for (let i = 3; i < px.length; i += 4) if (px[i] > 8) n++;
    return { inked: n, slot: document.querySelector('[data-tp-ink]').dataset.tpRespSlot }; });
  ok('going back to a sheet redraws THAT sheet', back.slot === 'w1' && back.inked > 300, `${back.inked} inked pixels on w1`);
  const d2 = await doc(p);
  ok('and the other sheet is untouched by the visit', d2.pages[0].n === 1 && d2.pages[1].n === 2 && d2.current === 'w1');
  // CONTROL — collapse the sheets onto one shared array and show the distinction disappears.
  const ctl = await p.evaluate(([pg, rid]) => {
    const v = tpRespGet(pg, rid).value, shared = v.pages[0].ink;
    const was = { a: v.pages[0].ink.length, b: v.pages[1].ink.length };
    v.pages.forEach((x) => { x.ink = shared; });
    return { was, now: { a: v.pages[0].ink.length, b: v.pages[1].ink.length } };
  }, [PAGE_ID, RESP_ID]);
  ok('CONTROL: if every sheet shared one stroke array the sheets would be indistinguishable',
     ctl.was.a !== ctl.was.b && ctl.now.a === ctl.now.b,
     `${ctl.was.a} vs ${ctl.was.b} becomes ${ctl.now.a} vs ${ctl.now.b}`);
  await p.close();
}

// ══ 3. the work survives leaving the page — and the control that it would not, DOM-local ══════════
mark('persist');
{
  const p = await open();
  await draw(p, [[.15, .3], [.5, .25], [.7, .4]]);
  const beforeNav = await inked(p);
  const survived = await p.evaluate(({ away, back }) => { go(away); const gone = !document.querySelector('.mx-wbcanvas'); go(back);
    const c = document.querySelector('.mx-wbcanvas');
    const px = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    let n = 0; for (let i = 3; i < px.length; i += 4) if (px[i] > 8) n++;
    return { gone, inked: n }; }, { away: NOTES, back: PRACTICE });
  ok('the canvas really is destroyed by navigating away', survived.gone === true);
  ok('and the work comes back when the page does', beforeNav > 500 && survived.inked > 500,
     `${beforeNav} → ${survived.inked} inked pixels`);
  // CONTROL — a DOM-local workspace: read the strokes off the live canvas only, then navigate.
  const ctl = await p.evaluate(() => {
    const domLocal = document.querySelector('.mx-wbcanvas');            // the "store" a DOM-local design has
    go(0);
    return { stillInDocument: document.contains(domLocal),
      storeStillHas: (tpRespGet('practice-equations', 'workbook').value.pages[0].ink.length) };
  });
  ok('CONTROL: a DOM-local workspace would have lost the work on that same navigation',
     ctl.stillInDocument === false && ctl.storeStillHas > 0,
     `the canvas left the document; the response store still holds ${ctl.storeStillHas} strokes`);
  ok('nothing is written to browser storage', await p.evaluate(() => localStorage.length + sessionStorage.length) === 0);
  await p.close();
}

// ══ 4. identity — and the control that index keying would reattribute ═════════════════════════════
mark('identity');
{
  const p = await open();
  await draw(p, [[.2, .3], [.6, .35]]);
  const b = await p.evaluate(() => { const bun = tpRespBundle();
    return { pages: Object.keys(bun.pages), errors: bun.errors.length,
      entry: bun.pages['practice-equations'].workbook }; });
  ok('the bundle names page → response → kind → payload',
     b.errors === 0 && b.pages.indexOf('practice-equations') >= 0 && b.entry.kind === 'workbook'
     && Array.isArray(b.entry.value.pages) && typeof b.entry.value.current === 'string',
     `${b.pages.length} page(s); workbook is kind "${b.entry.kind}" with ${b.entry.value.pages.length} sheet(s)`);
  ok('the bundle is a deep copy — mutating it cannot reach live state', await p.evaluate(() => {
    const bun = tpRespBundle(); bun.pages['practice-equations'].workbook.value.pages.length = 0;
    return tpRespGet('practice-equations', 'workbook').value.pages.length > 0; }));
  // CONTROL — reorder the lesson. Authored identity must follow the page; an index would not.
  const re = await p.evaluate((at) => {
    const before = tpRespGet('practice-equations', 'workbook').value.pages[0].ink.length;
    const wasAtIndex = LESSON.slides[at].id;
    const moved = LESSON.slides.splice(at, 1)[0]; LESSON.slides.unshift(moved); go(0);
    const afterId = tpRespGet('practice-equations', 'workbook').value.pages[0].ink.length;
    /* What the index NOW names. This has to read the lesson, not restate the claim: an earlier version
       returned the same sentence from both arms of a ternary, so the assertion below could not fail. */
    return { before, afterId, nowAt: cur, type: LESSON.slides[0].type,
      wasAtIndex, nowAtIndex: (LESSON.slides[at] || {}).id || '(nothing)' };
  }, PRACTICE);
  ok('a reordered lesson keeps the workbook with ITS page',
     re.before > 0 && re.afterId === re.before && re.type === 'practice',
     `practice moved from index ${PRACTICE} to index 0; ${re.afterId} strokes still under "practice-equations"`);
  ok(`CONTROL: the same reorder changes what index ${PRACTICE} refers to`,
     re.wasAtIndex === 'practice-equations' && re.nowAtIndex !== re.wasAtIndex,
     `index ${PRACTICE} was "${re.wasAtIndex}", is now "${re.nowAtIndex}" — keying on it would have `
     + 'attributed these strokes to a different page');
  await p.close();
}

// ══ 5. the desktop split, and Expand ══════════════════════════════════════════════════════════════
mark('layout');
{
  const p = await open(1536, 900);
  await draw(p, [[.2, .3], [.6, .35]]);
  const s = await p.evaluate(() => {
    const q = document.querySelector('.mx-content'), w = document.querySelector('.mx-work');
    const wTop = w.getBoundingClientRect().top, cTop = document.querySelector('.mx-wbcanvas').getBoundingClientRect().top;
    q.scrollTop = q.scrollHeight;
    return { scrolled: q.scrollTop, workMoved: Math.abs(w.getBoundingClientRect().top - wTop),
      canvasMoved: Math.abs(document.querySelector('.mx-wbcanvas').getBoundingClientRect().top - cTop) };
  });
  ok('scrolling the questions does not move the workbook',
     s.scrolled > 0 && s.workMoved === 0 && s.canvasMoved === 0, `questions scrolled ${s.scrolled}px, workbook moved 0`);
  const ex = await p.evaluate(() => {
    const w0 = document.querySelector('.mx-work').offsetWidth, ink0 = document.querySelector('.mx-wbcanvas');
    document.querySelector('[data-mx-view="workbook"]').click();
    const w1 = document.querySelector('.mx-work').offsetWidth;
    return { w0, w1, sameCanvas: document.querySelector('.mx-wbcanvas') === ink0,
      questions: getComputedStyle(document.querySelector('.mx-content')).display,
      view: document.querySelector('.mx').dataset.mxView };
  });
  ok('Expand gives the whole page to the workbook, without replacing the canvas',
     ex.w1 > ex.w0 * 1.4 && ex.sameCanvas === true && ex.questions === 'none' && ex.view === 'workbook',
     `${ex.w0}px → ${ex.w1}px, same canvas node`);
  ok('and the ink is still there afterwards', await inked(p) > 500);
  const back = await p.evaluate(() => { document.querySelector('.mx-viewsw [data-mx-view="questions"]').click();
    return { view: document.querySelector('.mx').dataset.mxView, q: getComputedStyle(document.querySelector('.mx-content')).display }; });
  ok('and it gives it back', back.view === 'split' && back.q !== 'none');
  await p.close();
}

// ══ 6. the handset: two views, no state loss ══════════════════════════════════════════════════════
mark('narrow');
{
  const p = await open(414, 860);
  const st = await p.evaluate(() => ({ view: document.querySelector('.mx').dataset.mxView,
    work: getComputedStyle(document.querySelector('.mx-work')).display }));
  ok('a handset starts on Questions, with the workbook one tap away', st.view === 'questions' && st.work === 'none');
  // On a handset the page itself is the scroller, not the question column — so that is what has to keep
  // its place across a view switch and a drawer toggle.
  const keep = await p.evaluate(() => {
    const q = document.querySelector('.mx-page'); q.scrollTop = 220; const at = q.scrollTop;
    document.querySelector('[data-mx-view="workbook"]').click();
    return { at, node: q === document.querySelector('.mx-page') };
  });
  await draw(p, [[.25, .4], [.7, .45]]);
  const round = await p.evaluate(() => {
    document.querySelector('[data-mx-view="questions"]').click();
    const q = document.querySelector('.mx-page');
    const scroll = q.scrollTop;
    rpNavToggle();                                        // the drawer must not reset anything either
    const afterDrawer = q.scrollTop;
    rpNavToggle();
    document.querySelector('[data-mx-view="workbook"]').click();
    const c = document.querySelector('.mx-wbcanvas');
    const px = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    let n = 0; for (let i = 3; i < px.length; i += 4) if (px[i] > 8) n++;
    return { scroll, afterDrawer, inked: n, mode: document.querySelector('.mx').dataset.mxResponse,
      slot: document.querySelector('[data-tp-ink]').dataset.tpRespSlot };
  });
  ok('switching view keeps the question scroll position', keep.at === 220 && round.scroll === 220 && keep.node === true,
     `scrollTop ${keep.at} → ${round.scroll}`);
  ok('opening the navigation drawer keeps it too', round.afterDrawer === 220);
  ok('and the workbook keeps its sheet, its ink and the response mode',
     round.inked > 300 && round.slot === 'w1' && round.mode === 'write', `${round.inked} inked pixels on ${round.slot}`);
  await p.close();
}

// ══ 7. structured entry, only where the structure is the task ═════════════════════════════════════
mark('table');
{
  const p = await open();
  const shape = await p.evaluate(() => ({
    inputs: document.querySelectorAll('.mx-content input').length,
    cells: document.querySelectorAll('[data-mx-table] input[data-mx-cell]').length,
    questions: document.querySelectorAll('.mx-content .mx-item').length,
    keys: [...document.querySelectorAll('[data-mx-cell]')].map((i) => i.dataset.mxCell) }));
  ok('only the table question takes typed entry — no answer box appears on the others',
     shape.questions === 7 && shape.cells === 7 && shape.inputs === shape.cells,
     `${shape.questions} questions, ${shape.cells} cells, ${shape.inputs} inputs in total`);
  ok('cells are keyed by their column VALUE, not by position', shape.keys.join(',') === '−3,−2,−1,0,1,2,3', shape.keys.join(' '));
  await p.fill('[data-mx-cell="−2"]', '4');
  await p.fill('[data-mx-cell="3"]', '9');
  const stored = await p.evaluate(() => tpRespGet('practice-equations', 'q2'));
  ok('a typed cell is stored under the question id, keyed by column value',
     stored && stored.kind === 'table' && stored.value.cells['−2'] === '4' && stored.value.cells['3'] === '9',
     JSON.stringify(stored.value.cells));
  const round = await p.evaluate(({ away, back }) => { go(away); go(back);
    return [...document.querySelectorAll('[data-mx-cell]')].map((i) => i.dataset.mxCell + '=' + i.value).filter((s) => !s.endsWith('=')); },
    { away: NOTES, back: PRACTICE });
  ok('and it is still there after leaving the page and coming back', round.join(' ') === '−2=4 3=9', round.join(' '));
  await p.close();
}

// ══ 8. the split exists only while BOTH regions are usable ════════════════════════════════════════
// The previous rule was a device width, and it produced a split whose writing surface measured 452 x 0 px
// at a 900px portrait tablet. The rule is now the measured minimum usable geometry of the two regions.
mark('fit');
{
  const read = (p) => p.evaluate(() => {
    const q = (s) => document.querySelector(s), box = (e) => e ? { w: e.offsetWidth, h: e.offsetHeight } : { w: 0, h: 0 };
    return { fit: q('.mx').dataset.mxFit, view: q('.mx').dataset.mxView,
      content: box(q('.mx-content')), work: box(q('.mx-work')), sheet: box(q('.mx-sheet')),
      mins: { q: MX_Q_MIN, w: MX_WB_MIN_W, h: MX_WB_MIN_H } };
  });
  const cases = [];
  for (const [w, h, label] of [[1536, 1024, 'desktop'], [1180, 900, 'tablet landscape'], [900, 1100, 'tablet portrait'], [834, 1112, 'iPad portrait']]) {
    const p = await open(w, h); await p.waitForTimeout(350);
    cases.push([label, w, h, await read(p)]); await p.close();
  }
  const byLabel = Object.fromEntries(cases.map((c) => [c[0], c[3]]));
  ok('wherever the split exists, BOTH regions clear their usable minima',
     cases.every(([, , , m]) => m.fit !== 'split' || (m.content.w >= m.mins.q && m.work.w >= m.mins.w && m.sheet.h >= m.mins.h)),
     cases.map(([l, , , m]) => `${l}:${m.fit}${m.fit === 'split' ? ` q${m.content.w}/w${m.work.w}/h${m.sheet.h}` : ''}`).join('  '));
  ok('a portrait tablet uses Questions / Workbook rather than a split it cannot support',
     byLabel['tablet portrait'].fit === 'solo' && byLabel['iPad portrait'].fit === 'solo',
     `900x1100 → ${byLabel['tablet portrait'].fit} · 834x1112 → ${byLabel['iPad portrait'].fit}`);
  // The decision is geometry, not device: the SAME viewport splits once the rail gives its width back.
  const p = await open(1180, 900); await p.waitForTimeout(350);
  const withRail = await read(p);
  await p.evaluate(() => rpNavToggle()); await p.waitForTimeout(400);
  const noRail = await read(p);
  ok('the same viewport changes its answer when the available width changes — it is geometry, not a device',
     withRail.fit === 'solo' && noRail.fit === 'split' && noRail.content.w >= noRail.mins.q
     && noRail.work.w >= noRail.mins.w && noRail.sheet.h >= noRail.mins.h,
     `1180x900 with the rail → ${withRail.fit}; rail collapsed → ${noRail.fit} (q${noRail.content.w}/w${noRail.work.w}/h${noRail.sheet.h})`);
  // CONTROL — force the split below the minima and the shallow workbook comes straight back.
  const ctl = await p.evaluate(async () => {
    const root = document.querySelector('.mx');
    const proper = document.querySelector('.mx-sheet').offsetHeight;
    root.setAttribute('data-mx-fit', 'split');                 // what a width-based rule would have decided
    const st = document.createElement('style');
    // !important, not specificity: this control exists to remove the FLOOR, and it should keep doing that
    // however the floor's selector is written later. It lost silently once when the selector grew a :not().
    st.id = 'mx-force';
    // The paper's own min-height:100% props the window open, so removing the floor means removing both:
    // the failure being reproduced is "the sheet has nothing to grow into", not "the sheet has no rule".
    st.textContent = '.mx-wb .mx-sheet{flex:0 1 auto!important;min-height:0!important;height:auto!important;}'
      + '.mx-wb .mx-paper{min-height:0!important;height:0!important;}';
    document.head.appendChild(st);
    await new Promise((r) => requestAnimationFrame(r));
    const forced = document.querySelector('.mx-sheet').offsetHeight;
    st.remove(); return { proper, forced };
  });
  ok('CONTROL: forcing the split past the minima reproduces the shallow workbook this rule exists to prevent',
     ctl.proper >= 340 && ctl.forced < 340,
     `sheet ${ctl.proper}px with the floor, ${ctl.forced}px without it`);
  await p.close();
}

// ══ 9. a structured table is never silently clipped ═══════════════════════════════════════════════
mark('wide');
{
  const WIDE = JSON.parse(fs.readFileSync(path.join(root, 'tests/visual/lessons/mathematics-wide-table.json'), 'utf8'));
  const probe = (p) => p.evaluate(() => {
    const wrap = document.querySelector('.mx-tblwrap'), tbl = wrap.querySelector('table'), pane = document.querySelector('.mx-content');
    return { natural: +wrap.dataset.mxTblNat, min: +wrap.dataset.mxTblMin, avail: wrap.clientWidth,
      compact: wrap.classList.contains('mx-tbl-compact'), scrolls: wrap.hasAttribute('data-mx-tblscroll'),
      tbl: tbl.scrollWidth, paneOverflow: pane.scrollWidth - pane.clientWidth,
      reachable: (() => { wrap.scrollLeft = wrap.scrollWidth; return Math.round(wrap.scrollLeft + wrap.clientWidth) >= tbl.scrollWidth - 2; })(),
      cols: tbl.querySelectorAll('tr:first-child th[scope="col"]').length };
  });
  const wide = await open(1536, 1024, WIDE, 0); await wide.waitForTimeout(400);
  const W = await probe(wide);
  ok('a legitimately wide authored table compacts first, then takes its OWN horizontal scroll',
     W.cols === 13 && W.compact === true && W.scrolls === true && W.tbl > W.avail,
     `${W.cols} columns · natural ${W.natural}px, compact ${W.min}px, column ${W.avail}px`);
  ok('every column is reachable — nothing disappears past the boundary', W.reachable === true);
  ok('and the question pane itself never overflows sideways', W.paneOverflow <= 0, `${W.paneOverflow}px`);
  await wide.close();
  const ord = await open(1536, 1024); await ord.waitForTimeout(400);
  const O = await probe(ord);
  ok('CONTROL: the ordinary 7-column table fits with no compaction and no scroll',
     O.cols === 7 && O.compact === false && O.scrolls === false, `natural ${O.natural}px in a ${O.avail}px column`);
  await ord.close();
  const ph = await open(414, 860); await ph.waitForTimeout(400);
  const P = await probe(ph);
  ok('on a handset the same ordinary table compacts, and scrolls only if it still does not fit',
     P.compact === true && P.tbl <= P.avail + 1 === !P.scrolls && P.paneOverflow <= 0,
     `natural ${P.natural}px → compact ${P.min}px in a ${P.avail}px column${P.scrolls ? ', scrolling' : ', fits'}`);
  await ph.close();
}

// ══ 10. the response mode is lesson-wide, and switching it destroys nothing ═══════════════════════
mark('mode');
{
  const p = await open();
  await draw(p, [[.15, .3], [.5, .25]]);
  await p.click('[data-mx-sheet-add]');
  await draw(p, [[.2, .7], [.7, .72]]);
  const shape = await p.evaluate(() => { const d = tpRespGet('practice-equations', 'workbook');
    return { kind: d.kind, mode: d.value.mode, current: d.value.current,
      keys: Object.keys(d.value.pages[0]).sort().join(','), ids: d.value.pages.map((x) => x.id) }; });
  ok('ONE sheet list, with both modalities on each sheet — they cannot diverge',
     shape.kind === 'workbook' && shape.keys === 'id,ink,text' && shape.ids.join('/') === 'w1/w2',
     `sheets ${shape.ids.join(', ')} · each holds ${shape.keys}`);
  // Back to sheet 1 — the student types on the sheet they are ON, and w2 is the one just added.
  await p.click('[data-mx-sheet="w1"]'); await p.waitForTimeout(200);
  // Type: real typing, and a real equation from the app's own maths primitive.
  await p.click('[data-mx-resp="type"]'); await p.waitForTimeout(250);
  ok('the Type workspace replaces the workbook surface, and only that',
     await p.evaluate(() => !!document.querySelector('[data-mx-typed]') && !document.querySelector('.mx-wbcanvas')
       && document.querySelectorAll('.mx-content .mx-item').length === 7
       && document.querySelectorAll('.mx-content input').length === 7),
     'question list untouched: 7 questions, 7 table cells, no per-question boxes');
  await p.click('[data-mx-typed]');
  await p.keyboard.type('Substituting x = 3 into the rule:');
  await p.keyboard.press('Enter');
  await p.keyboard.type('so y = 9.');
  await p.click('[data-mx-tsel="eq"]'); await p.waitForTimeout(200);
  await p.evaluate(() => { const b = [...document.querySelectorAll('.tp-eqsym')];
    ['=', '×'].forEach((c) => { const x = b.find((y) => y.textContent === c); if (x) x.click(); }); });
  await p.click('[data-mx-eqok]'); await p.waitForTimeout(200);
  const typed = await p.evaluate(() => { const d = tpRespGet('practice-equations', 'workbook');
    return { blocks: d.value.pages[0].text.map((b) => b.t), eqs: document.querySelectorAll('.mx-eq math').length,
      prose: d.value.pages[0].text.filter((b) => b.t === 'p').map((b) => b.v).join('').includes('\n') }; });
  ok('typed prose and an inserted equation are both stored, as text and as a TPMath tree',
     typed.blocks.indexOf('p') >= 0 && typed.blocks.indexOf('eq') >= 0 && typed.eqs === 1 && typed.prose === true,
     `blocks ${typed.blocks.join('+')} · ${typed.eqs} rendered <math> · line break preserved`);
  // Page 2 gets its own typed content.
  await p.click('[data-mx-sheet="w2"]'); await p.waitForTimeout(200);
  const blank = await p.evaluate(() => document.querySelector('[data-mx-typed]').textContent.trim());
  await p.click('[data-mx-typed]'); await p.keyboard.type('Second sheet working.');
  await p.evaluate(() => document.querySelector('[data-mx-typed]').blur());
  const both = await p.evaluate(() => tpRespGet('practice-equations', 'workbook').value.pages
    .map((x) => ({ id: x.id, ink: x.ink.length, text: x.text.map((b) => b.t === 'p' ? b.v : '[eq]').join('') })));
  ok('a second sheet takes its own typed content', blank === '' && /Second sheet/.test(both[1].text) && !/Second sheet/.test(both[0].text),
     both.map((x) => `${x.id}: ink ${x.ink}, ${x.text.length} chars`).join(' · '));
  // Write → Type → Write, across everything that could reset it.
  const round = async () => p.evaluate(() => { const d = tpRespGet('practice-equations', 'workbook').value;
    return { ids: d.pages.map((x) => x.id).join('/'), current: d.current,
      ink: d.pages.map((x) => x.ink.length).join('/'), text: d.pages.map((x) => x.text.length).join('/') }; });
  const before = await round();
  await p.click('[data-mx-resp="write"]'); await p.waitForTimeout(200);
  const inWrite = await round();
  const inkBack = await inked(p);
  await p.click('[data-mx-resp="type"]'); await p.waitForTimeout(200);
  const backInType = await round();
  ok('Write → Type → Write preserves both modalities exactly, and renumbers nothing',
     JSON.stringify(before) === JSON.stringify(inWrite) && JSON.stringify(before) === JSON.stringify(backInType)
     && before.ids === 'w1/w2', JSON.stringify(before));
  ok('and the ink is still painted when Write comes back', inkBack > 300, `${inkBack} inked pixels`);
  // …and across page change, navigation, the drawer, Expand and the narrow views.
  const survives = await p.evaluate(async ({ away, back }) => {
    const snap = () => JSON.stringify(tpRespGet('practice-equations', 'workbook').value.pages
      .map((x) => [x.id, x.ink.length, x.text.length]));
    const a = snap(); const out = {};
    document.querySelector('[data-mx-sheet="w1"]').click(); out.sheet = snap() === a;
    go(away); go(back); out.nav = snap() === a;
    rpNavToggle(); rpNavToggle(); out.drawer = snap() === a;
    mxSetView('workbook'); mxSetView('split'); out.expand = snap() === a;
    return out;
  }, { away: NOTES, back: PRACTICE });
  ok('nothing is lost or renumbered by changing sheet, navigating, the drawer, or Expand',
     survives.sheet && survives.nav && survives.drawer && survives.expand,
     Object.entries(survives).map(([k, v]) => `${k}:${v ? 'kept' : 'LOST'}`).join(' · '));
  // ── the Type surface itself: it has to be a page you can actually work on ──────────────────────
  // The pad borrows `.tp-slide` for the equation editor's own styling; that class is also `position:absolute`,
  // which took the workbook out of the workspace column and left it 340px in an 830px region.
  const geom = await p.evaluate(() => {
    const h = (s) => { const e = document.querySelector(s); return e ? Math.round(e.getBoundingClientRect().height) : 0; };
    const typed = { work: h('.mx-work'), pad: h('.mx-wb'), sheet: h('.mx-sheet') };
    document.querySelector('[data-mx-resp="write"]').click();
    const write = { work: h('.mx-work'), pad: h('.mx-wb'), sheet: h('.mx-sheet') };
    document.querySelector('[data-mx-resp="type"]').click();
    return { typed, write };
  });
  await p.waitForTimeout(200);
  ok('the typing page fills its region exactly as the writing page does',
     Math.abs(geom.typed.sheet - geom.write.sheet) <= 4 && geom.typed.sheet > geom.typed.work * 0.8,
     `type ${geom.typed.sheet}px vs write ${geom.write.sheet}px in a ${geom.typed.work}px region`);
  const collapsed = await p.evaluate(() => {
    const pad = document.querySelector('.mx-wb'), prev = pad.style.cssText;
    pad.style.cssText = 'position:absolute;inset:0;display:block;height:auto;';   // the slide layout, un-neutralised
    const h = Math.round(document.querySelector('.mx-sheet').getBoundingClientRect().height);
    pad.style.cssText = prev; return h;
  });
  ok('CONTROL: leaving the borrowed slide layout in place is what collapsed it',
     collapsed < geom.typed.sheet - 100, `${geom.typed.sheet}px neutralised, ${collapsed}px with the slide layout`);
  // The equation bar is a mode, not furniture: it is not there until it is asked for.
  const bar = async () => p.evaluate(() => { const b = document.querySelector('[data-mx-eqbar]');
    return { hidden: b.hasAttribute('hidden'), shown: b.getBoundingClientRect().height > 0 }; });
  const shut = await bar();
  await p.click('[data-mx-tsel="eq"]'); await p.waitForTimeout(200);
  const opened = await bar();
  await p.click('[data-mx-eqcancel]'); await p.waitForTimeout(200);
  const shutAgain = await bar();
  ok('the equation bar appears when asked for and goes away again',
     !shut.shown && opened.shown && !shutAgain.shown && shut.hidden && !opened.hidden,
     `closed ${shut.shown ? 'VISIBLE' : 'gone'} → open ${opened.shown ? 'visible' : 'GONE'} → closed ${shutAgain.shown ? 'VISIBLE' : 'gone'}`);
  // The field is the focusable element, and TPMath's key handling reaches it.
  const field = await p.evaluate(() => { document.querySelector('[data-mx-tsel="eq"]').click();
    const f = document.querySelector('[data-tp-eqfield]');
    return { tab: f.getAttribute('tabindex'), role: f.getAttribute('role'), focused: document.activeElement === f }; });
  await p.keyboard.press('x'); await p.keyboard.press('^'); await p.keyboard.press('2'); await p.waitForTimeout(120);
  const once = await p.evaluate(() => document.querySelector('[data-tp-eqfield]').textContent.replace(/\s/g, ''));
  ok('the equation field takes the keyboard, and each key once',
     field.tab === '0' && field.role === 'textbox' && field.focused && once === 'x2',
     `tabindex ${field.tab} role ${field.role} focused ${field.focused} · typed "x^2" reads "${once}"`);
  // Re-opening the bar mounts a second editor on the same pad; TPMath's destroy() does not unbind the field.
  await p.click('[data-mx-eqcancel]'); await p.waitForTimeout(150);
  await p.click('[data-mx-tsel="eq"]'); await p.waitForTimeout(200);
  await p.keyboard.press('y'); await p.keyboard.press('='); await p.keyboard.press('9'); await p.waitForTimeout(120);
  const twice = await p.evaluate(() => document.querySelector('[data-tp-eqfield]').textContent.replace(/\s/g, ''));
  ok('CONTROL: a second visit to the bar still inserts each key once — a stacked binding would double them',
     twice === 'y=9', `after re-opening, "y=9" reads "${twice}"`);
  // What a student pastes is what a student keeps. The store only ever held text, so pasted markup was
  // discarded at the next render — the page just kept showing it until then.
  await p.evaluate(() => { document.querySelector('[data-mx-eqcancel]').click();
    const t = document.querySelector('[data-mx-typed]'); mxTypedWrite(t, []); t.focus(); });
  const EVIL = '<b>bold</b> <a href="javascript:alert(1)">link</a><img src=x onerror="window.__pasteRan=1"> tail';
  await p.evaluate(async (h) => { await navigator.clipboard.write([new ClipboardItem({
    'text/html': new Blob([h], { type: 'text/html' }),
    'text/plain': new Blob(['bold link tail'], { type: 'text/plain' }) })]); }, EVIL);
  await p.click('[data-mx-typed]'); await p.keyboard.press('Control+V'); await p.waitForTimeout(250);
  const pasted = await p.evaluate(() => { const t = document.querySelector('[data-mx-typed]');
    return { rich: t.querySelectorAll('b,a,img,script').length, ran: !!window.__pasteRan,
      shown: t.textContent.trim(),
      stored: (tpRespGet('practice-equations', 'workbook').value.pages[0].text.map((b) => b.t === 'p' ? b.v : '[eq]').join('')).trim() }; });
  ok('a rich paste arrives as text, and what is on the page is what is in the store',
     pasted.rich === 0 && !pasted.ran && pasted.shown === pasted.stored && /bold link tail/.test(pasted.stored),
     `${pasted.rich} markup nodes · shown "${pasted.shown}" · stored "${pasted.stored}"`);
  const inserted = await p.evaluate((h) => { const t = document.querySelector('[data-mx-typed]');
    t.focus(); document.execCommand('insertHTML', false, h);          // what an un-intercepted paste inserts
    return t.querySelectorAll('b,a,img').length; }, EVIL);
  await p.waitForTimeout(300);                                        // the img's onerror is asynchronous
  const unhandled = await p.evaluate(() => { const t = document.querySelector('[data-mx-typed]');
    const ran = !!window.__pasteRan;
    mxTypedWrite(t, tpRespGet('practice-equations', 'workbook').value.pages[0].text);
    window.__pasteRan = false; return ran; });
  ok('CONTROL: the same content inserted the way an un-intercepted paste would does bring markup in',
     inserted > 0 && unhandled === true,
     `${inserted} markup nodes entered the page; the inline handler ${unhandled ? 'ran' : 'did NOT run'}`);
  // An inserted equation advertises "select to edit"; a keyboard has to be able to do that.
  const eqKey = await p.evaluate(() => {
    const t = document.querySelector('[data-mx-typed]');
    mxTypedWrite(t, [{ t: 'p', v: 'x ' }, { t: 'eq', v: TPMath.tree('y=x') }]);
    const eq = t.querySelector('.mx-eq'), bar = document.querySelector('[data-mx-eqbar]');
    const before = !bar.hasAttribute('hidden');
    eq.focus(); const focused = document.activeElement === eq;
    eq.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    return { before, focused, after: !bar.hasAttribute('hidden'), label: eq.getAttribute('aria-label') };
  });
  await p.waitForTimeout(150);
  ok('a placed equation can be re-opened from the keyboard, not by pointer alone',
     eqKey.focused && eqKey.before === false && eqKey.after === true,
     `bar closed → focus the equation ("${eqKey.label}") → Enter → bar open`);
  await p.evaluate(() => { const c = document.querySelector('[data-mx-eqcancel]'); if (c) c.click();
    mxTypedWrite(document.querySelector('[data-mx-typed]'), tpRespGet('practice-equations', 'workbook').value.pages[0].text); });
  await p.waitForTimeout(150);
  // ── the equation bar as an instrument a student can actually use ───────────────────────────────
  // Insert used to append to the end of the page whatever the caret was doing, and the prose typed next
  // went in FRONT of the equation — the student's working came out in an order they did not write it in.
  await p.evaluate(() => { const c = document.querySelector('[data-mx-eqcancel]'); if (c) c.click();
    mxTypedWrite(document.querySelector('[data-mx-typed]'), []); });
  await p.click('[data-mx-typed]'); await p.keyboard.type('Step one: ');
  await p.click('[data-mx-tsel="eq"]'); await p.waitForTimeout(220);
  await p.click('[data-tp-eqfield]'); await p.keyboard.press('x'); await p.waitForTimeout(60);
  await p.click('[data-mx-eqok]'); await p.waitForTimeout(200);
  await p.keyboard.type('THEN'); await p.waitForTimeout(200);
  const order = await p.evaluate(() => { const t = tpRespGet('practice-equations', 'workbook').value.pages[0].text;
    return { kinds: t.map((b) => b.t), text: t.filter((b) => b.t === 'p').map((b) => b.v).join('|'),
      eqAt: t.findIndex((b) => b.t === 'eq'), last: t.length - 1 }; });
  ok('an equation lands where the caret is, and what is typed next continues after it',
     order.eqAt >= 0 && order.eqAt !== order.last && /Step one:/.test(order.text) && /THEN/.test(order.text)
     && order.kinds.indexOf('eq') < order.kinds.lastIndexOf('p'),
     `blocks ${order.kinds.join('+')} — the equation is at ${order.eqAt} of ${order.last}, prose "${order.text}"`);
  ok('CONTROL: appending to the end of the page would have put it last, with the later prose in front of it',
     order.eqAt < order.last, `appending gives index ${order.last}; the caret gives ${order.eqAt}`);
  // Re-opening a placed equation must continue it, not prepend to it.
  await p.evaluate(() => { mxTypedWrite(document.querySelector('[data-mx-typed]'), []); });
  await p.click('[data-mx-typed]');
  await p.click('[data-mx-tsel="eq"]'); await p.waitForTimeout(200);
  await p.click('[data-tp-eqfield]'); await p.keyboard.press('1'); await p.waitForTimeout(60);
  await p.click('[data-mx-eqok]'); await p.waitForTimeout(200);
  await p.click('.mx-eq'); await p.waitForTimeout(300);
  await p.keyboard.press('2'); await p.waitForTimeout(80);
  await p.click('[data-mx-eqok]'); await p.waitForTimeout(250);
  const reedit = await p.evaluate(() => document.querySelector('.mx-eq').textContent.replace(/\s/g, ''));
  ok('re-opening a placed equation continues it rather than typing in front of it',
     reedit === '12', `"1" then "2" reads "${reedit}"`);
  ok('CONTROL: a caret left at the start would have read "21"', reedit !== '21', `it reads "${reedit}"`);
  // A keyboard user has to be able to leave the bar. TPMath takes Tab for caret motion inside the row.
  await p.click('[data-mx-tsel="eq"]'); await p.waitForTimeout(220);
  await p.click('[data-tp-eqfield]');
  await p.keyboard.press('Tab'); await p.waitForTimeout(90);
  const left = await p.evaluate(() => document.activeElement.dataset.tpEqfield === undefined);
  await p.click('[data-tp-eqfield]'); await p.waitForTimeout(90);
  await p.keyboard.press('ArrowLeft'); await p.waitForTimeout(90);
  const stayed = await p.evaluate(() => document.activeElement.dataset.tpEqfield !== undefined);
  await p.keyboard.press('Escape'); await p.waitForTimeout(220);
  const out = await p.evaluate(() => ({ opener: document.activeElement.dataset.mxTsel === 'eq',
    body: document.activeElement === document.body,
    closed: document.querySelector('[data-mx-eqbar]').hasAttribute('hidden') }));
  ok('Escape closes the equation bar and returns the focus to what opened it',
     out.closed && out.opener, `bar ${out.closed ? 'closed' : 'STILL OPEN'}, focus ${out.opener ? 'on the Equation button' : (out.body ? 'on BODY' : 'ELSEWHERE')}`);
  ok('and Tab leaves the editor rather than being swallowed by the expression',
     left === true, 'Tab moved the focus out of the field');
  ok('CONTROL: the arrows still move the caret inside the expression — that is why Tab could be freed',
     stayed === true, 'ArrowLeft kept the focus in the field');
  // An empty slot has to be visible or there is nothing to aim at.
  await p.click('[data-mx-tsel="eq"]'); await p.waitForTimeout(220);
  await p.click('[data-tp-eqfield]'); await p.keyboard.press('/'); await p.waitForTimeout(200);
  const slots = await p.evaluate(() => { const ph = document.querySelector('[data-tp-eqfield] mtext.ph');
    if (!ph) return null; const on = getComputedStyle(ph);
    const seen = { style: on.borderTopStyle, w: on.borderTopWidth, n: document.querySelectorAll('[data-tp-eqfield] mtext.ph').length };
    ph.classList.remove('ph'); const off = getComputedStyle(ph).borderTopStyle; ph.classList.add('ph');
    return { seen, off }; });
  ok('the empty slots of a fraction are visible', slots && slots.seen.style === 'dotted' && slots.seen.n === 2,
     slots ? `${slots.seen.n} slots, ${slots.seen.w} ${slots.seen.style}` : 'no placeholder found');
  ok('CONTROL: without that rule the slot has no border at all and the student aims at nothing',
     slots && slots.off === 'none', slots ? `unstyled slot: border-style ${slots.off}` : 'n/a');
  await p.keyboard.press('Escape'); await p.waitForTimeout(200);
  // A blank line is one blank line, on the page and after it is read back.
  await p.evaluate(() => { mxTypedWrite(document.querySelector('[data-mx-typed]'), []); });
  await p.click('[data-mx-typed]'); await p.keyboard.type('one');
  await p.keyboard.press('Enter'); await p.keyboard.press('Enter'); await p.keyboard.type('two');
  await p.waitForTimeout(200);
  const blanks = await p.evaluate(() => { const t = document.querySelector('[data-mx-typed]');
    const stored = tpRespGet('practice-equations', 'workbook').value.pages[0].text.map((b) => b.v).join('');
    mxTypedWrite(t, tpRespGet('practice-equations', 'workbook').value.pages[0].text);
    return { stored: JSON.stringify(stored), brs: t.querySelectorAll('br').length }; });
  ok('a blank line comes back as one blank line, not two',
     blanks.stored === JSON.stringify('one\n\ntwo') && blanks.brs === 2,
     `stored ${blanks.stored}, re-rendered with ${blanks.brs} breaks`);
  ok('CONTROL: counting the block break AND the <br> inside it is what made it two',
     blanks.stored !== JSON.stringify('one\n\n\ntwo'), `it would have stored "one\\n\\n\\ntwo"`);
  // Focus is never dropped on the floor by a control that replaces its own container.
  await p.click('[data-mx-tsel="eq"]'); await p.waitForTimeout(200);
  await p.click('[data-mx-eqcancel]'); await p.waitForTimeout(200);
  const f1 = await p.evaluate(() => ({ inPad: !!(document.activeElement.closest && document.activeElement.closest('[data-tp-ink]')),
    what: document.activeElement.dataset.mxTsel === 'eq' ? 'the Equation button'
      : document.activeElement.dataset.mxTyped !== undefined ? 'the page' : document.activeElement.tagName }));
  await p.click('[data-mx-sheet-add]'); await p.waitForTimeout(300);
  const f2 = await p.evaluate(() => ({ inPad: !!(document.activeElement.closest && document.activeElement.closest('[data-tp-ink]')),
    what: document.activeElement.tagName + '.' + String(document.activeElement.className).split(' ')[0] }));
  ok('Cancel and Add-page leave the focus somewhere a keyboard can carry on from',
     f1.inPad && f2.inPad, `Cancel → ${f1.what} · Add page → ${f2.what}`);
  ok('CONTROL: both replace or hide their own container, so focus would otherwise fall to BODY',
     f2.what !== 'BODY.study', `it is ${f2.what}`);
  // Put the fixture back: the Add-page above is a probe, not part of the state the later checks describe.
  await p.evaluate(() => { const d = tpRespGet('practice-equations', 'workbook').value;
    d.pages = d.pages.filter((x) => x.id === 'w1' || x.id === 'w2'); d.current = 'w1';
    if (!d.pages[0].text.length) d.pages[0].text = [{ t: 'p', v: 'typed working on page one' }]; });
  await p.evaluate(() => { const pad = document.querySelector('.mx-wb[data-tp-ink]'); if (pad) mxWorkbookSwap(pad); });
  await p.waitForTimeout(250);
  // Arrow keys belong to whatever is handling them.
  const arrows = await p.evaluate(() => {
    const before = cur;
    document.querySelector('[data-tp-eqfield]').dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    const inEditor = cur;
    document.querySelector('.mx-content').dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    const outside = cur; go(before); return { before, inEditor, outside };
  });
  await p.waitForTimeout(250);
  ok('an arrow key inside the equation editor does not page the lesson out from under it',
     arrows.inEditor === arrows.before,
     `page ${arrows.before} → ${arrows.inEditor} in the editor`);
  ok('CONTROL: the same key outside it still moves the lesson on',
     arrows.outside === arrows.before + 1, `page ${arrows.before} → ${arrows.outside} outside`);
  // …and the same is true of a PLACED equation: a focusable [role=math] chip inside the typed page, which
  // the element-only test did not describe either.
  const chip = await p.evaluate(() => {
    const t = document.querySelector('[data-mx-typed]');
    mxTypedWrite(t, [{ t: 'p', v: 'working ' }, { t: 'eq', v: TPMath.tree('y=x') }]);
    const eq = t.querySelector('.mx-eq'), before = cur, out = { before, role: eq.getAttribute('role') };
    eq.focus(); out.focused = document.activeElement === eq;
    ['ArrowRight', 'ArrowLeft'].forEach((k) => eq.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true })));
    out.after = cur; out.eqs = t.querySelectorAll('.mx-eq').length;
    mxTypedWrite(t, tpRespGet('practice-equations', 'workbook').value.pages[0].text); return out;
  });
  await p.waitForTimeout(200);
  ok('nor does an arrow key on a placed equation inside the typed page',
     chip.focused && chip.after === chip.before && chip.eqs === 1,
     `focused a [role=${chip.role}] chip · page ${chip.before} → ${chip.after} · the equation is still there`);
  await p.evaluate(() => { document.querySelector('[data-mx-eqcancel]').click(); }); await p.waitForTimeout(200);
  // CONTROLS.
  const ctl = await p.evaluate(() => {
    const d = tpRespGet('practice-equations', 'workbook').value;
    const destructive = (() => { const copy = JSON.parse(JSON.stringify(d));
      copy.pages.forEach((x) => { x.text = []; });                 // what a destructive switch would do
      return { before: d.pages.map((x) => x.text.length).join('/'), after: copy.pages.map((x) => x.text.length).join('/') }; })();
    const diverge = (() => { const ink = d.pages.map((x) => x.id), text = d.pages.map((x) => x.id);
      text.push('w3');                                             // separate counters, one modality adds a sheet
      return { ink: ink.join('/'), text: text.join('/'), same: ink.join('/') === text.join('/') }; })();
    return { destructive, diverge };
  });
  ok('CONTROL: a destructive switch would empty one modality', ctl.destructive.before !== ctl.destructive.after,
     `text ${ctl.destructive.before} would become ${ctl.destructive.after}`);
  ok('CONTROL: separate per-modality page counters would diverge; one shared list cannot',
     ctl.diverge.same === false && (await p.evaluate(() => { const d = tpRespGet('practice-equations', 'workbook').value;
       return Object.keys(d.pages[0]).indexOf('ink') >= 0 && Object.keys(d.pages[0]).indexOf('text') >= 0; })) === true,
     `two counters give ${ctl.diverge.ink} vs ${ctl.diverge.text}; the real payload has one list`);
  const domLocal = await p.evaluate(() => { const node = document.querySelector('[data-mx-typed]');
    go(0); return { gone: !document.contains(node),
      storeStillHas: tpRespGet('practice-equations', 'workbook').value.pages[0].text.length }; });
  ok('CONTROL: DOM-local typed state would vanish on that navigation; the store does not',
     domLocal.gone === true && domLocal.storeStillHas > 0,
     `the surface left the document; the store still holds ${domLocal.storeStillHas} block(s)`);
  const bundle = await p.evaluate(() => { const b = tpRespBundle().pages['practice-equations'].workbook;
    return { kind: b.kind, mode: b.value.mode, sheets: b.value.pages.map((x) => ({ id: x.id, ink: x.ink.length, text: x.text.length })) }; });
  ok('the bundle keeps BOTH modalities, per sheet, with the mode alongside rather than deciding it',
     bundle.kind === 'workbook' && bundle.sheets.length === 2
     && bundle.sheets.some((x) => x.ink > 0) && bundle.sheets.some((x) => x.text > 0),
     JSON.stringify(bundle));
  await p.close();
}

// ══ 11. the sheet is a window; the paper scrolls inside it ═══════════════════════════════════════
mark('paper');
{
  // A phone, in the Workbook view — the case where a tall sheet would most easily turn the lesson page
  // into a document several screens long.
  const p = await open(414, 860);
  await p.evaluate(() => mxSetView('workbook')); await p.waitForTimeout(400);
  const empty = await p.evaluate(() => { const sh = document.querySelector('.mx-sheet');
    return { window: Math.round(sh.clientHeight), scrolls: sh.scrollHeight > sh.clientHeight + 1 }; });
  await draw(p, [[.1, .15], [.85, .17]]);
  // The state after ONE stroke near the top, before anything has pushed the paper down.
  const one = await p.evaluate(() => ({ plane: document.querySelector('.mx-wbcanvas').height,
    paper: Math.round(document.querySelector('[data-mx-paper]').getBoundingClientRect().height),
    x: tpWbSheet('practice-equations', 'workbook', 'w1').ink[0].p[0].x,
    y: tpWbSheet('practice-equations', 'workbook', 'w1').ink[0].p[0].y }));
  for (const y of [.35, .55, .75, .92]) await draw(p, [[.1, y], [.85, y + .02]]);
  const full = await p.evaluate(() => { const sh = document.querySelector('.mx-sheet'), pa = document.querySelector('[data-mx-paper]');
    const c = document.querySelector('.mx-wbcanvas'), doc = document.documentElement;
    return { window: Math.round(sh.clientHeight), paper: Math.round(pa.getBoundingClientRect().height),
      scrolls: sh.scrollHeight > sh.clientHeight + 1, store: c.height,
      lessonTall: doc.scrollHeight > doc.clientHeight + 1,
      toolbar: Math.round(document.querySelector('.mx-wsbar').getBoundingClientRect().top),
      tabs: Math.round(document.querySelector('.mx-pagetabs').getBoundingClientRect().bottom),
      vh: window.innerHeight }; });
  ok('working longer than the window gives the student more paper, inside the workbook',
     !empty.scrolls && full.paper > full.window && full.scrolls,
     `paper grew ${empty.window}px → ${full.paper}px in a ${full.window}px window`);
  ok('and the lesson page does not become several screens tall to hold it',
     !full.lessonTall && full.tabs <= full.vh, `page fits the screen; page tabs end at ${full.tabs} of ${full.vh}`);
  // the toolbar and the page controls do not travel with the paper
  const scrolled = await p.evaluate(() => { const sh = document.querySelector('.mx-sheet');
    const t0 = Math.round(document.querySelector('.mx-wsbar').getBoundingClientRect().top);
    const b0 = Math.round(document.querySelector('.mx-pagetabs').getBoundingClientRect().bottom);
    sh.scrollTop = 9999;
    return { moved: Math.round(sh.scrollTop), t0, b0,
      t1: Math.round(document.querySelector('.mx-wsbar').getBoundingClientRect().top),
      b1: Math.round(document.querySelector('.mx-pagetabs').getBoundingClientRect().bottom) }; });
  await p.waitForTimeout(200);
  ok('the paper moves and the toolbar and page tabs stay where they are',
     scrolled.moved > 0 && scrolled.t0 === scrolled.t1 && scrolled.b0 === scrolled.b1,
     `scrolled ${scrolled.moved}px · toolbar ${scrolled.t0}→${scrolled.t1}, tabs ${scrolled.b0}→${scrolled.b1}`);
  // scrolling exposes plane; it does not rescale what is already written
  const same = await p.evaluate(() => { const st = tpWbSheet('practice-equations', 'workbook', 'w1').ink[0];
    const c = document.querySelector('.mx-wbcanvas');
    const d = c.getContext('2d').getImageData(0, 0, c.width, Math.round(c.height * 0.25)).data;
    let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 10) n++;
    return { x: +st.p[0].x.toFixed(2), y: +st.p[0].y.toFixed(2), topInk: n, w: c.width }; });
  ok('the strokes already written keep their exact coordinates and their place on the plane',
     same.w === 1000 && same.topInk > 100,
     `first point (${same.x}, ${same.y}) · ${same.topInk} inked pixels in the top quarter · horizontal scale still ${same.w} units`);
  const grown = await p.evaluate(() => ({ x: tpWbSheet('practice-equations', 'workbook', 'w1').ink[0].p[0].x,
    y: tpWbSheet('practice-equations', 'workbook', 'w1').ink[0].p[0].y,
    plane: document.querySelector('.mx-wbcanvas').height,
    paper: Math.round(document.querySelector('[data-mx-paper]').getBoundingClientRect().height),
    strokes: tpWbSheet('practice-equations', 'workbook', 'w1').ink.length }));
  ok('CONTROL: the plane grew, and the first stroke did NOT move — more paper, not smaller writing',
     grown.plane > one.plane && grown.paper > one.paper && grown.x === one.x && grown.y === one.y,
     `paper ${one.paper}→${grown.paper}px, plane ${one.plane}→${grown.plane} units; the first point stayed (${grown.x}, ${grown.y.toFixed(2)})`);
  // work at the bottom survives leaving it and coming back
  await p.evaluate(() => { document.querySelector('.mx-sheet').scrollTop = 0; }); await p.waitForTimeout(250);
  await p.evaluate(() => { document.querySelector('.mx-sheet').scrollTop = 9999; }); await p.waitForTimeout(250);
  const kept = await p.evaluate(() => tpWbSheet('practice-equations', 'workbook', 'w1').ink.length);
  ok('writing near the bottom survives scrolling away and back', kept === grown.strokes,
     `${grown.strokes} strokes before, ${kept} after`);
  // each page keeps its own place on its own paper
  const s1 = await p.evaluate(() => Math.round(document.querySelector('.mx-sheet').scrollTop));
  await p.click('[data-mx-sheet-add]'); await p.waitForTimeout(350);
  const s2 = await p.evaluate(() => Math.round(document.querySelector('.mx-sheet').scrollTop));
  await p.click('[data-mx-sheet="w1"]'); await p.waitForTimeout(400);
  const s3 = await p.evaluate(() => Math.round(document.querySelector('.mx-sheet').scrollTop));
  ok('each workbook page keeps its own scroll position', s1 > 0 && s2 === 0 && s3 === s1,
     `Page 1 at ${s1}px → Page 2 opens at ${s2}px → Page 1 returns to ${s3}px`);
  await p.close();
}
{
  // Desktop: the two regions scroll independently, and neither drags the other.
  const p = await open(1536, 760);
  for (const y of [.2, .5, .8, .95]) await draw(p, [[.1, y], [.85, y + .02]]);
  const r = await p.evaluate(() => { const c = document.querySelector('.mx-content'), sh = document.querySelector('.mx-sheet');
    const both = { q: c.scrollHeight > c.clientHeight + 1, s: sh.scrollHeight > sh.clientHeight + 1 };
    const padTop = document.querySelector('.mx-wb').getBoundingClientRect().top;
    c.scrollTop = 200;
    const a = { q: Math.round(c.scrollTop), padMoved: Math.round(document.querySelector('.mx-wb').getBoundingClientRect().top - padTop),
      sheet: Math.round(sh.scrollTop) };
    sh.scrollTop = 150;
    return { both, a, b: { s: Math.round(sh.scrollTop), q: Math.round(c.scrollTop) } }; });
  ok('on desktop the question column and the workbook paper scroll independently',
     r.both.q && r.both.s && r.a.padMoved === 0 && r.a.sheet === 0 && r.b.q === r.a.q,
     `questions → ${r.a.q} leaves the workbook still (${r.a.padMoved}px) and its paper at ${r.a.sheet}; paper → ${r.b.s} leaves the questions at ${r.b.q}`);
  ok('CONTROL: both regions really could have scrolled, so "independent" is not "neither moved"',
     r.both.q && r.both.s, 'question column and sheet are both scrollable at this height');
  await p.close();
}
const SECTIONS = ['pen', 'sheets', 'persist', 'identity', 'layout', 'narrow', 'table', 'fit', 'wide', 'mode', 'paper'];
const missing = SECTIONS.filter((s) => !ran.has(s));
ok('every section ran', missing.length === 0, missing.length ? 'missing: ' + missing.join(', ') : `${SECTIONS.length} sections`);
ok('no page error while drawing, switching or navigating', pageErrs.length === 0, pageErrs.slice(0, 3).join(' | '));

await browser.close(); server.close();
console.log(results.join('\n'));
const pass = results.filter((r) => r.startsWith('PASS')).length;
const fail = results.filter((r) => r.startsWith('FAIL')).length;
console.log(`\n${pass}/${pass + fail} checks passed`);
process.exit(failed ? 1 : 0);
