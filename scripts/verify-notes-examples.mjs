#!/usr/bin/env node
// THE STAGE C GATE — Notes and Worked Examples.
//
//   node scripts/verify-notes-examples.mjs
//
// TABS ARE ALTERNATIVE COMPLETE EXAMPLES, NOT FRAGMENTS OF ONE. The earlier build partitioned a single
// mathematical idea across `Graph | Table | Coordinates`, so a learner had to switch tabs to reconstruct
// one thought. Switching tabs must instead mean "show me another complete example of this concept": every
// pane carries the whole idea — its own drawing, its own coordinates, its own stated relationship.
//
// AND A REGION THAT EXISTS BUT HOLDS NOTHING IS A FAILURE, exactly as a zero-height workbook was. A tab
// strip over an empty box is not responsive adaptation; it is loss of the learning asset. Every viewport
// here measures the rendered content area, and the control strips the rules that size it to show the
// measurement drives that failure back.
//
// Every claim is paired with a control, because "it renders" and "it is data-driven" look identical on a
// fixture that happens to match the hard-coded case.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
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
const NOTES = FIX.slides.findIndex((s) => s.type === 'notes');
const WEX = FIX.slides.findIndex((s) => s.type === 'workedExamples');
const NEX = FIX.slides[NOTES].examples;
const WEXS = FIX.slides[WEX].examples;
const mxPartKinds = (v) => (!v || typeof v !== 'object') ? []
  : (Array.isArray(v) ? v : Array.isArray(v.parts) ? v.parts : v.kind ? [v] : []).map((q) => q.kind);

let pass = 0, fail = 0; const sections = new Set();
const mark = (s) => sections.add(s);
const ok = (what, cond, detail) => {
  if (cond) { pass++; console.log(`PASS ${what}${detail ? '  ' + detail : ''}`); }
  else { fail++; console.log(`FAIL ${what}${detail ? '  ' + detail : ''}`); }
};
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const pageErrs = [];
const open = async ({ w = 1536, h = 1024, slide = NOTES, lesson = FIX } = {}) => {
  const p = await browser.newPage({ viewport: { width: w, height: h } });
  p.on('pageerror', (e) => pageErrs.push(String(e)));
  await p.goto(base, { waitUntil: 'load' });
  await p.evaluate(({ L, s }) => { LESSON = JSON.parse(JSON.stringify(L)); render(); go(s); }, { L: lesson, s: slide });
  await p.waitForTimeout(500);
  return p;
};
const tabs = (p) => p.evaluate(() => [].slice.call(document.querySelectorAll('[data-mx-tab]'))
  .map((e) => ({ id: e.dataset.mxTab, label: e.textContent.trim() })));
const panels = (p) => p.evaluate(() => [].slice.call(document.querySelectorAll('[data-mx-panel]'))
  .map((e) => ({ id: e.dataset.mxPanel, shown: !e.hidden })));
// what one pane actually holds, and how big each piece of it came out
const paneOf = (p, id) => p.evaluate((sel) => {
  const e = sel ? document.querySelector(`[data-mx-panel="${sel}"]`) : document.querySelector('.mx-expane:not([hidden])');
  if (!e) return null;
  const r = e.getBoundingClientRect();
  return { id: e.dataset.mxPanel, box: [Math.round(r.width), Math.round(r.height)], top: Math.round(r.top),
    parts: [].slice.call(e.querySelectorAll('.mx-part')).map((x) => {
      const q = x.getBoundingClientRect(); const svg = x.querySelector('svg');
      const s = svg ? svg.getBoundingClientRect() : null;
      return { kind: x.dataset.mxPart, w: Math.round(q.width), h: Math.round(q.height),
        svg: s ? [Math.round(s.width), Math.round(s.height)] : null,
        escapes: s ? (s.height > q.height + 2 || s.width > q.width + 2) : false }; }),
    text: e.textContent.replace(/\s+/g, ' ').trim() };
}, id);

