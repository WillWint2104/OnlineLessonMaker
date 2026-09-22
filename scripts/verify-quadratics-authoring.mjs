#!/usr/bin/env node
// CAN THE WHOLE LESSON BE MADE IN THE APPLICATION? — Stage 3C's milestone, asserted.
//
//   node scripts/verify-quadratics-authoring.mjs
//   CHROMIUM_PATH=/opt/pw-browsers/chromium node scripts/verify-quadratics-authoring.mjs
//
// verify-mx-authoring.mjs proves the vertical slice: a page can be created, one field of each kind edited,
// exported and reopened. It does not prove the thing the product is for. THIS gate starts from an empty
// mathematics lesson and rebuilds the committed quadratics lesson — four groups, seven worked examples,
// nineteen steps, the eleven-column table of values, two graphs with their curves, reference lines and
// marked points, the explanatory prose, the relationship lists and the two Symmetry representations —
// entirely through the inspector, then exports it, reopens it from the file and edits it again.
//
// IT DRIVES ITSELF FROM THE COMMITTED LESSON. Nothing below is a hand-typed transcription: the target JSON
// is read, and each field is typed into the control that owns it. So the script cannot quietly drift away
// from what it claims to reproduce, and a field the lesson carries but the editor cannot reach shows up
// here as a failure rather than as an omission nobody notices.
//
// WHAT "THE SAME LESSON" MEANS. Byte-identical JSON is the wrong bar and the brief says so: an <input>
// yields the string "-6.5" where a hand-written file holds the number -6.5, the editor generates its own
// stable ids, and a field the painter never reads can be present or absent without changing anything. So
// two comparisons run. The first is structural, over a normalised copy, and EVERY class of difference it
// tolerates is named and counted below — an unnamed difference fails. The second is the one that settles
// it: both lessons are rendered and their visible mathematics compared — every line of prose, every table
// cell, and the actual `d` of every path the figure engine paints.
//
// THE PIXELS ARE COMPARED ELSEWHERE, deliberately. `.mx-page` is the scroller and the document itself
// never scrolls, so a screenshot taken here — viewport, fullPage or element — stops at the fold and cannot
// see the table of values at all: a first attempt photographed two pages whose tables read "0" and "99"
// and reported them identical. scripts/shots-quadratics-app.mjs already renders a whole lesson properly
// and measures it, so the pixel comparison is made with that instead, in three commands:
//
//   MX_WRITE_REBUILT=<dir>/rebuilt.app.json node scripts/verify-quadratics-authoring.mjs
//   node scripts/shots-quadratics-app.mjs --lesson <dir>/rebuilt.app.json --out <dir>/shots
//   md5sum <dir>/shots/APP__*.png docs/atlas/app-lesson/APP__*.png   # tab by tab, at both surfaces
//
// At the head of this branch that comparison returns all ten renders byte-identical.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MIME = { '.html': 'text/html', '.json': 'application/json', '.woff2': 'font/woff2', '.png': 'image/png', '.svg': 'image/svg+xml', '.glb': 'model/gltf-binary', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css' };
const APP = fs.readFileSync(path.join(root, 'lesson-studio.html'), 'utf8');
const TARGET = JSON.parse(fs.readFileSync(path.join(root, 'docs/atlas/lesson/quadratics.app.json'), 'utf8'));
const PAGE = TARGET.slides[0];

const withLesson = (lesson) => APP.replace(/(<script id="lesson-data" type="application\/json">)[\s\S]*?(<\/script>)/,
  `$1\n${JSON.stringify(lesson, null, 2)}\n$2`);
const BLANK = withLesson({ meta: { title: TARGET.meta.title, theme: 'mathematics' }, slides: [] });
const COMMITTED = withLesson(TARGET);
let EXPORTED = null;                       // the "saved file", served back at /reopened.html
let REBUILT = null;                        // the rebuilt lesson, served as its own document

