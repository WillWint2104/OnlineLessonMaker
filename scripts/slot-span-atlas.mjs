/* ── THE SLOT SPAN ATLAS ──────────────────────────────────────────────────────────────────────────

   A PROTOTYPE, and deliberately separate: it reads docs/atlas/slot-span/src/ and does not touch the
   shipping catalogue in docs/atlas/composition/src/. 24667ce stays the checkpoint.

   THE ARCHITECTURAL MOVE, and it is one line: A ROW IS A NAMED SPLIT, AND THE GRID AREAS ARE
   GENERATED FROM IT. Nothing writes column strings by hand any more. A region is a slot, a declared
   reading margin, or the declared containment of a centred split — there is no fourth option, so a
   large unowned grid region is not merely discouraged, it cannot be expressed.

   THE CHAIN:  media type → media geometry class → approved footprint → fit mode → painted media.
   Every arrow is a LOOKUP. The pattern owns the legal footprints; the geometry class chooses among
   them. Nothing here measures prose, counts steps, computes an occupancy fraction or decides whether
   a page looks balanced — the program is choosing among a handful of arrangements a human already
   decided are balanced, which is the whole difference from the resolver this project threw away.

   The boards exist to answer one question by eye: WHY IS THIS OBJECT SIX COLUMNS AND NOT EIGHT OR
   TWELVE? The answer printed beside every render is a row of footprints.json, by name. */

import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { openFigurePage, makePainter, makeSolvers, square, classOf } from './lib/figure-geometry.mjs';
import { TOLPX, measureMedia, slotFit, inspectorLines } from './lib/slots.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SPAN_SRC = path.join(root, 'docs/atlas/slot-span/src');
const COMP_SRC = path.join(root, 'docs/atlas/composition/src');
const MEDIA_DIR = path.join(root, 'docs/atlas/media');
const OUT = path.resolve(process.argv[2] || path.join(root, 'docs/atlas/slot-span'));

const GRID = JSON.parse(fs.readFileSync(path.join(COMP_SRC, 'grid.json'), 'utf8'));
const VOCAB = JSON.parse(fs.readFileSync(path.join(COMP_SRC, 'vocabulary.json'), 'utf8'));
const CSS_KIT = fs.readFileSync(path.join(COMP_SRC, 'composition.css'), 'utf8');
const SPANS = JSON.parse(fs.readFileSync(path.join(SPAN_SRC, 'spans.json'), 'utf8'));
const FOOT = JSON.parse(fs.readFileSync(path.join(SPAN_SRC, 'footprints.json'), 'utf8'));
const CAT = JSON.parse(fs.readFileSync(path.join(COMP_SRC, 'patterns.json'), 'utf8'));
const MEDIA = JSON.parse(fs.readFileSync(path.join(MEDIA_DIR, 'media.json'), 'utf8'));
const FIGS = JSON.parse(fs.readFileSync(path.join(root, 'docs/atlas/worked-examples/src/figures.json'), 'utf8'));
const BANDS = JSON.parse(fs.readFileSync(path.join(root, 'docs/atlas/worked-examples/src/atlas.json'), 'utf8')).mediaGeometry.bands;

const SURFACES = Object.keys(GRID.surfaces);
const CLASSES = ['portrait', 'balanced', 'landscape', 'wide'];
const ONLY = process.env.SS_ONLY ? new Set(process.env.SS_ONLY.split(',')) : null;
const SURF = process.env.SS_SURFACE ? new Set(process.env.SS_SURFACE.split(',')) : null;

class SpanError extends Error { constructor(m) { super(m); this.name = 'SpanError'; } }

const colW = (s) => (GRID.surfaces[s].width - (GRID.surfaces[s].columns - 1) * GRID.surfaces[s].gutter) / GRID.surfaces[s].columns;
const spanPx = (s, n) => +(n * colW(s) + (n - 1) * GRID.surfaces[s].gutter).toFixed(2);
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const t = (s) => esc(s).replace(/\*([^*]+)\*/g, '<i>$1</i>').replace(/\^([-−]?[0-9A-Za-z]+)/g, '<sup>$1</sup>');

/* ── THE SPLIT VOCABULARY, VALIDATED BEFORE ANYTHING RENDERS ─────────────────────────────────────*/
function validateSpans() {
  for (const [sname, s] of Object.entries(SPANS.surfaces)) {
    if (s.columns !== GRID.surfaces[sname].columns)
      throw new SpanError(`spans.json says ${sname} has ${s.columns} columns; grid.json says ${GRID.surfaces[sname].columns}`);
    for (const [id, sp] of Object.entries(s.splits)) {
      const cells = new Array(s.columns).fill(null);
      const claim = (range, who) => {
        for (let c = range[0]; c <= range[1]; c++) {
          if (c < 1 || c > s.columns) throw new SpanError(`${sname}/${id}: column ${c} is off the grid`);
          if (cells[c - 1]) throw new SpanError(`${sname}/${id}: column ${c} claimed by ${cells[c - 1]} and ${who}`);
          cells[c - 1] = who;
        }
      };
      sp.regions.forEach((r, i) => claim(r, `region ${i + 1}`));
      (sp.containment || []).forEach((r) => claim(r, 'containment'));
      /* THE CONTROL THAT MAKES AN UNNAMED COLUMN IMPOSSIBLE: a split must account for every column
         of its grid. `reading-margin` is a REGION, so it is counted here too. */
      const gap = cells.map((x, i) => x ? null : i + 1).filter(Boolean);
      if (gap.length) throw new SpanError(`${sname}/${id}: column(s) ${gap.join(', ')} belong to nothing — `
        + `a split must account for every column, or it is a hole with a name on the outside`);
      if (sp.kind === 'centred') {
        const [l, r] = sp.containment || [];
        if (!l || !r || (l[1] - l[0]) !== (r[1] - r[0]))
          throw new SpanError(`${sname}/${id}: a centred split's containment must be symmetric`);
      }
      if (sp.kind === 'pair' && sp.regions.length !== 2)
        throw new SpanError(`${sname}/${id}: a pair split has exactly two regions`);
    }
  }
}

