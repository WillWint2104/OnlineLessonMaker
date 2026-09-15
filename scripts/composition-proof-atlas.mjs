/* ── THE COMPOSITION PROOF ATLAS ──────────────────────────────────────────────────────────────────

   A PROTOTYPE, and deliberately separate: it reads docs/atlas/composition-proof/src/ and does not
   touch the shipping catalogue in docs/atlas/composition/src/, the lesson, or lesson-studio.html.

   WHAT THE SLOT-SPAN LAYER DID NOT FIX. Discrete spans made each slot's width nameable, but a
   pattern was still a COLLECTION OF INDEPENDENTLY LEGAL SLOTS. So a six-column object could sit at
   the left of a twelve-column row with nothing in the other six and every individual rule was
   satisfied; and nothing in the system had an opinion about vertical structure at all. The shipped
   lesson proves both: the portrait `visual.explanation` page paints its graph 683px wide at x=60 in
   a row that ends at x=1212 — 469px of an active row with no semantic owner, at a width the grid
   does not name.

   THE MOVE:  A PATTERN RESOLVES TO A NAMED COMPOSITION BLUEPRINT.
   A blueprint fixes the whole page — which rows exist, which columns each region takes, whether
   regions share a row or follow one another, HOW EACH ROW BEHAVES VERTICALLY, and the named step
   between one semantic region and the next. Media geometry selects among a pattern's finite set of
   blueprints; it never selects a naked span.

   THE CHAIN:  lesson intent → pattern → approved blueprint → slots and rows → geometry selects →
   content fills it.  Every arrow is a LOOKUP. Nothing here measures prose, counts steps or computes
   an occupancy fraction; the atlas measures the RESULT in order to judge it, and nothing it measures
   is fed back into a layout decision.

   Every board answers one question by eye: IS THIS A FINISHED PAGE, AND DOES EVERY PIECE OF
   WHITESPACE HAVE AN OWNER?

     node scripts/composition-proof-atlas.mjs [outDir]
     CP_ONLY=visual.explanation CP_SURFACE=desktop   render a slice                                */

import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { openFigurePage, makePainter, makeSolvers, square, classOf } from './lib/figure-geometry.mjs';
import { TOLPX, measureMedia, slotFit, inspectorLines } from './lib/slots.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BP_SRC = path.join(root, 'docs/atlas/composition-proof/src');
const COMP_SRC = path.join(root, 'docs/atlas/composition/src');
const SPAN_SRC = path.join(root, 'docs/atlas/slot-span/src');
const MEDIA_DIR = path.join(root, 'docs/atlas/media');
const OUT = path.resolve(process.argv[2] || path.join(root, 'docs/atlas/composition-proof'));

const GRID = JSON.parse(fs.readFileSync(path.join(COMP_SRC, 'grid.json'), 'utf8'));
const VOCAB = JSON.parse(fs.readFileSync(path.join(COMP_SRC, 'vocabulary.json'), 'utf8'));
const CSS_KIT = fs.readFileSync(path.join(COMP_SRC, 'composition.css'), 'utf8');
const CAT = JSON.parse(fs.readFileSync(path.join(COMP_SRC, 'patterns.json'), 'utf8'));
const SPANS = JSON.parse(fs.readFileSync(path.join(SPAN_SRC, 'spans.json'), 'utf8'));
const BP = JSON.parse(fs.readFileSync(path.join(BP_SRC, 'blueprints.json'), 'utf8'));
const MEDIA = JSON.parse(fs.readFileSync(path.join(MEDIA_DIR, 'media.json'), 'utf8'));
const FIGS = JSON.parse(fs.readFileSync(path.join(root, 'docs/atlas/worked-examples/src/figures.json'), 'utf8'));
const BANDS = JSON.parse(fs.readFileSync(path.join(root, 'docs/atlas/worked-examples/src/atlas.json'), 'utf8')).mediaGeometry.bands;

const CLASSES = ['portrait', 'balanced', 'landscape', 'wide'];
const ONLY = process.env.CP_ONLY ? new Set(process.env.CP_ONLY.split(',')) : null;
const SURF = process.env.CP_SURFACE ? new Set(process.env.CP_SURFACE.split(',')) : null;
const PROSE_TYPES = new Set(['reading', 'support', 'worked', 'examples', 'questions']);

class BlueprintError extends Error { constructor(m) { super(m); this.name = 'BlueprintError'; } }

const colW = (s) => (GRID.surfaces[s].width - (GRID.surfaces[s].columns - 1) * GRID.surfaces[s].gutter) / GRID.surfaces[s].columns;
const spanPx = (s, n) => +(n * colW(s) + (n - 1) * GRID.surfaces[s].gutter).toFixed(2);
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const t = (s) => esc(s).replace(/\*([^*]+)\*/g, '<i>$1</i>').replace(/\^([-−]?[0-9A-Za-z]+)/g, '<sup>$1</sup>');

/* the slot table for a pattern — the shipping catalogue's, or the proposal's own for a pattern the
   shipping catalogue does not have (worked.paired, which is designed in blueprints.json) */
const slotsOf = (pid) => (CAT[pid] && CAT[pid].slots) || BP.patterns[pid].slots
  || (() => { throw new BlueprintError(`${pid}: no slot table anywhere`); })();
const slotType = (pid, name) => { const s = slotsOf(pid).find((x) => x.name === name); return s ? s.slotType : null; };
const isProse = (pid, name) => PROSE_TYPES.has(slotType(pid, name));

/* ── THE BLUEPRINTS, VALIDATED BEFORE ANYTHING RENDERS ───────────────────────────────────────────*/
function validateBlueprints() {
  const STEPS = BP.rhythm.steps;
  for (const [pid, P] of Object.entries(BP.patterns)) {
    if (!['left-edge', 'spine'].includes(P.edge))
      throw new BlueprintError(`${pid}: declares edge \`${P.edge}\`, which is neither left-edge nor spine`);
    const names = new Set(slotsOf(pid).map((s) => s.name));
    const all = { ...P.blueprints, ...(P.withdrawn || {}) };
    for (const [bid, B] of Object.entries(all)) {
      for (const [surface, rows] of Object.entries(B.rows)) {
        const S = SPANS.surfaces[surface];
        if (!S) throw new BlueprintError(`${pid}/${bid}: no surface ${surface}`);
        rows.forEach((r, i) => {
          const sp = S.splits[r.split];
          if (!sp) throw new BlueprintError(`${pid}/${bid}/${surface}: row \`${r.id}\` names split \`${r.split}\`, `
            + `which ${surface} does not approve (${Object.keys(S.splits).join(', ')}) — a surface selects from `
            + `its OWN vocabulary, it never borrows another's`);
          if (sp.regions.length !== r.regions.length)
            throw new BlueprintError(`${pid}/${bid}/${surface}: split ${r.split} has ${sp.regions.length} region(s) `
              + `and row \`${r.id}\` names ${r.regions.length}`);
          for (const who of r.regions)
            if (who !== 'reading-margin' && !names.has(who))
              throw new BlueprintError(`${pid}/${bid}/${surface}: row \`${r.id}\` names region \`${who}\`, which is `
                + `not a slot of ${pid} (${[...names].join(', ')})`);
          if (!['hug', 'paired', 'workspace'].includes(r.mode))
            throw new BlueprintError(`${pid}/${bid}/${surface}: row \`${r.id}\` has mode \`${r.mode}\` — a row is `
              + `hug, paired or workspace`);
          /* A PAIRED ROW MUST SAY HOW FAR ITS CHILDREN MAY END APART. Without that it is two columns
             beside each other with no opinion about the cliff of white between them, which is how
             this catalogue got a +474px pair in the first place. */
          if (r.mode === 'paired') {
            const named = r.regions.filter((x) => x !== 'reading-margin');
            if (named.length !== 2) throw new BlueprintError(`${pid}/${bid}/${surface}: row \`${r.id}\` is `
              + `\`paired\` and names ${named.length} slot(s) — a pair is exactly two siblings`);
            if (r.align !== 'top') throw new BlueprintError(`${pid}/${bid}/${surface}: row \`${r.id}\` is \`paired\` `
              + `and declares no alignment origin (\`align\`)`);
            if (!(r.imbalanceMax > 0)) throw new BlueprintError(`${pid}/${bid}/${surface}: row \`${r.id}\` is `
              + `\`paired\` and declares no \`imbalanceMax\` — a pair that has not said how far its children `
              + `may end apart has not been designed`);
            if (!r.pairReason) throw new BlueprintError(`${pid}/${bid}/${surface}: row \`${r.id}\` is \`paired\` `
              + `and gives no \`pairReason\``);
          }
          const last = i === rows.length - 1;
          if (!last && !STEPS[r.gapAfter]) throw new BlueprintError(`${pid}/${bid}/${surface}: row \`${r.id}\` `
            + `declares gapAfter \`${r.gapAfter}\`, which is not a named rhythm step (${Object.keys(STEPS).join(', ')})`);
          if (last && r.gapAfter) throw new BlueprintError(`${pid}/${bid}/${surface}: the last row declares a gap after it`);
          /* PROSE NEVER EXCEEDS THE READING MEASURE, and a reading margin is only ever beside prose. */
          sp.regions.forEach((range, k) => {
            const who = r.regions[k], n = range[1] - range[0] + 1;
            if (who === 'reading-margin') {
              const others = r.regions.filter((x) => x !== 'reading-margin');
              if (!others.length || !others.every((x) => isProse(pid, x)))
                throw new BlueprintError(`${pid}/${bid}/${surface}: row \`${r.id}\` declares \`reading-margin\` `
                  + `beside ${others.join(', ') || 'nothing'} — free columns beside media are never a margin, `
                  + `because media has no reading measure to be bound by`);
              if (n > BP.marginMax[surface])
                throw new BlueprintError(`${pid}/${bid}/${surface}: row \`${r.id}\` declares a ${n}-column reading `
                  + `margin and ${surface} allows ${BP.marginMax[surface]} — margin is legal AROUND a composition, `
                  + `not as an unfinished half-row`);
            } else if (isProse(pid, who) && n > S.proseMax) {
              throw new BlueprintError(`${pid}/${bid}/${surface}: row \`${r.id}\` sets "${who}" across ${n} columns `
                + `and ${surface} allows ${S.proseMax} for prose`);
            }
          });
        });
      }
    }
    /* THE SELECTION TABLE NAMES ONLY APPROVED BLUEPRINTS. A withdrawn one is evidence, not a choice. */
    for (const [surface, tbl] of Object.entries(P.select || {}))
      for (const [k, bid] of Object.entries(tbl)) {
        if (!P.blueprints[bid]) throw new BlueprintError(`${pid}/${surface}: ${k} selects \`${bid}\`, which is not `
          + `an approved blueprint of this pattern (${Object.keys(P.blueprints).join(', ')})`);
        if (!P.blueprints[bid].rows[surface]) throw new BlueprintError(`${pid}/${surface}: ${k} selects \`${bid}\`, `
          + `which has no rows for ${surface}`);
      }
  }
}