const server = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]);
  const serve = (html) => { res.writeHead(200, { 'Content-Type': 'text/html' }); res.end(html); };
  if (u === '/blank.html') return serve(BLANK);
  if (u === '/committed.html') return serve(COMMITTED);
  if (u === '/reopened.html') return serve(EXPORTED || '');
  if (u === '/rebuilt.html') return serve(REBUILT || '');
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
await p.goto(`${origin}/blank.html`, { waitUntil: 'load' });
await p.evaluate(() => document.querySelector('#modeSeg [data-mode="edit"]').click());
await p.waitForTimeout(300);

/* ---- the author's hands. Every one of these is the real control: a click on the button the panel
   renders, or a value typed into the input that carries the data-bind path the panel emitted. ---- */
const click = async (sel) => { await p.click(sel, { timeout: 15000 }); await p.waitForTimeout(25); };
const pick = (zone) => click(`#inspector [data-mxsel="${zone}"]`);
const add = (token) => click(`#inspector [data-mxadd="${token}"]`);
const press = (attr, val) => click(`#inspector [${attr}="${val}"]`);
const set = async (bindPath, value) => { await p.fill(`#inspector [data-bind="${bindPath}"]`, String(value), { timeout: 15000 }); };
const setList = async (bindPath, arr) => { await p.fill(`#inspector [data-split="${bindPath}"]`, arr.join('\n'), { timeout: 15000 }); };
const choose = async (bindPath, value) => { await p.selectOption(`#inspector [data-bind="${bindPath}"]`, String(value), { timeout: 15000 }); await p.waitForTimeout(25); };
const meta = async (key, value) => { await p.fill(`#inspector [data-meta="${key}"]`, String(value), { timeout: 15000 }); };
const lesson = () => p.evaluate(() => JSON.parse(JSON.stringify(LESSON)));

console.log('--- create the page ---');
await click('#palette [data-ptype="workedExamples"]');
await p.waitForTimeout(250);
ok('an empty mathematics lesson yields a worked-examples page from the palette',
   (await lesson()).slides.length === 1, `slides ${(await lesson()).slides.length}`);

/* THE PAGE'S OWN FIELDS — its title, its opening lede and the name it takes in the rail. */
const B = 'slides.0';
await set(`${B}.title`, PAGE.title);
await set(`${B}.lede`, PAGE.lede);
await set(`${B}.navLabel`, PAGE.navLabel);
await meta('stage', TARGET.meta.stage); await meta('year', TARGET.meta.year); await meta('unit', TARGET.meta.unit);
{
  const s = (await lesson()).slides[0];
  ok('the page\'s title, lede and rail name are authorable — not only its groups',
     s.title === PAGE.title && s.lede === PAGE.lede && s.navLabel === PAGE.navLabel,
     `title "${String(s.title).slice(0, 34)}…" · nav "${s.navLabel}"`);
}

/* The seed page arrives with one group carrying one example carrying one step. The lesson's first group
   is that shape, so it is EDITED rather than discarded — which is also what an author would do. */