/* ── AREAS, GENERATED ────────────────────────────────────────────────────────────────────────────
   The one place a grid-template-areas string is produced in this prototype. It returns BOTH the CSS
   and the ownership of every column, because `.` in CSS means "no slot" and the whole point here is
   that it still has an owner. */
function rowCells(surface, split, regions, proseSlots) {
  const S = SPANS.surfaces[surface];
  const sp = S.splits[split];
  if (!sp) throw new SpanError(`${surface}: no split "${split}" in the vocabulary`);
  if (sp.regions.length !== regions.length)
    throw new SpanError(`split ${split} has ${sp.regions.length} region(s); ${regions.length} were given`);
  const cells = new Array(S.columns).fill(null);
  const owner = new Array(S.columns).fill(null);
  sp.regions.forEach((range, i) => {
    const who = regions[i];
    if (who !== 'reading-margin' && who !== 'containment' && !who)
      throw new SpanError(`split ${split}: region ${i + 1} names nothing`);
    for (let c = range[0]; c <= range[1]; c++) {
      cells[c - 1] = (who === 'reading-margin' || who === 'containment') ? '.' : who;
      owner[c - 1] = who;
    }
    /* CONTROL · A READING MARGIN IS ONLY A READING MARGIN BESIDE PROSE. Free columns beside media
       are not a margin, because media has no measure to be bound by. */
    if (who === 'reading-margin') {
      const others = regions.filter((x) => x !== 'reading-margin');
      if (!others.length || !others.some((x) => proseSlots.has(x)))
        throw new SpanError(`split ${split}: \`reading-margin\` declared beside ${others.join(', ') || 'nothing'}, `
          + `which is not prose — free columns beside media are not a margin`);
    }
    /* CONTROL · PROSE NEVER EXCEEDS THE READING MEASURE. */
    if (proseSlots.has(who) && (range[1] - range[0] + 1) > S.proseMax)
      throw new SpanError(`split ${split}: "${who}" holds prose across ${range[1] - range[0] + 1} columns, `
        + `and ${surface} allows ${S.proseMax}`);
  });
  (sp.containment || []).forEach((range) => {
    for (let c = range[0]; c <= range[1]; c++) { cells[c - 1] = '.'; owner[c - 1] = 'containment'; }
  });
  if (owner.some((x) => !x)) throw new SpanError(`split ${split}: a column ended up with no owner`);
  return { cells, owner };
}

function layout(pid, surface, klass) {
  const P = FOOT.patterns[pid];
  const rows = P.rows[surface];
  if (!rows) throw new SpanError(`${pid}: no rows for ${surface}`);
  const fp = P.footprints[surface] && P.footprints[surface][klass];
  if (P.mediaSlot && !fp) throw new SpanError(`${pid}: no approved footprint for ${surface}/${klass}`);
  /* CHECKED BEFORE IT IS USED. A footprint naming a split from another surface's vocabulary used to
     surface as `Cannot read properties of undefined (reading 'regions')` twenty lines later, which is
     the right-and-useless kind of message this project has already paid for once. */
  if (fp && !SPANS.surfaces[surface].splits[fp])
    throw new SpanError(`${pid}: the footprint for ${surface}/${klass} is \`${fp}\`, which is not approved at `
      + `${surface} — that surface's vocabulary is ${Object.keys(SPANS.surfaces[surface].splits).join(', ')}. `
      + `A surface selects from its OWN spans; it never borrows another's.`);
  const cat = CAT[pid];
  const proseSlots = new Set((cat ? cat.slots : []).filter((s) => ['reading', 'support', 'worked', 'examples', 'questions'].includes(s.slotType)).map((s) => s.name));
  const areas = [], owners = [];
  for (const r of rows) {
    const split = r.media ? fp : r.split;
    /* A MEDIA ROW KEEPS ITS AUTHORED REGIONS AND ONLY SWAPS ITS SPLIT. The first version assumed a
       media row holds nothing but the media, which is true of the spines and false of
       practice.workbook, whose reference sits in a pair beside the workspace. */
    if (r.media && !r.regions.includes(P.mediaSlot))
      throw new SpanError(`${pid}: the media row does not name "${P.mediaSlot}"`);
    const want = SPANS.surfaces[surface].splits[split];
    if (r.media && want.regions.length !== r.regions.length)
      throw new SpanError(`${pid}/${surface}/${klass}: the footprint ${split} has ${want.regions.length} region(s) `
        + `and the media row names ${r.regions.length} (${r.regions.join(', ')}) — a footprint may change the `
        + `WIDTHS of a row, never how many regions it has`);
    const { cells, owner } = rowCells(surface, split, r.regions, proseSlots);
    areas.push(cells.join(' '));
    owners.push({ split, owner, media: !!r.media });
  }
  return { areas, owners, footprint: fp, rows };
}

