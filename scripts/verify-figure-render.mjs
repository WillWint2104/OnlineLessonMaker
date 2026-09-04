#!/usr/bin/env node
// FIGURE RENDER BASELINE — the gate that carries the frozen-runtime claim FOR FIGURES.
//
//   node scripts/verify-figure-render.mjs                 # compare against the committed baseline
//   node scripts/verify-figure-render.mjs --update        # re-record it (a REVIEWED act, see below)
//   node scripts/verify-figure-render.mjs --shots <dir>   # write PNG captures at the named width classes
//
// WHY THIS EXISTS. `verify-corpus-identity` renders both engine revisions and compares #slide.innerHTML byte
// for byte, so it IS a rendered-DOM gate — but the committed corpus (examples/ + lessons/) contains ZERO
// figure blocks, so all 250 of its render units execute without ever entering fragFigure. It cannot detect
// any change to figure rendering, and its own header says so: "a placement fix that no committed lesson
// exercises must come back all-identical". It remains the right gate for NON-figure frozen behaviour; this
// file is the figure half.
//
// WHAT A DIFF MEANS. Stage 4's container-aware sizing changes how existing figures size responsively ON
// PURPOSE. So a diff here is not automatically a failure — it is a question. The contract is:
//   · authored lesson/corpus data unchanged            -> verify-corpus-identity
//   · non-figure frozen container behaviour unchanged  -> verify-corpus-identity
//   · figure SEMANTICS and CONTENT unchanged           -> verify-geometry-semantics, verify-measure-surface,
//                                                         verify-label-placement
//   · figure RENDERING may change intentionally        -> THIS FILE, and the change lands as a baseline
//                                                         update named and explained in the PR
// `--update` is therefore never routine. Run it when you meant the change, and say in the commit which units
// moved and why. An unexplained baseline update is the failure mode this gate exists to prevent.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASELINE = path.join(root, 'tests/visual/figure-render-baseline.json');
const argv = process.argv.slice(2);
const UPDATE = argv.includes('--update');
const SHOTS = argv.includes('--shots') ? argv[argv.indexOf('--shots') + 1] : null;

const MIME = { '.html': 'text/html', '.json': 'application/json', '.js': 'text/javascript',
  '.mjs': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.glb': 'model/gltf-binary',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml' };

/* THE NAMED WIDTH CLASSES. One definition, used by the digest AND the captures, so a capture is always of the
   same state the baseline recorded. All are `.tp-fig-stage` widths (FIG_MIN_STAGE's quantity), not outer
   block widths. `floor` resolves per kind from figMinStageWidth(). */
const CLASSES = [
  { name: 'wide', stage: 1089 },
  { name: 'intermediate', stage: 700 },
  { name: 'floor+40', stage: null, fromFloor: 40 },
  { name: 'floor', stage: null, fromFloor: 0 },
];
const FIXTURES = [
  { file: 'tests/visual/lessons/figure-geometry-baseline.json', kind: 'geometry' },
  { file: 'tests/visual/lessons/figure-measure-surface.json', kind: 'geometry' },
  { file: 'tests/visual/lessons/figure-graph-baseline.json', kind: 'graph' },
];
const THEMES = { geometry: ['mathematics', 'scholarmath'], graph: ['mathematics', 'scholarmath', 'geolearn'] };