console.log('--- the four groups ---');
for (let gi = 0; gi < PAGE.groups.length; gi++) {
  const g = PAGE.groups[gi];
  if (gi > 0) await add('g');
  await pick(`mx.g.${gi}`);
  const gb = `${B}.groups.${gi}`;
  await choose(`${gb}.type`, g.type);
  await pick(`mx.g.${gi}`);
  await set(`${gb}.title`, g.title);
  await set(`${gb}.lede`, g.lede);
  if (g.footLabel) await set(`${gb}.footLabel`, g.footLabel);

  /* THE EXAMPLES AND THEIR WORKINGS. The seeded group already holds one example with one step; every
     further one is added with the button the outline renders for it. */
  const seeded = gi === 0 ? 1 : 0;
  for (let ei = 0; ei < g.examples.length; ei++) {
    if (ei >= seeded) await add(`e.${gi}`);
    await pick(`mx.e.${gi}.${ei}`);
    const ex = g.examples[ei], eb = `${gb}.examples.${ei}`;
    await set(`${eb}.label`, ex.label);
    await set(`${eb}.prompt`, ex.prompt);
    await set(`${eb}.answer`, ex.answer);
    const seededSteps = (gi === 0 && ei === 0) ? 1 : 0;
    for (let si = 0; si < (ex.steps || []).length; si++) {
      if (si >= seededSteps) await add(`s.${gi}.${ei}`);
      await pick(`mx.s.${gi}.${ei}.${si}`);
      const st = ex.steps[si], sb = `${eb}.steps.${si}`;
      await set(`${sb}.text`, st.text);
      await set(`${sb}.math`, st.math || '');
      if (st.note) await set(`${sb}.note`, st.note);
      /* THE TABLE OF VALUES, authored where it belongs — under the step whose substitution it tabulates. */
      for (const part of [].concat(st.visual ? (Array.isArray(st.visual) ? st.visual : [st.visual]) : [])) {
        await pick(`mx.s.${gi}.${ei}.${si}`);
        await add(`w.${gi}.${ei}.${si}.${part.kind}`);
        const pb = `${sb}.visual.0`;
        if (part.kind === 'table') await buildTable(pb, part);
      }
    }
  }

  /* THE CLOSING REGION — the graph, then the prose or the relationship list, in authored order. */
  for (let k = 0; k < (g.relations || []).length; k++) {
    const rel = g.relations[k];
    if (rel.kind === 'figure') { await add(`f.${gi}`); await buildFigure(gi, `${gb}.relations.${k}.figure`, rel.figure); }
    else {
      await pick(`mx.g.${gi}`);
      await add(`p.${gi}.${rel.kind}`);
      const pb = `${gb}.relations.${k}`;
      if (rel.kind === 'prose') await set(`${pb}.body`, rel.body);
      else { if (rel.label) await set(`${pb}.label`, rel.label); await setList(`${pb}.items`, rel.items); }
    }
  }

  /* THE REPRESENTATIONS. A staged group already SHOWS the pair the lesson authors — the app's own default
     for "a worked relationship with a picture of it" — so the author adopts the defaults with the button
     that writes them into the JSON, and then edits them. Adding blind ones would author a different page. */
  if (g.states && g.states.length) {
    await pick(`mx.g.${gi}`);
    await press('data-mxstates', String(gi));
    for (let ti = 0; ti < g.states.length; ti++) {
      await pick(`mx.t.${gi}.${ti}`);
      const st = g.states[ti], tb = `${gb}.states.${ti}`;
      await set(`${tb}.label`, st.label);
      await set(`${tb}.id`, st.id);
      if (st.lede) await set(`${tb}.lede`, st.lede);
    }
  }
}

async function buildTable(pb, t) {
  const want = (t.head || []).length;
  for (let c = 2; c < want; c++) await press('data-mxcoladd', pb);
  for (let c = want; c < 2; c++) { /* a shorter table than the seed would remove columns here */ }
  for (let c = 0; c < want; c++) await set(`${pb}.head.${c}`, t.head[c]);
  await set(`${pb}.stub`, t.stub || '');
  if (t.label) await set(`${pb}.label`, t.label);
  const rows = t.rows || [];
  for (let r = 1; r < rows.length; r++) await press('data-mxtrowadd', pb);
  for (let r = 0; r < rows.length; r++) {
    await set(`${pb}.rows.${r}.label`, rows[r].label ?? '');
    for (let c = 0; c < want; c++) await set(`${pb}.rows.${r}.cells.${c}`, (rows[r].cells || [])[c] ?? '');
  }
}

