#!/usr/bin/env node
// THE STAGE B2 PROOF SET — Type mode.
//
//   node scripts/shots-type.mjs [outDir]
//
// Every character in these images was typed through the real surface and every equation was built in the
// app's own TPMath editor; every state was reached by using the page, not by posing it.
// scripts/verify-workbook.mjs (section `mode`) is the gate; this is the picture of what it asserts.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.resolve(process.argv[2] || path.join(root, 'screenshots', 'type'));
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
// Handwriting-shaped strokes for Q1 — the ink that Type must not disturb.
const WORK_1 = [
  [[.07, .12], [.13, .12]], [[.10, .09], [.10, .17]],
  [[.20, .09], [.20, .17]], [[.20, .09], [.26, .09]], [[.20, .13], [.25, .13]],
  [[.34, .10], [.38, .16], [.42, .10]], [[.35, .13], [.41, .13]],
  [[.50, .09], [.56, .09], [.50, .13], [.56, .13], [.50, .17], [.56, .17]],
  [[.07, .30], [.14, .24], [.21, .30], [.28, .24], [.35, .30]],
  [[.07, .44], [.30, .44]], [[.07, .52], [.24, .52]],
];
const shot = async (p, name, sel) => {
  const t = sel ? await p.$(sel) : p;
  await (t.screenshot ? t : p).screenshot({ path: path.join(OUT, name + '.png') });
  console.log(name);
};
const type = async (p, lines) => {
  await p.click('[data-mx-typed]');
  for (let i = 0; i < lines.length; i++) { if (i) await p.keyboard.press('Enter'); await p.keyboard.type(lines[i]); }
};
// Build an equation in TPMath's own editor — typed into the editor's own field, with its own key handling
// (`^` opens a superscript), and its own symbol buttons for what a keyboard has no key for.
const equation = async (p, tokens) => {
  await p.click('[data-mx-tsel="eq"]'); await p.waitForTimeout(250);
  await p.click('[data-tp-eqfield]');
  for (const t of tokens) {
    if (t[0] === '#') await p.evaluate((c) => { const b = [...document.querySelectorAll('.tp-eqsym')].find((x) => x.textContent === c); if (b) b.click(); }, t.slice(1));
    else await p.keyboard.press(t);
    await p.waitForTimeout(35);
  }
};
const panel = async (title, note, body, name) => {
  const q = await browser.newPage({ viewport: { width: 940, height: 700 }, deviceScaleFactor: 2 });
  await q.setContent(`<style>body{margin:0;background:#EEF1EF;font:13px/1.5 system-ui,sans-serif;color:#15181A;}
    .w{padding:22px;} h1{font:600 18px/1.2 system-ui;margin:0 0 3px;} p{color:#6B7370;margin:0 0 14px;font-size:12.5px;}
    pre{margin:0;background:#fff;border:1px solid #D6DBD8;border-radius:10px;padding:16px 18px;
      font:12.5px/1.55 ui-monospace,SFMono-Regular,Menlo,monospace;white-space:pre-wrap;} b{color:#0F7A4C;}</style>
    <div class="w"><h1>${title}</h1><p>${note}</p><pre>${body.replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/"(mode|ink|text|w1|w2|w3|workbook)"/g, '<b>"$1"</b>')}</pre></div>`);
  await q.waitForTimeout(200);
  const h = await q.evaluate(() => document.querySelector('.w').getBoundingClientRect().height);
  await q.setViewportSize({ width: 940, height: Math.ceil(h) });
  await shot(q, name);
  await q.close();
};
const state = (p) => p.evaluate(() => { const d = tpRespGet('practice-equations', 'workbook').value;
  return { mode: d.mode, current: d.current, pages: d.pages.map((x) => ({ id: x.id, ink: x.ink.length, text: x.text.length })) }; });