/* ── ONE LAYOUT, GENERATED ───────────────────────────────────────────────────────────────────────
   The single place a grid-template-areas string is produced. A gap between two semantic regions is
   its own grid row of a NAMED height, so the rhythm is a declared object in the page rather than the
   sum of whatever paddings the two regions happen to carry. */
function layout(pid, surface, bid, opts = {}) {
  const P = BP.patterns[pid];
  const B = P.blueprints[bid] || (P.withdrawn || {})[bid] || (opts.rows ? { rows: {} } : null);
  if (!B) throw new BlueprintError(`${pid}: no blueprint \`${bid}\` — approved: ${Object.keys(P.blueprints).join(', ')}`);
  const rows = opts.rows || B.rows[surface];
  if (!rows) throw new BlueprintError(`${pid}/${bid}: no rows for ${surface}`);
  const S = SPANS.surfaces[surface];
  const areas = [], out = [], gaps = [];
  rows.forEach((r, i) => {
    const sp = S.splits[r.split];
    const cells = new Array(S.columns).fill(null), owner = new Array(S.columns).fill(null);
    sp.regions.forEach((range, k) => {
      const who = r.regions[k];
      for (let c = range[0]; c <= range[1]; c++) {
        /* a region declared `null` claims nothing. Only a counterexample may write one, and the
           point of letting it be written at all is that H2 has something real to catch. */
        cells[c - 1] = (who == null || who === 'reading-margin') ? '.' : who;
        if (who != null) owner[c - 1] = who;
      }
    });
    (sp.containment || []).forEach((range) => {
      for (let c = range[0]; c <= range[1]; c++) { cells[c - 1] = '.'; owner[c - 1] = 'containment'; }
    });
    /* THE RULE THAT MAKES AN UNNAMED COLUMN IMPOSSIBLE RATHER THAN MERELY DISCOURAGED. */
    const orphan = owner.map((o, k) => o ? null : k + 1).filter(Boolean);
    if (orphan.length && !opts.allowOrphans) throw new BlueprintError(`${pid}/${bid}/${surface}: row \`${r.id}\` leaves column(s) `
      + `${orphan.join(', ')} belonging to nothing`);
    areas.push(cells.join(' '));
    out.push({ ...r, owner, track: areas.length, split: r.split, kind: sp.kind });
    if (r.gapAfter) {
      const px = BP.rhythm.steps[r.gapAfter];
      areas.push(new Array(S.columns).fill(`gap${i}`).join(' '));
      const firstNamed = r.regions.find((x) => x && x !== 'reading-margin');
      const nCols = owner.filter((x) => x === firstNamed).length;
      gaps.push({ after: r.id, idx: i, step: r.gapAfter, px, rule: !!r.ruleAfter,
        ruleW: spanPx(surface, nCols), track: areas.length });
    }
  });
  return { areas, rows: out, gaps, blueprint: B, bid };
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
function pickFixture(pid, klass) {
  const P = BP.patterns[pid];
  if (!P.mediaSlot) return null;
  const s = slotsOf(pid).find((x) => x.name === P.mediaSlot);
  return FIXTURES.find((f) => f.klass === klass && s.allowedBlocks.includes(f.block)) || null;
}

/* ── content ─────────────────────────────────────────────────────────────────────────────────────*/
const F = {
  para: ['Filler prose, identical in every render in this atlas, so the only thing that varies between two '
    + 'pictures is the composition and the object inside it.',
    'A second paragraph, so a reading region has somewhere to go.'],
  key: 'A key idea, at the width the blueprint approves.',
};
const LONG = [F.para[0], F.para[1],
  'A third paragraph that exists only in the adversarial payload, to prove that how much an author writes '
  + 'cannot move a column or change which page was chosen.',
  'And a fourth, for the same reason.'];
const STEPS = [['Substitute, keeping the brackets.', 'y = (−3)²'], ['Evaluate.', 'y = 9']];
const STEPS_LONG = [...STEPS, ['Check the result back in the original rule.', '(−3)² = 9 ✓']];

const workedBody = (label, long) => `<div class="cp-prose"><h3>${esc(label)}</h3>`
  + `<p class="cp-lab">Question</p><p>Find <i>y</i> when <i>x</i> = −3.</p>`
  + `<p class="cp-lab">Worked solution</p><ol class="cp-qset">`
  + (long ? STEPS_LONG : STEPS).map(([s, m]) => `<li class="cp-qitem"><p>${t(s)}</p><p><b>${t(m)}</b></p></li>`).join('')
  + `</ol><p><b>Answer</b> (−3, 9)</p></div>`;

function slotBody(pid, name, adversarial) {
  const ty = slotType(pid, name);
  const para = adversarial ? LONG : F.para;
  if (ty === 'support') return `<aside class="cp-key"><p class="cp-lab">Key idea</p><p>${t(F.key)}</p></aside>`;
  if (ty === 'worked') return workedBody(name.replace(/^(case|worked)/, (m) => m === 'case' ? 'Case ' : 'Example '), adversarial);
  if (ty === 'workspace') return `<div class="cp-pad"><div class="cp-pad-head"><p class="cp-lab">Your working</p></div>`
    + `<div class="cp-gridpaper"></div></div>`;
  return `<div class="cp-prose">${para.map((x) => `<p>${t(x)}</p>`).join('')}</div>`;
}

function mediaMarkup(fx, fit) {
  const cap = fx.caption ? `<figcaption class="cp-figcap">${t(fx.caption)}</figcaption>` : '';
  if (fx.kind === 'graph') return `<figure class="cp-figure">{{FIG:${fx.figure}}}${cap}</figure>`;
  if (fx.kind === 'interactive')
    return `<div class="cp-media" data-media-object style="aspect-ratio:${1 / fx.aspect};background:`
      + `linear-gradient(#eef1f0,#dfe6e3);border:1px solid #cfd8d4;border-radius:3px"></div>`;
  const inner = fx.kind === 'video'
    ? `<video data-media-object src="${dataURI(fx.src)}" poster="${dataURI(fx.poster)}" width="${fx.raster[0]}" `
      + `height="${fx.raster[1]}" controls muted playsinline preload="metadata"></video>`
    : `<img data-media-object src="${dataURI(fx.src)}" width="${fx.raster[0]}" height="${fx.raster[1]}" `
      + `alt="${esc(fx.alt || '')}" decoding="sync">`;
  const cw = fit === 'contain' ? ` style="width:min(${fx.presentationWidth}px,100%)"` : '';
  return `<figure class="cp-figure"><span class="cp-media"${cw}>${inner}</span>${cap}</figure>`;
}

/* ── MEASURED IN THE PAGE ────────────────────────────────────────────────────────────────────────
   Self-contained, no closure: it is serialised into the browser. It reports geometry and nothing
   else — every judgement below is made in Node from these numbers, so the picture and the verdict
   cannot come from two different readings of the page. */
function measureComposition() {
  const host = document.querySelector('[data-cp-host]');
  const hr = host.getBoundingClientRect();
  const rel = (r) => ({ x: +(r.left - hr.left).toFixed(2), y: +(r.top - hr.top).toFixed(2),
    w: +r.width.toFixed(2), h: +r.height.toFixed(2) });
  const vis = (e) => e.getClientRects().length > 0;
  const cols = [].slice.call(host.querySelectorAll('[data-colprobe]'))
    .map((e) => ({ n: +e.getAttribute('data-colprobe'), ...rel(e.getBoundingClientRect()) }))
    .sort((a, b) => a.n - b.n);
  const rows = [].slice.call(host.querySelectorAll('[data-rowprobe]')).map((e) => {
    const names = (e.getAttribute('data-regions') || '').split(',').filter(Boolean);
    const kids = names.map((n) => {
      const el = host.querySelector('[data-slot="' + n + '"]');
      if (!el || !vis(el)) return null;
      const inner = [].slice.call(el.querySelectorAll('*')).filter((c) => vis(c) && c.children.length === 0);
      const box = rel(el.getBoundingClientRect());
      const ink = inner.length ? {
        top: +(Math.min.apply(null, inner.map((c) => c.getBoundingClientRect().top)) - hr.top).toFixed(2),
        bottom: +(Math.max.apply(null, inner.map((c) => c.getBoundingClientRect().bottom)) - hr.top).toFixed(2),
      } : null;
      return { name: n, ...box, inkTop: ink && ink.top, inkBottom: ink && ink.bottom };
    }).filter(Boolean);
    return { id: e.getAttribute('data-rowprobe'), mode: e.getAttribute('data-mode'),
      split: e.getAttribute('data-split'), ...rel(e.getBoundingClientRect()), kids };
  });
  const gaps = [].slice.call(host.querySelectorAll('[data-gap]')).map((e) => ({
    after: e.getAttribute('data-gap'), step: e.getAttribute('data-step'),
    declared: +e.getAttribute('data-px'), ...rel(e.getBoundingClientRect()) }));
  return { host: { w: +hr.width.toFixed(2), h: +hr.height.toFixed(2) }, cols, rows, gaps };
}

/* ── THE PROOF OVERLAY, DRAWN FROM FINISHED RECTANGLES ───────────────────────────────────────────
   It receives rectangles and labels already computed in Node. It decides nothing. */
function drawProof(payload) {
  const host = document.querySelector('[data-cp-proof]');
  const lay = document.createElement('div');
  lay.className = 'pf-layer';
  host.style.position = 'relative';
  for (const c of payload.cols) {
    const d = document.createElement('div'); d.className = 'pf-colrule';
    d.style.cssText = `left:${c.x}px;width:${c.w}px;top:0;height:${payload.host.h}px`;
    lay.appendChild(d);
  }
  for (const g of payload.gaps) {
    const d = document.createElement('div'); d.className = 'pf-gap';
    d.style.cssText = `left:0;width:${payload.host.w}px;top:${g.y}px;height:${g.h}px`;
    d.innerHTML = `<span class="pf-tag pf-tag-gap">${g.step} · ${g.declared}px</span>`;
    lay.appendChild(d);
  }
  for (const r of payload.rows) {
    const d = document.createElement('div'); d.className = 'pf-row';
    d.setAttribute('data-mode', r.mode);
    d.style.cssText = `left:0;width:${payload.host.w}px;top:${r.y}px;height:${r.h}px`;
    d.innerHTML = `<span class="pf-tag pf-tag-row">${r.label}</span>`;
    lay.appendChild(d);
    for (const k of r.kids) {
      const s = document.createElement('div'); s.className = 'pf-slot';
      s.setAttribute('data-i', String(k.tint));
      s.style.cssText = `left:${k.x}px;width:${k.w}px;top:${k.y}px;height:${k.h}px`;
      s.innerHTML = `<span class="pf-tag pf-tag-slot">${k.label}</span>`;
      lay.appendChild(s);
    }
    for (const f of r.free) {
      const s = document.createElement('div'); s.className = 'pf-free';
      s.setAttribute('data-role', f.role);
      s.style.cssText = `left:${f.x}px;width:${f.w}px;top:${r.y}px;height:${r.h}px`;
      s.innerHTML = `<span class="pf-tag pf-tag-free">${f.label}</span>`;
      lay.appendChild(s);
    }
  }
  host.appendChild(lay);
}

/* ── JUDGEMENT, IN NODE, FROM THE NUMBERS THE PAGE REPORTED ──────────────────────────────────────*/
const CENTRE_TOL = 0.5;
function judge(pid, surface, L, m) {
  const P = BP.patterns[pid];
  const S = SPANS.surfaces[surface];
  const fails = [], notes = [], boards = [];
  const byId = new Map(L.rows.map((r) => [r.id, r]));

  for (const mr of m.rows) {
    const R = byId.get(mr.id);
    const named = R.regions.filter((x) => x && x !== 'reading-margin');
    /* who actually covers each column, read off the render */
    const covered = m.cols.map((c) => {
      const mid = c.x + c.w / 2;
      const k = mr.kids.find((q) => q.x - CENTRE_TOL <= mid && mid <= q.x + q.w + CENTRE_TOL);
      return k ? k.name : null;
    });
    const free = [], slots = [];
    let i = 0;
    while (i < covered.length) {
      let j = i; while (j + 1 < covered.length && covered[j + 1] === covered[i]) j++;
      const run = { from: i + 1, to: j + 1, who: covered[i],
        x: m.cols[i].x, w: +(m.cols[j].x + m.cols[j].w - m.cols[i].x).toFixed(2) };
      (covered[i] ? slots : free).push(run);
      i = j + 1;
    }
    /* H1 · EVERY COLUMN'S RENDERED OWNER IS THE ONE THE BLUEPRINT DECLARED. */
    for (let c = 0; c < covered.length; c++) {
      const declared = R.owner[c];
      const got = covered[c];
      const ok = (declared === 'reading-margin' || declared === 'containment') ? got === null : got === declared;
      if (!ok) fails.push(['H1', `${pid}/${L.bid}/${surface} row \`${mr.id}\`: column ${c + 1} is declared `
        + `\`${declared}\` and is rendered ${got ? `inside \`${got}\`` : 'empty'}`]);
    }
    /* H2 · NO ANCHORED REGION WITH AN EMPTY REMAINDER. Free width is legal only as the symmetric
       containment of a centred split, or as a reading margin beside prose within the allowance. */
    const freeRoles = free.map((f) => {
      const role = R.owner[f.from - 1];
      let label = role === 'containment' ? `containment · ${f.to - f.from + 1} col` : role === 'reading-margin'
        ? `reading margin · ${f.to - f.from + 1} col` : `UNOWNED · ${f.to - f.from + 1} col`;
      if (role === 'containment') {
        const cont = S.splits[R.split].containment || [];
        const sym = cont.length === 2 && (cont[0][1] - cont[0][0]) === (cont[1][1] - cont[1][0]);
        if (R.kind !== 'centred' || !sym)
          fails.push(['H2', `${pid}/${L.bid}/${surface} row \`${mr.id}\`: columns ${f.from}–${f.to} are declared `
            + `\`containment\` in \`${R.split}\`, which is not a symmetric centred split`]);
      } else if (role === 'reading-margin') {
        const n = f.to - f.from + 1;
        if (!named.every((x) => isProse(pid, x)))
          fails.push(['H2', `${pid}/${L.bid}/${surface} row \`${mr.id}\`: columns ${f.from}–${f.to} are declared `
            + `\`reading-margin\` beside ${named.join(', ')} — free columns beside media are never a margin`]);
        if (n > BP.marginMax[surface])
          fails.push(['H2', `${pid}/${L.bid}/${surface} row \`${mr.id}\`: a ${n}-column reading margin where `
            + `${surface} allows ${BP.marginMax[surface]}`]);
      } else {
        fails.push(['H2', `${pid}/${L.bid}/${surface} row \`${mr.id}\`: columns ${f.from}–${f.to} `
          + `(${f.w}px) are rendered empty and nothing declares them. A row holding \`${named.join(', ')}\` may not `
          + `leave part of itself unexplained — centre it in the row, give it a companion region, widen it to an `
          + `approved footprint, or move it into a different row composition`]);
      }
      return { ...f, role: role || 'unowned', label };
    });
    /* H3 · A HUGGING ROW IS NOT TALLER THAN ITS CHILDREN. */
    const tallest = mr.kids.length ? Math.max(...mr.kids.map((k) => k.h)) : 0;
    const air = +(mr.h - tallest).toFixed(2);
    if (R.mode !== 'workspace' && air > TOLPX)
      fails.push(['H3', `${pid}/${L.bid}/${surface} row \`${mr.id}\`: the row is ${mr.h}px and its tallest child `
        + `is ${tallest}px — ${air}px of the row is taller than anything in it. A \`${R.mode}\` row takes its `
        + `height from its contents; only a declared \`workspace\` may be substantial on its own`]);
    /* H4 · PAIRED SIBLINGS SHARE AN ALIGNMENT ORIGIN AND STAY INSIDE THE DECLARED IMBALANCE. */
    let imbalance = null;
    if (R.mode === 'paired') {
      const [a, b] = mr.kids;
      if (!a || !b) fails.push(['H4', `${pid}/${L.bid}/${surface} row \`${mr.id}\`: a paired row rendered `
        + `${mr.kids.length} sibling(s)`]);
      else {
        if (Math.abs(a.y - b.y) > TOLPX)
          fails.push(['H4', `${pid}/${L.bid}/${surface} row \`${mr.id}\`: the siblings start at y=${a.y} and `
            + `y=${b.y} — a pair declared \`align: ${R.align}\` has one alignment origin`]);
        imbalance = +Math.abs(a.h - b.h).toFixed(2);
        if (imbalance > R.imbalanceMax)
          fails.push(['H4', `${pid}/${L.bid}/${surface} row \`${mr.id}\`: the siblings end ${imbalance}px apart `
            + `and the blueprint declares at most ${R.imbalanceMax}px (${R.pairReason}). Either the pairing is not `
            + `a pairing, or the blueprint has not admitted how far apart it lets them end`]);
      }
    }
    boards.push({ id: mr.id, mode: R.mode, split: R.split, y: mr.y, h: mr.h, air, imbalance,
      label: `${mr.id} · ${R.split} · ${R.mode}${R.mode === 'paired' ? ` (≤${R.imbalanceMax}px)` : ''} · ${Math.round(mr.h)}px`
        + (air > TOLPX ? ` · +${air}px AIR` : '') + (imbalance != null ? ` · siblings ${imbalance}px apart` : ''),
      kids: mr.kids.map((k, n) => ({ ...k, tint: n % 6,
        label: `${k.name} · ${slots.find((s) => s.who === k.name) ? `col ${slots.find((s) => s.who === k.name).from}–${slots.find((s) => s.who === k.name).to}` : '?'} · ${Math.round(k.w)}px` })),
      free: freeRoles });
  }
  /* the rhythm: what was declared, and what the eye actually sees between the two blocks of ink */
  const rhythm = m.gaps.map((g) => {
    const above = m.rows.find((r) => r.id === g.after);
    const below = m.rows[m.rows.indexOf(above) + 1];
    const inkAbove = above && above.kids.length ? Math.max(...above.kids.map((k) => k.inkBottom ?? k.y + k.h)) : null;
    const inkBelow = below && below.kids.length ? Math.min(...below.kids.map((k) => k.inkTop ?? k.y)) : null;
    return { after: g.after, step: g.step, declared: g.declared, rendered: +g.h.toFixed(2),
      perceived: inkAbove != null && inkBelow != null ? +(inkBelow - inkAbove).toFixed(2) : null };
  });
  for (const r of rhythm) {
    if (Math.abs(r.rendered - r.declared) > TOLPX)
      fails.push(['H3', `${pid}/${L.bid}/${surface}: the gap after \`${r.after}\` is declared \`${r.step}\` `
        + `(${r.declared}px) and rendered ${r.rendered}px`]);
    if (r.perceived != null && r.perceived - r.declared > 24)
      notes.push(`the step after \`${r.after}\` is declared ${r.step} (${r.declared}px) and reads as `
        + `${r.perceived}px of white — ${+(r.perceived - r.declared).toFixed(0)}px of it belongs to the blocks' own `
        + `padding, which nothing designs as part of the rhythm`);
  }
  /* the edge: one left edge, or one centre line */
  const starts = new Set();
  for (const mr of m.rows) {
    const R = byId.get(mr.id);
    const named = R.regions.filter((x) => x && x !== 'reading-margin');
    if (named.length !== 1 || named[0] === P.mediaSlot) continue;
    starts.add(R.owner.indexOf(named[0]) + 1);
  }
  if (starts.size > 1) fails.push(['H2', `${pid}/${L.bid}/${surface}: prose rows start at columns `
    + `${[...starts].sort((a, b) => a - b).join(' and ')} — a pattern has ONE left edge or ONE centre line`]);
  if (P.edge === 'left-edge' && starts.size && !starts.has(1))
    fails.push(['H2', `${pid}/${L.bid}/${surface}: declares \`left-edge\` and its prose starts at column ${[...starts][0]}`]);

  return { fails, notes, boards, rhythm,
    whitespaceOwned: !fails.some(([c]) => c === 'H1' || c === 'H2') };
}

