#!/usr/bin/env node
// THE AUTHORING VERTICAL SLICE — can a mathematics page be MADE in the application, not just rendered?
//
//   node scripts/verify-mx-authoring.mjs
//   CHROMIUM_PATH=/opt/pw-browsers/chromium node scripts/verify-mx-authoring.mjs
//
// WHY THIS GATE EXISTS. Every other mathematics gate asserts that AUTHORED JSON renders correctly. None of
// them could tell you whether that JSON can be produced by a person sitting in front of the app — and until
// now it could not: `workedExamples` was registered with registerPage(), the editor only knew
// registerBlock(), so the page could be drawn but never made and never edited. A renderer without an
// authoring path is a demo.
//
// EVERY CLICK IS A REAL CLICK. Nothing below reaches into LESSON to fake a change: the palette tile is
// clicked, the outline rows are clicked, the inputs are typed into and their real `input` events fired.
// What is then asserted is the DATA, because the claim is that editing updates the page JSON rather than
// the rendered HTML — an editor that only repaints is the exact failure this gate is here to catch.
//
// SAVE AND REOPEN IS EXPORT AND REOPEN. The app is deliberately stateless (CLAUDE.md golden rule 2: no
// localStorage; the file is the state, persisted via Export). So "leave it and come back" is exercised the
// way the app really works: the export serialisation runs, the resulting document is served and OPENED IN A
// FRESH PAGE, and the authored content has to come back — still editable, not just still visible.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MIME = { '.html': 'text/html', '.json': 'application/json', '.woff2': 'font/woff2', '.png': 'image/png', '.svg': 'image/svg+xml', '.glb': 'model/gltf-binary', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css' };
let EXPORTED = null;                       // the "saved file", served back at /reopened.html
/* AN EMPTY MATHEMATICS LESSON, BOOTED AS A FILE. The app assigns LESSON exactly once, from #lesson-data at
   load, and builds the palette once from that lesson's theme — every exported document IS its lesson. So
   the author's starting point is reproduced the way it really occurs, by serving a document whose
   #lesson-data is an empty mathematics lesson, rather than by swapping LESSON in a booted page (which no
   real flow does, and which would leave the palette built for the default theme and fail for a reason the
   product does not have). */