const server = http.createServer((req, res) => {
  const rel = decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'lesson-studio.html';
  if (rel === 'favicon.ico') { res.writeHead(204); return res.end(); }
  const file = path.join(root, rel);
  if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end('nf'); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}/`;

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
const errs = [];
page.on('pageerror', (e) => errs.push(String(e)));
await page.goto(base + 'lesson-studio.html', { waitUntil: 'load' });
await page.evaluate(() => {
  window.__load = (L, theme) => { LESSON = JSON.parse(JSON.stringify(L)); LESSON.meta.theme = theme;
    document.documentElement.dataset.theme = theme; go(0); return LESSON.slides.length; };
  window.__figs = () => [...document.querySelectorAll('#slide .tp-fig[data-fig-fit]')];
  // Drive the STAGE width: the shell's padding and border sit between the block and the stage, so setting the
  // block would record a state ~26px narrower than the class it is filed under.
  window.__stage = (px) => { const figs = window.__figs();
    figs.forEach((f) => { const h = f.parentElement; h.style.width = px + 'px'; h.style.maxWidth = px + 'px'; });
    figs.forEach((f) => { const st = f.querySelector('.tp-fig-stage'), h = f.parentElement;
      const chrome = h.offsetWidth - st.offsetWidth;
      h.style.width = (px + chrome) + 'px'; h.style.maxWidth = (px + chrome) + 'px'; });
    figFitAll();
    return figs.map((f) => f.querySelector('.tp-fig-stage').offsetWidth); };
  window.__units = () => window.__figs().map((f, j) => {
    const svg = f.querySelector('.tp-fig-svg');
    const k = f.querySelector('.tp-fig-stage').offsetWidth / +svg.getAttribute('viewBox').split(/\s+/)[2];
    const px = [];
    svg.querySelectorAll('text,tspan').forEach((t) => { const fs2 = parseFloat(getComputedStyle(t).fontSize);
      if (fs2 && (t.textContent || '').trim()) px.push(fs2 * k); });
    return { j, title: (f.querySelector('.tp-fig-title') || {}).textContent || '', box: f.dataset.figBox,
      html: f.querySelector('.tp-fig-stage').innerHTML, texts: px.length,
      min: px.length ? +Math.min(...px).toFixed(2) : null, max: px.length ? +Math.max(...px).toFixed(2) : null };
  });
});

const sha = (s) => crypto.createHash('sha256').update(s).digest('hex').slice(0, 16);
const now = {};
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
const shots = [];

for (const fx of FIXTURES) {
  const lesson = JSON.parse(fs.readFileSync(path.join(root, fx.file), 'utf8'));
  const floor = await page.evaluate((k) => figMinStageWidth({ figure: k }), fx.kind);
  const short = path.basename(fx.file, '.json');
  for (const theme of THEMES[fx.kind]) {
    const slides = await page.evaluate(({ L, t }) => window.__load(L, t), { L: lesson, t: theme });
    for (const cls of CLASSES) {
      const stageW = cls.stage != null ? cls.stage : floor + cls.fromFloor;
      for (let i = 0; i < slides; i++) {
        const r = await page.evaluate(({ i, stageW }) => { go(i); const w = window.__stage(stageW);
          return { units: window.__units(), widths: w }; }, { i, stageW });
        r.units.forEach((u) => {
          now[`${short}|${theme}|${cls.name}|s${i}|f${u.j}`] =
            { sha: sha(u.html), box: u.box, texts: u.texts, min: u.min, max: u.max, stage: stageW };
        });
        if (SHOTS && r.units.length) {
          // One capture per (fixture, class) at a representative slide, in the primary designed theme.
          const want = (theme === 'mathematics') && (
            (short === 'figure-measure-surface' && i === 2) ||     // carries the 11.16px "cm" unit
            (short === 'figure-geometry-baseline' && i === 6) ||   // crowded + long labels
            (short === 'figure-graph-baseline' && i === 0));
          if (want) {
            const name = `${short}-s${i}-${cls.name}-${stageW}px.png`;
            const el = await page.$('#slide .tp-fig');
            if (el) { await el.screenshot({ path: path.join(SHOTS, name) }); shots.push(name); }
          }
        }
      }
    }
  }
}

if (UPDATE) {
  fs.writeFileSync(BASELINE, JSON.stringify(now, null, 1) + '\n');
  console.log(`baseline re-recorded: ${Object.keys(now).length} units -> ${path.relative(root, BASELINE)}`);
  console.log('This is a REVIEWED act. Say in the commit which units moved and why.');
} else if (!fs.existsSync(BASELINE)) {
  console.error('no baseline yet — run with --update once, and commit it with the reason');
  process.exitCode = 1;
} else {
  const was = JSON.parse(fs.readFileSync(BASELINE, 'utf8'));
  const keys = [...new Set([...Object.keys(was), ...Object.keys(now)])].sort();
  const moved = [], added = [], gone = [];
  for (const k of keys) {
    if (!(k in was)) { added.push(k); continue; }
    if (!(k in now)) { gone.push(k); continue; }
    if (was[k].sha !== now[k].sha) moved.push({ k, was: was[k], now: now[k] });
  }
  console.log(`figure render baseline — ${Object.keys(now).length} units (${FIXTURES.length} fixtures x designed themes x ${CLASSES.length} width classes)`);
  if (!moved.length && !added.length && !gone.length) console.log(`\n  ${keys.length}/${keys.length} units identical`);
  else {
    for (const m of moved.slice(0, 12)) console.log(`  ~ ${m.k}\n      box ${m.was.box} -> ${m.now.box} · texts ${m.was.texts} -> ${m.now.texts} · size ${m.was.min}-${m.was.max} -> ${m.now.min}-${m.now.max}`);
    if (moved.length > 12) console.log(`  ~ ...and ${moved.length - 12} more`);
    added.forEach((k) => console.log(`  + ${k}`));
    gone.forEach((k) => console.log(`  - ${k}`));
    console.log(`\n${moved.length} moved · ${added.length} added · ${gone.length} removed`);
    console.log('If every one of these was intended, re-record with --update and NAME them in the commit.');
    process.exitCode = 1;
  }
}
if (errs.length) { console.error('page errors: ' + errs.slice(0, 3).join(' | ')); process.exitCode = 1; }
if (SHOTS) console.log(`\ncaptures (${shots.length}) -> ${SHOTS}\n  ` + shots.join('\n  '));
await browser.close(); server.close();
