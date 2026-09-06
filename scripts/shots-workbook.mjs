#!/usr/bin/env node
// THE STAGE B PROOF SET — the Practice workbook, with real ink.
//
//   node scripts/shots-workbook.mjs [outDir]
//
// Every stroke in these images was drawn through the real canvas with real pointer events, and every
// state shown was reached by using the page, not by posing it. scripts/verify-workbook.mjs is the gate;
// this is the picture of what it asserts.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.resolve(process.argv[2] || path.join(root, 'screenshots', 'workbook'));
fs.mkdirSync(OUT, { recursive: true });
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
const PRACTICE = FIX.slides.findIndex((s) => s.type === 'practice');
const WIDE = JSON.parse(fs.readFileSync(path.join(root, 'tests/visual/lessons/mathematics-wide-table.json'), 'utf8'));

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const open = async (w, h, L = FIX, slide = PRACTICE) => {
  const p = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
  await p.goto(base, { waitUntil: 'load' });
  await p.evaluate(({ L, slide }) => { LESSON = JSON.parse(JSON.stringify(L)); render(); go(slide); }, { L, slide });
  await p.waitForTimeout(420);
  return p;
};
const draw = async (p, pts) => {
  const box = await (await p.$('.mx-wbcanvas')).boundingBox();
  const at = ([x, y]) => [box.x + x * box.width, box.y + y * box.height];
  await p.mouse.move(...at(pts[0])); await p.mouse.down();
  for (const q of pts.slice(1)) await p.mouse.move(...at(q), { steps: 10 });
  await p.mouse.up();
};
// A worked solution to Q1, in handwriting-shaped strokes.
const WORK_1 = [
  [[.07, .12], [.13, .12]], [[.10, .09], [.10, .17]],                          // +
  [[.20, .09], [.20, .17]], [[.20, .09], [.26, .09]], [[.20, .13], [.25, .13]],
  [[.34, .10], [.38, .16], [.42, .10]], [[.35, .13], [.41, .13]],
  [[.50, .09], [.56, .09], [.50, .13], [.56, .13], [.50, .17], [.56, .17]],
  [[.07, .30], [.14, .24], [.21, .30], [.28, .24], [.35, .30]],
  [[.07, .44], [.30, .44]], [[.07, .52], [.24, .52]],
  [[.45, .30], [.45, .52]], [[.45, .30], [.60, .30], [.60, .40], [.45, .40]],
];
const WORK_2 = [
  [[.08, .20], [.30, .20]], [[.08, .30], [.42, .30]], [[.08, .40], [.26, .40]],
  [[.55, .18], [.62, .30], [.69, .18]], [[.57, .25], [.67, .25]],
  [[.08, .58], [.36, .58]], [[.08, .68], [.50, .68]],
];
const shot = async (p, name, sel) => {
  const t = sel ? await p.$(sel) : p;
  await (t.screenshot ? t : p).screenshot({ path: path.join(OUT, name + '.png') });
  console.log(name);
};

