#!/usr/bin/env node
/* ── THE SPACE STUDY — ONE LESSON, SEVERAL VALID ARRANGEMENTS ────────────────────────────────────
   node scripts/space-study.mjs

   THE QUESTION. On desktop the Symmetry page gives its graph an eight-column region — 760px of a
   1152px surface — centred, with the reading beneath it. Four columns, 392px, carry nothing. The
   slot contract is satisfied: the plane fills its region exactly and nothing is stranded INSIDE a
   named slot. What the contract has never been asked is whether a DIFFERENT approved arrangement
   would use that width to instructional effect.

   WHAT THIS IS NOT. It is not a new composition system, a new geometry class or a change to the
   shipping renderer. It renders the ACTUAL Symmetry lesson — the same figure, the same authored
   domain, the same four paragraphs — in arrangements the catalogue already describes, and measures
   them. Nothing here is adopted; `docs/atlas/space-study/` is the only thing it writes.

   WHY THE ANSWER MIGHT HAVE CHANGED. Side-by-side was designed, rendered, measured and removed from
   this pattern twice, and the removal notes are in patterns.json:

     side-7   7 cols of plane beside 5 of reading. Holds the object perfectly, nothing unclaimed
              horizontally — and the object stood 256px TALLER than the prose beside it, against the
              240px this project calibrated as a hole.
     side-6   6 beside 6. Measured at +474px of nothing beneath the reading column.

   Both were measured against the atlas's FIXED FILLER PROSE, and both predate the Symmetry graph's
   window widening from ±5 to ±6.5, which took 21% off its height. A vertical hole is the difference
   between two heights; both of them have moved. So the measurement is re-taken here on the real
   lesson rather than assumed to still hold.

   THE TRADE THIS MEASURES, AND IT IS A TRADE. Stacking spends horizontal space and has no hole at
   any prose length. Going side-by-side spends vertical space, and how much depends on how much prose
   the author wrote — which is the reason the arrangement was removed: `residueRisk` in patterns.json
   says a composition whose soundness depends on how much prose the author happened to write is
   content-dependent, and content may never decide a composition. This study does not overturn that.
   It reports what the two costs actually are for this lesson. */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { openFigurePage, makePainter, makeSolvers, square, classOf } from './lib/figure-geometry.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const COMP = path.join(root, 'docs/atlas/composition/src');
const WEX = path.join(root, 'docs/atlas/worked-examples/src');
const OUT = path.join(root, 'docs/atlas/space-study');
fs.mkdirSync(OUT, { recursive: true });

const GRID = JSON.parse(fs.readFileSync(path.join(COMP, 'grid.json'), 'utf8'));
const PATTERNS = JSON.parse(fs.readFileSync(path.join(COMP, 'patterns.json'), 'utf8'));
const CSS = fs.readFileSync(path.join(COMP, 'composition.css'), 'utf8');
const FIGS = JSON.parse(fs.readFileSync(path.join(WEX, 'figures.json'), 'utf8'));
const A = JSON.parse(fs.readFileSync(path.join(WEX, 'atlas.json'), 'utf8'));
const LESSON = JSON.parse(fs.readFileSync(path.join(root, 'docs/atlas/lesson/quadratics.lesson.json'), 'utf8'));

const S = 'desktop', g = GRID.surfaces[S];
const colW = (g.width - (g.columns - 1) * g.gutter) / g.columns;
const span = (n) => +(n * colW + (n - 1) * g.gutter).toFixed(2);

/* THE LESSON'S OWN CONTENT, read out of the lesson rather than retyped, so this cannot drift into
   measuring prose the lesson does not have. */
const sym = LESSON.page.collection.items.find((i) => i.label === 'Symmetry');
const NODE = sym.body.views.items.find((v) => v.label === 'Visual explanation').body;
const FIG = FIGS[NODE.figure].figure;
const d = FIG.domain, ASPECT = (d.yMax - d.yMin) / (d.xMax - d.xMin);
const KLASS = classOf(ASPECT, A.mediaGeometry.bands);

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const t = (s) => esc(s).replace(/\*([^*]+)\*/g, '<i>$1</i>').replace(/\^([-−]?[0-9A-Za-z]+)/g, '<sup>$1</sup>');
const para = (p) => typeof p === 'string' ? `<p>${t(p)}</p>` : `<p class="cp-sm">${t(p.math)}</p>`;