/* ── THE PAGE ────────────────────────────────────────────────────────────────────────────────────*/
function pageMarkup(pid, surface, L, fx, opts) {
  const P = BP.patterns[pid];
  const S = SPANS.surfaces[surface];
  const sd = opts.sd;
  const inAreas = (n) => L.areas.some((r) => r.split(/\s+/).includes(n));
  const parts = [];
  for (const s of slotsOf(pid)) {
    if (!inAreas(s.name)) continue;
    if (s.name === P.mediaSlot && fx) {
      const row = L.rows.find((r) => r.media || r.regions.includes(P.mediaSlot));
      const a = row.owner.indexOf(P.mediaSlot), b = row.owner.lastIndexOf(P.mediaSlot);
      const fit = opts.forceFit || P.slotFit;
      parts.push(`<div data-slot="${esc(s.name)}" data-slot-type="${esc(s.slotType)}" data-media-slot `
        + `data-occupancy="${esc(s.occupancy)}" data-fit="${esc(fit)}" data-cols="${a + 1}–${b + 1}" `
        + `data-span="${b - a + 1}" data-slot-anchor="${esc(row.split)}" data-fixture="${esc(fx.id)}" `
        + `data-media-kind="${esc(fx.kind)}"`
        + (fit === 'contain' && !opts.dropAnchor ? ` data-media-anchor="center" data-anchor-resolved` : '')
        + `>${mediaMarkup(fx, fit)}</div>`);
    } else {
      parts.push(`<div data-slot="${esc(s.name)}" data-slot-type="${esc(s.slotType)}" `
        + `data-occupancy="${esc(s.occupancy)}">${slotBody(pid, s.name, opts.adversarial)}</div>`);
    }
  }
  for (const r of L.rows)
    parts.push(`<i data-rowprobe="${esc(r.id)}" data-mode="${esc(r.mode)}" data-split="${esc(r.split)}" `
      + `data-regions="${esc(r.regions.filter((x) => x && x !== 'reading-margin').join(','))}"></i>`);
  for (const g of L.gaps)
    parts.push(`<i data-gap="${esc(g.after)}" data-step="${esc(g.step)}" data-px="${g.px}"`
      + (g.rule ? ` data-rule style="--rule-w:${g.ruleW}px"` : '') + `></i>`);
  for (let c = 1; c <= S.columns; c++) parts.push(`<i data-colprobe="${c}"></i>`);
  return `<div class="cp-page cp-proof-page" data-pattern="${esc(pid)}" data-subdesign="${esc(L.bid)}" data-inst="0">`
    + `<div class="cp-surface"><div class="cp-grid-host" data-sd="${esc(sd)}" ${opts.hostAttr}>`
    + parts.join('\n') + `</div></div></div>`;
}

