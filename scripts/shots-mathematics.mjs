#!/usr/bin/env node
// THE STAGE A PROOF SET — the Mathematics page shell, rendered from the committed fixture.
//
//   node scripts/shots-mathematics.mjs [outDir]
//   CHROMIUM_PATH=/opt/pw-browsers/chromium node scripts/shots-mathematics.mjs
//
// Not a gate — scripts/verify-responsive-shell.mjs is the gate. This exists so the acceptance set is
// reproducible by anyone, in one command, instead of being whatever screenshots were taken that day.
//
// 06-legacy-canvas-control is a PERMANENT member of the set and is deliberately not part of the
// Mathematics design: it is a shipped geolearn lesson rendered beside the new work, and its whole job is
// to look exactly as it always has. It proves the architectural split at a glance — responsive pages take
// the new shell, legacy pages still go through the 1280px canvas — in the form a reviewer can check
// without running anything. Do not restyle it. (The mechanical form of the same control is
// verify-corpus-identity's 250 byte-identical render units.)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.resolve(process.argv[2] || path.join(root, 'screenshots', 'mathematics'));
fs.mkdirSync(OUT, { recursive: true });
const MIME = { '.html': 'text/html', '.json': 'application/json', '.js': 'text/javascript',
  '.mjs': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.glb': 'model/gltf-binary',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml' };

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
const LEGACY = JSON.parse(fs.readFileSync(path.join(root, 'lessons/closing-the-gap-geolearn.json'), 'utf8'));
const NOTES = 0, PRACTICE = 4;

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const open = async (w, h, L, slide, after) => {
  const p = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
  await p.goto(base, { waitUntil: 'load' });
  await p.evaluate(({ L, slide }) => { LESSON = JSON.parse(JSON.stringify(L)); render(); go(slide); }, { L, slide });
  if (after) await p.evaluate(after);
  await p.waitForTimeout(320);
  return p;
};
const shot = async (name, w, h, L, slide, after) => {
  const p = await open(w, h, L, slide, after);
  await p.screenshot({ path: path.join(OUT, name + '.png') });
  await p.close();
  console.log(name);
};

await shot('01-notes-desktop', 1536, 1024, FIX, NOTES);
await shot('02-practice-desktop', 1536, 1024, FIX, PRACTICE);
await shot('03-practice-tablet', 900, 1100, FIX, PRACTICE);
await shot('04-practice-phone', 414, 860, FIX, PRACTICE);
await shot('05-practice-phone-drawer', 414, 860, FIX, PRACTICE, 'rpNavToggle()');
await shot('06-legacy-canvas-control', 1536, 1024, LEGACY, 3);
await shot('07-notes-tablet', 900, 1100, FIX, NOTES);
await shot('08-practice-nav-collapsed', 1536, 1024, FIX, PRACTICE, 'rpNavToggle()');

/* 09 — THE RESIZE PROOF. Three container shapes, the same authored figure, with the mathematical viewport
   each one produced measured out of the live model rather than described. */
{
  const SHAPES = [[1536, 1024], [1536, 660], [1120, 1024]];
  const panes = [];
  for (const [w, h] of SHAPES) {
    const p = await open(w, h, FIX, NOTES);
    const m = await p.evaluate(() => {
      const fig = document.querySelector('.mx-figskin .tp-fig'), stage = fig.querySelector('.tp-fig-stage');
      const box = figFitBox(stage.offsetWidth, stage.offsetHeight), V = figGraph(LESSON.slides[0].workspace.figure, box).V;
      return { stage: stage.offsetWidth + ' x ' + stage.offsetHeight, box: box.W + ' x ' + box.H,
        span: (V.view.x1 - V.view.x0).toFixed(1) + ' x ' + (V.view.y1 - V.view.y0).toFixed(1),
        dom: V.dom.x0.toFixed(1) + ' … ' + V.dom.x1.toFixed(1) };
    });
    const el = await p.$('.mx-work');
    const png = (await el.screenshot()).toString('base64');
    panes.push({ w, h, m, png });
    await p.close();
  }
  const p = await browser.newPage({ viewport: { width: 1500, height: 900 }, deviceScaleFactor: 2 });
  await p.setContent(`<style>
    body{margin:0;background:#EEF1EF;font:13px/1.45 system-ui,sans-serif;color:#15181A;}
    .wrap{padding:22px;} h1{font:600 19px/1.2 system-ui;margin:0 0 3px;}
    .sub{color:#6B7370;margin:0 0 16px;}
    .row{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;align-items:start;}
    img{display:block;width:100%;border:1px solid #D6DBD8;border-radius:8px;background:#fff;}
    dl{margin:9px 0 0;display:grid;grid-template-columns:auto 1fr;gap:2px 10px;font-size:12px;}
    dt{color:#7C8482;} dd{margin:0;font-variant-numeric:tabular-nums;}
    b{color:#0F7A4C;}
  </style><div class="wrap"><h1>Resize proof — the mathematical viewport follows its container</h1>
  <p class="sub">Same authored figure, three container shapes. The viewport span is read out of the live model, not measured off the image.</p>
  <div class="row">${panes.map((x) => `<figure style="margin:0">
    <img src="data:image/png;base64,${x.png}">
    <dl><dt>window</dt><dd>${x.w} × ${x.h}</dd>
        <dt>container</dt><dd>${x.m.stage} px</dd>
        <dt>viewBox</dt><dd>${x.m.box}</dd>
        <dt>domain</dt><dd>${x.m.dom}</dd>
        <dt>viewport</dt><dd><b>${x.m.span} units</b></dd></dl></figure>`).join('')}</div></div>`);
  await p.waitForTimeout(250);
  const hgt = await p.evaluate(() => document.querySelector('.wrap').getBoundingClientRect().height);
  await p.setViewportSize({ width: 1500, height: Math.ceil(hgt) });
  await p.screenshot({ path: path.join(OUT, '09-graph-viewport-resize.png') });
  await p.close();
  console.log('09-graph-viewport-resize');
}

await browser.close(); server.close();
console.log('\nwrote ' + path.relative(root, OUT));
