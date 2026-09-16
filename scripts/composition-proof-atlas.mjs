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

/* ── THE SOLO SPAN LADDER ────────────────────────────────────────────────────────────────────────
   Design-system positions, not measurements. `spine` resolves to the blueprint's own spine span, so
   a solo row can say "the spine, or one rung wider" without repeating a number. */
const RUNGS = ['spine', 'expanded', 'wide', 'full'];
const ladderCols = (surface, rung, spineSpan) => {
  const L = BP.soloLadder[surface];
  if (!(rung in L)) throw new BlueprintError(`${surface}: no ladder rung \`${rung}\` (${Object.keys(L).filter((k) => k !== '_').join(', ')})`);
  return L[rung] == null ? spineSpan : L[rung];
};
const familyFor = (pid, region, klass) => {
  const P = BP.patterns[pid];
  if (region === P.mediaSlot) {
    if (slotType(pid, region) === 'interactive') return BP.soloFamilies.interactive;
    return klass ? BP.soloFamilies[`media.${klass}`] : [...new Set(['portrait', 'balanced', 'landscape', 'wide']
      .flatMap((k) => BP.soloFamilies[`media.${k}`]))];
  }
  return BP.soloFamilies[slotType(pid, region)] || BP.soloFamilies.reading;
};
const soloCols = (surface, align, cols) => {
  const n = SPANS.surfaces[surface].columns;
  const from = align === 'centre' ? (n - cols) / 2 + 1 : 1;
  return { from, to: from + cols - 1 };
};