// ══ Notes — the tabs are whole examples ══════════════════════════════════════════════════════════
mark('composition');
{
  const p = await open();
  const t = await tabs(p), pn = await panels(p);
  ok('the tabs are the authored examples, by authored id and label',
     t.map((x) => x.id).join('/') === NEX.map((e) => e.id).join('/') && t.length === NEX.length,
     t.map((x) => `${x.id}="${x.label}"`).join(' · '));
  ok('a tab names a whole demonstration, not a representation of one',
     !t.some((x) => /^(graph|table|coordinates|points|prose|relations)$/i.test(x.label))
     && NEX.every((e) => e.parts.length >= 3 && new Set(e.parts.map((q) => q.kind)).size >= 2),
     t.map((x) => `${x.label} (${NEX.find((e) => e.id === x.id).parts.map((q) => q.kind).join('+')})`).join(' · '));
  ok('exactly one example is shown at a time', pn.filter((x) => x.shown).length === 1 && pn[0].shown,
     pn.map((x) => x.id + (x.shown ? ' (shown)' : '')).join(' · '));
  const first = await paneOf(p);
  const authoredKinds = NEX[0].parts.map((x) => x.kind);
  ok('THE WHOLE IDEA IS IN ONE PANE — the selected example carries its own drawing, coordinates and relationship',
     first.parts.map((x) => x.kind).join('+') === authoredKinds.join('+') && authoredKinds.length >= 3,
     `${first.id}: ${first.parts.map((x) => x.kind).join(' + ')} — no tab switch needed to reconstruct it`);
  await p.click(`[data-mx-tab="${NEX[1].id}"]`); await p.waitForTimeout(300);
  const second = await paneOf(p);
  ok('CONTROL: switching tabs shows ANOTHER COMPLETE EXAMPLE, not the next fragment of this one',
     second.id === NEX[1].id
     && second.parts.map((x) => x.kind).join('+') === NEX[1].parts.map((x) => x.kind).join('+')
     && second.text !== first.text,
     `${second.id} is self-sufficient too (${second.parts.map((x) => x.kind).join(' + ')}) and states a different rule`);
  const drawn = await p.evaluate((ids) => ids.map((id) => {
    /* the PLOTTED curve, from inside the figure's own svg — not the chrome icons, which are identical everywhere */
    const g = document.querySelector(`[data-mx-panel="${id}"] .tp-fig-svg`);
    const d = g ? [].slice.call(g.querySelectorAll('path[d],polyline[points]'))
      .map((e) => e.getAttribute('d') || e.getAttribute('points')).join('|') : '';
    const co = [].slice.call(document.querySelectorAll(`[data-mx-panel="${id}"] .mx-points li`))
      .map((e) => e.textContent.trim()).join(' ');
    return { id, len: d.length, d, co }; }), NEX.map((e) => e.id));
  ok('CONTROL: each example is drawn and worded for itself — the panes are not one view repeated',
     drawn.every((x) => x.len > 200) && new Set(drawn.map((x) => x.co)).size === NEX.length,
     drawn.map((x) => `${x.id}: ${x.len}-char path, its own coordinates`).join(' · '));

  /* EVERY TAB MUST EXPLORE THE SAME MATHEMATICAL OBJECT AS THE PERSISTENT CONCEPT PANEL. The panel states
     the vertex is (0, 0), that y ≥ 0 and that the axis of symmetry is the y-axis. A tab that changed the
     function would leave those statements false beside it — the page would contradict itself. The tabs are
     redundant demonstrations of the stable knowledge, not different objects sharing one explanation. */
  const fns = [];
  for (const e of NEX) for (const q of e.parts) if (q.kind === 'figure')
    for (const o of (q.figure.objects || [])) if (o.type === 'function') fns.push({ id: e.id, f: o.f });
  ok('EVERY TAB EXPLORES THE SAME OBJECT THE CONCEPT PANEL DESCRIBES — the page cannot contradict itself',
     fns.length >= NEX.length && new Set(fns.map((x) => x.f)).size === 1,
     `${fns.length} plotted functions across ${NEX.length} tabs, all of them ${fns[0] && fns[0].f}`);
  await p.close();
}
{
  // The concept panel is the stable knowledge. It must not move when a tab does.
  const p = await open();
  const stable = await p.evaluate((ids) => {
    const read = () => [].slice.call(document.querySelectorAll('[data-mx-concept]'))
      .map((e) => e.dataset.mxConcept + ':' + e.textContent.replace(/\s+/g, ' ').trim()).join('|');
    const before = read(), node = document.querySelector('[data-mx-concept]');
    const seen = [];
    for (const id of ids) { document.querySelector(`[data-mx-tab="${id}"]`).click(); seen.push(read()); }
    return { same: seen.every((x) => x === before), sameNode: node === document.querySelector('[data-mx-concept]'),
      n: before.split('|').length }; }, NEX.map((e) => e.id));
  ok('the concept panel does not change with the tab — it is the stable knowledge beside the demonstrations',
     stable.same && stable.sameNode,
     `${stable.n} concepts, identical text and the same nodes across all ${NEX.length} tabs`);
  await p.close();
}
{
  // CONTROL: the same check fires when a tab is re-authored onto a different function.
  const alt = JSON.parse(JSON.stringify(FIX));
  for (const q of alt.slides[NOTES].examples[1].parts)
    if (q.kind === 'figure') for (const o of (q.figure.objects || [])) if (o.type === 'function') o.f = 'x^2+2';
  const fns = [];
  for (const e of alt.slides[NOTES].examples) for (const q of e.parts) if (q.kind === 'figure')
    for (const o of (q.figure.objects || [])) if (o.type === 'function') fns.push(o.f);
  ok('CONTROL: change one tab to y = x² + 2 and that check fails — vertex (0, 0) would be false beside it',
     new Set(fns).size !== 1, `functions become ${[...new Set(fns)].join(' and ')}`);
}
{
  const p = await open();
  const concepts = await p.evaluate(() => [].slice.call(document.querySelectorAll('[data-mx-concept]')).map((e) => e.dataset.mxConcept));
  const authored = FIX.slides[NOTES].concepts.map((c) => c.id);
  ok('the concept list is exactly what the lesson authors — nothing invented to fill the layout',
     concepts.join(',') === authored.join(','), `${concepts.length} concepts: ${concepts.join(', ')}`);
  const grown = await p.evaluate(() => { LESSON.slides[0].concepts.push({ id: 'extra', term: 'Extra', body: 'Added by the control.' });
    go(0); return [].slice.call(document.querySelectorAll('[data-mx-concept]')).map((e) => e.dataset.mxConcept); });
  ok('CONTROL: the count follows the JSON, so the four are four because the lesson says so',
     grown.length === authored.length + 1 && grown[grown.length - 1] === 'extra',
     `${authored.length} authored → ${authored.length} rendered; a fifth is added → ${grown.length}`);
  await p.close();
}
{
  const p = await open();
  /* A part label may carry notation. Uppercasing it would print Y = X^2, which is a different statement. */
  const labels = await p.evaluate(() => [].slice.call(document.querySelectorAll('.mx-parth')).map((e) => ({
    text: e.textContent.trim(), math: !!e.querySelector('i,sup,sub'),
    upper: getComputedStyle(e).textTransform === 'uppercase' })));
  ok('a label carrying mathematics keeps its own case; a label of plain words still gets small caps',
     labels.length > 0 && labels.every((l) => l.math ? !l.upper : l.upper),
     labels.map((l) => `"${l.text}" ${l.math ? 'notation → own case' : 'words → small caps'}`).join(' · '));
  ok('nothing on the Notes page asks the student to type into it',
     await p.evaluate(() => document.querySelectorAll('.mx-content input, .mx-content textarea, .mx-content [contenteditable="true"]').length === 0),
     'no "record in your notes" field, no "what to write down" panel');
  const withKI = await p.evaluate(() => { const a = document.querySelector('.mx-keyidea');
    return { present: !!a, w: a ? Math.round(a.getBoundingClientRect().width) : 0 }; });
  const without = await p.evaluate(() => { delete LESSON.slides[0].keyIdea; go(0);
    const boxes = [].slice.call(document.querySelectorAll('.mx-head *')).filter((e) => {
      const r = e.getBoundingClientRect(); return r.width > 40 && r.height > 20 && !e.textContent.trim(); });
    return { present: !!document.querySelector('.mx-keyidea'), emptyBoxes: boxes.length, title: !!document.querySelector('.mx-title') }; });
  ok('the Key Idea is optional, and removing it leaves no reserved hole',
     withKI.present && !without.present && without.emptyBoxes === 0 && without.title,
     `absent: no element, ${without.emptyBoxes} empty boxes, heading intact`);
  ok('CONTROL: it really was there to remove — the same page renders it when authored',
     withKI.present && withKI.w > 100, `the aside measured ${withKI.w}px`);
  await p.close();
}
{
  // Relabel, reorder, add — the renderer is not touched.
  const alt = JSON.parse(JSON.stringify(FIX));
  const ex = alt.slides[NOTES].examples;
  alt.slides[NOTES].examples = [ex[2], ex[0], ex[1]];
  alt.slides[NOTES].examples[0].label = 'The reflection';
  alt.slides[NOTES].examples.push({ id: 'ex-wide', label: '_y_ = 2_x_^2',
    parts: [{ kind: 'relations', items: ['Doubling the coefficient makes the curve rise twice as fast.'] }] });
  const p = await open({ lesson: alt });
  const t = await tabs(p);
  ok('CONTROL: relabelling, reordering and adding changes the page, with no renderer change',
     t.map((x) => x.id).join('/') === [NEX[2].id, NEX[0].id, NEX[1].id, 'ex-wide'].join('/')
     && t[0].label === 'The reflection' && t.length === 4,
     t.map((x) => `${x.id}="${x.label}"`).join(' · '));
  ok('and an example may compose different parts — this one authors a relationship and no drawing',
     await p.evaluate(() => { document.querySelector('[data-mx-tab="ex-wide"]').click();
       const e = document.querySelector('[data-mx-panel="ex-wide"]');
       return !e.hidden && e.querySelectorAll('.mx-part').length === 1
         && e.querySelector('[data-mx-part="relations"]') && !e.querySelector('svg'); }),
     'one relations part, no figure box reserved for a drawing it does not have');
  await p.close();
}
// ══ Notes — the region must hold usable content, at every width ══════════════════════════════════
mark('viability');
const VIEWS = [[1536, 1024, 'split'], [1280, 900, 'split'], [1024, 768, 'stack'], [834, 1112, 'stack'], [414, 860, 'stack']];
{
  const seen = [];
  for (const [w, h, want] of VIEWS) {
    const p = await open({ w, h });
    const min = await p.evaluate(() => { const cs = getComputedStyle(document.querySelector('.mx'));
      return { h: parseInt(cs.getPropertyValue('--mx-rep-min-h'), 10) }; });
    const pane = await paneOf(p);
    const fit = await p.evaluate(() => document.querySelector('.mx').dataset.mxFit);
    const fig = pane.parts.find((x) => x.kind === 'figure');
    seen.push({ w, h, fit, want, pane: pane.box, fig: fig ? [fig.w, fig.h] : null,
      usable: pane.parts.every((x) => x.w >= 120 && x.h >= 16 && !x.escapes) && !!fig && fig.h >= Math.min(min.h, 280),
      parts: pane.parts.length });
    await p.close();
  }
  ok('THE SELECTED EXAMPLE HAS A REAL CONTENT AREA AT EVERY WIDTH — never a tab strip over an empty box',
     seen.every((s) => s.usable && s.parts === NEX[0].parts.length),
     seen.map((s) => `${s.w}×${s.h} ${s.fit}: pane ${s.pane.join('×')}, figure ${s.fig.join('×')}`).join(' · '));
  ok('the layout chooses side-by-side or stacked on the room it actually has',
     seen.every((s) => s.fit === s.want), seen.map((s) => `${s.w}×${s.h}→${s.fit}`).join(' · '));
}
{
  // THE CONTROL. Strip the rules that give the figure part its box and the same measurement must fail:
  // the region still exists, the tabs still render, and the content area collapses to nothing.
  const broke = [];
  for (const [w, h] of VIEWS) {
    const p = await open({ w, h });
    const n = await p.evaluate(() => { let n = 0;
      for (const ss of document.styleSheets) { let rs; try { rs = ss.cssRules; } catch (e) { continue; }
        for (let i = rs.length - 1; i >= 0; i--) {
          const r = rs[i]; if (r.selectorText && /\[data-mx-part="figure"\]/.test(r.selectorText)) { ss.deleteRule(i); n++; } } }
      go(0); return n; });
    await p.waitForTimeout(400);
    const pane = await paneOf(p);
    const fig = pane.parts.find((x) => x.kind === 'figure');
    broke.push({ w, h, stripped: n, tabs: (await tabs(p)).length, figH: fig ? fig.h : -1, escapes: fig ? fig.escapes : false });
    await p.close();
  }
  ok('CONTROL: strip the rules that size the drawing and every viewport fails this gate',
     broke.every((b) => b.stripped > 0 && b.tabs === NEX.length && (b.figH < 16 || b.escapes)),
     broke.map((b) => `${b.w}×${b.h}: ${b.tabs} tabs still there, figure ${b.figH}px${b.escapes ? ' + overflowing' : ''}`).join(' · '));
}
{
  // Stacked, the example must sit under the concepts as a full-width column — not a sliver, not a screen away.
  const p = await open({ w: 834, h: 1112 });
  const m = await p.evaluate(() => {
    const card = document.querySelector('.mx-content > *'), pane = document.querySelector('.mx-expane:not([hidden])');
    const panel = pane.closest('.mx-expanel');
    const a = card.getBoundingClientRect(), b = panel.getBoundingClientRect();
    return { gap: Math.round(b.top - a.bottom), cardW: Math.round(a.width), panelW: Math.round(b.width) }; });
  ok('stacked, the example follows the concepts directly and takes the full column width',
     m.gap >= 0 && m.gap <= 40 && Math.abs(m.cardW - m.panelW) <= 4,
     `gap ${m.gap}px · concepts ${m.cardW}px wide, example ${m.panelW}px`);
  await p.close();
  const q = await open({ w: 1536, h: 1024 });
  const s = await q.evaluate(() => {
    const card = document.querySelector('.mx-content > *'), panel = document.querySelector('.mx-expanel');
    const a = card.getBoundingClientRect(), b = panel.getBoundingClientRect();
    return { sideBySide: b.left >= a.right - 2, tops: Math.abs(Math.round(a.top - b.top)) }; });
  ok('CONTROL: given the room, the same page puts them side by side instead',
     s.sideBySide && s.tops <= 4, 'the example column starts where the concepts card ends, at the same top');
  await q.close();
}
// ══ Worked examples ══════════════════════════════════════════════════════════════════════════════
mark('examples');
{
  const p = await open({ slide: WEX });
  const t = await tabs(p);
  ok('the example tabs are the authored examples, by authored id',
     t.map((x) => x.id).join('/') === WEXS.map((e) => e.id).join('/'),
     t.map((x) => `${x.id}="${x.label}"`).join(' · '));
  const counts = await p.evaluate(() => [].slice.call(document.querySelectorAll('[data-mx-panel]'))
    .map((e) => ({ id: e.dataset.mxPanel, steps: e.querySelectorAll('.mx-step').length,
      cols: e.querySelector('.mx-wexbody') ? e.querySelector('.mx-wexbody').dataset.mxWexcols : '0',
      visKinds: [].slice.call(e.querySelectorAll('.mx-wexvis .mx-part')).map((x) => x.dataset.mxPart),
      stepVis: [].slice.call(e.querySelectorAll('.mx-step[data-mx-stepvis]')).map((x) => x.dataset.mxStep),
      result: !!e.querySelector('.mx-wexres') })));
  ok('every example shows its whole solution and its answer',
     counts.every((c) => c.steps >= 3 && c.result) && counts.map((c) => c.steps).join('/') === WEXS.map((e) => e.steps.length).join('/'),
     counts.map((c) => `${c.id}: ${c.steps} steps + answer`).join(' · '));
  /* A VISUAL EXISTS TO CARRY THE MATHEMATICS, NOT TO SATISFY A GATE. The rule is not "every example has a
     picture" — that would reserve a large blank region beside a single substitution. The rule is that an
     example gets a companion column exactly when it authors one, and that a column it gets is filled. */
  const authored = WEXS.map((e) => mxPartKinds(e.visual));
  ok('an example gets a companion column exactly when it authors one — no blank region is ever reserved',
     counts.every((c, k) => c.cols === (authored[k].length ? '2' : '1') && c.visKinds.join('+') === authored[k].join('+')),
     counts.map((c, k) => `${c.id}: ${authored[k].length ? c.visKinds.join(' + ') : 'no companion, one column'}`).join(' · '));
  const filled = await p.evaluate((ids) => ids.map((id) => {
    document.querySelector(`[data-mx-tab="${id}"]`).click();
    const v = document.querySelector(`[data-mx-panel="${id}"] .mx-wexvis`);
    if (!v) return { id, none: true };
    const r = v.getBoundingClientRect();
    const parts = [].slice.call(v.querySelectorAll('.mx-part'))
      .map((x) => { const q = x.getBoundingClientRect(); return { k: x.dataset.mxPart, w: Math.round(q.width), h: Math.round(q.height) }; });
    return { id, w: Math.round(r.width), parts }; }), WEXS.map((e) => e.id));
  ok('a companion column that exists is filled — the empty-region rule applies here too',
     filled.every((f) => f.none || (f.w >= 200 && f.parts.length && f.parts.every((q) => q.w >= 120 && q.h >= 16))),
     filled.map((f) => f.none ? `${f.id}: no column` : `${f.id}: ${f.parts.map((q) => `${q.k} ${q.w}×${q.h}`).join(', ')}`).join(' · '));
  const reauthored = await p.evaluate((k) => {
    const id = LESSON.slides[1].examples[k].id;
    LESSON.slides[1].examples[k].visual = { parts: [{ kind: 'table', label: 'Values', stub: '_x_',
      head: ['−4', '0', '4'], rows: [{ label: '_y_', cells: ['16', '0', '16'] }] }] }; go(1);
    document.querySelector(`[data-mx-tab="${id}"]`).click();
    const v = document.querySelector(`[data-mx-panel="${id}"] .mx-wexvis`);
    return { kinds: [].slice.call(v.querySelectorAll('.mx-part')).map((x) => x.dataset.mxPart),
      table: !!v.querySelector('table'), svg: !!v.querySelector('svg') }; },
    WEXS.findIndex((e) => mxPartKinds(e.visual).indexOf('figure') >= 0));
  ok('CONTROL: the renderer assumes nothing about which kind a companion is — re-author it and the page follows',
     reauthored.kinds.join('+') === 'table' && reauthored.table && !reauthored.svg,
     'the graph companion becomes a table with no renderer change');
  /* A visual may belong to the whole example OR to the step that earns it. Which steps those are comes from
     the JSON, not from this file: the gate asserts the page follows the authoring, measured on screen. */
  const authoredSteps = WEXS.map((e) => e.steps.filter((st) => mxPartKinds(st.visual).length).map((st) => st.id));
  const stepVis = await p.evaluate((ids) => ids.map((id) => {
    document.querySelector(`[data-mx-tab="${id}"]`).click();
    return [].slice.call(document.querySelectorAll(`[data-mx-panel="${id}"] .mx-step[data-mx-stepvis]`))
      .map((e) => ({ step: e.dataset.mxStep,
        h: Math.round(e.querySelector('.mx-stepvis .mx-part').getBoundingClientRect().height),
        inside: e.querySelector('.mx-stepvis').getBoundingClientRect().bottom <= e.getBoundingClientRect().bottom + 2 })); }),
    WEXS.map((e) => e.id));
  ok('a STEP may carry its own visual state, and it renders inside that step',
     stepVis.every((v, k) => v.map((x) => x.step).join(',') === authoredSteps[k].join(',')
       && v.every((x) => x.h > 12 && x.inside)),
     stepVis.map((v, k) => `${WEXS[k].id}: ${v.length ? v.map((x) => `step ${x.step} (${x.h}px, inside the step)`).join(', ') : 'no step visual'}`).join(' · '));
  await p.close();
}
{
  const p = await open({ slide: WEX });
  const sizes = (await p.evaluate((ids) => ids.map((id) => {
    document.querySelector(`[data-mx-tab="${id}"]`).click();
    const v = document.querySelector(`[data-mx-panel="${id}"] .mx-wexvis`);
    if (!v) return null;                                     /* this example authors no companion */
    const n = v.querySelector('svg') || v.querySelector('table');
    const r = n.getBoundingClientRect(); const b = v.getBoundingClientRect();
    return { id, tag: n.tagName.toLowerCase(), w: Math.round(r.width), h: Math.round(r.height),
      inside: r.right <= b.right + 2 && r.bottom <= b.bottom + 2 }; }), WEXS.map((e) => e.id))).filter(Boolean);
  ok('a companion that is there is big enough to be read and stays inside its column',
     sizes.length > 0 && sizes.every((s) => s.w >= 240 && s.h >= (s.tag === 'svg' ? 200 : 60) && s.inside),
     sizes.map((s) => `${s.id}: ${s.tag} ${s.w}×${s.h}`).join(' · '));
  const withVis = WEXS.findIndex((e) => mxPartKinds(e.visual).length);
  const solo = await p.evaluate((k) => { delete LESSON.slides[1].examples[k].visual; go(1);
    const id = LESSON.slides[1].examples[k].id;
    const e = document.querySelector(`[data-mx-panel="${id}"]`);
    document.querySelector(`[data-mx-tab="${id}"]`).click();
    const b = e.querySelector('.mx-wexbody');
    return { cols: b.dataset.mxWexcols, aside: !!e.querySelector('.mx-wexvis'),
      steps: e.querySelectorAll('.mx-step').length }; }, withVis);
  ok('CONTROL: an example that authors no visual gets one column, with no empty aside reserved',
     solo.cols === '1' && !solo.aside && solo.steps === WEXS[withVis].steps.length,
     'the column is dropped, not left blank — so the two-column examples earned theirs');
  await p.close();
}
{
  const p = await open({ slide: WEX });
  ok('no student response field belongs on a Worked Example page, and there is none',
     await p.evaluate(() => document.querySelectorAll(
       '.mx-wex input[type="text"], .mx-wex textarea, .mx-wex [contenteditable="true"], .mx-wex [data-tp-resp-id], .mx-wex [data-mx-cell]').length === 0),
     'no text inputs, no response-store pads, no answer cells');
  ok('it is a page in its own right, not a card inside another page',
     await p.evaluate(() => !document.querySelector('.mx-work') && !!document.querySelector('.mx-wex')),
     'no workspace slot; the page owns its own two-column body');
  await p.close();
}
{
  const alt = JSON.parse(JSON.stringify(FIX));
  alt.slides[WEX].examples = alt.slides[WEX].examples.slice(0, 2).concat([
    { id: 'ex-extra', label: 'Extra practice', question: 'One more.', steps: [{ id: 's1', text: 'Only step.' }] },
    { id: 'ex-more', label: 'Challenge', question: 'And another.', steps: [{ id: 's1', text: 'Only step.' }] }]);
  const p = await open({ slide: WEX, lesson: alt });
  const t = await tabs(p);
  ok('CONTROL: "Example 1/2/3" is not a three-tab design — four authored examples give four tabs',
     t.length === 4 && t[2].label === 'Extra practice' && t[3].id === 'ex-more',
     t.map((x) => x.label).join(' · '));
  await p.close();
}
// ══ the flat output ══════════════════════════════════════════════════════════════════════════════
mark('flat');
{
  const p = await open();
  const flat = await p.evaluate(() => { openWorksheet(); const h = document.querySelector('#wsSheet');
    return { text: h.textContent.replace(/\s+/g, ' '),
      exHeads: [].slice.call(h.querySelectorAll('h3.ws-mx-reph')).map((x) => x.textContent.trim()),
      wexHeads: [].slice.call(h.querySelectorAll('.ws-mx-exh')).map((x) => x.textContent.trim()),
      concepts: h.querySelectorAll('.ws-mx-concepts li').length,
      steps: h.querySelectorAll('.ws-mx-steps > li').length,   /* > li: a step's own coordinate list is not a step */
      figs: h.querySelectorAll('.ws-mx-fig').length,
      tables: h.querySelectorAll('.ws-mx-rep table').length,
      points: h.querySelectorAll('.ws-mx-part .mx-points').length,
      relations: h.querySelectorAll('.ws-mx-part .mx-relations').length }; });
  const nLabels = NEX.map((e) => e.label.replace(/[_^]/g, ''));
  ok('EVERY authored example is in the flat output, not whichever tab happened to be open',
     flat.exHeads.length === NEX.length && flat.wexHeads.length === WEXS.length,
     `${flat.exHeads.length} Notes examples · ${flat.wexHeads.length} worked examples`);
  /* Counted from the JSON, not written down here: every part the lesson authors anywhere — in a Notes
     example, in a worked example's companion, or on a single step — has to reach the page. */
  const want = { figure: 0, table: 0, points: 0, relations: 0, prose: 0 };
  const tally = (v) => mxPartKinds(v).forEach((k) => { want[k] = (want[k] || 0) + 1; });
  NEX.forEach((e) => tally(e.parts));
  WEXS.forEach((e) => { tally(e.visual); e.steps.forEach((st) => tally(st.visual)); });
  ok('and each one arrives whole — every part the lesson authors anywhere reaches the flat page',
     flat.figs === want.figure && flat.tables === want.table
     && flat.points === want.points && flat.relations === want.relations,
     `authored ${want.figure} drawings / ${want.table} table / ${want.points} coordinate lists / ${want.relations} relationships — `
     + `printed ${flat.figs} / ${flat.tables} / ${flat.points} / ${flat.relations}`);
  ok('every worked example brings its whole solution',
     flat.steps === WEXS.reduce((n, e) => n + e.steps.length, 0),
     `${flat.steps} solution steps in total`);
  ok('and the concepts and the Key Idea travel with them',
     flat.concepts === FIX.slides[NOTES].concepts.length && /Key idea/i.test(flat.text),
     `${flat.concepts} concepts, Key Idea present`);
  const hidden = nLabels.slice(1).concat(WEXS.slice(1).map((e) => e.label));
  ok('CONTROL: printing only the open tab would have dropped most of the page',
     hidden.every((l) => flat.text.indexOf(l) >= 0),
     `${hidden.length} sections were behind a tab and all are present`);
  ok('CONTROL: the flat output is built from the JSON, so a re-labelled example travels into print too',
     await p.evaluate(() => { LESSON.slides[0].examples[1].label = 'The shifted parabola';
       openWorksheet(); return /The shifted parabola/.test(document.querySelector('#wsSheet').textContent); }),
     'renaming an example reaches the worksheet with no renderer change');
  await p.close();
}
const SECTIONS = ['composition', 'viability', 'examples', 'flat'];
ok('every section ran', SECTIONS.every((s) => sections.has(s)), `${sections.size} sections`);
ok('no page error while rendering or switching', pageErrs.length === 0, pageErrs.slice(0, 2).join(' | ') || 'none');
await browser.close(); server.close();
console.log(`\n${pass}/${pass + fail} checks passed`);
process.exit(fail ? 1 : 0);