/* ── fixtures ────────────────────────────────────────────────────────────────────────────────────*/
const BLOCK_OF = { graph: 'graph', image: 'image', diagram: 'image', video: 'video', interactive: 'interactive' };
const FIXTURES = Object.entries(MEDIA.fixtures).map(([id, f]) => {
  const aspect = f.kind === 'graph'
    ? (() => { const d = FIGS[f.figure].figure.domain; return (d.yMax - d.yMin) / (d.xMax - d.xMin); })()
    : f.aspect;
  return { id, ...f, aspect: +aspect.toFixed(4), klass: classOf(aspect, BANDS), block: BLOCK_OF[f.kind] };
});
const dataURI = (name) => {
  const mime = { '.png': 'image/png', '.svg': 'image/svg+xml', '.webm': 'video/webm' }[path.extname(name)];
  return `data:${mime};base64,${fs.readFileSync(path.join(MEDIA_DIR, name)).toString('base64')}`;
};
/* the representative object for a class in a pattern: the first fixture of that class the pattern's
   media slot is allowed to hold. Deterministic, and it reports when there is none. */
function pickFixture(pid, klass) {
  const P = FOOT.patterns[pid];
  if (!P.mediaSlot) return null;
  const cat = CAT[pid];
  const slot = cat.slots.find((s) => s.name === P.mediaSlot);
  return FIXTURES.find((f) => f.klass === klass && slot.allowedBlocks.includes(f.block)) || null;
}

const F = {
  para: ['Filler prose, identical in every render in this atlas, so the only thing that varies between '
    + 'two pictures is the object and the surface.',
    'A second paragraph, so a reading region has somewhere to go.'],
  key: 'A key idea, at the span the pattern approves.',
  q: ['A first question.', 'A second question, a little longer.', 'A third.'],
};
const LONG = [F.para[0], F.para[1],
  'A third paragraph that exists only in the adversarial payload, to prove that how much an author '
  + 'writes cannot move a single column of the grid.',
  'And a fourth, for the same reason.'];

function mediaMarkup(fx, fit) {
  const cap = fx.caption ? `<figcaption class="cp-figcap">${t(fx.caption)}</figcaption>` : '';
  if (fx.kind === 'graph') return `<figure class="cp-figure">{{FIG:${fx.figure}}}${cap}</figure>`;
  if (fx.kind === 'interactive')
    return `<div class="cp-media" data-media-object style="aspect-ratio:${1 / fx.aspect};background:`
      + `linear-gradient(#eef1f0,#dfe6e3);border:1px solid #cfd8d4;border-radius:3px"></div>`
      + `<div class="cp-controls" role="group" aria-label="Controls">`
      + (fx.controls || []).map((c) => `<div class="cp-ctl"><span class="cp-ctl-name">${t(c.name)}</span>`
        + `<span class="cp-track"><span class="cp-knob" style="left:calc(${c.at}% - 8px)"></span></span>`
        + `<span class="cp-ctl-val">${t(c.value)}</span></div>`).join('') + `</div>`;
  const inner = fx.kind === 'video'
    ? `<video data-media-object src="${dataURI(fx.src)}" poster="${dataURI(fx.poster)}" width="${fx.raster[0]}" `
      + `height="${fx.raster[1]}" controls muted playsinline preload="metadata"></video>`
    : `<img data-media-object src="${dataURI(fx.src)}" width="${fx.raster[0]}" height="${fx.raster[1]}" `
      + `alt="${esc(fx.alt || '')}" decoding="sync">`;
  const cw = fit === 'contain' ? ` style="width:min(${fx.presentationWidth}px,100%)"` : '';
  return `<figure class="cp-figure"><span class="cp-media"${cw}>${inner}</span>${cap}</figure>`;
}

function slotBody(pid, name, adversarial) {
  const cat = CAT[pid];
  const s = cat.slots.find((x) => x.name === name);
  const para = adversarial ? LONG : F.para;
  switch (s ? s.slotType : 'reading') {
    case 'support': return `<aside class="cp-key"><p class="cp-lab">Key idea</p><p>${t(F.key)}</p></aside>`;
    case 'worked': return `<div class="cp-prose"><h3>Worked</h3>${para.map((x) => `<p>${t(x)}</p>`).join('')}</div>`;
    case 'examples': return `<div class="cp-prose"><h3>Examples</h3>${para.map((x) => `<p>${t(x)}</p>`).join('')}</div>`;
    case 'questions': return `<ol class="cp-qset">${F.q.map((q) => `<li class="cp-qitem"><p>${t(q)}</p></li>`).join('')}</ol>`;
    case 'workspace': return `<div class="cp-pad"><div class="cp-pad-head"><p class="cp-lab">Your working</p></div>`
      + `<div class="cp-gridpaper"></div></div>`;
    default: return `<div class="cp-prose">${para.map((x) => `<p>${t(x)}</p>`).join('')}</div>`;
  }
}

