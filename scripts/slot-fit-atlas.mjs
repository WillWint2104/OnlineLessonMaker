/* ── THE SLOT FIT ATLAS ───────────────────────────────────────────────────────────────────────────

   The composition atlas answers "what pattern is this?" against the real lesson. This one answers a
   different question against DELIBERATELY REPRESENTATIVE MEDIA: is the object actually inhabiting
   the slot the pattern gave it?

   Ten permanent fixtures — a tall, a balanced and a wide plane; a 3:4, a 1:1 and a 16:9 raster; a
   16:9 clip; a 4:3 and a 16:9 instrument; and a portrait diagram — are put through every approved
   slot they are allowed to occupy, at every surface, with the slot inspector overlaid. They are
   regression assets, not mockups: the same bytes produce the same proof next month.

   WHAT IS JUDGED AND WHAT IS PHOTOGRAPHED ARE NOT THE SAME SET. Every legal combination is rendered
   and judged, because the contract is only a contract if it is enforced everywhere. The GOLDEN
   PROOFS — one per approved subdesign, and at least one per media family — are the ones that also
   get an inspector photograph, because those are what a human approves.

   NOTHING HERE DECIDES A COMPOSITION. The subdesign is chosen by the frozen rule and nothing else:
   the surface, and the media's aspect class. No occupancy, no prose heights, no step counts, no
   judgement about balance. Where none of a pattern's approved subdesigns can hold the object, the
   build REPORTS THE INCOMPATIBILITY rather than improvising one. */

import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { openFigurePage, makePainter, makeSolvers, square, classOf } from './lib/figure-geometry.mjs';
import { MEDIA_SLOTS, TOLPX, anchorFromAreas, measureMedia, slotFit, inspectorLines, drawInspector } from './lib/slots.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(root, 'docs/atlas/composition/src');
const OUT = path.resolve(process.argv[2] || path.join(root, 'docs/atlas/slot-fit'));
const MEDIA_DIR = path.join(root, 'docs/atlas/media');

const GRID = JSON.parse(fs.readFileSync(path.join(SRC, 'grid.json'), 'utf8'));
const VOCAB = JSON.parse(fs.readFileSync(path.join(SRC, 'vocabulary.json'), 'utf8'));
const PATTERNS = JSON.parse(fs.readFileSync(path.join(SRC, 'patterns.json'), 'utf8'));
const CSS_KIT = fs.readFileSync(path.join(SRC, 'composition.css'), 'utf8');
const MEDIA = JSON.parse(fs.readFileSync(path.join(MEDIA_DIR, 'media.json'), 'utf8'));
const FIGS = JSON.parse(fs.readFileSync(path.join(root, 'docs/atlas/worked-examples/src/figures.json'), 'utf8'));
const BANDS = JSON.parse(fs.readFileSync(path.join(root, 'docs/atlas/worked-examples/src/atlas.json'), 'utf8')).mediaGeometry.bands;
const SURFACES = Object.keys(GRID.surfaces);
const ONLY = process.env.SF_ONLY ? new Set(process.env.SF_ONLY.split(',')) : null;

class SlotError extends Error { constructor(m) { super(m); this.name = 'SlotError'; } }

/* ── the grid, as arithmetic. grid.json is its one owner; this is only reading it ────────────────*/
const colW = (s) => (GRID.surfaces[s].width - (GRID.surfaces[s].columns - 1) * GRID.surfaces[s].gutter) / GRID.surfaces[s].columns;
const span = (s, n) => n * colW(s) + (n - 1) * GRID.surfaces[s].gutter;
const spanPx = (s, n) => +span(s, n).toFixed(2);

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const t = (s) => esc(s).replace(/\*([^*]+)\*/g, '<i>$1</i>').replace(/\^([-−]?[0-9A-Za-z]+)/g, '<sup>$1</sup>');

function areaSpans(areas) {
  const rows = areas.map((r) => r.trim().split(/\s+/));
  const out = {};
  rows.forEach((cells, ri) => cells.forEach((name, ci) => {
    if (name === '.') return;
    const o = out[name] || (out[name] = { c0: ci, c1: ci, r0: ri, r1: ri });
    o.c0 = Math.min(o.c0, ci); o.c1 = Math.max(o.c1, ci);
    o.r0 = Math.min(o.r0, ri); o.r1 = Math.max(o.r1, ri);
  }));
  for (const o of Object.values(out)) o.cols = o.c1 - o.c0 + 1;
  return out;
}