// ── 1 · 2 · 3 · 4 · 5 · 6 · 7 · 8 · 9 — one continuous session on one desktop page ────────────────
{
  const p = await open(1536, 1024);
  // Write first: ink on Page 1, which everything after this must return intact.
  for (const s of WORK_1) await draw(p, s);
  await shot(p, '01-write-page-1-ink');
  // 2 — Type replaces the workbook surface, and only that.
  await p.click('[data-mx-resp="type"]'); await p.waitForTimeout(300);
  await shot(p, '02-type-mode-empty-page');
  // 3 — the equation bar: the app's own TPMath editor, opened in place.
  await type(p, ['Substituting x = 3 into the rule:']);
  await equation(p, ['y', '=', 'x', '^', '2']);
  await shot(p, '03-equation-bar-open');
  // 4 — inserted, rendered inline, and the prose carries on around it.
  await p.click('[data-mx-eqok]'); await p.waitForTimeout(250);
  await type(p, ['', 'so y = 9 when x = 3.']);
  await p.evaluate(() => document.querySelector('[data-mx-typed]').blur()); await p.waitForTimeout(150);
  await shot(p, '04-typed-page-with-equation');
  // 5 — Page 2 in Type: the same tabs, its own content.
  await p.click('[data-mx-sheet-add]'); await p.waitForTimeout(250);
  await type(p, ['Question 2 — gradient of the line through (1, 2) and (4, 11):']);
  await equation(p, ['m', '=', '3']);
  await p.click('[data-mx-eqok]'); await p.waitForTimeout(200);
  await p.evaluate(() => document.querySelector('[data-mx-typed]').blur()); await p.waitForTimeout(150);
  await shot(p, '05-type-page-2');
  // 6 — back to Page 1: its typed work is exactly as it was left.
  await p.click('[data-mx-sheet="w1"]'); await p.waitForTimeout(250);
  await shot(p, '06-type-page-1-restored');
  // 7 — Write again: the original ink, untouched by any of that.
  await p.click('[data-mx-resp="write"]'); await p.waitForTimeout(300);
  await shot(p, '07-write-ink-restored');
  const afterRound = await state(p);
  // 8 — away and back, then the drawer, still in Type.
  await p.click('[data-mx-resp="type"]'); await p.waitForTimeout(250);
  await p.evaluate(() => { go(0); }); await p.waitForTimeout(250);
  await p.evaluate(() => { go(4); }); await p.waitForTimeout(350);
  await shot(p, '08-type-after-navigation');
  await p.evaluate(() => rpNavToggle()); await p.waitForTimeout(300);
  await shot(p, '09-type-with-drawer-open');
  const afterAll = await state(p);
  await panel('Type mode: nothing is recreated, renumbered or emptied',
    'The same response, before and after Write→Type→Write, a page change, a navigation and the drawer. '
    + 'One sheet list; both modalities live on each sheet; <code>mode</code> sits alongside them and never decides which is retained.',
    'after Write → Type → Page 2 → Page 1 → Write:\n' + JSON.stringify(afterRound, null, 2)
    + '\n\nafter navigating away and back, and opening the drawer:\n' + JSON.stringify(afterAll, null, 2),
    'C1-nothing-renumbered');
  // CONTROL 2 — what separate per-modality page lists would have done.
  const diverge = await p.evaluate(() => { const d = tpRespGet('practice-equations', 'workbook').value;
    const ink = d.pages.map((x) => x.id), text = d.pages.map((x) => x.id);
    text.push('w3');                                   // Type adds a page while Write is not looking
    return { real: d.pages.map((x) => x.id), wouldBe: { ink, text } }; });
  await panel('CONTROL: two page lists could diverge — one shared list cannot',
    'Sheets are a property of the WORKBOOK, not of the input technology. If each modality kept its own list, '
    + 'adding a page in Type would give the two a different idea of what “Page 3” is. The real payload has one list.',
    'if the modalities kept separate lists:\n' + JSON.stringify(diverge.wouldBe, null, 2)
    + '\n\nthe real payload:\n' + JSON.stringify({ pages: diverge.real }, null, 2), 'C2-separate-lists-would-diverge');
  // CONTROL 3 — what a destructive switch would have cost.
  const destructive = await p.evaluate(() => { const d = tpRespGet('practice-equations', 'workbook').value;
    const copy = JSON.parse(JSON.stringify(d)); copy.pages.forEach((x) => { x.text = []; });
    return { real: d.pages.map((x) => ({ id: x.id, ink: x.ink.length, text: x.text.length })),
      destroyed: copy.pages.map((x) => ({ id: x.id, ink: x.ink.length, text: x.text.length })) }; });
  await panel('CONTROL: a switch that cleared the other modality would look like this',
    'The check that Write→Type→Write is non-destructive is only worth something if a destructive switch would have shown. It would.',
    'retained (real):\n' + JSON.stringify(destructive.real, null, 2)
    + '\n\nwhat a destructive switch leaves:\n' + JSON.stringify(destructive.destroyed, null, 2), 'C3-destructive-switch');
  await p.close();
}
// ── 10 — Expand, and the narrow layout, both in Type ──────────────────────────────────────────────
{
  const p = await open(1536, 1024);
  await p.click('[data-mx-resp="type"]'); await p.waitForTimeout(300);
  await type(p, ['Q7 — a rectangle of area 36 m², length x and width x − 2:']);
  await equation(p, ['x', '(', 'x', '#−', '2', 'ArrowRight', '=', '3', '6']);
  await p.click('[data-mx-eqok]'); await p.waitForTimeout(200);
  await type(p, ['', 'so x² − 2x − 36 = 0.']);
  await p.evaluate(() => document.querySelector('[data-mx-typed]').blur()); await p.waitForTimeout(150);
  await p.evaluate(() => mxSetView('workbook')); await p.waitForTimeout(300);
  await shot(p, '10a-type-expanded');
  await p.close();
  const n = await open(900, 1100);
  await n.click('[data-mx-resp="type"]'); await n.waitForTimeout(300);
  await shot(n, '10b-narrow-questions');
  await n.click('.mx-viewsw [data-mx-view="workbook"]'); await n.waitForTimeout(250);
  await type(n, ['Q1  3 + 5 × 2 = 13', '', 'because × is done first.']);
  await n.evaluate(() => document.querySelector('[data-mx-typed]').blur()); await n.waitForTimeout(150);
  await shot(n, '10c-narrow-type-workbook');
  await n.click('.mx-viewsw [data-mx-view="questions"]'); await n.waitForTimeout(200);
  await n.click('.mx-viewsw [data-mx-view="workbook"]'); await n.waitForTimeout(250);
  await shot(n, '10d-narrow-type-retained');
  await n.close();
}
await browser.close(); server.close();
console.log('\nwrote ' + path.relative(root, OUT));