/* ── THE BLUEPRINTS, VALIDATED BEFORE ANYTHING RENDERS ──────────────────────────────────────────*/
function validateBlueprints() {
  const STEPS = BP.rhythm.steps;
  for (const [pid, P] of Object.entries(BP.patterns)) {
    const names = new Set(slotsOf(pid).map((s) => s.name));
    const all = { ...P.blueprints, ...(P.withdrawn || {}) };
    for (const [bid, B] of Object.entries(all)) {
      if (!B.spine) throw new BlueprintError(`${pid}/${bid}: declares no spine. A blueprint has ONE alignment `
        + `axis per surface and it is declared, never inferred.`);
      for (const [surface, rows] of Object.entries(B.rows)) {
        const S = SPANS.surfaces[surface];
        if (!S) throw new BlueprintError(`${pid}/${bid}: no surface ${surface}`);
        const sp = B.spine[surface];
        if (!sp) throw new BlueprintError(`${pid}/${bid}/${surface}: rows for ${surface} and no spine for it`);
        if (!['centre', 'left-edge'].includes(sp.align))
          throw new BlueprintError(`${pid}/${bid}/${surface}: spine align \`${sp.align}\` is neither centre nor left-edge`);
        if (sp.align === 'centre' && (S.columns - sp.span) % 2)
          throw new BlueprintError(`${pid}/${bid}/${surface}: a centred spine of ${sp.span} on ${S.columns} columns `
            + `cannot be symmetric — page margin is only page margin when it is even either side of the axis`);
        rows.forEach((r, i) => {
          const H = r.horizontal;
          if (!H || !['solo', 'paired', 'workspace'].includes(H.mode))
            throw new BlueprintError(`${pid}/${bid}/${surface}: row \`${r.id}\` declares horizontal mode `
              + `\`${H && H.mode}\` — a row is solo, paired or workspace`);
          if (!['hug', 'designed'].includes(r.vertical))
            throw new BlueprintError(`${pid}/${bid}/${surface}: row \`${r.id}\` declares vertical \`${r.vertical}\` `
              + `— HORIZONTAL RELATIONSHIP AND VERTICAL BEHAVIOUR ARE SEPARATE; vertical is hug or designed`);
          const named = H.mode === 'solo' ? [r.region] : H.regions.filter(Boolean);
          for (const who of named)
            if (!names.has(who)) throw new BlueprintError(`${pid}/${bid}/${surface}: row \`${r.id}\` names `
              + `\`${who}\`, which is not a slot of ${pid} (${[...names].join(', ')})`);
          if (H.mode === 'solo') {
            /* THE LADDER, AND WHAT MAY STAND ON IT. */
            if (!Array.isArray(H.spans) || !H.spans.length)
              throw new BlueprintError(`${pid}/${bid}/${surface}: solo row \`${r.id}\` approves no spans — a solo `
                + `row takes a rung from a declared ladder, never a calculated width`);
            if (!H.spans.includes(H.preferred))
              throw new BlueprintError(`${pid}/${bid}/${surface}: solo row \`${r.id}\` prefers \`${H.preferred}\`, `
                + `which is not among its approved spans (${H.spans.join(', ')})`);
            const fam = familyFor(pid, r.region, null);
            for (const rung of H.spans) {
              if (!RUNGS.includes(rung)) throw new BlueprintError(`${pid}/${bid}/${surface}: row \`${r.id}\` names `
                + `rung \`${rung}\`, which is not on the ladder (${RUNGS.join(', ')})`);
              if (rung !== 'spine' && !fam.includes(rung))
                throw new BlueprintError(`${pid}/${bid}/${surface}: row \`${r.id}\` approves \`${rung}\` for a `
                  + `\`${slotType(pid, r.region)}\` region, whose span family is ${fam.join(', ')} — WHAT A REGION `
                  + `IS constrains which rungs are legal for it; being alone in a row is not a reason to widen it`);
              const cols = ladderCols(surface, rung, sp.span);
              if (cols > S.columns) throw new BlueprintError(`${pid}/${bid}/${surface}: rung \`${rung}\` is ${cols} `
                + `columns on a ${S.columns}-column surface`);
              if (sp.align === 'centre' && (S.columns - cols) % 2)
                throw new BlueprintError(`${pid}/${bid}/${surface}: rung \`${rung}\` is ${cols} columns and the axis `
                  + `is centred, so its page margin cannot be symmetric`);
              if (isProse(pid, r.region) && cols > S.proseMax)
                throw new BlueprintError(`${pid}/${bid}/${surface}: row \`${r.id}\` approves \`${rung}\` = ${cols} `
                  + `columns for prose and ${surface} caps prose at ${S.proseMax} — THE READING MEASURE IS NOT A `
                  + `RUNG ANYONE MAY CLIMB PAST`);
            }
          } else {
            const split = S.splits[H.split];
            if (!split) throw new BlueprintError(`${pid}/${bid}/${surface}: row \`${r.id}\` names split `
              + `\`${H.split}\`, which ${surface} does not approve (${Object.keys(S.splits).join(', ')})`);
            if (split.regions.length !== H.regions.length)
              throw new BlueprintError(`${pid}/${bid}/${surface}: split ${H.split} has ${split.regions.length} `
                + `region(s) and row \`${r.id}\` names ${H.regions.length}`);
            split.regions.forEach((range, k) => {
              const who = H.regions[k], n = range[1] - range[0] + 1;
              if (isProse(pid, who) && n > S.proseMax)
                throw new BlueprintError(`${pid}/${bid}/${surface}: row \`${r.id}\` sets "${who}" across ${n} `
                  + `columns and ${surface} allows ${S.proseMax} for prose`);
            });
          }
          if (H.mode === 'paired') {
            if (named.length !== 2) throw new BlueprintError(`${pid}/${bid}/${surface}: row \`${r.id}\` is `
              + `\`paired\` and names ${named.length} slot(s) — a pair is exactly two siblings`);
            if (H.origin !== 'top') throw new BlueprintError(`${pid}/${bid}/${surface}: row \`${r.id}\` is `
              + `\`paired\` and declares no alignment origin`);
            if (!(H.imbalanceMax > 0)) throw new BlueprintError(`${pid}/${bid}/${surface}: row \`${r.id}\` is `
              + `\`paired\` and declares no \`imbalanceMax\` — a pair that has not said how far its children `
              + `may terminate apart has not been designed`);
            if (!H.pairReason) throw new BlueprintError(`${pid}/${bid}/${surface}: row \`${r.id}\` gives no \`pairReason\``);
          }
          if (H.mode === 'workspace') {
            if (!H.workspaceSlot || !named.includes(H.workspaceSlot))
              throw new BlueprintError(`${pid}/${bid}/${surface}: row \`${r.id}\` is \`workspace\` and does not `
                + `name a \`workspaceSlot\` among ${named.join(', ')}`);
            if (slotType(pid, H.workspaceSlot) !== 'workspace')
              throw new BlueprintError(`${pid}/${bid}/${surface}: row \`${r.id}\` names \`${H.workspaceSlot}\` as `
                + `its workspace and that slot is a \`${slotType(pid, H.workspaceSlot)}\``);
            if (r.vertical !== 'designed')
              throw new BlueprintError(`${pid}/${bid}/${surface}: row \`${r.id}\` is a workspace row and declares `
                + `vertical \`${r.vertical}\` — a workspace is exactly a row whose height was DESIGNED`);
          }
          const last = i === rows.length - 1;
          if (!last && !STEPS[r.gapAfter]) throw new BlueprintError(`${pid}/${bid}/${surface}: row \`${r.id}\` `
            + `declares gapAfter \`${r.gapAfter}\`, which is not a named rhythm step (${Object.keys(STEPS).join(', ')})`);
          if (last && r.gapAfter) throw new BlueprintError(`${pid}/${bid}/${surface}: the last row declares a gap after it`);
          if (r.gapWithin && !named.includes(r.gapWithin))
            throw new BlueprintError(`${pid}/${bid}/${surface}: row \`${r.id}\` puts its gap within `
              + `\`${r.gapWithin}\`, which is not a region of that row`);
        });
      }
    }
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
   Structural validity only. Fitness — whether the rung the row landed on is the one the blueprint
   prefers — is a SEPARATE question, asked afterwards by H11. */
function layout(pid, surface, bid, opts = {}) {
  const P = BP.patterns[pid];
  const B = P.blueprints[bid] || (P.withdrawn || {})[bid] || (opts.rows ? { rows: {}, spine: opts.spine } : null);
  if (!B) throw new BlueprintError(`${pid}: no blueprint \`${bid}\` — approved: ${Object.keys(P.blueprints).join(', ')}`);
  const rows = opts.rows || B.rows[surface];
  const sp = (opts.spine && opts.spine[surface]) || (B.spine && B.spine[surface]);
  if (!sp) throw new BlueprintError(`${pid}/${bid}: no spine for ${surface}`);
  const S = SPANS.surfaces[surface];
  const areas = [], out = [], gaps = [];
  rows.forEach((r, i) => {
    const H = r.horizontal;
    const cells = new Array(S.columns).fill(null), owner = new Array(S.columns).fill(null);
    let kind, named, rung = null, cols = null, at = null;
    if (H.mode === 'solo') {
      named = [r.region];
      kind = 'solo';
      rung = (opts.realised && opts.realised[r.id]) || H.preferred;
      cols = ladderCols(surface, rung, sp.span);
      /* THE MEASURE AND THE AXIS BIND AT REALISATION TOO, not only when a blueprint is written down.
         Found by a drive that did not fire: validate refuses a blueprint that DECLARES prose past the
         measure, and nothing stopped a realised rung from putting it there. */
      if (isProse(pid, r.region) && cols > S.proseMax)
        throw new BlueprintError(`${pid}/${bid}/${surface}: row \`${r.id}\` realised rung \`${rung}\` = ${cols} `
          + `columns for prose, and ${surface} caps prose at ${S.proseMax}`);
      if (sp.align === 'centre' && (S.columns - cols) % 2)
        throw new BlueprintError(`${pid}/${bid}/${surface}: row \`${r.id}\` realised rung \`${rung}\` = ${cols} `
          + `columns on a centred axis, so its page margin cannot be symmetric`);
      at = soloCols(surface, sp.align, cols);
      for (let c = 1; c <= S.columns; c++) {
        const on = c >= at.from && c <= at.to;
        cells[c - 1] = on ? r.region : '.';
        owner[c - 1] = on ? r.region : 'page-margin';
      }
    } else {
      const split = S.splits[H.split];
      named = H.regions.filter(Boolean);
      kind = split.kind;
      split.regions.forEach((range, k) => {
        const who = H.regions[k];
        for (let c = range[0]; c <= range[1]; c++) {
          /* a region declared `null` claims nothing. Only a counterexample may write one, and the
             point of letting it be written at all is that H2 has something real to catch. */
          cells[c - 1] = who == null ? '.' : who;
          if (who != null) owner[c - 1] = who;
        }
      });
      (split.containment || []).forEach((range) => {
        for (let c = range[0]; c <= range[1]; c++) { cells[c - 1] = '.'; owner[c - 1] = 'containment'; }
      });
      const orphan = owner.map((o, k) => o ? null : k + 1).filter(Boolean);
      if (orphan.length && !opts.allowOrphans) throw new BlueprintError(`${pid}/${bid}/${surface}: row `
        + `\`${r.id}\` leaves column(s) ${orphan.join(', ')} belonging to nothing`);
    }
    areas.push(cells.join(' '));
    out.push({ ...r, mode: H.mode, split: H.mode === 'solo' ? null : H.split, named, owner, kind,
      rung, cols, at, track: areas.length, spineAlign: sp.align, spineSpan: sp.span });
    if (r.gapAfter) {
      const px = BP.rhythm.steps[r.gapAfter];
      const next = rows[i + 1];
      const nextOwner = next ? (() => {
        const o = new Array(S.columns).fill(null);
        const NH = next.horizontal;
        if (NH.mode === 'solo') {
          const nc = ladderCols(surface, (opts.realised && opts.realised[next.id]) || NH.preferred, sp.span);
          const na = soloCols(surface, sp.align, nc);
          for (let c = 1; c <= S.columns; c++) o[c - 1] = (c >= na.from && c <= na.to) ? next.region : 'page-margin';
        } else {
          S.splits[NH.split].regions.forEach((rg, k) => { for (let c = rg[0]; c <= rg[1]; c++) o[c - 1] = NH.regions[k]; });
          (S.splits[NH.split].containment || []).forEach((rg) => { for (let c = rg[0]; c <= rg[1]; c++) o[c - 1] = 'containment'; });
        }
        return o;
      })() : null;
      const cells2 = owner.map((o, c) => {
        if (r.gapWithin) {
          if (o === r.gapWithin) return `gap${i}`;
          if (nextOwner && nextOwner[c] === o && o && o !== 'page-margin' && o !== 'containment') return o;
          return '.';
        }
        return `gap${i}`;
      });
      areas.push(cells2.join(' '));
      const gcols = cells2.map((x, c) => x === `gap${i}` ? c + 1 : null).filter(Boolean);
      gaps.push({ after: r.id, idx: i, step: r.gapAfter, px, rule: !!r.ruleAfter,
        within: r.gapWithin || null, ruleW: spanPx(surface, gcols.length), track: areas.length });
    }
  });
  return { areas, rows: out, gaps, blueprint: B, bid, spine: { ...sp } };
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
  /* `.cp-key` IS THE KIT'S key-idea card, not board chrome. A blanket namespace rename caught it once
     and the support region rendered with the board's legend styles; found by looking at the picture. */
  if (ty === 'support') return `<aside class="cp-key"><p class="cp-lab">Key idea</p><p>${t(F.key)}</p></aside>`;
  if (ty === 'worked') return workedBody(name.replace(/^(case|worked)/, (m) => m === 'case' ? 'Case ' : 'Example '), adversarial);
  if (ty === 'workspace') return `<div class="cp-pad"><div class="cp-pad-head"><p class="cp-lab">Your working</p></div>`
    + `<div class="cp-gridpaper"></div></div>`;
  if (ty === 'questions') return `<p class="cp-lab">Questions</p><ol class="cp-qset">`
    + ['Find *y* when *x* = −3.', 'Find *y* when *x* = 3, and say why the two agree.',
      'Find every *x* for which *y* = 16.'].concat(adversarial
        ? ['Sketch the curve between *x* = −4 and *x* = 4.', 'Say what the mirror line is, and why.'] : [])
      .map((q) => `<li class="cp-qitem"><p>${t(q)}</p></li>`).join('') + `</ol>`;
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
  /* WHAT A REGION'S INK ACTUALLY IS. Not "the leaf boxes": a visible surface is ink too — the block
     owns the padding a tinted card needs, and that padding is part of what the reader sees. Invisible
     padding at a region's exterior is not ink, and is exactly what contaminates the rhythm. */
  const hasBg = (cs) => {
    const m = (cs.backgroundColor || '').match(/rgba?\(([^)]+)\)/);
    if (m) { const p = m[1].split(',').map((x) => parseFloat(x)); if (p.length < 4 || p[3] > 0.02) return true; }
    return !!(cs.backgroundImage && cs.backgroundImage !== 'none');
  };
  const edge = (cs, side) => parseFloat(cs['border' + side + 'Width']) > 0 && cs['border' + side + 'Style'] !== 'none';
  const paints = (el) => {
    if (/^(IMG|SVG|VIDEO|CANVAS)$/.test(el.tagName)) return true;
    const cs = getComputedStyle(el);
    return hasBg(cs) || ['Top', 'Right', 'Bottom', 'Left'].some((x) => edge(cs, x));
  };
  const named = (c) => c.tagName.toLowerCase() + (c.className && typeof c.className === 'string'
    ? '.' + c.className.trim().split(/\s+/)[0] : '');
  const inkOf = (el) => {
    let top = Infinity, bottom = -Infinity, topWho = null, bottomWho = null;
    const walk = (n) => {
      for (const c of n.children) {
        if (!vis(c)) continue;
        /* AN ELEMENT THAT DIRECTLY CONTAINS TEXT IS INK — not only a childless one. `<p><b>Answer</b>
           9</p>` puts its line box on the <p>; measuring the <b> instead reads the inline box and
           reports a few pixels of slack that are really typography. */
        const ownText = [].slice.call(c.childNodes)
          .some((t) => t.nodeType === 3 && (t.nodeValue || '').trim().length > 0);
        if (ownText || paints(c)) {
          const r = c.getBoundingClientRect();
          if (r.top < top) { top = r.top; topWho = named(c); }
          if (r.bottom > bottom) { bottom = r.bottom; bottomWho = named(c); }
        }
        walk(c);
      }
    };
    walk(el);
    /* A REGION THAT PAINTS ITS OWN SURFACE — a rule along its top edge, a tinted card — IS ink at
       that edge. The block owns the padding its surface needs; what the reader sees there is the
       surface, not slack. */
    const cs = getComputedStyle(el), own = el.getBoundingClientRect();
    if (hasBg(cs) || edge(cs, 'Top')) { top = own.top; topWho = named(el) + ' (its own surface)'; }
    if (hasBg(cs) || edge(cs, 'Bottom')) { bottom = own.bottom; bottomWho = named(el) + ' (its own surface)'; }
    return isFinite(top) ? { top: +(top - hr.top).toFixed(2), bottom: +(bottom - hr.top).toFixed(2),
      topWho, bottomWho } : null;
  };
  const cols = [].slice.call(host.querySelectorAll('[data-colprobe]'))
    .map((e) => ({ n: +e.getAttribute('data-colprobe'), ...rel(e.getBoundingClientRect()) }))
    .sort((a, b) => a.n - b.n);
  const rows = [].slice.call(host.querySelectorAll('[data-rowprobe]')).map((e) => {
    const names = (e.getAttribute('data-regions') || '').split(',').filter(Boolean);
    const kids = names.map((n) => {
      const el = host.querySelector('[data-slot="' + n + '"]');
      if (!el || !vis(el)) return null;
      const ink = inkOf(el);
      return { name: n, ...rel(el.getBoundingClientRect()), inkTop: ink && ink.top, inkBottom: ink && ink.bottom,
        inkTopWho: ink && ink.topWho, inkBottomWho: ink && ink.bottomWho };
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
  const host = document.querySelector('[data-pf-board]');
  const lay = document.createElement('div');
  lay.className = 'pf-layer';
  host.style.position = 'relative';
  for (const c of payload.cols) {
    const d = document.createElement('div'); d.className = 'pf-colrule';
    d.style.cssText = `left:${c.x}px;width:${c.w}px;top:0;height:${payload.host.h}px`;
    lay.appendChild(d);
  }
  /* THE SPINE — the page's one alignment axis, drawn so it can be seen to be one thing. */
  if (payload.spine && payload.spine.x != null) {
    const sp = document.createElement('div'); sp.className = 'pf-spine';
    sp.style.cssText = `position:absolute;left:${payload.spine.x}px;width:${payload.spine.w}px;top:0;`
      + `height:${payload.host.h}px;border-left:2px solid rgba(180,60,40,.6);`
      + `border-right:2px solid rgba(180,60,40,.6);background:rgba(180,60,40,.025);`;
    sp.innerHTML = `<span class="pf-tag" style="background:#b43c28;color:#fff;left:auto;right:3px;top:auto;`
      + `bottom:3px">spine · ${payload.spine.align} · ${payload.spine.span} col · ${Math.round(payload.spine.w)}px</span>`;
    lay.appendChild(sp);
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

/* ── JUDGEMENT, IN NODE, FROM THE NUMBERS THE PAGE REPORTED ─────────────────────────────────────
   THE FIVE SPACES ARE KEPT SEPARATE HERE AND NOWHERE ELSE IS THERE A GENERIC WHITESPACE RULE.
     1 page margin              outside the spine, or a centred grid row's symmetric containment — VALID
     2 blueprint rhythm         a named step, rendered as a real grid row                        — VALID
     3 internal block space     inside a region; may never reach the region's exterior           — H10
     4 unclaimed composition    free width inside an ACTIVE (grid) row                           — H2
     5 pair imbalance           all width owned and the pair still terminates too far apart      — H4   */
const CENTRE_TOL = 0.5;
const HUG_TOL = 2;
function judge(pid, surface, L, m, resolve = {}) {
  const S = SPANS.surfaces[surface];
  const fails = [], notes = [], boards = [];
  const byId = new Map(L.rows.map((r) => [r.id, r]));

  for (const mr of m.rows) {
    const R = byId.get(mr.id);
    const covered = m.cols.map((c) => {
      const mid = c.x + c.w / 2;
      const k = mr.kids.find((q) => q.x - CENTRE_TOL <= mid && mid <= q.x + q.w + CENTRE_TOL);
      return k ? k.name : null;
    });
    const runs = [];
    let i = 0;
    while (i < covered.length) {
      let j = i; while (j + 1 < covered.length && covered[j + 1] === covered[i]) j++;
      runs.push({ from: i + 1, to: j + 1, who: covered[i],
        x: m.cols[i].x, w: +(m.cols[j].x + m.cols[j].w - m.cols[i].x).toFixed(2) });
      i = j + 1;
    }
    /* H1 · EVERY COLUMN'S RENDERED OWNER IS THE ONE THE BLUEPRINT DECLARED. For a spine row this is
       also the check that the region occupies the spine EXACTLY — a region narrower than the spine
       is not on the spine, it is a fragment of an active row, and it fails here. */
    for (let c = 0; c < covered.length; c++) {
      const declared = R.owner[c], got = covered[c];
      const shouldBeEmpty = declared === 'page-margin' || declared === 'containment' || declared == null;
      if (shouldBeEmpty ? got !== null : got !== declared)
        fails.push(['H1', `${pid}/${L.bid}/${surface} row \`${mr.id}\`: column ${c + 1} is declared `
          + `\`${declared || 'nothing'}\` and is rendered ${got ? `inside \`${got}\`` : 'empty'}`
          + (R.mode === 'solo' ? ` — a solo row occupies its realised rung \`${R.rung}\` `
            + `(columns ${R.at.from}–${R.at.to}) exactly` : '')]);
    }
    /* THE FIVE SPACES, ASSIGNED. */
    const free = runs.filter((r) => !r.who).map((f) => {
      const role = R.owner[f.from - 1];
      const n = f.to - f.from + 1;
      if (role === 'page-margin')
        return { ...f, space: 1, role: 'page-margin', label: `page margin · ${n} col · outside the spine` };
      if (role === 'containment') {
        /* page margin declared by a centred ROW rather than by the page spine. Symmetric or it is not
           margin at all. */
        const cont = S.splits[R.split].containment || [];
        const sym = cont.length === 2 && (cont[0][1] - cont[0][0]) === (cont[1][1] - cont[1][0]);
        if (R.kind !== 'centred' || !sym)
          fails.push(['H2', `${pid}/${L.bid}/${surface} row \`${mr.id}\`: columns ${f.from}–${f.to} are declared `
            + `\`containment\` in \`${R.split}\`, which is not a symmetric centred split — free width is page `
            + `margin only when it is even either side of a declared axis`]);
        return { ...f, space: 1, role: 'containment', label: `containment · ${n} col · symmetric about the row's axis` };
      }
      fails.push(['H2', `${pid}/${L.bid}/${surface} row \`${mr.id}\`: columns ${f.from}–${f.to} (${f.w}px) are `
        + `rendered empty inside an ACTIVE ROW and nothing declares them. A row holding \`${R.named.join(', ')}\` `
        + `may not leave part of itself unexplained — centre it on a declared spine, give it a companion region, `
        + `widen it to an approved footprint, or move it into a different row composition`]);
      return { ...f, space: 4, role: 'unowned', label: `UNCLAIMED · ${n} col · inside an active row` };
    });
    /* H3 · A ROW TAKES ITS HEIGHT FROM ITS CONTENTS — from the ones that BEGIN in it. A region that
       began in an earlier row and spans through this one is not this row's height. */
    const began = L.rows.filter((q) => q.track < R.track).flatMap((q) => q.named);
    const own = mr.kids.filter((k) => !began.includes(k.name));
    const tallest = own.length ? Math.max(...own.map((k) => k.h)) : 0;
    const air = +(mr.h - tallest).toFixed(2);
    if (air > TOLPX)
      fails.push(['H3', `${pid}/${L.bid}/${surface} row \`${mr.id}\`: the row is ${mr.h}px and its tallest child `
        + `is ${tallest}px — ${air}px of the row is taller than anything in it`]);
    /* H10 · A REGION HUGS ITS OWN INK OR VISIBLE SURFACE AT ITS EXTERIOR BOUNDARY. The block owns the
       space inside it; the blueprint owns the space between regions. Invisible padding reaching the
       exterior is a second, undeclared page rhythm — which is what made a declared 56px read as 81. */
    for (const k of mr.kids) {
      if (k.inkTop == null) continue;
      const top = +(k.inkTop - k.y).toFixed(2), bot = +(k.y + k.h - k.inkBottom).toFixed(2);
      if (top > HUG_TOL || bot > HUG_TOL)
        fails.push(['H10', `${pid}/${L.bid}/${surface} row \`${mr.id}\`: region \`${k.name}\` carries ${top}px `
          + `above its topmost ink (${k.inkTopWho}) and ${bot}px below its lowest (${k.inkBottomWho}) at its `
          + `exterior boundary. A region hugs its ink or its visible surface; the space between regions belongs `
          + `to the blueprint alone`]);
    }
    /* H4 · PAIR TERMINATION, A SEPARATE CONTRACT FROM COLUMN OWNERSHIP. `side-study` owns all twelve
       columns and still fails here, which is the whole reason the two are not one rule. */
    let imbalance = null;
    if (R.mode === 'paired' || R.mode === 'workspace') {
      const [a, b] = mr.kids;
      /* A REGION THAT SPANS SEVERAL ROWS BEGAN IN THE FIRST OF THEM. Asking it to start level with a
         region two rows below is asking the wrong question — the workspace's origin is its own row's. */
      const spansIn = new Set(L.rows.filter((q) => q.track < R.track)
        .flatMap((q) => q.named).filter((n2) => R.named.includes(n2)));
      if (a && b && !spansIn.size) {
        if (Math.abs(a.y - b.y) > TOLPX)
          fails.push(['H4', `${pid}/${L.bid}/${surface} row \`${mr.id}\`: the siblings start at y=${a.y} and `
            + `y=${b.y} — two regions sharing a row share ONE alignment origin`]);
        imbalance = +Math.abs(a.h - b.h).toFixed(2);
        if (R.mode === 'paired' && imbalance > R.horizontal.imbalanceMax)
          fails.push(['H4', `${pid}/${L.bid}/${surface} row \`${mr.id}\`: the siblings terminate ${imbalance}px `
            + `apart and the blueprint declares at most ${R.horizontal.imbalanceMax}px (${R.horizontal.pairReason}). `
            + `All twelve columns can be owned and the relationship still be visually invalid`]);
      } else if (R.mode === 'paired') {
        fails.push(['H4', `${pid}/${L.bid}/${surface} row \`${mr.id}\`: a paired row rendered ${mr.kids.length} sibling(s)`]);
      }
    }
    boards.push({ id: mr.id, mode: R.mode, vertical: R.vertical, rung: R.rung,
      split: R.mode === 'solo' ? `solo ${R.rung} ${R.cols} col` : R.split,
      y: mr.y, h: mr.h, air, imbalance,
      label: `${mr.id} · ${R.mode === 'solo' ? `solo · ${R.rung} · ${R.cols} col` : `${R.mode} · ${R.split}`}`
        + `${R.mode === 'paired' ? ` (≤${R.horizontal.imbalanceMax}px)` : ''} · ${R.vertical} · ${Math.round(mr.h)}px`
        + (air > TOLPX ? ` · +${air}px AIR` : '') + (imbalance != null ? ` · ${imbalance}px apart` : ''),
      kids: mr.kids.map((k, n) => {
        const run = runs.find((r) => r.who === k.name);
        return { ...k, tint: n % 6, label: `${k.name} · ${run ? `col ${run.from}–${run.to}` : '?'} · ${Math.round(k.w)}px` };
      }),
      free });
  }
  /* THE RHYTHM: declared, rendered, and what the eye actually gets between two blocks of ink. */
  const rhythm = m.gaps.map((g) => {
    const above = m.rows.find((r) => r.id === g.after);
    const below = m.rows[m.rows.indexOf(above) + 1];
    /* A GAP MEASURES BETWEEN THE REGIONS IT ACTUALLY SEPARATES — the ones above and below the
       columns the gap occupies. A region that spans past the gap is not separated by it. */
    const G = L.gaps.find((q) => q.after === g.after);
    const within = G && G.within ? G.within : null;
    const pick = (row, side) => {
      if (!row || !row.kids.length) return null;
      const R2 = byId.get(row.id);
      let use = row.kids;
      if (within) {
        const lo = g.x, hi = g.x + g.w;
        const over = row.kids.filter((k) => k.x < hi - 1 && k.x + k.w > lo + 1);
        if (over.length) use = over;
      }
      return side === 'bottom' ? Math.max(...use.map((k) => k.inkBottom ?? k.y + k.h))
        : Math.min(...use.map((k) => k.inkTop ?? k.y));
    };
    const a = pick(above, 'bottom'), b2 = pick(below, 'top');
    return { after: g.after, step: g.step, declared: g.declared, rendered: +g.h.toFixed(2),
      perceived: a != null && b2 != null ? +(b2 - a).toFixed(2) : null };
  });
  for (const r of rhythm) {
    if (Math.abs(r.rendered - r.declared) > TOLPX)
      fails.push(['H3', `${pid}/${L.bid}/${surface}: the gap after \`${r.after}\` is declared \`${r.step}\` `
        + `(${r.declared}px) and rendered ${r.rendered}px`]);
    if (r.perceived != null && Math.abs(r.perceived - r.declared) > HUG_TOL + 1)
      fails.push(['H10', `${pid}/${L.bid}/${surface}: the step after \`${r.after}\` is declared \`${r.step}\` `
        + `(${r.declared}px) and reads as ${r.perceived}px — ${+(r.perceived - r.declared).toFixed(1)}px of it `
        + `belongs to a region's own exterior padding, which is a second page rhythm nobody declared`]);
  }
  /* THE SPINE IS AN AXIS, NOT A WIDTH. Every solo row sits on it whatever rung it takes, so the
     control asks about the AXIS — the centre line, or the left edge — and never about the width.
     That is precisely what lets a solo row climb the ladder without leaving the composition. */
  const soloRows = m.rows.filter((r) => byId.get(r.id).mode === 'solo');
  const axis = new Set(soloRows.flatMap((r) => r.kids.map((k) =>
    Math.round(L.spine.align === 'centre' ? k.x + k.w / 2 : k.x))));
  if (axis.size > 1)
    fails.push(['H1', `${pid}/${L.bid}/${surface}: the solo rows sit on ${axis.size} different axes `
      + `(${[...axis].join(', ')}px) — a blueprint has ONE ${L.spine.align === 'centre' ? 'centre line' : 'left edge'}`]);

  /* ── H11 · SOLO SPAN — THE FITNESS LAYER ──────────────────────────────────────────────────────
     Everything above asks whether the composition is STRUCTURALLY VALID: does every part of an
     active row have an owner? This asks something else: is the approved blueprint actually using
     the surface it was given? A one-region row that stays on a narrower approved rung while its
     preferred rung is feasible is legal and timid, and legal is not the same as well used.
     It is NOT occupancy: nothing here measures a fraction, a dead-space area or a content length. */
  for (const mr of m.rows) {
    const R = byId.get(mr.id);
    if (R.mode !== 'solo') continue;
    const want = resolve[mr.id];
    if (!want) continue;
    if (R.rung !== want.should)
      fails.push(['H11', `${pid}/${L.bid}/${surface} row \`${mr.id}\`: one region, approved spans `
        + `${R.horizontal.spans.map((x) => `${x}=${ladderCols(surface, x, L.spine.span)}`).join(', ')}, `
        + `preferred \`${R.horizontal.preferred}\` — realised \`${R.rung}\` (${R.cols} col, `
        + `${Math.round(mr.kids[0] ? mr.kids[0].w : 0)}px) where \`${want.should}\` was available. `
        + `${want.why} The row is structurally owned and UNDER-REALISED: a smaller span being legal is not a `
        + `reason to stay on it.`]);
  }

  /* THE BAND DRAWN ON THE BOARD IS THE AXIS AT ITS OWN SPAN — not whatever rung the widest solo row
     realised. Seeing the spine and a wider solo row at once is the point of the picture. */
  const sc = soloCols(surface, L.spine.align, L.spine.span);
  const colAt = (n) => m.cols[n - 1];
  return { fails, notes, boards, rhythm, resolve,
    spine: { align: L.spine.align, span: L.spine.span, from: sc.from, to: sc.to,
      x: colAt(sc.from) ? colAt(sc.from).x : null,
      w: colAt(sc.from) && colAt(sc.to) ? +(colAt(sc.to).x + colAt(sc.to).w - colAt(sc.from).x).toFixed(2) : null },
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
      const row = L.rows.find((r) => r.named.includes(P.mediaSlot));
      const a = row.owner.indexOf(P.mediaSlot), b = row.owner.lastIndexOf(P.mediaSlot);
      const fit = opts.forceFit || P.slotFit;
      parts.push(`<div data-slot="${esc(s.name)}" data-slot-type="${esc(s.slotType)}" data-media-slot `
        + `data-occupancy="${esc(s.occupancy)}" data-fit="${esc(fit)}" data-cols="${a + 1}–${b + 1}" `
        + `data-span="${b - a + 1}" data-slot-anchor="${esc(row.mode === 'solo' ? `solo/${row.rung}` : row.split)}" `
        + `data-fixture="${esc(fx.id)}" data-media-kind="${esc(fx.kind)}"`
        + (fit === 'contain' && !opts.dropAnchor ? ` data-media-anchor="center" data-anchor-resolved` : '')
        + `>${mediaMarkup(fx, fit)}</div>`);
    } else {
      parts.push(`<div data-slot="${esc(s.name)}" data-slot-type="${esc(s.slotType)}" `
        + `data-occupancy="${esc(s.occupancy)}">${slotBody(pid, s.name, opts.adversarial)}</div>`);
    }
  }
  for (const r of L.rows)
    parts.push(`<i data-rowprobe="${esc(r.id)}" data-mode="${esc(r.mode)}" `
      + `data-split="${esc(r.mode === 'solo' ? `solo/${r.rung}` : r.split)}" data-regions="${esc(r.named.join(','))}"></i>`);
  for (const g of L.gaps)
    parts.push(`<i data-gap="${esc(g.after)}" data-step="${esc(g.step)}" data-px="${g.px}"`
      + (g.rule ? ` data-rule style="--rule-w:${g.ruleW}px"` : '') + `></i>`);
  for (let c = 1; c <= S.columns; c++) parts.push(`<i data-colprobe="${c}"></i>`);
  return `<div class="cp-page pf-page" data-pattern="${esc(pid)}" data-subdesign="${esc(L.bid)}" data-inst="0">`
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
  for (let c = 1; c <= g.columns; c++)
    lines.push(`[data-sd="${sd}"] > [data-colprobe="${c}"]{grid-column:${c};grid-row:1;height:0;pointer-events:none;}`);
  return lines.join('\n');
}

/* ── THE OWNERSHIP BOUNDARY, ENFORCED IN ONE PLACE ───────────────────────────────────────────────
   The BLOCK owns typography, the space between its steps, and the padding a VISIBLE surface needs.
   The BLUEPRINT owns every gap between two semantic regions. So a region's outermost descendant
   chain contributes no margin at the region's exterior — the declared step is the whole step, and
   nothing quietly adds a second page rhythm to it. Interior spacing is untouched. */
const REGION_HUG_CSS = (() => {
  const chain = (side) => {
    const which = side === 'top' ? 'first-child' : 'last-child';
    const out = [];
    let sel = '[data-slot]';
    for (let d = 0; d < 5; d++) { sel += ` > :${which}`; out.push(sel); }
    return out.join(',\n') + `{margin-${side}:0 !important;}`;
  };
  return `/* region hug — the blueprint owns the space between regions */\n${chain('top')}\n${chain('bottom')}\n`
    + `[data-slot]{display:flow-root;}`;
})();

const PROOF_CSS = `
.pf-board{background:#f4f4f2;padding:0 0 34px;}
.pf-board>div{margin:0;}
.pf-head{background:#111;color:#fff;padding:14px 22px;font:600 13px/1.5 ui-monospace,Menlo,monospace;letter-spacing:.05em;}
.pf-head b{color:#8fd3b0;}
.pf-head[data-bad]{background:#7a1414;}
.pf-why{background:#fff;border-bottom:1px solid #ddd;padding:14px 22px;font:14px/1.6 Georgia,serif;color:#333;}
.pf-rulebar{margin:0;padding:10px 22px;background:#e8efec;border-top:1px solid #cfdcd6;border-bottom:1px solid #cfdcd6;
  font:600 12px/1.6 ui-monospace,Menlo,monospace;color:#1f5c40;letter-spacing:.03em;}
.pf-rulebar i{font-style:normal;color:#6b7c74;font-weight:400;}
.pf-capt{margin:0;padding:9px 22px;background:#1f2a26;color:#b8cfc4;font:600 11px/1.5 ui-monospace,Menlo,monospace;letter-spacing:.08em;}
.pf-page{background:#fff;box-shadow:none;border-radius:0;}
.pf-layer{position:absolute;inset:0;pointer-events:none;z-index:5;overflow:hidden;}
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
.pf-free[data-role="page-margin"]{background:repeating-linear-gradient(45deg,rgba(120,120,110,.13) 0 6px,rgba(120,120,110,.03) 6px 12px);outline:1px dashed rgba(90,90,80,.55);}
.pf-free[data-role="containment"]{background:repeating-linear-gradient(45deg,rgba(60,100,180,.16) 0 6px,rgba(60,100,180,.04) 6px 12px);outline:1px dashed rgba(30,60,140,.6);}
.pf-free[data-role="unowned"]{background:repeating-linear-gradient(45deg,rgba(200,0,0,.30) 0 7px,rgba(200,0,0,.10) 7px 14px);outline:2px solid #c00;}
.pf-tag{position:absolute;left:3px;top:2px;font:600 9px/1.5 ui-monospace,Menlo,monospace;letter-spacing:.04em;
  padding:1px 4px;border-radius:2px;white-space:nowrap;}
.pf-tag-row{background:#111;color:#fff;left:auto;right:3px;}
.pf-tag-slot{background:rgba(255,255,255,.9);color:#17492f;outline:1px solid rgba(31,92,64,.4);}
.pf-tag-gap{background:#1f5c40;color:#fff;left:auto;right:3px;top:50%;transform:translateY(-50%);}
.pf-tag-free{background:#fff;color:#444;outline:1px solid rgba(0,0,0,.25);writing-mode:vertical-rl;top:4px;
  max-height:calc(100% - 8px);overflow:hidden;}
.pf-free[data-role="unowned"] .pf-tag-free{background:#c00;color:#fff;outline:0;}
.pf-verdict{background:#fff;border-top:2px solid #111;padding:10px 22px 14px;font:11px/1.65 ui-monospace,Menlo,monospace;}
.pf-verdict div{display:flex;gap:10px;}
.pf-verdict b{flex:0 0 200px;color:#666;font-weight:600;}
.pf-verdict i{font-style:normal;color:#111;}
.pf-verdict[data-bad] b{color:#c00;}
.pf-verdict .ok{color:#17492f;font-weight:600;}
.pf-verdict .bad{color:#c00;font-weight:600;}
.pf-legend{background:#e8efec;padding:8px 22px;font:11px/1.9 ui-monospace,Menlo,monospace;color:#33403a;
  border-top:1px solid #cfdcd6;border-bottom:1px solid #cfdcd6;display:flex;flex-wrap:wrap;gap:16px;}
.pf-legend span{display:inline-flex;align-items:center;gap:6px;}
.pf-legend b{width:16px;height:12px;display:inline-block;border-radius:2px;}
.pf-legend .k1{background:repeating-linear-gradient(45deg,rgba(120,120,110,.5) 0 4px,rgba(120,120,110,.12) 4px 8px);outline:1px dashed rgba(90,90,80,.6);}
.pf-legend .k2{background:repeating-linear-gradient(90deg,rgba(40,80,60,.35) 0 4px,rgba(40,80,60,.06) 4px 8px);}
.pf-legend .k3{background:rgba(60,140,100,.35);outline:1px solid rgba(31,92,64,.6);}
.pf-legend .k4{background:repeating-linear-gradient(45deg,rgba(200,0,0,.6) 0 4px,rgba(200,0,0,.2) 4px 8px);outline:1px solid #c00;}
.pf-legend .k5{background:#fff;outline:2px solid #1f5c40;}
.cp-spine{position:absolute;top:0;bottom:0;border-left:1px solid rgba(180,60,40,.55);border-right:1px solid rgba(180,60,40,.55);
  background:rgba(180,60,40,.03);}
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

/* ── FITNESS, RESOLVED BEFORE ANYTHING IS DRAWN ──────────────────────────────────────────────────
   Which rung a solo row SHOULD land on. The inputs are categorical — the region's span family, the
   rungs the blueprint approved, the rung it prefers — plus one mathematical question for media: does
   an equal-unit box exist at that width. Nothing here reads a content length, a rendered height, an
   area or a percentage. */
async function feasible(pid, surface, row, rung, spineSpan, fx, klass) {
  const S = SPANS.surfaces[surface];
  const fam = familyFor(pid, row.region, klass);
  const cols = ladderCols(surface, rung, spineSpan);
  if (rung !== 'spine' && !fam.includes(rung))
    return { ok: false, cols, why: `\`${rung}\` is outside the span family for a ${slotType(pid, row.region)} region (${fam.join(', ')})` };
  if (cols > S.columns) return { ok: false, cols, why: `${cols} columns on a ${S.columns}-column surface` };
  if (isProse(pid, row.region) && cols > S.proseMax)
    return { ok: false, cols, why: `${cols} columns is past the ${S.proseMax}-column reading measure` };
  if (row.media && fx && fx.kind === 'graph') {
    try {
      const box = await boxFor(fx.figure, spanPx(surface, cols));
      return { ok: true, cols, why: `the plane solves to ${Math.round(box.w)}×${Math.round(box.h)}px at equal unit scale` };
    } catch (e) { return { ok: false, cols, why: `no equal-unit box fits ${spanPx(surface, cols)}px` }; }
  }
  return { ok: true, cols, why: `${cols} columns is approved for a ${slotType(pid, row.region)} region` };
}

async function resolveSolos(pid, surface, rows, spineSpan, fx, klass) {
  const out = {};
  for (const r of rows) {
    const H = r.horizontal;
    if (H.mode !== 'solo') continue;
    const feas = {};
    for (const rung of H.spans) feas[rung] = await feasible(pid, surface, r, rung, spineSpan, fx, klass);
    const byWidth = H.spans.slice().sort((a, b) => ladderCols(surface, a, spineSpan) - ladderCols(surface, b, spineSpan));
    const ok = byWidth.filter((x) => feas[x].ok);
    const should = feas[H.preferred] && feas[H.preferred].ok ? H.preferred : (ok[ok.length - 1] || byWidth[0]);
    out[r.id] = { should, feasible: feas,
      why: feas[H.preferred] && feas[H.preferred].ok
        ? `The preferred rung is feasible — ${feas[H.preferred].why}.`
        : `The preferred rung \`${H.preferred}\` is not feasible (${feas[H.preferred] ? feas[H.preferred].why : 'unknown'}), `
          + `so the widest feasible approved rung is \`${should}\`.` };
  }
  return out;
}

/* ── ONE BOARD ───────────────────────────────────────────────────────────────────────────────────*/
async function board(pid, surface, bid, o = {}) {
  const P = BP.patterns[pid];
  const g = GRID.surfaces[surface];
  const klass = o.klass || null;
  const fx = P.mediaSlot ? (o.fixture || (klass && klass !== 'none' ? pickFixture(pid, klass) : null)) : null;
  const B0 = P.blueprints[bid] || (P.withdrawn || {})[bid];
  const rows0 = o.rows || (B0 && B0.rows[surface]);
  const spineSpan = ((o.spine && o.spine[surface]) || (B0 && B0.spine && B0.spine[surface]) || {}).span;
  const resolve = await resolveSolos(pid, surface, rows0, spineSpan, fx, klass);
  /* the realised rung IS the resolved one, unless a counterexample deliberately holds it back */
  const realised = Object.fromEntries(Object.entries(resolve).map(([k, v]) => [k, v.should]));
  for (const [k, v] of Object.entries(o.forceSpan || {})) realised[k] = v;
  const L = layout(pid, surface, bid, { rows: o.rows, allowOrphans: o.allowOrphans, spine: o.spine, realised });
  const sd = `${pid.replace(/\W/g, '')}-${surface}-${bid.replace(/\W/g, '')}-${klass || 'x'}${o.tag ? '-' + o.tag : ''}`;
  const name = o.name || `${pid.replace(/\./g, '-')}__${surface}__${bid}${klass && klass !== 'none' ? '__' + klass : ''}`;

  let plain = pageMarkup(pid, surface, L, fx, { sd, hostAttr: 'data-cp-host', adversarial: o.adversarial,
    forceFit: o.forceFit, dropAnchor: o.dropAnchor });
  let proof = plain.replace('data-cp-host', 'data-pf-board').replace(/ data-media-slot(?=[ >])/, ' data-media-slot-proof');

  /* the figure is painted at the slot the blueprint gave it, and at nothing else */
  if (fx && fx.kind === 'graph') {
    const row = L.rows.find((r) => r.named.includes(P.mediaSlot));
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
${REGION_HUG_CSS}
${gridCSS(sd, surface, L, pid)}
${o.injectCSS || ''}
</style></head><body class="mx cp-${surface}"><div class="pf-board" style="width:${g.width + 2 * g.pad}px">
<div class="pf-head"${o.counterexample ? ' data-bad' : ''}>${esc(pid)} · <b>${esc(bid)}</b> · ${esc(surface)} `
    + `${g.width}px · ${g.columns} col${klass && klass !== 'none' ? ` · ${esc(klass)} media` : ''}`
    + (o.adversarial ? ' · ADVERSARIAL PAYLOAD' : '') + (o.counterexample ? ` · COUNTEREXAMPLE — MUST FAIL` : '') + `</div>
<div class="pf-why">${t(o.why || L.blueprint.why || '')}</div>
<div class="pf-rulebar">${esc(L.blueprint.title || bid)} <i>· ${L.rows.map((r) =>
      `${r.id}:${r.mode === 'solo' ? `${r.rung}(${r.cols}col)` : `${r.mode} ${r.split}`}/${r.vertical}`).join(' · ')}</i></div>
<div class="pf-capt">THE PAGE</div>${plain}
<div class="pf-capt">THE SAME PAGE, WITH EVERY REGION AND EVERY PIECE OF WHITE CLASSIFIED</div>
<div class="pf-legend"><span><b class="k1"></b>1 · page margin — outside the spine, valid, no owner needed</span>
<span><b class="k2"></b>2 · blueprint rhythm — a named step</span>
<span><b class="k3"></b>3 · region (block owns what is inside it)</span>
<span><b class="k4"></b>4 · unclaimed composition space — inside an active row, invalid</span>
<span><b class="k5"></b>5 · pair imbalance — measured on the row label</span></div>${proof}
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
  const J = judge(pid, surface, L, m, resolve);

  /* the media verdict comes from the ONE owner the other two atlases use */
  let mediaLines = null, mediaOk = true, mediaVerdict = null;
  const mm = await pg.evaluate(measureMedia);
  if (mm.length) {
    const x = mm[0];
    const ctx = { surface, grid: GRID, vocab: VOCAB, colW, spanPx, fixture: fx,
      /* the spans this pattern's approved blueprints actually give its media slot, so a failure can
         name the alternatives instead of asserting there are none */
      pattern: { subdesigns: Object.values(P.blueprints).flatMap((b) => Object.entries(b.rows)
        .flatMap(([s2, rr]) => rr.flatMap((r) => {
          const H = r.horizontal;
          if (H.mode === 'solo') return r.region === P.mediaSlot && b.spine[s2]
            ? H.spans.map((g) => ({ surface: s2, slotSpan: ladderCols(s2, g, b.spine[s2].span) })) : [];
          const k = (H.regions || []).indexOf(P.mediaSlot);
          if (k < 0) return [];
          const rg = SPANS.surfaces[s2].splits[H.split].regions[k];
          return [{ surface: s2, slotSpan: rg[1] - rg[0] + 1 }];
        }))) } };
    const fit = slotFit(x, ctx);
    mediaOk = fit.ok; mediaVerdict = fit.verdict;
    mediaLines = inspectorLines(x, ctx, fit);
    if (!fit.ok) J.fails.push([x.fit === 'contain' ? 'H6' : 'H5', `${pid}/${bid}/${surface}: ${fit.verdict}`]);
  }

  await pg.evaluate(drawProof, { host: m.host, cols: m.cols, gaps: m.gaps, rows: J.boards, spine: J.spine });

  /* the verdict panel, printed from the same numbers */
  const V = [
    ['BLUEPRINT', `${bid} — ${L.blueprint.title || ''}`],
    ['SELECTED BY', P.selectBy + (klass && klass !== 'none' ? ` · media geometry \`${klass}\`` : '')],
    ['SPINE', `${J.spine.align} · ${J.spine.span} col · columns ${J.spine.from}–${J.spine.to}`
      + (J.spine.w != null ? ` · realised ${Math.round(J.spine.w)}px at x=${Math.round(J.spine.x)}` : '')],
    ['ROWS', J.boards.map((b) => `${b.id} ${b.mode}${b.rung ? '/' + b.rung : '/' + b.split} ${b.vertical} ${Math.round(b.h)}px`).join(' · ')],
    ['SOLO LADDER', L.rows.filter((r) => r.mode === 'solo').map((r) =>
      `${r.id}: [${r.horizontal.spans.map((g) => `${g}=${ladderCols(surface, g, L.spine.span)}`).join(' ')}]`
      + ` prefer ${r.horizontal.preferred} → ${r.rung} (${r.cols} col)`
      + (resolve[r.id] && resolve[r.id].should === r.rung ? ' ✓' : ' ✗')).join('  ·  ') || 'none'],
    ['RHYTHM · declared', J.rhythm.map((r) => `${r.after}→${r.step} ${r.declared}px`).join(' · ') || '—'],
    ['RHYTHM · measured', J.rhythm.map((r) => `${r.after} ${r.perceived == null ? '—' : r.perceived + 'px'}`
      + (r.perceived != null && Math.abs(r.perceived - r.declared) <= 3 ? ' ✓' : ' ✗')).join(' · ') || '—'],
    ['VERTICAL AIR', J.boards.map((b) => `${b.id} ${b.air > TOLPX ? `+${b.air}px ✗` : '0 ✓'}`).join(' · ')],
    ['PAIRS', J.boards.filter((b) => b.mode === 'paired').map((b) => `${b.id} ${b.imbalance}px apart, `
      + `declared ≤${L.rows.find((r) => r.id === b.id).imbalanceMax}px`).join(' · ') || 'none'],
    ['1 · PAGE MARGIN', J.boards.flatMap((b) => b.free.filter((f) => f.space === 1)
      .map((f) => `${b.id} col ${f.from}–${f.to}`)).join(' · ') || 'none'],
    ['4 · UNCLAIMED', J.boards.flatMap((b) => b.free.filter((f) => f.space === 4)
      .map((f) => `${b.id} col ${f.from}–${f.to} = ${f.w}px`)).join(' · ') || 'none'],
  ];
  if (mediaLines) for (const l of mediaLines.slice(3, 9)) V.push(l);
  V.push(['EVERY WHITE HAS AN OWNER', J.whitespaceOwned && mediaOk ? 'YES' : 'NO']);
  for (const n of J.notes) V.push(['SIGNAL', n]);
  for (const [c, f] of J.fails) V.push([c + ' ✗', f]);
  await pg.evaluate(({ rows, bad }) => {
    const d = document.createElement('div');
    d.className = 'pf-verdict'; if (bad) d.setAttribute('data-bad', '');
    d.innerHTML = rows.map(([k, v]) => `<div><b>${k}</b><i>${String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/\bYES\b/, '<span class="ok">YES</span>').replace(/\bNO\b/, '<span class="bad">NO</span>')}</i></div>`).join('');
    document.querySelector('.pf-board').appendChild(d);
  }, { rows: V, bad: !!J.fails.length });
  await pg.waitForTimeout(100);

  if (!o.noShot) {
    const bb = await (await pg.$('.pf-board')).boundingBox();
    await pg.setViewportSize({ width: Math.ceil(bb.width), height: Math.min(28000, Math.ceil(bb.height) + 8) });
    await pg.waitForTimeout(120);
    await (await pg.$('.pf-board')).screenshot({ path: path.join(OUT, name + '.png') });
  }
  await pg.close();

  const rec = { pattern: pid, surface, blueprint: bid, klass: klass || 'none', name, selectKey: o.selectKey || null,
    adversarial: !!o.adversarial, counterexample: !!o.counterexample,
    rows: J.boards.map((b) => ({ id: b.id, split: b.split, mode: b.mode, vertical: b.vertical, rung: b.rung,
      h: b.h, air: b.air, imbalance: b.imbalance })),
    resolve: Object.fromEntries(Object.entries(resolve).map(([k, v]) => [k, v.should])),
    rhythm: J.rhythm, slotWidths: J.boards.flatMap((b) => b.kids.map((k) => `${k.name}=${Math.round(k.w)}`)),
    whitespaceOwned: J.whitespaceOwned, mediaOk, mediaVerdict, fails: J.fails };
  REPORT.push(rec);
  if (!o.quiet) console.log(`  ${name.padEnd(56)} ${J.fails.length ? `${J.fails.length} FAIL` : 'ok  '} `
    + `${J.boards.map((b) => `${b.mode[0]}${Math.round(b.h)}`).join(' ')}`);
  return rec;
}

/* ── THE RUN ─────────────────────────────────────────────────────────────────────────────────────
   The proofs this pass had to show, and nothing else. Two layers are being demonstrated together:
   STRUCTURAL VALIDITY (does every part of an active row have an owner?) and COMPOSITION FITNESS
   (is the approved blueprint using the surface it was given?). */
const SCOPE = [
  { pid: 'visual.explanation', surface: 'desktop', bid: 'spine-narrow', key: 'portrait', klass: 'portrait',
    name: '1__portrait-media-solo-expanded',
    note: 'GOLDEN · one region, realised at `expanded`' },
  { pid: 'worked.single', surface: 'desktop', bid: 'flow', key: 'flow', klass: null,
    name: '2__prose-alone-stays-at-the-measure',
    note: 'every row solo PROSE — the ladder stops at the measure' },
  { pid: 'visual.explanation', surface: 'desktop', bid: 'stage-full', key: 'wide', klass: 'wide',
    name: '3__wide-media-solo-full',
    note: 'one region, realised at `full`' },
  { pid: 'worked.paired', surface: 'desktop', bid: 'cases-6-6', key: 'any', klass: null,
    name: '4__worked-paired-unchanged', note: 'GOLDEN · unchanged — no solo row to reclaim' },
  { pid: 'practice.workbook', surface: 'desktop', bid: 'workbook-5-7', key: 'any', klass: 'portrait',
    name: '5__practice-workbook-unchanged', note: 'unchanged — designed 5/7 relationships, not solo rows' },
].filter((x) => (!ONLY || ONLY.has(x.pid)) && (!SURF || SURF.has(x.surface)));

console.log(`\nproofs — ${SCOPE.length} composition(s) in scope`);
for (const x of SCOPE) await board(x.pid, x.surface, x.bid, { klass: x.klass, selectKey: x.key, name: x.name });

console.log('\nadversarial — the same compositions with twice the prose');
for (const x of SCOPE)
  await board(x.pid, x.surface, x.bid, { klass: x.klass, selectKey: x.key, adversarial: true, noShot: true,
    quiet: true, tag: 'adv', name: x.name + '__adv' });

/* ── THE COUNTEREXAMPLES ─────────────────────────────────────────────────────────────────────────*/
console.log('\ncounterexamples — each must fail, and fail for the stated reason');
const drives = [];
const drive = (id, control, rec) => {
  const got = rec.fails.map(([c]) => c);
  drives.push({ id, control, hit: got.includes(control), got });
  console.log(`  ${got.includes(control) ? '✓' : '✗ DID NOT FIRE'}  ${id.padEnd(30)} ${control} — ${got.join(',') || 'nothing fired'}`);
};

/* NEW · H11 — THE PAIRED PROOF. The same blueprint, the same region, held back one rung. Structurally
   perfect, and under-realised. This is the board that was previously shipped as correct. */
drive('under-realised-solo-span', 'H11', await board('visual.explanation', 'desktop', 'spine-narrow',
  { klass: 'portrait', counterexample: true, tag: 'ce11', name: '6__counterexample__under-realised-solo-span',
    forceSpan: { media: 'spine' },
    why: 'STRUCTURALLY PERFECT AND UNDER-REALISED. Every column has an owner, the axis is one centre line, '
      + 'every step measures itself — and the only substantive object on the page is holding at six columns '
      + 'when the blueprint prefers eight and eight is feasible. Valid whitespace is not the same as good use '
      + 'of space. This is the page the previous pass shipped as correct.' }));

/* RETAINED · H2 — the canonical must-never-happen-again. */
drive('unowned-half-row', 'H2', await board('visual.explanation', 'desktop', 'spine-narrow',
  { klass: 'portrait', counterexample: true, tag: 'ce2', name: '7__counterexample__unowned-half-row',
    allowOrphans: true,
    rows: [{ id: 'media', horizontal: { mode: 'paired', split: '6/6', regions: ['media', null], origin: 'top',
        imbalanceMax: 9999, pairReason: 'the counterexample' }, vertical: 'hug', media: true, gapAfter: 'section' },
      { id: 'interpretation', horizontal: { mode: 'solo', spans: ['spine'], preferred: 'spine' }, vertical: 'hug', region: 'interpretation', gapAfter: 'normal' },
      { id: 'support', horizontal: { mode: 'solo', spans: ['spine'], preferred: 'spine' }, vertical: 'hug', region: 'support' }],
    why: 'THE CANONICAL MUST-NEVER-HAPPEN-AGAIN, AND THE REASON H11 IS A SECOND LAYER RATHER THAN A WIDER '
      + 'LADDER. Six columns occupied at the left of a twelve-column ACTIVE ROW, the other six declared by '
      + 'nothing. Widening the object would not make this page legal; the defect is ownership, not fitness.' }));

/* RETAINED · H4 — the row owns all twelve columns and the page is still wrong. */
drive('side-study-imbalance', 'H4', await board('visual.explanation', 'desktop', 'side-study',
  { klass: 'portrait', counterexample: true, tag: 'ce6', name: '8__counterexample__side-study-imbalance',
    why: 'STILL FAILS, AND A WIDER GRAPH WOULD NOT HAVE SAVED IT. Every column of this row is owned and the '
      + 'two paired objects still terminate ~535px apart. Ownership, fitness and termination are three '
      + 'different questions; this one fails the third.' }));

/* DRIVES · not photographed; each exists so a control is known to be able to fail. */
drive('prose-past-the-measure', 'validate-runtime', { fails: (() => {
  try {
    layout('worked.single', 'desktop', 'flow', { realised: { intro: 'full' } });
    return [];
  } catch (e) { return [['validate-runtime', e.message]]; }
})() });
drive('stretched-hug-row', 'H3', await board('visual.explanation', 'desktop', 'spine-narrow',
  { klass: 'portrait', counterexample: true, tag: 'ce4', noShot: true, quiet: true, name: 'drive__stretched-hug-row',
    injectCSS: `[data-sd*="ce4"] > [data-rowprobe="interpretation"]{height:420px!important;}` }));
drive('padding-at-the-exterior', 'H10', await board('worked.paired', 'desktop', 'cases-6-6',
  { counterexample: true, tag: 'ce8', noShot: true, quiet: true, name: 'drive__padding-at-the-exterior',
    injectCSS: `[data-sd*="ce8"] > [data-slot="intro"]{padding-bottom:28px;}` }));
drive('no-alignment-origin', 'H4', await board('worked.paired', 'desktop', 'cases-6-6',
  { counterexample: true, tag: 'ce5', noShot: true, quiet: true, name: 'drive__no-alignment-origin',
    injectCSS: `[data-sd*="ce5"] > [data-slot="workedB"]{margin-top:64px;}` }));
drive('anchorless-contain', 'H6', await board('visual.explanation', 'desktop', 'spine-reading',
  { klass: 'balanced', counterexample: true, tag: 'ce7', noShot: true, quiet: true,
    name: 'drive__anchorless-contain', forceFit: 'contain', dropAnchor: true }));
drive('two-axes', 'H1', await board('visual.explanation', 'desktop', 'spine-narrow',
  { klass: 'portrait', counterexample: true, tag: 'ce9', noShot: true, quiet: true, name: 'drive__two-axes',
    injectCSS: `[data-sd*="ce9"] > [data-slot="support"]{margin-left:-120px;}` }));

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
  const snapshot = JSON.parse(JSON.stringify({ patterns: BP.patterns, soloLadder: BP.soloLadder, soloFamilies: BP.soloFamilies }));
  let threw = null;
  try { mutate(); validateBlueprints(); } catch (e) { threw = e.message; }
  BP.patterns = snapshot.patterns; BP.soloLadder = snapshot.soloLadder; BP.soloFamilies = snapshot.soloFamilies;
  validateBlueprints();
  drives.push({ id: what, control: 'validate', hit: !!threw, got: threw ? [threw.slice(0, 90)] : [] });
  console.log(`  ${threw ? '✓' : '✗ DID NOT FIRE'}  ${what.padEnd(26)} validate — ${threw ? threw.slice(0, 80) : 'accepted it'}`);
};
console.log('\ntable-level refusals — a blueprint that tries to say this cannot be written down');
refuses('spineless-blueprint', () => { delete BP.patterns['visual.explanation'].blueprints['spine-narrow'].spine; });
refuses('asymmetric-centred-rung', () => {
  BP.soloLadder.desktop.expanded = 7;
});
refuses('rung-outside-the-family', () => {
  BP.patterns['worked.single'].blueprints.flow.rows.desktop[0].horizontal.spans = ['spine', 'full'];
});
refuses('prose-past-the-measure', () => {
  BP.soloFamilies.reading = ['spine', 'expanded', 'full'];
  BP.patterns['worked.single'].blueprints.flow.rows.desktop[0].horizontal.spans = ['spine', 'full'];
});
refuses('preferred-not-approved', () => {
  BP.patterns['visual.explanation'].blueprints['spine-narrow'].rows.desktop[0].horizontal.preferred = 'wide';
});
refuses('horizontal-doing-vertical-work', () => {
  BP.patterns['worked.paired'].blueprints['cases-6-6'].rows.desktop[1].vertical = 'paired';
});
refuses('pair-without-tolerance', () => {
  delete BP.patterns['worked.paired'].blueprints['cases-6-6'].rows.desktop[1].horizontal.imbalanceMax;
});
refuses('workspace-without-a-designed-height', () => {
  BP.patterns['practice.workbook'].blueprints['workbook-5-7'].rows.desktop[1].vertical = 'hug';
});
refuses('select-outside-the-set', () => { BP.patterns['visual.compare'].select.desktop.portrait = 'something-else'; });
refuses('unnamed-rhythm-step', () => {
  BP.patterns['worked.paired'].blueprints['cases-6-6'].rows.desktop[0].gapAfter = 'a-bit';
});

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
