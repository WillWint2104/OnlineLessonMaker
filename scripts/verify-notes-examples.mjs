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
  const grown = await p.evaluate((n) => { LESSON.slides[n].concepts.push({ id: 'extra', term: 'Extra', body: 'Added by the control.' });
    go(n); return [].slice.call(document.querySelectorAll('[data-mx-concept]')).map((e) => e.dataset.mxConcept); }, NOTES);
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
  const without = await p.evaluate((n) => { delete LESSON.slides[n].keyIdea; go(n);
    const boxes = [].slice.call(document.querySelectorAll('.mx-head *')).filter((e) => {
      const r = e.getBoundingClientRect(); return r.width > 40 && r.height > 20 && !e.textContent.trim(); });
    return { present: !!document.querySelector('.mx-keyidea'), emptyBoxes: boxes.length, title: !!document.querySelector('.mx-title') }; }, NOTES);
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
    const n = await p.evaluate((n0) => { let n = 0;
      for (const ss of document.styleSheets) { let rs; try { rs = ss.cssRules; } catch (e) { continue; }
        for (let i = rs.length - 1; i >= 0; i--) {
          const r = rs[i]; if (r.selectorText && /\[data-mx-part="figure"\]/.test(r.selectorText)) { ss.deleteRule(i); n++; } } }
      go(n0); return n; }, NOTES);
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
  return { id, type: e.dataset.mxWextype, surface: !!e.querySelector('.mx-wexsurface'),
    examples: [].slice.call(e.querySelectorAll('[data-mx-example]')).map((x) => ({
      id: x.dataset.mxExample, steps: x.querySelectorAll('.mx-step').length,
      prompt: !!x.querySelector('.mx-wexqb'), answer: !!x.querySelector('.mx-wexres') })),
    foot: !!e.querySelector('.mx-wexfoot') }; }),
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
     && g.every((x) => ['sequence', 'standard', 'comparison', 'staged', 'extended'].indexOf(x.type) >= 0),
     g.map((x) => `${x.id} → ${x.type}`).join(' · '));
  ok('EVERY authored example stays complete inside its group — prompt, whole working, its own answer',
     g.every((x, k) => x.examples.length === GROUPS[k].examples.length
       && x.examples.every((e, j) => e.prompt && e.answer && e.steps === GROUPS[k].examples[j].steps.length)),
     g.map((x) => `${x.id}: ${x.examples.map((e) => `${e.id} (${e.steps} steps + answer)`).join(', ')}`).join(' · '));
  ok('every group is one white content surface, not reasoning written onto the application ground',
     g.every((x) => x.surface),
     await p.evaluate(() => { const s = document.querySelector('.mx-wexsurface');
       return 'the surface is ' + getComputedStyle(s).backgroundColor; }));
  /* INSTRUCTIONAL CONTENT IS NEVER CENTRED, AND A SEQUENCE IS ROWS. Every example in a sequence has the
     same status — no example is a conclusion because of where it sits — and each row divides the width
     into the ask and the working rather than the page centring the lot. */
  const rows = await p.evaluate((ids) => ids.map((id) => {
    document.querySelector(`[data-mx-tab="${id}"]`).click();
    const pane = document.querySelector(`[data-mx-panel="${id}"]`);
    const rs = [].slice.call(pane.querySelectorAll('.mx-wexex'));
    const surf = pane.querySelector('.mx-wexsurface').getBoundingClientRect();
    /* THE FORM IS READ FROM GEOMETRY, never from a left-edge comparison: side by side means the working
       begins where the question ends and the two overlap vertically. A tinted question that bleeds 16px
       further left than the working would pass "work.left > ask.left" while fully stacked. */
    const side = (a, w) => Math.round(w.left) >= Math.round(a.right) - 1 && w.top < a.bottom && a.top < w.bottom;
    return { id, n: rs.length,
      lanes: new Set(rs.map((r) => Math.round(r.getBoundingClientRect().left))).size,
      full: rs.every((r) => r.getBoundingClientRect().width >= surf.width - 2),
      split: rs.every((r) => { const a = r.querySelector('.mx-wexask'), w = r.querySelector('.mx-wexwork');
        return a && w && side(a.getBoundingClientRect(), w.getBoundingClientRect()); }),
      askW: rs.length ? Math.round(rs[0].querySelector('.mx-wexask').getBoundingClientRect().width) : 0,
      workW: rs.length ? Math.round(rs[0].querySelector('.mx-wexwork').getBoundingClientRect().width) : 0 }; }),
    GROUPS.filter((x) => x.type === 'sequence').map((x) => x.id));
  ok('a SEQUENCE is full-width rows of equal status — ask on the left, working on the right',
     rows.length > 0 && rows.every((r) => r.n === GROUPS.find((x) => x.id === r.id).examples.length
       && r.lanes === 1 && r.full && r.split && r.workW > r.askW),
     rows.map((r) => `${r.id}: ${r.n} rows in one lane, ask ${r.askW}px / working ${r.workW}px`).join(' · '));
  /* A REGION THAT EXISTS BUT HOLDS NOTHING IS A FAILURE. A companion belongs to an example that authors
     one; where none is authored no slot, no aside and no empty box may be reserved for it. (What happens
     when one IS authored is the injected control in the `scale` section — no fixture authors one, so
     asserting it here would report on an empty set and pass for saying nothing.) */
  const spare = await p.evaluate((ids) => ids.map((id) => {
    document.querySelector(`[data-mx-tab="${id}"]`).click();
    const pane = document.querySelector(`[data-mx-panel="${id}"]`);
    /* ON THE STATE THAT IS ON SCREEN. A hidden state pane reports a zero box for everything inside it, so
       scanning the whole group would call every region of every unseen state "empty". */
    const live = [].slice.call(pane.querySelectorAll('.mx-stpane')).filter((n) => !n.hidden)[0] || pane;
    const empties = [].slice.call(live.querySelectorAll('.mx-wexaside, .mx-wexmid, .mx-wexfoot'))
      .filter((e) => !e.querySelector('.mx-part') || e.getBoundingClientRect().height < 12);
    return { id, asides: live.querySelectorAll('.mx-wexaside').length, empties: empties.length };
  }), GROUPS.map((x) => x.id));
  ok('no companion is authored on these examples, and none is reserved — no region is drawn empty',
     spare.every((r) => r.empties === 0
       && r.asides === GROUPS.find((x) => x.id === r.id).examples
         .filter((e) => mxPartKinds(e.visual).length).length),
     spare.map((r) => `${r.id}: ${r.asides} companion${r.asides === 1 ? '' : 's'}, ${r.empties} empty regions`).join(' · '));
  await p.close();
}
{
  /* THE TYPE CHOOSES THE COMPOSITION; THE AMOUNT OF TEXT NEVER DOES. Same example data, different declared
     type — the arrangement must follow the declaration and the examples must survive it unchanged. */
  const p = await open({ slide: WEX });
  /* Cycle a group that authors a plane BESIDE its examples. `comparison` is A | plane | B, so a group whose
     connection is text-only can never show that composition — it correctly falls through to rows, and a
     control built on it would report the product broken for authoring the control could not exercise. */
  const CYCLE = GROUPS.find((x) => x.examples.length === 2
    && mxPartKinds(x.relations || x.visual).indexOf('figure') >= 0);
  if (!CYCLE) throw new Error('no two-example group authors a figure to bridge with');
  const seen = await p.evaluate(({ id, w }) => {
    const out = {};
    for (const t of ['sequence', 'comparison', 'staged', 'standard', 'extended']) {
      const g = LESSON.slides[w].groups.find((x) => x.id === id);
      g.type = t; go(w);
      const pane = document.querySelector(`[data-mx-panel="${id}"]`);
      out[t] = { type: pane.dataset.mxWextype, set: !!pane.querySelector('.mx-wexseq'),
        bridge: !!pane.querySelector('.mx-wexbridge'), rows: pane.querySelectorAll('.mx-wexex').length,
        states: pane.querySelectorAll('[data-mx-state]').length,
        examples: [].slice.call(pane.querySelectorAll('[data-mx-example]')).map((x) => x.dataset.mxExample),
        steps: pane.querySelectorAll('.mx-step').length,
        answers: pane.querySelectorAll('.mx-wexres').length };
    }
    return out; }, { id: CYCLE.id, w: WEX });
  const kinds = Object.keys(seen);
  /* The vocabulary's observable differences are what this asserts, not a row count: `comparison` builds
     the A | plane | B bridge, `staged` paginates into local states, and the flat contracts render rows.
     Two examples under `standard` render as two rows rather than one being dropped — the renderer is
     honest about what was authored, so row count cannot separate `standard` from `sequence`, and asserting
     that it does would be inventing a difference the product does not have. */
  ok('CONTROL: changing the declared type changes the composition',
     seen.comparison.bridge && !seen.sequence.bridge && !seen.standard.bridge
     && seen.staged.states > 1 && seen.sequence.states === 0
     && seen.sequence.rows === CYCLE.examples.length && seen.extended.rows === CYCLE.examples.length
     && kinds.every((t) => seen[t].type === t),
     CYCLE.id + ': ' + kinds.map((t) => `${t} → ${seen[t].bridge ? 'A | plane | B'
       : seen[t].states > 1 ? seen[t].states + ' local states' : seen[t].rows + ' rows'}`).join(' · '));
  ok('CONTROL: and does NOT change the example data model — the same examples, steps and answers survive',
     kinds.every((t) => seen[t].steps === seen.sequence.steps && seen[t].answers === seen.sequence.answers)
     && kinds.every((t) => seen[t].examples.join(',') === seen.sequence.examples.join(',')),
     `${seen.sequence.examples.join(', ')} — ${seen.sequence.steps} steps and ${seen.sequence.answers} answers under every type`);
  await p.close();
}
{
  /* A COLUMN THAT CANNOT BE READ IS NOT A COLUMN. The primitive divides itself into the question and the
     working while both can still be a measure; below that the two stack — each part whole, never two
     slivers. The form is READ FROM GEOMETRY (side by side: the working begins where the question ends and
     the two overlap vertically; stacked: the working begins below it), the floors are judged on the
     regions' CONTENT boxes — a tinted box is wider than the measure it holds — and nothing may overflow. */
  const sizes = [[1536, 1024], [1194, 834], [834, 1112], [414, 896]];
  const rows = [];
  for (const [w, h] of sizes) {
    const p = await open({ w, h, slide: WEX });
    rows.push(await p.evaluate((id) => {
      document.querySelector(`[data-mx-tab="${id}"]`).click();
      const r = document.querySelector(`[data-mx-panel="${id}"] .mx-wexex`);
      const ask = r.querySelector('.mx-wexask'), work = r.querySelector('.mx-wexwork');
      const a = ask.getBoundingClientRect(), k = work.getBoundingClientRect();
      const cs = getComputedStyle(document.querySelector('.mx-wex'));
      const content = (e) => { const s = getComputedStyle(e); return e.clientWidth - parseFloat(s.paddingLeft) - parseFloat(s.paddingRight); };
      const surf = r.closest('.mx-wexsurface').getBoundingClientRect();
      return { side: Math.round(k.left) >= Math.round(a.right) - 1 && k.top < a.bottom && a.top < k.bottom,
        stacked: Math.round(k.top) >= Math.round(a.bottom) - 2,
        askW: Math.round(content(ask)), workW: Math.round(content(work)),
        over: Math.round(k.right) > Math.round(surf.right) + 1 || r.scrollWidth > r.clientWidth + 1,
        askMin: parseInt(cs.getPropertyValue('--mx-ask-min'), 10),
        workMin: parseInt(cs.getPropertyValue('--mx-work-min'), 10) };
    }, GROUPS.find((x) => x.type === 'sequence').id));
    await p.close();
  }
  /* The floors are the APP's — read back from the custom properties it publishes — so this cannot pass by
     agreeing with a number copied into the test. */
  ok('a row splits into ask and working only while both can be a readable measure, and otherwise stacks',
     rows.every((r) => !r.over && (r.side !== r.stacked)
       && (r.side ? (r.askW >= r.askMin - 1 && r.workW >= r.workMin - 1) : (r.askW === r.workW)))
     && rows.some((r) => r.side) && rows.some((r) => r.stacked),
     rows.map((r, k) => `${sizes[k][0]}px: ${r.side ? `ask ${r.askW}px | working ${r.workW}px` : `stacked at ${r.askW}px`}`).join(' · '));
  /* And the FLOOR is what decides it, not the viewport: at a width that splits comfortably, raising the ask's
     floor past what the row can give both sides must STACK the same row — and a grid that could not wrap
     would show the failure as overflow instead, so overflow is asserted too. The floor is raised on the
     PUBLISHED property through a stylesheet rule (it survives the re-render a bridge transition causes) and
     the page's own resolver is run, exactly as a resize would run it. */
  const pw = await open({ slide: WEX });
  const seqId = GROUPS.find((x) => x.type === 'sequence').id;
  const row = (id) => pw.evaluate((id) => { document.querySelector(`[data-mx-tab="${id}"]`).click();
    const r = document.querySelector(`[data-mx-panel="${id}"] .mx-wexex`);
    const a = r.querySelector('.mx-wexask').getBoundingClientRect(), w = r.querySelector('.mx-wexwork').getBoundingClientRect();
    const surf = r.closest('.mx-wexsurface').getBoundingClientRect();
    return { askW: Math.round(a.width), side: Math.round(w.left) >= Math.round(a.right) - 1 && w.top < a.bottom,
      stacked: Math.round(w.top) >= Math.round(a.bottom) - 2, over: Math.round(w.right) > Math.round(surf.right) + 1,
      rows: document.querySelector('.mx').dataset.mxRows }; }, id);
  const before = await row(seqId);
  await pw.addStyleTag({ content: '.mx-wex{--mx-ask-min:900px !important}' });
  await pw.evaluate(() => mxResolveFit()); await pw.waitForTimeout(600);
  const after = await row(seqId);
  await pw.close();
  ok('CONTROL: the FLOOR decides the split — raise it and the same row at the same width stacks, and nothing overflows',
     before.side && !before.over && after.stacked && !after.side && !after.over && after.rows === 'stacked',
     `1536px: ask ${before.askW}px beside the working at a 300px floor; `
     + `${after.askW}px above it at a 900px floor (data-mx-rows="${after.rows}", ${after.over ? 'OVERFLOWS' : 'no overflow'})`);
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
     await p.evaluate((w) => { const g = LESSON.slides[w].groups[0];
       g.type = 'nosuchtype';
       g.examples[0].steps[0].visual = { kind: 'points', items: [{ term: '(1, 1)' }] };
       go(w);
       const pane = document.querySelector(`[data-mx-panel="${g.id}"]`);
       const sv = pane.querySelector('.mx-step[data-mx-stepvis] .mx-stepvis .mx-part');
       return pane.dataset.mxWextype === 'extended' && !!sv && sv.getBoundingClientRect().height > 12; }, WEX),
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
  const drawn = {};
  for (const id of GROUPS.map((g) => g.id)) {
    await p.click(`[data-mx-tab="${id}"]`); await p.waitForTimeout(250);
    const last = await p.$(`[data-mx-panel="${id}"] [data-mx-state]:last-child`);
    if (last) { await last.click(); await p.waitForTimeout(450); }
    drawn[id] = await p.evaluate((id) =>
      document.querySelectorAll(`[data-mx-panel="${id}"] .tp-fig-ref`).length, id);
  }
  const perGroup = {};
  GROUPS.forEach((g) => { perGroup[g.id] = wanted.filter((w) => w.where.indexOf(g.id) >= 0
    || g.examples.some((e) => w.where.indexOf(e.id) >= 0)).length; });
  ok('every authored reference line is actually drawn — the picture shows what the words claim',
     GROUPS.every((g) => drawn[g.id] === perGroup[g.id]) && wanted.length > 0,
     GROUPS.map((g) => `${g.id}: ${perGroup[g.id]} authored, ${drawn[g.id]} drawn`).join(' · '));
  await p.click(`[data-mx-tab="${GROUPS[1].id}"]`); await p.waitForTimeout(250);
  const lastState = await p.$(`[data-mx-panel="${GROUPS[1].id}"] [data-mx-state]:last-child`);
  if (lastState) { await lastState.click(); await p.waitForTimeout(450); }
  const named = await p.evaluate((id) => {
    const pane = document.querySelector(`[data-mx-panel="${id}"]`);
    return { labels: [].slice.call(pane.querySelectorAll('.tp-fig-reflab')).map((e) => e.textContent.trim()),
      says: pane.querySelector('.mx-relations') ? pane.querySelector('.mx-relations').textContent : '' }; },
    GROUPS[1].id);
  ok('the line the relationship names is the line on the drawing',
     named.labels.length > 0 && named.labels.some((l) => named.says.replace(/\s+/g, ' ').indexOf(l) >= 0),
     `the figure is labelled ${named.labels.map((l) => `"${l}"`).join(', ')} and the relationship names it`);
  /* NEGATIVE CONTROL: take the line out and the demonstration contract must fail — the words still claim
     an intersection the picture no longer shows. */
  /* the plane may live on the example or on the group's own relationship region, depending on the
     contract; the control finds it wherever the lesson authored it rather than assuming a shape */
  const without = await p.evaluate(({ id, w }) => {
    const g = LESSON.slides[w].groups.find((x) => x.id === id);
    const pools = [g.relations, g.visual].concat(g.examples.map((e) => e.visual));
    pools.forEach((v) => { if (!v) return;
      (Array.isArray(v) ? v : v.parts || [v]).forEach((q) => {
        if (q && q.kind === 'figure' && q.figure.objects)
          q.figure.objects = q.figure.objects.filter((o) => o.type !== 'line'); }); });
    go(w);
    document.querySelector(`[data-mx-tab="${id}"]`).click();
    const st = document.querySelector(`[data-mx-panel="${id}"] [data-mx-state]:last-child`);
    if (st) st.click();
    return document.querySelectorAll(`[data-mx-panel="${id}"] .tp-fig-ref`).length; }, { id: GROUPS[1].id, w: WEX });
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
/* A plane may live inside a staged state, which is `hidden` until selected — and hidden means no box, so
   measuring without revealing measures nothing. Select the tab, then the state that holds a figure. */
const reveal = async (p, tab) => {
  if (tab) { await p.click(`[data-mx-tab="${tab}"]`); await p.waitForTimeout(300); }
  /* scoped to the panel that is actually on screen: `.mx-stpane:not([hidden])` matches inside a HIDDEN
     group panel too — an ancestor being hidden does not put the attribute on the child — so an unscoped
     probe reports a plane belonging to a group the reader cannot see. */
  const sel = tab ? `[data-mx-panel="${tab}"]` : '[data-mx-panel]:not([hidden])';
  const states = await p.$$(`${sel} [data-mx-state]`);
  for (const st of states) {
    await st.click(); await p.waitForTimeout(450);
    if (await p.evaluate((sel) => !!document.querySelector(`${sel} .mx-stpane:not([hidden]) .tp-fig-svg`), sel)) return;
  }
  await p.waitForTimeout(200);
};
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
    await reveal(p, tab);
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
  await reveal(p, GROUPS[2].id);
  const before = (await readScales(p))[0];
  await p.evaluate(({ id, w }) => { const g = LESSON.slides[w].groups.find((x) => x.id === id);
    const f = g.relations.find((q) => q.kind === 'figure').figure;
    f.scaleMode = 'authored'; f.aspect = 'stretch'; go(w); }, { id: GROUPS[2].id, w: WEX });
  await reveal(p, GROUPS[2].id);
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
    await reveal(p, GROUPS[1].id);
    rows.push(await p.evaluate((name) => {
      const vis = document.querySelector('[data-mx-panel]:not([hidden])') || document;
      const fig = [].slice.call(vis.querySelectorAll('.mx-stpane')).filter((n) => !n.hidden)
        .map((n) => n.querySelector('.tp-fig')).filter(Boolean)[0]
        || document.querySelector('.mx-part[data-mx-part="figure"] .tp-fig');
      const svg = fig.querySelector('.tp-fig-svg'), r = svg.getBoundingClientRect();
      const cs = getComputedStyle(document.querySelector('.mx-wex'));
      const t = svg.querySelector('.tp-fig-ticklabel');
      return { name, w: Math.round(r.width), h: Math.round(r.height),
        minW: parseInt(cs.getPropertyValue('--mx-plot-min-w'), 10),
        minH: parseInt(cs.getPropertyValue('--mx-plot-min-h'), 10),
        tick: t ? Math.round(parseFloat(getComputedStyle(t).fontSize) * (r.width / +svg.getAttribute('viewBox').split(/\s+/)[2]) * 10) / 10 : 0 }; }, name));
    await p.close();
  }
  ok('a plotted region is never below the legibility floor, at any width',
     rows.every((r) => r.w >= r.minW - 2 && r.h >= r.minH - 2 && r.tick >= 9),
     rows.map((r) => `${r.name}: ${r.w}×${r.h}, ticks ${r.tick}px (floor ${rows[0].minW}×${rows[0].minH})`).join(' · '));
  /* A COMPANION BELONGS TO ITS EXAMPLE, and the plane's shape decides how much ROOM it takes — never how
     the page re-places it. `standard` is the contract that carries one: the plane sits in the working's
     own column, at its authored proportions, and a portrait plane makes the page LONGER at the same width
     rather than being squeezed, or exiled to a centred column of its own. */
  const CF2 = JSON.parse(fs.readFileSync(path.join(root, 'tests/visual/lessons/mathematics-compositions.json'), 'utf8'));
  const stdId = CF2.slides[0].groups.find((g) => g.type === 'standard').id;
  const place = async (dom) => {
    const p = await open({ slide: 0, lesson: CF2 });
    await p.evaluate(({ id, dom }) => {
      const g = LESSON.slides[0].groups.find((x) => x.id === id);
      g.examples[0].visual = { parts: [{ kind: 'figure', figure: { type: 'figure', figure: 'graph',
        grid: 'shown', callouts: 'hidden', domain: dom,
        objects: [{ type: 'function', f: 'x^2', label: 'y = x^2' }] } }] };
      go(0); document.querySelector(`[data-mx-tab="${id}"]`).click(); }, { id: stdId, dom });
    await p.waitForTimeout(600);
    const r = await p.evaluate((id) => {
      const pane = document.querySelector(`[data-mx-panel="${id}"]`);
      const row = pane.querySelector('.mx-wexex'), work = pane.querySelector('.mx-wexwork');
      const aside = pane.querySelector('.mx-wexaside');
      const fig = aside && aside.querySelector('.mx-part[data-mx-part="figure"]');
      const res = work && work.querySelector('.mx-wexres');
      const b = (e) => e.getBoundingClientRect();
      const ws = work && getComputedStyle(work);
      const inset = work ? b(work).left + parseFloat(ws.borderLeftWidth) + parseFloat(ws.paddingLeft) : 0;
      return { inWorking: !!(work && aside && work.contains(aside)),
        centred: !!fig && Math.round(b(fig).left) > Math.round(inset) + 2,
        /* the answer still closes the region: nothing in the working ends below it */
        answerLast: !!res && [].slice.call(work.children).every((c) => c === res || b(c).bottom <= b(res).top + 1),
        rowH: Math.round(b(row).height), figW: Math.round(b(fig).width), figH: Math.round(b(fig).height) }; }, stdId);
    const sc = (await readScales(p))[0];
    await p.close(); return Object.assign(r, { ratio: sc && sc.ratio });
  };
  const wide = await place({ xMin: -20, xMax: 20, yMin: -2, yMax: 20 });
  const tall = await place({ xMin: -6, xMax: 6, yMin: -2, yMax: 20 });
  /* the plane's NATURAL SIZE is bounded on its longer side — the same rule for a companion as for the
     staged plane, so a portrait companion is drawn at the reviewed size rather than a quarter larger */
  const bp = await open({ slide: WEX });
  const bound = await bp.evaluate(() => { const cs = getComputedStyle(document.querySelector('.mx-wex'));
    return { w: parseInt(cs.getPropertyValue('--mx-plot-w'), 10), h: parseInt(cs.getPropertyValue('--mx-plot-h'), 10) }; });
  await bp.close();
  ok('CONTROL: a portrait companion takes HEIGHT, not a different placement and not a flattened plane',
     [wide, tall].every((r) => r.inWorking && !r.centred && r.answerLast && Math.abs(r.ratio - 1) < 0.03
       && r.figW <= bound.w + 1 && r.figH <= bound.h + 1)
     && tall.figH > wide.figH * 1.5 && tall.rowH > wide.rowH * 1.5,
     `40×22 → ${wide.figW}×${wide.figH} (scale ${wide.ratio}) · 12×22 → ${tall.figW}×${tall.figH} (scale ${tall.ratio}) — both in the working region at their natural size (longer side ≤ ${bound.h}px), the answer still last, row ${wide.rowH}px → ${tall.rowH}px`);
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
    await reveal(p, id);
    slots.push(await p.evaluate((id) => {
    const pane = document.querySelector(`[data-mx-panel="${id}"]`);
    const surf = pane.querySelector('.mx-wexsurface').getBoundingClientRect();
    const live = [].slice.call(pane.querySelectorAll('.mx-stpane')).filter((n) => !n.hidden)[0] || pane;
    const foot = live.querySelector('.mx-wexfoot [data-mx-part="figure"]');
    const mid = live.querySelector('.mx-wexmid [data-mx-part="figure"]');
    const cases = [].slice.call(live.querySelectorAll('.mx-wexbridge>.mx-wexzone[data-mx-zone="a"] .mx-wexex, .mx-wexbridge>.mx-wexzone[data-mx-zone="b"] .mx-wexex'))
      .map((n) => { const r = n.getBoundingClientRect();
        return { l: Math.round(r.left), r: Math.round(r.right), t: Math.round(r.top) }; });
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
    return { id, type: pane.dataset.mxWextype, surfW: Math.round(surf.width), surfMid, foot: box(foot), mid: box(mid), cases,
      solved: (pane.querySelector('.tp-fig')||{dataset:{}}).dataset.figBox }; }, id));
  }
  const cmp = slots.find((x) => x.type === 'comparison');
  /* A missing comparison group must FAIL this section, not throw out of it: a harness that dies on the way
     to its own assertion reports nothing at all, which is the one outcome a gate may never have. */
  if (!cmp) ok('a comparison group exists to measure the bridge against', false,
    `no group of type "comparison" among ${GROUPS.map((g) => g.type).join(' / ')}`);
  /* A SLOT IS A PLACE FOR A PLANE, NOT A SHAPE IMPOSED ON ONE. The earlier version of this asserted the
     comparison plane was "wide and shallow" — that was the composition dictating the mathematics, and the
     rendered plane went to 4.65:1. What the slot owes the plane now is a NATURAL box, in the place it
     belongs to; the scale section proves the plane inside it is undistorted.
     THE SLOT TAKES ITS SHAPE FROM THE PLANE. Not a band this file chooses — the box must match the ratio
     the AUTHORED domain implies, so re-authoring the mathematics re-shapes the slot and nothing else does.
     AND IT SITS BETWEEN THE CASES IT BRIDGES. A plane that explains why A and B agree is not an appendix
     under them: `comparison` is A | plane | B, all three reading at once, so the bridge is measured to be
     BETWEEN the two cases and level with them, not centred under a stack of them. */
  const cmpFig = cmp ? ((GROUPS.find((q) => q.id === cmp.id) || {}).relations || [])
    .filter((q) => q.kind === 'figure').map((q) => authoredRatio(q.figure))[0] : 0;
  ok('the comparison plane gets the box its authored domain implies, and bridges the two cases',
     !!(cmp && cmp.mid) && !!cmpFig && cmp.cases.length === 2
     && Math.abs((cmp.mid.w / cmp.mid.h) - cmpFig) / cmpFig < 0.06
     && cmp.mid.mid > cmp.cases[0].r && cmp.mid.mid < cmp.cases[1].l
     && Math.abs(cmp.cases[0].t - cmp.cases[1].t) <= 2,
     cmp && cmp.mid && cmpFig && cmp.cases.length === 2
       ? `${cmp.mid.w}×${cmp.mid.h} → ${(cmp.mid.w / cmp.mid.h).toFixed(3)} against an authored `
       + `${cmpFig.toFixed(3)}, between cases that end at ${cmp.cases[0].r}px and start at ${cmp.cases[1].l}px`
       : 'no comparison figure');
  /* Integer rounding of the box leaves a few per cent between the painted shape and the viewBox; a
     LETTERBOX is the order-of-magnitude case, where a box of the wrong shape entirely is centred in the
     slot with dead space beside it. */
  ok('and the drawing actually fills that slot rather than being letterboxed inside it',
     !!(cmp && cmp.mid) && cmp.mid.fillsW && cmp.mid.fillsH
     && Math.abs(cmp.mid.ar - 1) < 0.15 && cmp.solved !== '520x360',
     `painted ${cmp && cmp.mid && cmp.mid.paint.join('×')} at a re-solved box of ${cmp && cmp.solved} — `
     + `the paint is ${cmp && cmp.mid && cmp.mid.ar.toFixed(2)}× the viewBox shape (1.00 = took the slot's shape)`);
  /* The letterbox control that used to sit here compared the paint against the engine's 520x360 default.
     It cannot discriminate any more, and that is the point: every slot is now a natural box, so the default
     and the solved box are nearly the same shape and there is nothing left for a letterbox to be. The
     claim it was protecting — that the plane is not deformed — is now carried by the `scale` section
     above, which measures the rendered transform and has an adversarial control that distorts an axis.
     The control below is that two different authored domains give two different slots — a bridge column
     and a staged state's region — through the same engine and with no per-composition figure sizes. */
  const other = slots.find((x) => x.type === 'staged' && x.foot);
  const otherFig = other ? ((GROUPS.find((q) => q.id === other.id) || {}).relations || [])
    .filter((q) => q.kind === 'figure').map((q) => authoredRatio(q.figure))[0] : 0;
  ok('CONTROL: a different authored plane gets a different slot, through the same engine',
     !!(other && other.foot) && !!otherFig && !!(cmp && cmp.mid)
     && Math.abs((other.foot.w / other.foot.h) - otherFig) / otherFig < 0.08
     && Math.abs(otherFig - cmpFig) > 0.05,
     `staged ${other && other.foot ? (other.foot.w / other.foot.h).toFixed(3) : 'not measured'} against an `
     + `authored ${otherFig ? otherFig.toFixed(3) : 'n/a'}; comparison `
     + `${cmp && cmp.mid ? (cmp.mid.w / cmp.mid.h).toFixed(3) : 'not measured'} against `
     + `${cmpFig ? cmpFig.toFixed(3) : 'n/a'}`);
  await p.close();
  /* AND IT IS SEPARATED FROM WHAT IT FOLLOWS. On a handset the connection's label sat flush on the ANSWER
     band above it, because the only thing that had ever separated them was a tall plane in between. */
  const sep = [];
  for (const [w, h] of [[1536, 1024], [414, 896]]) {
    const q = await open({ w, h, slide: WEX });
    for (const id of GROUPS.map((x) => x.id)) {
      await reveal(q, id);
      sep.push(...await q.evaluate(({ id, w }) => {
        const pane = document.querySelector(`[data-mx-panel="${id}"]`);
        const live = [].slice.call(pane.querySelectorAll('.mx-stpane')).filter((n) => !n.hidden)[0] || pane;
        const foot = live.querySelector('.mx-wexfoot');
        if (!foot) return [];
        /* siblings of the FOOT — `live` is the pane in the unstaged case, whose only child is the surface
           the foot itself sits inside, and a parent always "ends below" its own child. */
        const above = [].slice.call(foot.parentElement.children).filter((n) => n !== foot
          && n.getBoundingClientRect().height > 0 && n.getBoundingClientRect().top < foot.getBoundingClientRect().top);
        if (!above.length) return [];
        const low = Math.max.apply(null, above.map((n) => n.getBoundingClientRect().bottom));
        return [{ id, w, gap: Math.round(foot.getBoundingClientRect().top - low) }]; }, { id, w }));
    }
    await q.close();
  }
  ok('a connection region is separated from the working it follows, at every width',
     sep.length > 0 && sep.every((r) => r.gap >= 16),
     sep.map((r) => `${r.id} at ${r.w}px: ${r.gap}px`).join(' · '));
  /* NEVER A HEADING ABOVE A HEADING SAYING THE SAME THING. A region may be titled above parts that name
     themselves, but the title must not repeat one of those names — the fixture authored a `footLabel` of
     "Why the two agree" over a part labelled the same, and the page printed it twice. */
  const hp = await open({ slide: WEX });
  const dups = [];
  for (const id of GROUPS.map((x) => x.id)) {
    await reveal(hp, id);
    dups.push(...await hp.evaluate((id) => {
      const pane = document.querySelector(`[data-mx-panel="${id}"]`);
      const live = [].slice.call(pane.querySelectorAll('.mx-stpane')).filter((n) => !n.hidden)[0] || pane;
      const norm = (t) => t.replace(/\s+/g, ' ').trim().toLowerCase();
      /* EVERY REGION — the foot and each zone inside a bridge or a pair. A region's own label may not repeat
         a heading its content carries, and may not stand directly over a part that names itself either:
         "Interpretation" over "Why the two agree" is the heading-above-heading even though the words differ. */
      return [].slice.call(live.querySelectorAll('.mx-wexfoot, .mx-wexzone')).map((r) => {
        const own = [].slice.call(r.children).filter((n) => n.classList.contains('mx-wexlab')).map((n) => norm(n.textContent));
        const inner = [].slice.call(r.querySelectorAll('.mx-part [class*="parth"], .mx-part .mx-wexlab, .mx-parth, .mx-wexzone > .mx-wexlab'))
          .filter((n) => n.parentElement !== r).map((n) => norm(n.textContent));
        const first = [].slice.call(r.children).filter((n) => !n.classList.contains('mx-wexlab'))[0];
        const adjacent = own.length > 0 && !!first && first.matches('.mx-part') && !!first.querySelector(':scope > .mx-parth');
        return { id, repeated: own.filter((t) => inner.indexOf(t) >= 0), adjacent, regions: 1 }; }); }, id));
  }
  ok('no region repeats a heading its own content already carries, and none stands directly over a part that names itself',
     dups.length > 0 && dups.every((d) => d.repeated.length === 0 && !d.adjacent),
     dups.map((d) => `${d.id}: ${d.repeated.length ? '"' + d.repeated.join('", "') + '" twice' : d.adjacent ? 'label over a self-named part' : 'named once'}`).join(' · '));
  /* CONTROL: put a region label back over a part that names itself and the check sees it. */
  const relabel = await hp.evaluate((id) => {
    document.querySelector(`[data-mx-tab="${id}"]`).click();
    const pane = document.querySelector(`[data-mx-panel="${id}"]`);
    const last = pane.querySelector('[data-mx-state]:last-child'); if (last) last.click();
    const live = [].slice.call(pane.querySelectorAll('.mx-stpane')).filter((n) => !n.hidden)[0] || pane;
    const zone = [].slice.call(live.querySelectorAll('.mx-wexfoot, .mx-wexzone')).find((z) => !z.querySelector(':scope > .mx-wexlab')
      && z.firstElementChild && z.firstElementChild.matches('.mx-part') && z.firstElementChild.querySelector(':scope > .mx-parth'));
    if (!zone) return { found: false };
    const h = document.createElement('h4'); h.className = 'mx-wexlab'; h.textContent = 'Interpretation'; zone.prepend(h);
    const first = [].slice.call(zone.children).filter((n) => !n.classList.contains('mx-wexlab'))[0];
    return { found: true, adjacent: first.matches('.mx-part') && !!first.querySelector(':scope > .mx-parth') }; },
    GROUPS.find((g) => g.type === 'comparison').id);
  await hp.close();
  ok('CONTROL: a label put back over a self-named part is caught, so the adjacency is measured not assumed',
     relabel.found && relabel.adjacent, relabel.found ? 'a generated "Interpretation" over "Why the two agree" would fail' : 'no self-named region to relabel');
  /* A REGION IS AS TALL AS WHAT IT HOLDS. A grid that pinned the plane across `span 30` rows carried
     thirty row gaps, so a 676px plane sat above 383px of nothing and the state read as half-empty. The
     claim is general: no explanatory region may end materially below its own tallest child. */
  const tp = await open({ slide: WEX });
  for (const id of GROUPS.map((x) => x.id)) await reveal(tp, id);
  const tails = await tp.evaluate((ids) => ids.map((id) => {
    document.querySelector(`[data-mx-tab="${id}"]`).click();
    const pane = document.querySelector(`[data-mx-panel="${id}"]`);
    const live = [].slice.call(pane.querySelectorAll('.mx-stpane')).filter((n) => !n.hidden)[0] || pane;
    return [].slice.call(live.querySelectorAll('.mx-wexfoot, .mx-wexbridge')).map((r) => {
      /* a stretched zone ends at the region's bottom by construction, so the measure is to the last CONTENT
         inside each zone — the reserved space a zone could hide is exactly what this must see */
      const kids = [].slice.call(r.querySelectorAll(':scope > *, :scope > .mx-wexpair > .mx-wexzone > *, :scope > .mx-wexzone > *'))
        .filter((n) => !n.classList.contains('mx-wexzone') && !n.classList.contains('mx-wexpair') && n.getBoundingClientRect().height > 0);
      const low = Math.max.apply(null, kids.map((n) => n.getBoundingClientRect().bottom));
      return { id, slack: Math.round(r.getBoundingClientRect().bottom - low) }; }); }).flat(),
    GROUPS.map((x) => x.id));
  await tp.close();
  ok('a region is as tall as what it holds — no reserved space below its own content',
     tails.length > 0 && tails.every((t) => t.slack <= 8),
     tails.map((t) => `${t.id}: ${t.slack}px below its last piece`).join(' · '));
  /* A COMPARISON IS SIMULTANEOUS OR IT IS STAGED — never squeezed, and never merely reordered. While its
     own floors are met it is A | plane | B, all three read at once. When they are not, it is a different
     STRUCTURE: two states, both workings first and the object that explains them second. The floors are
     read from the app's own published custom properties, so this cannot pass by agreeing with a number
     copied into this file. */
  const br = [];
  for (const w of [1920, 1536, 1440, 1381, 1380, 1300, 1194, 834, 414]) {
    const q = await open({ w, h: 1100, slide: WEX });
    await reveal(q, cmp.id);
    br.push(await q.evaluate(({ id, w }) => {
      const pane = document.querySelector(`[data-mx-panel="${id}"]`);
      const cs = getComputedStyle(document.querySelector('.mx-wex'));
      const surf = pane.querySelector('.mx-wexsurface'), scs = getComputedStyle(surf);
      const inner = Math.round(surf.clientWidth - (parseFloat(scs.paddingLeft) || 0) - (parseFloat(scs.paddingRight) || 0));
      const askMin = parseInt(cs.getPropertyValue('--mx-ask-min'), 10);
      const plotMin = parseInt(cs.getPropertyValue('--mx-plot-min-w'), 10);
      const zonePad = parseInt(cs.getPropertyValue('--mx-zone-pad'), 10);
      const b = pane.querySelector('.mx-wexbridge');
      const stateBtns = [].slice.call(pane.querySelectorAll('[data-mx-state]'));
      const states = stateBtns.map((x) => x.textContent.replace(/\s+/g, ' ').trim());
      /* THE ORDER A READER ACTUALLY MEETS THINGS IN — measured on the state they LAND ON, which is the
         first one. `reveal` selects the last state to force a figure to solve, so measuring whatever is
         on screen would read the visual state and report the picture the claim is about. */
      if (stateBtns.length) stateBtns[0].click();
      const live = [].slice.call(pane.querySelectorAll('.mx-stpane')).filter((n) => !n.hidden)[0] || pane;
      const order = [].slice.call(live.querySelectorAll('.mx-wexres, .mx-part[data-mx-part="figure"]'))
        .filter((e) => e.getBoundingClientRect().height > 4)
        .map((e) => ({ k: e.classList.contains('mx-wexres') ? 'answer' : 'plane', t: e.getBoundingClientRect().top }))
        .sort((x, y) => x.t - y.t).map((x) => x.k);
      return { w, inner, askMin, plotMin, zonePad, mode: b ? 'bridge' : 'staged', states, order,
        cols: b ? getComputedStyle(b).gridTemplateColumns.split(' ').filter(Boolean).length : 0,
        /* a case's measure is its primitive — the zone also carries the channel beside its rule */
        cases: b ? [].slice.call(b.querySelectorAll(':scope>.mx-wexzone[data-mx-zone="a"] .mx-wexex, :scope>.mx-wexzone[data-mx-zone="b"] .mx-wexex')).map((e) => Math.round(e.getBoundingClientRect().width)) : [],
        mid: b ? Math.round(b.querySelector('.mx-wexmid').getBoundingClientRect().width) : 0,
        over: b ? Math.round(b.getBoundingClientRect().right) > Math.round(surf.getBoundingClientRect().right) + 1 : false }; },
      { id: cmp.id, w }));
    await q.close();
  }
  /* two cases at their reading floor, each with the channel beside its rule; the plane at its legibility
     floor with a channel each side; two rules — every term read from the page's published properties */
  const needs = (r) => 2 * (r.askMin + r.zonePad) + r.plotMin + 2 * r.zonePad + 2;
  ok('a comparison is a simultaneous bridge exactly while its own floors are met, and never overflows',
     br.every((r) => !r.over && (r.inner >= needs(r) ? r.mode === 'bridge' : r.mode === 'staged'))
     && br.some((r) => r.mode === 'bridge') && br.some((r) => r.mode === 'staged'),
     br.map((r) => `${r.w}px (${r.inner} inner, needs ${needs(r)}): ${r.mode === 'bridge'
       ? `${r.cases[0]} | ${r.mid} | ${r.cases[1]}` : 'staged'}`).join(' · '));
  ok('while it is a bridge, no case and no plane is squeezed below its floor',
     br.filter((r) => r.mode === 'bridge').every((r) => r.cols === 3 && r.cases.length === 2
       && r.cases.every((c) => c >= r.askMin - 1) && r.mid >= r.plotMin - 1),
     br.filter((r) => r.mode === 'bridge').map((r) => `${r.w}px: ${r.cases.join(' | ')} with a ${r.mid}px plane`).join(' · '));
  /* THE ONE THE MAINTAINER NAMED. A collapsed comparison must not put the picture between the two cases:
     that answers the second working before the reader has done it, which is a change of pedagogy, not of
     layout. Measured as the order a reader meets things in, not as DOM order. */
  const collapsed = br.filter((r) => r.mode === 'staged');
  ok('COLLAPSED, THE VISUAL CANNOT APPEAR BETWEEN THE TWO CASES — both workings complete first',
     collapsed.length > 0
     && collapsed.every((r) => r.order.length >= 2 && r.order.every((k) => k === 'answer'))
     && collapsed.every((r) => r.states.length === 2),
     collapsed.map((r) => `${r.w}px: ${r.states.join(' | ')} → ${r.order.join(' → ')}`).join(' · '));
  /* CONTROL: the decision is the COMPOSITION'S floors, not the viewport. Collapsing the navigation rail
     below the width where the old breakpoint gave up widens the surface past the bridge's floors, and the
     bridge must come back. A media query cannot pass this — the viewport never changed. */
  const rail = [];
  for (const w of [1300, 1200]) {
    const q = await open({ w, h: 1000, slide: WEX });
    await reveal(q, cmp.id);
    const before = await q.evaluate((id) => ({
      inner: Math.round(document.querySelector(`[data-mx-panel="${id}"] .mx-wexsurface`).clientWidth),
      mode: document.querySelector(`[data-mx-panel="${id}"] .mx-wexbridge`) ? 'bridge' : 'staged' }), cmp.id);
    await q.evaluate(() => rpNavToggle());
    await q.waitForTimeout(700);
    await q.evaluate((id) => { const t = document.querySelector(`[data-mx-tab="${id}"]`); if (t) t.click(); }, cmp.id);
    await q.waitForTimeout(400);
    const after = await q.evaluate((id) => ({
      inner: Math.round(document.querySelector(`[data-mx-panel="${id}"] .mx-wexsurface`).clientWidth),
      mode: document.querySelector(`[data-mx-panel="${id}"] .mx-wexbridge`) ? 'bridge' : 'staged' }), cmp.id);
    rail.push({ w, before, after });
    await q.close();
  }
  ok('CONTROL: the composition decides, not the viewport — widen the surface at a fixed viewport and the bridge returns',
     rail.every((r) => r.before.mode === 'staged' && r.after.mode === 'bridge'),
     rail.map((r) => `${r.w}px viewport: rail open ${r.before.inner}px → ${r.before.mode}, `
       + `rail collapsed ${r.after.inner}px → ${r.after.mode}`).join(' · '));
}
{
  /* NARROW, THE PLANE KEEPS ITS PROPORTIONS. The claim used to be made about a stacked companion; the
     group that had one is `staged` now, so it is made where the plane actually lives — its own state. A
     smaller box of the same shape is correct; a different shape never is. */
  const want = (GROUPS[1].relations || []).filter((q) => q.kind === 'figure').map((q) => authoredRatio(q.figure))[0];
  const rows = [];
  for (const [w, h, name] of [[1536, 1024, 'desktop'], [834, 1112, 'portrait'], [414, 896, 'phone']]) {
    const p = await open({ w, h, slide: WEX });
    await reveal(p, GROUPS[1].id);
    rows.push(await p.evaluate((id) => {
      const pane = document.querySelector(`[data-mx-panel="${id}"]`);
      const live = [].slice.call(pane.querySelectorAll('.mx-stpane')).filter((n) => !n.hidden)[0];
      const n = live.querySelector('[data-mx-part="figure"]');
      const r = n.getBoundingClientRect();
      return { w: Math.round(r.width), h: Math.round(r.height), vh: window.innerHeight }; }, GROUPS[1].id));
    await p.close();
  }
  ok('the plane keeps its authored proportions at every width — a smaller box of the same shape',
     !!want && rows.every((r) => Math.abs((r.w / r.h) - want) / want < 0.08),
     rows.map((r, k) => `${['desktop', 'portrait', 'phone'][k]}: ${r.w}×${r.h} → ${(r.w / r.h).toFixed(3)} `
       + `against an authored ${want.toFixed(3)}`).join(' · '));
}
// ══ the worked-example primitive ═══════════════════════════════════════════════════════════════
// ONE WORKED EXAMPLE IS ONE NAMED-REGION RECTANGLE — TITLE spanning, then QUESTION | WORKED SOLUTION with
// ANSWER as the final band of the working — and THE REGIONS ARE ALIGNED, NEVER THE AMOUNT OF CONTENT IN
// THEM. `standard` is one instance of it and `sequence` is N; the claim below is that they are the SAME
// primitive, not two implementations that look alike, and each clause carries a control that a look-alike
// would fail.
mark('primitive');
const CFP = JSON.parse(fs.readFileSync(path.join(root, 'tests/visual/lessons/mathematics-compositions.json'), 'utf8'));
/* everything the primitive is made of, measured relative to its own rectangle */
const anatomy = (p) => p.evaluate(() => {
  const pane = [].slice.call(document.querySelectorAll('[data-mx-panel]')).find((e) => !e.hidden);
  const live = [].slice.call(pane.querySelectorAll('.mx-stpane')).filter((n) => !n.hidden)[0] || pane;
  const surf = pane.querySelector('.mx-wexsurface'), sr = surf.getBoundingClientRect(), scs = getComputedStyle(surf);
  const ground = getComputedStyle(document.querySelector('.mx')).backgroundColor;
  const R = (e) => e && e.getBoundingClientRect();
  const inset = (e) => { const s = getComputedStyle(e); return R(e).left + parseFloat(s.borderLeftWidth) + parseFloat(s.paddingLeft); };
  /* the left edge of each LINE of a value: its glyph boxes clustered by vertical overlap, so a built-up
     fraction — whose numerator and denominator sit above and below the line — stays on the line it is in */
  const lines = (e) => { const rg = document.createRange(); rg.selectNodeContents(e);
    const rs = [].slice.call(rg.getClientRects()).filter((r) => r.width >= 2).sort((a, b) => a.top - b.top);
    const out = []; rs.forEach((r) => { const c = out[out.length - 1];
      if (c && r.top < c.bottom - 2) { c.left = Math.min(c.left, r.left); c.bottom = Math.max(c.bottom, r.bottom); }
      else out.push({ left: r.left, bottom: r.bottom }); });
    return out.map((c) => Math.round(c.left)); };
  return { rows: document.querySelector('.mx').dataset.mxRows, foot: document.querySelector('.mx').dataset.mxFoot,
    surfL: Math.round(sr.left), surfR: Math.round(sr.right), surfBg: scs.backgroundColor, ground,
    surfPad: parseFloat(scs.paddingLeft),
    ex: [].slice.call(live.querySelectorAll('.mx-wexex')).map((ex) => {
      const ttl = ex.querySelector('.mx-wexh'), ask = ex.querySelector('.mx-wexask'), work = ex.querySelector('.mx-wexwork');
      const al = ask && ask.querySelector('.mx-wexlab'), wl = work.querySelector('.mx-wexlab');
      const steps = work.querySelector('.mx-steps'), res = work.querySelector('.mx-wexres');
      const rl = res && res.querySelector('.mx-wexrl'), rv = res && res.querySelector('.mx-wexrv');
      const acs = ask && getComputedStyle(ask), wcs = getComputedStyle(work), rcs = res && getComputedStyle(res);
      const x = R(ex);
      return { id: ex.dataset.mxExample, form: ex.dataset.mxForm || '', inSurface: surf.contains(ex),
        box: { l: Math.round(x.left), w: Math.round(x.width) },
        title: ttl ? { l: Math.round(R(ttl).left), r: Math.round(R(ttl).right), b: Math.round(R(ttl).bottom), align: getComputedStyle(ttl).textAlign } : null,
        ask: ask ? { l: Math.round(R(ask).left), r: Math.round(R(ask).right), t: Math.round(R(ask).top), b: Math.round(R(ask).bottom),
          inset: Math.round(inset(ask)), bg: acs.backgroundColor, br: acs.borderRightWidth, radius: acs.borderRadius,
          labT: al ? Math.round(R(al).top) : null, labL: al ? Math.round(R(al).left) : null } : null,
        work: { l: Math.round(R(work).left), r: Math.round(R(work).right), t: Math.round(R(work).top), b: Math.round(R(work).bottom),
          inset: Math.round(inset(work)), bl: wcs.borderLeftWidth, labT: wl ? Math.round(R(wl).top) : null, labL: wl ? Math.round(R(wl).left) : null,
          stepsL: steps ? Math.round(R(steps).left) : null,
          lastBottom: Math.max.apply(null, [].slice.call(work.children).filter((c) => c !== res).map((c) => R(c).bottom).concat([0])) },
        res: res ? { l: Math.round(R(res).left), r: Math.round(R(res).right), t: Math.round(R(res).top), b: Math.round(R(res).bottom),
          labL: Math.round(R(rl).left), valL: Math.round(R(rv).left), lines: lines(rv),
          radius: rcs.borderRadius, bg: rcs.backgroundColor, bt: rcs.borderTopWidth, bl: rcs.borderLeftWidth, br: rcs.borderRightWidth, bb: rcs.borderBottomWidth,
          align: rcs.textAlign } : null }; }) }; });