function gridCSS(sd, surface, L, pid) {
  const g = GRID.surfaces[surface];
  const lines = [`[data-sd="${sd}"]{display:grid;grid-template-columns:repeat(${g.columns},minmax(0,1fr));`
    + `column-gap:${g.gutter}px;row-gap:0;align-items:start;grid-template-areas:\n`
    + L.areas.map((r) => `  "${r}"`).join('\n') + `;}`];
  for (const s of slotsOf(pid)) lines.push(`[data-sd="${sd}"] > [data-slot="${s.name}"]{grid-area:${s.name};min-width:0;}`);
  for (const g2 of L.gaps) lines.push(`[data-sd="${sd}"] > [data-gap="${g2.after}"]{grid-area:gap${g2.idx};height:${g2.px}px;}`);
  for (const r of L.rows) lines.push(`[data-sd="${sd}"] > [data-rowprobe="${r.id}"]{grid-column:1/-1;grid-row:${r.track};`
    + `align-self:stretch;pointer-events:none;}`);
  for (let c = 1; c <= GRID.surfaces[surface].columns; c++)
    lines.push(`[data-sd="${sd}"] > [data-colprobe="${c}"]{grid-column:${c};grid-row:1;height:0;pointer-events:none;}`);
  return lines.join('\n');
}

