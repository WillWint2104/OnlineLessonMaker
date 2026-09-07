#!/usr/bin/env node
// THE STAGE C PROOF SET — Notes and Worked Examples, rendered from the authored quadratic lesson.
//
//   node scripts/shots-notes-examples.mjs [outDir]
//
// Every page here is drawn from tests/visual/lessons/mathematics-shell.json. Nothing is posed: the tabs,
// their labels and their order, the concept list, the examples and their steps are what the JSON says.
// scripts/verify-notes-examples.mjs is the gate; this is the picture of what it asserts.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.resolve(process.argv[2] || path.join(root, 'screenshots', 'notes-examples'));
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
const NOTES = FIX.slides.findIndex((s) => s.type === 'notes');
const WEX = FIX.slides.findIndex((s) => s.type === 'workedExamples');

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const open = async (w, h, slide, L = FIX) => {
  const p = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
  await p.goto(base, { waitUntil: 'load' });
  await p.evaluate(({ L, s }) => { LESSON = JSON.parse(JSON.stringify(L)); render(); go(s); }, { L, s: slide });
  await p.waitForTimeout(520);
  return p;
};
const shot = async (p, name, sel) => {
  const t = sel ? await p.$(sel) : p;
  await (t && t.screenshot ? t : p).screenshot({ path: path.join(OUT, name + '.png') });
  console.log(name);
};
// 1 · 2 · 3 — the three authored representations
{
  const p = await open(1536, 1024, NOTES);
  await shot(p, '01-notes-graph');
  await p.click('[data-mx-tab="table"]'); await p.waitForTimeout(300);
  await shot(p, '02-notes-table');
  await p.click('[data-mx-tab="coordinates"]'); await p.waitForTimeout(300);
  await shot(p, '03-notes-coordinates');
  await p.close();
}
// 4 — the same page with no Key Idea authored
{
  const noKI = JSON.parse(JSON.stringify(FIX));
  delete noKI.slides[NOTES].keyIdea;
  const p = await open(1536, 1024, NOTES, noKI);
  await shot(p, '04-notes-without-key-idea');
  await p.close();
}
// 5 · 6 · 7 — worked examples: short, long, and one with a visual
{
  const p = await open(1536, 1024, WEX);
  await shot(p, '05-examples-1-evaluate');
  await p.click('[data-mx-tab="ex-symmetry"]'); await p.waitForTimeout(320);
  await shot(p, '06-examples-3-longer-solution');
  await p.click('[data-mx-tab="ex-solve"]'); await p.waitForTimeout(420);
  await shot(p, '07-examples-2-with-a-visual');
  await p.close();
}
// 8 · 9 — narrow
{
  const p = await open(900, 1180, NOTES);
  await shot(p, '08-notes-narrow');
  await p.close();
  const q = await open(900, 1180, WEX);
  await q.click('[data-mx-tab="ex-solve"]'); await q.waitForTimeout(400);
  await shot(q, '09-examples-narrow');
  await q.close();
}
// 10 — the flat output: everything, not just the open tabs
{
  const p = await open(1180, 1024, NOTES);
  await p.evaluate(() => openWorksheet());
  await p.waitForTimeout(700);
  const h = await p.evaluate(() => Math.min(6000, Math.ceil(document.querySelector('#wsSheet').getBoundingClientRect().height) + 40));
  await p.setViewportSize({ width: 1180, height: h });
  await p.waitForTimeout(500);
  await shot(p, '10-flat-worksheet-everything', '#wsSheet');
  const n = await p.evaluate(() => { const s = document.querySelector('#wsSheet');
    return { reps: s.querySelectorAll('.ws-mx-reph').length, exs: s.querySelectorAll('.ws-mx-exh').length,
      steps: s.querySelectorAll('.ws-mx-steps li').length }; });
  console.log(`   (10: ${n.reps} representation headings, ${n.exs} examples, ${n.steps} solution steps — all of them, none behind a tab)`);
  await p.close();
}
await browser.close(); server.close();
console.log('\nwrote ' + path.relative(root, OUT));