function areasCSS(surface) {
  const out = [];
  for (const [id, p] of Object.entries(PATTERNS)) {
    if (id.startsWith('_')) continue;
    for (const d of p.subdesigns) {
      if (d.surface !== surface) continue;
      out.push(`[data-pattern="${id}"][data-subdesign="${d.id}"]{grid-template-areas:\n`
        + d.areas.map((r) => `  "${r}"`).join('\n') + ';}');
      for (const s of p.slots.filter((x) => x.occupancy === 'optional-collapse')) {
        const kept = d.areas.filter((r) => r.trim().split(/\s+/).some((n) => n !== '.' && n !== s.name));
        if (kept.length === d.areas.length) continue;
        out.push(`[data-pattern="${id}"][data-subdesign="${d.id}"][data-without~="${s.name}"]{grid-template-areas:\n`
          + kept.map((r) => `  "${r}"`).join('\n') + ';}');
      }
    }
    for (const s of p.slots) out.push(`[data-pattern="${id}"] > [data-slot="${s.name}"]{grid-area:${s.name};}`);
  }
  return out.join('\n');
}

const tokens = (s) => {
  const g = GRID.surfaces[s];
  return `:root{--cp-surface:${g.width}px;--cp-pad:${g.pad}px;--cp-pad-y:${s === 'phone' ? 22 : s === 'tablet' ? 26 : 32}px;`
    + `--cp-frame:${s === 'phone' ? 12 : s === 'tablet' ? 20 : 30}px;--cp-cols:${g.columns};--cp-gut:${g.gutter}px;`
    + `--cp-measure:${GRID.readingMeasure.px}px;--cp-pad-h:${s === 'phone' ? 360 : 480}px;--cp-pane-h:460px;}`;
};

/* ── the fixtures ─────────────────────────────────────────────────────────────────────────────────
   Each one knows its own shape and its own authored presentation width, and NOTHING ELSE. It cannot
   express a preference about the page it lands on. */
const BLOCK_OF = { graph: 'graph', image: 'image', diagram: 'image', video: 'video', interactive: 'interactive' };
const FIXTURES = Object.entries(MEDIA.fixtures).map(([id, f]) => {
  const aspect = f.kind === 'graph'
    ? (() => { const d = FIGS[f.figure].figure.domain; return (d.yMax - d.yMin) / (d.xMax - d.xMin); })()
    : f.aspect;
  if (!aspect) throw new SlotError(`fixture ${id} declares no aspect`);
  return { id, ...f, aspect: +aspect.toFixed(4), klass: classOf(aspect, BANDS), block: BLOCK_OF[f.kind] };
});
const asset = (name) => fs.readFileSync(path.join(MEDIA_DIR, name));
const dataURI = (name) => {
  const ext = path.extname(name);
  const mime = { '.png': 'image/png', '.svg': 'image/svg+xml', '.webm': 'video/webm' }[ext];
  if (!mime) throw new SlotError(`no mime for ${name}`);
  return `data:${mime};base64,${asset(name).toString('base64')}`;
};

/* ── filler ───────────────────────────────────────────────────────────────────────────────────────
   IDENTICAL FOR EVERY FIXTURE, so the media is the only variable in the whole atlas. That is also
   what makes control 9 meaningful: if a page changes its subdesign, the media's aspect class or the
   surface changed, because nothing else did. It is deliberately not lesson content. */
const F = {
  lede: 'A fixture page. Every word on it is the same for every media family, so the object is the only thing that varies.',
  para: ['The prose here exists to give the slot neighbours a realistic weight. It says nothing about the object beside it, '
    + 'and it is the same length on every page in this atlas.',
    'A second paragraph, so a reading column has somewhere to go and a paired row has two real sides.'],
  key: 'The key idea sits where the pattern puts it, at the span the pattern approves.',
  caseA: 'Case A', caseB: 'Case B',
  q: ['A first question, short.', 'A second question, a little longer than the first one is.', 'A third.'],
};