const PROOF_CSS = `
.cp-proof{background:#f4f4f2;padding:0 0 34px;}
.cp-proof>div{margin:0;}
.cp-head{background:#111;color:#fff;padding:14px 22px;font:600 13px/1.5 ui-monospace,Menlo,monospace;letter-spacing:.05em;}
.cp-head b{color:#8fd3b0;}
.cp-head[data-bad]{background:#7a1414;}
.cp-whyp{background:#fff;border-bottom:1px solid #ddd;padding:14px 22px;font:14px/1.6 Georgia,serif;color:#333;}
.cp-rule{margin:0;padding:10px 22px;background:#e8efec;border-top:1px solid #cfdcd6;border-bottom:1px solid #cfdcd6;
  font:600 12px/1.6 ui-monospace,Menlo,monospace;color:#1f5c40;letter-spacing:.03em;}
.cp-rule i{font-style:normal;color:#6b7c74;font-weight:400;}
.cp-capt{margin:0;padding:9px 22px;background:#1f2a26;color:#b8cfc4;font:600 11px/1.5 ui-monospace,Menlo,monospace;letter-spacing:.08em;}
.cp-proof-page{background:#fff;box-shadow:none;border-radius:0;}
.pf-layer{position:absolute;inset:0;pointer-events:none;z-index:5;}
.pf-layer>div{position:absolute;box-sizing:border-box;}
.pf-colrule{background:rgba(20,60,120,.045);border-left:1px solid rgba(20,60,120,.14);border-right:1px solid rgba(20,60,120,.14);}
.pf-row{border-top:2px solid #111;border-bottom:2px dashed rgba(17,17,17,.45);}
.pf-row[data-mode="paired"]{border-top-color:#1f5c40;}
.pf-row[data-mode="workspace"]{border-top-color:#8a5a2a;}
.pf-gap{background:repeating-linear-gradient(90deg,rgba(40,80,60,.10) 0 6px,rgba(40,80,60,.02) 6px 12px);
  border-top:1px dotted rgba(31,92,64,.5);border-bottom:1px dotted rgba(31,92,64,.5);}
.pf-slot{background:rgba(60,140,100,.13);outline:1px solid rgba(31,92,64,.55);}
.pf-slot[data-i="1"]{background:rgba(60,100,180,.13);outline-color:rgba(30,60,140,.55);}
.pf-slot[data-i="2"]{background:rgba(180,120,40,.13);outline-color:rgba(140,80,20,.55);}
.pf-slot[data-i="3"]{background:rgba(150,60,140,.13);outline-color:rgba(110,30,100,.55);}
.pf-slot[data-i="4"]{background:rgba(40,150,160,.13);outline-color:rgba(20,110,120,.55);}
.pf-slot[data-i="5"]{background:rgba(120,120,60,.13);outline-color:rgba(90,90,30,.55);}
.pf-free[data-role="reading-margin"]{background:repeating-linear-gradient(45deg,rgba(120,120,110,.16) 0 6px,rgba(120,120,110,.04) 6px 12px);outline:1px dashed rgba(90,90,80,.6);}
.pf-free[data-role="containment"]{background:repeating-linear-gradient(45deg,rgba(60,100,180,.16) 0 6px,rgba(60,100,180,.04) 6px 12px);outline:1px dashed rgba(30,60,140,.6);}
.pf-free[data-role="unowned"]{background:repeating-linear-gradient(45deg,rgba(200,0,0,.30) 0 7px,rgba(200,0,0,.10) 7px 14px);outline:2px solid #c00;}
.pf-tag{position:absolute;left:3px;top:2px;font:600 9px/1.5 ui-monospace,Menlo,monospace;letter-spacing:.04em;
  padding:1px 4px;border-radius:2px;white-space:nowrap;}
.pf-tag-row{background:#111;color:#fff;left:auto;right:3px;}
.pf-tag-slot{background:rgba(255,255,255,.9);color:#17492f;outline:1px solid rgba(31,92,64,.4);}
.pf-tag-gap{background:#1f5c40;color:#fff;left:auto;right:3px;top:50%;transform:translateY(-50%);}
.pf-tag-free{background:#fff;color:#444;outline:1px solid rgba(0,0,0,.25);writing-mode:vertical-rl;top:4px;}
.pf-free[data-role="unowned"] .pf-tag-free{background:#c00;color:#fff;outline:0;}
.cp-verdict{background:#fff;border-top:2px solid #111;padding:10px 22px 14px;font:11px/1.65 ui-monospace,Menlo,monospace;}
.cp-verdict div{display:flex;gap:10px;}
.cp-verdict b{flex:0 0 200px;color:#666;font-weight:600;}
.cp-verdict i{font-style:normal;color:#111;}
.cp-verdict[data-bad] b{color:#c00;}
.cp-verdict .ok{color:#17492f;font-weight:600;}
.cp-verdict .bad{color:#c00;font-weight:600;}
.cp-grid-host > [data-gap][data-rule]{position:relative;}
.cp-grid-host > [data-gap][data-rule]::before{content:"";position:absolute;left:0;top:50%;width:var(--rule-w,100%);
  border-top:1px solid rgba(0,0,0,.14);}
`;

/* ── the browser, the app's own stylesheet, and the figure painter ───────────────────────────────*/
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
const { boxForWidth } = makeSolvers(makePainter(figPage));
const BOX = new Map();
async function boxFor(key, w) {
  const ck = `${key}|${Math.round(w)}`;
  if (BOX.has(ck)) return BOX.get(ck);
  const b = await boxForWidth(key, FIGS[key].figure, Math.round(w));
  if (!b || !square(b.box)) throw new BlueprintError(`${key}: no equal-unit box fits a ${w}px slot`);
  BOX.set(ck, b.box); return b.box;
}
const skin = (w, h, html) => `<div class="mx-part" data-mx-part="figure" data-fig-viewport `
  + `style="position:relative;width:${w}px;height:${h}px"><div class="mx-figstage">`
  + `<div class="mx-figskin tp-slide">${html}</div></div></div>`;

fs.mkdirSync(OUT, { recursive: true });
validateBlueprints();
console.log('the blueprint catalogue — every row a named split, every gap a named step');
for (const [pid, P] of Object.entries(BP.patterns))
  console.log(`  ${pid.padEnd(20)} ${Object.keys(P.blueprints).join(' · ')}`
    + (P.withdrawn ? `   [judged: ${Object.keys(P.withdrawn).join(', ')}]` : ''));

const REPORT = [];