/* ── THE ARRANGEMENTS ────────────────────────────────────────────────────────────────────────────
   Each is a row of grid areas over the same twelve columns, and each is something the catalogue has
   either approved or explicitly removed. Nothing invented. */
const M = 'media', I = 'interpretation';
const row = (...cells) => cells.map(([name, n]) => Array(n).fill(name).join(' ')).join(' ');
const ARRANGEMENTS = [
  { id: 'A__down-8', label: 'A · down-8 — the shipping arrangement',
    status: 'APPROVED and currently selected',
    note: 'Eight columns of plane centred on the twelve, the reading beneath at the same eight. '
      + 'Four columns carry nothing. No vertical hole at any prose length.',
    mediaSpan: 8, readSpan: 8, side: false,
    areas: [row(['.', 2], [M, 8], ['.', 2]), row(['.', 2], [I, 8], ['.', 2])] },
  { id: 'B1__side-7', label: 'B1 · side-7 — seven of plane beside five of reading',
    status: 'REMOVED from the catalogue (measured +256px of hole on filler prose)',
    note: 'Fills the surface exactly. The question is what is left BENEATH the shorter column.',
    mediaSpan: 7, readSpan: 5, side: true,
    areas: [row([M, 7], [I, 5])] },
  { id: 'B2__side-6', label: 'B2 · side-6 — six of plane beside six of reading',
    status: 'WITHDRAWN from the catalogue (measured +474px of hole on filler prose)',
    note: 'The symmetrical split. A narrower plane is a shorter plane, so the hole should be smaller '
      + 'than side-7 — and the reading is wider, so it is shorter too.',
    mediaSpan: 6, readSpan: 6, side: true,
    areas: [row([M, 6], [I, 6])] },
  { id: 'B3__down-12', label: 'B3 · down-12 — the full-width stage, already approved',
    status: 'APPROVED for this pattern, reached only by a `wide` plane today',
    note: 'The other approved desktop span. Uses every column, and pays for it in height: a plane '
      + 'this shape gets taller exactly as fast as it gets wider.',
    mediaSpan: 12, readSpan: 8, side: false,
    areas: [row([M, 12]), row([I, 8], ['.', 4])] },
];

const server = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]);
  const p = path.join(root, u === '/' ? '/lesson-studio.html' : u);
  if (!p.startsWith(root) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  const mime = { '.html': 'text/html', '.json': 'application/json', '.woff2': 'font/woff2', '.png': 'image/png', '.svg': 'image/svg+xml' };
  res.writeHead(200, { 'Content-Type': mime[path.extname(p)] || 'application/octet-stream' });
  res.end(fs.readFileSync(p));
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}/lesson-studio.html`;
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});

const appPage = await browser.newPage();
await appPage.goto(base, { waitUntil: 'load' });
const APP_CSS = await appPage.evaluate(() => [].slice.call(document.styleSheets)
  .map((sh) => { try { return [].slice.call(sh.cssRules).map((r) => r.cssText).join('\n'); } catch (e) { return ''; } }).join('\n'));
await appPage.close();

const figPage = await openFigurePage(browser, base);
const { boxForWidth } = makeSolvers(makePainter(figPage));

/* THE PLANE IS ASKED THE SAME QUESTION AT EVERY SPAN: inside this width, at equal unit scale, what
   is the faithful rendering? The domain, the points and the reference line never move. */
async function plane(w) {
  const r = await boxForWidth(`study-${w}`, FIG, Math.round(w));
  if (!r) throw new Error(`no box at all fits ${w}px`);
  if (!square(r.box)) throw new Error(`${w}px does not paint this domain at equal unit scale `
    + `(best ${r.box.w}x${r.box.h} at ${r.box.ratio})`);
  return r.box;
}

const skin = (w, h, html) => `<div class="mx-part" data-mx-part="figure" data-fig-viewport `
  + `style="position:relative;width:${w}px;height:${h}px"><div class="mx-figstage">`
  + `<div class="mx-figskin tp-slide">${html}</div></div></div>`;

const tokens = `:root{--cp-surface:${g.width}px;--cp-pad:${g.pad}px;--cp-pad-y:32px;--cp-frame:30px;`
  + `--cp-cols:${g.columns};--cp-gut:${g.gutter}px;--cp-measure:${GRID.readingMeasure.px}px;`
  + `--cp-pad-h:480px;--cp-pane-h:460px;}`;

const REPORT = [];
for (const arr of ARRANGEMENTS) {
  const mw = span(arr.mediaSpan);
  const box = await plane(mw);
  const areasCSS = `[data-pattern="study"]{grid-template-areas:\n${arr.areas.map((r) => `  "${r}"`).join('\n')};}\n`
    + `[data-pattern="study"] > [data-slot="media"]{grid-area:media;}\n`
    + `[data-pattern="study"] > [data-slot="interpretation"]{grid-area:interpretation;}`;
  const body = `<div data-pattern="study" data-subdesign="${esc(arr.id)}">`
    + `<div data-slot="media" data-slot-type="media" data-occupancy="required" data-fit="fill" data-media-slot`
    + ` data-span="${arr.mediaSpan}"><p class="cp-lab">${esc(NODE.label)}</p>`
    + `<figure class="cp-figure">${skin(box.w, box.h, box.html)}</figure></div>`
    + `<div data-slot="interpretation" data-slot-type="reading" data-occupancy="required" data-span="${arr.readSpan}">`
    + `<p class="cp-lab">${esc(NODE.reading.label)}</p><div class="cp-prose">`
    + NODE.reading.paragraphs.map(para).join('') + `</div></div></div>`;

  const doc = `<!doctype html><html data-theme="mathematics"><head><meta charset="utf-8"><style>
