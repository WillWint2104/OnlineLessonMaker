#!/usr/bin/env node
/* Stage 3d — the MEASUREMENT SURFACE gate.
 *
 * Why this exists. The chip shipped with three separate defects that every existing check called green:
 * verify-corpus-identity's `isLesson` regex structurally excludes tests/visual/lessons/, so it never renders a
 * figure fixture at all; verify-label-placement's fixtures contain no geometry; and verify-geometry-semantics
 * asserts where a label's CENTRE sits, which a chip whose text overflows its own rect satisfies perfectly.
 * A treatment nothing renders is a treatment nothing defends. This script renders it, in every pack, and
 * asserts the four properties the surface actually promises.
 *
 *   node scripts/verify-measure-surface.mjs            # all packs
 *   PACKS=imperium,microhistory node scripts/verify-measure-surface.mjs
 *
 * CHROMIUM_PATH is honoured for sandboxes that ship a prebuilt Chromium.
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FIXTURE = 'tests/visual/lessons/figure-measure-surface.json';
const PACKS = (process.env.PACKS || 'imperium,microhistory,geolearn,scholarmath,mathematics,rome,wellbeing,ww1')
  .split(',').map((s) => s.trim()).filter(Boolean);

const PAD = 5.8;          // FIG_MEAS_PADX — the designed padding per side
/* Two bounds, because the engine makes two different promises. Where the painted face is KNOWN (numeric
 * content, body face) the chip is sized from measured advances and must land on the designed padding. Where
 * it is NOT known (symbolic content paints in var(--tp-serif), which packs redefine — Courier Prime in
 * microhistory) the engine deliberately over-reserves: the promise there is only that the text never leaves
 * its box and the box never becomes absurd. Asserting one number for both would either fail the safe case or
 * excuse a real overflow. */
/* A BAND, expressed as a proportion of the design — not a tolerance tuned until the current numbers fit.
 * FIG_GLYPH is calibrated against one face, and packs redefine the body face too (Source Sans 3 in rome,
 * Source Serif 4 in ww1, EB Garamond in mathematics, Hanken Grotesk in imperium), so a single exact number
 * was never achievable without per-face runtime metrics. What the design does promise is that a chip reads
 * as ONE object on every shipped face: never cramped, never so loose the box stops belonging to its text.
 * The run prints the widest ratio it saw, so drift shows up while the gate is still green rather than after
 * it goes red. */
const PAD_MIN_RATIO = 0.5, PAD_MAX_RATIO = 1.75;
const PAD_MAX_UNKNOWN = 14.0;
const AA = 4.5;           // WCAG AA, normal text

