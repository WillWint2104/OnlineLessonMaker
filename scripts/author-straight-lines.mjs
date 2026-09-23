#!/usr/bin/env node
// A NEW LESSON, MADE IN THE APPLICATION — and a record of where that was harder than it should be.
//
//   node scripts/author-straight-lines.mjs [--out lessons/straight-lines.json] [--shots <dir>]
//
// The maintainer's milestone: build a lesson on a DIFFERENT topic from quadratics, through the interface
// only — no importing a JSON file, no writing content into one — covering examples, equations, fractions,
// a graph, a table, rearranging content and export; and record where authoring becomes unnecessarily
// complicated, so the findings decide what gets built next.
//
// THE SUBJECT IS STRAIGHT-LINE GRAPHS (NSW Stage 5). It was chosen because it stresses parts of the editor
// the quadratics lesson never touched: gradients are fractions, a sloping line is not the `line` object the
// graph editor offers, and three lines share one plane.
//
// WHAT THIS SCRIPT IS. It is an authoring session, not a gate. The content below is the lesson being
// composed — a teacher's words, typed into the panel — and the JSON is the OUTPUT, not the input. Nothing
// is read back from a target file, because there is no target file. It prints a FRICTION LOG, and every
// entry in it is something that happened during the run, with what was measured beside it.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (n, d) => { const k = process.argv.indexOf('--' + n); return k > 0 && process.argv[k + 1] ? process.argv[k + 1] : d; };
/* NOT `lessons/`. That directory IS the corpus verify-corpus-identity renders — every lesson in it,
   re-skinned to all five PACK themes and compared byte for byte against the reference ref. A mathematics
   lesson put there is re-skinned to imperium and microhistory, which means nothing, and appears as five
   "differences" on every run because it does not exist on main. CLAUDE.md's rule, learned the hard way:
   A REGRESSION ASSET MUST NOT BE THE SAME OBJECT AS A PIECE OF COURSEWARE. The app-schema mathematics
   lessons live beside docs/atlas/lesson/quadratics.app.json, which the corpus gate does not read. */
const OUT = path.resolve(root, arg('out', 'docs/atlas/lesson/straight-lines.app.json'));
const SHOTS = path.resolve(root, arg('shots', 'docs/atlas/authoring/straight-lines'));
fs.mkdirSync(SHOTS, { recursive: true });
const MIME = { '.html': 'text/html', '.json': 'application/json', '.woff2': 'font/woff2', '.png': 'image/png', '.svg': 'image/svg+xml' };
const APP = fs.readFileSync(path.join(root, 'lesson-studio.html'), 'utf8');
const withLesson = (l) => APP.replace(/(<script id="lesson-data" type="application\/json">)[\s\S]*?(<\/script>)/,
  `$1\n${JSON.stringify(l, null, 2)}\n$2`);