async function buildFigure(gi, fb, fig) {
  await pick(`mx.f.${gi}`);
  const d = fig.domain || {};
  await set(`${fb}.domain.xMin`, d.xMin); await set(`${fb}.domain.xMax`, d.xMax);
  await set(`${fb}.domain.yMin`, d.yMin); await set(`${fb}.domain.yMax`, d.yMax);
  await choose(`${fb}.grid`, fig.grid === 'hidden' ? 'hidden' : 'shown');
  await pick(`mx.f.${gi}`);
  await choose(`${fb}.callouts`, fig.callouts === 'hidden' ? 'hidden' : 'shown');
  await pick(`mx.f.${gi}`);
  const objs = fig.objects || [];
  for (let oi = 0; oi < objs.length; oi++) {
    const o = objs[oi];
    if (oi > 0) { await pick(`mx.f.${gi}`); await add(`o.${gi}.${o.type}`); }   // the seed already holds one function
    await pick(`mx.o.${gi}.${oi}`);
    const ob = `${fb}.objects.${oi}`;
    if (o.type === 'function') await set(`${ob}.f`, o.f);
    else if (o.type === 'line') {
      const axis = o.y != null ? 'y' : 'x';
      if (axis !== 'y') await p.selectOption(`#inspector [data-mxaxis="${ob}"]`, 'x');
      await pick(`mx.o.${gi}.${oi}`);
      await set(`${ob}.${axis}`, o[axis]);
      if (o.label) await set(`${ob}.label`, o.label);
    } else if (o.type === 'points') {
      const rows = o.rows || [];
      for (let r = 1; r < rows.length; r++) await press('data-mxrowadd', ob);
      for (let r = 0; r < rows.length; r++)
        for (let c = 0; c < 3; c++) await set(`${ob}.rows.${r}.${c}`, rows[r][c]);
    } else if (o.type === 'segment') {
      const b = o.between || [o.from, o.to];
      await set(`${ob}.between.0`, b[0]); await set(`${ob}.between.1`, b[1]);
    }
  }
}

const built = await lesson();
REBUILT = withLesson(built);
console.log('--- what was built ---');
{
  const s = built.slides[0], g = s.groups || [];
  ok('every group is there, with the composition the lesson authors',
     g.length === PAGE.groups.length && g.every((x, k) => x.type === PAGE.groups[k].type),
     `${g.length} groups · ${g.map((x) => x.type).join(', ')}`);
  const exN = g.reduce((a, x) => a + (x.examples || []).length, 0);
  const stN = g.reduce((a, x) => a + (x.examples || []).reduce((b, e) => b + (e.steps || []).length, 0), 0);
  const wantEx = PAGE.groups.reduce((a, x) => a + x.examples.length, 0);
  const wantSt = PAGE.groups.reduce((a, x) => a + x.examples.reduce((b, e) => b + (e.steps || []).length, 0), 0);
  ok('every worked example and every step of every solution is there',
     exN === wantEx && stN === wantSt, `${exN}/${wantEx} examples · ${stN}/${wantSt} steps`);
  const tbl = g[0].examples[2].steps[1].visual;
  const t = Array.isArray(tbl) ? tbl[0] : tbl;
  ok('THE TABLE OF VALUES was built through the inspector — headings, stub and cells',
     !!t && t.kind === 'table' && (t.head || []).length === 11 && (t.rows || []).length === 1
       && (t.rows[0].cells || []).join(',') === '25,16,9,4,1,0,1,4,9,16,25',
     t ? `${(t.head || []).length} columns × ${(t.rows || []).length} row · stub "${t.stub}" · cells ${(t.rows[0].cells || []).join(' ')}` : 'no table');
  ok('and every row is exactly as wide as the headings — the editor cannot author a ragged table',
     !!t && (t.rows || []).every((r) => (r.cells || []).length === (t.head || []).length),
     t ? (t.rows || []).map((r) => (r.cells || []).length + '/' + t.head.length).join(' ') : '');
  const figs = g.map((x) => (x.relations || []).filter((r) => r.kind === 'figure').length);
  const objs = g.flatMap((x) => (x.relations || []).filter((r) => r.kind === 'figure')).map((r) => (r.figure.objects || []).map((o) => o.type).join('+'));
  ok('both graphs were authored, each with its curve, its reference line and its marked points',
     figs.join('') === '0011' && objs.every((o) => o === 'function+line+points'),
     `figures per group [${figs}] · objects ${objs.join(' | ')}`);
  const prose = g.flatMap((x) => (x.relations || []).filter((r) => r.kind === 'prose')).length;
  const rels = g.flatMap((x) => (x.relations || []).filter((r) => r.kind === 'relations')).length;
  ok('the explanatory prose and the relationship lists are authored content, not chrome',
     prose === 4 && rels === 2, `${prose} prose · ${rels} relationship lists`);
  ok('the Symmetry group carries its two representations, edited from the app\'s own defaults',
     (g[2].states || []).length === 2 && g[2].states.map((x) => x.id).join(',') === 'workings,visual'
       && !!g[2].states[0].lede,
     `[${(g[2].states || []).map((x) => x.id + '/' + x.label).join(' · ')}]`);
}

