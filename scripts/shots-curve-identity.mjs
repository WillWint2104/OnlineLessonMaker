#!/usr/bin/env node
// CURVE IDENTITY — what the maintainer is being asked to look at.
//
//   node scripts/shots-curve-identity.mjs            # → docs/atlas/figure-identity/
//   node scripts/shots-curve-identity.mjs --out DIR
//
// Three painted cases and one panel, from the fixture the figure-render baseline now carries:
//   1 · five gradients through one intercept, each with its own pen and its own name
//   2 · a quiet "before" curve against a dash-dot "after"
//   3 · THE CONTROL — a figure whose curves carry names and which does not ask for them. It must look
//       exactly as it did before curve identity existed: one stroke, no names. If capture 3 shows names,
//       the opt-in has leaked and two committed lessons have moved.
//   4 · the panel, with Pen and Curve names where a teacher meets them.
//
// Each capture also prints what was MEASURED, because a picture of five curves is not evidence that they
// are five different marks — the distinct painted strokes are.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const OUT = path.resolve(root, argv.includes('--out') ? argv[argv.indexOf('--out') + 1] : 'docs/atlas/figure-identity');
const MIME = { '.html': 'text/html', '.json': 'application/json', '.woff2': 'font/woff2', '.png': 'image/png', '.svg': 'image/svg+xml', '.js': 'text/javascript', '.css': 'text/css', '.glb': 'model/gltf-binary' };
const FIX = JSON.parse(fs.readFileSync(path.join(root, 'tests/visual/lessons/figure-curve-identity.json'), 'utf8'));

const server = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]);
  const f = path.join(root, u === '/' ? '/lesson-studio.html' : u);
  if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' });
  res.end(fs.readFileSync(f));
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}/lesson-studio.html`;

fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const p = await browser.newPage({ viewport: { width: 1440, height: 960 }, deviceScaleFactor: 2 });
const errs = [];
p.on('pageerror', (e) => errs.push(String(e)));
await p.goto(base, { waitUntil: 'load' });
await p.evaluate((L) => { LESSON = JSON.parse(JSON.stringify(L)); render(); }, FIX);

const CAPS = [
  ['1-five-pens', 0, 'five gradients through one intercept'],
  ['2-before-after', 1, 'a quiet original against a dash-dot transform'],
  ['3-untouched', 2, 'CONTROL — labels written, none asked for: this must not change'],
];
for (const [name, slide, why] of CAPS) {
  await p.evaluate((i) => go(i), slide);
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(200);
  const m = await p.evaluate(() => ({
    strokes: [...new Set([...document.querySelectorAll('#slide .tp-fig-svg polyline')]
      .map((e) => { const c = getComputedStyle(e); return `${c.stroke} / ${c.strokeWidth} / ${c.strokeDasharray}`; }))],
    names: [...document.querySelectorAll('#slide .tp-fig-fnlab')].map((e) => e.textContent),
    errors: +(document.querySelector('#slide [data-tp-fig-errors]') || {}).dataset?.tpFigErrors || 0 }));
  const el = await p.$('#slide .tp-fig');
  if (el) await el.screenshot({ path: path.join(OUT, `${name}.png`) });
  console.log(`\n· ${name} — ${why}`);
  console.log(`    ${m.strokes.length} distinct painted stroke(s)`);
  m.strokes.forEach((s) => console.log(`      ${s}`));
  console.log(`    ${m.names.length} curve name(s) drawn${m.names.length ? ': ' + m.names.join(' · ') : ''}`);
  console.log(`    ${m.errors} figure error(s)`);
}

/* THE PANEL. The two controls this stage adds, photographed where a teacher meets them rather than
   described. The fixture above is a composable PAGE lesson — the mathematics inspector answers for the
   responsive pages — so the panel is shown on a mathematics worked-examples page carrying the same three
   lines, with the first curve selected. */
await p.evaluate(() => {
  LESSON = { meta: { title: 'Curve identity', theme: 'mathematics', stage: 'NSW Stage 5', year: 'Year 9' },
    slides: [{ type: 'workedExamples', id: 'wex', navLabel: 'Comparing steepness', title: 'Comparing steepness',
      lede: 'Three gradients through one intercept.',
      groups: [{ id: 'g1', type: 'sequence', title: 'Three gradients', lede: 'Same intercept, different slope.',
        relations: [{ kind: 'figure', figure: { type: 'figure', figure: 'graph', aspect: 'equal', grid: 'shown',
          curveLabels: 'shown', domain: { xMin: -5, xMax: 5, yMin: -4, yMax: 6 },
          objects: [{ type: 'function', f: '2x+1', label: 'y = 2x + 1' },
                    { type: 'function', f: 'x+1', pen: 'dashed', label: 'y = x + 1' },
                    { type: 'function', f: '(1/2)x+1', pen: 'dotted', label: 'y = \u00bdx + 1' }] } }],
        examples: [{ id: 'e1', label: 'Reading a gradient', prompt: 'Which line is steepest, and how do you know?',
          steps: [{ id: 's1', text: 'Compare the coefficient of _x_.', math: '2 > 1 > 1/2' }],
          answer: '_y_ = 2_x_ + 1 is the steepest.' }] }] }] };
  cur = 0; render(); go(0); document.querySelector('#modeSeg [data-mode="edit"]').click();
});
await p.waitForTimeout(400);
await p.evaluate(() => { selZone = 'mx.o.0.0'; renderSlide(); });
await p.waitForTimeout(400);
const panel = await p.evaluate(() => {
  const ins = document.querySelector('#inspector');
  return { fields: [...ins.querySelectorAll('.isec label')].map((l) => l.textContent.trim()).filter(Boolean),
    pens: [...(ins.querySelector('[data-bind$=".pen"]') || { options: [] }).options].map((o) => o.textContent.trim()) };
});
await p.screenshot({ path: path.join(OUT, '4-panel.png') });
console.log(`\n· 4-panel — the editor, first curve selected`);
console.log(`    the curve's fields: ${panel.fields.join(' · ')}`);
console.log(`    the pens on offer: ${panel.pens.join(' · ')}`);
console.log(`\npage errors: ${errs.length ? errs.slice(0, 2).join(' | ') : 'none'}`);
console.log(`written to ${path.relative(root, OUT)}`);
await browser.close(); server.close();
process.exit(errs.length ? 1 : 0);