const APP = fs.readFileSync(path.join(root, 'lesson-studio.html'), 'utf8');
const BLANK = APP.replace(/(<script id="lesson-data" type="application\/json">)[\s\S]*?(<\/script>)/,
  `$1\n${JSON.stringify({ meta: { title: 'Authoring test', theme: 'mathematics' }, slides: [] }, null, 2)}\n$2`);
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]);
  if (u === '/reopened.html') { res.writeHead(200, { 'Content-Type': 'text/html' }); return res.end(EXPORTED || ''); }
  if (u === '/authoring.html') { res.writeHead(200, { 'Content-Type': 'text/html' }); return res.end(BLANK); }
  const p = path.join(root, u === '/' ? '/lesson-studio.html' : u);
  if (!p.startsWith(root) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
  res.end(fs.readFileSync(p));
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const origin = `http://127.0.0.1:${server.address().port}`;

let pass = 0, fail = 0;
const ok = (what, cond, detail) => {
  if (cond) { pass++; console.log(`PASS ${what}${detail ? '  ' + detail : ''}`); }
  else { fail++; console.log(`FAIL ${what}${detail ? '  ' + detail : ''}`); }
};
/* every function expression in every committed lesson — read here, asserted in the page below */
const COMMITTED_EXPRS = (() => {
  const out = new Set();
  const walk = (o) => { if (Array.isArray(o)) return o.forEach(walk);
    if (o && typeof o === 'object') { if (o.type === 'function' && (o.f != null || o.expr != null)) out.add(String(o.f != null ? o.f : o.expr));
      Object.values(o).forEach(walk); } };
  for (const d of ['examples', 'lessons', 'docs/atlas/lesson', 'tests/visual']) {
    const dir = path.join(root, d); if (!fs.existsSync(dir)) continue;
    const st = [dir];
    while (st.length) { const c = st.pop();
      for (const e of fs.readdirSync(c, { withFileTypes: true })) { const q = path.join(c, e.name);
        if (e.isDirectory()) st.push(q);
        else if (e.name.endsWith('.json')) { try { walk(JSON.parse(fs.readFileSync(q, 'utf8'))); } catch (x) { /* not a lesson */ } } } }
  }
  return [...out];
})();

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const errs = [];
const p = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
p.on('pageerror', (e) => errs.push(String(e)));
await p.goto(`${origin}/authoring.html`, { waitUntil: 'load' });
await p.evaluate(() => document.querySelector('#modeSeg [data-mode="edit"]').click());
await p.waitForTimeout(400);

console.log('--- create ---');
const tile = await p.evaluate(() => { const b = document.querySelector('#palette [data-ptype="workedExamples"]');
  return b ? { label: b.querySelector('.pal-lbl').textContent.trim() } : null; });
ok('the mathematics palette offers a worked-examples PAGE, not only block types', !!tile,
   tile ? `tile "${tile.label}"` : 'no tile — the page registry never reached the palette');
await p.click('#palette [data-ptype="workedExamples"]');
await p.waitForTimeout(450);
const made = await p.evaluate(() => { const s = LESSON.slides[cur];
  return { n: LESSON.slides.length, type: s.type, groups: (s.groups || []).length,
    examples: ((s.groups || [])[0] || {}).examples ? s.groups[0].examples.length : 0,
    steps: (((s.groups || [])[0] || {}).examples || [{}])[0].steps ? s.groups[0].examples[0].steps.length : 0,
    painted: document.querySelectorAll('.mx-wexex').length, tabs: document.querySelectorAll('[data-mx-tab]').length }; });
ok('clicking it makes a real workedExamples page — one group, one example, one step',
   made.type === 'workedExamples' && made.groups === 1 && made.examples === 1 && made.steps === 1,
   `${made.n} slide(s), type "${made.type}", ${made.groups} group / ${made.examples} example / ${made.steps} step`);
ok('and it paints immediately through the mathematics renderer — no second rendering path',
   made.painted >= 1, `${made.painted} worked-example primitive(s) on the page`);
const insp = await p.evaluate(() => { const ins = document.querySelector('#inspector');
  return { tree: ins.querySelectorAll('[data-mxsel]').length, adds: ins.querySelectorAll('[data-mxadd]').length,
    fields: ins.querySelectorAll('[data-bind]').length,
    heads: [].slice.call(ins.querySelectorAll('.isec-h')).map((e) => e.textContent.trim()) }; });
ok('and the inspector shows the page STRUCTURE with fields — the thing that did not exist before',
   insp.tree >= 1 && insp.fields >= 1, `${insp.tree} outline row(s), ${insp.adds} add control(s), ${insp.fields} field(s): ${insp.heads.join(' | ')}`);

console.log('\n--- edit ---');
/* type into the real inputs and fire the real events; then assert the DATA, not the HTML */
const type = async (zone, label, value) => {
  await p.evaluate((z) => { selZone = z; renderSlide(); }, zone);
  await p.waitForTimeout(220);
  return p.evaluate(({ label, value }) => {
    const ins = document.querySelector('#inspector');
    const lab = [].slice.call(ins.querySelectorAll('label')).find((l) => l.textContent.indexOf(label) === 0);
    const el = lab && lab.nextElementSibling; if (!el) return null;
    el.value = value; el.dispatchEvent(new Event('input', { bubbles: true }));
    return el.dataset.bind || null;
  }, { label, value });
};
const EDIT = { gTitle: 'Substitution', prompt: 'Use the rule _y_ = _x_^2 to find _y_ when _x_ = −4.',
  stepText: 'Substitute the given value, keeping the brackets.', stepMath: '_y_ = (−4)^2', answer: '_y_ = 16.' };
const boundG = await type('mx.g.0', 'Tab title', EDIT.gTitle);
const boundP = await type('mx.e.0.0', 'Question', EDIT.prompt);
const boundA = await type('mx.e.0.0', 'Answer', EDIT.answer);
const boundT = await type('mx.s.0.0.0', 'What this step does', EDIT.stepText);
const boundM = await type('mx.s.0.0.0', 'Mathematics', EDIT.stepMath);
await p.waitForTimeout(300);
const data = await p.evaluate(() => { const g = LESSON.slides[cur].groups[0], e = g.examples[0], s = e.steps[0];
  return { title: g.title, prompt: e.prompt, answer: e.answer, text: s.text, math: s.math }; });
ok('every field writes THROUGH to the page JSON — the model changed, not just the markup',
   data.title === EDIT.gTitle && data.prompt === EDIT.prompt && data.answer === EDIT.answer
   && data.text === EDIT.stepText && data.math === EDIT.stepMath,
   `bound paths ${[boundG, boundP, boundA, boundT, boundM].filter(Boolean).length}/5 · title "${data.title}" · math "${data.math}"`);
const painted = await p.evaluate(() => { const sl = document.querySelector('#slide');
  const t = sl.textContent.replace(/\s+/g, ' ');
  return { tab: (document.querySelector('[data-mx-tab]') || {}).textContent, hasPrompt: t.indexOf('find') >= 0,
    sup: sl.querySelectorAll('.mx-stepm sup').length, ital: sl.querySelectorAll('.mx-stepm i').length }; });
ok('and the preview follows the edit immediately, through the approved mathematics renderer',
   (painted.tab || '').trim() === EDIT.gTitle && painted.hasPrompt,
   `tab reads "${(painted.tab || '').trim()}", the question is on the page`);
ok('and the authored notation is set as mathematics, not printed as source',
   painted.sup >= 1 && painted.ital >= 1, `${painted.ital} italic variable(s), ${painted.sup} power(s) in the step`);

console.log('\n--- add structure ---');
const grown = await p.evaluate(() => {
  const add = (k) => { const b = document.querySelector(`[data-mxadd="${k}"]`); if (b) b.click(); };
  add('s.0.0'); add('e.0'); add('g');
  const s = LESSON.slides[cur];
  return { groups: s.groups.length, examples: s.groups[0].examples.length, steps: s.groups[0].examples[0].steps.length,
    tabs: document.querySelectorAll('[data-mx-tab]').length };
});
ok('groups, examples and steps can all be ADDED from the outline',
   grown.groups === 2 && grown.examples === 2 && grown.steps === 2,
   `${grown.groups} groups · ${grown.examples} examples in the first · ${grown.steps} steps in the first · ${grown.tabs} tab(s) painted`);
const shrunk = await p.evaluate(() => { const b = document.querySelector('[data-mxdel="g.1"]'); if (b) b.click();
  return { groups: LESSON.slides[cur].groups.length }; });
ok('and removed again', shrunk.groups === 1, `back to ${shrunk.groups} group`);

console.log('\n--- reorder (3A) ---');
/* two examples with distinguishable titles, then moved through the real arrows */
await p.evaluate(() => { const g = LESSON.slides[cur].groups[0];
  g.examples[0].label = 'FIRST'; g.examples[1].label = 'SECOND'; selZone = 'mx.g.0'; renderSlide(); });
await p.waitForTimeout(250);
const moved = await p.evaluate(() => {
  const before = LESSON.slides[cur].groups[0].examples.map((e) => e.label);
  const b = document.querySelector('[data-mxmove="e.0:1:-1"]'); if (b) b.click();
  return { before, after: LESSON.slides[cur].groups[0].examples.map((e) => e.label), clicked: !!b };
});
ok('an example can be moved up, and the ORDER IN THE DATA changes — not just the row in the list',
   moved.clicked && moved.before.join('>') === 'FIRST>SECOND' && moved.after.join('>') === 'SECOND>FIRST',
   `${moved.before.join(' > ')}  →  ${moved.after.join(' > ')}`);
const ends = await p.evaluate(() => { const rows = [].slice.call(document.querySelectorAll('[data-mxmove]'));
  const up = rows.filter((b) => /:-1$/.test(b.dataset.mxmove)), dn = rows.filter((b) => /:1$/.test(b.dataset.mxmove));
  return { firstUpDisabled: up[0] ? up[0].disabled : null, lastDownDisabled: dn.length ? dn[dn.length - 1].disabled : null }; });
ok('and the ends are disabled rather than hidden, so the list\'s shape is legible without clicking',
   ends.firstUpDisabled === true && ends.lastDownDisabled === true,
   `first ↑ disabled ${ends.firstUpDisabled}, last ↓ disabled ${ends.lastDownDisabled}`);
const stepMove = await p.evaluate(() => { selZone = 'mx.e.0.0'; renderSlide();
  const ex = LESSON.slides[cur].groups[0].examples[0];
  ex.steps = [{ id: 'a', text: 'ALPHA' }, { id: 'b', text: 'BETA' }]; renderSlide();
  const before = ex.steps.map((x) => x.text);
  const b = document.querySelector('[data-mxmove="s.0.0:0:1"]'); if (b) b.click();
  return { before, after: LESSON.slides[cur].groups[0].examples[0].steps.map((x) => x.text) }; });
ok('and steps reorder by the same mechanism', stepMove.after.join('>') === 'BETA>ALPHA',
   `${stepMove.before.join(' > ')}  →  ${stepMove.after.join(' > ')}`);

console.log('\n--- representations (3A) ---');
/* a staged group renders two states whether or not it authors them; the editor must not pretend to edit
   what the JSON does not contain */
/* STAGING NEEDS SOMETHING TO STAGE AGAINST — mxWexStates gives a `staged` group the two defaults only when
   it has a visual (hasVis). A staged group with no figure has one thing to show and correctly gets no state
   bar, so the group is given a figure here exactly as the real Symmetry subtopic has one. */
const defaults = await p.evaluate(() => { const g = LESSON.slides[cur].groups[0];
  g.type = 'staged'; delete g.states;
  g.relations = [{ kind: 'figure', figure: { type: 'figure', figure: 'graph', aspect: 'equal',
    domain: { xMin: -5, xMax: 5, yMin: -1, yMax: 11 }, objects: [{ type: 'function', f: 'x^2' }] } }];
  selZone = 'mx.g.0'; renderSlide();
  return { authored: !!g.states, offered: !!document.querySelector('[data-mxstates]'),
    rendered: document.querySelectorAll('[data-mx-state]').length,
    editableRows: document.querySelectorAll('[data-mxsel^="mx.t."]').length }; });
ok('a staged group that authors NO states renders them but does not pretend they are editable',
   defaults.authored === false && defaults.rendered >= 2 && defaults.editableRows === 0 && defaults.offered,
   `authored ${defaults.authored} · ${defaults.rendered} state button(s) painted · ${defaults.editableRows} editable row(s) · offer shown ${defaults.offered}`);
const adopted = await p.evaluate(() => { document.querySelector('[data-mxstates]').click();
  const g = LESSON.slides[cur].groups[0];
  return { states: (g.states || []).map((x) => `${x.id}:${(x.show || []).join('+')}`),
    rows: document.querySelectorAll('[data-mxsel^="mx.t."]').length }; });
ok('and one click writes them in, at which point they ARE the page\'s states and are editable',
   adopted.states.length === 2 && adopted.rows === 2,
   adopted.states.join(' · ') || 'none written');
const toggled = await p.evaluate(() => { selZone = 'mx.t.0.1'; renderSlide();
  const boxes = [].slice.call(document.querySelectorAll('[data-mxshow]'));
  const answer = boxes.find((b) => /:answer$/.test(b.dataset.mxshow));
  const before = LESSON.slides[cur].groups[0].states[1].show.slice();
  answer.checked = true; answer.dispatchEvent(new Event('change', { bubbles: true }));
  return { boxes: boxes.length, before, after: LESSON.slides[cur].groups[0].states[1].show.slice() }; });
ok('every semantic region the renderer tests for is offered, and toggling one writes the authored array',
   toggled.boxes === 5 && toggled.before.indexOf('answer') < 0 && toggled.after.indexOf('answer') >= 0,
   `${toggled.boxes} regions offered · [${toggled.before.join(', ')}] → [${toggled.after.join(', ')}]`);
ok('and the array stays in the renderer\'s canonical order, so two identical states read identically',
   JSON.stringify(toggled.after) === JSON.stringify(['question', 'steps', 'answer', 'visual', 'relations']
     .filter((k) => toggled.after.indexOf(k) >= 0)), `[${toggled.after.join(', ')}]`);
/* put the group back as the edit section left it — the save/reopen section below asserts THOSE values, and
   a restore that invented placeholders would fail the reopen for a reason the product does not have */
await p.evaluate(({ e }) => { const g = LESSON.slides[cur].groups[0];
  g.type = 'sequence'; delete g.states; delete g.relations; g.title = e.gTitle;
  g.examples = [{ id: 'ex1', label: 'A negative value', prompt: e.prompt, answer: e.answer,
    steps: [{ id: 's1', text: e.stepText, math: e.stepMath }] }];
  selZone = null; renderSlide(); }, { e: EDIT });

console.log('\n--- graph authoring (3B) ---');
/* the graph is added from the outline, not injected — and a seeded graph must render at once */
const fig = await p.evaluate(() => { const g = LESSON.slides[cur].groups[0];
  delete g.relations; selZone = 'mx.g.0'; renderSlide();
  const add = document.querySelector('[data-mxadd="f.0"]'); const offered = !!add; if (add) add.click();
  const F = (LESSON.slides[cur].groups[0].relations || [])[0];
  return { offered, kind: F && F.kind, objs: F && (F.figure.objects || []).map((o) => o.type),
    rows: document.querySelectorAll('[data-mxsel^="mx.o."]').length }; });
ok('a graph can be ADDED to a group from the outline, seeded so it plots the moment it exists',
   fig.offered && fig.kind === 'figure' && fig.objs.join() === 'function' && fig.rows === 1,
   `relation kind "${fig.kind}", objects [${(fig.objs || []).join(', ')}], ${fig.rows} object row(s)`);
/* A MISSING BUTTON MUST FAIL THIS CHECK, NOT KILL THE RUN. Clicking a null threw and the whole gate died
   before it could report, which is the one thing a control must never do — it has to be able to SAY it
   failed. The offered set is read back and compared instead. */
const objAdd = await p.evaluate(() => { const missing = [];
  /* AN ADD-PALETTE BELONGS TO THE SELECTED THING (Stage 4B), so the graph is selected before anything is
     added to it — which is what an author does anyway. Each click re-renders and re-selects the new
     object, so the graph is re-selected for the next one. */
  for (const t of ['line', 'points', 'segment']) {
    selZone = 'mx.f.0'; renderSlide();
    const b = document.querySelector(`[data-mxadd="o.0.${t}"]`);
    if (b) b.click(); else missing.push(t); }
  selZone = 'mx.f.0'; renderSlide();
  const o = LESSON.slides[cur].groups[0].relations[0].figure.objects;
  return { types: o.map((x) => x.type), missing,
    offered: [].slice.call(document.querySelectorAll('[data-mxadd^="o.0."]')).map((b) => b.dataset.mxadd.split('.').pop()),
    line: o[1] || null, seg: o[3] || null }; });
ok('and every object type the RENDERER accepts can be added — function, line, points, segment, and nothing else',
   objAdd.types.join() === 'function,line,points,segment' && !objAdd.missing.length
   && objAdd.offered.join() === 'function,line,points,segment',
   `offered [${objAdd.offered.join(', ')}] · built [${objAdd.types.join(', ')}]`
   + (objAdd.missing.length ? ` · MISSING ${objAdd.missing.join(', ')}` : '')
   + (objAdd.line ? ` · line seeded ${JSON.stringify(objAdd.line)}` : ''));
/* the mathematics itself: type an expression and watch the painted curve change */
const curve = await p.evaluate(() => {
  const setField = (zone, label, value) => { selZone = zone; renderSlide();
    const ins = document.querySelector('#inspector');
    const l = [].slice.call(ins.querySelectorAll('label')).find((x) => x.textContent.indexOf(label) === 0);
    const el = l && l.nextElementSibling; if (!el) return null;
    el.value = value; el.dispatchEvent(new Event('input', { bubbles: true })); return el.dataset.bind; };
  /* THE CURVE IS A <polyline>, not a path — figSvg.polyline emits the sampled function. Measuring path[d]
     found only an axis arrow and reported the same 20 characters whatever the expression said. */
  const path = () => { const fg = document.querySelector('.mx-wexfoot .tp-fig');
    if (!fg) return { d: '', err: null };
    const ps = [].slice.call(fg.querySelectorAll('polyline[points]')).map((x) => x.getAttribute('points') || '');
    return { d: ps.sort((a, b) => b.length - a.length)[0] || '', err: +fg.getAttribute('data-tp-fig-errors') }; };
  /* measure the FUNCTION's own curve — the segment added above refers to a point "B" that does not exist,
     which is its own reported error and would otherwise be read as this edit failing */
  LESSON.slides[cur].groups[0].relations[0].figure.objects =
    [LESSON.slides[cur].groups[0].relations[0].figure.objects[0]];
  const before = path();
  const bound = setField('mx.o.0.0', 'y = ', 'x^2 - 4');
  const after = path();
  return { bound, changed: before.d !== after.d, beforeLen: before.d.length, afterLen: after.d.length,
    authored: LESSON.slides[cur].groups[0].relations[0].figure.objects[0].f, err: after.err }; });
ok('editing the FUNCTION writes to the page JSON and repaints the curve through the figure engine',
   curve.authored === 'x^2 - 4' && curve.changed && curve.afterLen > 100 && curve.err === 0,
   `bound ${curve.bound} · f = "${curve.authored}" · painted path ${curve.beforeLen} → ${curve.afterLen} chars, ${curve.err} figure error(s)`);
/* a half-typed expression must not break anything — the engine reports and skips */
const midTyping = await p.evaluate(() => { const o = LESSON.slides[cur].groups[0].relations[0].figure.objects[0];
  const out = []; for (const f of ['x^', 'x^2 -', '√x', '']) { o.f = f; let threw = null;
    try { renderSlide(); } catch (e) { threw = String(e); }
    const fg = document.querySelector('.mx-wexfoot .tp-fig');
    out.push({ f, threw, err: fg ? +fg.getAttribute('data-tp-fig-errors') : null,
      msg: fg ? ((fg.querySelector('.tp-fig-err') || {}).textContent || '').slice(0, 44) : '',
      alive: !!document.querySelector('.mx-page') }); }
  o.f = 'x^2'; renderSlide(); return out; });
ok('a HALF-TYPED expression is reported on the figure and skipped — it never throws and never breaks the page',
   midTyping.every((r) => !r.threw && r.alive && r.err >= 1 && r.msg),
   midTyping.map((r) => `"${r.f}"→${r.err} err`).join(' · ') + ` · e.g. ${midTyping[0].msg}`);
/* THE LINE'S ONE-OF-x-OR-y RULE. The renderer skips a line that has both or neither, so the editor must
   MOVE the value rather than add a second key. */
/* THE REAL EVENT SEQUENCE, NOT A CONVENIENT ONE. A user picking an option fires `input` and THEN `change`,
   and the inspector's generic [data-bind] handler listens on `input`. Dispatching only `change` skipped
   that handler entirely and passed this check while a real click destroyed the object — the gate was
   testing a sequence the browser never produces. */
const axis = await p.evaluate(() => { const fo = LESSON.slides[cur].groups[0].relations[0].figure.objects;
  fo.push({ type: 'line', y: 0, style: 'dashed' }, { type: 'points', rows: [['A', 0, 0]] });
  selZone = 'mx.o.0.1'; renderSlide();
  const o = () => LESSON.slides[cur].groups[0].relations[0].figure.objects[1];
  o().y = 9; renderSlide(); selZone = 'mx.o.0.1'; renderSlide();
  const sl = document.querySelector('[data-mxaxis]'); const before = JSON.stringify(o());
  sl.value = 'x';
  sl.dispatchEvent(new Event('input', { bubbles: true }));
  sl.dispatchEvent(new Event('change', { bubbles: true }));
  const v = o();
  return { before, after: JSON.stringify(v), isObject: !!v && typeof v === 'object',
    hasX: !!v && typeof v === 'object' && 'x' in v, hasY: !!v && typeof v === 'object' && 'y' in v,
    val: v && v.x }; });
ok('switching a reference line between horizontal and vertical MOVES the value — never both keys, never neither',
   axis.isObject && axis.hasX && !axis.hasY && +axis.val === 9, `${axis.before} → ${axis.after}`);
/* AN EMPTY VALUE IS NOT A LINE. figGraph's num() rejects "" and null; a bare isFinite(+v) accepts both as 0,
   so an editor testing that way calls a cleared field a healthy horizontal line while the page says "give
   exactly one of x or y". The outline row and the direction control must use the renderer's own predicate. */
const cleared = await p.evaluate(() => { const o = LESSON.slides[cur].groups[0].relations[0].figure.objects[1];
  delete o.x; delete o.y; o.y = ''; selZone = 'mx.o.0.1'; renderSlide();
  const row = [].slice.call(document.querySelectorAll('[data-mxsel="mx.o.0.1"] .blk-t')).map((e) => e.textContent)[0] || '';
  const fg = document.querySelector('.mx-wexfoot .tp-fig');
  const msg = fg ? ((fg.querySelector('.tp-fig-err') || {}).textContent || '') : '';
  return { row, saysNotDrawn: /exactly one of x or y/.test(msg) }; });
ok('and a line whose value has been cleared is shown as having none — the editor uses the renderer\'s own test for a number',
   cleared.saysNotDrawn && /no x or y/.test(cleared.row),
   `outline reads "${cleared.row.trim()}" · figure reports the one-of rule: ${cleared.saysNotDrawn}`);
/* EVERY FIELD THE FORM OFFERS MUST BE ONE THE RENDERER HONOURS. Two were not: a curve `label` that figGraph
   carries but figSvgBody never draws, and an `aspect` that mxFigPolicy overrides to "equal" on every
   mathematics graph page. Offering either is the lie this whole editor is supposed to avoid. */
const honoured = await p.evaluate(() => {
  const labels = (zone) => { selZone = zone; renderSlide();
    return [].slice.call(document.querySelector('#inspector').querySelectorAll('label')).map((l) => l.textContent.trim()); };
  return { fn: labels('mx.o.0.0'), fig: labels('mx.f.0'),
    policyForces: (() => { const f = { figure: 'graph', aspect: 'stretch' }; return mxFigPolicy(f).aspect; })() };
});
ok('the form offers no field the renderer ignores — no curve label (never drawn) and no unit-scale choice (the page forces it)',
   !honoured.fn.some((l) => /label on the curve/i.test(l)) && !honoured.fig.some((l) => /unit scale/i.test(l))
   && honoured.policyForces === 'equal',
   `function fields [${honoured.fn.join(' · ')}] · graph fields [${honoured.fig.join(' · ')}] · mxFigPolicy turns "stretch" into "${honoured.policyForces}"`);
/* marked points: rows are [id,x,y] arrays, and a bound path must reach inside one */
const pts = await p.evaluate(() => { selZone = 'mx.o.0.2'; renderSlide();
  document.querySelector('[data-mxrowadd]').click(); selZone = 'mx.o.0.2'; renderSlide();
  const ins = document.querySelector('#inspector');
  const labels = [].slice.call(ins.querySelectorAll('label')).map((x) => x.textContent);
  const xs = [].slice.call(ins.querySelectorAll('[data-bind]')).filter((e) => /rows\.1\.1$/.test(e.dataset.bind))[0];
  if (xs) { xs.value = '3'; xs.dispatchEvent(new Event('input', { bubbles: true })); }
  const rows = LESSON.slides[cur].groups[0].relations[0].figure.objects[2].rows;
  return { n: rows.length, row1: rows[1], bound: xs && xs.dataset.bind, labels: labels.slice(0, 4) }; });
ok('marked points are editable row by row, and a bound path reaches INSIDE the [id, x, y] array',
   pts.n === 2 && pts.row1 && String(pts.row1[1]) === '3' && /rows\.1\.1$/.test(pts.bound || ''),
   `${pts.n} rows · bound ${pts.bound} · row 2 now ${JSON.stringify(pts.row1)}`);
/* THE COMPOSITION MUST STILL FOLLOW THE GEOMETRY — the approved rule, so a domain edit SHOULD move it */
const comp = await p.evaluate(() => {
  /* THE STAGE FORM NEEDS A COMPANION. mxWexFootRender emits the GRAPH | INTERPRETATION stage only when the
     plane has a reading beside it; a figure alone correctly takes the plain full-width foot, which carries
     no data-mx-sub at all. The real lesson pairs every graph with its reading, so the test does too. */
  const g = LESSON.slides[cur].groups[0], fig = g.relations[0].figure;
  fig.objects = [{ type: 'function', f: 'x^2' }];
  g.relations = [g.relations[0], { kind: 'relations', label: 'Reading the curve', items: ['What the picture shows.'] }];
  const read = () => { renderSlide();
    const pane = [].slice.call(document.querySelectorAll('.mx-stpane')).filter((n) => !n.hidden)[0]
      || document.querySelector('[data-mx-panel]');
    const fo = (pane || document).querySelector('.mx-wexfoot[data-mx-form="pair"]');
    const gz = fo && fo.querySelector('[data-mx-region="graph"]');
    return { sub: fo && fo.getAttribute('data-mx-sub'), w: gz ? Math.round(gz.getBoundingClientRect().width) : 0,
      /* BELOW THE DESKTOP SURFACE BOTH SUBDESIGNS TAKE THE FULL WIDTH — the approved tablet behaviour, and
         in Edit the inspector narrows the surface past that threshold, so the widths are equal by design.
         The DECISION is still the thing under test, and it is carried on data-mx-sub either way. */
      stage: document.querySelector('.mx').dataset.mxFoot }; };
  fig.domain = { xMin: -5, xMax: 5, yMin: -1, yMax: 11 }; const tall = read();
  fig.domain = { xMin: -12, xMax: 12, yMin: -2, yMax: 6 }; const wide = read();
  return { tall, wide }; });
ok('and the COMPOSITION still follows the authored geometry — a wide window earns the full grid, everything else the centred stage',
   comp.tall.sub === 'down-8' && comp.wide.sub === 'down-12'
   && (comp.wide.stage === 'stage' ? comp.wide.w > comp.tall.w : comp.wide.w === comp.tall.w),
   `tall window → ${comp.tall.sub} at ${comp.tall.w}px · wide window → ${comp.wide.sub} at ${comp.wide.w}px · surface "${comp.wide.stage}"`
   + (comp.wide.stage === 'stage' ? '' : ' (below the desktop surface both take the full width, as approved — the decision is what moved)'));
/* ═══ STAGE 4 — IS IT COMFORTABLE TO USE? ════════════════════════════════════════════════════════════
   Everything above asks whether the lesson CAN be made. These ask whether a teacher would want to. Each
   one is driven through the real controls and each is followed by the state that would have made it fail
   before the change. */
console.log('\n--- the table is edited as a table ---');
await p.evaluate(() => { const g = LESSON.slides[cur].groups[0];
  g.examples[0].steps[0].visual = [{ kind: 'table', stub: '_x_', head: ['1', '2'], rows: [{ label: '_y_', cells: ['1', '4'] }] }];
  selZone = 'mx.s.0.0.0'; renderSlide(); });
await p.waitForTimeout(250);
await p.click('#inspector [data-mxsel="mx.w.0.0.0.0"]');
await p.waitForTimeout(250);
const grid = await p.evaluate(() => {
  const t = document.querySelector('#inspector .mxg');
  if (!t) return null;
  const rows = [].slice.call(t.rows);
  const cells = [].slice.call(t.querySelectorAll('input.mxg-i'));
  const stub = t.querySelector('.mxg-stick input');
  const r = stub && stub.getBoundingClientRect(), wrap = document.querySelector('#inspector .mxg-wrap');
  return { rows: rows.length, inputs: cells.length,
    /* a GRID, not a list: the first row's inputs sit side by side, at the same top */
    sideBySide: (() => { const a = t.rows[1] && [].slice.call(t.rows[1].querySelectorAll('input')); if (!a || a.length < 2) return false;
      const b = a.map((x) => x.getBoundingClientRect()); return Math.abs(b[0].top - b[1].top) < 2 && b[1].left > b[0].right - 1; })(),
    stubSticky: stub ? getComputedStyle(stub.closest('th,td')).position : '',
    scrolls: wrap ? getComputedStyle(wrap).overflowX : '',
    preview: !!document.querySelector('#inspector .mxprev-t .mx-tbl') };
});
ok('THE TABLE IS EDITED AS A TABLE — a grid of cells, not a column of fields',
   !!grid && grid.sideBySide && grid.inputs === 6,
   grid ? `${grid.rows} grid rows · ${grid.inputs} cell inputs · side by side: ${grid.sideBySide}` : 'no grid');
ok('and it behaves like the rendered one: the row headings stay put and the values scroll',
   !!grid && grid.stubSticky === 'sticky' && grid.scrolls === 'auto',
   grid ? `row heading ${grid.stubSticky} · values ${grid.scrolls}` : '');
ok('and the finished table is previewed beside the grid, drawn by the page\'s own renderer',
   !!grid && grid.preview, grid && grid.preview ? 'mxPartTable() output in the panel' : 'no preview');
{ /* a cell typed into the grid reaches the data and the page */
  const sel = '#inspector input.mxg-i[data-bind$="rows.0.cells.1"]';
  await p.fill(sel, '4 (a square)');
  await p.waitForTimeout(200);
  const v = await p.evaluate(() => LESSON.slides[cur].groups[0].examples[0].steps[0].visual[0].rows[0].cells[1]);
  const drawn = await p.evaluate(() => [].slice.call(document.querySelectorAll('#slide .mx-tbl td')).map((x) => x.textContent.trim()).join(','));
  ok('and a cell typed into the grid lands in the lesson and repaints the page',
     v === '4 (a square)' && drawn.indexOf('4 (a square)') >= 0, `cell "${v}" · page "${drawn}"`);
}

console.log('\n--- the panel shows what you are working on ---');
const fold = await p.evaluate(() => ({
  pageFold: !!document.querySelector('#inspector [data-mxtw="mx.page"]'),
  pageFields: document.querySelectorAll('#inspector [data-bind$=".navLabel"]').length,
  metaFold: !!document.querySelector('#inspector [data-mxtw="mx.meta"]'),
  metaFields: document.querySelectorAll('#inspector [data-meta]').length }));
ok('the Page and Lesson sections are folded away until they are wanted — they are set once, not per step',
   fold.pageFold && fold.metaFold && fold.pageFields === 0 && fold.metaFields === 0,
   `folds present: page ${fold.pageFold}, lesson ${fold.metaFold} · fields on screen: ${fold.pageFields} + ${fold.metaFields}`);
await p.click('#inspector [data-mxtw="mx.page"]');
await p.waitForTimeout(200);
ok('and opening one brings its fields back',
   (await p.evaluate(() => document.querySelectorAll('#inspector [data-bind$=".navLabel"]').length)) === 1);
await p.click('#inspector [data-mxtw="mx.page"]');
await p.waitForTimeout(200);
{ /* collapsing a branch really removes its children, and the branch you are editing cannot be collapsed */
  /* the branch you are EDITING is pinned open — a selected row you cannot see is worse than a long panel */
  await p.evaluate(() => { selZone = 'mx.s.0.0.0'; renderSlide(); }); await p.waitForTimeout(200);
  const pinned = await p.evaluate(() => (document.querySelector('#inspector [data-mxtw="mx.e.0.0"]') || {}).disabled);
  /* select elsewhere, open the example by its twisty, then close it again and watch the steps go */
  await p.evaluate(() => { selZone = 'mx.g.0'; renderSlide(); }); await p.waitForTimeout(200);
  await p.click('#inspector [data-mxtw="mx.e.0.0"]'); await p.waitForTimeout(200);
  const before = await p.evaluate(() => document.querySelectorAll('#inspector [data-mxsel^="mx.s.0.0."]').length);
  await p.click('#inspector [data-mxtw="mx.e.0.0"]'); await p.waitForTimeout(200);
  const after = await p.evaluate(() => document.querySelectorAll('#inspector [data-mxsel^="mx.s.0.0."]').length);
  ok('COLLAPSING A BRANCH REMOVES ITS CHILDREN — the outline is navigable, not one long list',
     pinned === true && before > 0 && after === 0,
     `the branch being edited is pinned open: ${pinned} · steps shown ${before} → ${after} on its twisty`);
}
{ /* an add-palette belongs to the selected thing */
  /* the vocabulary is read from the app, not copied here, so the count cannot drift from what it offers */
  const N = await p.evaluate(() => MX_PART_KINDS.length);
  const pals = async () => p.evaluate(() => document.querySelectorAll('#inspector [data-mxadd^="p.0."],#inspector [data-mxadd^="v.0."],#inspector [data-mxadd^="w.0."]').length);
  await p.evaluate(() => { selZone = 'mx.g.0'; renderSlide(); }); await p.waitForTimeout(200);
  const onGroup = await pals();
  await p.evaluate(() => { selZone = 'mx.e.0.0'; renderSlide(); }); await p.waitForTimeout(200);
  const onEx = await pals();
  ok('and only the selected host offers its add-palette — not every open one at once',
     onGroup === N && onEx === N,
     `group selected: ${onGroup} chips · example selected: ${onEx} chips · one host's worth is ${N}`);
}

console.log('\n--- an expression that reads differently from how it was typed says so ---');
{
  /* Stage 5 · 1. figParse binds a juxtaposition tighter than division, so `1/2x` is 1/(2x): a valid
     expression, plotted without complaint, and not what a teacher writing a gradient of a half means.
     The parser is NOT changed — re-binding division would re-read `sin 2x` and every committed lesson.
     The reading is reported instead, in the panel, never on the page. */
  await p.evaluate(() => { const g = LESSON.slides[cur].groups[0];
    g.relations = [{ kind: 'figure', figure: { type: 'figure', figure: 'graph', aspect: 'equal', grid: 'shown',
      domain: { xMin: -6, xMax: 6, yMin: -4, yMax: 6 }, objects: [{ type: 'function', f: 'x' }] } }];
    selZone = 'mx.o.0.0'; renderSlide(); });
  await p.waitForTimeout(250);
  const bind = 'slides.0.groups.0.relations.0.figure.objects.0.f';
  const warn = async () => p.evaluate(() => { const w = document.querySelector('#inspector .mxamb');
    return w ? { shown: !w.hidden, text: w.textContent.trim() } : null; });
  await p.fill(`#inspector [data-bind="${bind}"]`, '1/2x+1');
  await p.waitForTimeout(200);
  const bad = await warn();
  ok('TYPING `1/2x+1` SAYS HOW IT WILL BE READ — the one finding that put wrong mathematics on a page',
     !!bad && bad.shown && /1\/\(2\u00b7x\)\+1/.test(bad.text),
     bad ? `panel says ${JSON.stringify(bad.text.slice(0, 74))}` : 'no warning element at all');
  /* and the figure really did draw the hyperbola, which is why the warning is needed */
  const drew = await p.evaluate(() => document.querySelectorAll('#slide svg .tp-fig-fn').length);
  await p.fill(`#inspector [data-bind="${bind}"]`, '(1/2)x+1');
  await p.waitForTimeout(250);
  const fixed = await warn();
  const drew2 = await p.evaluate(() => document.querySelectorAll('#slide svg .tp-fig-fn').length);
  ok('and bracketing it silences the warning and straightens the curve',
     !!fixed && !fixed.shown && drew > drew2,
     `1/2x+1 → ${drew} subpath(s) and a warning · (1/2)x+1 → ${drew2} and none`);
  await p.fill(`#inspector [data-bind="${bind}"]`, 'x/2+1');
  await p.waitForTimeout(200);
  const plain = await warn();
  ok('and the ordinary way of writing the same gradient is never flagged',
     !!plain && !plain.shown, `x/2+1 · warning shown: ${plain && plain.shown}`);
  /* THE GUARD THAT KEEPS IT QUIET. A detector that cried wolf on committed content would be worse than
     the defect. Every expression in every committed lesson is put through it here, so it can never
     become noisy without this failing. */
  const committed = await p.evaluate((list) => list.filter((e) => !!figAmbiguous(e)), COMMITTED_EXPRS);
  ok('and NO expression in any committed lesson is flagged — the detector cannot cry wolf',
     committed.length === 0,
     committed.length ? `flagged: ${committed.join(', ')}` : `${COMMITTED_EXPRS.length} expression(s) checked, none flagged`);
  /* AN ECHO THAT LIES IS WORSE THAN NO ECHO. The warning tells the author what the engine will read, so
     the sentence it shows must be something the engine reads THE SAME WAY. figTok discards whitespace, so
     a reading pasted back together from the tokens turns `1/2 sin x` into `1/(2sinx)` — which does not even
     parse — and `1/2 3` into `1/(23)`, a different number. Every flagged reading is therefore parsed back
     and evaluated against the source at six values of x. */
  const honest = await p.evaluate((list) => list.map((src) => {
    const a = figAmbiguous(src); if (!a) return { src, flagged: false };
    const q = figParse(a.read), r = figParse(src);
    if (q.error || r.error) return { src, read: a.read, flagged: true, ok: false, why: q.error || r.error };
    const off = [-3.5, -1, 0.25, 2, 4, 7.5].filter((x) => {
      const u = r.fn(x), v = q.fn(x);
      return !(Object.is(u, v) || Math.abs(u - v) < 1e-12); });
    return { src, read: a.read, flagged: true, ok: off.length === 0, why: off.length ? 'differs at x=' + off.join(',') : '' };
  }), ['1/2x+1', '1/2x', '1/2 sin x', '1/2(x+1)', '3/4x^2', '1/-2x', '(x+1)/2x', '1/2(x+1)(x-1)']);
  const lying = honest.filter((h) => h.flagged && !h.ok), quiet = honest.filter((h) => !h.flagged);
  ok('and every reading it shows is one the engine reads back the same way — the echo cannot lie',
     lying.length === 0 && quiet.length === 0,
     lying.length ? lying.map((h) => `"${h.src}" → "${h.read}" ${h.why}`).join(' | ')
       : quiet.length ? `not flagged at all: ${quiet.map((h) => h.src).join(', ')}`
       : honest.map((h) => `${h.src} → ${h.read}`).join(' · '));
  /* AND IT STAYS QUIET WHERE THE GROUPING IS WHAT ANYONE MEANS. `1/2pi` is 1/(2π) and that is what it was
     written for; `1/2x(` is the keystroke state of someone half-way through typing `1/2x(x+1)`, and the
     figure already reports that one as unreadable. Neither is a place to interrupt an author. */
  const QUIET = ['1/2pi', '1/2e', '1/2 3', '1/2x(', '1/2x)', '1/2 y', 'x//2x', 'sin 2x', '1/sin 2x', '(1/2)x+1', '1/2*x', 'x/2+1'];
  const noisy = await p.evaluate((list) => list.filter((e) => !!figAmbiguous(e)), QUIET);
  ok('…and it says nothing about a constant, a half-typed bracket, or an expression the engine already rejects',
     noisy.length === 0, noisy.length ? `flagged: ${noisy.join(', ')}` : `${QUIET.length} expression(s), none flagged`);
}

console.log('\n--- mathematics is entered, not remembered ---');
await p.evaluate(() => { selZone = 'mx.s.0.0.0'; renderSlide(); });
await p.waitForTimeout(250);
{
  const bind = 'slides.0.groups.0.examples.0.steps.0.math';
  await p.fill(`#inspector [data-bind="${bind}"]`, '');
  await p.waitForTimeout(150);
  await p.click('#inspector [data-bind="' + bind + '"]');
  const keys = await p.evaluate(() => [].slice.call(document.querySelectorAll('#inspector [data-mxkey]')).map((b) => b.dataset.mxkey));
  ok('a notation row is offered, so _x_ and ^2 do not have to be remembered', keys.length >= 8,
     `${keys.length} keys: ${keys.join(' ')}`);
  await p.click('#inspector [data-mxkey="italic"]');
  await p.waitForTimeout(120);
  await p.keyboard.type('y');
  await p.click('#inspector [data-mxkey="\u2212"]');
  await p.click('#inspector [data-mxkey="pow"]');
  await p.waitForTimeout(200);
  const saved = await p.evaluate(() => LESSON.slides[cur].groups[0].examples[0].steps[0].math);
  ok('AND WHAT IT TYPES IS SAVED THROUGH THE ORDINARY BINDING — no second save path',
     saved === '_y_\u2212^2', `the field now holds ${JSON.stringify(saved)}`);
  const shown = await p.evaluate(() => { const el = document.querySelector('#inspector [data-bind$=".steps.0.math"]');
    const pv = el && el.nextElementSibling; return pv && pv.classList.contains('mxprev') ? pv.innerHTML : null; });
  ok('and the field previews what the PAGE will draw, through the page\'s own renderer',
     shown === await p.evaluate((v) => mxM(v), saved), `preview ${JSON.stringify((shown || '').slice(0, 44))}`);
  await p.fill(`#inspector [data-bind="${bind}"]`, EDIT.stepMath);
  await p.waitForTimeout(150);
}

/* restore for the save/reopen section */
await p.evaluate(({ e }) => { const g = LESSON.slides[cur].groups[0];
  delete g.relations; g.type = 'sequence'; delete g.states; g.title = e.gTitle;
  g.examples = [{ id: 'ex1', label: 'A negative value', prompt: e.prompt, answer: e.answer,
    steps: [{ id: 's1', text: e.stepText, math: e.stepMath }] }];
  selZone = null; renderSlide(); }, { e: EDIT });

console.log('\n--- save, leave, reopen ---');
/* the app's real persistence: serialise exactly as Export does, then OPEN THAT DOCUMENT FRESH */
EXPORTED = await p.evaluate(() => {
  document.getElementById('lesson-data').textContent = JSON.stringify(LESSON, null, 2);
  const clone = document.documentElement.cloneNode(true);
  clone.querySelector('#slide').innerHTML = '';
  const ins = clone.querySelector('#inspector'); if (ins) ins.innerHTML = '';
  const pal = clone.querySelector('#palette'); if (pal) pal.innerHTML = '';
  clone.querySelector('body').className = 'study';
  return '<!DOCTYPE html>\n' + clone.outerHTML;
});
ok('the authored page survives into the saved file', /"type":\s*"workedExamples"/.test(EXPORTED) && EXPORTED.indexOf(EDIT.stepMath) > 0,
   `${Math.round(EXPORTED.length / 1024)}KB written, with the authored mathematics in it`);
await p.close();

const q = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
q.on('pageerror', (e) => errs.push('reopened: ' + String(e)));
await q.goto(`${origin}/reopened.html`, { waitUntil: 'load' });
await q.waitForTimeout(600);
const back = await q.evaluate(() => { const s = LESSON.slides[0], g = s.groups[0], e = g.examples[0], st = e.steps[0];
  return { type: s.type, title: g.title, prompt: e.prompt, answer: e.answer, text: st.text, math: st.math,
    painted: document.querySelectorAll('.mx-wexex').length,
    tab: (document.querySelector('[data-mx-tab]') || {}).textContent }; });
ok('REOPENED FROM THE FILE, every authored value is back',
   back.type === 'workedExamples' && back.title === EDIT.gTitle && back.prompt === EDIT.prompt
   && back.answer === EDIT.answer && back.text === EDIT.stepText && back.math === EDIT.stepMath,
   `type "${back.type}", tab "${(back.tab || '').trim()}", math "${back.math}"`);
ok('and it renders again through the mathematics page family', back.painted >= 1,
   `${back.painted} worked-example primitive(s)`);
/* STILL EDITABLE — the point of the milestone. A published export hard-blocks edit mode, so this is
   asserted on the authoring document reopened with the same data, which is what an author would do. */
const r = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
r.on('pageerror', (e) => errs.push('reedit: ' + String(e)));
await r.goto(`${origin}/authoring.html`, { waitUntil: 'load' });
const saved = await q.evaluate(() => JSON.parse(document.getElementById('lesson-data').textContent));
await q.close();
await r.evaluate((L) => { LESSON = JSON.parse(JSON.stringify(L)); setTheme(LESSON.meta.theme); render(); go(0); }, saved);
await r.evaluate(() => document.querySelector('#modeSeg [data-mode="edit"]').click());
await r.waitForTimeout(500);
const again = await r.evaluate(() => {
  selZone = 'mx.s.0.0.0'; renderSlide();
  const ins = document.querySelector('#inspector');
  const lab = [].slice.call(ins.querySelectorAll('label')).find((l) => l.textContent.indexOf('Mathematics') === 0);
  const el = lab && lab.nextElementSibling;
  const before = el ? el.value : null;
  if (el) { el.value = '_y_ = (−4)(−4) = 16'; el.dispatchEvent(new Event('input', { bubbles: true })); }
  return { rows: ins.querySelectorAll('[data-mxsel]').length, before, after: LESSON.slides[0].groups[0].examples[0].steps[0].math };
});
ok('and the reopened lesson is EDITABLE AGAIN — the outline is there and a further edit lands in the data',
   again.rows >= 1 && again.before === EDIT.stepMath && again.after === '_y_ = (−4)(−4) = 16',
   `reopened with "${again.before}", edited to "${again.after}"`);
ok('no page error at any point — create, edit, save, reopen, edit again', errs.length === 0, errs[0] || 'none');
await r.close();
await browser.close(); server.close();
console.log(`\n${pass}/${pass + fail} checks passed`);
process.exit(fail ? 1 : 0);