${APP_CSS}
</style><style>
${tokens}
${CSS}
${areasCSS}
/* the study's own chrome, and nothing that touches a slot's geometry */
.ss-cap{font:600 12px/1.5 ui-monospace,Menlo,monospace;letter-spacing:.04em;color:#1d2b25;
  padding:14px 0 6px;}
.ss-cap span{display:block;font-weight:400;color:#5d6f67;}
</style></head><body class="mx cp-desktop"><div class="cp-page">
<div class="ss-cap">${esc(arr.label)}<span>${esc(arr.status)} · media ${arr.mediaSpan} col = ${mw}px · reading ${arr.readSpan} col = ${span(arr.readSpan)}px</span></div>
<div class="cp-surface">${body}</div>
</div></body></html>`;

  const p = await browser.newPage({ viewport: { width: g.width + 2 * g.pad + 2 * 30 + 40, height: 1000 }, deviceScaleFactor: 2 });
  const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
  await p.setContent(doc, { waitUntil: 'load' });
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(250);

  const m = await p.evaluate(() => {
    const surf = document.querySelector('.cp-surface');
    const pat = document.querySelector('[data-pattern="study"]');
    const media = document.querySelector('[data-slot="media"]');
    const read = document.querySelector('[data-slot="interpretation"]');
    const plane = document.querySelector('[data-mx-part="figure"]');
    const cs = getComputedStyle(surf), sr = surf.getBoundingClientRect();
    const contentL = sr.left + parseFloat(cs.paddingLeft), contentR = sr.right - parseFloat(cs.paddingRight);
    const r = (el) => { const b = el.getBoundingClientRect();
      return { l: +(b.left - contentL).toFixed(1), r: +(contentR - b.right).toFixed(1),
        w: +b.width.toFixed(1), h: +b.height.toFixed(1), top: +(b.top - pat.getBoundingClientRect().top).toFixed(1) }; };
    /* LABEL PLACEMENT IS PART OF THE COST. A narrower plane gives the label solver less room, and a
       block-height number cannot see an identifier that ended up on the curve. Measured as the
       shortest distance from each label's box to the painted function path, in painted px. */
    const svg = document.querySelector('.tp-fig-svg');
    let labels = [];
    if (svg) {
      const fn = svg.querySelector('.tp-fig-fn');
      const vb = (svg.getAttribute('viewBox') || '0 0 1 1').split(/\s+/).map(Number);
      const k = svg.getBoundingClientRect().width / vb[2];
      const near = (el) => {
        if (!fn || !fn.getTotalLength) return null;
        const b = el.getBBox(), len = fn.getTotalLength();
        let best = Infinity;
        for (let i = 0; i <= 300; i++) {
          const pt = fn.getPointAtLength(len * i / 300);
          const dx = Math.max(b.x - pt.x, 0, pt.x - (b.x + b.width));
          const dy = Math.max(b.y - pt.y, 0, pt.y - (b.y + b.height));
          best = Math.min(best, Math.hypot(dx, dy));
        }
        return +(best * k).toFixed(1);
      };
      labels = [].slice.call(svg.querySelectorAll('.tp-fig-ptid,.tp-fig-reflab'))
        .map((el) => ({ text: el.textContent.trim(), kind: el.getAttribute('class'), toCurve: near(el) }));
    }
    return { surface: +(contentR - contentL).toFixed(1), pattern: +pat.getBoundingClientRect().height.toFixed(1),
      media: r(media), reading: r(read), labels,
      plane: { w: +plane.getBoundingClientRect().width.toFixed(1), h: +plane.getBoundingClientRect().height.toFixed(1) },
      proseW: +document.querySelector('.cp-prose p').getBoundingClientRect().width.toFixed(1) };
  });
  if (errs.length) throw new Error(`${arr.id}: ${errs[0]}`);

  const bb = await (await p.$('.cp-page')).boundingBox();
  await p.setViewportSize({ width: Math.ceil(bb.width) + 4, height: Math.ceil(bb.height) + 8 });
  await p.waitForTimeout(150);
  await (await p.$('.cp-page')).screenshot({ path: path.join(OUT, `${arr.id}__clean.png`) });

  /* THE OVERLAY names the three kinds of space the maintainer asked to be told apart: the regions
     the composition assigned, the columns it left carrying nothing, and — in a side arrangement —
     the space beneath the shorter of two paired columns. */
  await p.evaluate(({ arr, m }) => {
    const pat = document.querySelector('[data-pattern="study"]');
    const pr = pat.getBoundingClientRect();
    const surf = document.querySelector('.cp-surface');
    const cs = getComputedStyle(surf), sr = surf.getBoundingClientRect();
    const cl = sr.left + parseFloat(cs.paddingLeft);
    const host = document.createElement('div');
    host.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:50;';
    document.body.appendChild(host);
    const box = (x, y, w, h, fill, line, label, at) => {
      const e = document.createElement('div');
      e.style.cssText = `position:absolute;left:${x}px;top:${y}px;width:${w}px;height:${h}px;`
        + `background:${fill};outline:1.5px dashed ${line};outline-offset:-1.5px;`
        + `font:600 11px/1.4 ui-monospace,Menlo,monospace;color:${line};`;
      if (label) { const s = document.createElement('span');
        s.style.cssText = `position:absolute;${at || 'left:6px;top:-9px'};white-space:pre;`
          + `background:rgba(255,255,255,.96);padding:2px 5px;border-radius:2px;`
          + `box-shadow:0 0 0 1px rgba(0,0,0,.06);`;
        s.textContent = label; e.appendChild(s); }
      host.appendChild(e);
    };
    const mr = document.querySelector('[data-slot="media"]').getBoundingClientRect();
    const rr = document.querySelector('[data-slot="interpretation"]').getBoundingClientRect();
    box(mr.left + scrollX, mr.top + scrollY, mr.width, mr.height, 'rgba(22,120,80,.10)', '#16784f',
      `media · ${arr.mediaSpan} col · ${Math.round(mr.width)}×${Math.round(mr.height)}`);
    box(rr.left + scrollX, rr.top + scrollY, rr.width, rr.height, 'rgba(40,90,180,.10)', '#2b5ab4',
      `reading · ${arr.readSpan} col · ${Math.round(rr.width)}×${Math.round(rr.height)}`);
    /* THE THREE KINDS OF SPACE, TOLD APART — which is the whole question.
       The grid's own rule (grid.json `whitespace`): free width beside PROSE is reading margin and is
       legitimate; free width beside MEDIA is not, because media has no measure to be bound by. So the
       columns beside the plane and the columns beside the paragraph get different colours, and the
       page is not charged for the second. */
    const strip = (el, kind) => {
      const b = el.getBoundingClientRect();
      const lw = b.left - cl, rw = (cl + m.surface) - b.right;
      const margin = kind === 'reading';
      const fill = margin ? 'rgba(190,150,30,.11)' : 'rgba(200,60,40,.13)';
      const line = margin ? '#a8801a' : '#c83c28';
      const name = margin ? `reading margin\nlegitimate` : `carries nothing`;
      if (lw > 2) box(cl + scrollX, b.top + scrollY, lw, b.height, fill, line,
        `${name}\n${Math.round(lw)} × ${Math.round(b.height)}px`, 'left:5px;top:5px');
      if (rw > 2) box(b.right + scrollX, b.top + scrollY, rw, b.height, fill, line,
        `${name}\n${Math.round(rw)} × ${Math.round(b.height)}px`, 'left:5px;top:5px');
    };
    if (!arr.side) {
      strip(document.querySelector('[data-slot="media"]'), 'media');
      strip(document.querySelector('[data-slot="interpretation"]'), 'reading');
    } else {
      /* the hole: the space under whichever paired column ended shorter */
      const shortIsRead = rr.height < mr.height;
      const s = shortIsRead ? rr : mr, tall = shortIsRead ? mr : rr;
      const hole = tall.height - s.height;
      if (hole > 2) box(s.left + scrollX, s.bottom + scrollY, s.width, hole, 'rgba(200,60,40,.13)', '#c83c28',
        `${shortIsRead ? 'reading' : 'media'} column ends here\nhole ${Math.round(hole)}px × ${Math.round(s.width)}px`,
        'left:5px;top:5px');
    }
    const cap = document.querySelector('.ss-cap');
    const k = document.createElement('span');
    k.textContent = 'OVERLAY — green: assigned media region · blue: assigned reading region · '
      + 'RED: space carrying nothing that is NOT reading margin · amber: reading margin, which the grid calls legitimate';
    cap.appendChild(k);
  }, { arr, m });
  await p.waitForTimeout(120);
  const bb2 = await (await p.$('.cp-page')).boundingBox();
  await p.setViewportSize({ width: Math.ceil(bb2.width) + 4, height: Math.ceil(bb2.height) + 8 });
  await p.waitForTimeout(120);
  await (await p.$('.cp-page')).screenshot({ path: path.join(OUT, `${arr.id}__overlay.png`) });
  await p.close();

  const hole = arr.side ? +Math.abs(m.media.h - m.reading.h).toFixed(1) : 0;
  const unusedCols = arr.side ? 0 : +(m.surface - m.media.w).toFixed(1);
  REPORT.push({ id: arr.id, label: arr.label, status: arr.status, note: arr.note,
    mediaSpan: arr.mediaSpan, readSpan: arr.readSpan, side: arr.side,
    surface: m.surface, mediaSlot: m.media.w, plane: `${m.plane.w}×${m.plane.h}`,
    readingSlot: m.reading.w, proseWidth: m.proseW, readingHeight: m.reading.h,
    blockHeight: m.pattern, unusedColumns: unusedCols, verticalHole: hole,
    holeUnder: arr.side ? (m.reading.h < m.media.h ? 'reading' : 'media') : null,
    labels: m.labels, nearestLabelToCurve: m.labels.length
      ? Math.min(...m.labels.map((l) => l.toCurve == null ? Infinity : l.toCurve)) : null });
  console.log(`${arr.id.padEnd(14)} media ${String(m.media.w).padStart(7)}px plane ${(m.plane.w + '×' + m.plane.h).padStart(11)}`
    + ` · reading ${String(m.reading.w).padStart(6)}px h ${String(m.reading.h).padStart(6)}`
    + ` · block ${String(m.pattern).padStart(6)}px`
    + (arr.side ? ` · HOLE ${String(hole).padStart(6)}px under the ${m.reading.h < m.media.h ? 'reading' : 'media'}`
      : ` · unused columns ${String(unusedCols).padStart(6)}px`)
    + (m.labels.length ? ` · nearest label to curve ${String(Math.min(...m.labels.map((l) => l.toCurve))).padStart(5)}px` : ''));
}

await figPage.close(); await browser.close(); server.close();
fs.writeFileSync(path.join(OUT, 'space-study.json'), JSON.stringify({
  surface: S, width: g.width, columns: g.columns, gutter: g.gutter, column: +colW.toFixed(2),
  figure: NODE.figure, domain: d, aspect: +ASPECT.toFixed(4), geometryClass: KLASS,
  readingMeasure: GRID.readingMeasure.px, arrangements: REPORT }, null, 2));
console.log(`\nfigure ${NODE.figure} · domain x[${d.xMin},${d.xMax}] y[${d.yMin},${d.yMax}] · aspect ${ASPECT.toFixed(4)} · class ${KLASS}`);
console.log(`wrote ${path.relative(root, OUT)}`);