/* ── the column diagram: every column, and who owns it ───────────────────────────────────────────*/
function diagram(surface, owners) {
  const n = GRID.surfaces[surface].columns;
  return `<div class="ss-diag">` + owners.map((row) => {
    const cells = [];
    let i = 0;
    while (i < n) {
      let j = i; while (j + 1 < n && row.owner[j + 1] === row.owner[i]) j++;
      const who = row.owner[i], w = j - i + 1;
      const role = who === 'reading-margin' ? 'margin' : who === 'containment' ? 'contain' : 'slot';
      cells.push(`<span class="ss-cell" data-role="${role}" style="grid-column:span ${w}">`
        + `${esc(who)} · ${w}</span>`);
      i = j + 1;
    }
    return `<div class="ss-drow" style="grid-template-columns:repeat(${n},1fr)">`
      + `<span class="ss-split"${row.media ? ' data-media' : ''}>${esc(row.split)}</span>${cells.join('')}</div>`;
  }).join('') + `</div>`;
}

/* ── render ──────────────────────────────────────────────────────────────────────────────────────*/
const MIME = { '.html': 'text/html', '.json': 'application/json', '.woff2': 'font/woff2', '.png': 'image/png', '.svg': 'image/svg+xml', '.webm': 'video/webm' };
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
const APP_CSS = await (async () => {
  const q = await browser.newPage();
  await q.goto(base, { waitUntil: 'load' });
  const css = await q.evaluate(() => [].slice.call(document.styleSheets)
    .map((sh) => { try { return [].slice.call(sh.cssRules).map((r) => r.cssText).join('\n'); } catch (e) { return ''; } }).join('\n'));
  await q.close(); return css;
})();
const figPage = await openFigurePage(browser, base);
const paint = makePainter(figPage);
const { boxForWidth } = makeSolvers(paint);
const BOX = new Map();
async function boxFor(key, w) {
  const ck = `${key}|${Math.round(w)}`;
  if (BOX.has(ck)) return BOX.get(ck);
  const b = await boxForWidth(key, FIGS[key].figure, Math.round(w));
  if (!b || !square(b.box)) throw new SpanError(`${key}: no equal-unit box fits a ${w}px slot`);
  BOX.set(ck, b.box); return b.box;
}
const skin = (w, h, html) => `<div class="mx-part" data-mx-part="figure" data-fig-viewport `
  + `style="position:relative;width:${w}px;height:${h}px"><div class="mx-figstage">`
  + `<div class="mx-figskin tp-slide">${html}</div></div></div>`;

const BOARD_CSS = `
.ss-board{background:#f4f4f2;padding:0 0 40px;}
.ss-head{background:#111;color:#fff;padding:14px 22px;font:600 13px/1.5 ui-monospace,Menlo,monospace;letter-spacing:.06em;}
.ss-head b{color:#8fd3b0;font-weight:600;}
.ss-why{background:#fff;border-bottom:1px solid #ddd;padding:14px 22px;font:14px/1.6 Georgia,serif;color:#333;}
.ss-sec{margin:26px 0 0;}
.ss-rule{margin:0;padding:10px 22px;background:#e8efec;border-top:1px solid #cfdcd6;border-bottom:1px solid #cfdcd6;
  font:600 12px/1.6 ui-monospace,Menlo,monospace;color:#1f5c40;letter-spacing:.03em;}
.ss-rule i{font-style:normal;color:#6b7c74;font-weight:400;}
.ss-diag{padding:10px 22px 0;}
.ss-drow{display:grid;gap:2px;margin:0 0 3px;align-items:stretch;}
.ss-split{grid-column:1/-1;font:600 10px/1.4 ui-monospace,Menlo,monospace;color:#8a8a84;letter-spacing:.06em;margin:4px 0 2px;}
.ss-split[data-media]{color:#b4532a;}
.ss-cell{font:600 10px/1.9 ui-monospace,Menlo,monospace;text-align:center;border-radius:2px;overflow:hidden;
  white-space:nowrap;text-overflow:ellipsis;}
.ss-cell[data-role="slot"]{background:#cde5d8;color:#17492f;}
.ss-cell[data-role="margin"]{background:#e6e6e2;color:#76766e;}
.ss-cell[data-role="contain"]{background:repeating-linear-gradient(45deg,#dbe4ee 0 5px,#eef2f7 5px 10px);color:#5a6b80;}
.ss-ins{margin:0;background:#fff;border-top:2px solid #111;padding:8px 22px 12px;
  font:11px/1.6 ui-monospace,Menlo,monospace;}
.ss-ins div{display:flex;gap:10px;}
.ss-ins b{flex:0 0 190px;color:#666;font-weight:600;}
.ss-ins i{font-style:normal;color:#111;}
.ss-ins[data-bad] b{color:#c00;}
.ss-none{padding:14px 22px;font:13px/1.6 Georgia,serif;color:#8a5a2a;background:#fdf6ec;}
.ss-page{background:#fff;}
`;

fs.mkdirSync(OUT, { recursive: true });
validateSpans();
console.log('the split vocabulary — every column of every split accounted for');
for (const [s, v] of Object.entries(SPANS.surfaces))
  console.log(`  ${s.padEnd(8)} ${String(v.columns).padStart(2)} cols · ${Object.keys(v.splits).join(' · ')}`);

const REPORT = [];

