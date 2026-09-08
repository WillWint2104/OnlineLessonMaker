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
/* the authored plane ratio the renderer derives its slot from — clamped exactly as mxFigRatio clamps it */
const authoredRatio = (fig) => { if (!fig || fig.figure !== 'graph' || String(fig.scaleMode || '') === 'authored') return 0;
  const d = fig.domain; if (!d) return 0;
  const w = +d.xMax - +d.xMin, h = +d.yMax - +d.yMin;
  return (w > 0 && h > 0) ? Math.max(0.62, Math.min(2.0, w / h)) : 0; };
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
     && NEX.every((e) => e.parts.length >= 2 && new Set(e.parts.map((q) => q.kind)).size >= 2),
     t.map((x) => `${x.label} (${NEX.find((e) => e.id === x.id).parts.map((q) => q.kind).join('+')})`).join(' · '));
  ok('exactly one example is shown at a time', pn.filter((x) => x.shown).length === 1 && pn[0].shown,
     pn.map((x) => x.id + (x.shown ? ' (shown)' : '')).join(' · '));
  const first = await paneOf(p);
  const authoredKinds = NEX[0].parts.map((x) => x.kind);
  ok('THE WHOLE IDEA IS IN ONE PANE — the selected example carries every part it authors',
     first.parts.map((x) => x.kind).join('+') === authoredKinds.join('+') && authoredKinds.length >= 2,
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
  const said = await p.evaluate((ids) => ids.map((id) =>
    document.querySelector(`[data-mx-panel="${id}"] .mx-relations`).textContent.replace(/\s+/g, ' ').trim()),
    NEX.map((e) => e.id));
  ok('CONTROL: each example is drawn and worded for itself — the panes are not one view repeated',
     drawn.every((x) => x.len > 200) && new Set(drawn.map((x) => x.d)).size === NEX.length
     && new Set(said).size === NEX.length,
     drawn.map((x, k) => `${x.id}: ${x.len}-char path, its own statement`).join(' · '));

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
// ══ the surface rule ════════════════════════════════════════════════════════════════════════════
// Off-white is the application GROUND, white is the SURFACE substantive content is written on, and green
// is a semantic ACCENT — selection, markers, small labels, an edge. Explanation, reasoning, answers,
// captions and relationships are content: green may identify them, never carry them.
mark('surface');
{
  const GREENISH = `(function(el){
    for (var n = el; n && n.nodeType === 1; n = n.parentElement) {
      var c = getComputedStyle(n).backgroundColor;
      var m = /rgba?\\((\\d+), ?(\\d+), ?(\\d+)(?:, ?([\\d.]+))?\\)/.exec(c);
      if (!m) continue;
      if (m[4] !== undefined && parseFloat(m[4]) === 0) continue;
      var r = +m[1], g = +m[2], b = +m[3];
      return { rgb: [r, g, b], green: g > r + 3 && g > b + 1, on: n.className || n.tagName };
    }
    return { rgb: null, green: false, on: 'none' };
  })`;
  for (const [slide, what] of [[NOTES, 'Notes'], [WEX, 'Worked examples']]) {
    const p = await open({ slide });
    const bad = await p.evaluate((src) => {
      const bgOf = eval('(' + src + ')');
      /* everything that CARRIES teaching text, as opposed to labelling it */
      const sel = '.mx-relations li, .mx-wexres > span:last-child, .mx-stept, .mx-stepm, .mx-wexqb,'
        + ' .mx-excap, .mx-wexlede, .mx-repprose, .mx-itemb, .mx-replist li';
      return [].slice.call(document.querySelectorAll(sel))
        .filter((e) => e.textContent.trim() && e.offsetParent !== null)
        .map((e) => ({ cls: e.className || e.tagName, bg: bgOf(e) }))
        .filter((x) => x.bg.green)
        .map((x) => `${x.cls} on rgb(${x.bg.rgb.join(',')}) via ${x.bg.on}`); }, GREENISH);
    ok(`${what}: no explanation, answer or caption is written on a green surface`,
       bad.length === 0, bad.length ? bad.slice(0, 3).join(' · ') : 'every one of them sits on white');
    await p.close();
  }
}
{
  // CONTROL: the check can see a green writing surface — put one back and it fires.
  const p = await open({ slide: WEX });
  const fired = await p.evaluate(() => {
    const e = document.querySelector('.mx-wexres');
    e.style.background = '#F1F8F4';
    const c = getComputedStyle(e).backgroundColor;
    const m = /rgba?\((\d+), ?(\d+), ?(\d+)/.exec(c);
    return +m[2] > +m[1] + 3 && +m[2] > +m[3] + 1; });
  ok('CONTROL: painting an answer green again is detected, so the rule is measured and not assumed',
     fired, 'the green-tint test fires on rgb(241,248,244)');
  await p.close();
}
// ══ Worked examples — composition is AUTHORED, never measured ═══════════════════════════════════
mark('examples');
const GROUPS = FIX.slides[WEX].groups;
/* Measured on the pane that is ON SCREEN. A hidden pane reports grid-template-columns as the SPECIFIED
   value ("repeat(2, minmax(0px, 1fr))"), which is not a column count — so each tab is selected and the
   columns are counted from where the cells actually land. */
const read = (p) => p.evaluate((ids) => ids.map((id) => {
  document.querySelector(`[data-mx-tab="${id}"]`).click();
  const e = document.querySelector(`[data-mx-panel="${id}"]`);
  const lanes = (sel) => { const n = [].slice.call(e.querySelectorAll(sel));
    return n.length ? new Set(n.map((x) => Math.round(x.getBoundingClientRect().left))).size : 0; };
  return { id, type: e.dataset.mxWextype, surface: !!e.querySelector('.mx-wexsurface'),
    examples: [].slice.call(e.querySelectorAll('[data-mx-example]')).map((x) => ({
      id: x.dataset.mxExample, steps: x.querySelectorAll('.mx-step').length,
      prompt: !!x.querySelector('.mx-wexqb'), answer: !!x.querySelector('.mx-wexres') })),
    setCols: e.querySelector('.mx-wexset') ? lanes('.mx-wexset > .mx-wexcell') : 0,
    bodyCols: e.querySelector('.mx-wexbody') ? lanes('.mx-wexbody > .mx-wexsol, .mx-wexbody > .mx-wexvis') : 0,
    aside: !!e.querySelector('.mx-wexvis'), foot: !!e.querySelector('.mx-wexfoot') }; }),
  FIX.slides[WEX].groups.map((g) => g.id));
{
  const p = await open({ slide: WEX });
  const t = await tabs(p), g = await read(p);
  ok('a tab is a worked-example GROUP with a pedagogical identity, not "Example 1"',
     t.map((x) => x.id).join('/') === GROUPS.map((x) => x.id).join('/')
     && !t.some((x) => /^example \d+$/i.test(x.label)),
     t.map((x) => x.label).join(' · '));
  ok('the composition each group renders is the TYPE it authors, from the closed vocabulary',
     g.map((x) => x.type).join('/') === GROUPS.map((x) => x.type).join('/')
     && g.every((x) => ['compact', 'visual', 'comparison', 'extended'].indexOf(x.type) >= 0),
     g.map((x) => `${x.id} → ${x.type}`).join(' · '));
  ok('EVERY authored example stays complete inside its group — prompt, whole working, its own answer',
     g.every((x, k) => x.examples.length === GROUPS[k].examples.length
       && x.examples.every((e, j) => e.prompt && e.answer && e.steps === GROUPS[k].examples[j].steps.length)),
     g.map((x) => `${x.id}: ${x.examples.map((e) => `${e.id} (${e.steps} steps + answer)`).join(', ')}`).join(' · '));
  ok('every group is one white content surface, not reasoning written onto the application ground',
     g.every((x) => x.surface),
     await p.evaluate(() => { const s = document.querySelector('.mx-wexsurface');
       return 'the surface is ' + getComputedStyle(s).backgroundColor; }));
  ok('a group that sets examples alongside one another gives each of them a column',
     g.filter((x) => x.type === 'compact' || x.type === 'comparison')
      .every((x) => x.setCols === x.examples.length && x.examples.length > 1),
     g.filter((x) => x.setCols).map((x) => `${x.type} ${x.id}: ${x.examples.length} examples in ${x.setCols} columns`).join(' · '));
  /* PLACEMENT FOLLOWS THE PLANE'S SHAPE. A companion is authored or it is not; when it is, a landscape
     plane sits beside the reasoning and a PORTRAIT one goes beneath it — set in a side column a tall plane
     towers over the working, and squeezing it would be the page reshaping the mathematics again. */
  ok('a visual group reserves nothing when no companion is authored, and places one by its shape',
     g.filter((x) => x.type === 'visual' || x.type === 'extended')
      .every((x) => { const ex0 = GROUPS.find((q) => q.id === x.id).examples[0];
        const authored = mxPartKinds(ex0.visual).length;
        if (!authored) return !x.aside && x.bodyCols === 1;
        const figs = (Array.isArray(ex0.visual) ? ex0.visual : ex0.visual.parts || [ex0.visual])
          .filter((q) => q.kind === 'figure').map((q) => authoredRatio(q.figure)).filter(Boolean);
        const portrait = figs.length && figs.every((r) => r < 0.85);
        return x.aside && x.bodyCols === (portrait ? 1 : 2); }),
     g.filter((x) => x.type === 'visual' || x.type === 'extended')
      .map((x) => `${x.id}: ${x.aside ? (x.bodyCols === 1 ? 'portrait plane, stacked beneath' : 'landscape plane, beside') : 'no companion, one column'}`).join(' · '));
  await p.close();
}
{
  /* THE TYPE CHOOSES THE COMPOSITION; THE AMOUNT OF TEXT NEVER DOES. Same example data, different declared
     type — the arrangement must follow the declaration and the examples must survive it unchanged. */
  const p = await open({ slide: WEX });
  const seen = await p.evaluate((id) => {
    const out = {};
    for (const t of ['compact', 'comparison', 'visual', 'extended']) {
      const g = LESSON.slides[1].groups.find((x) => x.id === id);
      g.type = t; go(1);
      const pane = document.querySelector(`[data-mx-panel="${id}"]`);
      const set = pane.querySelector('.mx-wexset'), body = pane.querySelector('.mx-wexbody');
      out[t] = { type: pane.dataset.mxWextype, set: !!set, body: !!body,
        examples: [].slice.call(pane.querySelectorAll('[data-mx-example]')).map((x) => x.dataset.mxExample),
        steps: pane.querySelectorAll('.mx-step').length,
        answers: pane.querySelectorAll('.mx-wexres').length };
    }
    return out; }, GROUPS[0].id);
  const kinds = Object.keys(seen);
  ok('CONTROL: changing the declared type changes the composition',
     seen.compact.set && seen.comparison.set && !seen.visual.set && !seen.extended.set
     && seen.visual.body && seen.extended.body && kinds.every((t) => seen[t].type === t),
     kinds.map((t) => `${t} → ${seen[t].set ? 'set of examples' : 'single composition'}`).join(' · '));
  ok('CONTROL: and does NOT change the example data model — the same examples, steps and answers survive',
     kinds.every((t) => seen[t].steps === seen.compact.steps && seen[t].answers === seen.compact.answers)
     && kinds.every((t) => seen[t].examples.join(',') === seen.compact.examples.join(',')),
     `${seen.compact.examples.join(', ')} — ${seen.compact.steps} steps and ${seen.compact.answers} answers under every type`);
  await p.close();
}
{
  // A column that cannot be read is not a column: the set stacks rather than becoming slivers.
  const rows = [];
  for (const [w, h] of [[1536, 1024], [1194, 834], [834, 1112], [414, 896]]) {
    const p = await open({ w, h, slide: WEX });
    rows.push(await p.evaluate(() => {
      const set = document.querySelector('.mx-wexset');
      const cells = [].slice.call(set.querySelectorAll('.mx-wexcell'));
      const cs = getComputedStyle(set).gridTemplateColumns.split(' ').filter(Boolean);
      return { cols: cs.length, w: Math.round(cells[0].getBoundingClientRect().width),
        stacked: Math.abs(cells[0].getBoundingClientRect().top - cells[1].getBoundingClientRect().top) > 20 }; }));
    await p.close();
  }
  ok('a compact group stacks when its columns can no longer be a readable measure',
     rows.every((r) => r.cols === 1 ? r.stacked : (!r.stacked && r.w >= 380)),
     rows.map((r, k) => `${[1536, 1194, 834, 414][k]}px: ${r.cols} column${r.cols > 1 ? 's' : ''} of ${r.w}px`).join(' · '));
}
{
  const p = await open({ slide: WEX });
  ok('no student response field belongs on a Worked Example page, and there is none',
     await p.evaluate(() => document.querySelectorAll(
       '.mx-wex input[type="text"], .mx-wex textarea, .mx-wex [contenteditable="true"], .mx-wex [data-tp-resp-id], .mx-wex [data-mx-cell]').length === 0),
     'no text inputs, no response-store pads, no answer cells');
  ok('it is a page in its own right, not a card inside another page',
     await p.evaluate(() => !document.querySelector('.mx-work') && !!document.querySelector('.mx-wex')),
     'no workspace slot; the page owns its own compositions');
  ok('a step may still carry its own visual, and an unknown type falls back rather than failing',
     await p.evaluate(() => { const g = LESSON.slides[1].groups[0];
       g.type = 'nosuchtype';
       g.examples[0].steps[0].visual = { kind: 'points', items: [{ term: '(1, 1)' }] };
       go(1);
       const pane = document.querySelector(`[data-mx-panel="${g.id}"]`);
       const sv = pane.querySelector('.mx-step[data-mx-stepvis] .mx-stepvis .mx-part');
       return pane.dataset.mxWextype === 'extended' && !!sv && sv.getBoundingClientRect().height > 12; }),
     'an unrecognised type renders as extended; the step visual is unaffected');
  await p.close();
}

// ══ authored reference lines ═══════════════════════════════════════════════════════════════════
// A relationship a lesson STATES in words often depends on a line the reader is meant to SEE. "The line
// y = 16 meets the curve twice" is a failed demonstration if the picture only plots the two points. This
// is the general contract — every authored `line` object reaches the drawing — not a rule about y = 16.
mark('reference');
{
  const authoredLines = (fig) => ((fig && fig.objects) || []).filter((o) => o && o.type === 'line');
  const wanted = [];
  const walk = (v, where) => mxPartKinds(v).length && (Array.isArray(v) ? v : v.parts || [v])
    .forEach((q) => { if (q.kind === 'figure') authoredLines(q.figure).forEach((L) => wanted.push({ where, L })); });
  NEX.forEach((e) => walk(e.parts, 'notes:' + e.id));
  GROUPS.forEach((g) => { walk(g.relations || g.visual, 'group:' + g.id);
    g.examples.forEach((e) => { walk(e.visual, e.id); e.steps.forEach((st) => walk(st.visual, e.id + ':' + st.id)); }); });
  const p = await open({ slide: WEX });
  const drawn = await p.evaluate((ids) => { const out = {};
    for (const id of ids) { document.querySelector(`[data-mx-tab="${id}"]`).click();
      out[id] = [].slice.call(document.querySelectorAll(`[data-mx-panel="${id}"] .tp-fig-ref`)).length; }
    return out; }, GROUPS.map((g) => g.id));
  const perGroup = {};
  GROUPS.forEach((g) => { perGroup[g.id] = wanted.filter((w) => w.where.indexOf(g.id) >= 0
    || g.examples.some((e) => w.where.indexOf(e.id) >= 0)).length; });
  ok('every authored reference line is actually drawn — the picture shows what the words claim',
     GROUPS.every((g) => drawn[g.id] === perGroup[g.id]) && wanted.length > 0,
     GROUPS.map((g) => `${g.id}: ${perGroup[g.id]} authored, ${drawn[g.id]} drawn`).join(' · '));
  const named = await p.evaluate((id) => { document.querySelector(`[data-mx-tab="${id}"]`).click();
    const pane = document.querySelector(`[data-mx-panel="${id}"]`);
    return { labels: [].slice.call(pane.querySelectorAll('.tp-fig-reflab')).map((e) => e.textContent.trim()),
      says: pane.querySelector('.mx-relations') ? pane.querySelector('.mx-relations').textContent : '' }; },
    GROUPS[1].id);
  ok('the line the relationship names is the line on the drawing',
     named.labels.length > 0 && named.labels.some((l) => named.says.replace(/\s+/g, ' ').indexOf(l) >= 0),
     `the figure is labelled ${named.labels.map((l) => `"${l}"`).join(', ')} and the relationship names it`);
  /* NEGATIVE CONTROL: take the line out and the demonstration contract must fail — the words still claim
     an intersection the picture no longer shows. */
  const without = await p.evaluate((id) => {
    const g = LESSON.slides[1].groups.find((x) => x.id === id);
    const fig = g.examples[0].visual.parts.find((q) => q.kind === 'figure').figure;
    fig.objects = fig.objects.filter((o) => o.type !== 'line'); go(1);
    document.querySelector(`[data-mx-tab="${id}"]`).click();
    return document.querySelectorAll(`[data-mx-panel="${id}"] .tp-fig-ref`).length; }, GROUPS[1].id);
  ok('CONTROL: remove the authored line and the drawing loses it, so this check can fail',
     drawn[GROUPS[1].id] > 0 && without === 0,
     `${drawn[GROUPS[1].id]} drawn with it authored, ${without} without`);
  await p.close();
}
// ══ the coordinate-plane contract ══════════════════════════════════════════════════════════════
// THE PAGE NEVER RESHAPES THE MATHEMATICS. A plane has an authored scale relationship between its axes —
// normally 1:1 — and responsive layout may reveal more domain, grow taller, stack or scroll, but never
// stretch one axis independently. Measured on the RENDERED transform (engine units per math unit times the
// paint scale of that axis), not on the container or the viewBox aspect, which can agree while the plane
// inside them is distorted.
mark('scale');
const readScales = (p) => p.evaluate(() => {
  const out = [];
  document.querySelectorAll('.mx-part[data-mx-part="figure"] .tp-fig').forEach((fig) => {
    const svg = fig.querySelector('.tp-fig-svg');
    if (!svg || !fig.offsetWidth) return;
    const vb = svg.getAttribute('viewBox').split(/\s+/).map(Number);
    const r = svg.getBoundingClientRect();
    const kx = r.width / vb[2], ky = r.height / vb[3];
    const labs = [].slice.call(svg.querySelectorAll('.tp-fig-ticklabel'));
    const val = (t) => parseFloat(t.textContent.replace('\u2212', '-'));
    const xs = labs.filter((t) => t.getAttribute('text-anchor') === 'middle')
      .map((t) => ({ v: val(t), px: +t.getAttribute('x') })).filter((o) => isFinite(o.v));
    const ys = labs.filter((t) => t.getAttribute('text-anchor') === 'end')
      .map((t) => ({ v: val(t), px: +t.getAttribute('y') })).filter((o) => isFinite(o.v));
    const per = (a) => { if (a.length < 2) return null; a.sort((m, n) => m.v - n.v);
      const d = a[a.length - 1].v - a[0].v; return d ? Math.abs((a[a.length - 1].px - a[0].px) / d) : null; };
    const ux = per(xs), uy = per(ys);
    if (ux == null || uy == null) return;
    out.push({ x: +(ux * kx).toFixed(3), y: +(uy * ky).toFixed(3), ratio: +((ux * kx) / (uy * ky)).toFixed(3),
      plot: [Math.round(r.width), Math.round(r.height)] });
  });
  return out;
});
{
  const seen = [];
  for (const [w, h, slide, tab, name] of [
    [1536, 1024, NOTES, null, 'notes desktop'],
    [1536, 1024, WEX, GROUPS[1].id, 'visual desktop'],
    [1536, 1024, WEX, GROUPS[2].id, 'comparison desktop'],
    [1194, 834, WEX, GROUPS[1].id, 'visual tablet'],
    [834, 1112, WEX, GROUPS[2].id, 'comparison portrait'],
    [414, 896, WEX, GROUPS[2].id, 'comparison phone']]) {
    const p = await open({ w, h, slide });
    if (tab) { await p.click(`[data-mx-tab="${tab}"]`); await p.waitForTimeout(600); }
    (await readScales(p)).forEach((s) => seen.push(Object.assign({ name, w }, s)));
    await p.close();
  }
  ok('EVERY COORDINATE PLANE HOLDS ITS AUTHORED 1:1 SCALE, at every width',
     seen.length >= 6 && seen.every((s) => Math.abs(s.ratio - 1) <= 0.05),
     seen.map((s) => `${s.name}: ${s.ratio} (x ${s.x}px/unit, y ${s.y}px/unit)`).join(' · '));
  ok('and the same plane is the same shape on a phone as on a desktop',
     (() => { const c = seen.filter((s) => /comparison/.test(s.name));
       return c.length >= 2 && Math.max(...c.map((s) => s.ratio)) - Math.min(...c.map((s) => s.ratio)) <= 0.05; })(),
     seen.filter((s) => /comparison/.test(s.name)).map((s) => `${s.w}px → ${s.ratio}`).join(' · '));
}
{
  /* ADVERSARIAL CONTROL: distort one axis and the measure must catch it. This is the defect the rule
     exists for — before it, the same symmetry plane rendered 4.65:1 on a desktop and 1.95:1 on a phone. */
  const p = await open({ slide: WEX });
  await p.click(`[data-mx-tab="${GROUPS[2].id}"]`); await p.waitForTimeout(500);
  const before = (await readScales(p))[0];
  await p.evaluate((id) => { const g = LESSON.slides[1].groups.find((x) => x.id === id);
    const f = g.relations.find((q) => q.kind === 'figure').figure;
    f.scaleMode = 'authored'; f.aspect = 'stretch'; go(1);
    document.querySelector(`[data-mx-tab="${id}"]`).click(); }, GROUPS[2].id);
  await p.waitForTimeout(700);
  const after = (await readScales(p))[0];
  ok('CONTROL: opt a plane out of the policy and the same measure catches the distortion',
     !!before && !!after && Math.abs(before.ratio - 1) <= 0.05 && Math.abs(after.ratio - 1) > 0.2,
     `${before && before.ratio} under the policy, ${after && after.ratio} with scaleMode "authored" + stretch`);
  await p.close();
}
{
  // Legibility is a SEPARATE test: an undistorted plane can still be too small to read.
  const rows = [];
  for (const [w, h, name] of [[1536, 1024, 'desktop'], [1194, 834, 'tablet'], [834, 1112, 'portrait'], [414, 896, 'phone']]) {
    const p = await open({ w, h, slide: WEX });
    await p.click(`[data-mx-tab="${GROUPS[1].id}"]`); await p.waitForTimeout(600);
    rows.push(await p.evaluate((name) => {
      const fig = document.querySelector('.mx-wexvis .tp-fig') || document.querySelector('.mx-part[data-mx-part="figure"] .tp-fig');
      const svg = fig.querySelector('.tp-fig-svg'), r = svg.getBoundingClientRect();
      const cs = getComputedStyle(document.querySelector('.mx-wex'));
      const t = svg.querySelector('.tp-fig-ticklabel');
      const stacked = !!document.querySelector('.mx-wexbody')
        && getComputedStyle(document.querySelector('.mx-wexbody')).gridTemplateColumns.split(' ').filter(Boolean).length === 1;
      return { name, w: Math.round(r.width), h: Math.round(r.height), stacked,
        minW: parseInt(cs.getPropertyValue('--mx-plot-min-w'), 10),
        minH: parseInt(cs.getPropertyValue('--mx-plot-min-h'), 10),
        tick: t ? Math.round(parseFloat(getComputedStyle(t).fontSize) * (r.width / +svg.getAttribute('viewBox').split(/\s+/)[2]) * 10) / 10 : 0 }; }, name));
    await p.close();
  }
  ok('a plotted region is never below the legibility floor — it stacks and takes the width instead',
     rows.every((r) => r.w >= r.minW - 2 && r.h >= r.minH - 2 && r.tick >= 9),
     rows.map((r) => `${r.name}: ${r.w}×${r.h}${r.stacked ? ' stacked' : ' beside'}, ticks ${r.tick}px`).join(' · '));
  /* The discriminator is the PLANE, not the window: re-author the same example's domain landscape and the
     same composition puts it beside the reasoning instead of beneath. */
  const p2 = await open({ slide: WEX });
  const swap = await p2.evaluate((id) => {
    const g = LESSON.slides[1].groups.find((x) => x.id === id);
    const f = g.examples[0].visual.parts.find((q) => q.kind === 'figure').figure;
    const before = document.querySelector('.mx-wexbody');
    f.domain = { xMin: -20, xMax: 20, yMin: -2, yMax: 20 }; go(1);
    document.querySelector(`[data-mx-tab="${id}"]`).click();
    const after = document.querySelector(`[data-mx-panel="${id}"] .mx-wexbody`);
    return { cols: after.dataset.mxWexcols, stacked: after.classList.contains('mx-wexstack') }; }, GROUPS[1].id);
  await p2.close();
  ok('CONTROL: re-author the same plane landscape and the same composition places it beside the reasoning',
     rows.every((r) => r.stacked) && swap.cols === '2' && !swap.stacked,
     `portrait at every width → stacked; the same example with a 40×22 domain → ${swap.cols} columns, beside`);
}
// ══ composition-owned figure slots ═════════════════════════════════════════════════════════════
// There is no one "worked-example figure size". A shared comparison plane and a companion beside a column
// are different jobs; the slot geometry belongs to the composition, and because the view holds equal
// mathematical scale a wider, shallower slot exposes more range rather than distorting the plane.
mark('slots');
{
  const p = await open({ slide: WEX });
  /* A hidden pane has no width, so the figure has not been solved against its real slot yet; revealing it
     is what makes the engine re-solve. Click, LET THAT HAPPEN, then measure — reading in the same turn as
     the click measures the unsolved default box and would pass or fail for the wrong reason. */
  const slots = [];
  for (const id of GROUPS.map((g) => g.id)) {
    await p.click(`[data-mx-tab="${id}"]`); await p.waitForTimeout(450);
    slots.push(await p.evaluate((id) => {
    const pane = document.querySelector(`[data-mx-panel="${id}"]`);
    const surf = pane.querySelector('.mx-wexsurface').getBoundingClientRect();
    const foot = pane.querySelector('.mx-wexfoot [data-mx-part="figure"]');
    const side = pane.querySelector('.mx-wexvis [data-mx-part="figure"]');
    /* LETTERBOXING is the failure: a viewBox of a different shape from the box it is painted into leaves the
       drawing shrunk in the middle with dead space beside it. So the test is that the painted aspect matches
       the viewBox aspect — not that the svg equals the slot, which it never does (the figure block carries a
       control row above the stage). */
    const surfMid = Math.round(surf.left + surf.width / 2);
    const box = (n) => { if (!n) return null; const r = n.getBoundingClientRect();
      const svg = n.querySelector('svg'); const st = n.querySelector('.tp-fig-stage');
      if (!svg || !st) return null;
      const sr = svg.getBoundingClientRect(), tr = st.getBoundingClientRect();
      const vb = (svg.getAttribute('viewBox') || '0 0 1 1').split(/\s+/).map(Number);
      return { w: Math.round(r.width), h: Math.round(r.height), mid: Math.round(r.left + r.width / 2),
        paint: [Math.round(sr.width), Math.round(sr.height)],
        fillsW: sr.width >= tr.width - 4, fillsH: sr.height >= tr.height - 4,
        ar: (sr.width / sr.height) / (vb[2] / vb[3]) }; };   /* 1 = the paint has the viewBox's shape */
    return { id, type: pane.dataset.mxWextype, surfW: Math.round(surf.width), surfMid, foot: box(foot), side: box(side),
      solved: (pane.querySelector('.tp-fig')||{dataset:{}}).dataset.figBox }; }, id));
  }
  const cmp = slots.find((x) => x.type === 'comparison');
  /* A SLOT IS A PLACE FOR A PLANE, NOT A SHAPE IMPOSED ON ONE. The earlier version of this asserted the
     comparison plane was "wide and shallow" — that was the composition dictating the mathematics, and the
     rendered plane went to 4.65:1. What the slot owes the plane now is a NATURAL box, placed under the
     cases it belongs to; the scale section proves the plane inside it is undistorted. */
  /* THE SLOT TAKES ITS SHAPE FROM THE PLANE. Not a band this file chooses — the box must match the ratio
     the AUTHORED domain implies, so re-authoring the mathematics re-shapes the slot and nothing else does. */
  const cmpFig = (GROUPS.find((q) => q.id === (cmp && cmp.id)).relations || [])
    .filter((q) => q.kind === 'figure').map((q) => authoredRatio(q.figure))[0];
  ok('the comparison plane gets the box its authored domain implies, centred beneath the cases',
     !!(cmp && cmp.foot) && !!cmpFig
     && Math.abs((cmp.foot.w / cmp.foot.h) - cmpFig) / cmpFig < 0.06
     && Math.abs(cmp.foot.mid - cmp.surfMid) <= 4,
     cmp && cmp.foot ? `${cmp.foot.w}×${cmp.foot.h} → ${(cmp.foot.w / cmp.foot.h).toFixed(3)} against an authored `
       + `${cmpFig.toFixed(3)}, centred in a ${cmp.surfW}px surface` : 'no comparison figure');
  /* Integer rounding of the box leaves a few per cent between the painted shape and the viewBox; a
     LETTERBOX is the order-of-magnitude case, where a box of the wrong shape entirely is centred in the
     slot with dead space beside it. The control below shows the difference. */
  ok('and the drawing actually fills that slot rather than being letterboxed inside it',
     !!(cmp && cmp.foot) && cmp.foot.fillsW && cmp.foot.fillsH
     && Math.abs(cmp.foot.ar - 1) < 0.15 && cmp.solved !== '520x360',
     `painted ${cmp && cmp.foot && cmp.foot.paint.join('×')} at a re-solved box of ${cmp && cmp.solved} — `
     + `the paint is ${cmp && cmp.foot && cmp.foot.ar.toFixed(2)}× the viewBox shape (1.00 = took the slot's shape)`);
  /* The letterbox control that used to sit here compared the paint against the engine's 520x360 default.
     It cannot discriminate any more, and that is the point: every slot is now a natural box, so the default
     and the solved box are nearly the same shape and there is nothing left for a letterbox to be. The
     claim it was protecting — that the plane is not deformed — is now carried by the `scale` section
     above, which measures the rendered transform and has an adversarial control that distorts an axis. */
  const vis = slots.find((x) => x.type === 'visual');
  const visFig = (() => { const v = GROUPS.find((q) => q.id === (vis && vis.id)).examples[0].visual;
    return (Array.isArray(v) ? v : (v && v.parts) || [v]).filter((q) => q && q.kind === 'figure')
      .map((q) => authoredRatio(q.figure))[0]; })();
  ok('CONTROL: a different composition, a different authored plane, and each slot follows its own',
     !!(vis && vis.side) && !!visFig
     && Math.abs((vis.side.w / vis.side.h) - visFig) / visFig < 0.06
     && Math.abs(visFig - cmpFig) > 0.05,
     `visual ${(vis.side.w / vis.side.h).toFixed(3)} against an authored ${visFig.toFixed(3)}; `
     + `comparison ${(cmp.foot.w / cmp.foot.h).toFixed(3)} against ${cmpFig.toFixed(3)} — different planes, different slots`);
  await p.close();
}
{
  // Stacked, the companion must not become the page.
  const rows = [];
  for (const [w, h] of [[834, 1112], [414, 896]]) {
    const p = await open({ w, h, slide: WEX });
    await p.click(`[data-mx-tab="${GROUPS[1].id}"]`); await p.waitForTimeout(450);
    rows.push(await p.evaluate((id) => {
      const n = document.querySelector(`[data-mx-panel="${id}"] .mx-wexvis [data-mx-part="figure"]`);
      const r = n.getBoundingClientRect();
      return { w: Math.round(r.width), h: Math.round(r.height), vh: window.innerHeight }; }, GROUPS[1].id));
    await p.close();
  }
  /* The earlier version of this required the stacked companion to be LANDSCAPE and under 42% of the
     window. That was the page compressing the plane to fit a screen, and "fits this viewport" is not a
     quality measure — a taller page is the correct fallback. What is required is that the plane keeps the
     proportions its authored domain implies, whatever the window does. */
  const want = (() => { const v = GROUPS[1].examples[0].visual;
    return (Array.isArray(v) ? v : (v && v.parts) || [v]).filter((q) => q && q.kind === 'figure')
      .map((q) => authoredRatio(q.figure))[0]; })();
  ok('stacked, the plane keeps its authored proportions and the page simply gets longer',
     rows.every((r) => Math.abs((r.w / r.h) - want) / want < 0.06),
     rows.map((r) => `${r.w}×${r.h} → ${(r.w / r.h).toFixed(3)} against an authored ${want.toFixed(3)} `
       + `(${Math.round(r.h / r.vh * 100)}% of a ${r.vh}px window)`).join(' · '));
}
// ══ the non-shipping composition proofs ════════════════════════════════════════════════════════
// compact's column contract and extended both need shapes the shipping lesson does not author. A
// presentation type is not established because the renderer accepts its enum value.
mark('proofs');
{
  const CF = JSON.parse(fs.readFileSync(path.join(root, 'tests/visual/lessons/mathematics-compositions.json'), 'utf8'));
  const CG = CF.slides[0].groups;
  const three = CG.find((g) => g.type === 'compact');
  const p = await open({ slide: 0, lesson: CF });
  const lay = await p.evaluate((id) => { document.querySelector(`[data-mx-tab="${id}"]`).click();
    const cells = [].slice.call(document.querySelectorAll(`[data-mx-panel="${id}"] .mx-wexcell`))
      .map((e) => { const r = e.getBoundingClientRect(); return { l: Math.round(r.left), t: Math.round(r.top), w: Math.round(r.width) }; });
    const rows = new Set(cells.map((c) => c.t)), cols = new Set(cells.map((c) => c.l));
    const set = document.querySelector(`[data-mx-panel="${id}"] .mx-wexset`).getBoundingClientRect();
    return { cells, rows: rows.size, cols: cols.size, mid: Math.round(set.left + set.width / 2),
      complete: [].slice.call(document.querySelectorAll(`[data-mx-panel="${id}"] .mx-wexcell`))
        .every((e) => e.querySelector('.mx-wexqb') && e.querySelector('.mx-wexres') && e.querySelectorAll('.mx-step').length) }; },
    three.id);
  ok('COMPACT IS AT MOST TWO COLUMNS — three are 2 + 1, the third CENTRED below at the same measure',
     three.examples.length === 3 && lay.rows === 2
     && lay.cells[2].t > lay.cells[0].t
     && Math.abs(lay.cells[2].w - lay.cells[0].w) <= 4
     && Math.abs((lay.cells[2].l + lay.cells[2].w / 2) - lay.mid) <= 6
     && lay.cells[2].l > lay.cells[0].l,
     lay.cells.map((c, k) => `#${k + 1} at (${c.l}, ${c.t}) ${c.w}px`).join(' · ')
     + ` — row 2 centred on ${lay.mid}`);
  ok('and all three stay complete — prompt, steps and answer in every one',
     lay.complete, `${three.examples.length} complete examples in a ${lay.cols}-column grid`);
  const ext = CG.find((g) => g.type === 'extended');
  const e = await p.evaluate((id) => { document.querySelector(`[data-mx-tab="${id}"]`).click();
    const pane = document.querySelector(`[data-mx-panel="${id}"]`);
    const body = pane.querySelector('.mx-wexbody');
    const inline = [].slice.call(pane.querySelectorAll('.mx-step[data-mx-stepvis]'))
      .map((x) => ({ step: x.dataset.mxStep, h: Math.round(x.querySelector('.mx-stepvis .mx-part').getBoundingClientRect().height) }));
    const st = pane.querySelector('.mx-stept');
    return { cols: body.dataset.mxWexcols, aside: !!pane.querySelector('.mx-wexvis'),
      steps: pane.querySelectorAll('.mx-step').length, inline,
      measure: Math.round(body.getBoundingClientRect().width),
      surf: Math.round(pane.querySelector('.mx-wexsurface').getBoundingClientRect().width),
      answer: !!pane.querySelector('.mx-wexres') }; }, ext.id);
  ok('EXTENDED IS A REAL COMPOSITION — one reading-width derivation, not prose in a white box',
     e.cols === '1' && !e.aside && e.steps >= 5 && e.answer && e.measure < e.surf * 0.75,
     `${e.steps} steps at a ${e.measure}px reading measure inside a ${e.surf}px surface, no companion column`);
  ok('and its visual arrives inline at the step that earns it',
     e.inline.length > 0 && e.inline.every((x) => x.h > 100),
     e.inline.map((x) => `step ${x.step} carries a ${x.h}px figure`).join(' · '));
  await p.close();
}
{
  // The compact contract holds on a narrow screen too, and nothing is lost by stacking.
  const CF = JSON.parse(fs.readFileSync(path.join(root, 'tests/visual/lessons/mathematics-compositions.json'), 'utf8'));
  const three = CF.slides[0].groups.find((g) => g.type === 'compact');
  const p = await open({ w: 414, h: 896, slide: 0, lesson: CF });
  const nar = await p.evaluate((id) => { document.querySelector(`[data-mx-tab="${id}"]`).click();
    const cells = [].slice.call(document.querySelectorAll(`[data-mx-panel="${id}"] .mx-wexcell`));
    return { cols: new Set(cells.map((e) => Math.round(e.getBoundingClientRect().left))).size,
      n: cells.length, steps: document.querySelectorAll(`[data-mx-panel="${id}"] .mx-step`).length,
      answers: document.querySelectorAll(`[data-mx-panel="${id}"] .mx-wexres`).length }; }, three.id);
  ok('CONTROL: narrow, it stacks to one column and every example survives whole',
     nar.cols === 1 && nar.n === three.examples.length
     && nar.steps === three.examples.reduce((n, x) => n + x.steps.length, 0)
     && nar.answers === three.examples.length,
     `${nar.n} examples, ${nar.steps} steps, ${nar.answers} answers in ${nar.cols} column`);
  await p.close();
}
{
  // An explanatory region is AUTHORED content, not chrome every representation gets.
  const p = await open();
  const only = await p.evaluate(() => {
    const panes = [].slice.call(document.querySelectorAll('.mx-expane'));
    return panes.map((e) => ({ id: e.dataset.mxPanel, rel: e.querySelectorAll('.mx-relations').length })); });
  const authored = NEX.map((e) => ({ id: e.id, rel: e.parts.filter((q) => q.kind === 'relations').length }));
  ok('a relationship region appears only where one is authored — it is content, not chrome',
     only.every((o, k) => o.rel === authored[k].rel),
     only.map((o) => `${o.id}: ${o.rel} authored, ${o.rel} rendered`).join(' · '));
  const stripped = await p.evaluate(() => { LESSON.slides[0].examples[0].parts =
      LESSON.slides[0].examples[0].parts.filter((q) => q.kind !== 'relations'); go(0);
    const e = document.querySelector('.mx-expane:not([hidden])');
    /* an SVG polyline legitimately has a box and no text — the claim is about reserved HTML REGIONS */
    const boxes = [].slice.call(e.querySelectorAll('*')).filter((n) => {
      if (n.namespaceURI !== 'http://www.w3.org/1999/xhtml' || n.closest('.mx-figstage')) return false;
      const r = n.getBoundingClientRect(); return r.width > 60 && r.height > 20 && !n.textContent.trim(); });
    return { rel: e.querySelectorAll('.mx-relations').length, empty: boxes.length }; });
  ok('CONTROL: remove it and no empty region is reserved in its place',
     stripped.rel === 0 && stripped.empty === 0,
     'no relations element, no empty box left behind');
  await p.close();
}
// ══ the flat output ══════════════════════════════════════════════════════════════════════════════
mark('flat');
{
  const p = await open();
  const flat = await p.evaluate(() => { openWorksheet(); const h = document.querySelector('#wsSheet');
    return { text: h.textContent.replace(/\s+/g, ' '),
      notesEx: [].slice.call(h.querySelectorAll('.ws-mx-rep > h3.ws-mx-reph')).map((x) => x.textContent.trim()),
      groups: [].slice.call(h.querySelectorAll('.ws-mx-grp')).map((g) => ({
        type: g.dataset.wsWextype,
        examples: [].slice.call(g.querySelectorAll('.ws-mx-exh')).map((x) => x.textContent.trim()),
        steps: g.querySelectorAll('.ws-mx-steps > li').length,
        answers: g.querySelectorAll('.ws-mx-res').length })),
      concepts: h.querySelectorAll('.ws-mx-concepts li').length,
      figs: h.querySelectorAll('.ws-mx-fig').length,
      tables: h.querySelectorAll('.ws-mx-rep table, .ws-mx-part table').length,
      points: h.querySelectorAll('.ws-mx-part .mx-points').length,
      relations: h.querySelectorAll('.ws-mx-part .mx-relations').length }; });
  ok('every authored group reaches the flat page, whatever composition it uses on screen',
     flat.groups.length === GROUPS.length && flat.groups.every((g, k) => g.type === GROUPS[k].type),
     flat.groups.map((g) => `${g.type} (${g.examples.length} examples)`).join(' · '));
  ok('and every example inside every group arrives whole — a tab is not a filter on what a lesson contains',
     flat.groups.every((g, k) => g.examples.length === GROUPS[k].examples.length
       && g.steps === GROUPS[k].examples.reduce((n, e) => n + e.steps.length, 0)
       && g.answers === GROUPS[k].examples.filter((e) => e.answer || e.result).length),
     flat.groups.map((g, k) => `${GROUPS[k].id}: ${g.steps} steps, ${g.answers} answers`).join(' · '));
  ok('every Notes example is there too',
     flat.notesEx.length === NEX.length, `${flat.notesEx.length} of ${NEX.length}`);
  /* Counted from the JSON, not written down here: every part the lesson authors anywhere — in a Notes
     example, in a group's closing relationship, in a worked example's companion, or on a single step. */
  const want = { figure: 0, table: 0, points: 0, relations: 0, prose: 0 };
  const tally = (v) => mxPartKinds(v).forEach((k) => { want[k] = (want[k] || 0) + 1; });
  NEX.forEach((e) => tally(e.parts));
  GROUPS.forEach((g) => { tally(g.relations || g.visual);
    g.examples.forEach((e) => { tally(e.visual); e.steps.forEach((st) => tally(st.visual)); }); });
  ok('every part the lesson authors anywhere reaches the flat page',
     flat.figs === want.figure && flat.tables === want.table
     && flat.points === want.points && flat.relations === want.relations,
     `authored ${want.figure} drawings / ${want.table} table / ${want.points} coordinate lists / ${want.relations} relationships — `
     + `printed ${flat.figs} / ${flat.tables} / ${flat.points} / ${flat.relations}`);
  ok('and the concepts and the Key Idea travel with them',
     flat.concepts === FIX.slides[NOTES].concepts.length && /Key idea/i.test(flat.text),
     `${flat.concepts} concepts, Key Idea present`);
  const hidden = NEX.slice(1).map((e) => e.label.replace(/[_^]/g, ''))
    .concat(GROUPS.slice(1).map((g) => g.title.replace(/[_^]/g, '')));
  ok('CONTROL: printing only the open tab would have dropped most of the page',
     hidden.every((l) => flat.text.indexOf(l) >= 0),
     `${hidden.length} sections were behind a tab and all are present`);
  ok('CONTROL: the flat output is built from the JSON, so a re-titled group travels into print too',
     await p.evaluate(() => { LESSON.slides[1].groups[0].title = 'Putting values in';
       openWorksheet(); return /Putting values in/.test(document.querySelector('#wsSheet').textContent); }),
     'renaming a group reaches the worksheet with no renderer change');
  await p.close();
}
const SECTIONS = ['composition', 'viability', 'surface', 'examples', 'reference', 'scale', 'slots', 'proofs', 'flat'];
ok('every section ran', SECTIONS.every((s) => sections.has(s)), `${sections.size} sections`);
ok('no page error while rendering or switching', pageErrs.length === 0, pageErrs.slice(0, 2).join(' | ') || 'none');
await browser.close(); server.close();
console.log(`\n${pass}/${pass + fail} checks passed`);
process.exit(fail ? 1 : 0);