function mediaMarkup(fx, slotFitKind) {
  const cap = fx.caption ? `<figcaption class="cp-figcap">${t(fx.caption)}</figcaption>` : '';
  if (fx.kind === 'graph') return `<figure class="cp-figure">{{FIG:${fx.figure}}}${cap}</figure>`;
  if (fx.kind === 'interactive') {
    /* an instrument: a frame with a designed shape and its controls. It takes the slot's width and
       derives its height from the authored aspect — never the other way round. */
    return `<div class="cp-media" data-media-object style="aspect-ratio:${1 / fx.aspect};background:`
      + `linear-gradient(#eef1f0,#dfe6e3);border:1px solid #cfd8d4;border-radius:3px;position:relative">`
      + `<span style="position:absolute;left:12px;top:10px;font:600 12px/1.4 ui-monospace,Menlo,monospace;color:#3d4a45">`
      + `${esc(fx.label)}</span></div>`
      + `<div class="cp-controls" role="group" aria-label="Controls">`
      + (fx.controls || []).map((c) => `<div class="cp-ctl"><span class="cp-ctl-name">${t(c.name)}</span>`
        + `<span class="cp-track"><span class="cp-knob" style="left:calc(${c.at}% - 8px)"></span></span>`
        + `<span class="cp-ctl-val">${t(c.value)}</span></div>`).join('')
      + `</div>`;
  }
  const inner = fx.kind === 'video'
    ? `<video data-media-object src="${dataURI(fx.src)}" poster="${dataURI(fx.poster)}" `
      + `width="${fx.raster[0]}" height="${fx.raster[1]}" controls muted playsinline preload="metadata"></video>`
    : `<img data-media-object src="${dataURI(fx.src)}" width="${fx.raster[0]}" height="${fx.raster[1]}" `
      + `alt="${esc(fx.alt || '')}" decoding="sync">`;
  /* THE AUTHORED PRESENTATION WIDTH, never the raster's own pixels. Under `fill` the slot gives the
     width; under `contain` the object is capped at what the author said it should be shown at. */
  const cw = slotFitKind === 'contain' ? ` style="width:min(${fx.presentationWidth}px,100%)"` : '';
  return `<figure class="cp-figure"><span class="cp-media"${cw}>${inner}</span>${cap}</figure>`;
}

function filler(slot) {
  switch (slot.slotType) {
    case 'reading': return `<div class="cp-prose">${F.para.map((x) => `<p>${t(x)}</p>`).join('')}</div>`;
    case 'support': return `<aside class="cp-key"><p class="cp-lab">Key idea</p><p>${t(F.key)}</p></aside>`;
    case 'worked': return `<div class="cp-prose"><h3>${t(F.caseA)}</h3><p>${t(F.para[0])}</p></div>`;
    case 'examples': return `<div class="cp-prose"><h3>Worked</h3><p>${t(F.para[0])}</p></div>`;
    case 'questions': return `<ol class="cp-qset">${F.q.map((q) => `<li class="cp-qitem"><p>${t(q)}</p></li>`).join('')}</ol>`;
    case 'workspace': return `<div class="cp-pad"><div class="cp-pad-head"><p class="cp-lab">Your working</p></div>`
      + `<div class="cp-gridpaper"></div></div>`;
    default: return null;
  }
}

/* ── choosing the subdesign: the frozen rule, and nothing else ───────────────────────────────────*/
function pick(p, surface, klass) {
  const m = p.subdesigns.filter((d) => d.surface === surface && (!d.aspects || d.aspects.includes(klass)));
  if (!m.length) throw new SlotError(`${p.id}: no approved subdesign for ${surface}/${klass}`);
  return m.slice().sort((a, b) => (a.slotSpan || 0) - (b.slotSpan || 0));
}

/* every legal (fixture, pattern, surface): a fixture may occupy a slot only if the block/slot
   compatibility table already in the catalogue permits it. Nothing new decides this. */
function enumerate() {
  const out = [];
  for (const fx of FIXTURES) {
    for (const [pid, p] of Object.entries(PATTERNS)) {
      if (pid.startsWith('_')) continue;
      const slot = p.slots.find((s) => MEDIA_SLOTS.has(s.slotType) && s.allowedBlocks.includes(fx.block));
      if (!slot) continue;
      for (const surface of SURFACES) out.push({ fx, pid, p, slot, surface });
    }
  }
  return out;
}

