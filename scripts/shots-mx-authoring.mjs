#!/usr/bin/env node
/* THE AUTHORING WORKFLOW, PHOTOGRAPHED — the editor as an author actually meets it.
   node scripts/shots-mx-authoring.mjs
   Boots a blank mathematics document, then drives the real palette, outline and fields, capturing each
   step. Same path as scripts/verify-mx-authoring.mjs asserts; this is what it looks like. */
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { fileURLToPath } from 'node:url'; import { chromium } from 'playwright';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(root, 'docs/atlas/authoring'); fs.mkdirSync(OUT, { recursive: true });
const MIME = { '.html':'text/html','.json':'application/json','.woff2':'font/woff2','.png':'image/png','.svg':'image/svg+xml' };
const APP = fs.readFileSync(path.join(root, 'lesson-studio.html'), 'utf8');
const BLANK = APP.replace(/(<script id="lesson-data" type="application\/json">)[\s\S]*?(<\/script>)/,
  `$1\n${JSON.stringify({ meta:{ title:'Quadratic relationships', theme:'mathematics' }, slides:[] }, null, 2)}\n$2`);
const server = http.createServer((q, r) => {
  const u = decodeURIComponent(q.url.split('?')[0]);
  if (u === '/authoring.html') { r.writeHead(200,{'Content-Type':'text/html'}); return r.end(BLANK); }
  const p = path.join(root, u === '/' ? '/lesson-studio.html' : u);
  if (!p.startsWith(root) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { r.writeHead(404); return r.end(); }
  r.writeHead(200,{'Content-Type':MIME[path.extname(p)]||'application/octet-stream'}); r.end(fs.readFileSync(p));
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const origin = `http://127.0.0.1:${server.address().port}`;
const b = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const p = await b.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 2 });
await p.goto(`${origin}/authoring.html`, { waitUntil: 'load' });
await p.evaluate(() => document.querySelector('#modeSeg [data-mode="edit"]').click());
await p.waitForTimeout(500);
/* every capture states the mode it was taken in, read off the page — a demonstration image whose mode is
   guessed from the picture is how "Study looks selected while the inspector is open" becomes a defect
   report about a screenshot rather than about the product */
const shot = async (n, label) => { await p.waitForTimeout(400);
  const m = await p.evaluate(() => ({ mode, on: ([].slice.call(document.querySelectorAll('#modeSeg button'))
    .find((b) => b.classList.contains('on')) || {}).dataset?.mode,
    inspector: (document.querySelector('#inspector') || {}).innerHTML ? 'open' : 'closed' }));
  await p.screenshot({ path: path.join(OUT, `AUTHOR-${n}.png`) });
  console.log(`  ${n.padEnd(11)} [mode=${m.mode} · segment=${m.on} · inspector ${m.inspector}]  ${label}`); };
console.log('the authoring workflow:');
await shot('1-empty', 'an empty mathematics lesson, Edit mode — the palette offers the page');
await p.click('#palette [data-ptype="workedExamples"]');
await shot('2-created', 'one click: a real workedExamples page, seeded and already painting');
const set = async (zone, label, value) => {
  await p.evaluate((z) => { selZone = z; renderSlide(); }, zone); await p.waitForTimeout(200);
  await p.evaluate(({ label, value }) => { const ins = document.querySelector('#inspector');
    const l = [].slice.call(ins.querySelectorAll('label')).find((x) => x.textContent.indexOf(label) === 0);
    const el = l && l.nextElementSibling; if (el) { el.value = value; el.dispatchEvent(new Event('input', { bubbles:true })); } }, { label, value });
  await p.waitForTimeout(250); };
await set('mx.g.0', 'Tab title', 'Substitution');
await set('mx.g.0', 'Lede', 'Three values of _x_, chosen because each one goes wrong in a different way.');
await shot('3-group', 'editing the group — the tab title lands in the page as you type');
await set('mx.e.0.0', 'Example title', 'A negative value');
await set('mx.e.0.0', 'Question', 'Use the rule _y_ = _x_^2 to find _y_ when _x_ = −4.');
await set('mx.e.0.0', 'Answer', '_y_ = 16, so (−4, 16) lies on the curve.');
await shot('4-example', 'the question and the answer');
await set('mx.s.0.0.0', 'What this step does', 'Substitute the given value. Keep the brackets — the whole of −4 is squared.');
await set('mx.s.0.0.0', 'Mathematics', '_y_ = (−4)^2');
await p.evaluate(() => { const bn = document.querySelector('[data-mxadd="s.0.0"]'); if (bn) bn.click(); });
await p.waitForTimeout(300);
await set('mx.s.0.0.1', 'What this step does', 'Evaluate. A negative multiplied by a negative gives a positive.');
await set('mx.s.0.0.1', 'Mathematics', '_y_ = (−4)(−4) = 16');
await shot('5-steps', 'two worked steps, the notation set as mathematics');
/* THE TABLE OF VALUES, built where it belongs — under the step whose substitution it tabulates.
   Stage 3C: added from the step's own palette, widened a column at a time, and filled cell by cell. */
const press = async (attr, val) => { await p.click(`#inspector [${attr}="${val}"]`); await p.waitForTimeout(140); };
const bind = async (path, value) => { await p.fill(`#inspector [data-bind="${path}"]`, String(value)); await p.waitForTimeout(60); };
await p.evaluate(() => { const bn = document.querySelector('[data-mxadd="s.0.0"]'); if (bn) bn.click(); });
await p.waitForTimeout(250);
await set('mx.s.0.0.2', 'What this step does', 'The same substitution, done once for each whole value.');
await p.evaluate(() => { selZone = 'mx.s.0.0.2'; renderSlide(); }); await p.waitForTimeout(200);
await press('data-mxadd', 'w.0.0.2.table');
const TB = 'slides.0.groups.0.examples.0.steps.2.visual.0';
const HEAD = ['−5', '−4', '−3', '−2', '−1', '0', '1', '2', '3', '4', '5'];
const CELLS = ['25', '16', '9', '4', '1', '0', '1', '4', '9', '16', '25'];
for (let c = 2; c < HEAD.length; c++) await press('data-mxcoladd', TB);
await bind(`${TB}.stub`, '_x_');
for (let c = 0; c < HEAD.length; c++) await bind(`${TB}.head.${c}`, HEAD[c]);
await bind(`${TB}.rows.0.label`, '_y_ = _x_^2');
for (let c = 0; c < CELLS.length; c++) await bind(`${TB}.rows.0.cells.${c}`, CELLS[c]);
await shot('6-table', 'the table of values: headings, corner cell and every value, all through the inspector');

/* THE GRAPH, and everything in it, built through the same outline — one object at a time. */
await p.evaluate(() => { selZone = 'mx.g.0'; renderSlide(); }); await p.waitForTimeout(200);
await press('data-mxadd', 'f.0');
const FB = 'slides.0.groups.0.relations.0.figure';
await bind(`${FB}.domain.xMin`, -6.5); await bind(`${FB}.domain.xMax`, 6.5);
await bind(`${FB}.domain.yMin`, -1); await bind(`${FB}.domain.yMax`, 11);
await p.evaluate(() => { selZone = 'mx.f.0'; renderSlide(); }); await p.waitForTimeout(200);
await press('data-mxadd', 'o.0.line');
await bind(`${FB}.objects.1.y`, 9); await bind(`${FB}.objects.1.label`, 'y = 9');
await p.evaluate(() => { selZone = 'mx.f.0'; renderSlide(); }); await p.waitForTimeout(200);
await press('data-mxadd', 'o.0.points');
await press('data-mxrowadd', `${FB}.objects.2`);
const PTS = [['(−3, 9)', -3, 9], ['(3, 9)', 3, 9]];
for (let r = 0; r < 2; r++) for (let c = 0; c < 3; c++) await bind(`${FB}.objects.2.rows.${r}.${c}`, PTS[r][c]);
await shot('7-graph', 'the graph: its function, reference line and marked points, all in the outline');
await p.evaluate(() => { selZone = 'mx.f.0'; renderSlide(); });
await shot('8-window', 'the window the graph is drawn in — and the shape decides the composition');

/* THE EXPLANATORY PROSE that closes the subtopic — a part like any other, from the group's own palette. */
await p.evaluate(() => { selZone = 'mx.g.0'; renderSlide(); }); await p.waitForTimeout(200);
await press('data-mxadd', 'p.0.relations');
await bind('slides.0.groups.0.relations.1.label', 'The same fact, on the curve');
await p.fill('#inspector [data-split="slides.0.groups.0.relations.1.items"]',
  ['The horizontal line _y_ = 9 meets _y_ = _x_^2 at exactly the two points the cases found: (−3, 9) and (3, 9).',
   'They sit at equal distances either side of the _y_-axis.'].join('\n'));
await p.waitForTimeout(200);
await shot('9-parts', 'prose, relationships, points and tables are one vocabulary — added anywhere a part can live');
await p.evaluate(() => { selZone = null; renderSlide(); });
await p.evaluate(() => document.querySelector('#modeSeg [data-mode="study"]').click());
await p.waitForTimeout(600);
await shot('10-study', 'the finished page in Study — table, graph and relationships, all authored here');
await b.close(); server.close();
console.log(`\nwrote ${path.relative(root, OUT)}`);
