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

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const open = async (w, h) => {
  const p = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
  await p.goto(base, { waitUntil: 'load' });
  await p.evaluate(({ L, slide }) => { LESSON = JSON.parse(JSON.stringify(L)); render(); go(slide); }, { L: FIX, slide: PRACTICE });
  await p.waitForTimeout(200);
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

// 1 · 2 · 3 · 4 · 5 — desktop
{
  const p = await open(1536, 1024);
  for (const s of WORK_1) await draw(p, s);
  await shot(p, '01-desktop-with-ink');
  await p.evaluate(() => { document.querySelector('.mx-content').scrollTop = 520; });
  await p.waitForTimeout(120);
  await shot(p, '02-questions-scrolled-workbook-stationary');
  await p.click('[data-mx-sheet-add]');
  for (const s of WORK_2) await draw(p, s);
  await shot(p, '03b-workbook-page-2');
  await p.click('[data-mx-sheet="w1"]');
  await p.waitForTimeout(120);
  await shot(p, '03a-workbook-page-1');
  await p.evaluate(() => { go(0); });
  await p.waitForTimeout(200);
  await p.evaluate(() => { go(4); });
  await p.waitForTimeout(250);
  await shot(p, '04-after-navigating-away-and-back');
  await p.click('.mx-wsbar [data-mx-view="workbook"]');
  await p.waitForTimeout(180);
  await shot(p, '05-expanded-workspace');
  // 10 — the bundle
  const bundle = await p.evaluate(() => {
    const b = tpRespBundle(), out = { errors: b.errors, pages: {} };
    for (const [pid, resp] of Object.entries(b.pages)) { out.pages[pid] = {};
      for (const [rid, e] of Object.entries(resp)) {
        out.pages[pid][rid] = e.kind !== 'ink' ? e
          : { kind: e.kind, value: { current: e.value.current,
              pages: e.value.pages.map((s) => ({ id: s.id, strokes: s.strokes.length })) } }; } }
    return out;
  });
  const q = await browser.newPage({ viewport: { width: 900, height: 700 }, deviceScaleFactor: 2 });
  await q.setContent(`<style>body{margin:0;background:#EEF1EF;font:13px/1.5 system-ui,sans-serif;color:#15181A;}
    .w{padding:22px;} h1{font:600 18px/1.2 system-ui;margin:0 0 3px;} p{color:#6B7370;margin:0 0 14px;font-size:12.5px;}
    pre{margin:0;background:#fff;border:1px solid #D6DBD8;border-radius:10px;padding:16px 18px;
      font:12.5px/1.55 ui-monospace,SFMono-Regular,Menlo,monospace;white-space:pre-wrap;}
    b{color:#0F7A4C;}</style><div class="w"><h1>Response bundle — workbook attributed to stable authored ids</h1>
    <p>tpRespBundle(), after the work above. Stroke arrays are summarised by length; nothing here is a position.</p>
    <pre>${JSON.stringify(bundle, null, 2).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/(&quot;|")(practice-equations|workbook|w1|w2|q2)\1/g, '<b>"$2"</b>')}</pre></div>`);
  await q.waitForTimeout(200);
  const h = await q.evaluate(() => document.querySelector('.w').getBoundingClientRect().height);
  await q.setViewportSize({ width: 900, height: Math.ceil(h) });
  await shot(q, '10-response-bundle');
  await q.close(); await p.close();
}
// 6 — tablet
{ const p = await open(900, 1100); for (const s of WORK_1.slice(0, 8)) await draw(p, s);
  await shot(p, '06-tablet'); await p.close(); }
// 7 · 8 · 9 — phone
{
  const p = await open(414, 860);
  await p.evaluate(() => { document.querySelector('.mx-page').scrollTop = 260; });
  await p.waitForTimeout(120);
  await shot(p, '07-phone-questions');
  await p.click('.mx-viewsw [data-mx-view="workbook"]');
  await p.waitForTimeout(150);
  for (const s of WORK_2) await draw(p, s);
  await shot(p, '08-phone-workbook');
  await p.evaluate(() => rpNavToggle());
  await p.waitForTimeout(150);
  await shot(p, '09-phone-drawer-no-state-loss');
  await p.close();
}
await browser.close(); server.close();
console.log('\nwrote ' + path.relative(root, OUT));