// A tiny static server: file:// gives the page an opaque origin in some builds, and the app must be fetched
// the way a school actually serves it.
const MIME = { '.html': 'text/html', '.json': 'application/json', '.woff2': 'font/woff2', '.js': 'text/javascript', '.css': 'text/css' };
const server = http.createServer((req, res) => {
  const rel = decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'lesson-studio.html';
  if (rel === 'favicon.ico') { res.writeHead(204); return res.end(); }   // the page asks; a 404 here is harness noise, not a finding
  const file = path.join(root, rel);
  if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end('nf'); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}/`;

const lesson = JSON.parse(fs.readFileSync(path.join(root, FIXTURE), 'utf8'));
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const consoleErrors = [];
page.on('console', (m) => { if (m.type() === 'error' && !/favicon/.test(m.text())) consoleErrors.push(m.text()); });
page.on('pageerror', (e) => consoleErrors.push(String(e)));
await page.goto(base + 'lesson-studio.html', { waitUntil: 'networkidle' });
await page.evaluate((d) => { LESSON = d; LESSON.meta = LESSON.meta || {}; cur = 0; TP_RUNTIME = {}; render(); }, lesson);

// contrast, from the composited paint — opacity on the tspan is why computed style alone lied here before.
const srgb = (s) => { const n = String(s).match(/[\d.]+/g).map(Number);
  return String(s).startsWith('color(srgb') ? n.slice(0, 3).map((v) => v * 255) : n.slice(0, 3); };
const lum = (c) => { const a = c.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2]; };
const ratio = (x, y) => { const [a, b] = [lum(x), lum(y)].sort((p, q) => q - p); return (a + 0.05) / (b + 0.05); };
const over = (fg, bg, op) => fg.map((v, i) => v * op + bg[i] * (1 - op));

/* Named expectations, so the gate states the CONTRACT rather than restating the implementation. Each entry is
 * a real string from the fixture whose correct presentation is a decision the maintainer made, not a fact the
 * code happens to produce. "AB" and "2x" are the load-bearing pair: both are forced by `label` AGAINST what
 * the fallback classifier would say, so they fail the moment explicit author intent stops winning. */
const EXPECT = [
  ['3.21', { role: 'a measurement, numerals', cls: 'tp-fig-gsmeas', chip: true }],
  ['480',  { role: 'a measurement, numerals', cls: 'tp-fig-gsmeas', chip: true }],
  ['x + 4', { role: 'a measurement, maths face', cls: 'tp-fig-gssym', chip: true }],
  ['3x + 2y + 15', { role: 'a measurement, maths face', cls: 'tp-fig-gssym', chip: true }],
  ['AB', { role: 'a measurement — forced by label against the classifier', cls: 'tp-fig-gssym', chip: true }],
  ['2x', { role: 'a symbolic NAME — forced by label against the classifier', cls: 'tp-fig-gsym', chip: false }],
  ['c', { role: 'a symbolic name, maths face', cls: 'tp-fig-gsym', chip: false }],
  ['adjacent side', { role: 'a prose name, upright', cls: 'tp-fig-gprose', chip: false }],
  ['hypotenuse', { role: 'a prose name, upright', cls: 'tp-fig-gprose', chip: false }],
  ['radius', { role: 'a prose name, upright', cls: 'tp-fig-gprose', chip: false }],
];

let pass = 0; const fails = []; const loose = []; let worst = { ratio: 0, pack: '-', text: '-' };
const bad = (pack, slide, what) => fails.push(`${pack} · slide ${slide} — ${what}`);

for (const pack of PACKS) {
  await page.evaluate((t) => setTheme(t), pack);
  await page.evaluate(() => document.fonts && document.fonts.ready);
  for (let i = 0; i < lesson.slides.length; i++) {
    await page.evaluate((n) => go(n), i);
    await new Promise((r) => setTimeout(r, 260));
    const got = await page.evaluate(() => {
      const svg = document.querySelector('.tp-fig svg');
      if (!svg) return null;
      const style = (el) => getComputedStyle(el);
      const chips = [...document.querySelectorAll('.tp-fig rect.tp-fig-gpill')].map((rc) => {
        const t = rc.nextElementSibling, u = t && t.querySelector('.tp-fig-gunit');
        return { w: +rc.getAttribute('width'), ink: t ? t.getBBox().width : 0, text: t ? t.textContent : '',
                 cls: t ? t.getAttribute('class') : '', bg: style(rc).fill,
                 valInk: t ? style(t).fill : '', unitInk: u ? style(u).fill : null, unitOp: u ? +style(u).opacity : null };
      });
      // every painted annotation, so "only side measures get a surface" is checked against the whole figure
      const all = [...document.querySelectorAll('.tp-fig svg text')].map((t) => ({ cls: t.getAttribute('class') || '', text: t.textContent }));
      return { chips, all, surface: style(document.querySelector('.tp-fig')).backgroundColor };
    });
    if (!got) { bad(pack, i, 'no figure rendered'); continue; }

    // 1 — SURFACE ASSIGNMENT: a chip belongs to a side measure and to nothing else.
    const chipCls = new Set(got.chips.map((c) => c.cls));
    for (const c of chipCls) if (!/tp-fig-gsmeas|tp-fig-gssym/.test(c || '')) bad(pack, i, `a chip was painted around a "${c}" label`);
    const surfaced = new Set(got.chips.map((c) => c.text));
    for (const t of got.all) {
      if (/tp-fig-gvert/.test(t.cls) && surfaced.has(t.text)) bad(pack, i, `vertex name "${t.text}" carries a measurement surface`);
      if (/tp-fig-gmeas/.test(t.cls) && surfaced.has(t.text)) bad(pack, i, `angle measure "${t.text}" carries a measurement surface`);
      // A name never takes the surface, whichever face it is set in.
      if (/tp-fig-gprose|tp-fig-gsym\b/.test(t.cls) && surfaced.has(t.text)) bad(pack, i, `name "${t.text}" carries a measurement surface`);
    }
    pass++;

    /* 2 — THE THREE PRESENTATION ROLES, asserted by OUTCOME on named content rather than by re-deriving the
     * engine's own rule. A prose word set in the maths face reads as a product of its letters; a segment name
     * set as body text stops looking like mathematics. Both are wrong in a way semantics checks cannot see. */
    const face = (txt) => { const t = got.all.find((x) => x.text === txt); return t ? t.cls : null; };
    for (const [txt, want] of EXPECT) {
      const cls = face(txt);
      if (cls == null) continue;                       // not on this slide
      if (!new RegExp(want.cls).test(cls)) bad(pack, i, `"${txt}" should render as ${want.role} (${want.cls}) but is "${cls}"`);
      else pass++;
      const hasChip = surfaced.has(txt);
      if (hasChip !== want.chip) bad(pack, i, `"${txt}" ${hasChip ? 'has' : 'lacks'} a measurement surface; expected ${want.chip ? 'one' : 'none'}`);
      else pass++;
    }

    for (const c of got.chips) {
      const padEach = (c.w - c.ink) / 2;
      // 2 — the text must fit INSIDE the box the placement engine reserved and cleared for it.
      if (/tp-fig-gsmeas/.test(c.cls) && padEach / PAD > worst.ratio) worst = { ratio: padEach / PAD, pack, text: c.text };
      if (padEach < 0) bad(pack, i, `"${c.text}" overflows its chip by ${(-padEach).toFixed(2)}px per side`);
      // 3 — and must not be reserved so loosely that the chip stops reading as one object.
      else if (/tp-fig-gsmeas/.test(c.cls) && (padEach < PAD * PAD_MIN_RATIO || padEach > PAD * PAD_MAX_RATIO))
        bad(pack, i, `"${c.text}" reserves ${padEach.toFixed(2)}px per side = ${(padEach / PAD).toFixed(2)}x the designed ${PAD} (band ${PAD_MIN_RATIO}-${PAD_MAX_RATIO}x)`);
      /* Unknown-face looseness is a KNOWN, ACCEPTED trade, not a pass and not a failure: symbolic content is
       * sized conservatively because its face is pack-defined, so a narrow face over-reserves. Failing here
       * would demand per-face runtime metrics that this stage deliberately does not add; passing silently
       * would let the looseness drift without anyone seeing it. So it is recorded and printed. */
      else if (padEach > PAD_MAX_UNKNOWN) loose.push(`${pack} · "${c.text}" ${padEach.toFixed(2)}px/side`);
      else pass++;
      // 4 — both inks legible against the fill they are painted on.
      const bg = srgb(c.bg), v = ratio(srgb(c.valInk), bg);
      if (v < AA) bad(pack, i, `value ink of "${c.text}" is ${v.toFixed(2)}:1 on the chip fill (AA needs ${AA})`); else pass++;
      if (c.unitInk != null) {
        const u = ratio(over(srgb(c.unitInk), bg, c.unitOp), bg);
        if (u < AA) bad(pack, i, `unit ink of "${c.text}" is ${u.toFixed(2)}:1 composited at opacity ${c.unitOp} (AA needs ${AA})`); else pass++;
      }
    }
  }
}

await browser.close();
server.close();

console.log(`\nmeasurement surface — ${PACKS.length} pack(s) × ${lesson.slides.length} slide(s)`);
console.log(`  widest known-face padding: ${worst.ratio.toFixed(2)}x designed — "${worst.text}" in ${worst.pack} (band ${PAD_MIN_RATIO}-${PAD_MAX_RATIO}x)`);
if (loose.length) {
  console.log(`  conservatively sized beyond ${PAD_MAX_UNKNOWN}px/side (unknown face — accepted trade, ${loose.length}):`);
  for (const l of loose) console.log(`    · ${l}`);
}
if (consoleErrors.length) fails.push(`console: ${consoleErrors[0]}`);
if (fails.length) {
  for (const f of fails) console.error(`  ✗ ${f}`);
  console.error(`\n✗ ${fails.length} failure(s), ${pass} assertion(s) passed`);
  process.exit(1);
}
console.log(`\n✓ ${pass}/${pass} assertions passed — surface assignment, containment, padding, contrast`);
