#!/usr/bin/env node
/* ── THE FINISHED LESSON, BEING EDITED ───────────────────────────────────────────────────────────
   node scripts/shots-authoring-lesson.mjs [--lesson <path>] [--out <dir>]

   scripts/shots-mx-authoring.mjs is a TOUR OF THE CONTROLS on a page built for the purpose. This is the
   other half: the actual quadratics lesson, open in the application, photographed at the places a teacher
   would really work — each subtopic's outline, the graph and its objects, the table of values, and the
   two Symmetry representations — and then in Study and Present.

   It also MEASURES the panel at each of those places, because "the inspector is getting long" is a number:
   how tall it has become, how much of it is off the screen, and whether the row you just selected is still
   in view. Those numbers are printed beside each capture rather than left to the eye. */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (n, d) => { const k = process.argv.indexOf('--' + n); return k > 0 && process.argv[k + 1] ? process.argv[k + 1] : d; };
const OUT = path.resolve(root, arg('out', 'docs/atlas/authoring/lesson'));
fs.mkdirSync(OUT, { recursive: true });
const APP = fs.readFileSync(path.join(root, 'lesson-studio.html'), 'utf8');
const LESSON = JSON.parse(fs.readFileSync(path.resolve(root, arg('lesson', 'docs/atlas/lesson/quadratics.app.json')), 'utf8'));
const DOC = APP.replace(/(<script id="lesson-data" type="application\/json">)[\s\S]*?(<\/script>)/,
  `$1\n${JSON.stringify(LESSON, null, 2)}\n$2`);
const MIME = { '.html': 'text/html', '.json': 'application/json', '.woff2': 'font/woff2', '.png': 'image/png', '.svg': 'image/svg+xml' };
const server = http.createServer((q, r) => {
  const u = decodeURIComponent(q.url.split('?')[0]);
  if (u === '/d.html') { r.writeHead(200, { 'Content-Type': 'text/html' }); return r.end(DOC); }
  const p = path.join(root, u === '/' ? '/lesson-studio.html' : u);
  if (!p.startsWith(root) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' }); r.end(fs.readFileSync(p));
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const origin = `http://127.0.0.1:${server.address().port}`;
const b = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const p = await b.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 2 });
await p.goto(`${origin}/d.html`, { waitUntil: 'load' });
await p.waitForTimeout(700);
await p.evaluate(() => document.querySelector('#modeSeg [data-mode="edit"]').click());
await p.waitForTimeout(400);

/* every capture states the mode it was taken in, read off the page — and the mode bar the author can
   actually see, which on a responsive page is the mathematics shell's, not the app header's */
const measure = () => p.evaluate(() => {
  const ins = document.querySelector('#inspector');
  const cur = ins && ins.querySelector('.blk-row.cur');
  const ir = ins && ins.getBoundingClientRect();
  const cr = cur && cur.getBoundingClientRect();
  const on = [].slice.call(document.querySelectorAll('[data-mx-mode]')).filter((x) => x.classList.contains('on')).map((x) => x.dataset.mxMode).join(',');
  return { mode, bar: on || '—', panel: ins ? Math.round(ins.scrollHeight) : 0, visible: ins ? Math.round(ins.clientHeight) : 0,
    rows: ins ? ins.querySelectorAll('.blk-row').length : 0, fields: ins ? ins.querySelectorAll('input.ii,textarea.ia').length : 0,
    inView: cr ? (cr.top >= ir.top - 1 && cr.bottom <= ir.bottom + 1) : null };
});
const shot = async (name, label) => {
  await p.waitForTimeout(350);
  const m = await measure();
  await p.screenshot({ path: path.join(OUT, `LESSON-${name}.png`) });
  console.log(`  ${name.padEnd(16)} [mode=${m.mode} · bar=${m.bar}] panel ${String(m.panel).padStart(4)}px of ${m.visible} visible`
    + ` (${String(Math.max(0, m.panel - m.visible)).padStart(4)}px off-screen) · ${String(m.rows).padStart(2)} rows · ${String(m.fields).padStart(2)} fields`
    + ` · selected in view: ${m.inView}   ${label}`);
};
const sel = async (zone) => { await p.click(`#inspector [data-mxsel="${zone}"]`); await p.waitForTimeout(250); };

console.log('the finished quadratics lesson, open for editing:');
await shot('0-open', 'the lesson as it opens in Edit — the page section, then the outline');
await sel('mx.g.0'); await shot('1-substitution', 'Substitution — two prose parts and three worked examples');
await sel('mx.e.0.2'); await shot('2-example', '"A decimal, and a table" — its question, answer and steps');
await sel('mx.s.0.2.1'); await shot('3-step', 'the step the table belongs to');
await sel('mx.w.0.2.1.0'); await shot('4-table', 'THE TABLE OF VALUES, eleven columns, where the lesson puts it');
await sel('mx.g.2'); await shot('5-symmetry', 'Symmetry — a staged group: its two representations, its graph, its relationships');
await sel('mx.f.2'); await shot('6-window', 'the graph window — the authored domain that decides the composition');
await sel('mx.o.2.2'); await shot('7-points', 'the marked points on the curve, row by row');
await sel('mx.p.2.1'); await shot('8-relations', 'the relationship list that closes the subtopic');
await sel('mx.g.3'); await shot('9-flatter', 'A flatter parabola — the wide window that earns the full grid');

await p.evaluate(() => { selZone = null; renderSlide(); });
await p.evaluate(() => document.querySelector('#modeSeg [data-mode="study"]').click());
await p.waitForTimeout(700);
await shot('10-study', 'the same lesson in Study — what the student sees');
await p.evaluate(() => document.querySelector('#presentBtn').click());
await p.waitForTimeout(800);
await shot('11-present', 'and in Present');
await p.evaluate(() => document.querySelector('#presentExit').click());
await b.close(); server.close();
console.log(`\nwrote ${path.relative(root, OUT)}`);