const fmt = (n) => (n == null ? '—' : n);
{
  /* THE SPLIT FORM, on every example of the shipping sequence and of the design fixture's standard. */
  const split = [];
  for (const [lesson, slide, tab] of [[FIX, WEX, GROUPS.find((g) => g.type === 'sequence').id],
                                      [CFP, 0, CFP.slides[0].groups.find((g) => g.type === 'standard').id],
                                      [CFP, 0, CFP.slides[0].groups.find((g) => g.type === 'sequence').id]]) {
    const p = await open({ slide, lesson });
    await p.click(`[data-mx-tab="${tab}"]`); await p.waitForTimeout(300);
    const a = await anatomy(p); a.ex.forEach((e) => split.push(Object.assign({ tab }, e, { surf: a })));
    await p.close();
  }
  const spans = (e) => e.title && e.ask && Math.abs(e.title.l - e.ask.inset) <= 1 && Math.abs(e.title.r - e.work.r) <= 1
    && e.title.b <= e.ask.t && e.title.b <= e.work.t;
  ok('THE TITLE SPANS THE WHOLE EXAMPLE, above both regions',
     split.length >= 5 && split.every(spans),
     split.map((e) => `${e.id}: title ${e.title.l}→${e.title.r} over regions at ${e.ask ? e.ask.inset : '—'}→${e.work.r}`).join(' · '));
  ok('QUESTION and WORKED SOLUTION begin on the same line beneath it',
     split.every((e) => e.ask && e.ask.labT != null && e.work.labT != null && Math.abs(e.ask.labT - e.work.labT) <= 1),
     split.map((e) => `${e.id}: ${fmt(e.ask && e.ask.labT)} / ${fmt(e.work.labT)}`).join(' · '));
  /* Both regions are rectangles the row's full height, in one surface, with exactly one quiet rule where
     they meet and the question's tint — a shade neither the surface nor the ground is — reaching that rule
     on one side and the surface's edge on the other; no radius, no gutter beyond the rule's own channels. */
  const rect = (e) => e.ask && e.ask.t === e.work.t && e.ask.b === e.work.b && Math.abs(e.ask.r - e.work.l) <= 1
    && e.work.bl === '1px' && e.ask.br === '0px' && e.ask.radius === '0px'
    && e.ask.bg !== e.surf.surfBg && e.ask.bg !== e.surf.ground && e.inSurface
    && Math.abs(e.ask.l - e.surf.surfL) <= 1 && Math.abs(e.work.r - (e.surf.surfR - e.surf.surfPad)) <= 1;
  ok('PROBLEM and WORKING are explicit rectangles inside one surface — the row\'s full height each, one rule between them, the tint reaching it',
     split.every(rect),
     split.map((e) => `${e.id}: ${e.ask.t}→${e.ask.b} both, rule at ${e.work.l}, question text to rule ${e.work.inset - (e.ask.r - (e.work.inset - e.work.l - 1))}px`).join(' · ').slice(0, 400));
  ok('ANSWER is the final band of the working, at the same inset as the solution above it — no box, no fill, no radius',
     split.every((e) => e.res && e.res.labL === e.work.inset && e.work.stepsL === e.work.inset && e.work.labL === e.work.inset
       && e.res.l === e.work.inset && Math.abs(e.res.r - e.work.r) <= 1 && e.res.t >= e.work.lastBottom - 1
       && e.res.radius === '0px' && /rgba\(0, 0, 0, 0\)|transparent/.test(e.res.bg)
       && e.res.bt === '1px' && e.res.bl === '0px' && e.res.br === '0px' && e.res.bb === '0px'),
     split.map((e) => `${e.id}: label at ${fmt(e.res && e.res.labL)} = steps at ${fmt(e.work.stepsL)}, rule-top ${fmt(e.res && e.res.bt)}, radius ${fmt(e.res && e.res.radius)}`).join(' · '));
  /* CONTROL: put the old card back and the band contract must fail — its label moves 19px in. */
  const pc = await open({ slide: WEX });
  await pc.addStyleTag({ content: '.mx-wexres{padding:12px 16px;border:1px solid #E5E9E6;border-left:3px solid #0F7A4C;border-radius:0 13px 13px 0;background:#fff}' });
  await pc.click(`[data-mx-tab="${GROUPS.find((g) => g.type === 'sequence').id}"]`); await pc.waitForTimeout(300);
  const card = (await anatomy(pc)).ex[0];
  await pc.close();
  ok('CONTROL: the old floating card fails the band contract — the label is no longer at the solution\'s inset',
     !!card.res && (card.res.labL !== card.work.inset || card.res.radius !== '0px'),
     `with the card restored the label sits at ${card.res && card.res.labL} against an inset of ${card.work.inset}, radius ${card.res && card.res.radius}`);
}
{
  /* THE STACKED FORM — the same regions in the same order, TITLE → QUESTION → WORKED SOLUTION → ANSWER,
     the rule gone, every inset the same, and a wrapped answer returning to that inset (the mobile drift). */
  const stacked = [];
  for (const [lesson, slide, tab] of [[FIX, WEX, GROUPS.find((g) => g.type === 'sequence').id],
                                      [CFP, 0, CFP.slides[0].groups.find((g) => g.type === 'standard').id]]) {
    const p = await open({ w: 414, h: 896, slide, lesson });
    await p.click(`[data-mx-tab="${tab}"]`); await p.waitForTimeout(300);
    const a = await anatomy(p); a.ex.forEach((e) => stacked.push(Object.assign({ tab }, e, { surf: a })));
    await p.close();
  }
  const ordered = (e) => e.ask && e.title.b <= e.ask.t && e.ask.b <= e.work.t && e.res && e.res.t >= e.work.lastBottom - 1;
  const oneInset = (e) => e.ask && new Set([e.title.l, e.ask.labL, e.work.labL, e.res.labL, e.work.stepsL]).size === 1;
  ok('STACKED, the same regions keep their order — title, question, worked solution, answer — with no rule and one inset',
     stacked.length >= 3 && stacked.every((e) => ordered(e) && oneInset(e) && e.work.bl === '0px' && e.ask.br === '0px'
       && Math.abs(e.ask.l - e.surf.surfL) <= 1 && Math.abs(e.ask.r - e.surf.surfR) <= 1),
     stacked.map((e) => `${e.id}: ${e.title.b} → ${e.ask.t}…${e.ask.b} → ${e.work.t} → ${e.res.t}, inset ${e.title.l}`).join(' · '));
  ok('and a wrapped answer returns to the inset — the value never hangs toward the centre',
     stacked.some((e) => e.res.lines.length > 1)
     && stacked.every((e) => e.res.lines.slice(1).every((l) => Math.abs(l - e.res.l) <= 1) && e.res.align === 'start'),
     stacked.map((e) => `${e.id}: ${e.res.lines.length} line(s) at ${e.res.lines.join('/')}`).join(' · '));
  /* CONTROL: an injected rule and a re-ordered grid are both seen. Specificity above the stylesheet's own,
     and the perturbation read back before anything is asserted on it. */
  const pc = await open({ w: 414, h: 896, slide: WEX });
  await pc.addStyleTag({ content: '.mx-wexseq>.mx-wexex{grid-template-areas:"title" "work" "ask" !important} .mx-wexwork{border-left:1px solid red !important}' });
  await pc.click(`[data-mx-tab="${GROUPS.find((g) => g.type === 'sequence').id}"]`); await pc.waitForTimeout(300);
  const landed = await pc.evaluate(() => getComputedStyle(document.querySelector('[data-mx-panel]:not([hidden]) .mx-wexex')).gridTemplateAreas);
  const bad = (await anatomy(pc)).ex[0];
  await pc.close();
  ok('CONTROL: re-order the regions and draw a rule, and the stacked contract fails on both counts',
     /"work" "ask"/.test(landed) && !ordered(bad) && bad.work.bl !== '0px',
     `areas ${landed}: answer at ${bad.res && bad.res.t} above the question at ${bad.ask && bad.ask.t}; rule ${bad.work.bl}`);
}
{
  /* THE SAME PRIMITIVE, NOT TWO THAT LOOK ALIKE. One example, authored identically as the whole of a
     `standard` group and as a member of a `sequence`. Three things must agree: the anatomy (the element
     tree with its region names), the RULES THAT REACH EACH ELEMENT (a second implementation lives in the
     stylesheet, keyed on the composition, and geometry alone cannot see it), and the geometry. And every
     instance on the page must come through the one function. */
  const alt = JSON.parse(JSON.stringify(CFP));
  const seq = alt.slides[0].groups.find((g) => g.type === 'sequence'), std = alt.slides[0].groups.find((g) => g.type === 'standard');
  const shared = JSON.parse(JSON.stringify(GROUPS.find((g) => g.type === 'sequence').examples[0]));
  std.examples = [JSON.parse(JSON.stringify(shared))]; seq.examples[0] = JSON.parse(JSON.stringify(shared));
  const probe = (p) => p.evaluate(({ stdId, seqId, exId }) => {
    const nodes = (gid) => { document.querySelector(`[data-mx-tab="${gid}"]`).click();
      const ex = document.querySelector(`[data-mx-panel="${gid}"] [data-mx-example="${exId}"]`);
      return ['', '.mx-wexh', '.mx-wexask', '.mx-wexask>.mx-wexlab', '.mx-wexqb', '.mx-wexwork', '.mx-wexsec', '.mx-wexsec>.mx-wexlab', '.mx-steps', '.mx-wexres', '.mx-wexrl', '.mx-wexrv']
        .map((sel) => ({ sel: sel || '(article)', el: sel ? ex.querySelector(sel) : ex, ex })); };
    const rules = []; [].slice.call(document.styleSheets).forEach((sh) => { let rs; try { rs = sh.cssRules; } catch (e) { return; }
      const walk = (list) => [].slice.call(list).forEach((r) => { if (r.selectorText) rules.push(r.selectorText);
        else if (r.media && matchMedia(r.media.mediaText).matches && r.cssRules) walk(r.cssRules); }); walk(rs); });
    const matched = (el) => rules.filter((t) => { try { return el.matches(t); } catch (e) { return false; } });
    const sig = (el) => el.tagName + '.' + [].slice.call(el.classList).sort().join('.') + (el.dataset.mxRegion ? '[' + el.dataset.mxRegion + ']' : '');
    const geo = (el, ex) => { const r = el.getBoundingClientRect(), x = ex.getBoundingClientRect();
      return [Math.round(r.left - x.left), Math.round(r.top - x.top), Math.round(r.width), Math.round(r.height)].join(','); };
    const read = (gid) => nodes(gid).map((n) => n.el ? { sel: n.sel, sig: sig(n.el), rules: matched(n.el).join(' | '), geo: geo(n.el, n.ex) } : { sel: n.sel, missing: true });
    return { std: read(stdId), seq: read(seqId), suspect: rules.filter((t) => /data-mx-wextype|data-mx-count|:nth-|:only-child/.test(t) && /mx-wex(ex|h|ask|work|res|qb|lab|sec)/.test(t)) };
  }, { stdId: std.id, seqId: seq.id, exId: shared.id });
  const p = await open({ slide: 0, lesson: alt });
  const same = await probe(p);
  const diff = (k) => same.std.map((a, i) => [a, same.seq[i]]).filter(([a, b]) => a.missing || b.missing || a[k] !== b[k]).map(([a]) => a.sel);
  ok('THE SAME PRIMITIVE UNDER standard AND sequence — the same anatomy, reached by the same stylesheet rules, at the same geometry',
     same.std.length === 12 && !same.std.some((n) => n.missing) && diff('sig').length === 0 && diff('rules').length === 0 && diff('geo').length === 0
     && same.suspect.length === 0,
     `12 elements compared: ${diff('sig').length} anatomy, ${diff('rules').length} rule-set and ${diff('geo').length} geometry differences; `
     + `${same.suspect.length} composition-keyed rule(s) reach the primitive`);
  /* CONTROL: a second implementation with the SAME VALUES — geometry stays identical, and the rule
     provenance is what catches it. */
  await p.addStyleTag({ content: '[data-mx-wextype="sequence"] .mx-wexex{padding:22px 30px 26px}' });
  const twin = await probe(p);
  const tdiff = (k) => twin.std.map((a, i) => [a, twin.seq[i]]).filter(([a, b]) => a[k] !== b[k]).map(([a]) => a.sel);
  ok('CONTROL: a look-alike stylesheet keyed on the composition leaves the geometry identical and is caught by the rules that reach the element',
     tdiff('geo').length === 0 && tdiff('rules').length > 0 && twin.suspect.length > 0,
     `same-value rule injected: ${tdiff('geo').length} geometry differences, ${tdiff('rules').length} element(s) now reached by different rules (${tdiff('rules').join(', ')})`);
  /* ONE CODE PATH: every instance on the page — every group, every state, hidden or not — is emitted by
     mxWexEx. The function is wrapped to mark what it emits, the page re-rendered, and the marks counted. */
  const spy = await p.evaluate(() => {
    const orig = mxWexEx; let n = 0;
    mxWexEx = function () { n++; return orig.apply(this, arguments).replace('<article class="mx-wexex"', '<article data-mx-spy class="mx-wexex"'); };
    go(0);
    const all = document.querySelectorAll('.mx-wex [data-mx-example]').length, marked = document.querySelectorAll('.mx-wex [data-mx-spy]').length;
    mxWexEx = orig; go(0);                              /* and the page is rendered clean again */
    return { calls: n, all, marked }; });
  const authored = alt.slides[0].groups.reduce((t, g) => t + g.examples.length * Math.max(1, (g.states || []).filter((st) => (st.show || []).some((s) => s === 'question' || s === 'steps')).length), 0);
  ok('and every instance on the page comes through the one function — no group builds its own',
     spy.all > 0 && spy.marked === spy.all && spy.calls === spy.all && spy.all === authored,
     `${spy.marked} of ${spy.all} instances marked by ${spy.calls} calls (${authored} authored across groups and states)`);
  /* CONTROL: hand one group a static copy of its own markup and the count no longer agrees. */
  const forged = await p.evaluate((stdId) => {
    const origBody = mxWexGroupBody, origEx = mxWexEx; let n = 0;
    const copy = document.querySelector(`[data-mx-panel="${stdId}"] .mx-wexseq`).outerHTML;
    mxWexGroupBody = function (g) { return g.id === stdId ? copy : origBody.apply(this, arguments); };
    mxWexEx = function () { n++; return origEx.apply(this, arguments).replace('<article class="mx-wexex"', '<article data-mx-spy class="mx-wexex"'); };
    go(0);
    const all = document.querySelectorAll('.mx-wex [data-mx-example]').length, marked = document.querySelectorAll('.mx-wex [data-mx-spy]').length;
    mxWexGroupBody = origBody; mxWexEx = origEx; go(0);
    return { all, marked }; }, std.id);
  ok('CONTROL: a group that pastes its own markup is caught — the marks no longer cover the page',
     forged.all > forged.marked, `${forged.marked} of ${forged.all} marked once one group forges its example`);
  await p.close();
}
{
  /* NOTHING IS CENTRED, ANYWHERE. Every text block starts at its region's inset and every figure part
     sits at its zone's left edge — at a desktop width, on a phone, and at the width where GRAPH and
     INTERPRETATION have just stacked (a 1000px laptop with the rail open), where an inherited
     `margin:0 auto` once slid the plane 28px in. */
  const probe = (p) => p.evaluate(() => {
    const out = [];
    [].slice.call(document.querySelectorAll('[data-mx-panel]')).forEach((pane) => {
      document.querySelector(`[data-mx-tab="${pane.dataset.mxPanel}"]`).click();
      [].slice.call(pane.querySelectorAll('[data-mx-state]')).concat([null]).forEach((btn) => {
        if (btn) btn.click();
        const live = [].slice.call(pane.querySelectorAll('.mx-stpane')).filter((n) => !n.hidden)[0] || pane;
        const inset = (e) => { const s = getComputedStyle(e); return e.getBoundingClientRect().left + parseFloat(s.borderLeftWidth) + parseFloat(s.paddingLeft); };
        [].slice.call(live.querySelectorAll('.mx-wexask, .mx-wexwork, .mx-wexzone, .mx-wexfoot')).forEach((reg) => {
          const kids = [].slice.call(reg.children).filter((c) => c.getBoundingClientRect().height > 0 && !c.classList.contains('mx-wexpair') && !c.classList.contains('mx-wexmid'));
          kids.forEach((c) => out.push({ where: pane.dataset.mxPanel + (btn ? '/' + btn.dataset.mxState : ''), what: c.className.split(' ')[0] || c.tagName,
            off: Math.round(c.getBoundingClientRect().left - inset(reg)), align: getComputedStyle(c).textAlign })); });
        [].slice.call(live.querySelectorAll('.mx-wexzone .mx-part[data-mx-part="figure"], .mx-wexmid .mx-part[data-mx-part="figure"], .mx-wexaside .mx-part[data-mx-part="figure"]')).forEach((f) => {
          const zone = f.closest('.mx-wexzone, .mx-wexmid, .mx-wexaside');
          out.push({ where: pane.dataset.mxPanel + (btn ? '/' + btn.dataset.mxState : ''), what: 'figure', off: Math.round(f.getBoundingClientRect().left - inset(zone)), align: 'start' }); });
      });
    });
    return out; });
  const off = [];
  for (const [w, h, lesson, slide] of [[1536, 1024, FIX, WEX], [1000, 900, FIX, WEX], [414, 896, FIX, WEX], [1536, 1024, CFP, 0], [414, 896, CFP, 0]]) {
    const p = await open({ w, h, lesson, slide });
    (await probe(p)).forEach((o) => off.push(Object.assign({ w }, o)));
    await p.close();
  }
  const bad = off.filter((o) => Math.abs(o.off) > 1 || !/^(start|left)$/.test(o.align));
  ok('NOTHING IS CENTRED — every block starts at its region\'s inset and every plane at its zone\'s edge, at every width',
     off.length > 40 && off.some((o) => o.what === 'figure' && o.w === 1000) && bad.length === 0,
     bad.length ? bad.slice(0, 6).map((o) => `${o.w}px ${o.where} ${o.what} ${o.off}px ${o.align}`).join(' · ')
       : `${off.length} blocks and planes measured, none offset, none centred`);
  /* CONTROL: give the plane back its `margin:0 auto` at the width where the pair has stacked. */
  const pc = await open({ w: 1000, h: 900, slide: WEX });
  await pc.addStyleTag({ content: '.mx-wexpair .mx-part[data-mx-part="figure"]{margin:0 auto !important}' });
  const slid = (await probe(pc)).filter((o) => o.what === 'figure' && /g-solving|graph/.test(o.where));
  await pc.close();
  ok('CONTROL: an inherited auto margin slides the stacked plane in, and the measure sees it',
     slid.length > 0 && slid.some((o) => o.off > 10), slid.map((o) => `${o.where}: ${o.off}px`).join(' · '));
}
{
  /* COMPARISON — THREE ZONES: labels on one line, each zone the row's full height so its edges are the
     rules beside it EVEN WHEN THE CASES DIFFER IN HEIGHT (case B is given five more steps than the plane
     is tall for), each case one primitive in its stacked form, the plane at its natural size in the middle
     and left-aligned — never grown to consume the zone, never squeezed. */
  const zones = async (p) => p.evaluate((id) => {
    document.querySelector(`[data-mx-tab="${id}"]`).click();
    const pane = document.querySelector(`[data-mx-panel="${id}"]`), b = pane.querySelector('.mx-wexbridge');
    if (!b) return null;
    const R = (e) => e.getBoundingClientRect();
    const cs = getComputedStyle(document.querySelector('.mx-wex'));
    const zs = [].slice.call(b.querySelectorAll(':scope>.mx-wexzone')).map((z) => {
      const kids = [].slice.call(z.children).filter((c) => R(c).height > 0);
      const lab = z.querySelector(':scope>.mx-wexlab'), ex = z.querySelector('.mx-wexex'), s = getComputedStyle(z);
      const ask = ex && ex.querySelector('.mx-wexask'), work = ex && ex.querySelector('.mx-wexwork');
      const fig = z.querySelector('.mx-part[data-mx-part="figure"]');
      return { zone: z.dataset.mxZone, t: Math.round(R(z).top), h: Math.round(R(z).height), labT: lab ? Math.round(R(lab).top) : null,
        content: Math.round(Math.max.apply(null, kids.map((c) => R(c).bottom)) - R(z).top),
        bl: s.borderLeftWidth, br: s.borderRightWidth, exN: z.querySelectorAll('.mx-wexex').length,
        stackedForm: !!(ask && work) && Math.round(R(work).top) >= Math.round(R(ask).bottom) - 2,
        askToRule: ask ? (z.dataset.mxZone === 'a' ? Math.round(R(z).right - R(ask).right) : Math.round(R(ask).left - R(z).left)) : null,
        figW: fig ? Math.round(R(fig).width) : null, figOff: fig ? Math.round(R(fig).left - (R(z).left + parseFloat(s.borderLeftWidth) + parseFloat(s.paddingLeft))) : null }; });
    return { h: Math.round(R(b).height), zones: zs, plotW: parseInt(cs.getPropertyValue('--mx-plot-w'), 10) }; }, GROUPS.find((g) => g.type === 'comparison').id);
  const tallB = JSON.parse(JSON.stringify(FIX));
  const cg = tallB.slides[WEX].groups.find((g) => g.type === 'comparison');
  for (let i = 0; i < 5; i++) cg.examples[1].steps.push({ id: 'extra' + i, text: 'Check the value once more, the long way round.', math: '_y_ = (−3)(−3) = 9' });
  const p = await open({ slide: WEX, lesson: tallB });
  const z = await zones(p);
  const sc = (await readScales(p))[0];
  await p.close();
  const zA = z && z.zones[0], zV = z && z.zones[1], zB = z && z.zones[2];
  ok('THREE ZONES on one line, each the row\'s full height — the rules beside the plane run the full height even with a taller case',
     !!z && z.zones.length === 3 && zB.content > zV.content
     && z.zones.every((q) => q.t === zA.t && q.h === z.h && q.labT === zA.labT)
     && z.h === Math.max(zA.content, zV.content, zB.content) && zV.bl === '1px' && zV.br === '1px',
     z ? `zones ${z.zones.map((q) => `${q.zone} ${q.h}px (content ${q.content})`).join(' | ')}, bridge ${z.h}px; labels at ${z.zones.map((q) => q.labT).join('/')}` : 'no bridge');
  ok('each case is ONE primitive in its stacked form, its question band reaching the zone\'s rule',
     !!z && [zA, zB].every((q) => q.exN === 1 && q.stackedForm && q.askToRule === 0),
     z ? `case A: ${zA.exN} instance, band ${zA.askToRule}px from the rule · case B: ${zB.exN} instance, band ${zB.askToRule}px from the rule` : 'no bridge');
  ok('the plane owns the middle at its natural size — left-aligned, never grown past its natural width, undistorted',
     !!z && zV.figW != null && zV.figW <= z.plotW + 1 && zV.figOff === 0 && !!sc && Math.abs(sc.ratio - 1) <= 0.05,
     z ? `plane ${zV.figW}px wide (natural ${z.plotW}px), ${zV.figOff}px from the zone's edge, scale ${sc && sc.ratio}` : 'no bridge');
  /* CONTROL: stop the zones stretching and the rules end with the plane, above the taller case. */
  const pc = await open({ slide: WEX, lesson: tallB });
  await pc.addStyleTag({ content: '.mx-wexbridge{align-items:start !important}' });
  const zc = await zones(pc);
  await pc.close();
  ok('CONTROL: zones that stop stretching leave the rule shorter than the taller case, and the measure sees it',
     !!zc && zc.zones[1].h < zc.zones[2].content, zc ? `rule ${zc.zones[1].h}px against a ${zc.zones[2].content}px case` : 'no bridge');
  /* and at 1920 the plane still does not grow to fill the wider zone */
  const pw = await open({ w: 1920, h: 1100, slide: WEX });
  const zw = await zones(pw);
  await pw.close();
  ok('at 1920px the middle zone is wider than the plane needs, and the plane stays its natural size',
     !!zw && zw.zones[1].figW <= zw.plotW + 1, zw ? `${zw.zones[1].figW}px of a ${zw.zones[1].h}px-tall zone, natural ${zw.plotW}px` : 'no bridge');
}
{
  /* GRAPH | INTERPRETATION — two sibling regions with one top edge and one rule between them, decided by
     the composition's floors; stacked graph-first below them. */
  const pair = (p) => p.evaluate((id) => {
    document.querySelector(`[data-mx-tab="${id}"]`).click();
    const pane = document.querySelector(`[data-mx-panel="${id}"]`);
    const last = pane.querySelector('[data-mx-state]:last-child'); if (last) last.click();
    const live = [].slice.call(pane.querySelectorAll('.mx-stpane')).filter((n) => !n.hidden)[0] || pane;
    const foot = live.querySelector('.mx-wexfoot[data-mx-form="pair"]'); if (!foot) return null;
    const R = (e) => e.getBoundingClientRect();
    const cs = getComputedStyle(document.querySelector('.mx-wex'));
    const g = foot.querySelector('[data-mx-region="graph"]'), i = foot.querySelector('[data-mx-region="interpretation"]');
    const fig = g.querySelector('.mx-part[data-mx-part="figure"]'), lead = i.querySelector('.mx-wexres[data-mx-lead]');
    const lab = (z) => z.querySelector(':scope>.mx-wexlab, :scope>.mx-part>.mx-parth');
    return { foot: document.querySelector('.mx').dataset.mxFoot,
      g: { t: Math.round(R(g).top), b: Math.round(R(g).bottom), l: Math.round(R(g).left), w: Math.round(R(g).width), h: Math.round(R(g).height), labT: Math.round(R(lab(g)).top) },
      i: { t: Math.round(R(i).top), b: Math.round(R(i).bottom), l: Math.round(R(i).left), w: Math.round(R(i).width), h: Math.round(R(i).height), labT: Math.round(R(lab(i)).top), bl: getComputedStyle(i).borderLeftWidth },
      figW: Math.round(R(fig).width), figH: Math.round(R(fig).height), ar: parseFloat(getComputedStyle(fig).getPropertyValue('--mx-plot-ar')),
      leadRule: lead ? getComputedStyle(lead).borderTopWidth : null,
      plotW: parseInt(cs.getPropertyValue('--mx-plot-w'), 10), plotH: parseInt(cs.getPropertyValue('--mx-plot-h'), 10),
      interpMax: parseInt(cs.getPropertyValue('--mx-interp-max'), 10) }; }, GROUPS.find((g) => g.type === 'staged').id);
  await new Promise((r) => setTimeout(r, 0));
  const pd = await open({ slide: WEX }); await reveal(pd, GROUPS.find((g) => g.type === 'staged').id);
  const d = await pair(pd); await pd.close();
  ok('GRAPH and INTERPRETATION are sibling regions with one top edge, one rule the full height between them, the plane at its natural size and the interpretation at a reading measure',
     !!d && d.foot === 'pair' && d.g.t === d.i.t && d.g.labT === d.i.labT && d.i.l >= d.g.l + d.g.w - 1 && d.i.bl === '1px' && d.i.h === d.g.h
     && d.figW <= d.plotW + 1 && d.figW <= Math.round(d.plotH * d.ar) + 1 && d.i.w <= d.interpMax + 1 && d.leadRule === '0px',
     d ? `tops ${d.g.t}/${d.i.t}, labels ${d.g.labT}/${d.i.labT}, rule ${d.i.bl} over ${d.i.h}px beside a ${d.g.h}px graph region; plane ${d.figW}×${d.figH} (natural ≤ ${Math.round(d.plotH * d.ar)}), interpretation ${d.i.w}px (≤ ${d.interpMax})` : 'no pair');
  const pp = await open({ w: 414, h: 896, slide: WEX }); await reveal(pp, GROUPS.find((g) => g.type === 'staged').id);
  const m = await pair(pp); await pp.close();
  ok('below their floors the two stack, graph first, with no rule',
     !!m && m.foot === 'stack' && m.i.t >= m.g.b - 1 && m.i.bl === '0px' && m.g.l === m.i.l,
     m ? `414px: graph ${m.g.t}→${m.g.b}, interpretation from ${m.i.t}, rule ${m.i.bl}` : 'no pair');
  /* CONTROLS: centre the pair and the labels part; raise the plane's floor and the pair stacks at 1536. */
  const pc = await open({ slide: WEX });
  await pc.addStyleTag({ content: '.mx-wexpair{align-items:center !important}' });
  await reveal(pc, GROUPS.find((g) => g.type === 'staged').id);
  const c = await pair(pc); await pc.close();
  ok('CONTROL: centring the pair separates the labels, and the measure sees it',
     !!c && Math.abs(c.g.labT - c.i.labT) > 20, c ? `labels ${c.g.labT} and ${c.i.labT}` : 'no pair');
  const pf = await open({ slide: WEX });
  await pf.addStyleTag({ content: '.mx-wex{--mx-plot-min-w:900px !important}' });
  await pf.evaluate(() => mxResolveFit()); await pf.waitForTimeout(500);
  await reveal(pf, GROUPS.find((g) => g.type === 'staged').id);
  const f = await pair(pf); await pf.close();
  ok('CONTROL: the FLOOR decides the pair — raise the plane\'s floor and the same regions stack at 1536px',
     !!f && f.foot === 'stack' && f.i.t >= f.g.b - 1 && f.i.bl === '0px', f ? `data-mx-foot="${f.foot}", interpretation from ${f.i.t} under a graph ending at ${f.g.b}` : 'no pair');
}
{
  /* A STATE WITH NO QUESTION keeps the working at a reading measure, left-aligned; author the question
     back into that state and the split returns. */
  const ext = CFP.slides[0].groups.find((g) => g.type === 'extended');
  const st = ext.states.find((s) => s.show.indexOf('question') < 0);   /* the derivation's middle stage */
  const solo = async (lesson) => { const p = await open({ slide: 0, lesson });
    await p.click(`[data-mx-tab="${ext.id}"]`); await p.waitForTimeout(200);
    await p.click(`[data-mx-panel="${ext.id}"] [data-mx-state="${st.id}"]`); await p.waitForTimeout(400);
    const a = await anatomy(p); await p.close(); return a; };
  const a = await solo(CFP);
  const e = a.ex[0];
  ok('a state that carries no question has no ask region; its working keeps a reading measure at the inset, never the whole surface',
     !!e && e.form === 'solo' && !e.ask && e.work.r - e.work.l <= 621 && Math.abs(e.work.l - (a.surfL + a.surfPad)) <= 1,
     e ? `${e.id} ${e.form}: working ${e.work.r - e.work.l}px wide at ${e.work.l} (surface inset ${a.surfL + a.surfPad})` : 'no example');
  const withQ = JSON.parse(JSON.stringify(CFP));
  withQ.slides[0].groups.find((g) => g.id === ext.id).states.find((s) => s.id === st.id).show.push('question');
  const b = (await solo(withQ)).ex[0];
  ok('CONTROL: author the question into that state and the two-region form returns',
     !!b && b.form === '' && !!b.ask && b.ask.t === b.work.t && b.work.bl === '1px',
     b ? `${b.id}: question ${b.ask ? 'present' : 'absent'}, regions at ${b.ask && b.ask.t}/${b.work.t}, rule ${b.work.bl}` : 'no example');
}
// ══ the non-shipping composition proofs ════════════════════════════════════════════════════════
// sequence's parallel-row contract and extended both need shapes the shipping lesson does not author. A
// presentation type is not established because the renderer accepts its enum value.
mark('proofs');
{
  const CF = JSON.parse(fs.readFileSync(path.join(root, 'tests/visual/lessons/mathematics-compositions.json'), 'utf8'));
  const CG = CF.slides[0].groups;
  const three = CG.find((g) => g.type === 'sequence');
  const p = await open({ slide: 0, lesson: CF });
  const lay = await p.evaluate((id) => { document.querySelector(`[data-mx-tab="${id}"]`).click();
    const pane = document.querySelector(`[data-mx-panel="${id}"]`);
    const rows = [].slice.call(pane.querySelectorAll('.mx-wexex'))
      .map((e) => { const r = e.getBoundingClientRect();
        const a = e.querySelector('.mx-wexask').getBoundingClientRect();
        const w = e.querySelector('.mx-wexwork').getBoundingClientRect();
        return { l: Math.round(r.left), t: Math.round(r.top), w: Math.round(r.width),
          askW: Math.round(a.width), workW: Math.round(w.width),
          side: Math.round(w.left) >= Math.round(a.right) - 1 && w.top < a.bottom && a.top < w.bottom }; });
    const surf = pane.querySelector('.mx-wexsurface').getBoundingClientRect();
    return { rows, surfW: Math.round(surf.width), surfL: Math.round(surf.left),
      complete: [].slice.call(pane.querySelectorAll('.mx-wexex'))
        .every((e) => e.querySelector('.mx-wexqb') && e.querySelector('.mx-wexres') && e.querySelectorAll('.mx-step').length) }; },
    three.id);
  /* THREE EXAMPLES OF ONE SKILL ARE THREE PARALLEL ROWS. The rule this replaces made the third example a
     centred 2 + 1 remainder — a composition that told the reader the last one was a conclusion when the
     mathematics said it was a sibling. Equal status is measurable: one lane, one width, one split. */
  ok('A SEQUENCE IS PARALLEL ROWS OF EQUAL STATUS — no example is a conclusion because of where it sits',
     three.examples.length === 3 && lay.rows.length === 3
     && new Set(lay.rows.map((r) => r.l)).size === 1
     && new Set(lay.rows.map((r) => r.w)).size === 1
     && new Set(lay.rows.map((r) => r.askW)).size === 1
     && lay.rows.every((r) => r.side && r.workW > r.askW)
     && lay.rows[0].w >= lay.surfW - 2,
     lay.rows.map((r, k) => `#${k + 1} at (${r.l}, ${r.t}) ${r.askW}|${r.workW}`).join(' · ')
     + ` in a ${lay.surfW}px surface`);
  ok('and all three stay complete — prompt, steps and answer in every one',
     lay.complete, `${three.examples.length} complete examples in ${lay.rows.length} full-width rows`);
  const ext = CG.find((g) => g.type === 'extended');
  await reveal(p, ext.id);
  const e = await p.evaluate((id) => {
    const pane = document.querySelector(`[data-mx-panel="${id}"]`);
    const live = [].slice.call(pane.querySelectorAll('.mx-stpane')).filter((n) => !n.hidden)[0] || pane;
    const work = live.querySelector('.mx-wexwork');
    const inline = [].slice.call(live.querySelectorAll('.mx-step[data-mx-stepvis]'))
      .map((x) => ({ step: x.dataset.mxStep, h: Math.round(x.querySelector('.mx-stepvis .mx-part').getBoundingClientRect().height) }));
    return { rows: live.querySelectorAll('.mx-wexex').length, aside: !!live.querySelector('.mx-wexaside'),
      steps: pane.querySelectorAll('.mx-step').length, inline,
      measure: Math.round(work.getBoundingClientRect().width),
      surf: Math.round(pane.querySelector('.mx-wexsurface').getBoundingClientRect().width),
      answer: !!pane.querySelector('.mx-wexres') }; }, ext.id);
  /* EXTENDED IS ONE LONG DERIVATION, so it is one row: the ask states the problem on the left and the whole
     chain of reasoning runs down the working column at a reading measure — not prose spanning the surface,
     and not a companion column reserved beside it for a figure the example never authored. */
  ok('EXTENDED IS A REAL COMPOSITION — a reading-width derivation, not prose across the whole surface',
     e.rows === 1 && !e.aside && e.steps >= 5 && e.measure < e.surf * 0.75,
     `${e.steps} steps at a ${e.measure}px working measure inside a ${e.surf}px surface, no companion column`);
  ok('and its visual arrives inline at the step that earns it',
     e.inline.length > 0 && e.inline.every((x) => x.h > 100),
     e.inline.map((x) => `step ${x.step} carries a ${x.h}px figure`).join(' · '));
  await p.close();
}
{
  // The sequence contract holds on a narrow screen too, and nothing is lost by stacking the split.
  const CF = JSON.parse(fs.readFileSync(path.join(root, 'tests/visual/lessons/mathematics-compositions.json'), 'utf8'));
  const three = CF.slides[0].groups.find((g) => g.type === 'sequence');
  const p = await open({ w: 414, h: 896, slide: 0, lesson: CF });
  const nar = await p.evaluate((id) => { document.querySelector(`[data-mx-tab="${id}"]`).click();
    const pane = document.querySelector(`[data-mx-panel="${id}"]`);
    const rows = [].slice.call(pane.querySelectorAll('.mx-wexex'));
    return { lanes: new Set(rows.map((e) => Math.round(e.getBoundingClientRect().left))).size,
      n: rows.length,
      stacked: rows.every((e) => Math.round(e.querySelector('.mx-wexwork').getBoundingClientRect().top)
        > Math.round(e.querySelector('.mx-wexask').getBoundingClientRect().bottom) - 2),
      steps: pane.querySelectorAll('.mx-step').length,
      answers: pane.querySelectorAll('.mx-wexres').length }; }, three.id);
  ok('CONTROL: narrow, the split stacks and every example survives whole',
     nar.lanes === 1 && nar.stacked && nar.n === three.examples.length
     && nar.steps === three.examples.reduce((n, x) => n + x.steps.length, 0)
     && nar.answers === three.examples.length,
     `${nar.n} examples, ${nar.steps} steps, ${nar.answers} answers — ask above working in ${nar.lanes} lane`);
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
  const stripped = await p.evaluate((n) => { LESSON.slides[n].examples[0].parts =
      LESSON.slides[n].examples[0].parts.filter((q) => q.kind !== 'relations'); go(n);
    const e = document.querySelector('.mx-expane:not([hidden])');
    /* an SVG polyline legitimately has a box and no text — the claim is about reserved HTML REGIONS */
    const boxes = [].slice.call(e.querySelectorAll('*')).filter((n) => {
      if (n.namespaceURI !== 'http://www.w3.org/1999/xhtml' || n.closest('.mx-figstage')) return false;
      const r = n.getBoundingClientRect(); return r.width > 60 && r.height > 20 && !n.textContent.trim(); });
    return { rel: e.querySelectorAll('.mx-relations').length, empty: boxes.length }; }, NOTES);
  ok('CONTROL: remove it and no empty region is reserved in its place',
     stripped.rel === 0 && stripped.empty === 0,
     'no relations element, no empty box left behind');
  await p.close();
}
// ══ local states ══════════════════════════════════════════════════════════════════════════════
// Algebra and a substantial representation each deserve the whole surface. A state is a PRESENTATION
// partition of one example's content, so the content itself must survive being partitioned.
mark('states');
{
  const staged = GROUPS.filter((g) => Array.isArray(g.states) && g.states.length > 1);
  const p = await open({ slide: WEX });
  const seen = [];
  for (const g of staged) {
    await p.click(`[data-mx-tab="${g.id}"]`); await p.waitForTimeout(300);
    const per = [];
    for (const st of g.states) {
      await p.click(`[data-mx-panel="${g.id}"] [data-mx-state="${st.id}"]`); await p.waitForTimeout(400);
      per.push(await p.evaluate((id) => { const pane = document.querySelector(`[data-mx-panel="${id}"]`);
        const panes = [].slice.call(pane.querySelectorAll('.mx-stpane'));
        const live = panes.filter((n) => !n.hidden);
        const hiddenBoxes = panes.filter((n) => n.hidden)
          .filter((n) => n.getBoundingClientRect().height > 0).length;
        const L = live[0];
        return { id: L.dataset.mxStatepanel, shown: live.length, hiddenBoxes,
          examples: [].slice.call(L.querySelectorAll('[data-mx-example]')).map((x) => x.dataset.mxExample),
          q: L.querySelectorAll('[data-mx-sec="question"]').length,
          steps: L.querySelectorAll('.mx-step').length,
          a: L.querySelectorAll('[data-mx-sec="answer"]').length,
          /* a figure block also carries a HIDDEN focus panel with its own svg; the claim is about the
             drawing on screen, so only the painted ones are measured */
          fig: [].slice.call(L.querySelectorAll('.tp-fig-svg')).filter((n) => n.getBoundingClientRect().width > 0).length,
          figBox: [].slice.call(L.querySelectorAll('.tp-fig-svg'))
            .filter((n) => n.getBoundingClientRect().width > 0)
            .map((n) => Math.round(n.getBoundingClientRect().width)) }; }, g.id));
    }
    seen.push({ g, per });
  }
  ok('a staged group shows exactly one state at a time, and a hidden state reserves no layout space',
     seen.length > 0 && seen.every((x) => x.per.every((s) => s.shown === 1 && s.hiddenBoxes === 0)),
     seen.map((x) => `${x.g.id}: ${x.per.map((s) => s.id).join(' → ')}, no hidden box`).join(' · '));
  ok('THE EXAMPLE SURVIVES THE PARTITION — every authored step appears across the states, exactly once',
     seen.every((x) => {
       const want = x.g.examples.reduce((n, e) => n + e.steps.length, 0);
       return x.per.reduce((n, s) => n + s.steps, 0) === want; }),
     seen.map((x) => `${x.g.id}: ${x.per.map((s) => s.steps).join(' + ')} = `
       + x.g.examples.reduce((n, e) => n + e.steps.length, 0) + ' authored steps').join(' · '));
  /* THE PARTITION IS DECLARED, NOT INCIDENTAL. A section appears in exactly the states whose `show`
     names it — no more and no less. The answer legitimately appears twice in a staged graph check: once
     where the working ends, once as the algebraic result the picture is checked against. That is the
     state declaring `answer`, not the renderer duplicating anything, so the contract counts the
     DECLARATIONS rather than assuming one appearance per example. */
  const declared = (g, sec) => (g.states || []).filter((st) => (st.show || []).indexOf(sec) >= 0).length;
  ok('a section appears in exactly the states that declare it — never in every one by accident',
     seen.every((x) => {
       const ex = x.g.examples.filter((e) => e.prompt || e.question).length;
       const an = x.g.examples.filter((e) => e.answer || e.result).length;
       return x.per.reduce((n, s) => n + s.q, 0) === ex * declared(x.g, 'question')
         && x.per.reduce((n, s) => n + s.a, 0) === an * declared(x.g, 'answer'); }),
     seen.map((x) => `${x.g.id}: ${x.per.reduce((n, s) => n + s.q, 0)} question(s) in `
       + `${declared(x.g, 'question')} declaring state(s), ${x.per.reduce((n, s) => n + s.a, 0)} answer(s) in `
       + `${declared(x.g, 'answer')}`).join(' · '));
  /* CONTROL: the count follows the DECLARATION. Drop `answer` from the state that carries the visual and
     the algebraic result must leave the interpretation with it — otherwise the check above is counting a
     constant rather than reading the lesson. */
  {
    const q = await open({ slide: WEX });
    const drop = await q.evaluate(({ id, w }) => {
      const g = LESSON.slides[w].groups.find((x) => x.id === id);
      const st = (g.states || []).filter((s) => s.show.indexOf('visual') >= 0)[0];
      const before = st.show.slice();
      st.show = st.show.filter((s) => s !== 'answer'); go(w);
      document.querySelector(`[data-mx-tab="${id}"]`).click();
      const pane = document.querySelector(`[data-mx-panel="${id}"]`);
      const last = pane.querySelector('[data-mx-state]:last-child'); if (last) last.click();
      const live = [].slice.call(pane.querySelectorAll('.mx-stpane')).filter((n) => !n.hidden)[0];
      return { before: before.join('+'), leads: live.querySelectorAll('[data-mx-lead]').length };
    }, { id: staged[0].id, w: WEX });
    await q.close();
    ok('CONTROL: undeclare the answer and it leaves the interpretation, so the count is read not assumed',
       drop.leads === 0, `with show "${drop.before}" the interpretation leads with the algebraic result; `
       + 'without it, 0 lead blocks');
  }
  ok('A FIGURE REVEALED WITH ITS STATE IS RE-SOLVED — until then its stage measured zero',
     seen.every((x) => x.per.every((s) => s.figBox.every((w) => w >= 200))),
     seen.map((x) => `${x.g.id}: ${x.per.filter((s) => s.fig).map((s) => `${s.id} ${s.figBox.join('/')}px`).join(', ') || 'no figure state'}`).join(' · '));
  await p.close();
}
{
  /* CONTROL: the same example authored WITHOUT states renders every section on one surface — so the
     partition is the composition's doing and changes nothing about the content. */
  const p = await open({ slide: WEX });
  const flat = await p.evaluate(({ id, w }) => {
    const g = LESSON.slides[w].groups.find((x) => x.id === id);
    delete g.states; g.type = 'standard'; go(w);
    document.querySelector(`[data-mx-tab="${id}"]`).click();
    const pane = document.querySelector(`[data-mx-panel="${id}"]`);
    return { states: pane.querySelectorAll('[data-mx-state]').length,
      q: pane.querySelectorAll('[data-mx-sec="question"]').length,
      steps: pane.querySelectorAll('.mx-step').length,
      a: pane.querySelectorAll('[data-mx-sec="answer"]').length }; }, { id: GROUPS[1].id, w: WEX });
  const want = GROUPS[1].examples.reduce((n, e) => n + e.steps.length, 0);
  ok('CONTROL: drop the states and the same example renders whole on one surface',
     flat.states === 0 && flat.steps === want && flat.q === 1 && flat.a === 1,
     `no state bar, ${flat.steps} of ${want} steps, question and answer intact`);
  await p.close();
}
{
  /* THE COUNT NEVER CHANGES THE GEOMETRY. The rule this replaces gave 1, 2, 3 and 4 examples four different
     shapes — a centred column, two columns, a centred 2 + 1 remainder, a 2 × 2 block — so the page's
     arithmetic, not the mathematics, decided which example looked like a conclusion. A sequence is N rows
     of one skill at any N: same lane, same width, same ask/working split, every example whole. */
  const CF = JSON.parse(fs.readFileSync(path.join(root, 'tests/visual/lessons/mathematics-compositions.json'), 'utf8'));
  const base = CF.slides[0].groups.find((g) => g.type === 'sequence');
  const rows = [];
  for (const n of [1, 2, 3, 4]) {
    const alt = JSON.parse(JSON.stringify(CF));
    const g = alt.slides[0].groups.find((x) => x.id === base.id);
    const pool = base.examples;
    g.examples = Array.from({ length: n }, (_, k) => Object.assign({}, pool[k % pool.length], { id: 'c' + k }));
    const p = await open({ slide: 0, lesson: alt });
    await p.click(`[data-mx-tab="${g.id}"]`); await p.waitForTimeout(400);
    rows.push(await p.evaluate(({ id, n }) => {
      const pane = document.querySelector(`[data-mx-panel="${id}"]`);
      const cells = [].slice.call(pane.querySelectorAll('.mx-wexex'))
        .map((e) => { const r = e.getBoundingClientRect();
          const a = e.querySelector('.mx-wexask').getBoundingClientRect();
          const w = e.querySelector('.mx-wexwork').getBoundingClientRect();
          return { l: Math.round(r.left), t: Math.round(r.top), w: Math.round(r.width),
            askW: Math.round(a.width), side: Math.round(w.left) >= Math.round(a.right) - 1 && w.top < a.bottom && a.top < w.bottom }; });
      const sr = pane.querySelector('.mx-wexsurface').getBoundingClientRect();
      return { n, lanes: new Set(cells.map((c) => c.l)).size, rows: new Set(cells.map((c) => c.t)).size,
        w: cells[0].w, askW: cells[0].askW, setW: Math.round(sr.width),
        uniformW: new Set(cells.map((c) => c.w)).size === 1,
        uniformAsk: new Set(cells.map((c) => c.askW)).size === 1,
        side: cells.every((c) => c.side), complete: cells.length === n }; }, { id: g.id, n }));
    await p.close();
  }
  const by = (n) => rows.find((r) => r.n === n);
  ok('A SEQUENCE OF N IS N ROWS — one lane at every count, never a grid the count reshapes',
     rows.every((r) => r.lanes === 1 && r.rows === r.n && r.uniformW && r.uniformAsk && r.side),
     rows.map((r) => `${r.n} → ${r.rows} row${r.rows === 1 ? '' : 's'} in ${r.lanes} lane`).join(' · '));
  ok('and every count gives the SAME row geometry — the last example is never a remainder',
     new Set(rows.map((r) => r.w)).size === 1 && new Set(rows.map((r) => r.askW)).size === 1
     && by(1).w >= by(1).setW - 2,
     `${by(1).w}px rows split ${by(1).askW}px | ${by(1).w - by(1).askW}px at 1, 2, 3 and 4 examples`);
  ok('CONTROL: every count keeps every example whole — the composition never drops one',
     rows.every((r) => r.complete), rows.map((r) => `${r.n}→${r.n}`).join(' · '));
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
     await p.evaluate((w) => { LESSON.slides[w].groups[0].title = 'Putting values in';
       openWorksheet(); return /Putting values in/.test(document.querySelector('#wsSheet').textContent); }, WEX),
     'renaming a group reaches the worksheet with no renderer change');
  await p.close();
}
const SECTIONS = ['composition', 'viability', 'surface', 'examples', 'reference', 'scale', 'slots', 'primitive', 'proofs', 'states', 'flat'];
ok('every section ran', SECTIONS.every((s) => sections.has(s)), `${sections.size} sections`);
ok('no page error while rendering or switching', pageErrs.length === 0, pageErrs.slice(0, 2).join(' | ') || 'none');
await browser.close(); server.close();
console.log(`\n${pass}/${pass + fail} checks passed`);
process.exit(fail ? 1 : 0);