async function board(pid, surface, opts = {}) {
  const P = FOOT.patterns[pid];
  const g = GRID.surfaces[surface];
  const name = `${pid.replace(/\./g, '-')}__${surface}${opts.adversarial ? '-adversarial' : ''}`;
  const secs = [];
  const classes = P.mediaSlot ? CLASSES : ['none'];

  for (const klass of classes) {
    const fx = P.mediaSlot ? pickFixture(pid, klass) : null;
    if (P.mediaSlot && !fx) {
      secs.push({ klass, missing: true });
      continue;
    }
    const L = layout(pid, surface, klass === 'none' ? 'balanced' : klass);
    const sd = `${pid.replace(/\W/g, '')}-${surface}-${klass}`;
    const cat = CAT[pid];
    const parts = [];
    for (const s of cat.slots) {
      const inAreas = L.areas.some((r) => r.split(/\s+/).includes(s.name));
      if (!inAreas) continue;
      if (s.name === P.mediaSlot) {
        const fit = P.slotFit;
        const anchor = fit === 'contain' ? (s.mediaAnchor || 'center') : null;
        const colsOf = (() => {
          const row = L.owners.find((o) => o.media);
          const a = row.owner.indexOf(P.mediaSlot), b = row.owner.lastIndexOf(P.mediaSlot);
          return { a: a + 1, b: b + 1, n: b - a + 1 };
        })();
        parts.push(`<div data-slot="${esc(s.name)}" data-slot-type="${esc(s.slotType)}" data-media-slot `
          + `data-occupancy="${esc(s.occupancy)}" data-fit="${esc(fit)}"`
          + (anchor ? ` data-media-anchor="${esc(anchor)}" data-anchor-resolved` : '')
          + ` data-cols="${colsOf.a}–${colsOf.b}" data-span="${colsOf.n}" data-slot-anchor="${esc(L.footprint)}" `
          + `data-fixture="${esc(fx.id)}" data-media-kind="${esc(fx.kind)}">`
          + mediaMarkup(fx, fit) + `</div>`);
      } else {
        parts.push(`<div data-slot="${esc(s.name)}" data-slot-type="${esc(s.slotType)}" `
          + `data-occupancy="${esc(s.occupancy)}">${slotBody(pid, s.name, opts.adversarial)}</div>`);
      }
    }
    secs.push({ klass, fx, L, sd, body: `<div class="cp-page ss-page" data-pattern="${esc(pid)}" `
      + `data-subdesign="${esc(L.footprint || 'none')}" data-inst="0"><div class="cp-surface">`
      + `<div class="cp-grid-host" data-sd="${esc(sd)}">${parts.join('\n')}</div></div></div>` });
  }

  /* one stylesheet per section, generated from the split vocabulary */
  const css = secs.filter((s) => !s.missing).map((s) =>
    `[data-sd="${s.sd}"]{display:grid;grid-template-columns:repeat(${g.columns},1fr);column-gap:${g.gutter}px;`
    + `row-gap:${s.klass === 'x' ? 0 : 32}px;grid-template-areas:\n${s.L.areas.map((r) => `  "${r}"`).join('\n')};}\n`
    + CAT[pid].slots.map((x) => `[data-sd="${s.sd}"] > [data-slot="${x.name}"]{grid-area:${x.name};}`).join('\n')).join('\n');

  let html = secs.map((s) => {
    if (s.missing) return `<div class="ss-sec"><p class="ss-rule">${esc(s.klass)} → <i>no fixture of this `
      + `geometry class is allowed in this pattern's media slot, so the atlas cannot show it</i></p>`
      + `<p class="ss-none">Not a failure of the span system — a gap in the fixture set or in what the slot admits. Named rather than faked.</p></div>`;
    return `<div class="ss-sec" data-klass="${esc(s.klass)}">`
      + `<p class="ss-rule">${esc(s.klass)} → <b>${esc(s.L.footprint || '—')}</b>`
      + (s.fx ? ` <i>· ${esc(s.fx.id)} · aspect ${s.fx.aspect} · ${esc(P.slotFit)}</i>` : '') + `</p>`
      + diagram(surface, s.L.owners) + s.body + `{{INS:${esc(s.klass)}}}</div>`;
  }).join('');

  /* figures */
  for (const s of secs) {
    if (s.missing || !s.fx || s.fx.kind !== 'graph') continue;
    const row = s.L.owners.find((o) => o.media);
    const n = row.owner.filter((x) => x === P.mediaSlot).length;
    const box = await boxFor(s.fx.figure, spanPx(surface, n));
    html = html.split(`{{FIG:${s.fx.figure}}}`).join(skin(box.w, box.h, box.html));
  }

  const doc = `<!doctype html><html data-theme="mathematics"><head><meta charset="utf-8"><style>
${APP_CSS}
</style><style>
:root{--cp-surface:${g.width}px;--cp-pad:${g.pad}px;--cp-pad-y:24px;--cp-frame:0px;--cp-cols:${g.columns};
--cp-gut:${g.gutter}px;--cp-measure:${GRID.readingMeasure.px}px;--cp-pad-h:${surface === 'phone' ? 360 : 480}px;--cp-pane-h:460px;}
${CSS_KIT}
${BOARD_CSS}
${css}
.cp-page{box-shadow:none;border-radius:0;}
</style></head><body class="mx cp-${surface}"><div class="ss-board" style="width:${g.width + 2 * g.pad}px">
<div class="ss-head">${esc(pid)} · <b>${esc(surface)}</b> · ${g.width}px · ${g.columns} columns`
    + (opts.adversarial ? ' · ADVERSARIAL PAYLOAD' : '') + `</div>
<p class="ss-why">${t(P.why)}</p>
${html}
</div></body></html>`;

  const pg = await browser.newPage({ viewport: { width: g.width + 2 * g.pad, height: 900 }, deviceScaleFactor: 1 });
  const errs = []; pg.on('pageerror', (e) => errs.push(String(e)));
  await pg.setContent(doc, { waitUntil: 'load' });
  await pg.evaluate(async () => {
    await Promise.all([].slice.call(document.images).map((i) => i.complete ? null : new Promise((r) => { i.onload = i.onerror = r; })));
    await Promise.all([].slice.call(document.querySelectorAll('video')).map((v) => v.readyState >= 1 ? null : new Promise((r) => { v.onloadedmetadata = v.onerror = r; })));
    await document.fonts.ready;
  });
  await pg.waitForTimeout(200);
  if (errs.length) throw new SpanError(`${name}: ${errs[0]}`);

  /* MEASURED FROM THE RENDERED DOM, through the same function the composition and slot-fit atlases
     use, so a verdict here cannot differ from a verdict there. */
  const media = await pg.evaluate(measureMedia);
  const rows = [];
  for (const x of media) {
    const ctx = { surface, pattern: CAT[pid], fixture: FIXTURES.find((f) => f.id === x.fixture), grid: GRID, vocab: VOCAB, colW, spanPx };
    const fit = slotFit(x, ctx);
    rows.push({ x, fit, lines: inspectorLines(x, ctx, fit) });
  }
  /* the inspector panel, printed per section from those same lines */
  await pg.evaluate(({ cards }) => {
    for (const c of cards) {
      const sec = document.querySelector(`.ss-sec[data-klass="${c.klass}"]`);
      if (!sec) continue;
      const d = document.createElement('div');
      d.className = 'ss-ins'; if (!c.ok) d.setAttribute('data-bad', '');
      d.innerHTML = c.lines.map(([k, v]) => `<div><b>${k}</b><i>${String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;')}</i></div>`).join('');
      sec.appendChild(d);
    }
    document.body.innerHTML = document.body.innerHTML.replace(/\{\{INS:[a-z]+\}\}/g, '');
  }, { cards: rows.map((r, i) => ({ klass: secs.filter((s) => !s.missing)[i].klass, ok: r.fit.ok, lines: r.lines })) });
  await pg.waitForTimeout(120);

  if (!opts.noShot) {
    const bb = await (await pg.$('.ss-board')).boundingBox();
    await pg.setViewportSize({ width: Math.ceil(bb.width), height: Math.min(28000, Math.ceil(bb.height) + 8) });
    await pg.waitForTimeout(120);
    await (await pg.$('.ss-board')).screenshot({ path: path.join(OUT, name + '.png') });
  }
  await pg.close();

  for (let i = 0; i < rows.length; i++) {
    const s = secs.filter((q) => !q.missing)[i];
    REPORT.push({ pattern: pid, surface, klass: s.klass, footprint: s.L.footprint,
      paintedSplit: s.L.owners.find((o) => o.media) ? s.L.owners.find((o) => o.media).split : null,
      fixture: s.fx && s.fx.id,
      adversarial: !!opts.adversarial, owners: s.L.owners.map((o) => ({ split: o.split, owner: o.owner, media: o.media })),
      slotSpan: rows[i].x.span, slotPx: rows[i].x.slotW, paintedW: rows[i].x.paintedW, paintedH: rows[i].x.paintedH,
      unclaimed: rows[i].fit.unclaimed, ok: rows[i].fit.ok, verdict: rows[i].fit.verdict });
  }
  const shown = secs.filter((q) => !q.missing).length;
  console.log(`  ${name.padEnd(46)} ${shown}/${classes.length} class(es)  `
    + secs.filter((q) => !q.missing).map((q) => `${q.klass}→${q.L.footprint}`).join(' '));
  return { name, secs };
}

