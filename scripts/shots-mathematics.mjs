#!/usr/bin/env node
// THE STAGE A PROOF SET — the Mathematics page shell, rendered from the committed fixture.
//
//   node scripts/shots-mathematics.mjs [outDir]
//   CHROMIUM_PATH=/opt/pw-browsers/chromium node scripts/shots-mathematics.mjs
//
// Not a gate — scripts/verify-responsive-shell.mjs is the gate. This exists so the acceptance set is
// reproducible by anyone, in one command, instead of being whatever screenshots were taken that day.
//
// TWO CATEGORIES, NEVER MIXED. Files are named for which they belong to:
//
//   mathematics-*   the new responsive product. These DEFINE the design.
//   legacy-*        shipped pages rendered beside it. These exist only to prove non-regression, are
//                   deliberately not part of the Mathematics design, and must not be restyled — nor
//                   allowed to influence a Mathematics renderer. `legacy-video-control` in particular is
//                   the OLD geolearn video page; the Mathematics video design is `mathematics-video-shell`.
//
// (The mechanical form of the legacy controls is verify-corpus-identity's 250 byte-identical render units.)
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
const idx = (t) => FIX.slides.findIndex((x) => x.type === t);
const NOTES = idx('notes'), PRACTICE = idx('practice'), VIDEO = idx('videoShell');
const LEG_TEXT = LEGACY.slides.findIndex((x) => x.type === 'text');
const LEG_VIDEO = LEGACY.slides.findIndex((x) => x.type === 'video');

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

// ── the new responsive Mathematics product ────────────────────────────────────────────────────────
await shot('mathematics-notes', 1536, 1024, FIX, NOTES);
await shot('mathematics-practice', 1536, 1024, FIX, PRACTICE);
await shot('mathematics-video-shell', 1536, 1024, FIX, VIDEO);
await shot('mathematics-notes-tablet', 900, 1100, FIX, NOTES);
await shot('mathematics-practice-tablet', 900, 1100, FIX, PRACTICE);
await shot('mathematics-practice-phone', 414, 860, FIX, PRACTICE);
await shot('mathematics-practice-phone-drawer', 414, 860, FIX, PRACTICE, 'rpNavToggle()');
await shot('mathematics-practice-nav-collapsed', 1536, 1024, FIX, PRACTICE, 'rpNavToggle()');
// ── legacy controls — non-regression only, not part of the design ────────────────────────────────
await shot('legacy-canvas-control', 1536, 1024, LEGACY, LEG_TEXT);
await shot('legacy-video-control', 1536, 1024, LEGACY, LEG_VIDEO);

/* THE RESIZE PROOF. Three container shapes, the same authored figure, with the mathematical viewport
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
  await p.screenshot({ path: path.join(OUT, 'graph-viewport-resize.png') });
  await p.close();
  console.log('graph-viewport-resize');
}

/* THE INDEX. The two categories are separated here on purpose: a reviewer should never have to work out
   which screenshots define the Mathematics product and which exist only to prove nothing regressed. */
{
  const b64 = (f) => fs.readFileSync(path.join(OUT, f + '.png')).toString('base64');
  const MX = [['mathematics-notes', 'Notes'], ['mathematics-practice', 'Practice — Equations'],
    ['mathematics-video-shell', 'Video'], ['mathematics-practice-tablet', 'Practice · tablet'],
    ['mathematics-practice-phone', 'Practice · phone'], ['mathematics-practice-phone-drawer', 'Practice · phone, drawer']];
  const LG = [['legacy-canvas-control', 'Legacy canvas page — geolearn `text`'],
    ['legacy-video-control', 'Legacy video page — geolearn `video`']];
  const card = (c) => ([f, t]) => `<figure class="${c}"><img src="data:image/png;base64,${b64(f)}"><figcaption><b>${t}</b><code>${f}</code></figcaption></figure>`;
  const p = await browser.newPage({ viewport: { width: 1500, height: 900 }, deviceScaleFactor: 2 });
  await p.setContent(`<style>
    body{margin:0;background:#EEF1EF;font:13px/1.45 system-ui,sans-serif;color:#15181A;}
    .wrap{padding:24px;} h1{font:600 21px/1.2 system-ui;margin:0 0 20px;}
    h2{font:600 12px/1 system-ui;letter-spacing:.09em;text-transform:uppercase;margin:0 0 4px;}
    .lead{margin:0 0 14px;color:#6B7370;font-size:12.5px;}
    section{margin-bottom:26px;padding:16px 16px 18px;border-radius:12px;}
    .new{background:#fff;border:1px solid #CFE3D6;} .new h2{color:#0F7A4C;}
    .old{background:#F6F5F1;border:1px dashed #D6D2C6;} .old h2{color:#8A5A16;}
    .row{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;}
    .old .row{grid-template-columns:repeat(2,1fr);}
    figure{margin:0;} img{display:block;width:100%;max-height:300px;object-fit:contain;object-position:top;
      border:1px solid #D6DBD8;border-radius:7px;background:#fff;}
    figcaption{margin-top:6px;display:flex;flex-direction:column;gap:1px;}
    code{font:11px ui-monospace,monospace;color:#7C8482;}
  </style><div class="wrap"><h1>Stage A proof set</h1>
  <section class="new"><h2>New responsive Mathematics product</h2>
    <p class="lead">These define the design. Rendered from tests/visual/lessons/mathematics-shell.json.</p>
    <div class="row">${MX.map(card('new')).join('')}</div></section>
  <section class="old"><h2>Legacy controls — non-regression only</h2>
    <p class="lead">These are NOT the Mathematics design and must not influence it. A shipped geolearn lesson, rendered beside the new work; their job is to look exactly as they always have.</p>
    <div class="row">${LG.map(card('old')).join('')}</div></section></div>`);
  await p.waitForTimeout(300);
  const hgt = await p.evaluate(() => document.querySelector('.wrap').getBoundingClientRect().height);
  await p.setViewportSize({ width: 1500, height: Math.ceil(hgt) });
  await p.screenshot({ path: path.join(OUT, '00-index.png') });
  await p.close();
  console.log('00-index');
}

await browser.close(); server.close();
console.log('\nwrote ' + path.relative(root, OUT));