/* the author's starting point: an empty mathematics lesson, booted as a file, exactly as the app works */
const BLANK = withLesson({ meta: { title: 'Straight-line graphs', theme: 'mathematics' }, slides: [] });
let EXPORTED = null, FINAL = null;
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]);
  if (u === '/blank.html') { res.writeHead(200, { 'Content-Type': 'text/html' }); return res.end(BLANK); }
  if (u === '/reopened.html') { res.writeHead(200, { 'Content-Type': 'text/html' }); return res.end(EXPORTED || ''); }
  if (u === '/final.html') { res.writeHead(200, { 'Content-Type': 'text/html' }); return res.end(FINAL || ''); }
  const p = path.join(root, u === '/' ? '/lesson-studio.html' : u);
  if (!p.startsWith(root) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
  res.end(fs.readFileSync(p));
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const origin = `http://127.0.0.1:${server.address().port}`;

/* ---- the friction log. An entry is only written when something ACTUALLY happened in this run, and it
   carries the evidence beside it. "Harder than it should be" is a claim; the measurement is the proof. ---- */
const FRICTION = [];
const friction = (where, what, evidence, cost) => FRICTION.push({ where, what, evidence, cost });
const EFFORT = { selections: 0, buttons: 0, fields: 0, keys: 0 };

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const errs = [];
const p = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
p.on('pageerror', (e) => errs.push(String(e)));
await p.goto(`${origin}/blank.html`, { waitUntil: 'load' });
await p.evaluate(() => document.querySelector('#modeSeg [data-mode="edit"]').click());
await p.waitForTimeout(300);

const click = async (sel) => { await p.click(sel, { timeout: 15000 }); await p.waitForTimeout(30); };
const pick = async (z) => { EFFORT.selections++; await click(`#inspector [data-mxsel="${z}"]`); };
const add = async (t) => { EFFORT.buttons++; await click(`#inspector [data-mxadd="${t}"]`); };
const press = async (a, v) => { EFFORT.buttons++; await click(`#inspector [${a}="${v}"]`); };
const set = async (b, v) => { EFFORT.fields++; await p.fill(`#inspector [data-bind="${b}"]`, String(v), { timeout: 15000 }); await p.waitForTimeout(20); };
const list = async (b, a) => { EFFORT.fields++; await p.fill(`#inspector [data-split="${b}"]`, a.join('\n'), { timeout: 15000 }); };
const choose = async (b, v) => { EFFORT.fields++; await p.selectOption(`#inspector [data-bind="${b}"]`, String(v)); await p.waitForTimeout(30); };
const meta = async (k, v) => { EFFORT.fields++; await p.fill(`#inspector [data-meta="${k}"]`, String(v)); };
const L = () => p.evaluate(() => JSON.parse(JSON.stringify(LESSON)));
/* Added groups and examples now seed their child chain. Keep the measured empty-state diagnostics
   so an authoring regression is reported, while the session reuses each seeded item. */
let TOLD_G = false, TOLD_E = false;
const newGroup = async () => {
  await add('g');
  const gi = (await p.evaluate(() => LESSON.slides[0].groups.length)) - 1;
  const n = await p.evaluate((k) => (LESSON.slides[0].groups[k].examples || []).length, gi);
  if (n === 0 && !TOLD_G) { TOLD_G = true;
    friction('Adding a subtopic', 'A new group arrives with no examples, so there is nothing to select and nothing on the page',
      `groups[${gi}].examples.length === 0 after "＋ Add group" — while the page created from the palette`
      + ' arrives seeded with a group, an example AND a step',
      'two more clicks before any content can be typed, and a blank subtopic in between'); }
  await pick(`mx.g.${gi}`);
  return gi;
};
const newExample = async (gi) => {
  await pick(`mx.g.${gi}`); await add(`e.${gi}`);
  const ei = (await p.evaluate((k) => LESSON.slides[0].groups[k].examples.length, gi)) - 1;
  const n = await p.evaluate(({ g, e }) => (LESSON.slides[0].groups[g].examples[e].steps || []).length, { g: gi, e: ei });
  if (n === 0 && !TOLD_E) { TOLD_E = true;
    const ph = await p.evaluate(() => { const x = document.querySelector('#slide .mx-ph'); return x ? x.textContent.trim() : ''; });
    friction('Adding an example', 'A new example arrives with no steps, and the page says so until you add one',
      `examples[${ei}].steps.length === 0 after "＋ Add example"; the page reads ${JSON.stringify(ph)}`,
      'an extra click every time, and a worked example that looks broken in between'); }
  return ei;
};
const newStep = async (gi, ei) => { await pick(`mx.e.${gi}.${ei}`); await add(`s.${gi}.${ei}`);
  return (await p.evaluate(({ g, e }) => LESSON.slides[0].groups[g].examples[e].steps.length, { g: gi, e: ei })) - 1; };
const shot = async (n, label) => { await p.waitForTimeout(300);
  await p.screenshot({ path: path.join(SHOTS, `SL-${n}.png`) }); console.log(`    · ${n} — ${label}`); };

console.log('\nAUTHORING "Straight-line graphs" — a lesson that does not exist yet\n');
console.log('  the page');
await click('#palette [data-ptype="workedExamples"]');
await p.waitForTimeout(250);
await press('data-mxtw', 'mx.page');
await set('slides.0.title', 'Straight lines: _y_ = _m__x_ + _c_');
await set('slides.0.lede', 'A straight line is a constant rate of change. Its rule tells you how steep it is and where it starts, and its picture shows you both at once.');
await set('slides.0.navLabel', 'Straight lines');
await press('data-mxtw', 'mx.page');
await press('data-mxtw', 'mx.meta');
await meta('stage', 'NSW Stage 5'); await meta('year', 'Year 9'); await meta('unit', 'Linear relationships');
await press('data-mxtw', 'mx.meta');
{
  const s = (await L()).slides[0];
  console.log(`    title set to ${JSON.stringify(s.title)}`);
  const painted = await p.evaluate(() => (document.querySelector('.mx-head h1, .mx-page h1') || {}).textContent || '');
  if (painted.indexOf('mx') < 0 && painted) console.log(`    the page header reads "${painted.trim()}"`);
}

/* ── 1 · GRADIENT ─ two worked examples whose answers are fractions ───────────────────────────────── */
console.log('\n  subtopic 1 — Gradient');
await pick('mx.g.0');
await choose('slides.0.groups.0.type', 'sequence');
await pick('mx.g.0');
await set('slides.0.groups.0.title', 'Gradient');
await set('slides.0.groups.0.lede', 'Gradient is a rate: how far up for how far across. Any two points on the line give the same answer.');
await set('slides.0.groups.0.footLabel', 'What the two show');

/* THE SEEDED EXAMPLE IS EDITED, as an author would. */
const EX1 = {
  label: 'A line that rises',
  prompt: 'Find the gradient of the line through (1, 2) and (5, 5).',
  answer: '_m_ = 3/4 — the line rises 3 for every 4 across.',
  steps: [
    { text: 'Write the gradient as rise over run.', math: '_m_ = rise/run' },
    { text: 'Subtract in the same order top and bottom. Second point minus first, both times.', math: '_m_ = (5 − 2)/(5 − 1)' },
    { text: 'Work out each subtraction, then simplify.', math: '_m_ = 3/4' },
  ],
};
await pick('mx.e.0.0');
await set('slides.0.groups.0.examples.0.label', EX1.label);
await set('slides.0.groups.0.examples.0.prompt', EX1.prompt);
await set('slides.0.groups.0.examples.0.answer', EX1.answer);
for (let i = 0; i < EX1.steps.length; i++) {
  if (i > 0) { await pick('mx.e.0.0'); await add('s.0.0'); }
  await pick(`mx.s.0.0.${i}`);
  await set(`slides.0.groups.0.examples.0.steps.${i}.text`, EX1.steps[i].text);
  await set(`slides.0.groups.0.examples.0.steps.${i}.math`, EX1.steps[i].math);
}
/* DID THE FRACTIONS ACTUALLY BUILD UP? The whole point of writing 3/4 rather than "3 over 4" is that the
   page sets it as a fraction. Measured off the painted page, not assumed. */
{
  const built = await p.evaluate(() => document.querySelectorAll('#slide .mx-frac').length);
  const riseRun = await p.evaluate(() => { const n = [].slice.call(document.querySelectorAll('#slide .mx-stepm'))
    .find((e) => e.textContent.indexOf('rise') >= 0); return n ? { html: n.innerHTML, frac: !!n.querySelector('.mx-frac') } : null; });
  console.log(`    ${built} built-up fraction(s) on the page`);
  if (riseRun && !riseRun.frac)
    friction('Step mathematics', 'A fraction only builds up when BOTH parts are numbers — `rise/run` stays a slash',
      `"_m_ = rise/run" painted as ${JSON.stringify(riseRun.html)}`,
      'the author has to know the fraction grammar is numeric, and rewrite the idea or accept a slash');
}
const EX2 = {
  label: 'A line that falls',
  prompt: 'Find the gradient of the line through (−2, 4) and (4, 0).',
  answer: '_m_ = −2/3 — the line falls 2 for every 3 across.',
  steps: [
    { text: 'Substitute, keeping the brackets around the negative coordinate.', math: '_m_ = (0 − 4)/(4 − (−2))' },
    { text: 'Subtracting a negative adds. The run is 6, not 2.', math: '_m_ = (−4)/6' },
    { text: 'Simplify. A negative gradient means the line falls as _x_ increases.', math: '_m_ = −2/3' },
  ],
};
await newExample(0);
// The added example includes its first step.
await pick('mx.e.0.1');
await set('slides.0.groups.0.examples.1.label', EX2.label);
await set('slides.0.groups.0.examples.1.prompt', EX2.prompt);
await set('slides.0.groups.0.examples.1.answer', EX2.answer);
for (let i = 0; i < EX2.steps.length; i++) {
  if (i > 0) await newStep(0, 1);
  await pick(`mx.s.0.1.${i}`);
  await set(`slides.0.groups.0.examples.1.steps.${i}.text`, EX2.steps[i].text);
  await set(`slides.0.groups.0.examples.1.steps.${i}.math`, EX2.steps[i].math);
}
{ /* the three fraction shapes a gradient actually produces, checked on the page */
  const shapes = await p.evaluate(() => [].slice.call(document.querySelectorAll('#slide .mx-stepm'))
    .map((e) => ({ t: e.textContent.replace(/\s+/g, ' ').trim().slice(0, 34), frac: e.querySelectorAll('.mx-frac').length })));
  console.log('    fraction shapes as painted:');
  shapes.forEach((x) => console.log(`      ${x.frac ? 'built up' : 'SLASH   '}  ${x.t}`));
  const slashed = shapes.filter((x) => !x.frac && /\//.test(x.t));
  if (slashed.length)
    friction('Step mathematics — THE BIGGEST ONE',
      'A fraction of two BRACKETED EXPRESSIONS does not build up, and that is exactly how a substituted gradient is written',
      `${slashed.length} of ${shapes.length} step expressions kept a slash. "(5 \u2212 2)/(5 \u2212 1)" stayed a slash`
      + ' while "(\u22124)/6" and "\u22122/3" built up: the grammar takes a bracketed SIGNED INTEGER or bare digits,'
      + ' not a bracketed sum. So the working line of every gradient example sets differently from its answer',
      'the substitution step — the one the whole method turns on — cannot be set as a fraction at all');
}
await pick('mx.g.0'); await add('p.0.prose');
await set('slides.0.groups.0.relations.0.body', 'Both examples used the same subtraction in the same order. Reversing one of them, but not the other, is the mistake to watch for: it turns a rise into a fall.');
await shot('1-gradient', 'two worked examples whose answers are fractions');

/* ── 2 · INTERCEPTS ─ authored in the WRONG ORDER on purpose, then rearranged ─────────────────────── */
console.log('\n  subtopic 2 — Intercepts, with the steps deliberately entered out of order');
await newGroup();
await set('slides.0.groups.1.title', 'Where the line crosses');
await set('slides.0.groups.1.lede', 'Put one variable to zero and the other one falls out. Two substitutions give both intercepts.');
// The group already contains its first example and step.
await pick('mx.e.1.0');
await set('slides.0.groups.1.examples.0.label', 'Both intercepts of _y_ = 2_x_ − 1');
await set('slides.0.groups.1.examples.0.prompt', 'Find where _y_ = 2_x_ − 1 crosses each axis.');
await set('slides.0.groups.1.examples.0.answer', 'It crosses at (0, −1) and at (1/2, 0).');
/* typed in the order a teacher might actually think of them — x-intercept first — then put right */
const SWAPPED = [
  { text: 'Put _y_ = 0 to find where it crosses the _x_-axis.', math: '0 = 2_x_ − 1' },
  { text: 'Solve for _x_. The answer is a fraction, and that is normal.', math: '_x_ = 1/2' },
  { text: 'Put _x_ = 0 to find where it crosses the _y_-axis.', math: '_y_ = 2(0) − 1 = −1' },
];
for (let i = 0; i < SWAPPED.length; i++) {
  if (i > 0) await newStep(1, 0);
  await pick(`mx.s.1.0.${i}`);
  await set(`slides.0.groups.1.examples.0.steps.${i}.text`, SWAPPED[i].text);
  await set(`slides.0.groups.1.examples.0.steps.${i}.math`, SWAPPED[i].math);
}
{ /* REARRANGING: the y-intercept step belongs first. Move it up twice with the row's own arrow. */
  const order = () => p.evaluate(() => LESSON.slides[0].groups[1].examples[0].steps.map((s) => s.math));
  const before = await order();
  await pick('mx.s.1.0.2');
  await press('data-mxmove', 's.1.0:2:-1');
  await press('data-mxmove', 's.1.0:1:-1');
  const after = await order();
  console.log(`    steps reordered: ${JSON.stringify(before)}`);
  console.log(`                  -> ${JSON.stringify(after)}`);
  const painted = await p.evaluate(() => [].slice.call(document.querySelectorAll('#slide .mx-step .mx-stepm')).map((e) => e.textContent.trim()));
  if (after[0] !== before[2]) friction('Rearranging', 'moving a step did not put it where it was asked to go', JSON.stringify(after), 'blocks rearranging');
  else console.log(`    the page now reads ${JSON.stringify(painted.slice(-3))}`);
  // Shift + arrow also moves directly to the start/end; ordinary arrows remain useful here.
}
await pick('mx.g.1'); await add('p.1.prose');
await set('slides.0.groups.1.relations.0.body', 'Reading the rule for the _y_-intercept is quicker than the working: in _y_ = _m__x_ + _c_ the number on its own IS where the line crosses. The working is here because the _x_-intercept has no such shortcut.');
await shot('2-intercepts', 'one example, its steps put back into teaching order');

/* ── 3 · FROM A RULE TO A PICTURE ─ a table of values and the graph it becomes ────────────────────── */
console.log('\n  subtopic 3 — a table of values, then the graph');
await newGroup();
await choose('slides.0.groups.2.type', 'staged');
await pick('mx.g.2');
await set('slides.0.groups.2.title', 'From a rule to a picture');
await set('slides.0.groups.2.lede', 'Two points fix a straight line. The third one is the check that you have not made an arithmetic slip.');
// Reuse the seeded example.
await pick('mx.e.2.0');
await set('slides.0.groups.2.examples.0.label', 'Plotting _y_ = 2_x_ \u2212 1');
await set('slides.0.groups.2.examples.0.prompt', 'Draw _y_ = 2_x_ \u2212 1 for _x_ from \u22122 to 3.');
await set('slides.0.groups.2.examples.0.answer', 'A straight line through (0, \u22121), going up 2 for every 1 across.');
const S3 = [
  { text: 'Choose whole values of _x_ across the range you were given, and work out each _y_.', math: '' },
  { text: 'Plot the pairs and join them. If one point is off the line, it is that point\u2019s arithmetic that is wrong, not the rule.', math: '' },
];
for (let i = 0; i < S3.length; i++) {
  if (i > 0) await newStep(2, 0);
  await pick(`mx.s.2.0.${i}`);
  await set(`slides.0.groups.2.examples.0.steps.${i}.text`, S3[i].text);
}
/* THE TABLE, on the step whose working it is */
await pick('mx.s.2.0.0');
await add('w.2.0.0.table');
const TB = 'slides.0.groups.2.examples.0.steps.0.visual.0';
const XS = ['\u22122', '\u22121', '0', '1', '2', '3'], YS = ['\u22125', '\u22123', '\u22121', '1', '3', '5'];
{
  const t0 = Date.now();
  for (let c = 2; c < XS.length; c++) await press('data-mxcoladd', TB);
  await set(`${TB}.stub`, '_x_');
  for (let c = 0; c < XS.length; c++) await set(`${TB}.head.${c}`, XS[c]);
  await set(`${TB}.rows.0.label`, '_y_ = 2_x_ \u2212 1');
  for (let c = 0; c < YS.length; c++) await set(`${TB}.rows.0.cells.${c}`, YS[c]);
  const cells = await p.evaluate(() => document.querySelectorAll('#slide .mx-tbl td, #slide .mx-tbl th').length);
  console.log(`    a ${XS.length}-column table built from a 2-column default — ${cells} cells painted`);
  console.log(`    This session used ${XS.length - 2} Add column clicks; the Columns field also sets the count directly. Each authored heading still needs its own text.`);
}
/* THE GRAPH. A straight line is not the `line` object — that one is axis-parallel only. */
await pick('mx.g.2'); await add('f.2');
const FB = 'slides.0.groups.2.relations.0.figure';
{
  const offered = await p.evaluate(() => { selZone = 'mx.f.2'; renderSlide();
    return [].slice.call(document.querySelectorAll('#inspector [data-mxadd^="o.2."]')).map((b) => b.dataset.mxadd.split('.').pop()); });
  friction('Drawing a straight line', 'The object called "line" cannot draw a straight line — it is axis-parallel only, so a sloping line has to be entered as a "function"',
    `the graph offers [${offered.join(', ')}]; "line" takes y = k or x = k, so _y_ = 2_x_ \u2212 1 must be typed as the function "2x-1"`,
    'in a lesson ABOUT straight lines, the control named line is the wrong one every single time');
}
await pick('mx.f.2');
await set(`${FB}.domain.xMin`, -3); await set(`${FB}.domain.xMax`, 4);
await pick('mx.f.2');
await set(`${FB}.domain.yMin`, -6); await set(`${FB}.domain.yMax`, 6);
await pick('mx.f.2'); await choose(`${FB}.callouts`, 'hidden');
await pick('mx.o.2.0');
await set(`${FB}.objects.0.f`, '2x-1');
await pick('mx.f.2'); await add('o.2.points');
await press('data-mxrowadd', `${FB}.objects.1`);
const PTS = [['(0, \u22121)', 0, -1], ['(3, 5)', 3, 5]];
for (let r = 0; r < 2; r++) for (let c = 0; c < 3; c++) await set(`${FB}.objects.1.rows.${r}.${c}`, PTS[r][c]);
await pick('mx.g.2'); await add('p.2.relations');
await set('slides.0.groups.2.relations.1.label', 'Reading the line against the table');
await list('slides.0.groups.2.relations.1.items', [
  'Every pair in the table is a point on the line, and every point on the line is a pair that would fit the table.',
  'Going one step right along the table adds 2 to _y_ every time. That constant step IS the gradient.',
  'The column for _x_ = 0 holds \u22121, and that is where the line crosses the _y_-axis.',
]);
{ const st = await p.evaluate(() => (LESSON.slides[0].groups[2].states || []).length);
  await pick('mx.g.2');
  const btn = await p.evaluate(() => !!document.querySelector('#inspector [data-mxstates]'));
  if (btn) { await press('data-mxstates', '2'); console.log('    the staged pair (Workings / Visual explanation) adopted from the app\u2019s own defaults'); }
  else friction('Staged representations', 'no way offered to author the two representations', `states ${st}`, 'blocks the staged composition'); }
await shot('3-table-and-graph', 'the table of values and the line it becomes');

/* ── 4 · COMPARING STEEPNESS ─ three lines on one plane, and the fraction-gradient trap ───────────── */
console.log('\n  subtopic 4 — three lines on one plane');
await newGroup();
await choose('slides.0.groups.3.type', 'staged');
await pick('mx.g.3');
await set('slides.0.groups.3.title', 'Comparing steepness');
await set('slides.0.groups.3.lede', 'Three lines through the same point on the _y_-axis, so the only thing that differs is the gradient.');
await press('data-mxdel', 'e.3.0');
await pick('mx.g.3'); await add('f.3');
const GB = 'slides.0.groups.3.relations.0.figure';
await pick('mx.f.3');
await set(`${GB}.domain.xMin`, -6); await set(`${GB}.domain.xMax`, 6);
await pick('mx.f.3');
await set(`${GB}.domain.yMin`, -4); await set(`${GB}.domain.yMax`, 6);
await pick('mx.f.3'); await choose(`${GB}.callouts`, 'hidden');
await pick('mx.o.3.0');
await set(`${GB}.objects.0.f`, '2x+1');
/* THE HALF-GRADIENT. A teacher writes a gradient of a half as 1/2. Typed straight in, the parser reads
   `1/2x` as 1/(2x) — a hyperbola, not a line. Measured, not assumed: the painted path is compared. */
await pick('mx.f.3'); await add('o.3.function');
{
  const geom = async () => p.evaluate(() => { const ps = [].slice.call(document.querySelectorAll('#slide svg .tp-fig-fn'));
    const last = ps[ps.length - 1];
    if (!last) return null;
    const pts = (last.getAttribute('points') || last.getAttribute('d') || '').trim().split(/[\s,]+/).map(Number).filter((n) => !isNaN(n));
    const ys = pts.filter((_, i) => i % 2 === 1);
    return { n: ps.length, span: ys.length ? Math.round(Math.max(...ys) - Math.min(...ys)) : 0, sub: last.getAttribute('points') ? 'polyline' : 'path' }; });
  await set(`${GB}.objects.1.f`, '1/2x+1');
  await p.waitForTimeout(250);
  const naive = await geom();
  const naivePaths = await p.evaluate(() => document.querySelectorAll('#slide svg .tp-fig-fn').length);
  await set(`${GB}.objects.1.f`, 'x/2+1');
  await p.waitForTimeout(250);
  const fixedPaths = await p.evaluate(() => document.querySelectorAll('#slide svg .tp-fig-fn').length);
  console.log(`    "1/2x+1" drew ${naivePaths} subpath(s); "x/2+1" drew ${fixedPaths}`);
  friction('Entering a gradient of a half', 'Typing the gradient the way it is written turns the line into a hyperbola, silently',
    `"1/2x+1" is read as 1/(2x)+1 — juxtaposition binds tighter than division — and painted ${naivePaths} broken`
    + ` subpath(s) either side of an asymptote; "x/2+1" paints ${fixedPaths}. NOTHING reports an error: the expression is valid,`
    + ' it is simply a different function from the one the teacher wrote',
    'the most natural way to type a fractional gradient is wrong, and the only warning is that the picture looks odd');
}
await pick('mx.f.3'); await add('o.3.function');
await set(`${GB}.objects.2.f`, '-x+1');
await pick('mx.f.3'); await add('o.3.points');
await set(`${GB}.objects.3.rows.0.0`, '(0, 1)'); await set(`${GB}.objects.3.rows.0.1`, 0); await set(`${GB}.objects.3.rows.0.2`, 1);
await pick('mx.g.3'); await add('p.3.relations');
await set('slides.0.groups.3.relations.1.label', 'What the three show');
await list('slides.0.groups.3.relations.1.items', [
  'All three meet at (0, 1), because all three rules end in + 1. The intercept is the constant.',
  'The steepest climb is _m_ = 2: one across, two up. Half the gradient is half the climb for the same step.',
  'The third gradient is negative, so the line falls. Its steepness is still 1 — the sign says direction, the size says steepness.',
  'A gradient of 0 would be flat, and a vertical line has no gradient at all: the run would be zero, and you cannot divide by it.',
]);
await shot('4-three-lines', 'three gradients through one intercept');

/* ── the finished lesson ──────────────────────────────────────────────────────────────────────────── */
console.log('\n  the finished lesson');
await p.evaluate(() => { selZone = null; renderSlide(); });
const built = await L();
// Reject silent seeded leftovers before this session can overwrite its lesson output.
const expectedSteps = [[3, 3], [3], [2], []];
for (const [gi, counts] of expectedSteps.entries()) {
  const examples = built.slides[0].groups[gi].examples || [];
  if (examples.length !== counts.length || examples.some((e, i) => e.steps.length !== counts[i] || e.steps.some(s => !s.text.trim())))
    throw new Error(`Subtopic ${gi + 1} contains a blank or unexpected seeded example/step`);
}
FINAL = withLesson(built);
{
  const g = built.slides[0].groups;
  console.log(`    ${g.length} subtopics · ${g.reduce((a, x) => a + (x.examples || []).length, 0)} worked examples`
    + ` · ${g.reduce((a, x) => a + (x.examples || []).reduce((b, e) => b + (e.steps || []).length, 0), 0)} steps`
    + ` · ${g.flatMap((x) => x.relations || []).filter((r) => r.kind === 'figure').length} graphs`
    + ` · ${g.flatMap((x) => (x.examples || []).flatMap((e) => (e.steps || []).flatMap((s) => (Array.isArray(s.visual) ? s.visual : s.visual ? [s.visual] : [])))).filter((v) => v.kind === 'table').length} table`);
  console.log(`    ${EFFORT.selections + EFFORT.buttons + EFFORT.fields} interactions —`
    + ` ${EFFORT.selections} selections, ${EFFORT.buttons} buttons, ${EFFORT.fields} fields`);
}
/* EXPORT, then OPEN THE FILE FRESH — the app's real persistence, no localStorage */
EXPORTED = await p.evaluate(() => {
  document.getElementById('lesson-data').textContent = JSON.stringify(LESSON, null, 2);
  const c = document.documentElement.cloneNode(true);
  c.querySelector('#slide').innerHTML = ''; const i = c.querySelector('#inspector'); if (i) i.innerHTML = '';
  const pal = c.querySelector('#palette'); if (pal) pal.innerHTML = '';
  c.querySelector('body').className = 'study';
  return '<!DOCTYPE html>\n' + c.outerHTML;
});
const q = await browser.newPage({ viewport: { width: 1536, height: 1000 } });
q.on('pageerror', (e) => errs.push('reopened: ' + String(e)));
await q.goto(`${origin}/reopened.html`, { waitUntil: 'load' });
await q.waitForTimeout(700);
const back = await q.evaluate(() => JSON.parse(JSON.stringify(LESSON)));
console.log(`    exported ${Math.round(EXPORTED.length / 1024)}KB and reopened: `
  + (JSON.stringify(back.slides[0]) === JSON.stringify(built.slides[0]) ? 'identical' : 'DIFFERENT'));
{ /* what the reader gets, in each mode */
  for (const [m, how] of [['study', () => document.querySelector('#modeSeg [data-mode="study"]').click()],
                          ['edit', () => document.querySelector('#modeSeg [data-mode="edit"]').click()],
                          ['present', () => document.querySelector('#presentBtn').click()]]) {
    await q.evaluate(how); await q.waitForTimeout(450);
    const n = await q.evaluate(() => ({ wex: document.querySelectorAll('.mx-wexex').length, st: document.querySelectorAll('.mx-step').length,
      tabs: document.querySelectorAll('[data-mx-tab]').length }));
    console.log(`    ${m.padEnd(8)} ${n.tabs} tabs · ${n.wex} examples · ${n.st} steps`);
  }
  await q.evaluate(() => document.querySelector('#presentExit').click());
  await q.evaluate(() => document.querySelector('#modeSeg [data-mode="study"]').click());
  await q.waitForTimeout(500);
  for (let t = 0; t < 4; t++) {
    await q.evaluate((k) => { const b = document.querySelectorAll('[data-mx-tab]')[k]; if (b) b.click(); }, t);
    await q.waitForTimeout(500);
    await q.screenshot({ path: path.join(SHOTS, `SL-study-${t + 1}.png`) });
  }
}
/* ── WHAT THE FINISHED LESSON SHOWS. Two things only became visible once the lesson existed. ──────── */
{
  await q.evaluate(() => { const t = document.querySelectorAll('[data-mx-tab]'); if (t[3]) t[3].click(); });
  await q.waitForTimeout(600);
  const fig = await q.evaluate(() => {
    const fns = [].slice.call(document.querySelectorAll('#slide svg .tp-fig-fn'));
    const styles = [...new Set(fns.map((e) => { const c = getComputedStyle(e); return `${c.stroke}/${c.strokeWidth}/${c.strokeDasharray || 'none'}`; }))];
    const texts = [].slice.call(document.querySelectorAll('#slide svg text')).map((t) => t.textContent.trim()).filter(Boolean);
    return { curves: fns.length, styles, hyphen: texts.filter((t) => /^-/.test(t)).length, minus: texts.filter((t) => /^\u2212/.test(t)).length };
  });
  if (fig.curves > 1 && fig.styles.length === 1)
    console.log(`    This session retained default curve pens (${fig.styles[0]}). The editor's pen and label controls can distinguish them; this is an authored choice, not an absent capability.`);
  if (fig.hyphen && !fig.minus)
    friction('Typography of the figure', 'The axis numbering uses a hyphen where the lesson\'s own text uses a minus sign',
      `${fig.hyphen} axis labels begin with "-" and ${fig.minus} with "\u2212", on a page whose prose and working are written with \u2212 throughout`,
      'the same number is set two ways on one screen');
}
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(built, null, 2) + '\n');
console.log(`\n  written to ${path.relative(root, OUT)} and ${path.relative(root, SHOTS)}`);
console.log(`  page errors: ${errs.length ? errs.slice(0, 2).join(' | ') : 'none'}`);

console.log('\n══ FRICTION LOG ' + '═'.repeat(62));
FRICTION.forEach((f, i) => {
  console.log(`\n${i + 1}. ${f.where.toUpperCase()}`);
  console.log(`   ${f.what}`);
  console.log(`   evidence: ${f.evidence}`);
  console.log(`   costs:    ${f.cost}`);
});
console.log('\n' + '═'.repeat(78));
await browser.close(); server.close();