// 1 — desktop split, unchanged
{
  const p = await open(1536, 1024);
  for (const s of WORK_1) await draw(p, s);
  await shot(p, '01-desktop-split-unchanged');
  // 7 — Page 1 / Page 2 hold different ink
  await p.click('[data-mx-sheet-add]');
  for (const s of WORK_2) await draw(p, s);
  await shot(p, '07b-page-2-ink');
  await p.click('[data-mx-sheet="w1"]'); await p.waitForTimeout(150);
  await shot(p, '07a-page-1-ink');
  // 8 — away and back
  await p.evaluate(() => go(0)); await p.waitForTimeout(200);
  await p.evaluate(() => go(4)); await p.waitForTimeout(300);
  await shot(p, '08-navigate-away-and-back');
  // 9 — the drawer, with the workbook state intact
  await p.evaluate(() => rpNavToggle()); await p.waitForTimeout(200);
  await shot(p, '09-drawer-open-state-retained');
  // 10 — the mode is lesson-wide, and non-destructive
  const bundle = await p.evaluate(() => {
    const d = tpRespGet('practice-equations', 'workbook');
    d.value.text.pages[0].text = 'y = x² so when x = 3, y = 9';
    document.querySelector('[data-mx-resp="type"]').click();
    document.querySelector('[data-mx-resp="write"]').click();
    const b = tpRespBundle().pages['practice-equations'].workbook;
    return { kind: b.kind, mode: b.value.mode,
      ink: { current: b.value.ink.current, pages: b.value.ink.pages.map((x) => ({ id: x.id, strokes: x.strokes.length })) },
      text: { current: b.value.text.current, pages: b.value.text.pages.map((x) => ({ id: x.id, chars: x.text.length })) } };
  });
  const q = await browser.newPage({ viewport: { width: 940, height: 700 }, deviceScaleFactor: 2 });
  await q.setContent(`<style>body{margin:0;background:#EEF1EF;font:13px/1.5 system-ui,sans-serif;color:#15181A;}
    .w{padding:22px;} h1{font:600 18px/1.2 system-ui;margin:0 0 3px;} p{color:#6B7370;margin:0 0 14px;font-size:12.5px;}
    pre{margin:0;background:#fff;border:1px solid #D6DBD8;border-radius:10px;padding:16px 18px;
      font:12.5px/1.55 ui-monospace,SFMono-Regular,Menlo,monospace;white-space:pre-wrap;} b{color:#0F7A4C;}</style>
    <div class="w"><h1>Response mode is lesson-wide, and switching it destroys nothing</h1>
    <p>One response, one <code>mode</code>, two retained modalities with the SAME sheet ids. Captured after write → type → write.</p>
    <pre>${JSON.stringify(bundle, null, 2).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/"(mode|ink|text|w1|w2|workbook)"/g, '<b>"$1"</b>')}</pre></div>`);
  await q.waitForTimeout(200);
  const h = await q.evaluate(() => document.querySelector('.w').getBoundingClientRect().height);
  await q.setViewportSize({ width: 940, height: Math.ceil(h) });
  await shot(q, '10-response-mode-is-lesson-wide');
  await q.close(); await p.close();
}
// 2 · 3 — portrait tablet: Questions and Workbook
{
  const p = await open(900, 1100);
  await shot(p, '02-tablet-portrait-questions');
  await p.click('.mx-viewsw [data-mx-view="workbook"]'); await p.waitForTimeout(200);
  for (const s of WORK_2) await draw(p, s);
  await shot(p, '03-tablet-portrait-workbook');
  await p.close();
}
// 4 — wide tablet split, only because both panes clear their minima
{
  const p = await open(1180, 900);
  await p.evaluate(() => rpNavToggle()); await p.waitForTimeout(420);
  const fit = await p.evaluate(() => ({ fit: document.querySelector('.mx').dataset.mxFit,
    q: document.querySelector('.mx-content').offsetWidth, w: document.querySelector('.mx-work').offsetWidth,
    h: document.querySelector('.mx-sheet').offsetHeight }));
  if (fit.fit === 'split') { for (const s of WORK_1.slice(0, 9)) await draw(p, s); await shot(p, '04-tablet-wide-split'); }
  console.log(`   (4: 1180x900 with the rail collapsed resolves to "${fit.fit}" — questions ${fit.q}px, workbook ${fit.w}px, sheet ${fit.h}px)`);
  await p.close();
}
// 5 · 6 — the table: fitting normally, and a wide authored one scrolling locally
{
  const p = await open(1536, 1024);
  await shot(p, '05-table-fits', '.mx-content');
  await p.close();
  const w = await open(1536, 1024, WIDE, 0);
  await w.evaluate(() => { const el = document.querySelector('.mx-tblwrap'); el.scrollLeft = el.scrollWidth * 0.45; });
  await w.waitForTimeout(150);
  await shot(w, '06-wide-table-local-scroll', '.mx-content');
  await w.close();
}
await browser.close(); server.close();
console.log('\nwrote ' + path.relative(root, OUT));