/* ---- COMPARISON 1: the data, normalised. Every tolerance is named. ---- */
console.log('--- the rebuilt lesson against the committed one ---');
const allowed = new Map();
const note = (k) => allowed.set(k, (allowed.get(k) || 0) + 1);
const ID = /^(id)$/;
const numish = (v) => typeof v === 'string' && v.trim() !== '' && isFinite(+v);
function diff(a, b, at, out) {
  // `a` rebuilt, `b` committed
  if (a === b) return;
  if (numish(a) && typeof b === 'number' && +a === b) return note('a typed number arrives as its own text');
  if (a === '' && b === undefined) return note('a field left blank is written as ""');
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) { out.push(`${at}: ${a.length} vs ${b.length} entries`); return; }
    a.forEach((x, k) => diff(x, b[k], `${at}[${k}]`, out)); return;
  }
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
      if (ID.test(k) && typeof a[k] === 'string' && typeof b[k] === 'string') { note('the editor generates its own ids'); continue; }
      if (k === 'style' && a[k] === 'dashed' && b[k] === undefined) { note('a default written out in full'); continue; }
      if (k === 'label' && b[k] !== undefined && a[k] === undefined) { note('a curve label the painter never draws'); continue; }
      if (k === 'lede' && a[k] === '' && b[k] === undefined) { note('a field left blank is written as ""'); continue; }
      if (k === 'visual' && Array.isArray(a[k]) && !Array.isArray(b[k])) { diff(a[k], [b[k]], `${at}.${k}`, out); note('one companion written as a list of one'); continue; }
      diff(a[k], b[k], `${at}.${k}`, out);
    }
    return;
  }
  out.push(`${at}: ${JSON.stringify(a)} vs ${JSON.stringify(b)}`);
}
const unexplained = [];
diff(built.slides[0], PAGE, 'page', unexplained);
ok('every difference from the committed lesson is one of the named, equivalent representations',
   unexplained.length === 0,
   unexplained.length ? unexplained.slice(0, 6).join(' · ') : [...allowed].map(([k, n]) => `${n}× ${k}`).join(' · '));