/* ── ONE BOARD ───────────────────────────────────────────────────────────────────────────────────*/
async function board(pid, surface, bid, o = {}) {
  const P = BP.patterns[pid];
  const g = GRID.surfaces[surface];
  const klass = o.klass || null;
  const fx = P.mediaSlot ? (o.fixture || (klass && klass !== 'none' ? pickFixture(pid, klass) : null)) : null;
  const L = layout(pid, surface, bid, { rows: o.rows, allowOrphans: o.allowOrphans });
  const sd = `${pid.replace(/\W/g, '')}-${surface}-${bid.replace(/\W/g, '')}-${klass || 'x'}${o.tag ? '-' + o.tag : ''}`;
  const name = o.name || `${pid.replace(/\./g, '-')}__${surface}__${bid}${klass && klass !== 'none' ? '__' + klass : ''}`;

  let plain = pageMarkup(pid, surface, L, fx, { sd, hostAttr: 'data-cp-host', adversarial: o.adversarial,
    forceFit: o.forceFit, dropAnchor: o.dropAnchor });
  let proof = plain.replace('data-cp-host', 'data-cp-proof').replace(/ data-media-slot(?=[ >])/, ' data-media-slot-proof');

  /* the figure is painted at the slot the blueprint gave it, and at nothing else */
  if (fx && fx.kind === 'graph') {
    const row = L.rows.find((r) => r.regions.includes(P.mediaSlot));
    const n = row.owner.filter((x) => x === P.mediaSlot).length;
    const box = await boxFor(fx.figure, o.paintAt || spanPx(surface, n));
    const html = skin(box.w, box.h, box.html);
    plain = plain.split(`{{FIG:${fx.figure}}}`).join(html);
    proof = proof.split(`{{FIG:${fx.figure}}}`).join(html);
  }

  const doc = `<!doctype html><html data-theme="mathematics"><head><meta charset="utf-8"><style>
${APP_CSS}
</style><style>
:root{--cp-surface:${g.width}px;--cp-pad:${g.pad}px;--cp-pad-y:24px;--cp-frame:0px;--cp-cols:${g.columns};
--cp-gut:${g.gutter}px;--cp-measure:${GRID.readingMeasure.px}px;--cp-pad-h:${surface === 'phone' ? 360 : 480}px;--cp-pane-h:460px;}
${CSS_KIT}
${PROOF_CSS}
${gridCSS(sd, surface, L, pid)}
${o.injectCSS || ''}
</style></head><body class="mx cp-${surface}"><div class="cp-proof" style="width:${g.width + 2 * g.pad}px">
<div class="cp-head"${o.counterexample ? ' data-bad' : ''}>${esc(pid)} · <b>${esc(bid)}</b> · ${esc(surface)} `
    + `${g.width}px · ${g.columns} col${klass && klass !== 'none' ? ` · ${esc(klass)} media` : ''}`
    + (o.adversarial ? ' · ADVERSARIAL PAYLOAD' : '') + (o.counterexample ? ` · COUNTEREXAMPLE — MUST FAIL` : '') + `</div>
<div class="cp-whyp">${t(o.why || L.blueprint.why || '')}</div>
<div class="cp-rule">${esc(L.blueprint.title || bid)} <i>· ${L.rows.map((r) => `${r.id}:${r.split}/${r.mode}`).join(' · ')}</i></p>
</div><div class="cp-capt">THE PAGE</div>${plain}
<div class="cp-capt">THE SAME PAGE, WITH EVERY REGION AND EVERY PIECE OF WHITE NAMED</div>${proof}
</div></body></html>`;

  const pg = await browser.newPage({ viewport: { width: g.width + 2 * g.pad, height: 900 }, deviceScaleFactor: 1 });
  const errs = []; pg.on('pageerror', (e) => errs.push(String(e)));
  await pg.setContent(doc, { waitUntil: 'load' });
  await pg.evaluate(async () => {
    await Promise.all([].slice.call(document.images).map((i) => i.complete ? null : new Promise((r) => { i.onload = i.onerror = r; })));
    await Promise.all([].slice.call(document.querySelectorAll('video')).map((v) => v.readyState >= 1 ? null : new Promise((r) => { v.onloadedmetadata = v.onerror = r; })));
    await document.fonts.ready;
  });
  await pg.waitForTimeout(180);
  if (errs.length) throw new BlueprintError(`${name}: ${errs[0]}`);

  const m = await pg.evaluate(measureComposition);
  const J = judge(pid, surface, L, m);

  /* the media verdict comes from the ONE owner the other two atlases use */
  let mediaLines = null, mediaOk = true, mediaVerdict = null;
  const mm = await pg.evaluate(measureMedia);
  if (mm.length) {
    const x = mm[0];
    const ctx = { surface, grid: GRID, vocab: VOCAB, colW, spanPx, fixture: fx,
      pattern: { subdesigns: Object.values(P.blueprints).flatMap((b) => Object.entries(b.rows)
        .flatMap(([s, rr]) => rr.filter((r) => r.regions.includes(P.mediaSlot))
          .map((r) => ({ surface: s, slotSpan: (SPANS.surfaces[s].splits[r.split].regions[r.regions.indexOf(P.mediaSlot)] || [1, 1]).reduce((a, b) => b - a + 1) })))) } };
    const fit = slotFit(x, ctx);
    mediaOk = fit.ok; mediaVerdict = fit.verdict;
    mediaLines = inspectorLines(x, ctx, fit);
    if (!fit.ok) J.fails.push([x.fit === 'contain' ? 'H6' : 'H5', `${pid}/${bid}/${surface}: ${fit.verdict}`]);
  }

  await pg.evaluate(drawProof, { host: m.host, cols: m.cols, gaps: m.gaps, rows: J.boards });

  /* the verdict panel, printed from the same numbers */
  const V = [
    ['BLUEPRINT', `${bid} — ${L.blueprint.title || ''}`],
    ['SELECTED BY', P.selectBy + (klass && klass !== 'none' ? ` · media geometry \`${klass}\`` : '')],
    ['ROWS', J.boards.map((b) => `${b.id} ${b.split}/${b.mode} ${Math.round(b.h)}px`).join(' · ')],
    ['RHYTHM', J.rhythm.map((r) => `${r.after}→${r.step} ${r.declared}px`
      + (r.perceived != null ? ` (reads as ${Math.round(r.perceived)}px)` : '')).join(' · ') || '—'],
    ['VERTICAL AIR', J.boards.map((b) => `${b.id} ${b.air > TOLPX ? `+${b.air}px ✗` : '0 ✓'}`).join(' · ')],
    ['PAIRS', J.boards.filter((b) => b.mode === 'paired').map((b) => `${b.id} ${b.imbalance}px apart, `
      + `declared ≤${L.rows.find((r) => r.id === b.id).imbalanceMax}px`).join(' · ') || 'none'],
    ['UNOWNED WIDTH', J.boards.flatMap((b) => b.free.filter((f) => f.role === 'unowned')
      .map((f) => `${b.id} col ${f.from}–${f.to} = ${f.w}px`)).join(' · ') || 'none'],
  ];
  if (mediaLines) for (const l of mediaLines.slice(3, 9)) V.push(l);
  V.push(['EVERY WHITE HAS AN OWNER', J.whitespaceOwned && mediaOk ? 'YES' : 'NO']);
  for (const n of J.notes) V.push(['SIGNAL', n]);
  for (const [c, f] of J.fails) V.push([c + ' ✗', f]);
  await pg.evaluate(({ rows, bad }) => {
    const d = document.createElement('div');
    d.className = 'cp-verdict'; if (bad) d.setAttribute('data-bad', '');
    d.innerHTML = rows.map(([k, v]) => `<div><b>${k}</b><i>${String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/\bYES\b/, '<span class="ok">YES</span>').replace(/\bNO\b/, '<span class="bad">NO</span>')}</i></div>`).join('');
    document.querySelector('.cp-proof').appendChild(d);
  }, { rows: V, bad: !!J.fails.length });
  await pg.waitForTimeout(100);

  if (!o.noShot) {
    const bb = await (await pg.$('.cp-proof')).boundingBox();
    await pg.setViewportSize({ width: Math.ceil(bb.width), height: Math.min(28000, Math.ceil(bb.height) + 8) });
    await pg.waitForTimeout(120);
    await (await pg.$('.cp-proof')).screenshot({ path: path.join(OUT, name + '.png') });
  }
  await pg.close();

  const rec = { pattern: pid, surface, blueprint: bid, klass: klass || 'none', name, selectKey: o.selectKey || null,
    adversarial: !!o.adversarial, counterexample: !!o.counterexample,
    rows: J.boards.map((b) => ({ id: b.id, split: b.split, mode: b.mode, h: b.h, air: b.air, imbalance: b.imbalance })),
    rhythm: J.rhythm, slotWidths: J.boards.flatMap((b) => b.kids.map((k) => `${k.name}=${Math.round(k.w)}`)),
    whitespaceOwned: J.whitespaceOwned, mediaOk, mediaVerdict, fails: J.fails };
  REPORT.push(rec);
  if (!o.quiet) console.log(`  ${name.padEnd(56)} ${J.fails.length ? `${J.fails.length} FAIL` : 'ok  '} `
    + `${J.boards.map((b) => `${b.mode[0]}${Math.round(b.h)}`).join(' ')}`);
  return rec;
}

/* ── THE RUN ─────────────────────────────────────────────────────────────────────────────────────
   One board per approved blueprint per surface, not one per case: the point is to approve a small
   set of finished pages by eye, not to enumerate combinations. */
const PIDS = Object.keys(BP.patterns).filter((p) => !ONLY || ONLY.has(p));
const PLAN = [];
for (const pid of PIDS) {
  const P = BP.patterns[pid];
  for (const [surface, tbl] of Object.entries(P.select)) {
    if (SURF && !SURF.has(surface)) continue;
    if (!SURF && surface === 'tablet' && pid !== 'visual.explanation') continue;   /* one tablet family is enough to prove the vocabulary is separate */
    const seen = new Set();
    for (const [key, bid] of Object.entries(tbl)) {
      if (seen.has(bid)) continue;
      seen.add(bid);
      PLAN.push({ pid, surface, bid, key, klass: P.selectBy === 'mediaGeometry' ? key : null });
    }
  }
}
console.log(`\nboards — ${PLAN.length} approved composition(s)`);
for (const p of PLAN) await board(p.pid, p.surface, p.bid, { klass: p.klass, selectKey: p.key });

/* the adversarial payload: twice the writing, on desktop, for the control that prose moves nothing */
console.log('\nadversarial — the same compositions with twice the prose');
for (const p of PLAN.filter((q) => q.surface === 'desktop'))
  await board(p.pid, p.surface, p.bid, { klass: p.klass, selectKey: p.key, adversarial: true, noShot: true, quiet: true,
    tag: 'adv' });

/* ── THE SEQUENCE ────────────────────────────────────────────────────────────────────────────────
   Two blueprints one after the other on one page, so the boundary BETWEEN compositions can be
   judged rather than assumed. */
