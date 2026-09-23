#!/usr/bin/env node
/* ── A LESSON, AS A STUDENT MEETS IT ─────────────────────────────────────────────────────────────
   node scripts/shots-lesson-review.mjs --lesson <path.json> --out <dir> [--width 1536] [--height 960]

   Loads a lesson into lesson-studio.html THROUGH THE APP'S OWN ⌗ JSON DIALOG — the supported
   lesson-loading workflow, not by assigning LESSON — puts the app in STUDY mode, and photographs
   every page and every tab state at a desktop viewport.

   A MATHEMATICS PAGE DOES NOT SCROLL THE DOCUMENT. `.mx-page` is the scroller and the document never
   scrolls, so a viewport, `fullPage` or element screenshot all stop at the fold; a capture made that
   way once reported two pages whose tables read "0" and "99" as identical. So the viewport is GROWN
   by the scroller's own overflow before each shot, and what is photographed is `.mx-page` itself.

   Every capture is printed with what was MEASURED on it — a picture of a page is not evidence that
   its content is there. */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (n, d) => { const k = process.argv.indexOf('--' + n); return k > 0 && process.argv[k + 1] ? process.argv[k + 1] : d; };
const LESSON_PATH = path.resolve(root, arg('lesson', 'docs/atlas/lesson/quadratics.app.json'));
const OUT = path.resolve(root, arg('out', 'docs/review/lesson'));
const W = +arg('width', 1536), H = +arg('height', 960);
const LESSON_TEXT = fs.readFileSync(LESSON_PATH, 'utf8');
const LESSON = JSON.parse(LESSON_TEXT);
fs.mkdirSync(OUT, { recursive: true });