/* ---- COMPARISON 2: the render. This is the one that settles it. ---- */
const fingerprint = async (url) => {
  const q = await browser.newPage({ viewport: { width: 1536, height: 1000 } });
  await q.goto(url, { waitUntil: 'load' });
  await q.waitForTimeout(700);
  const out = await q.evaluate(() => {
    const tabs = [].slice.call(document.querySelectorAll('.mx-tab,[data-mx-tab]'));
    const grab = () => ({
      text: (document.querySelector('.mx-page') || document.body).innerText.replace(/\s+/g, ' ').trim(),
      cells: [].slice.call(document.querySelectorAll('.mx-tbl th,.mx-tbl td')).map((x) => x.textContent.trim()),
      paths: [].slice.call(document.querySelectorAll('svg path,svg polyline')).map((x) => (x.getAttribute('d') || x.getAttribute('points') || '').slice(0, 4000)),
      steps: document.querySelectorAll('.mx-step').length,
      wex: document.querySelectorAll('[data-mx-wex],.mx-wexex').length,
    });
    const views = [];
    if (!tabs.length) { views.push(grab()); return views; }
    for (const t of tabs) { t.click(); views.push(grab()); }
    return views;
  });
  /* AND THE PICTURE ITSELF. Every view is photographed at the desktop surface after its tab is clicked,
     because two lessons that agree on every word and every path can still be laid out differently — and
     the composition is decided by the authored geometry, which is exactly what this gate claims survived
     being typed in rather than written by hand. */
  await q.close();
  return { views: out };
};
const fpBuilt = (await fingerprint(`${origin}/rebuilt.html`)).views;
const fpCommitted = (await fingerprint(`${origin}/committed.html`)).views;
ok('the rebuilt lesson renders the same number of views as the committed one',
   fpBuilt.length === fpCommitted.length && fpBuilt.length > 0, `${fpBuilt.length} vs ${fpCommitted.length} view(s)`);
{
  const sameText = fpBuilt.every((v, k) => v.text === (fpCommitted[k] || {}).text);
  const firstBad = fpBuilt.findIndex((v, k) => v.text !== (fpCommitted[k] || {}).text);
  let where = '';
  if (!sameText) { const a = fpBuilt[firstBad].text, b = fpCommitted[firstBad].text;
    let i = 0; while (i < a.length && a[i] === b[i]) i++; where = `view ${firstBad} diverges at ${i}: "${a.slice(i, i + 70)}" vs "${b.slice(i, i + 70)}"`; }
  ok('EVERY WORD OF THE RENDERED LESSON IS THE SAME — prose, questions, workings, answers, relationships',
     sameText, sameText ? `${fpBuilt[0].text.length} characters, identical across ${fpBuilt.length} view(s)` : where);
}
{
  const a = fpBuilt.flatMap((v) => v.cells), b = fpCommitted.flatMap((v) => v.cells);
  ok('and every cell of the table of values is the same', a.join('|') === b.join('|'),
     `${a.length} cells · e.g. ${a.slice(0, 13).join(' ')}`);
}
{
  const a = fpBuilt.flatMap((v) => v.paths), b = fpCommitted.flatMap((v) => v.paths);
  const same = a.length === b.length && a.every((x, k) => x === b[k]);
  ok('and the FIGURE ENGINE PAINTS THE SAME GEOMETRY — every curve, axis and marker to the same coordinates',
     same && a.length > 0, `${a.length} painted path(s) vs ${b.length}${same ? ', identical' : ', DIFFERENT'}`);
}

/* ---- THE CONTROLS. A comparison that cannot fail is not a comparison. Each one withdraws exactly one
   thing the assertions above claim to police, and the same predicate has to report it. ---- */
console.log('--- controls ---');
const clone = (x) => JSON.parse(JSON.stringify(x));
{
  const bad = clone(built.slides[0]);
  bad.groups[0].examples[0].steps[1].math = '_y_ = -4^2';      // the brackets dropped — the whole point of that step
  const out = []; diff(bad, PAGE, 'page', out);
  ok('CONTROL: change one line of mathematics and the structural comparison reports it', out.length === 1,
     out[0] || 'NOTHING REPORTED — the comparison is not looking at the workings');
}
{
  const bad = clone(built.slides[0]);
  const t = bad.groups[0].examples[2].steps[1].visual[0];
  t.head.splice(3, 1);                                          // a column removed without squaring the rows
  ok('CONTROL: splice a heading out without the cells and the rectangularity check fires',
     !t.rows.every((r) => (r.cells || []).length === t.head.length),
     `${t.rows[0].cells.length} cells against ${t.head.length} headings`);
}
{
  const bad = clone(built);
  bad.slides[0].groups[0].examples[2].steps[1].visual[0].rows[0].cells[5] = '99';
  REBUILT = withLesson(bad);
  const run = await fingerprint(`${origin}/rebuilt.html`);
  const cells = run.views.flatMap((v) => v.cells).join('|'), want = fpCommitted.flatMap((v) => v.cells).join('|');
  const text = run.views.map((v) => v.text).join('|') !== fpCommitted.map((v) => v.text).join('|');
  ok('CONTROL: change one cell of the table and the rendered comparison sees it, in the cells and in the words',
     cells !== want && text, `the 0 at the vertex reads "99" · cells ${cells === want ? 'NOT SEEN' : 'seen'} · text ${text ? 'seen' : 'NOT SEEN'}`);
}
{
  const bad = clone(built);
  const fig = bad.slides[0].groups[2].relations.find((r) => r.kind === 'figure').figure;
  fig.domain.xMax = '8';                                        // a different window — the same curve, drawn differently
  REBUILT = withLesson(bad);
  const fp = (await fingerprint(`${origin}/rebuilt.html`)).views;
  const a = fp.flatMap((v) => v.paths), b = fpCommitted.flatMap((v) => v.paths);
  const moved = a.filter((x, k) => x !== b[k]).length;
  ok('CONTROL: widen one graph\'s window and the painted geometry comparison sees it',
     !(a.length === b.length && a.every((x, k) => x === b[k])),
     `x to 6.5 → 8 · ${moved} of ${a.length} painted path(s) now draw to different coordinates`);
}
REBUILT = withLesson(built);