async function sequenceBoard(sid) {
  const Q = BP.sequences[sid];
  const pid = Q.pattern, surface = 'desktop', g = GRID.surfaces[surface];
  const step = BP.rhythm.steps[Q.between];
  const built = Q.steps.map((s, i) => {
    const L = layout(pid, surface, s.blueprint);
    const sd = `seq-${sid}-${i}`;
    return { s, L, sd, html: pageMarkup(pid, surface, L, null, { sd, hostAttr: i === 0 ? 'data-cp-host' : `data-cp-host-${i}` }) };
  });
  const doc = `<!doctype html><html data-theme="mathematics"><head><meta charset="utf-8"><style>
${APP_CSS}
</style><style>
:root{--cp-surface:${g.width}px;--cp-pad:${g.pad}px;--cp-pad-y:24px;--cp-frame:0px;--cp-cols:${g.columns};
--cp-gut:${g.gutter}px;--cp-measure:${GRID.readingMeasure.px}px;--cp-pad-h:480px;--cp-pane-h:460px;}
${CSS_KIT}
${PROOF_CSS}
${built.map((b) => gridCSS(b.sd, surface, b.L, pid)).join('\n')}
.seq-step{height:${step}px;background:repeating-linear-gradient(90deg,rgba(40,80,60,.10) 0 6px,rgba(40,80,60,.02) 6px 12px);}
</style></head><body class="mx cp-${surface}"><div class="cp-proof" style="width:${g.width + 2 * g.pad}px">
<div class="cp-head">${esc(sid)} · <b>${esc(pid)}</b> · desktop ${g.width}px · a two-blueprint sequence</div>
<div class="cp-whyp">${t(Q.why)}</p>
${built.map((b, i) => `<div class="cp-rule">${i + 1} · ${esc(b.s.blueprint)} <i>· ${esc(b.s.title)}</i></div>${b.html}`
    + (i < built.length - 1 ? `<div class="seq-step"></div>` : '')).join('')}
</div></body></html>`;
  const pg = await browser.newPage({ viewport: { width: g.width + 2 * g.pad, height: 900 }, deviceScaleFactor: 1 });
  await pg.setContent(doc, { waitUntil: 'load' });
  await pg.evaluate(() => document.fonts.ready);
  await pg.waitForTimeout(160);
  const out = [];
  for (let i = 0; i < built.length; i++) {
    if (i) await pg.evaluate((k) => {
      document.querySelector('[data-cp-host]').removeAttribute('data-cp-host');
      document.querySelector(`[data-cp-host-${k}]`).setAttribute('data-cp-host', '');
    }, i);
    const m = await pg.evaluate(measureComposition);
    out.push({ step: built[i].s, m, J: judge(pid, surface, built[i].L, m) });
  }
  const bb = await (await pg.$('.cp-proof')).boundingBox();
  await pg.setViewportSize({ width: Math.ceil(bb.width), height: Math.min(28000, Math.ceil(bb.height) + 8) });
  await pg.waitForTimeout(120);
  await (await pg.$('.cp-proof')).screenshot({ path: path.join(OUT, `sequence__${sid}.png`) });
  await pg.close();
  /* THE SEQUENCE CONTROL: two compositions in a row share one left edge and one measure, or the
     page has two designs in it. */
  const edges = new Set(), widths = new Set();
  for (const o of out) for (const r of o.m.rows) for (const k of r.kids) {
    if (k.name === BP.patterns[pid].mediaSlot) continue;
    edges.add(Math.round(k.x)); widths.add(Math.round(k.w));
  }
  const fails = out.flatMap((o) => o.J.fails);
  if (edges.size > 1) fails.push(['SEQ', `${sid}: the two compositions start at x = ${[...edges].join(' and ')}`]);
  if (widths.size > 1) fails.push(['SEQ', `${sid}: the two compositions set prose at ${[...widths].join(' and ')}px`]);
  console.log(`  sequence__${sid.padEnd(44)} ${fails.length ? `${fails.length} FAIL` : 'ok  '} `
    + `edge x=${[...edges].join('/')} · prose ${[...widths].join('/')}px · step ${Q.between} ${step}px`);
  REPORT.push({ pattern: pid, surface, blueprint: `sequence:${sid}`, klass: 'none', name: `sequence__${sid}`,
    adversarial: false, counterexample: false, sequence: true, rows: [], rhythm: [], slotWidths: [],
    whitespaceOwned: !fails.some(([c]) => c === 'H1' || c === 'H2'), mediaOk: true, fails });
  return fails;
}
console.log('\nsequence — the boundary between two blueprints');
for (const sid of Object.keys(BP.sequences)) await sequenceBoard(sid);

/* ── THE COUNTEREXAMPLES ─────────────────────────────────────────────────────────────────────────
   Arrangements the atlas renders and REQUIRES to fail. The first is the shipped page the maintainer
   named the canonical must-never-happen-again; it is reproduced here rather than described. */
console.log('\ncounterexamples — each must fail, and fail for the stated reason');
const drives = [];
const drive = (id, control, rec, why) => {
  const got = rec.fails.map(([c]) => c);
  const hit = got.includes(control);
  drives.push({ id, control, hit, got, why });
  console.log(`  ${hit ? '✓' : '✗ DID NOT FIRE'}  ${id.padEnd(26)} ${control} — ${got.join(',') || 'nothing fired'}`);
};

/* CE1 · THE SHIPPED PAGE. docs/atlas/lesson/lesson-symmetry-visual-explanation-desktop.png paints a
   683px graph in a row that runs the full 1152px, because the width came from an authored
   `mediaSize` token instead of from the composition. */
drive('shipped-683px-graph', 'H5', await board('visual.explanation', 'desktop', 'stage-full',
  { klass: 'portrait', fixture: FIXTURES.find((f) => f.klass === 'portrait' && f.block === 'graph'),
    paintAt: 683, counterexample: true, tag: 'ce1', name: 'counterexample__shipped-683px-graph',
    why: 'THE SHIPPED PAGE, REPRODUCED. The graph is painted 683px wide inside a slot that runs the full '
      + 'twelve columns, because its width came from an authored `mediaSize` token rather than from the '
      + 'composition. 683px is not a width this grid names — its neighbours are 662px and 760px.' }),
  'a fill object must consume its slot');

/* CE2 · THE SAME DEFECT AT THE OTHER END: a media row that simply does not declare half of itself. */
drive('unowned-half-row', 'H2', await board('visual.explanation', 'desktop', 'spine-narrow',
  { klass: 'portrait', counterexample: true, tag: 'ce2', name: 'counterexample__unowned-half-row',
    allowOrphans: true,
    rows: [{ id: 'media', split: '6/6', regions: ['media', null], mode: 'hug', media: true, gapAfter: 'section' },
      { id: 'interpretation', split: 'centred-8', regions: ['interpretation'], mode: 'hug', gapAfter: 'normal' },
      { id: 'support', split: 'centred-8', regions: ['support'], mode: 'hug' }],
    why: 'THE OTHER HALF OF THE SAME DEFECT. A six-column object at the left of a twelve-column row, with the '
      + 'other six declared by nothing. Every individual slot is legal; the page is not finished.' }),
  'an active row may not contain unexplained columns');

/* CE3 · free columns beside media called a reading margin. */
drive('margin-beside-media', 'H2', await board('visual.explanation', 'desktop', 'spine-narrow',
  { klass: 'portrait', counterexample: true, tag: 'ce3', name: 'counterexample__margin-beside-media',
    rows: [{ id: 'media', split: '8/4', regions: ['media', 'reading-margin'], mode: 'hug', media: true, gapAfter: 'section' },
      { id: 'interpretation', split: 'centred-8', regions: ['interpretation'], mode: 'hug', gapAfter: 'normal' },
      { id: 'support', split: 'centred-8', regions: ['support'], mode: 'hug' }],
    why: 'THE EXCUSE THE RULE EXISTS TO REFUSE. The same unfinished half-row, this time with the empty half '
      + 'labelled `reading-margin`. Media has no reading measure to be bound by, so free columns beside it are '
      + 'not a margin — they are the part of the page nobody designed.' }),
  'a reading margin is only ever beside prose');

/* CE4 · a hugging row taller than anything in it. */
drive('stretched-hug-row', 'H3', await board('visual.explanation', 'desktop', 'spine-reading',
  { klass: 'balanced', counterexample: true, tag: 'ce4', name: 'counterexample__stretched-hug-row',
    injectCSS: `[data-sd*="spinereading-balanced-ce4"] > [data-rowprobe="interpretation"]{height:420px!important;}`,
    why: 'A CONTENT-HUGGING ROW GIVEN A HEIGHT OF ITS OWN. The reading is unchanged; the row it sits in is '
      + 'taller than it, and the difference is a band of white that belongs to the layout rather than to '
      + 'anything on the page.' }),
  'a hug row takes its height from its contents');

/* CE5 · a pair whose siblings do not share an origin. */
drive('no-alignment-origin', 'H4', await board('worked.paired', 'desktop', 'cases-6-6',
  { counterexample: true, tag: 'ce5', name: 'counterexample__no-alignment-origin',
    injectCSS: `[data-sd*="ce5"] > [data-slot="workedB"]{margin-top:64px;}`,
    why: 'TWO SIBLINGS THAT DO NOT START TOGETHER. The comparison is the whole argument of the page, and it '
      + 'is carried by the fact that the two examples begin on the same line.' }),
  'paired siblings share one alignment origin');