/* ── build one page ──────────────────────────────────────────────────────────────────────────────*/
const FIGREQ = new Set();
function build(job, subdesign) {
  const { fx, p, slot, surface } = job;
  const spans = areaSpans(subdesign.areas);
  const parts = [], absent = new Set();
  for (const s of p.slots) {
    if (s.name === slot.name) {
      if (fx.kind === 'graph') FIGREQ.add(fx.figure);
      const anchor = s.slotFit === 'contain' ? (s.mediaAnchor || 'center') : null;
      parts.push(`<div data-slot="${esc(s.name)}" data-slot-type="${esc(s.slotType)}" `
        + `data-occupancy="${esc(s.occupancy)}" data-media-slot data-fit="${esc(s.slotFit)}"`
        + (anchor ? ` data-media-anchor="${esc(anchor)}" data-anchor-resolved` : '')
        + ` data-cols="${spans[s.name].c0 + 1}–${spans[s.name].c1 + 1}" data-span="${spans[s.name].cols}"`
        + ` data-slot-anchor="${esc(subdesign.slotAnchor)}" data-fixture="${esc(fx.id)}" `
        + `data-media-kind="${esc(fx.kind)}">`
        + (s.label ? `<p class="cp-lab">${esc(s.label)}</p>` : '')
        + mediaMarkup(fx, s.slotFit) + `</div>`);
      continue;
    }
    const body = spans[s.name] ? filler(s) : null;
    if (!body) { if (s.occupancy !== 'required') absent.add(s.name); continue; }
    parts.push(`<div data-slot="${esc(s.name)}" data-slot-type="${esc(s.slotType)}" `
      + `data-occupancy="${esc(s.occupancy)}">`
      + (s.label ? `<p class="cp-lab">${esc(s.label)}</p>` : '') + body + `</div>`);
  }
  const without = [...absent].join(' ');
  return `<div data-pattern="${esc(p.id)}" data-subdesign="${esc(subdesign.id)}" data-inst="0"`
    + (without ? ` data-without="${esc(without)}"` : '') + `>\n${parts.join('\n')}\n</div>`;
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
  await q.close();
  return css;
})();

const figPage = await openFigurePage(browser, base);
const paint = makePainter(figPage);
const { boxForWidth } = makeSolvers(paint);
const BOX = new Map();
async function boxFor(key, w) {
  const ck = `${key}|${Math.round(w)}`;
  if (BOX.has(ck)) return BOX.get(ck);
  const b = await boxForWidth(key, FIGS[key].figure, Math.round(w));
  if (!b) throw new SlotError(`${key}: no box at all fits a ${w}px slot`);
  if (!square(b.box)) throw new SlotError(`${key}: no height in a ${w}px slot paints this domain at equal unit scale`);
  BOX.set(ck, b.box);
  return b.box;
}
const skin = (w, h, html) => `<div class="mx-part" data-mx-part="figure" data-fig-viewport `
  + `style="position:relative;width:${w}px;height:${h}px"><div class="mx-figstage">`
  + `<div class="mx-figskin tp-slide">${html}</div></div></div>`;

fs.mkdirSync(OUT, { recursive: true });

