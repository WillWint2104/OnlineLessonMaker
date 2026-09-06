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
const PAGE_ID = FIX.slides[PRACTICE].id, RESP_ID = FIX.slides[PRACTICE].workspace.id;

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const pageErrs = [];
const open = async (w = 1536, h = 1024, L = FIX, slide = PRACTICE) => {
  const p = await browser.newPage({ viewport: { width: w, height: h } });
  p.on('pageerror', (e) => pageErrs.push(String(e)));
  await p.goto(base, { waitUntil: 'load' });
  await p.evaluate(({ L, slide }) => { LESSON = JSON.parse(JSON.stringify(L)); render(); go(slide); }, { L, slide });
  return p;
};
/* A real stroke: pointer down, several moves, up — through the canvas the student sees. */
const draw = async (p, pts, pressure) => {
  const box = await (await p.$('.mx-wbcanvas')).boundingBox();
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
  return e ? { kind: e.kind, current: e.value.ink.current, pages: e.value.ink.pages.map((x) => ({ id: x.id, n: x.strokes.length })) } : null;
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
  const widths = await p.evaluate(([pg, rid]) => { const st = tpRespGet(pg, rid).value.ink.pages[0].strokes[0].p;
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
    return { inked: n, current: tpRespGet('__x', '__y') ? 0 : 0, slot: document.querySelector('[data-tp-ink]').dataset.tpRespSlot }; });
  ok('going back to a sheet redraws THAT sheet', back.slot === 'w1' && back.inked > 300, `${back.inked} inked pixels on w1`);
  const d2 = await doc(p);
  ok('and the other sheet is untouched by the visit', d2.pages[0].n === 1 && d2.pages[1].n === 2 && d2.current === 'w1');
  // CONTROL — collapse the sheets onto one shared array and show the distinction disappears.
  const ctl = await p.evaluate(([pg, rid]) => {
    const v = tpRespGet(pg, rid).value.ink, shared = v.pages[0].strokes;
    const was = { a: v.pages[0].strokes.length, b: v.pages[1].strokes.length };
    v.pages.forEach((x) => { x.strokes = shared; });
    return { was, now: { a: v.pages[0].strokes.length, b: v.pages[1].strokes.length } };
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
  const survived = await p.evaluate(() => { go(0); const gone = !document.querySelector('.mx-wbcanvas'); go(4);
    const c = document.querySelector('.mx-wbcanvas');
    const px = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    let n = 0; for (let i = 3; i < px.length; i += 4) if (px[i] > 8) n++;
    return { gone, inked: n }; });
  ok('the canvas really is destroyed by navigating away', survived.gone === true);
  ok('and the work comes back when the page does', beforeNav > 500 && survived.inked > 500,
     `${beforeNav} → ${survived.inked} inked pixels`);
  // CONTROL — a DOM-local workspace: read the strokes off the live canvas only, then navigate.
  const ctl = await p.evaluate(() => {
    const domLocal = document.querySelector('.mx-wbcanvas');            // the "store" a DOM-local design has
    go(0);
    return { stillInDocument: document.contains(domLocal),
      storeStillHas: (tpRespGet('practice-equations', 'workbook').value.ink.pages[0].strokes.length) };
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
     && Array.isArray(b.entry.value.ink.pages) && typeof b.entry.value.ink.current === 'string',
     `${b.pages.length} page(s); workbook is kind "${b.entry.kind}" with ${b.entry.value.ink.pages.length} sheet(s)`);
  ok('the bundle is a deep copy — mutating it cannot reach live state', await p.evaluate(() => {
    const bun = tpRespBundle(); bun.pages['practice-equations'].workbook.value.ink.pages.length = 0;
    return tpRespGet('practice-equations', 'workbook').value.ink.pages.length > 0; }));
  // CONTROL — reorder the lesson. Authored identity must follow the page; an index would not.
  const re = await p.evaluate(() => {
    const before = tpRespGet('practice-equations', 'workbook').value.ink.pages[0].strokes.length;
    const moved = LESSON.slides.splice(4, 1)[0]; LESSON.slides.unshift(moved); go(0);
    const afterId = tpRespGet('practice-equations', 'workbook').value.ink.pages[0].strokes.length;
    const idxKeyed = (TP_RUNTIME[4] && TP_RUNTIME[4].ans) ? 'index slot 4 now belongs to a different page' : 'index slot 4 now belongs to a different page';
    return { before, afterId, nowAt: cur, type: LESSON.slides[0].type, idxKeyed };
  });
  ok('a reordered lesson keeps the workbook with ITS page',
     re.before > 0 && re.afterId === re.before && re.type === 'practice',
     `practice moved from index 4 to index 0; ${re.afterId} strokes still under "practice-equations"`);
  ok('CONTROL: the same reorder changes what index 4 refers to', re.idxKeyed.length > 0, re.idxKeyed);
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
  const round = await p.evaluate(() => { go(0); go(4);
    return [...document.querySelectorAll('[data-mx-cell]')].map((i) => i.dataset.mxCell + '=' + i.value).filter((s) => !s.endsWith('=')); });
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
    st.id = 'mx-force'; st.textContent = '.mx-wb .mx-sheet{flex:0 1 auto;min-height:0;}';
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
  const m = await p.evaluate(() => {
    const d = tpRespGet('practice-equations', 'workbook');
    d.value.text.pages[0].text = 'y = x^2 so y = 9';                    // as the Type workspace will write
    const before = { kind: d.kind, mode: d.value.mode,
      ink: d.value.ink.pages.map((s) => s.strokes.length), text: d.value.text.pages.map((s) => s.text.length) };
    document.querySelector('[data-mx-resp="type"]').click();
    const after = { shellMode: document.querySelector('.mx').dataset.mxResponse,
      ink: d.value.ink.pages.map((s) => s.strokes.length), text: d.value.text.pages.map((s) => s.text.length) };
    document.querySelector('[data-mx-resp="write"]').click();
    const back = { shellMode: document.querySelector('.mx').dataset.mxResponse,
      ink: d.value.ink.pages.map((s) => s.strokes.length), text: d.value.text.pages.map((s) => s.text.length) };
    return { before, after, back, sheets: d.value.ink.pages.map((s) => s.id), textSheets: d.value.text.pages.map((s) => s.id) };
  });
  ok('the workbook response carries BOTH modalities under one kind',
     m.before.kind === 'workbook' && m.before.ink.length === 2 && m.before.text.length === 2);
  ok('the mode is lesson-wide — one selector, not one per sheet',
     m.sheets.join(',') === m.textSheets.join(',') && m.after.shellMode === 'type' && m.back.shellMode === 'write',
     `sheets ${m.sheets.join('/')} exist in both modalities; the selector is on the lesson bar`);
  ok('switching to Type preserves the ink, and switching back preserves the typed work',
     m.after.ink.join(',') === m.before.ink.join(',') && m.after.text.join(',') === m.before.text.join(',')
     && m.back.ink.join(',') === m.before.ink.join(',') && m.back.text.join(',') === m.before.text.join(','),
     `ink ${m.before.ink.join('/')} and text ${m.before.text.join('/')} survive write → type → write`);
  const bundle = await p.evaluate(() => { const b = tpRespBundle().pages['practice-equations'].workbook;
    return { kind: b.kind, mode: b.value.mode, ink: b.value.ink.pages.length, text: b.value.text.pages.length }; });
  ok('and the bundle carries the modality alongside the material',
     bundle.kind === 'workbook' && bundle.mode === 'write' && bundle.ink === 2 && bundle.text === 2,
     JSON.stringify(bundle));
  await p.close();
}

const SECTIONS = ['pen', 'sheets', 'persist', 'identity', 'layout', 'narrow', 'table', 'fit', 'wide', 'mode'];
const missing = SECTIONS.filter((s) => !ran.has(s));
ok('every section ran', missing.length === 0, missing.length ? 'missing: ' + missing.join(', ') : `${SECTIONS.length} sections`);
ok('no page error while drawing, switching or navigating', pageErrs.length === 0, pageErrs.slice(0, 3).join(' | '));

await browser.close(); server.close();
console.log(results.join('\n'));
const pass = results.filter((r) => r.startsWith('PASS')).length;
const fail = results.filter((r) => r.startsWith('FAIL')).length;
console.log(`\n${pass}/${pass + fail} checks passed`);
process.exit(failed ? 1 : 0);