/* CE6 · the withdrawn blueprint, judged against the tolerance it declared for itself. */
drive('side-study-imbalance', 'H4', await board('visual.explanation', 'desktop', 'side-study',
  { klass: 'portrait', counterexample: true, tag: 'ce6', name: 'counterexample__side-study-imbalance',
    why: 'THE `media-5 + explanation-7` BLUEPRINT, JUDGED. It was offered as an example of a complete '
      + 'composition. It is a `paired` row, so it had to declare how far its two children may end apart — '
      + '160px — and the atlas measures what they actually do.' }),
  'an object beside prose has a gap the author wrote, not a design');

/* CE7 · a contained object with no anchor. */
drive('anchorless-contain', 'H6', await board('visual.explanation', 'desktop', 'spine-reading',
  { klass: 'balanced', counterexample: true, tag: 'ce7', name: 'counterexample__anchorless-contain',
    forceFit: 'contain', dropAnchor: true,
    why: 'A CONTAINED OBJECT WITH NO DECLARED ANCHOR. In a screenshot, an object that happens to sit left '
      + 'because block layout put it there is indistinguishable from one deliberately placed left.' }),
  'a contain object is placed by a declared anchor');

/* ── THE CONTROLS ────────────────────────────────────────────────────────────────────────────────
   Written as pure functions of the records so each can be run twice: once on the atlas, where it
   must stay silent, and once on a doctored set, where it must speak. A control that has never been
   seen to fail is a comment. */
const REAL = REPORT.filter((r) => !r.counterexample);

/* H7 · PROSE LENGTH MOVES NOTHING. */
const H7 = (recs) => {
  const key = (r) => `${r.pattern}|${r.surface}|${r.klass}|${r.selectKey}`;
  const plain = new Map(recs.filter((r) => !r.adversarial && !r.sequence).map((r) => [key(r), r]));
  const out = [];
  let compared = 0;
  for (const a of recs.filter((r) => r.adversarial)) {
    const b = plain.get(key(a)); if (!b) continue;
    compared++;
    if (a.blueprint !== b.blueprint)
      out.push(`${key(a)}: doubling the payload changed the page from \`${b.blueprint}\` to \`${a.blueprint}\` — `
        + `how much an author writes may not choose the composition`);
    else if (a.slotWidths.join('|') !== b.slotWidths.join('|'))
      out.push(`${key(a)}: doubling the payload moved a column (${b.slotWidths.join(' ')} → ${a.slotWidths.join(' ')})`);
  }
  return { out, compared };
};
/* H8 · GEOMETRY CHOOSES ONLY FROM THE PATTERN'S FINITE APPROVED SET. */
const H8 = (recs) => recs.filter((r) => !r.sequence).flatMap((r) => {
  const P = BP.patterns[r.pattern];
  const approved = Object.keys(P.blueprints);
  const want = P.select[r.surface] && P.select[r.surface][r.selectKey];
  const o = [];
  if (!approved.includes(r.blueprint))
    o.push(`${r.pattern}/${r.surface}/${r.selectKey}: rendered \`${r.blueprint}\`, which is not an approved `
      + `blueprint of this pattern (${approved.join(', ')})`);
  if (r.selectKey && want && want !== r.blueprint)
    o.push(`${r.pattern}/${r.surface}: \`${r.selectKey}\` selects \`${want}\` and the render used \`${r.blueprint}\``);
  return o;
});

const fails = [];
const check = (cond, msg) => { if (!cond) fails.push(msg); };

/* H1–H6 are judged per board; here they are simply required to have stayed silent on every approved
   composition, and to have spoken on every counterexample. */
for (const r of REAL) for (const [c, f] of r.fails) fails.push(`${c} · ${f}`);
{
  const h7 = H7(REAL);
  for (const f of h7.out) fails.push(`H7 · ${f}`);
  check(h7.compared > 0, 'H7 · no adversarial comparison ran, so the prose-independence control is untested');
  console.log(`\ncontrol H7 · prose length moved nothing across ${h7.compared} comparison(s)`);
  /* DRIVEN: the same control, on a set where the doubled payload chose a different page. */
  const doctored = [...REAL.filter((r) => r.pattern === 'visual.explanation' && r.klass === 'portrait' && !r.adversarial),
    { ...REAL.find((r) => r.pattern === 'visual.explanation' && r.klass === 'portrait' && !r.adversarial),
      adversarial: true, blueprint: 'stage-full' }];
  const dr = H7(doctored);
  drives.push({ id: 'prose-chose-the-page', control: 'H7', hit: dr.out.length > 0, got: dr.out.slice(0, 1) });
  console.log(`  ${dr.out.length ? '✓' : '✗ DID NOT FIRE'}  prose-chose-the-page        H7`);
}
{
  const h8 = H8(REAL);
  for (const f of h8) fails.push(`H8 · ${f}`);
  console.log(`control H8 · every render used the blueprint its pattern's table names`);
  const doctored = [{ ...REAL[0], blueprint: 'a-page-nobody-approved' }];
  const dr = H8(doctored);
  drives.push({ id: 'unapproved-blueprint', control: 'H8', hit: dr.length > 0, got: dr.slice(0, 1) });
  console.log(`  ${dr.length ? '✓' : '✗ DID NOT FIRE'}  unapproved-blueprint        H8`);
}

/* THE TABLE-LEVEL GUARDS, driven the same way: a blueprint that tries to say these things is refused
   before anything renders. */
const refuses = (what, mutate) => {
  const snapshot = JSON.parse(JSON.stringify(BP.patterns));
  let threw = null;
  try { mutate(); validateBlueprints(); } catch (e) { threw = e.message; }
  BP.patterns = snapshot;
  validateBlueprints();
  drives.push({ id: what, control: 'validate', hit: !!threw, got: threw ? [threw.slice(0, 90)] : [] });
  console.log(`  ${threw ? '✓' : '✗ DID NOT FIRE'}  ${what.padEnd(26)} validate — ${threw ? threw.slice(0, 80) : 'accepted it'}`);
};
console.log('\ntable-level refusals — a blueprint that tries to say this cannot be written down');
refuses('margin-declared-in-table', () => {
  BP.patterns['visual.explanation'].blueprints['spine-narrow'].rows.desktop[0] =
    { id: 'media', split: '8/4', regions: ['media', 'reading-margin'], mode: 'hug', media: true, gapAfter: 'section' };
});
refuses('pair-without-tolerance', () => {
  const r = BP.patterns['worked.paired'].blueprints['cases-6-6'].rows.desktop[1];
  delete r.imbalanceMax;
});
refuses('select-outside-the-set', () => { BP.patterns['visual.compare'].select.desktop.portrait = 'something-else'; });
refuses('prose-past-the-measure', () => {
  BP.patterns['worked.single'].blueprints.flow.rows.desktop[0] =
    { id: 'intro', split: 'full-12', regions: ['intro'], mode: 'hug', gapAfter: 'normal' };
});
refuses('unnamed-rhythm-step', () => { BP.patterns['worked.single'].blueprints.flow.rows.desktop[0].gapAfter = 'a-bit'; });

/* every counterexample must have failed, and for its own reason */
for (const d of drives)
  check(d.hit, `${d.id}: the ${d.control} control did not fire on an arrangement built to break it `
    + `(${d.got.join(' / ') || 'nothing fired'}) — a control that cannot fail is a comment`);

await browser.close(); server.close();
fs.writeFileSync(path.join(OUT, 'composition-proof-report.json'),
  JSON.stringify({ records: REPORT, drives }, null, 2));

console.log('');
if (fails.length) {
  console.log(`${fails.length} CONTROL FAILURE(S)`);
  for (const f of fails) console.log(`  ✗ ${f}`);
} else console.log('every control passed, and every counterexample failed');

/* the table the maintainer reads: why is this page this shape? */
console.log('\nAPPROVED COMPOSITIONS, AS RENDERED');
for (const r of REAL.filter((x) => !x.adversarial && !x.sequence)) {
  console.log(`  ${r.pattern.padEnd(20)} ${r.surface.padEnd(8)} ${String(r.selectKey || '—').padEnd(10)} `
    + `→ ${r.blueprint.padEnd(23)} ${r.rows.map((q) => `${q.id}:${q.split}/${q.mode}`).join(' ')}`);
}
const signals = REAL.flatMap((r) => (r.rhythm || []).filter((q) => q.perceived != null && q.perceived - q.declared > 24)
  .map((q) => `${r.pattern}/${r.blueprint} after \`${q.after}\`: declared ${q.step} ${q.declared}px, reads as ${Math.round(q.perceived)}px`));
if (signals.length) {
  console.log('\nRHYTHM — declared against what the eye gets. Reported, never acted on.');
  for (const s of [...new Set(signals)]) console.log(`  · ${s}`);
}
console.log(`\nwrote ${path.relative(root, OUT)} — ${REAL.filter((r) => !r.adversarial).length} approved board(s), `
  + `${REPORT.filter((r) => r.counterexample).length} counterexample(s)`);
if (fails.length) process.exitCode = 1;