async function render(job, subdesign, name, { shoot }) {
  const { fx, p, slot, surface } = job;
  const g = GRID.surfaces[surface];
  let body = build(job, subdesign);
  if (fx.kind === 'graph') {
    const w = spanPx(surface, subdesign.slotSpan);
    const box = await boxFor(fx.figure, w);
    body = body.split(`{{FIG:${fx.figure}}}`).join(skin(box.w, box.h, box.html));
  }
  const doc = `<!doctype html><html data-theme="mathematics"><head><meta charset="utf-8"><style>
${APP_CSS}
</style><style>
${tokens(surface)}
${CSS_KIT}
${areasCSS(surface)}
</style></head><body class="mx cp-${surface}"><div class="cp-page">
<div class="cp-cap"><span class="cp-tpl">${esc(fx.id)} · ${esc(fx.klass)} · ${esc(p.id)}/${esc(subdesign.id)} · `
    + `${esc(surface)} ${g.width}px · ${g.columns} columns · slot ${esc(slot.name)} ${subdesign.slotSpan}col `
    + `${esc(slot.slotFit)}/${esc(subdesign.slotAnchor)}</span>${esc(fx.label)}</div>
<div class="cp-surface">
<h1 class="cp-h1">${t(fx.label)}</h1><p class="cp-lede">${t(F.lede)}</p>
<div class="cp-rule"></div>
${body}
</div>
<div class="cp-note">The subdesign was chosen from the surface and the object’s aspect class and nothing else.
Slots take their geometry from the master grid; the object takes its width from its slot and its height from its own shape.</div>
</div></body></html>`;

  const pg = await browser.newPage({ viewport: { width: g.width + 2 * g.pad + 120, height: 900 }, deviceScaleFactor: 1 });
  const errs = []; pg.on('pageerror', (e) => errs.push(String(e)));
  await pg.setContent(doc, { waitUntil: 'load' });
  /* a raster or a clip that has not decoded has no intrinsic shape, and the distortion control
     would then have nothing to compare against */
  await pg.evaluate(async () => {
    await Promise.all([].slice.call(document.images).map((i) => i.complete ? null
      : new Promise((r) => { i.onload = i.onerror = r; })));
    await Promise.all([].slice.call(document.querySelectorAll('video')).map((v) => v.readyState >= 1 ? null
      : new Promise((r) => { v.onloadedmetadata = v.onerror = r; })));
    await document.fonts.ready;
  });
  await pg.waitForTimeout(220);
  if (errs.length) throw new SlotError(`${name}: ${errs[0]}`);

  const media = await pg.evaluate(measureMedia);
  if (media.length !== 1) throw new SlotError(`${name}: ${media.length} media slots painted, expected exactly 1`);
  /* WHAT A `paired` ROW LEAVES BESIDE THE OBJECT. Measured and printed, and compared to NOTHING:
     the neighbour in a paired row is prose, prose length is content, and content may never decide a
     composition. A threshold here would be the resolver. It is evidence for a human. */
  const pairGap = await pg.evaluate(() => {
    const el = document.querySelector('[data-media-slot]');
    if (!el || el.getAttribute('data-slot-anchor') !== 'paired') return null;
    const r = el.getBoundingClientRect();
    const sibs = [].slice.call(el.parentElement.children).filter((q) => q !== el && q.getClientRects().length)
      .map((q) => ({ name: q.getAttribute('data-slot'), b: q.getBoundingClientRect() }))
      .filter((q) => q.b.top < r.bottom - 1 && q.b.bottom > r.top + 1 && (q.b.left >= r.right - 1 || q.b.right <= r.left + 1));
    if (!sibs.length) return null;
    const tallest = sibs.reduce((a, q) => q.b.height > a.b.height ? q : a);
    return { beside: tallest.name, objectH: Math.round(r.height), besideH: Math.round(tallest.b.height),
      gap: Math.round(r.height - tallest.b.height) };
  });
  const x = media[0];
  const ctx = { surface, pattern: p, fixture: fx, grid: GRID, vocab: VOCAB, colW, spanPx };
  const fit = slotFit(x, ctx);
  const lines = inspectorLines(x, ctx, fit);

  if (shoot) {
    await pg.evaluate(drawInspector, [{ slot: x.name, inst: x.inst, ok: fit.ok, span: x.span, fit: x.fit, lines }]);
    /* CONTROL · THE INSPECTOR'S VERDICT MUST AGREE WITH THE DOM IT IS DRAWN OVER. Two ways it could
       not: the overlay perturbs the layout it is describing, or the text is stale against the pixels
       underneath it. So the page is measured AGAIN, after drawing, and the numbers the panel prints
       are checked against that fresh measurement and against the rectangles actually painted. */
    const after = await pg.evaluate(measureMedia);
    const y = after[0];
    const moved = ['slotW', 'paintedW', 'paintedH', 'freeL', 'freeR']
      .filter((k) => Math.abs((y[k] ?? 0) - (x[k] ?? 0)) > 0.5);
    if (moved.length) throw new SlotError(`${name}: drawing the inspector MOVED the page it describes `
      + `(${moved.map((k) => `${k} ${x[k]}→${y[k]}`).join(', ')})`);
    const drawn = await pg.evaluate(() => {
      const s2 = document.querySelector('.ins-slot'), p2 = document.querySelector('.ins-paint');
      return s2 && p2 ? { slot: +s2.getBoundingClientRect().width.toFixed(2),
        paint: +p2.getBoundingClientRect().width.toFixed(2) } : null;
    });
    if (!drawn) throw new SlotError(`${name}: the inspector drew no slot or object outline`);
    if (Math.abs(drawn.slot - y.slotW) > TOLPX || Math.abs(drawn.paint - y.paintedW) > TOLPX)
      throw new SlotError(`${name}: the inspector OUTLINES ${drawn.slot}px slot / ${drawn.paint}px object `
        + `where the DOM has ${y.slotW}px / ${y.paintedW}px`);
    const printed = lines.find((l) => l[0] === 'UNCLAIMED INTERNAL WIDTH');
    const said = printed ? parseFloat(String(printed[1])) : NaN;
    const real = +(y.slotW - y.paintedW).toFixed(2);
    if (!Number.isNaN(said) && Math.abs(said - real) > TOLPX)
      throw new SlotError(`${name}: the inspector PRINTS ${said}px unclaimed where the DOM has ${real}px`);
    const bb = await (await pg.$('.cp-page')).boundingBox();
    await pg.setViewportSize({ width: g.width + 2 * g.pad + 120, height: Math.ceil(bb.height) + 8 });
    await pg.waitForTimeout(140);
    await (await pg.$('.cp-page')).screenshot({ path: path.join(OUT, name + '.png') });
  }
  await pg.close();
  return { x, fit, lines, name, pairGap };
}