const PIDS = Object.keys(FOOT.patterns).filter((p) => !ONLY || ONLY.has(p));
const SURFS = SURFACES.filter((s) => !SURF || SURF.has(s));
console.log(`\nboards — ${PIDS.length} pattern(s) × ${SURFS.length} surface(s)`);
for (const pid of PIDS) for (const surface of SURFS) await board(pid, surface);

/* the adversarial payload, on desktop only: four paragraphs instead of two */
if (SURFS.includes('desktop')) {
  console.log('\nadversarial — the same boards with twice the prose');
  for (const pid of PIDS) await board(pid, 'desktop', { adversarial: true, noShot: true });
}

await browser.close(); server.close();
fs.writeFileSync(path.join(OUT, 'slot-span-report.json'), JSON.stringify(REPORT, null, 2));

/* ── THE CONTROLS ────────────────────────────────────────────────────────────────────────────────*/
const fails = [];
const check = (cond, msg) => { if (!cond) fails.push(msg); };

/* 0 · A PATTERN HAS ONE LEFT EDGE OR ONE CENTRE LINE, NEVER BOTH. Found by looking at a board:
      interactive.primary started its intro at column 1 and its instrument at column 3, so the page
      had two left edges and neither read as deliberate. A `left-edge` pattern starts every prose row
      at column 1 and may still centre its MEDIA — a centred object on a left-aligned page is a
      deliberate stage. A `spine` pattern centres everything on one line. */
