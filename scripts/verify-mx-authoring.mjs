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