/* ── the run ─────────────────────────────────────────────────────────────────────────────────────*/
const jobs = enumerate().filter((j) => !ONLY || ONLY.has(j.fx.id) || ONLY.has(j.pid));
if (!jobs.length) throw new SlotError('SF_ONLY matched nothing');

console.log('the fixtures — what each object says about itself, and nothing more');
for (const fx of FIXTURES)
  console.log(`  ${fx.id.padEnd(22)} ${fx.kind.padEnd(12)} aspect ${String(fx.aspect).padStart(6)} → ${fx.klass.padEnd(9)}`
    + (fx.presentationWidth ? ` · authored presentation ${fx.presentationWidth}px` : '')
    + (fx.raster ? ` · raster ${fx.raster[0]}×${fx.raster[1]}` : ''));

/* WHICH RENDERS ARE PHOTOGRAPHED, decided before anything is measured so the choice cannot be a
   function of the result: one per approved subdesign, and at least one per media family. */
const plan = [];
const seenSub = new Set(), seenFam = new Set();
for (const j of jobs) {
  const cands = pick(j.p, j.surface, j.fx.klass);
  const key = `${j.pid}/${cands[0].id}@${j.surface}`;
  const golden = !seenSub.has(key) || !seenFam.has(`${j.fx.family}@${j.surface}`);
  if (golden) { seenSub.add(key); seenFam.add(`${j.fx.family}@${j.surface}`); }
  plan.push({ ...j, cands, golden });
}
console.log(`\n${plan.length} legal combinations — every one judged, ${plan.filter((q) => q.golden).length} photographed as golden proofs`);