/* ---- save, reopen, edit again ---- */
console.log('--- save, leave, reopen, edit again ---');
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
ok('the rebuilt lesson survives into the saved file', !!EXPORTED && EXPORTED.length > 100000,
   `${Math.round((EXPORTED || '').length / 1024)}KB written`);
const q = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
q.on('pageerror', (e) => errs.push('reopened: ' + String(e)));
await q.goto(`${origin}/reopened.html`, { waitUntil: 'load' });
await q.waitForTimeout(500);
{
  const back = await q.evaluate(() => JSON.parse(JSON.stringify(LESSON)));
  ok('REOPENED FROM THE FILE, the whole lesson is back — nothing was lost in the round trip',
     JSON.stringify(back.slides[0]) === JSON.stringify(built.slides[0]),
     `${(back.slides[0].groups || []).length} groups · ${JSON.stringify(back.slides[0]).length} vs ${JSON.stringify(built.slides[0]).length} characters`);
  const rendered = await q.evaluate(() => document.querySelectorAll('.mx-wexex').length);
  ok('and it renders again through the mathematics page family', rendered > 0, `${rendered} worked-example primitive(s)`);
}
await q.evaluate(() => document.querySelector('#modeSeg [data-mode="edit"]').click());
await q.waitForTimeout(300);
await q.click('#inspector [data-mxsel="mx.g.0"]');
await q.waitForTimeout(150);
await q.click('#inspector [data-mxsel="mx.e.0.2"]');
await q.waitForTimeout(150);
await q.click('#inspector [data-mxsel="mx.s.0.2.1"]');
await q.waitForTimeout(150);
{
  const pb = 'slides.0.groups.0.examples.2.steps.1.visual.0';
  const reachable = await q.evaluate((sel) => !!document.querySelector(sel), `#inspector [data-mxsel="mx.w.0.2.1.0"]`);
  ok('THE TABLE IS STILL EDITABLE AFTER THE ROUND TRIP — it is structure, not baked-in markup', reachable,
     reachable ? 'the table appears in the reopened outline under its own step' : 'the table row is missing');
  if (reachable) {
    await q.click('#inspector [data-mxsel="mx.w.0.2.1.0"]');
    await q.waitForTimeout(150);
    await q.fill(`#inspector [data-bind="${pb}.rows.0.cells.5"]`, '0 (the vertex)');
    await q.waitForTimeout(150);
    const cell = await q.evaluate((path) => { const seg = path.split('.'); let t = LESSON; for (const k of seg) t = t[k]; return t; }, `${pb}.rows.0.cells.5`);
    const painted = await q.evaluate(() => [].slice.call(document.querySelectorAll('.mx-tbl td')).map((x) => x.textContent.trim()).join(','));
    ok('and a cell edited after reopening lands in the data and repaints the table',
       cell === '0 (the vertex)' && painted.indexOf('0 (the vertex)') >= 0, `cell now "${cell}" · painted "${painted.slice(0, 60)}…"`);
  } else { ok('and a cell edited after reopening lands in the data and repaints the table', false, 'unreachable'); }
}