const MIME = { '.html': 'text/html', '.json': 'application/json', '.woff2': 'font/woff2', '.png': 'image/png',
  '.svg': 'image/svg+xml', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.glb': 'model/gltf-binary' };
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]);
  const f = path.join(root, u === '/' ? '/lesson-studio.html' : u);
  if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' });
  res.end(fs.readFileSync(f));
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}/lesson-studio.html`;

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const p = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 2 });
const errs = [];
p.on('pageerror', (e) => errs.push(String(e)));
p.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
await p.goto(base, { waitUntil: 'load' });

/* THE SUPPORTED LOADING WORKFLOW: open ⌗ JSON, paste the file's text, press Load JSON. If the app
   rejects it, that IS the finding — report it and stop rather than falling back to assigning LESSON. */
await p.evaluate(() => { const b = [...document.querySelectorAll('button')].find((e) => /json/i.test(e.textContent || '')); if (b) b.click(); });
await p.waitForTimeout(250);
const loaded = await p.evaluate((t) => { const a = document.getElementById('jsonArea');
  if (!a) return { ok: false, why: 'no ⌗ JSON dialog in this build' };
  a.value = t; document.getElementById('jsonLoad').click();
  const err = document.getElementById('jsonErr').textContent.trim();
  return { ok: !err, why: err, title: LESSON.meta.title, theme: LESSON.meta.theme, slides: LESSON.slides.length }; }, LESSON_TEXT);
if (!loaded.ok) { console.error(`THE APP REFUSED THE LESSON: ${loaded.why}`); await browser.close(); server.close(); process.exit(1); }
console.log(`loaded through ⌗ JSON — "${loaded.title}" · theme ${loaded.theme} · ${loaded.slides} pages · viewport ${W}×${H}\n`);

/* STUDY MODE, explicitly — the mode a student is in. */
await p.evaluate(() => { const b = document.querySelector('#modeSeg [data-mode="study"]'); if (b) b.click(); });
await p.waitForTimeout(250);

const shots = [];
const grow = async () => {
  await p.setViewportSize({ width: W, height: H });
  await p.waitForTimeout(160);
  const need = await p.evaluate(() => [...document.querySelectorAll('.mx-page,.mx-content,.mx-main,.mx-split,.mx')]
    .filter((e) => e.scrollHeight > e.clientHeight + 2)
    .reduce((n, e) => Math.max(n, e.scrollHeight - e.clientHeight), 0));
  if (need > 0) { await p.setViewportSize({ width: W, height: Math.min(9000, H + need + 80) }); await p.waitForTimeout(220); }
  return need;
};
const measure = () => p.evaluate(() => {
  const host = document.querySelector('.mx-page') || document.body;
  const R = (e) => e.getBoundingClientRect();
  const vis = (e) => e.offsetParent !== null && R(e).height > 0;
  return {
    chars: host.innerText.replace(/\s+/g, ' ').trim().length,
    tabs: [...document.querySelectorAll('[data-mx-tab]')].map((e) => e.textContent.trim()),
    examples: document.querySelectorAll('.mx-wexex').length,
    steps: document.querySelectorAll('.mx-step').length,
    items: document.querySelectorAll('.mx-item').length,
    concepts: document.querySelectorAll('.mx-concept').length,
    tables: document.querySelectorAll('.mx-tbl').length,
    inputs: document.querySelectorAll('.mx-cell, .mx-page input, .mx-page textarea').length,
    figures: document.querySelectorAll('.tp-fig').length,
    figErrs: [...document.querySelectorAll('[data-tp-fig-errors]')].reduce((a, e) => a + (+e.dataset.tpFigErrors || 0), 0),
    videoFrame: !!document.querySelector('.mx-video'),
    videoIsImage: (document.querySelector('.mx-video') || {}).getAttribute
      ? document.querySelector('.mx-video').getAttribute('role') : null,
    iframes: document.querySelectorAll('.mx-page iframe, .mx iframe').length,
    placeholder: [...document.querySelectorAll('.mx-ph')].map((e) => e.textContent.trim()),
    /* anything the browser clipped or overflowed — measured, not eyeballed */
    clipped: [...document.querySelectorAll('.mx-page *')].filter(vis)
      .filter((e) => e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).overflowX !== 'auto' && getComputedStyle(e).overflowX !== 'scroll')
      .map((e) => `${e.className || e.tagName} ${e.scrollWidth}>${e.clientWidth}`).slice(0, 4),
  };
});
const shoot = async (name, caption) => {
  const need = await grow();
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(160);
  const el = await p.$('.mx-page') || await p.$('.mx');
  const file = path.join(OUT, name + '.png');
  if (el) await el.screenshot({ path: file }); else await p.screenshot({ path: file });
  const m = await measure();
  const size = fs.statSync(file).size;
  shots.push({ name, caption, ...m, grown: need, kb: Math.round(size / 1024) });
  console.log(`· ${name} — ${caption}`);
  console.log(`    ${m.chars} chars${need ? `, grown ${need}px past the fold` : ''} · ${m.examples} example(s) · ${m.steps} step(s) · ${m.items} numbered item(s) · ${m.concepts} concept(s) · ${m.tables} table(s) · ${m.inputs} input(s) · ${m.figures} figure(s)`);
  if (m.tabs.length) console.log(`    tabs: ${m.tabs.join(' | ')}`);
  if (m.videoFrame) console.log(`    video frame present · role="${m.videoIsImage}" · ${m.iframes} iframe(s) on the page`);
  if (m.placeholder.length) console.log(`    PLACEHOLDER TEXT: ${m.placeholder.map((t) => JSON.stringify(t)).join(' · ')}`);
  if (m.clipped.length) console.log(`    CLIPPED/OVERFLOWING: ${m.clipped.join(' · ')}`);
  if (m.figErrs) console.log(`    FIGURE ERRORS: ${m.figErrs}`);
};

for (let i = 0; i < LESSON.slides.length; i++) {
  const s = LESSON.slides[i];
  await p.evaluate((j) => go(j), i);
  await p.waitForTimeout(320);
  const n = String(i).padStart(2, '0');
  await shoot(`${n}-${String(s.navLabel || s.type).replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`, `${s.type} — ${s.navLabel}`);
  /* A TAB IS A DIFFERENT PAGE OF TEACHING, not a decoration: photograph each one. */
  const tabs = await p.evaluate(() => [...document.querySelectorAll('[data-mx-tab]')].map((e) => e.dataset.mxTab));
  for (let t = 1; t < tabs.length; t++) {
    await p.click(`[data-mx-tab="${tabs[t]}"]`);
    await p.waitForTimeout(320);
    await shoot(`${n}-${String(s.navLabel).replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-tab${t + 1}`, `${s.navLabel} — tab ${t + 1} of ${tabs.length}`);
  }
}

console.log(`\npage errors: ${errs.length ? errs.slice(0, 4).join(' | ') : 'none'}`);
console.log(`${shots.length} capture(s) → ${path.relative(root, OUT)}`);
fs.writeFileSync(path.join(OUT, 'captures.json'), JSON.stringify({ lesson: path.relative(root, LESSON_PATH), viewport: `${W}x${H}`, shots }, null, 1) + '\n');
await browser.close(); server.close();
process.exit(errs.length ? 1 : 0);