const REPORT = [];
for (const j of plan) {
  const name = `${j.fx.id.replace(/\./g, '-')}__${j.pid.replace(/\./g, '-')}__${j.surface}`;
  /* SPAN PROMOTION, over arrangements that already exist: the smallest approved span the object can
     inhabit. If none can, the incompatibility is reported, never improvised around. */
  let chosen = null, tried = [];
  for (const d of j.cands) {
    const r = await render(j, d, name, { shoot: false });
    tried.push(`${d.id}(${spanPx(j.surface, d.slotSpan)}px): ${r.fit.ok ? 'ok' : r.fit.verdict}`);
    if (r.fit.ok) { chosen = { d, r }; break; }
  }
  if (!chosen) {
    REPORT.push({ name, fixture: j.fx.id, pattern: j.pid, surface: j.surface, ok: false,
      incompatible: true, tried });
    console.log(`  ✗ ${name.padEnd(56)} NO APPROVED SPAN HOLDS IT — ${tried.join(' | ')}`);
    continue;
  }
  const final = j.golden ? await render(j, chosen.d, name, { shoot: true }) : chosen.r;
  REPORT.push({ name, fixture: j.fx.id, family: j.fx.family, klass: j.fx.klass, pattern: j.pid,
    subdesign: chosen.d.id, surface: j.surface, slot: final.x.name, slotFit: final.x.fit,
    slotAnchor: final.x.slotAnchor, mediaAnchor: final.x.mediaAnchor,
    slotSpan: final.x.span, slotPx: final.x.slotW, paintedW: final.x.paintedW, paintedH: final.x.paintedH,
    unclaimed: final.fit.unclaimed, ok: true, golden: j.golden, promoted: chosen.d !== j.cands[0],
    pairGap: final.pairGap, tried,
    verdict: final.fit.verdict, lines: final.lines });
  console.log(`  ${j.golden ? '◉' : '·'} ${name.padEnd(56)} ${j.pid}/${chosen.d.id} `
    + `${final.x.span}col=${final.x.slotW}px ${final.x.fit} → ${final.x.paintedW}×${Math.round(final.x.paintedH)}px`
    + (chosen.d !== j.cands[0] ? `  [promoted past ${j.cands[0].id}]` : ''));
}

fs.writeFileSync(path.join(OUT, 'slot-fit-report.json'), JSON.stringify(REPORT, null, 2));
await browser.close();
server.close();

/* ── the controls ────────────────────────────────────────────────────────────────────────────────*/
const fails = REPORT.filter((r) => !r.ok);
console.log('');
if (fails.length) {
  for (const f of fails) console.log(`INCOMPATIBLE  ${f.fixture} in ${f.pattern} at ${f.surface}\n    ${f.tried.join('\n    ')}`);
}

/* CONTROL · A FIXTURE CHANGES ITS SUBDESIGN ONLY FOR A FROZEN REASON. Every page in this atlas
   carries identical filler, so within one (pattern, surface, aspect class) the arrangement is
   already determined: the surface and the aspect class are the only inputs the rule admits. The one
   legitimate way two objects of the same class differ is SPAN PROMOTION, and a promoted render has
   to have been refused by the smaller span on the object's own evidence — which is recorded. */
{
  /* RECOMPUTED FROM THE CATALOGUE, NOT FROM THIS SCRIPT'S OWN ORDERING. The first version compared
     each result against `pick()`'s candidate list, so an injected defect that reordered `pick()`
     fooled the control as well as the renderer — it agreed with itself and said nothing. Reading
     patterns.json directly is what makes this able to fail. */
  for (const r of REPORT.filter((q) => q.ok)) {
    const p2 = PATTERNS[r.pattern];
    const approved = p2.subdesigns
      .filter((d) => d.surface === r.surface && (!d.aspects || d.aspects.includes(r.klass)) && d.slotSpan)
      .sort((a, b) => a.slotSpan - b.slotSpan);
    const at = approved.findIndex((d) => d.id === r.subdesign);
    if (at < 0) throw new SlotError(`${r.name}: took ${r.pattern}/${r.subdesign}, which the catalogue does not `
      + `approve for ${r.surface}/${r.klass} (it approves ${approved.map((d) => d.id).join(', ') || 'nothing'})`);
    if (at === 0) continue;
    /* it took something wider than the smallest approved span, so every span it stepped over must
       have REFUSED the object, on the object's own evidence, and that refusal is recorded */
    const skipped = approved.slice(0, at);
    const refused = skipped.filter((d) => (r.tried || []).some((x) => x.startsWith(d.id + '(') && !x.endsWith(': ok')));
    if (refused.length !== skipped.length)
      throw new SlotError(`${r.name}: took ${r.subdesign} (${r.slotSpan}col) over the smaller approved `
        + `${skipped.map((d) => `${d.id}(${d.slotSpan}col)`).join(', ')} with no recorded refusal — the surface `
        + `and the aspect class are the only things allowed to move a composition, and promotion is the only `
        + `thing allowed to widen one`);
    console.log(`  promotion · ${r.name}: ${skipped.map((d) => d.id).join(', ')} → ${r.subdesign}`);
  }
}