for (const pid of PIDS) {
  const P = FOOT.patterns[pid];
  check(['left-edge', 'spine'].includes(P.edge), `${pid}: declares edge \`${P.edge}\`, which is neither left-edge nor spine`);
  for (const surface of SURFS) {
    const proseStarts = new Set(), mediaSlot = P.mediaSlot;
    for (const r of (P.rows[surface] || [])) {
      if (r.media) continue;
      const sp = SPANS.surfaces[surface].splits[r.split];
      if (!sp) continue;
      /* ONLY THE ROWS THAT DEFINE THE PAGE'S EDGE. A row holding TWO real slots is a pair, and the
         second region's start is the split's design — caseB begins at column 7 because `6/6` says so,
         not because anything drifted. The first version counted those and fired on the two patterns
         whose pairs are the ones this whole layer kept. */
      const named = r.regions.filter((x) => x !== 'reading-margin' && x !== 'containment');
      if (named.length !== 1) continue;
      r.regions.forEach((who, i) => {
        if (who === 'reading-margin' || who === 'containment' || who === mediaSlot) return;
        proseStarts.add(sp.regions[i][0]);
      });
    }
    if (proseStarts.size > 1)
      fails.push(`${pid}/${surface}: prose rows start at columns ${[...proseStarts].sort().join(' and ')} — `
        + `a pattern has ONE left edge or ONE centre line, never both`);
    const want = P.edge === 'spine' ? null : 1;
    if (want && proseStarts.size && !proseStarts.has(1))
      fails.push(`${pid}/${surface}: declares \`left-edge\` and its prose starts at column ${[...proseStarts][0]}`);
  }
}

/* 1 · NO UNNAMED MASTER-GRID COLUMNS. Every column of every row of every render has an owner, and
      the only legal non-slot owners are a declared reading margin and a centred split's containment. */
for (const r of REPORT) for (const row of r.owners) {
  const bad = row.owner.map((o, i) => o ? null : i + 1).filter(Boolean);
  check(!bad.length, `${r.pattern}/${r.surface}/${r.klass}: column(s) ${bad.join(', ')} own nothing`);
  const roles = new Set(row.owner.filter((o) => o === 'reading-margin' || o === 'containment'));
  for (const role of roles) {
    const sp = SPANS.surfaces[r.surface].splits[row.split];
    check(role !== 'containment' || sp.kind === 'centred',
      `${r.pattern}/${r.surface}/${r.klass}: \`containment\` in ${row.split}, which is not a centred split`);
  }
}

/* 2 · EVERY PAINTED FOOTPRINT IS AN APPROVED PATTERN SPAN, and the approved one for its class. */
for (const r of REPORT) {
  const P = FOOT.patterns[r.pattern];
  const want = P.footprints[r.surface] && P.footprints[r.surface][r.klass];
  check(r.paintedSplit === want, `${r.pattern}/${r.surface}/${r.klass}: the row used ${r.paintedSplit}, `
    + `and the table says ${want} — a renderer may not choose a footprint the pattern did not approve for this class`);
  const sp = SPANS.surfaces[r.surface].splits[r.paintedSplit];
  check(!!sp, `${r.pattern}/${r.surface}/${r.klass}: ${r.paintedSplit} is not approved at ${r.surface}`);
  if (sp) {
    const widths = sp.regions.map((g2) => g2[1] - g2[0] + 1);
    check(widths.includes(r.slotSpan), `${r.pattern}/${r.surface}/${r.klass}: painted ${r.slotSpan} columns, `
      + `and ${r.paintedSplit} has regions of ${widths.join('/')} columns`);
  }
}

/* 3 · A `fill` OBJECT CONSUMES ITS SLOT AND A `contain` OBJECT HAS A RESOLVED WIDTH AND ANCHOR —
      the shared verdict already decides this; here it is simply required to have passed. */
for (const r of REPORT) check(r.ok, `${r.pattern}/${r.surface}/${r.klass}: ${r.verdict}`);

/* 4 · PROSE LENGTH CANNOT MOVE A COLUMN. The adversarial payload doubles the writing; every span,
      every footprint and every slot width must be identical. */
{
  const key = (r) => `${r.pattern}|${r.surface}|${r.klass}`;
  const plain = new Map(REPORT.filter((r) => !r.adversarial).map((r) => [key(r), r]));
  let compared = 0;
  for (const a of REPORT.filter((r) => r.adversarial)) {
    const b = plain.get(key(a)); if (!b) continue;
    compared++;
    check(a.footprint === b.footprint && a.slotSpan === b.slotSpan && Math.abs(a.slotPx - b.slotPx) < TOLPX,
      `${key(a)}: the adversarial payload moved the footprint (${b.footprint} ${b.slotSpan}col ${b.slotPx}px `
      + `→ ${a.footprint} ${a.slotSpan}col ${a.slotPx}px) — how much an author writes may not decide a composition`);
  }
  check(compared > 0, 'no adversarial comparison ran, so the prose-independence control is untested');
  console.log(`\ncontrol · prose length moved nothing across ${compared} comparison(s)`);
}