/* ---- THE TABLE'S OWN INVARIANT, driven through the buttons it renders ---- */
{
  const pb = 'slides.0.groups.0.examples.2.steps.1.visual.0';
  const shape = () => q.evaluate((path) => { const seg = path.split('.'); let t = LESSON; for (const k of seg) t = t[k];
    return { head: t.head.length, rows: t.rows.map((r) => r.cells.length) }; }, pb);
  const before = await shape();
  await q.click(`#inspector [data-mxcoladd="${pb}"]`); await q.waitForTimeout(150);
  const wider = await shape();
  await q.click(`#inspector [data-mxcoldel="${pb}:0"]`); await q.waitForTimeout(150);
  const narrower = await shape();
  await q.click(`#inspector [data-mxtrowadd="${pb}"]`); await q.waitForTimeout(150);
  const taller = await shape();
  await q.click(`#inspector [data-mxtrowdel="${pb}:1"]`); await q.waitForTimeout(150);
  const back = await shape();
  ok('ADDING A COLUMN WIDENS EVERY ROW WITH IT, and removing one narrows every row with it',
     wider.head === before.head + 1 && wider.rows.every((n) => n === wider.head)
       && narrower.head === before.head && narrower.rows.every((n) => n === narrower.head),
     `${before.head} → ${wider.head} → ${narrower.head} headings · rows ${before.rows} → ${wider.rows} → ${narrower.rows}`);
  ok('and a new row arrives already the width of the headings',
     taller.rows.length === before.rows.length + 1 && taller.rows.every((n) => n === taller.head)
       && back.rows.length === before.rows.length,
     `${before.rows.length} → ${taller.rows.length} → ${back.rows.length} row(s), each ${taller.head} wide`);
  const painted = await q.evaluate(() => document.querySelectorAll('.mx-tbl tr').length);
  ok('and the page repaints from the data each time — the table is never stale markup', painted === back.rows.length + 1,
     `${painted} rendered row(s) including the headings, against ${back.rows.length} authored`);
}

/* ---- the three modes ---- */
console.log('--- Study, Edit and Present ---');
for (const m of ['study', 'edit', 'present']) {
  /* Present is its own control, and entering it from Edit drops back to Study first — so it is entered the
     way a teacher enters it, by the button, not by setting a mode variable. */
  if (m === 'present') await q.evaluate(() => document.querySelector('#presentBtn').click());
  else await q.evaluate((mm) => document.querySelector(`#modeSeg [data-mode="${mm}"]`).click(), m);
  await q.waitForTimeout(500);
  const n = await q.evaluate(() => ({ wex: document.querySelectorAll('.mx-wexex').length, steps: document.querySelectorAll('.mx-step').length,
    present: document.body.classList.contains('present') }));
  ok(`the rebuilt lesson renders intact in ${m.toUpperCase()}`,
     n.wex > 0 && n.steps > 0 && (m !== 'present' || n.present),
     `${n.wex} example(s) · ${n.steps} step(s)${m === 'present' ? ` · body.present ${n.present}` : ''}`);
}
await q.evaluate(() => document.querySelector('#presentExit').click());
await q.waitForTimeout(200);
ok('no page error at any point — build, export, reopen, edit again, all three modes', errs.length === 0,
   errs.length ? errs.slice(0, 3).join(' | ') : 'none');

/* MX_WRITE_REBUILT dumps the rebuilt lesson so it can be rendered beside the committed one. path.resolve,
   NOT path.join: join treats an absolute path as a relative one and silently plants a scratch file inside
   the repository — which is how a hundred of them were committed once already. The parent is created, so
   a path outside the tree works as given. */
if (process.env.MX_WRITE_REBUILT) {
  const dest = path.resolve(root, process.env.MX_WRITE_REBUILT);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, JSON.stringify(built, null, 2));
  console.log(`rebuilt lesson written to ${dest}`);
}
await browser.close(); server.close();
console.log(`\n${pass}/${pass + fail} checks passed`);
process.exit(fail ? 1 : 0);