/* CONTROL · EVERY APPROVED MEDIA-BEARING SUBDESIGN HAS A SUCCESSFUL GOLDEN PROOF. An arrangement
   nobody has ever seen hold an object is design vocabulary, not design. */
const proven = new Set(REPORT.filter((r) => r.ok).map((r) => `${r.pattern}/${r.subdesign}@${r.surface}`));
const unproven = [];
for (const [pid, p] of Object.entries(PATTERNS)) {
  if (pid.startsWith('_')) continue;
  if (!p.slots.some((s) => MEDIA_SLOTS.has(s.slotType))) continue;
  for (const d of p.subdesigns) {
    if (!d.slotSpan) continue;
    if (!proven.has(`${pid}/${d.id}@${d.surface}`)) unproven.push(`${pid}/${d.id}@${d.surface}`);
  }
}
console.log('COVERAGE — every approved media-bearing subdesign, and what proves it');
for (const [pid, p] of Object.entries(PATTERNS)) {
  if (pid.startsWith('_')) continue;
  if (!p.slots.some((s) => MEDIA_SLOTS.has(s.slotType))) continue;
  for (const d of p.subdesigns) {
    if (!d.slotSpan) continue;
    const hits = REPORT.filter((r) => r.ok && r.pattern === pid && r.subdesign === d.id && r.surface === d.surface);
    console.log(`  ${(pid + '/' + d.id).padEnd(34)} ${d.surface.padEnd(8)} ${String(d.slotSpan).padStart(2)}col `
      + `${String(d.slotAnchor).padEnd(7)} ${hits.length ? `${hits.length} proof(s) · ${hits[0].fixture}` : '✗ NO PROOF'}`);
  }
}
if (unproven.length && !ONLY) throw new SlotError(`approved but never proven: ${unproven.join(', ')} — an arrangement `
  + `no object has been shown to inhabit is dead design vocabulary. Give it a fixture or remove it.`);
if (ONLY) console.log('  (SF_ONLY is set, so coverage, fit modes and media families are not claims this run can make)');

/* WHAT A PAIRED ROW LEAVES, ACROSS THE ATLAS. Not a control and deliberately not one: the slot
   contract is satisfied on every line below, and the page can still read badly because the prose
   beside the object ran out first. That is the one thing the contract cannot see, and printing it
   is the honest alternative to pretending it is not there. */
{
  const pairs = REPORT.filter((r) => r.ok && r.pairGap).sort((a, b) => b.pairGap.gap - a.pairGap.gap);
  if (pairs.length) {
    console.log('\nPAIRED ROWS — how much taller the object is than the prose beside it, with identical filler');
    console.log('  (reported, never judged: prose length is content, and content may not decide a composition)');
    for (const r of pairs)
      console.log(`  ${(r.pattern + '/' + r.subdesign).padEnd(30)} ${r.surface.padEnd(8)} ${r.fixture.padEnd(22)} `
        + `object ${String(r.pairGap.objectH).padStart(4)}px · ${r.pairGap.beside} ${String(r.pairGap.besideH).padStart(4)}px `
        + `· ${r.pairGap.gap > 0 ? '+' : ''}${r.pairGap.gap}px`);
  }
}

/* CONTROL · BOTH HALVES OF THE FIT CONTRACT ARE EXERCISED. */
const fits = new Set(REPORT.filter((r) => r.ok).map((r) => r.slotFit));
for (const f of ['fill', 'contain'])
  if (!fits.has(f) && !ONLY) throw new SlotError(`no proof in this atlas exercises \`slotFit: ${f}\``);

/* CONTROL · EVERY MEDIA FAMILY HAS A PROOF. */
const fams = new Set(REPORT.filter((r) => r.ok).map((r) => r.family));
for (const fx of FIXTURES) if (!fams.has(fx.family) && !ONLY) throw new SlotError(`media family "${fx.family}" has no proof`);

if (fails.length) throw new SlotError(`${fails.length} combination(s) have no approved span that holds the object`);

console.log(`\nwrote ${path.relative(root, OUT)} — ${REPORT.length} judged, `
  + `${REPORT.filter((r) => r.golden && r.ok).length} golden proofs photographed, `
  + `${fits.size} fit mode(s), ${fams.size} media families`);