/* 5 · MEDIA GEOMETRY MAY SELECT ANOTHER FOOTPRINT — and must actually be seen to. A vocabulary that
      never varies is not a vocabulary. */
{
  const varied = [];
  for (const pid of PIDS) for (const s of SURFS) {
    const fps = new Set(REPORT.filter((r) => r.pattern === pid && r.surface === s && !r.adversarial).map((r) => r.footprint));
    if (fps.size > 1) varied.push(`${pid}@${s}: ${[...fps].join(' / ')}`);
  }
  /* ASKED OF THE RUN THAT ACTUALLY HAPPENED. An earlier version skipped this whenever the run was
     filtered, which also made it unable to fail on a slice. It now asks whether any pattern IN THIS
     RUN has a table that could vary, and requires the renders to show it if so. */
  /* ASKED ONLY OF THE CLASSES THAT ACTUALLY RENDERED. A pattern may approve a footprint for a class
     no fixture can supply — interactive.primary approves one for `portrait` and there is no portrait
     instrument — and that is a gap in the fixtures, not a renderer that ignores its table. */
  const couldVary = PIDS.some((pid) => SURFS.some((s2) => {
    const tbl = FOOT.patterns[pid].footprints[s2];
    if (!tbl) return false;
    const rendered = REPORT.filter((r) => r.pattern === pid && r.surface === s2 && !r.adversarial).map((r) => r.klass);
    return new Set(rendered.map((k) => tbl[k])).size > 1;
  }));
  check(!couldVary || varied.length > 0,
    'a pattern in this run approves more than one footprint for the classes it rendered and every render '
    + 'took the same one — the selection rule is not doing anything');
  /* NAMED, NOT FAILED: approved footprints no fixture in this run can reach. */
  const unreachable = [];
  for (const pid of PIDS) for (const s2 of SURFS) {
    const tbl = FOOT.patterns[pid].footprints[s2]; if (!tbl) continue;
    const rendered = new Set(REPORT.filter((r) => r.pattern === pid && r.surface === s2 && !r.adversarial).map((r) => r.klass));
    for (const k of Object.keys(tbl)) if (!rendered.has(k)) unreachable.push(`${pid}@${s2}/${k}→${tbl[k]}`);
  }
  if (unreachable.length) console.log(`  approved and unreachable (no fixture of that class the slot admits): `
    + `${unreachable.length} — ${[...new Set(unreachable.map((u) => u.split('@')[0] + ' ' + u.split('/')[1]))].join(', ')}`);
  console.log(`control · geometry selected a different footprint in ${varied.length} case(s)`);
  for (const v of varied) console.log(`    ${v}`);
}

/* 6 · EACH SURFACE SELECTS FROM ITS OWN VOCABULARY, and is not the desktop design squeezed. */
for (const r of REPORT) {
  const own = SPANS.surfaces[r.surface].splits;
  check(!!own[r.footprint], `${r.pattern}/${r.surface}: footprint ${r.footprint} is not approved at ${r.surface}`);
}
{
  /* A SURFACE SELECTS A NAMED SPAN; IT DOES NOT SCALE ONE. The signature of a continuous squeeze is
     that the painted width lands somewhere between the spans the surface approves, because a
     percentage of a surface is almost never a whole number of columns plus gutters. Selecting by
     name lands exactly on one, every time. (The first version of this control compared a hand-rolled
     "scaled" signature of the two layouts and could not be made to fail.) */
  for (const r of REPORT) {
    const S2 = SPANS.surfaces[r.surface];
    const legal = new Set();
    for (const sp of Object.values(S2.splits)) for (const g2 of sp.regions) legal.add(g2[1] - g2[0] + 1);
    const px = [...legal].map((n) => ({ n, px: spanPx(r.surface, n) }));
    const hit = px.find((q) => Math.abs(q.px - r.slotPx) <= TOLPX);
    check(!!hit, `${r.pattern}/${r.surface}/${r.klass}: the slot is painted ${r.slotPx}px, which is not any span `
      + `${r.surface} approves (${px.map((q) => `${q.n}=${q.px}`).join(', ')}) — that is a width someone computed, `
      + `not a span someone named`);
  }
}

console.log('');
if (fails.length) {
  console.log(`${fails.length} CONTROL FAILURE(S)`);
  for (const f of fails) console.log(`  ✗ ${f}`);
} else console.log('every control passed');

/* the coverage table the maintainer reads */
console.log('\nFOOTPRINTS, AS RENDERED — "why this many columns?" answered by name');
for (const pid of PIDS) {
  const P = FOOT.patterns[pid];
  if (!P.mediaSlot) { console.log(`  ${pid.padEnd(22)} no media slot`); continue; }
  for (const s of SURFS) {
    const line = CLASSES.map((k) => {
      const r = REPORT.find((q) => q.pattern === pid && q.surface === s && q.klass === k && !q.adversarial);
      return r ? `${k}→${r.footprint}(${r.slotSpan}col ${Math.round(r.paintedW)}×${Math.round(r.paintedH)})` : `${k}→—`;
    }).join('  ');
    console.log(`  ${pid.padEnd(22)} ${s.padEnd(8)} ${line}`);
  }
}
console.log(`\nwrote ${path.relative(root, OUT)} — ${REPORT.filter((r) => !r.adversarial).length} rendered footprint(s)`);
if (fails.length) process.exitCode = 1;
