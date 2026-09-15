#!/usr/bin/env node
// THE COMPOSITION ATLAS — a small catalogue of page patterns on one master grid.
//
//   node scripts/composition-atlas.mjs [outDir]
//
// THE ARCHITECTURE THIS PROTOTYPE EXISTS TO TEST:
//
//   LESSON SEMANTICS -> PAGE PATTERN -> APPROVED SUBDESIGN -> NAMED SLOTS ON MASTER GRID
//     -> BLOCKS OCCUPY SLOTS -> MEDIA FITS ITS SLOT
//
// and not: measure everything -> compare dimensions -> infer arrangement -> resize things.
//
// A GRID GIVES ALIGNMENT LINES; IT DOES NOT DECIDE THE COMPOSITION. The arrangements exist before
// the content is inserted, and the only things this script chooses are:
//
//   1. which APPROVED SUBDESIGN of the authored pattern to use, from the SURFACE and — where the
//      pattern declares it — the MEDIA'S OWN ASPECT CLASS. Never from content;
//   2. the pixel width a media slot offers, which is arithmetic on the master grid.
//
// A GRAPH NO LONGER OWNS A SIZE. It is handed a slot width and answers only: inside this width, at
// equal unit scale, this is the faithful rendering I can provide. Its height follows and the page
// grows. `mediaSize` — the authored compact/standard/large class — was the useful failed
// intermediate that proved semantic importance and media geometry are separate concerns; the slot
// is the permanent mechanism and this script does not read a size class anywhere.
//
// The app is not changed by this script and does not read anything under docs/atlas/.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { openFigurePage, makePainter, makeSolvers, square, classOf, capability } from './lib/figure-geometry.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(root, 'docs/atlas/composition/src');
const OUT = path.resolve(process.argv[2] || path.join(root, 'docs/atlas/composition'));
fs.mkdirSync(OUT, { recursive: true });

const GRID = JSON.parse(fs.readFileSync(path.join(SRC, 'grid.json'), 'utf8'));
const VOCAB = JSON.parse(fs.readFileSync(path.join(SRC, 'vocabulary.json'), 'utf8'));
const PATTERNS = JSON.parse(fs.readFileSync(path.join(SRC, 'patterns.json'), 'utf8'));
const SHELLS = (() => {
  const raw = JSON.parse(fs.readFileSync(path.join(SRC, 'shells.json'), 'utf8'));
  const out = {};
  for (const [id, v] of Object.entries(raw.theTwoKinds)) if (!id.startsWith('_'))
    out[id] = { id, kind: v.kind, label: id === 'views' ? 'Representations' : 'Parts of this lesson', ...v };
  return out;
})();
const PAGES = JSON.parse(fs.readFileSync(path.join(SRC, 'pages.json'), 'utf8'));
const CSS_KIT = fs.readFileSync(path.join(SRC, 'composition.css'), 'utf8');
const FIGS = JSON.parse(fs.readFileSync(path.join(root, 'docs/atlas/worked-examples/src/figures.json'), 'utf8'));
const LESSON = JSON.parse(fs.readFileSync(path.join(root, 'docs/atlas/lesson/quadratics.lesson.json'), 'utf8'));
const BANDS = JSON.parse(fs.readFileSync(path.join(root, 'docs/atlas/worked-examples/src/atlas.json'), 'utf8')).mediaGeometry.bands;
const SURFACES = Object.keys(GRID.surfaces);
const ONLY = process.env.CP_ONLY ? new Set(process.env.CP_ONLY.split(',')) : null;

/* ── the grid, as arithmetic ──────────────────────────────────────────────────────────────────── */
const spanPx = (s, n) => +span(s, n).toFixed(2);
const colW = (s) => (GRID.surfaces[s].width - (GRID.surfaces[s].columns - 1) * GRID.surfaces[s].gutter) / GRID.surfaces[s].columns;
const span = (s, n) => n * colW(s) + (n - 1) * GRID.surfaces[s].gutter;
/* the x of every grid line, so a control can prove slot edges actually land on them */
const lines = (s) => {
  const out = [];
  for (let i = 0; i < GRID.surfaces[s].columns; i++) {
    const x = i * (colW(s) + GRID.surfaces[s].gutter);
    out.push(+x.toFixed(2), +(x + colW(s)).toFixed(2));
  }
  return out;
};

/* WHICH SLOT TYPES HOLD AN OBJECT WITH A FOOTPRINT. A graph, a video, a diagram and a manipulable
   instrument all receive a width from their slot and must inhabit it; prose is bound by the reading
   measure instead, and a workspace is a surface the learner acts on, not an object placed in one. */
const MEDIA_SLOTS = new Set(['media', 'interactive']);
/* the spans a pattern actually approves at a surface, DERIVED FROM THE SUBDESIGNS. The table in
   patterns.json is documentation of this, and validate() holds the two to each other. */
const approvedSpans = (p, surface) => [...new Set(p.subdesigns
  .filter((d) => d.surface === surface && d.mediaSpan).map((d) => d.mediaSpan))].sort((a, b) => a - b);

/* ── the pattern catalogue, validated before anything is rendered ─────────────────────────────── */
class PatternError extends Error { constructor(m) { super(m); this.name = 'PatternError'; } }
const SLOT_TYPES = new Set(Object.keys(VOCAB.slotTypes));
const BLOCK_TYPES = new Set(Object.keys(VOCAB.blockTypes));
const OCCUPANCY = new Set(Object.keys(VOCAB.occupancy).filter((k) => k !== '_'));

function areaSpans(areas) {
  /* the column span of every slot named in an areas block, and the row it starts on */
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

function validate() {
  for (const [id, p] of Object.entries(PATTERNS)) {
    if (id.startsWith('_')) continue;
    const names = new Set(p.slots.map((s) => s.name));
    for (const s of p.slots) {
      if (!SLOT_TYPES.has(s.slotType)) throw new PatternError(`${id}.${s.name}: slot type "${s.slotType}" is not in the vocabulary`);
      if (!OCCUPANCY.has(s.occupancy)) throw new PatternError(`${id}.${s.name}: occupancy "${s.occupancy}" is not one of ${[...OCCUPANCY].join(', ')}`);
      for (const b of s.allowedBlocks) {
        if (!BLOCK_TYPES.has(b)) throw new PatternError(`${id}.${s.name}: block type "${b}" is not in the vocabulary`);
        if (!VOCAB.blockFitsSlot[b].includes(s.slotType))
          throw new PatternError(`${id}.${s.name}: a ${b} block may not live in a ${s.slotType} slot `
            + `(it fits ${VOCAB.blockFitsSlot[b].join(', ')})`);
      }
    }
    for (const d of p.subdesigns) {
      const n = GRID.surfaces[d.surface].columns;
      d.areas.forEach((r, i) => {
        const t = r.trim().split(/\s+/);
        if (t.length !== n) throw new PatternError(`${id}/${d.id}: areas row ${i + 1} has ${t.length} tokens, `
          + `and the ${d.surface} grid has ${n} columns — "${r}"`);
        for (const name of t) if (name !== '.' && !names.has(name))
          throw new PatternError(`${id}/${d.id}: areas name "${name}" is not a slot of this pattern`);
      });
      /* CONTROL · THE READING MEASURE IS A PROPERTY OF THE GRID, NOT A HOPE. A slot that may hold
         prose may not be given more columns than the measure allows on that surface. */
      const sp = areaSpans(d.areas);
      for (const s of p.slots) {
        if (!sp[s.name]) continue;
        const holdsProse = s.allowedBlocks.some((b) => ['prose', 'keyIdea', 'workedExample', 'questionSet'].includes(b));
        const max = GRID.readingMeasure.maxSpan[d.surface];
        if (holdsProse && sp[s.name].cols > max)
          throw new PatternError(`${id}/${d.id}: "${s.name}" holds prose across ${sp[s.name].cols} of the `
            + `${d.surface} grid's ${n} columns — the reading measure allows ${max} (${Math.round(span(d.surface, max))}px)`);
      }
    }
    /* CONTROL · EVERY MEDIA SLOT DECLARES A FIT. "Is the media inhabiting its slot well?" has no
       answer at all for a slot that never said what inhabiting it means. */
    for (const sl of p.slots) {
      if (!MEDIA_SLOTS.has(sl.slotType)) continue;
      if (!['fill', 'contain'].includes(sl.fit))
        throw new PatternError(`${id}.${sl.name}: a media slot must declare fit \`fill\` or \`contain\` (it declares ${sl.fit || 'nothing'})`);
      if (sl.fit === 'contain' && sl.align === 'start' && !sl.alignReason)
        throw new PatternError(`${id}.${sl.name}: start alignment in a \`contain\` slot requires an explicit design reason `
          + `on the slot — without one, an object against the left edge is the defect this contract names`);
    }
    /* CONTROL · THE DECLARED SPAN IS THE SPAN THE AREAS ACTUALLY GIVE. `mediaSpan` is what promotion
       orders by and what the inspector prints; if it can disagree with the grid areas beside it,
       both are reading a number the page never had. (It caught practice.workbook/beside declaring
       seven columns for a five-column reference slot.) */
    for (const d of p.subdesigns) {
      const ms = p.slots.find((x) => MEDIA_SLOTS.has(x.slotType));
      const sp = areaSpans(d.areas)[ms ? ms.name : ''];
      if (!ms || !sp) { 
        if (d.mediaSpan) throw new PatternError(`${id}/${d.id}: declares mediaSpan ${d.mediaSpan} and lays out no media slot`);
        continue;
      }
      if (d.mediaSpan !== sp.cols)
        throw new PatternError(`${id}/${d.id}: declares mediaSpan ${d.mediaSpan} and gives "${ms.name}" ${sp.cols} columns`);
    }
    /* CONTROL · THE APPROVED-SPAN TABLE IS DOCUMENTATION, AND DOCUMENTATION DRIFTS. The subdesigns
       are the one owner; a hand-written table that disagrees with them is worse than none. */
    if (p.approvedMediaSpans) for (const sf of SURFACES) {
      const got = approvedSpans(p, sf).join(','), said = (p.approvedMediaSpans[sf] || []).join(',');
      if (got !== said)
        throw new PatternError(`${id}: approvedMediaSpans says ${sf} = [${said}] and the approved subdesigns give [${got}]`);
    }
    /* CONTROL · FREE COLUMNS BESIDE MEDIA ARE NOT READING MARGIN. Free columns beside PROSE are the
       measure doing its job; free columns beside MEDIA are nothing, because media has no measure to
       be bound by. A row whose only named slot is media must therefore be centred or full — the
       left-inset 8-of-12 arrangement that started all this fails here, in the catalogue, before
       anything is rendered. */
    for (const d of p.subdesigns) for (const sl of p.slots) {
      if (!MEDIA_SLOTS.has(sl.slotType)) continue;
      for (const row of d.areas) {
        const tk = row.trim().split(/\s+/);
        if (!tk.includes(sl.name)) continue;
        if (tk.some((x) => x !== '.' && x !== sl.name)) continue;      // another slot owns the gap
        const l = tk.indexOf(sl.name), r = tk.length - 1 - tk.lastIndexOf(sl.name);
        if (l !== r)
          throw new PatternError(`${id}/${d.id}: "${sl.name}" is the only slot in its row and sits ${l} column(s) from `
            + `the left and ${r} from the right — media with unnamed columns on one side is stranded, not inset. `
            + `Centre it or span the grid.`);
      }
    }
    /* EVERY (surface, aspect class) NEEDS AN APPROVED SUBDESIGN — and `none` is one of the classes.
       A pattern whose media is optional-collapse has a real authored state with no media at all: the
       lesson's Symmetry workings is a comparison with no shared visual, and visual.compare had no
       arrangement for it until this control was extended to ask.
       WHERE SEVERAL MATCH, THEY ARE SPAN-PROMOTION CANDIDATES, and the choice between them has to be
       decidable without looking at the content: `pick()` orders them by media span ascending and
       takes the first that clears the media's minimum legible width. So two candidates may not share
       a span, and a candidate without a declared span cannot be ordered at all. Where there is no
       media — no media slot, or the `none` class — there is nothing to promote and nothing to order,
       so exactly one arrangement must be approved. This control is what makes the determinism
       claim in vocabulary.json true rather than hopeful. */
    const needsMedia = p.slots.some((x) => x.slotType === 'media' && x.occupancy === 'required');
    const hasMedia = p.slots.some((x) => x.slotType === 'media');
    for (const s of SURFACES) for (const a of ASPECTS) {
      if (a === 'none' && needsMedia) continue;
      const m = p.subdesigns.filter((d) => d.surface === s && (!d.aspects || d.aspects.includes(a)));
      if (!m.length)
        throw new PatternError(`${id}: no approved subdesign matches ${s}/${a} — that is a state this pattern can be asked for`);
      if (m.length === 1) continue;
      if (!hasMedia || a === 'none')
        throw new PatternError(`${id}: ${m.length} approved subdesigns match ${s}/${a} — there is no media here to promote, `
          + `so exactly one must (${m.map((d) => d.id).join(', ')})`);
      const spans = m.map((d) => d.mediaSpan);
      if (spans.some((x) => !x))
        throw new PatternError(`${id}: ${m.map((d) => d.id).join(', ')} all match ${s}/${a}, so they are promotion candidates — `
          + `each needs a mediaSpan to be ordered by (${m.map((d) => `${d.id}:${d.mediaSpan || '—'}`).join(', ')})`);
      if (new Set(spans).size !== spans.length)
        throw new PatternError(`${id}: ${m.map((d) => d.id).join(', ')} match ${s}/${a} and share a media span `
          + `(${spans.join(', ')}) — promotion could not choose between them`);
    }
  }
}

/* `optional-collapse` MEANS THE ROW GOES, NOT THAT THE SLOT IS EMPTY. CSS Grid keeps an unoccupied
   named track and the row-gap either side of it — a 40px band of nothing, which is residue under a
   different name. A row every one of whose tokens is `.` or an absent optional slot is dropped
   whole. The rule reads only WHICH SLOTS THE AUTHOR FILLED; it never reads what is in them. */
function collapseRows(areas, absent) {
  const out = areas.filter((r) => r.trim().split(/\s+/).some((n) => n !== '.' && !absent.has(n)));
  if (!out.length) throw new PatternError('every row of this subdesign collapsed — nothing is left to lay out');
  return out;
}

/* the subdesign is chosen from the SURFACE and the MEDIA ASPECT CLASS. There is no third input.
   `none` is an aspect class: a page with no media is a state a pattern must have designed. */
const ASPECTS = ['portrait', 'balanced', 'landscape', 'wide', 'none'];
/* SPAN PROMOTION — the only automation in the system, and it selects from layouts already designed:
   CHOOSE THE SMALLEST APPROVED SPAN THAT SATISFIES THE MEDIA'S HARD CAPABILITY REQUIREMENTS.
   Not "choose the prettiest arrangement based on content measurements". The only input is a number
   the media reported about ITSELF. If no approved span clears it, the widest is taken and the build
   reports it rather than silently shrinking the plane. */
const pick = (p, surface, aspect, need, surfaceW) => {
  const m = p.subdesigns.filter((d) => d.surface === surface && (!d.aspects || d.aspects.includes(aspect)));
  if (!m.length) throw new PatternError(`${p.id}: no approved subdesign matches ${surface}/${aspect}`);
  if (m.length === 1) return { d: m[0], promoted: false };
  const by = m.slice().sort((a, b) => (a.mediaSpan || 0) - (b.mediaSpan || 0));
  if (!need) return { d: by[0], promoted: false };
  const px = (sd) => spanPx(surface, sd.mediaSpan);
  const ok = by.find((sd) => px(sd) >= need);
  if (!ok) return { d: by[by.length - 1], promoted: true, unmet: need, got: px(by[by.length - 1]) };
  return { d: ok, promoted: ok !== by[0], need, at: px(ok), skipped: by.slice(0, by.indexOf(ok)).map((x) => `${x.id}(${px(x)}px)`) };
};

/* ── the areas CSS, generated from patterns.json so the JSON is their ONE OWNER ────────────────── */
function areasCSS(surface) {
  const out = [];
  for (const [id, p] of Object.entries(PATTERNS)) {
    if (id.startsWith('_')) continue;
    for (const d of p.subdesigns) {
      if (d.surface !== surface) continue;
      out.push(`[data-pattern="${id}"][data-subdesign="${d.id}"]{grid-template-areas:\n`
        + d.areas.map((r) => `  "${r}"`).join('\n') + ';}');
      /* one extra rule per collapsible slot, so a page that omits it gets the row-less areas */
      for (const s of p.slots.filter((x) => x.occupancy === 'optional-collapse')) {
        const kept = d.areas.filter((r) => r.trim().split(/\s+/).some((n) => n !== '.' && n !== s.name));
        if (kept.length === d.areas.length) continue;
        out.push(`[data-pattern="${id}"][data-subdesign="${d.id}"][data-without~="${s.name}"]{grid-template-areas:\n`
          + kept.map((r) => `  "${r}"`).join('\n') + ';}');
      }
    }
  }
  for (const [id, p] of Object.entries(PATTERNS)) {
    if (id.startsWith('_')) continue;
    for (const s of p.slots) out.push(`[data-pattern="${id}"] > [data-slot="${s.name}"]{grid-area:${s.name};}`);
  }
  return out.join('\n');
}

/* ── content: intent in, safe markup out ──────────────────────────────────────────────────────── */
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
/* the lesson writes *x* for a variable and ^2 for a superscript; it never writes markup */
const t = (s) => esc(s).replace(/\*([^*]+)\*/g, '<i>$1</i>').replace(/\^([-−]?[0-9A-Za-z]+)/g, '<sup>$1</sup>');
const slug = (s) => String(s).toLowerCase().replace(/\*/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const mathOf = (v) => Array.isArray(v) ? v.map((x) => `<span class="cp-stmt">${t(x)}</span>`).join('') : t(v);
const para = (p) => typeof p === 'string' ? `<p>${t(p)}</p>` : `<p class="cp-said">${mathOf(p.math)}</p>`;

/* THE REAL LESSON IS THE CONTENT. Indexed so a page can say `substitution/1` rather than repeating
   material — a pattern that only works on prose written to fit it proves nothing. */
function indexLesson() {
  const ix = { example: {}, cases: {}, visual: {}, lede: {}, synthesis: {} };
  for (const item of LESSON.page.collection.items) {
    const k = slug(item.label);
    if (item.lede) ix.lede[k] = item.lede;
    if (item.synthesis) ix.synthesis[k] = item.synthesis;
    const walk = (n, key) => {
      if (!n) return;
      if (n.collection) return n.collection.items.forEach((x, i) => walk(x, `${key}/${i}`));
      if (n.views) return n.views.items.forEach((x) => walk(x.body, `${key}/${slug(x.label)}`));
      if (n.composition === 'comparison.paired') {
        n.cases.forEach((c, i) => { ix.example[`${key}#${i}`] = { ...c, title: c.label }; });
        ix.cases[key] = n; return;
      }
      if (n.composition === 'visual') { ix.visual[key] = n; return; }
      ix.example[key] = n;
    };
    walk(item.body, k);
  }
  return ix;
}
const IX = indexLesson();

const workedExample = (n, opts = {}) => {
  const q = n.question || n.scenario;
  return `<article class="cp-wex">`
    + (n.title && !opts.noTitle ? `<h3 class="cp-wex-title">${t(n.title)}</h3>` : '')
    /* `noPrompt` is for a pattern that gives the scenario a SLOT OF ITS OWN — repeating it in the
       question box would put the same prose on the page twice */
    + (opts.noPrompt ? '' : `<div class="cp-q"><p class="cp-lab">${esc(n.scenario ? 'Scenario' : 'Question')}</p>${q.map(para).join('')}</div>`)
    + `<p class="cp-lab">Worked solution</p><ol class="cp-steps">`
    + n.steps.map((s) => `<li class="cp-step"><div class="cp-st">${t(s.say)}</div>`
        + (s.math != null ? `<div class="cp-sm">${mathOf(s.math)}</div>` : '')
        + (s.table ? tableBlock({ block: 'table', ...s.table }) : '') + `</li>`).join('')
    + `</ol><div class="cp-ans"><b>Answer</b>${t(n.answer)}</div></article>`;
};
const tableBlock = (b) => `<div class="cp-tblwrap" data-scroll-x="local"><table class="cp-tbl">`
  + `<tr>${b.head.map((c) => `<th>${t(c)}</th>`).join('')}</tr>`
  + b.rows.map((r) => `<tr>${r.map((c) => `<td>${t(c)}</td>`).join('')}</tr>`).join('')
  + `</table></div>`;

/* ── the blocks ───────────────────────────────────────────────────────────────────────────────── */
const FIGREQ = [];
function block(b, ctx) {
  switch (b.block) {
    case 'prose':
      return `<div class="cp-prose">` + (b.heading ? `<h3>${t(b.heading)}</h3>` : '')
        + (b.ref ? [IX.lede[b.ref]].filter(Boolean).map(para).join('') : '')
        + (b.paragraphs || []).map(para).join('') + `</div>`;
    case 'keyIdea':
      return `<aside class="cp-key"><p class="cp-lab">${esc(b.label || 'Key idea')}</p>`
        + (b.paragraphs || []).map(para).join('') + `</aside>`;
    case 'workedExample': {
      const n = b.ref ? IX.example[b.ref] : b;
      if (!n) throw new PatternError(`no worked example "${b.ref}" in the lesson`);
      return workedExample(n, b);
    }
    case 'table': return tableBlock(b);
    case 'graph': case 'image': case 'video': {
      /* THE SLOT GIVES THE WIDTH. The block asks for nothing. */
      FIGREQ.push(b.figure);
      return `<figure class="cp-figure">{{FIG:${b.figure}}}`
        + (b.caption ? `<figcaption class="cp-figcap">${t(b.caption)}</figcaption>` : '') + `</figure>`;
    }
    case 'interactive': {
      FIGREQ.push(b.figure);
      return `<div class="cp-figure">{{FIG:${b.figure}}}</div>`
        + `<div class="cp-controls" role="group" aria-label="${esc(b.label || 'Controls')}">`
        + (b.controls || []).map((c) => `<div class="cp-ctl"><span class="cp-ctl-name">${t(c.name)}</span>`
            + `<span class="cp-track"><span class="cp-knob" style="left:calc(${c.at}% - 8px)"></span></span>`
            + `<span class="cp-ctl-val">${t(c.value)}</span></div>`).join('')
        + `</div>`;
    }
    case 'questionSet':
      return `<ol class="cp-qset">` + b.items.map((q) => `<li class="cp-qitem"><p>${t(q.say)}</p>`
        + (q.math ? `<div class="cp-sm">${mathOf(q.math)}</div>` : '') + `</li>`).join('') + `</ol>`;
    case 'handwrittenResponse':
      return `<div class="cp-pad"><div class="cp-pad-head"><p class="cp-lab">${esc(b.label || 'Your working')}</p>`
        + `<span class="cp-pad-tools">${['✎', '⌫', '＋'].map((g) => `<button type="button" class="cp-tool" aria-label="tool">${g}</button>`).join('')}</span></div>`
        + `<div class="cp-${b.paper === 'grid' ? 'gridpaper' : 'paper'}"></div></div>`;
    default: throw new PatternError(`no renderer for block "${b.block}"`);
  }
}

/* a slot holds blocks; the slot is what the pattern named, the blocks are what the lesson supplies */
function slotMarkup(pattern, s, content, ctx) {
  if (!content || (Array.isArray(content) && !content.length)) return null;
  const group = Array.isArray(content) ? null : content;
  const check = (b) => {
    if (!s.allowedBlocks.includes(b.block))
      throw new PatternError(`${pattern.id}: a ${b.block} block was placed in "${s.name}" (${s.slotType}), `
        + `which allows ${s.allowedBlocks.join(', ')}`);
    return b;
  };
  let inner;
  if (group) {
    if (!pattern.disclosureAllowed.includes(group.disclosure))
      throw new PatternError(`${pattern.id}: "${s.name}" asks for ${group.disclosure}, and the pattern `
        + `allows ${pattern.disclosureAllowed.join(', ')}`);
    const kind = group.disclosure.split('.')[0];
    const gid = `${pattern.id.replace(/\W/g, '')}-${s.name}`;
    /* the W3C APG tabs model, emitted whole — the roles and the wiring are part of the disclosure
       contract, not decoration added afterwards */
    inner = `<div class="cp-tabs" data-tabs="${esc(s.name)}" data-tabs-kind="${esc(kind)}">`
      + `<div class="cp-tabbar" role="tablist" aria-label="${esc(group.label || s.name)}">`
      + group.items.map((i) => `<button class="cp-tab" type="button" role="tab" id="${gid}-t-${slug(i.label)}" `
          + `aria-controls="${gid}-p-${slug(i.label)}" data-tab="${slug(i.label)}">${t(i.label)}</button>`).join('')
      + `</div>`
      + group.items.map((i) => `<div class="cp-panel" role="tabpanel" id="${gid}-p-${slug(i.label)}" `
          + `aria-labelledby="${gid}-t-${slug(i.label)}" data-panel="${slug(i.label)}">`
          + (i.lede ? `<p class="cp-tabnote">${t(i.lede)}</p>` : '')
          + i.blocks.map((b) => block(check(b), ctx)).join('') + `</div>`).join('')
      + `</div>`;
  } else {
    inner = content.map((b) => block(check(b), ctx)).join('');
  }
  const scrollY = s.scroll === 'pane' && !ctx.noPane ? ' data-scroll-y="pane"' : '';
  const fit = s.fit ? ` data-fit="${esc(s.fit)}" data-align="${esc(s.align || (s.fit === 'contain' ? 'center' : 'stretch'))}"` : '';
  /* THE SLOT CARRIES ITS OWN COLUMNS. The inspector must read what the pattern granted, not
     re-derive it from the painted width — a slot painted at the wrong width would then agree
     with itself and the inspector would report a hole it could not see. */
  const a = ctx.area;
  const cols = a ? ` data-cols="${a.c0 + 1}\u2013${a.c1 + 1}" data-span="${a.cols}"` : '';
  const med = MEDIA_SLOTS.has(s.slotType) ? ' data-media-slot' : '';
  return `<div data-slot="${esc(s.name)}" data-slot-type="${esc(s.slotType)}" data-occupancy="${esc(s.occupancy)}"${scrollY}${fit}${cols}${med}>`
    + (s.label ? `<p class="cp-lab">${esc(s.label)}</p>` : '') + inner + `</div>`;
}

/* ── assemble one page ────────────────────────────────────────────────────────────────────────── */
/* ONE PATTERN INSTANCE. A page is either one of these or a SHELL holding a tree of them: the shell
   owns the page title and the tab strips, and it is NOT a pattern — it holds patterns. */
function buildInstance(inst, page, surface, opts = {}) {
  const p = PATTERNS[inst.pattern];
  if (!p) throw new PatternError(`page ${page.n}: no pattern "${inst.pattern}"`);
  const content = opts.adversarial && inst.adversarial ? { ...inst.slots, ...inst.adversarial }
    : opts.alternate && inst.alternate ? { ...inst.slots, ...inst.alternate.slots } : inst.slots;
  const figSlot = {};
  const aspectOf = (key) => {
    const d = FIGS[key].figure.domain;
    return classOf((d.yMax - d.yMin) / (d.xMax - d.xMin), BANDS);
  };
  /* THE ONLY THING THE MEDIA IS ALLOWED TO SAY: what it NEEDS, never what it would like. */
  const needOf = (key) => (CAP[key] && CAP[key].minLegibleWidth) || 0;
  /* THE MEDIA'S ASPECT CLASS IS THE ONLY THING BESIDES THE SURFACE THAT MAY SELECT A SUBDESIGN. */
  let aspect = null;
  const flat = (c) => !c ? [] : Array.isArray(c) ? c : c.items.flatMap((i) => i.blocks);
  for (const s of p.slots) for (const b of flat(content[s.name])) if (b.figure && !aspect) aspect = aspectOf(b.figure);
  if (!aspect) aspect = 'none';
  let need = 0;
  for (const sl of p.slots) for (const b of flat(content[sl.name])) if (b.figure) need = Math.max(need, needOf(b.figure));
  const chosen = pick(p, surface, aspect, need);
  const d0 = chosen.d;
  const filled = (c) => c && (Array.isArray(c) ? c.length > 0 : true);
  const absent = new Set(p.slots.filter((s) => s.occupancy === 'optional-collapse' && !filled(content[s.name])).map((s) => s.name));
  const d = absent.size ? { ...d0, areas: collapseRows(d0.areas, absent) } : d0;
  const spans = areaSpans(d.areas);

  const parts = [], present = [];
  for (const s of p.slots) {
    const before = FIGREQ.length;
    const m = slotMarkup(p, s, content[s.name], { surface, noPane: !!d.noPane, area: spans[s.name] });
    for (const k of FIGREQ.slice(before)) figSlot[k] = s.name;
    if (m == null) {
      if (s.occupancy === 'required') throw new PatternError(`${p.id}: required slot "${s.name}" has no blocks on page ${page.n}`);
      if (s.occupancy === 'optional-reserved' && spans[s.name])
        parts.push(`<div data-slot="${esc(s.name)}" data-slot-type="${esc(s.slotType)}" data-occupancy="${esc(s.occupancy)}" data-reserved></div>`);
      continue;
    }
    if (!spans[s.name]) throw new PatternError(`${p.id}/${d.id}: slot "${s.name}" has content but no area in this subdesign`);
    parts.push(m); present.push(s.name);
  }
  /* a slot with no content and no area is simply absent — the approved no-X subdesign handles it */
  for (const name of Object.keys(spans)) {
    const s = p.slots.find((x) => x.name === name);
    if (!present.includes(name) && s.occupancy === 'required')
      throw new PatternError(`${p.id}/${d.id}: "${name}" is laid out but was never filled`);
  }
  const widths = {};
  for (const [name, o] of Object.entries(spans)) widths[name] = +span(surface, o.cols).toFixed(2);
  const figW = {};
  for (const [k, name] of Object.entries(figSlot)) figW[k] = widths[name];
  const without = [...absent].join(' ');
  return { pattern: p, subdesign: d, aspect, absent, spans, widths, figW, need, chosen,
    body: (i) => `<div data-pattern="${esc(p.id)}" data-subdesign="${esc(d.id)}" data-inst="${i}"`
      + (without ? ` data-without="${esc(without)}"` : '') + `>\n${parts.join('\n')}\n</div>` };
}

/* ── THE SHELL · what holds patterns, and is not one ───────────────────────────────────────────
   Five of the catalogue's records assumed a page title no pattern owned, and the lesson's whole top
   level is a tab strip over four subtopics whose Symmetry panel is two DIFFERENT PATTERNS. Neither
   had an owner. THE SHELL IS NOT AN EIGHTH PATTERN: it carries no slots and no grid areas of its
   own — it owns the title, the strips, and which panel is open, and every panel holds patterns. */
function buildPage(page, surface, opts = {}) {
  const inst = [];
  const sel = (opts.state && opts.state.sel) || page.tabs || {};
  const walk = (node, group, path = {}) => {
    if (Array.isArray(node)) return node.map((x) => {
      const b = buildInstance(x, page, surface, opts);
      /* WHICH PANEL PATH HOLDS THIS INSTANCE, so the caption can name what is actually on screen and
         a control can assert that a closed panel contributes no measured pattern. */
      b.path = { ...path };
      b.shown = Object.entries(b.path).every(([g, v]) => sel[g] === v);
      inst.push(b);
      return b.body(inst.length - 1);
    }).join('\n');
    const sh = SHELLS[node.shell];
    if (!sh) throw new PatternError(`page ${page.n}: no shell "${node.shell}"`);
    const gid = `${page.n}-${group}`;
    return `<section class="cp-shell" data-shell="${esc(node.shell)}" data-tabs="${esc(group)}" `
      + `data-tabs-kind="${esc(sh.kind)}">`
      + `<div class="cp-tabbar" role="tablist" aria-label="${esc(node.label || sh.label)}">`
      + node.items.map((i) => `<button class="cp-tab" type="button" role="tab" id="${gid}-t-${slug(i.label)}" `
          + `aria-controls="${gid}-p-${slug(i.label)}" data-tab="${slug(i.label)}">${t(i.label)}</button>`).join('')
      + `</div>`
      + node.items.map((i) => `<div class="cp-panel" role="tabpanel" id="${gid}-p-${slug(i.label)}" `
          + `aria-labelledby="${gid}-t-${slug(i.label)}" data-panel="${slug(i.label)}">`
          + (i.lede ? `<p class="cp-tabnote">${t(i.lede)}</p>` : '')
          + walk(i.body, slug(i.label), { ...path, [group]: slug(i.label) }) + `</div>`).join('')
      + `</section>`;
  };
  const body = page.shell ? walk(page, 'topic', {})
    : (() => { const b = buildInstance(page, page, surface, opts); inst.push(b); return b.body(0); })();
  return { instances: inst, body };
}

/* the leaf states a shell declares — enumerated FROM THE TREE, never listed by hand, so a panel
   cannot exist without a render that opens it */
function statesOf(node, group = 'topic') {
  if (Array.isArray(node) || !node.shell) return [{ key: '', sel: {} }];
  return node.items.flatMap((i) => statesOf(i.body, slug(i.label)).map((st) => ({
    key: st.key ? `${slug(i.label)}-${st.key}` : slug(i.label),
    sel: { [group]: slug(i.label), ...st.sel } })));
}
function groupsOf(node, group = 'topic', out = []) {
  if (Array.isArray(node) || !node.shell) return out;
  out.push({ name: group, kind: SHELLS[node.shell].kind, panels: node.items.map((i) => slug(i.label)) });
  for (const i of node.items) groupsOf(i.body, slug(i.label), out);
  return out;
}

/* the slot diagram — drawn from the SAME areas that lay the page out, so it can never illustrate
   something the page does not do */
function diagram(d, surface) {
  const cells = d.areas.map((r) => {
    const toks = r.trim().split(/\s+/), out = [];
    for (let i = 0; i < toks.length;) {
      let j = i; while (j < toks.length && toks[j] === toks[i]) j++;
      const n = j - i;
      out.push(toks[i] === '.'
        ? `<span class="cp-dcell" data-empty style="grid-column:span ${n}">${n > 1 ? n + ' unused' : ''}</span>`
        : `<span class="cp-dcell" style="grid-column:span ${n}">${esc(toks[i])} · ${n}</span>`);
      i = j;
    }
    return out.join('');
  }).join('');
  return `<div class="cp-diagram"><p class="cp-lab cp-dlab">${esc(d.id)} · ${surface} · `
    + `${GRID.surfaces[surface].columns} columns</p><div class="cp-dgrid">${cells}</div></div>`;
}

/* ── render ───────────────────────────────────────────────────────────────────────────────────── */
const MIME = { '.html': 'text/html', '.json': 'application/json', '.woff2': 'font/woff2', '.png': 'image/png', '.svg': 'image/svg+xml' };
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
if (!/\.mx-figskin\.tp-slide/.test(APP_CSS)) throw new Error('the lifted stylesheet is missing the figure token mapping');

validate();
console.log(`catalogue · ${Object.keys(PATTERNS).filter((k) => !k.startsWith('_')).length} patterns, `
  + `${Object.values(PATTERNS).filter((p) => p.slots).reduce((n, p) => n + p.subdesigns.length, 0)} approved subdesigns — all areas rows and reading measures check out`);

const figPage = await openFigurePage(browser, base);
const paint = makePainter(figPage);
const { boxForWidth } = makeSolvers(paint);
/* WHAT EACH FIGURE REPORTS ABOUT ITSELF, measured once, before any layout decision exists. */
const CAP = {};
{
  const want = new Set();
  const scan = (n) => { if (!n || typeof n !== 'object') return;
    if (Array.isArray(n)) return n.forEach(scan);
    if (n.figure && typeof n.figure === 'string') want.add(n.figure);
    Object.values(n).forEach(scan); };
  scan(PAGES);
  console.log('\nmedia capability — what each figure reports about ITSELF, measured by painting');
  for (const k of [...want].sort()) {
    if (!FIGS[k]) throw new Error(`no figure "${k}"`);
    CAP[k] = await capability(paint, k, FIGS[k].figure);
    console.log(`  ${k.padEnd(12)} aspect ${String(CAP[k].aspect).padStart(6)} · minimum legible width `
      + `${String(CAP[k].minLegibleWidth).padStart(4)}px · equal unit scale required · focus available`);
  }
}
/* THE SLOT GIVES THE WIDTH AND THE MEDIA ANSWERS. One solve per (figure, slot width); memoised,
   because the same figure in the same slot on two pages is the same question. */
const BOX = new Map();
async function boxFor(key, w) {
  const ck = `${key}|${w}`;
  if (BOX.has(ck)) return BOX.get(ck);
  const b = await boxForWidth(key, FIGS[key].figure, Math.round(w));
  if (!b) throw new Error(`${key}: no box at all fits a ${w}px slot`);
  if (!square(b.box)) throw new Error(`${key}: no height in a ${w}px slot paints this domain at equal `
    + `unit scale (best ${b.box.w}x${b.box.h} at ${b.box.ratio})`);
  if (b.box.w < Math.round(w) - 1) throw new Error(`${key}: solved to ${b.box.w}px against a ${w}px slot`);
  BOX.set(ck, b.box);
  return b.box;
}
const skin = (w, h, html) => `<div class="mx-part" data-mx-part="figure" data-fig-viewport `
  + `style="position:relative;width:${w}px;height:${h}px"><div class="mx-figstage">`
  + `<div class="mx-figskin tp-slide">${html}</div></div></div>`;

const tokens = (s) => {
  const g = GRID.surfaces[s];
  return `:root{--cp-surface:${g.width}px;--cp-pad:${g.pad}px;--cp-pad-y:${s === 'phone' ? 22 : s === 'tablet' ? 26 : 32}px;`
    + `--cp-frame:${s === 'phone' ? 12 : s === 'tablet' ? 20 : 30}px;--cp-cols:${g.columns};--cp-gut:${g.gutter}px;`
    + `--cp-measure:${GRID.readingMeasure.px}px;--cp-pad-h:${s === 'phone' ? 360 : 480}px;--cp-pane-h:460px;}`;
};

async function shot(name, page, surface, opts = {}) {
  const g = GRID.surfaces[surface];
  const built = buildPage(page, surface, opts);
  let body = built.body;
  /* every figure across every instance: the slot that holds it gave it its width */
  const figW = Object.assign({}, ...built.instances.map((b) => b.figW));
  for (const [key, w] of Object.entries(figW)) {
    const box = await boxFor(key, w);
    body = body.split(`{{FIG:${key}}}`).join(skin(box.w, box.h, box.html));
  }
  if (/\{\{FIG:/.test(body)) throw new Error(`${name}: an unresolved figure placeholder survived`);

  const doc = `<!doctype html><html data-theme="mathematics"><head><meta charset="utf-8"><style>
${APP_CSS}
</style><style>
${tokens(surface)}
${CSS_KIT}
${areasCSS(surface)}
</style></head><body class="mx cp-${surface}"><div class="cp-page">
<div class="cp-cap"><span class="cp-tpl">${esc(page.shell ? 'shell.' + page.shell : page.pattern)}${opts.state && opts.state.key ? ' · ' + esc(opts.state.key) : ''} · ${built.instances.filter((b) => b.shown !== false).map((b) => esc(b.pattern.id + '/' + b.subdesign.id)).join(' + ')}${page.shell ? ` · ${built.instances.length} patterns in the shell` : ''} · ${surface} ${g.width}px · ${g.columns} columns${opts.adversarial ? ' · ADVERSARIAL PAYLOAD' : ''}</span>${esc(page.c)}</div>
${opts.diagram && !page.shell ? diagram(built.instances[0].subdesign, surface) : ''}
<div class="cp-surface">
<h1 class="cp-h1">${t(page.title)}</h1>${page.lede ? `<p class="cp-lede">${t(page.lede)}</p>` : ''}
<div class="cp-rule"></div>
${body}
</div>
<div class="cp-note">${page.shell ? 'The shell holds the strips and the title; it owns no slots and no grid. ' : ''}The pattern${built.instances.length > 1 ? 's were' : ' was'} authored; the renderer chose only which APPROVED SUBDESIGN to use — from the ${g.width}px surface${built.instances.some((b) => b.aspect) ? ` and the media's aspect class` : ''} and nothing else. Slots take their geometry from the master grid; the media takes its width from its slot. Height is auto and the page scrolls.</div>
</div></body></html>`;

  const p = await browser.newPage({ viewport: { width: g.width + 2 * g.pad + 120, height: 900 }, deviceScaleFactor: 2 });
  const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
  await p.setContent(doc, { waitUntil: 'load' });

  /* THE ONLY THING STAMPED, AND IT READS NO CONTENT: the authored tab selection. Nothing here can
     add, remove or reorder a tab, and no width is consulted. */
  await p.evaluate((sel) => {
    for (const g2 of document.querySelectorAll('[data-tabs]')) {
      const want = sel[g2.getAttribute('data-tabs')];
      const has = [].slice.call(g2.querySelectorAll(':scope > .cp-tabbar > .cp-tab')).map((b2) => b2.getAttribute('data-tab'));
      const active = has.includes(want) ? want : has[0];
      g2.setAttribute('data-active', active);
      for (const b of g2.querySelectorAll(':scope > .cp-tabbar > .cp-tab')) {
        const on = b.getAttribute('data-tab') === active;
        if (on) b.setAttribute('data-on', ''); else b.removeAttribute('data-on');
        b.setAttribute('aria-selected', on ? 'true' : 'false');
        b.setAttribute('tabindex', on ? '0' : '-1');
      }
      for (const q of g2.querySelectorAll(':scope > .cp-panel'))
        if (q.getAttribute('data-panel') === active) q.setAttribute('data-shown', ''); else q.removeAttribute('data-shown');
      const bar = g2.querySelector(':scope > .cp-tabbar'), on = bar.querySelector('.cp-tab[data-on]');
      if (on && bar.scrollWidth > bar.clientWidth) {
        const l = on.offsetLeft, r = l + on.offsetWidth;
        if (l < bar.scrollLeft) bar.scrollLeft = l;
        else if (r > bar.scrollLeft + bar.clientWidth) bar.scrollLeft = r - bar.clientWidth;
      }
    }
    /* a local-x region that happens to fit needs no fade — the affordance is for real overflow */
    for (const el of document.querySelectorAll('[data-scroll-x="local"]'))
      if (el.scrollWidth <= el.clientWidth + 1) el.setAttribute('data-fits', '');
  }, (opts.state && opts.state.sel) || page.tabs || {});
  await p.waitForTimeout(320);

  const m = await p.evaluate(({ measure, gridLines, gut }) => {
    const vis = (el) => el.getClientRects().length > 0;
    /* ONE MEASUREMENT PER VISIBLE PATTERN INSTANCE. A shell page holds several, and a closed panel
       holds none — a hidden thing cannot be measured, and the state loop opens every panel. */
    const near = (x) => gridLines.some((l) => Math.abs(l - x) <= 1.5);
    const grids = [].slice.call(document.querySelectorAll('[data-pattern]')).filter(vis).map((grid) => {
      const gb = grid.getBoundingClientRect();
      const slots = [].slice.call(grid.querySelectorAll(':scope > [data-slot]')).map((el) => {
        const r = el.getBoundingClientRect();
        const kids = [].slice.call(el.children).filter((c) => vis(c) && !c.classList.contains('cp-lab'));
        const plane = el.querySelector('[data-mx-part="figure"]');
        return { name: el.getAttribute('data-slot'), type: el.getAttribute('data-slot-type'),
          occupancy: el.getAttribute('data-occupancy'), reserved: el.hasAttribute('data-reserved'),
          visible: vis(el), w: +(r.width).toFixed(2), h: Math.round(r.height),
          top: +(r.top - gb.top).toFixed(1), bottom: +(r.bottom - gb.top).toFixed(1),
          left: +(r.left - gb.left).toFixed(2), right: +(r.right - gb.left).toFixed(2),
          filled: kids.length > 0, plane: plane ? +plane.getBoundingClientRect().width.toFixed(2) : null };
      });
      return { inst: +grid.getAttribute('data-inst'), pattern: grid.getAttribute('data-pattern'),
        subdesign: grid.getAttribute('data-subdesign'), gridW: +gb.width.toFixed(2), slots,
        offGrid: slots.filter((x) => x.visible && !(near(x.left) && near(x.right)))
          .map((x) => `${x.name} ${x.left}→${x.right}`) };
    });
    /* PX PER DOMAIN UNIT ON EACH AXIS, read off the painted tick labels. The media declares whether
       it REQUIRES equal unit scale; this is how both the control and the inspector see what it got. */
    const unitScale = (svg) => {
      const vb = (svg.getAttribute('viewBox') || '0 0 1 1').split(/\s+/).map(Number);
      const rect = svg.getBoundingClientRect();
      const labs = [].slice.call(svg.querySelectorAll('.tp-fig-ticklabel'));
      const val = (x) => parseFloat(x.textContent.replace('−', '-'));
      const per = (a, at) => { const z = labs.filter((x) => x.getAttribute('text-anchor') === a)
          .map((x) => ({ v: val(x), px: +x.getAttribute(at) })).filter((o) => isFinite(o.v));
        if (z.length < 2) return null; z.sort((i, j) => i.v - j.v);
        const dd = z[z.length - 1].v - z[0].v; return dd ? Math.abs((z[z.length - 1].px - z[0].px) / dd) : null; };
      const ux = per('middle', 'x'), uy = per('end', 'y');
      if (!ux || !uy) return null;
      const x = ux * rect.width / vb[2], y = uy * rect.height / vb[3];
      return { x: +x.toFixed(2), y: +y.toFixed(2), ratio: +(x / y).toFixed(3) };
    };
    const figs = [].slice.call(document.querySelectorAll('.tp-fig-svg')).filter(vis)
      .map((svg) => ({ ratio: (unitScale(svg) || { ratio: null }).ratio }));
    /* THE SLOT INSPECTOR, MEASURED. Every media slot on the page: what the pattern granted it, what
       the browser actually painted in it, and how much width inside it nobody claimed. The numbers
       are gathered here and JUDGED IN NODE, so what the build refuses and what the overlay draws
       cannot drift apart. */
    const media = [].slice.call(document.querySelectorAll('[data-media-slot]')).filter(vis).map((el) => {
      const r = el.getBoundingClientRect(), own = el.closest('[data-pattern]');
      const kids = [].slice.call(el.children).filter((c) => vis(c) && !c.classList.contains('cp-lab'));
      const plane = el.querySelector('[data-mx-part="figure"]');
      /* what is PAINTED, not what is declared: the plane when there is one, otherwise the widest
         thing the slot actually put on screen */
      const paint = plane || kids.reduce((a, c) =>
        !a || c.getBoundingClientRect().width > a.getBoundingClientRect().width ? c : a, null);
      const pr = paint ? paint.getBoundingClientRect() : null;
      const svg = el.querySelector('.tp-fig-svg');
      return { pattern: own && own.getAttribute('data-pattern'), subdesign: own && own.getAttribute('data-subdesign'),
        inst: own ? +own.getAttribute('data-inst') : 0, name: el.getAttribute('data-slot'),
        cols: el.getAttribute('data-cols'), span: +el.getAttribute('data-span'),
        fit: el.getAttribute('data-fit'), align: el.getAttribute('data-align'),
        kind: plane ? 'plane' : paint ? paint.tagName.toLowerCase() : 'nothing',
        slotW: +r.width.toFixed(2), slotH: Math.round(r.height),
        paintedW: pr ? +pr.width.toFixed(2) : null, paintedH: pr ? Math.round(pr.height) : null,
        freeL: pr ? +(pr.left - r.left).toFixed(2) : null, freeR: pr ? +(r.right - pr.right).toFixed(2) : null,
        scale: svg ? unitScale(svg) : null };
    });
    const wide = [].slice.call(document.querySelectorAll('.cp-prose p, .cp-st, .cp-key p, .cp-qitem p, .cp-lede, .cp-tabnote, .cp-figcap'))
      .filter((n) => vis(n) && !n.closest('[data-scroll-x="local"]'))
      .map((n) => ({ w: Math.round(n.getBoundingClientRect().width), s: n.textContent.slice(0, 44) }))
      .filter((n) => n.w > measure + 1);
    const scrollers = { y: [], x: [] };
    for (const el of document.querySelectorAll('.cp-surface *')) {
      if (!vis(el)) continue;
      const cs = getComputedStyle(el), dx = el.getAttribute('data-scroll-x'), dy = el.getAttribute('data-scroll-y');
      const tabbar = el.classList.contains('cp-tabbar');
      if (/^(auto|scroll)$/.test(cs.overflowY) && dx !== 'local' && !tabbar) {
        const own = el.closest('[data-pattern]');
        scrollers.y.push({ declared: dy || 'undeclared', over: el.scrollHeight > el.clientHeight + 1,
          pattern: own ? own.getAttribute('data-pattern') : null });
      }
      if (/^(auto|scroll)$/.test(cs.overflowX) && dy !== 'pane') scrollers.x.push({ declared: tabbar ? 'tabstrip' : dx,
        w: Math.round(el.getBoundingClientRect().width), sw: el.scrollWidth });
    }
    const tabs = [].slice.call(document.querySelectorAll('[data-tabs]')).filter(vis).map((x) => {
      const bar = x.querySelector(':scope > .cp-tabbar'), on = bar.querySelector('.cp-tab[data-on]');
      const br = bar.getBoundingClientRect(), orc = on ? on.getBoundingClientRect() : null;
      const own = x.closest('[data-pattern]');
      let depth = 0; for (let q = x.parentElement; q; q = q.parentElement) if (q.hasAttribute('data-tabs')) depth++;
      return { kind: x.getAttribute('data-tabs-kind'), depth,
        shell: x.hasAttribute('data-shell'), pattern: own ? own.getAttribute('data-pattern') : null,
        sig: [getComputedStyle(bar).borderBottomWidth, getComputedStyle(bar).borderRadius,
              on ? getComputedStyle(on).backgroundColor : 'none',
              on ? getComputedStyle(on).borderBottomWidth : 'none'].join('/'),
        rows: new Set([].slice.call(bar.querySelectorAll('.cp-tab')).map((b) => b.offsetTop)).size,
        activeWhole: !orc || (orc.left >= br.left - 1 && orc.right <= br.right + 1),
        roles: bar.getAttribute('role') === 'tablist'
          && [].slice.call(bar.querySelectorAll('.cp-tab')).every((b) => b.getAttribute('role') === 'tab' && b.hasAttribute('aria-controls'))
          && [].slice.call(x.querySelectorAll(':scope > .cp-panel')).every((q) => q.getAttribute('role') === 'tabpanel' && q.hasAttribute('aria-labelledby')),
        roving: [].slice.call(bar.querySelectorAll('.cp-tab')).filter((b) => b.getAttribute('tabindex') === '0').length === 1 };
    });
    const pg = document.querySelector('.cp-page');
    /* WHICH element overflows, not merely that one does — the previous version of this control was
       right and useless, and cost an hour of guessing. */
    const pgr = pg.getBoundingClientRect();
    const over = [].slice.call(pg.querySelectorAll('*')).filter(vis).map((el) => {
      const q = el.getBoundingClientRect();
      return { d: +(q.right - pgr.right).toFixed(1), el: (el.tagName + '.' + (el.className || '')).slice(0, 60),
        w: Math.round(q.width) };
    }).filter((x) => x.d > 0.5).sort((a, b) => b.d - a.d).slice(0, 3);
    const frame = ['html', 'body', '.cp-page', '.cp-surface'].map((s) => {
      const el = document.querySelector(s), cs = getComputedStyle(el);
      return { s, maxHeight: cs.maxHeight, overflowY: cs.overflowY };
    });
    /* THE AUTHORED TAB STRUCTURE, read back out of the DOM: depth, kind, group, labels, panels.
       Compared character for character across every width and every state. */
    const tabSig = [].slice.call(document.querySelectorAll('[data-tabs]')).map((x) => {
      let d = 0; for (let q = x.parentElement; q; q = q.parentElement) if (q.hasAttribute('data-tabs')) d++;
      const labels = [].slice.call(x.querySelectorAll(':scope > .cp-tabbar > .cp-tab')).map((b) => b.textContent.replace(/\s+/g, ' ').trim());
      const panels = [].slice.call(x.querySelectorAll(':scope > .cp-panel')).map((b) => b.getAttribute('data-panel'));
      return `${d}:${x.getAttribute('data-tabs-kind')}:${x.getAttribute('data-tabs')}[${labels.join('|')}]{${panels.join('|')}}`;
    }).join(' ; ');
    return { grids, figs, media, wide, scrollers, tabs, frame, over, tabSig,
      clip: { sw: pg.scrollWidth, cw: pg.clientWidth },
      docH: Math.round(document.documentElement.scrollHeight),
      docW: Math.round(document.documentElement.scrollWidth),
      docCW: Math.round(document.documentElement.clientWidth),
      payload: document.querySelector('.cp-surface').innerText.replace(/\s+/g, ' ').trim().length };
  }, { measure: GRID.readingMeasure.px, gridLines: lines(surface), gut: g.gutter });

  if (!opts.noShot) {
    const bb = await (await p.$('.cp-page')).boundingBox();
    await p.setViewportSize({ width: g.width + 2 * g.pad + 120, height: Math.ceil(bb.height) + 8 });
    await p.waitForTimeout(140);
    await (await p.$('.cp-page')).screenshot({ path: path.join(OUT, name + '.png') });
    /* THE SLOT INSPECTOR, DRAWN. The same numbers the control judges, over the render they came
       from: the slot the pattern granted, the media actually painted inside it, and any width in
       between that nobody claimed. The judgement is made in node and passed in — the overlay never
       measures anything itself, so the picture cannot say one thing while the build says another. */
    if (!NO_INSPECT && m.media.length && (INSPECT_ALL || surface === 'desktop')) {
      const cards = m.media.map((x) => {
        const pat = PATTERNS[x.pattern];
        const fit = slotFit(x, surface, pat);
        return { slot: x.name, inst: x.inst, ok: fit.ok, free: [x.freeL, x.freeR],
          lines: inspectorLines(x, surface, pat, fit) };
      });
      await p.evaluate(drawInspector, cards);
      const bb2 = await (await p.$('.cp-page')).boundingBox();
      await p.setViewportSize({ width: g.width + 2 * g.pad + 120, height: Math.ceil(bb2.height) + 8 });
      await p.waitForTimeout(120);
      await (await p.$('.cp-page')).screenshot({ path: path.join(OUT, name + '-inspect.png') });
    }
  }
  if (errs.length) throw new Error(`${name}: ${errs[0]}`);
  await p.close();
  return { m, built, surface, g };
}

/* ── THE SLOT INSPECTOR ────────────────────────────────────────────────────────
   "What pattern is this?" and "is the media actually inhabiting its slot well?" are different
   questions, and only the first had an answer. ONE function answers the second, and BOTH the
   control that fails the build and the overlay you look at read it — so what the build refuses and
   what the picture says can never drift apart.

   IT IS NOT AN OCCUPANCY RESOLVER. Nothing it computes reaches layout, and there is no threshold at
   which it changes a span. Every verdict is categorical: `fill` means the media consumes the slot
   width, `contain` means it may be smaller but must be deliberately placed, and anything else
   inside a media slot is SLOT RESIDUE — the third kind of whitespace, the illegal one. */
const TOLPX = 1.5;

function slotFit(x, surface, p) {
  const o = { ok: true, verdict: '', actions: [], notes: [] };
  if (x.paintedW == null) {
    o.ok = false; o.verdict = 'the slot is painted and holds nothing';
    o.actions = ['fill it, or give the pattern an approved subdesign without it'];
    return o;
  }
  o.unclaimed = +(x.slotW - x.paintedW).toFixed(2);
  const spans = approvedSpans(p, surface).map((n) => `${n} = ${spanPx(surface, n)}px`).join(' · ') || 'none declared';
  if (x.fit === 'fill') {
    if (o.unclaimed > TOLPX) {
      o.ok = false;
      o.verdict = `a \`fill\` media painted ${x.paintedW}px inside a ${x.slotW}px slot`;
      o.actions = [
        'paint the media at the slot width — under `fit: fill` the slot gives the width and the media takes it',
        `approve a narrower span for this aspect class (approved at ${surface}: ${spans})`,
        'declare the slot `fit: contain` and centre it, if being smaller than the slot is a design decision',
      ];
    } else o.verdict = 'the media consumes the slot width';
  } else if (x.fit === 'contain') {
    if (o.unclaimed <= TOLPX) o.verdict = 'contained, and it happens to reach both edges';
    else if (x.align === 'center' && Math.abs(x.freeL - x.freeR) <= TOLPX) o.verdict = `contained and centred — ${x.freeL}px either side`;
    else if (x.align === 'start' && x.freeL <= TOLPX) o.verdict = `contained at the start — ${x.freeR}px after it`;
    else {
      o.ok = false;
      o.verdict = `a \`contain\` media declared \`${x.align}\` sits ${x.freeL}px from the slot's left edge and ${x.freeR}px from its right`;
      o.actions = [
        'centre it — a contained object that is neither centred nor deliberately start-aligned is stranded',
        'give the slot an explicit design reason to be start-aligned, declared on the slot',
        `approve a narrower span for this aspect class (approved at ${surface}: ${spans})`,
      ];
    }
    /* A SIGNAL, NOT A RESOLVER. It changes nothing; it says what a human should rule on. */
    if (o.ok && x.paintedW < x.slotW * 0.6)
      o.notes.push(`occupies ${Math.round(100 * x.paintedW / x.slotW)}% of its slot — if that is the usual case here, `
        + 'the evidence says the PATTERN wants a smaller span, not that the media should grow');
  } else {
    o.ok = false; o.verdict = `a media slot with no declared fit (\`${x.fit}\`)`;
    o.actions = ['declare `fit: fill` or `fit: contain` on the slot in patterns.json'];
  }
  return o;
}

/* THE CONTRACT IS ENFORCED ON EVERY RENDER; only the PICTURE is selective. Desktop by default,
   because that is where a slot can be wider than its media — at tablet and phone every approved
   media span is the whole surface, so the overlay there would be 26 more megabytes of "it fills".
   CP_INSPECT=all draws every surface (what the slot-fit atlas will want); CP_NO_INSPECT=1 draws none. */
const NO_INSPECT = !!process.env.CP_NO_INSPECT;
const INSPECT_ALL = process.env.CP_INSPECT === 'all';

/* runs IN THE PAGE. It receives finished text and draws; it computes no verdict of its own. */
function drawInspector(cards) {
  const page = document.querySelector('.cp-page');
  page.setAttribute('data-inspect', '');
  const st = document.createElement('style');
  st.textContent = `
    .cp-page[data-inspect]{position:relative;}
    .ins-layer{position:absolute;inset:0;pointer-events:none;z-index:50;}
    .ins-slot{position:absolute;outline:2px dashed #2563eb;outline-offset:0;background:rgba(37,99,235,.045);}
    .ins-paint{position:absolute;outline:2px solid #059669;}
    .ins-paint[data-bad]{outline-color:#dc2626;}
    .ins-res{position:absolute;background:repeating-linear-gradient(45deg,rgba(220,38,38,.30) 0 6px,rgba(220,38,38,.06) 6px 12px);
      outline:1px solid rgba(220,38,38,.55);}
    .ins-res[data-legal]{background:repeating-linear-gradient(45deg,rgba(37,99,235,.16) 0 6px,rgba(37,99,235,.03) 6px 12px);
      outline-color:rgba(37,99,235,.45);}
    .ins-tag{position:absolute;font:600 10px/1.5 ui-monospace,Menlo,monospace;letter-spacing:.04em;
      background:#2563eb;color:#fff;padding:1px 6px;border-radius:0 0 3px 0;}
    .ins-tag[data-bad]{background:#dc2626;}
    .ins-panel{margin:18px 0 0;border:2px solid #111;background:#fff;}
    .ins-card{border-top:1px solid #d4d4d4;padding:10px 14px;font:12px/1.65 ui-monospace,Menlo,monospace;}
    .ins-card:first-child{border-top:0;}
    .ins-card b{display:inline-block;width:206px;vertical-align:top;color:#525252;font-weight:600;}
    .ins-card i{font-style:normal;color:#111;}
    .ins-h{background:#111;color:#fff;padding:6px 14px;font:600 11px/1.6 ui-monospace,Menlo,monospace;letter-spacing:.08em;}
    .ins-card[data-bad] b{color:#dc2626;}`;
  document.head.appendChild(st);

  const layer = document.createElement('div');
  layer.className = 'ins-layer';
  page.appendChild(layer);
  const pr = page.getBoundingClientRect();
  const box = (cls, r, extra) => {
    const el = document.createElement('div');
    el.className = cls;
    el.style.left = (r.left - pr.left) + 'px'; el.style.top = (r.top - pr.top) + 'px';
    el.style.width = r.width + 'px'; el.style.height = r.height + 'px';
    if (extra) for (const k in extra) el.setAttribute(k, extra[k]);
    layer.appendChild(el); return el;
  };
  const slots = [].slice.call(document.querySelectorAll('[data-media-slot]'));
  cards.forEach((c) => {
    const el = slots.filter((q) => {
      const own = q.closest('[data-pattern]');
      return q.getAttribute('data-slot') === c.slot && (own ? +own.getAttribute('data-inst') : 0) === c.inst;
    })[0];
    if (!el || !el.getClientRects().length) return;
    const sr = el.getBoundingClientRect();
    box('ins-slot', sr);
    const plane = el.querySelector('[data-mx-part="figure"]')
      || [].slice.call(el.children).filter((x) => !x.classList.contains('cp-lab'))[0];
    if (plane) {
      const q = plane.getBoundingClientRect();
      box('ins-paint', q, c.ok ? null : { 'data-bad': '' });
      /* the unclaimed width, drawn where it actually is. Hatched blue where the slot declared it
         (a centred `contain`), hatched red where nobody did. */
      const legal = c.ok ? { 'data-legal': '' } : null;
      if (q.left - sr.left > 1.5) box('ins-res', { left: sr.left, top: q.top, width: q.left - sr.left, height: q.height }, legal);
      if (sr.right - q.right > 1.5) box('ins-res', { left: q.right, top: q.top, width: sr.right - q.right, height: q.height }, legal);
    }
    const tag = document.createElement('div');
    tag.className = 'ins-tag'; tag.textContent = c.slot.toUpperCase() + ' SLOT';
    if (!c.ok) tag.setAttribute('data-bad', '');
    tag.style.left = (sr.left - pr.left) + 'px'; tag.style.top = (sr.top - pr.top) + 'px';
    layer.appendChild(tag);
  });

  const panel = document.createElement('div');
  panel.className = 'ins-panel';
  panel.innerHTML = '<div class="ins-h">SLOT INSPECTOR</div>' + cards.map((c) =>
    `<div class="ins-card"${c.ok ? '' : ' data-bad'}>` + c.lines.map(([k, v]) =>
      `<div><b>${k}</b><i>${String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;')}</i></div>`).join('') + '</div>').join('');
  page.appendChild(panel);
}

/* what the overlay prints, and what a failure prints — the same lines from the same numbers */
function inspectorLines(x, surface, p, fit) {
  const g = GRID.surfaces[surface];
  const L = [
    ['PATTERN', x.pattern],
    ['SUBDESIGN', `${x.subdesign} · approved for ${surface}`],
    ['MASTER GRID', `${surface} · ${g.columns} col · ${g.width}px · column ${colW(surface).toFixed(2)}px · gutter ${g.gutter}px`],
    ['MEDIA SLOT', `${x.name} · columns ${x.cols} of ${g.columns} · span ${x.span} = ${spanPx(surface, x.span)}px · painted ${x.slotW}px`],
    ['PAINTED MEDIA', x.paintedW == null ? 'nothing' : `${x.kind} · ${x.paintedW} × ${x.paintedH}px`],
    ['FIT', `${x.fit} — ${VOCAB.mediaFit[x.fit] ? VOCAB.mediaFit[x.fit].means : 'undeclared'}`],
    ['ALIGNMENT', x.align || '—'],
    ['ASPECT-SCALE', x.scale ? `${x.scale.x}px per x-unit · ${x.scale.y}px per y-unit · ratio ${x.scale.ratio}`
      + (Math.abs(x.scale.ratio - 1) <= 0.01 ? ' ✓ equal' : ' ✗ NOT EQUAL') : 'not a plane'],
    ['UNCLAIMED INTERNAL WIDTH', `${fit.unclaimed == null ? '—' : fit.unclaimed + 'px'}`
      + (fit.ok ? ' ✓' : ' ✗ SLOT RESIDUE')],
  ];
  if (!fit.ok) L.push(['DIAGNOSIS', fit.verdict]);
  else L.push(['VERDICT', fit.verdict]);
  for (const n of fit.notes) L.push(['SIGNAL', n]);
  if (!fit.ok) fit.actions.forEach((a, i2) => L.push([i2 ? '' : 'LEGAL ACTIONS', '· ' + a]));
  return L;
}

/* ── the controls ─────────────────────────────────────────────────────────────────────────────── */
const LIVE = { localX: [], pane: [], reserved: [], collapse: [], fit: [], signal: [], rendered: new Set() };
/* WHAT A RENDER IS, for reporting and for the adversarial comparison: every visible pattern, its
   subdesign, and every slot's width. A shell page has several; a plain page has one. */
const sig = (m) => m.grids.map((G) => `${G.pattern}/${G.subdesign}{`
  + G.slots.filter((x) => x.visible).map((x) => `${x.name}:${x.w}`).join('|') + '}').join(' + ');
const AFFORD = {};
function verify(name, page, r) {
  const { m, built, surface } = r;
  if (!m.grids.length) throw new Error(`${name}: no pattern is painted on this page`);
  /* CONTROL · A CLOSED PANEL CONTRIBUTES NOTHING. Exactly the instances the authored selection opens
     are measured — a hidden panel that still occupies layout would make the strip a decoration. */
  {
    const open = built.instances.filter((b) => b.shown !== false).length;
    if (m.grids.length !== open)
      throw new Error(`${name}: ${m.grids.length} pattern(s) painted where the authored selection `
        + `opens ${open} — a closed panel is contributing layout`);
  }

  /* EVERY CONTROL BELOW RUNS ONCE PER VISIBLE PATTERN INSTANCE. A shell page holds several — the
     lesson's Symmetry panel holds two different patterns — and a closed panel holds none. */
  for (const G of m.grids) {
    const b = built.instances[G.inst];
    if (!b) throw new Error(`${name}: a painted pattern has no instance record`);
    const p = b.pattern;
    const where = m.grids.length > 1 ? ` [${p.id}]` : '';
    LIVE.rendered.add(`${G.pattern}/${G.subdesign}`);

    /* CONTROL · THE SLOT EDGES LAND ON GRID LINES. This is the whole claim of a master grid, and it
       is the one thing nobody had ever measured: "we use a 12-column grid" is a sentence until every
       painted slot edge is within 1.5px of a column boundary. */
    if (G.offGrid.length)
      throw new Error(`${name}${where}: ${G.offGrid.length} slot edge(s) do not land on the ${surface} grid — ${G.offGrid[0]}`);
    if (Math.abs(G.gridW - GRID.surfaces[surface].width) > 1)
      throw new Error(`${name}${where}: the pattern grid is ${G.gridW}px inside a ${GRID.surfaces[surface].width}px surface`);

    /* CONTROL · THE SLOT IS THE SIZE THE PATTERN GAVE IT, computed from the master grid before any
       content existed. A slot whose painted width disagrees with its column span means something
       downstream is negotiating width, which is the whole failure mode this architecture removes. */
    for (const sl of G.slots) {
      if (!sl.visible) continue;
      const want = b.widths[sl.name];
      if (want == null) throw new Error(`${name}${where}: slot "${sl.name}" is painted but has no area`);
      if (Math.abs(sl.w - want) > 1.5)
        throw new Error(`${name}${where}: slot "${sl.name}" painted ${sl.w}px where its column span is ${want}px`);
    }

    /* CONTROL · NO COLUMN RESIDUE EITHER. A slot can be full and the COLUMN still be empty: put a
       slot in a row below a very tall neighbour and the column above it holds several hundred pixels
       of nothing. The first version of this control watched slots and was blind to it — found by
       looking at a render, which is why the renders are looked at. The fix is a row span in the
       pattern, never a measurement.

       THE THRESHOLD IS A CONTROL, NOT A LAYOUT INPUT. Nothing at render time reads it; it exists so
       a BUILD can tell two unequal siblings apart from a hole. Calibrated on four observed cases: a
       137px leftover under the shorter of two paired cases (ordinary typography, accepted), against
       600px under a question list beside a tall plotting surface, 734px under a reading column
       beside a portrait plane, and 247px above a key idea beside a one-line scenario — all three
       holes, all three fixed in the pattern. */
    {
      const HOLE = 240;
      const vs = G.slots.filter((x) => x.visible).slice().sort((a, b2) => a.top - b2.top);
      for (let x = 0; x < vs.length; x++) for (let y = x + 1; y < vs.length; y++) {
        const a = vs[x], b2 = vs[y];
        if (b2.left >= a.right - 1 || a.left >= b2.right - 1) continue;   // no shared columns
        if (b2.top < a.bottom - 1) continue;                              // same row, or overlapping
        const d2 = b2.top - a.bottom;
        if (d2 > HOLE)
          throw new Error(`${name}${where}: "${b2.name}" starts ${Math.round(d2)}px below "${a.name}" in `
            + `the same columns — that column holds nothing in between, which is residue by the row. `
            + `Span the tall neighbour across both rows instead.`);
        break;
      }
    }

    /* CONTROL · THE SLOT INSPECTOR, ENFORCED. Rule 8 of the graph rules: the build fails if a media
       slot contains anonymous horizontal residue. This is the control that turns "does this look
       finished?" from a judgement made over screenshots into a contract — and when it fails it
       prints the whole inspector, because a number without its slot, its span and its legal actions
       is the kind of right-and-useless message that cost an hour last time. */
    for (const x of m.media.filter((q) => q.inst === G.inst)) {
      const fit = slotFit(x, surface, p);
      const lines2 = inspectorLines(x, surface, p, fit).map(([k, v]) => `    ${k.padEnd(24)} ${v}`).join('\n');
      if (!fit.ok) throw new Error(`${name}${where}: SLOT FIT\n${lines2}`);
      LIVE.fit.push(`${x.pattern}/${x.subdesign} ${x.name} ${x.span}col=${x.slotW}px ${x.fit} → ${x.paintedW}px`);
      for (const n of fit.notes) LIVE.signal.push(`${name}${where}: ${x.name} ${n}`);
    }

    /* CONTROL · NO LAYOUT RESIDUE. A named track that is painted and holds nothing is a defect
       unless the pattern declared that emptiness as part of the composition. */
    for (const sl of G.slots) {
      if (!sl.visible || sl.filled) continue;
      if (sl.occupancy !== 'optional-reserved')
        throw new Error(`${name}${where}: slot "${sl.name}" is painted ${sl.w}x${sl.h}px and holds nothing — `
          + `a track that promises content and has none is layout residue, not whitespace`);
      LIVE.reserved.push(`${name}:${sl.name}`);
    }
    const painted = new Set(G.slots.filter((x) => x.visible).map((x) => x.name));
    for (const sl of p.slots) {
      if (sl.occupancy === 'required' && !painted.has(sl.name))
        throw new Error(`${name}${where}: required slot "${sl.name}" is not painted`);
      if (sl.occupancy === 'optional-collapse' && !painted.has(sl.name)) LIVE.collapse.push(`${name}:${p.id}.${sl.name}`);
    }

    /* CONTROL · MEDIA FILLS ITS SLOT. The plane takes the slot's width; if the two disagree the
       media is being wrapped rather than sized, which is how a thumbnail once passed for a graph. */
    for (const sl of G.slots) {
      if (sl.plane == null) continue;
      if (Math.abs(sl.plane - sl.w) > 1.5)
        throw new Error(`${name}${where}: a ${sl.w}px "${sl.name}" slot holds a ${sl.plane}px plane — `
          + `the media is wrapped, not sized`);
    }
  }

  /* equal unit scale is a property of every painted plane on the page, whichever pattern holds it */
  for (const f of m.figs) {
    if (f.ratio == null) throw new Error(`${name}: a painted plane reported no scale`);
    if (Math.abs(f.ratio - 1) > 0.01)
      throw new Error(`${name}: a plane painted at ${f.ratio} — one x-unit and one y-unit are not the same length`);
  }

  /* CONTROL · PROSE IS MEASURED. */
  if (m.wide.length)
    throw new Error(`${name}: ${m.wide.length} run(s) of prose past the ${GRID.readingMeasure.px}px measure — `
      + `${m.wide[0].w}px: “${m.wide[0].s}…”`);

  /* CONTROL · SCROLL OWNERSHIP IS DECLARED. */
  for (const sc of m.scrollers.y) {
    if (sc.declared !== 'pane') throw new Error(`${name}: a region scrolls vertically without declaring a pane`);
    /* A SHELL INTRODUCES NO SCROLL OF ITS OWN, so a pane outside every pattern is a shell bounding a
       panel — the space-saving move this architecture exists to refuse. */
    if (!sc.pattern) throw new Error(`${name}: a pane scrolls outside every pattern — a shell may not bound a panel`);
    const owner = PATTERNS[sc.pattern];
    if (owner.scrollOwnership !== 'pane')
      throw new Error(`${name}: a pane scrolls in "${sc.pattern}", which declares scrollOwnership ${owner.scrollOwnership}`);
    if (sc.over) LIVE.pane.push(name);
  }
  for (const s of m.scrollers.x) {
    if (s.declared !== 'local' && s.declared !== 'tabstrip')
      throw new Error(`${name}: a region scrolls horizontally without a contract that permits it`);
    if (s.declared === 'local' && s.sw > s.w + 1) LIVE.localX.push(`${name} (${s.sw}px in ${s.w}px)`);
  }
  if (m.docW > m.docCW + 1) throw new Error(`${name}: the page itself scrolls sideways`);
  if (m.clip.sw > m.clip.cw + 1)
    throw new Error(`${name}: the page frame is ${m.clip.cw}px around ${m.clip.sw}px of surface — `
      + `the right-hand edge of every line is being clipped`
      + (m.over.length ? `\n  widest overhang: ` + m.over.map((o) => `${o.el} (${o.w}px, +${o.d})`).join(', ') : ''));
  for (const f of m.frame) {
    if (f.maxHeight !== 'none') throw new Error(`${name}: ${f.s} declares max-height ${f.maxHeight}`);
    if (f.overflowY !== 'visible') throw new Error(`${name}: ${f.s} has overflow-y ${f.overflowY}`);
  }

  /* CONTROL · DISCLOSURE IS LEGAL AND ACCESSIBLE. Tabs are authored pedagogical structure: a pattern
     that forbids them may not grow one, and a tab strip is a W3C APG tablist or it is decoration. */
  for (const x of m.tabs) {
    const kind = `${x.kind}.tabs`;
    /* A tab group is either the SHELL's — which is what a shell is for — or a PATTERN's, and a
       pattern may only grow the kinds it declares. */
    if (!x.shell) {
      if (!x.pattern) throw new Error(`${name}: a ${kind} group belongs to neither a shell nor a pattern`);
      const owner = PATTERNS[x.pattern];
      if (!owner.disclosureAllowed.includes(kind))
        throw new Error(`${name}: a ${kind} group appears in "${x.pattern}", which allows ${owner.disclosureAllowed.join(', ')}`);
      if (owner.disclosureForbidden.includes(kind))
        throw new Error(`${name}: "${x.pattern}" explicitly forbids ${kind} and one is painted`);
    }
    /* CONTROL · THE TWO KINDS ARE ENCODED, NOT STYLED — and the affordance is keyed on the KIND at
       every nesting depth. A views strip inside a collection panel must look like every other views
       strip; a control keyed on depth rather than on meaning is how this went wrong once already. */
    if (!AFFORD[x.kind]) AFFORD[x.kind] = { name, sig: x.sig, depth: x.depth };
    else if (AFFORD[x.kind].sig !== x.sig)
      throw new Error(`${name}: a ${x.kind} group at depth ${x.depth} paints a different affordance `
        + `from the one at depth ${AFFORD[x.kind].depth} in ${AFFORD[x.kind].name}`);
    if (x.rows !== 1) throw new Error(`${name}: a tab strip wrapped onto ${x.rows} rows — it must stay one row and scroll`);
    if (!x.activeWhole) throw new Error(`${name}: the current tab is not fully in view`);
    if (!x.roles) throw new Error(`${name}: the tab group is not a W3C APG tablist (role/aria-controls/aria-labelledby)`);
    if (!x.roving) throw new Error(`${name}: the tab strip has no roving tabindex — exactly one tab is focusable`);
  }
  return m;
}

/* ── run ──────────────────────────────────────────────────────────────────────────────────────── */
const REPORT = [];
const SELECTED = ONLY ? PAGES.filter((e) => ONLY.has(e.n) || ONLY.has(e.pattern) || ONLY.has(e.shell)) : PAGES;
if (ONLY && !SELECTED.length) throw new Error('CP_ONLY matched no page');
console.log('\nrendering the composition atlas');
let SIG = null;
for (const page of SELECTED) {
  const id = (page.shell ? 'shell-' + page.shell : page.pattern).replace(/\./g, '-');
  /* EVERY LEAF STATE THE SHELL DECLARES, enumerated from the tree — a panel cannot exist without a
     render that opens it. A plain page has exactly one, unnamed. */
  const states = page.shell ? statesOf(page) : [{ key: '', sel: {} }];
  for (const state of states) {
    for (const surface of SURFACES) {
      const name = `${page.n}-${id}${state.key ? '-' + state.key : ''}-${surface}`;
      const r = await shot(name, page, surface, { diagram: surface === 'desktop', state });
      const m = verify(name, page, r);
      /* CONTROL · THE AUTHORED TAB STRUCTURE IS IDENTICAL AT EVERY WIDTH AND IN EVERY STATE. This is
         the invariant the whole disclosure axis exists to protect: the renderer may never create,
         remove, reorder or collapse a tab, and a width may never be the reason one moved. */
      if (page.shell) {
        if (SIG == null) SIG = m.tabSig;
        else if (m.tabSig !== SIG)
          throw new Error(`${name}: the tab structure is\n    ${m.tabSig}\n  but the shell declares\n    ${SIG}`);
      }
      REPORT.push({ image: name, shell: page.shell || null, state: state.key || null,
        pattern: page.shell ? m.grids.map((G) => G.pattern).join(' + ') : page.pattern,
        subdesign: m.grids.map((G) => G.subdesign).join(' + '), surface,
        aspect: r.built.instances[0] ? r.built.instances[0].aspect : null,
        pageHeight: m.docH, sig: sig(m) });
      console.log(`  ${name.padEnd(50)} ${String(r.g.width).padStart(4)}px page ${String(m.docH).padStart(5)}px  `
        + m.grids.map((G) => `${G.pattern}/${G.subdesign}`).join(' + '));
    }
  }
}

/* CONTROL · ADVERSARIAL CONTENT MOVES NOTHING BUT HEIGHT. The arrangements exist before the content
   is inserted, so a hostile payload may make the page taller and may NEVER change which subdesign
   is used, which slots exist, or how wide any of them is. This is the control that would have
   caught every resolver this project has thrown away. */
console.log('\ncontrol · adversarial payloads must move nothing but height');
let adv = 0;
for (const page of SELECTED) {
  if (!page.adversarial) continue;
  for (const surface of ['desktop', 'phone']) {
    const id = (page.shell ? 'shell-' + page.shell : page.pattern).replace(/\./g, '-');
    const name = `${page.n}-${id}-${surface}-adversarial`;
    /* the baseline is THIS PAGE's plain render, not the first page that happens to share the pattern —
       three pages use visual.explanation and they legitimately take different subdesigns */
    const base0 = REPORT.find((x) => x.image === `${page.n}-${id}-${surface}`);
    const r = await shot(name, page, surface, { adversarial: true });
    verify(name, page, r);
    const got = sig(r.m);
    if (got !== base0.sig)
      throw new Error(`an adversarial payload changed the composition at ${surface} / ${page.pattern || page.shell}\n`
        + `  plain       ${base0.sig}\n  adversarial ${got}`);
    adv++;
  }
  console.log(`  ${String(page.pattern || 'shell.' + page.shell).padEnd(26)} same subdesign, same slots, same widths — only taller`);
}
if (!adv) throw new Error('no page declared an adversarial payload, so the strongest control never ran');

/* CONTROL · A DIFFERENT MEDIA SHAPE TAKES THE PATTERN'S OTHER APPROVED SUBDESIGN — and takes it
   OUTRIGHT, not by degrees. The aspect class is a property of the authored domain, so this is the
   one input besides the surface that may move a composition, and the pattern must already contain
   the answer rather than inventing one. */
console.log('\ncontrol · a different media aspect selects the pattern’s other approved subdesign');
let alt = 0;
for (const page of SELECTED) {
  if (!page.alternate) continue;
  const name = `${page.n}-${page.pattern.replace(/\./g, '-')}-desktop-alternate`;
  const r = await shot(name, page, 'desktop', { alternate: true });
  verify(name, page, r);
  const g0 = r.m.grids[0], b0 = r.built.instances[0];
  if (g0.subdesign !== page.alternate.expect)
    throw new Error(`${name}: a ${b0.aspect} plane took "${g0.subdesign}", and the page `
      + `expects the pattern's "${page.alternate.expect}" subdesign`);
  const w = g0.slots.find((x) => x.name === 'media').w;
  console.log(`  ${page.pattern.padEnd(26)} ${b0.aspect} plane → ${g0.subdesign}, media slot ${w}px`);
  alt++;
}
if (!alt) throw new Error('no page offered an alternate media, so the aspect-driven subdesign is untested');

await figPage.close(); await browser.close(); server.close();

if (!LIVE.localX.length) throw new Error('no region ever overflowed horizontally, so the local-x contract is untested');
console.log(`\ncontrol · local-x needed at ${LIVE.localX.length} render(s) — first: ${LIVE.localX[0]}`);
if (!LIVE.pane.length) throw new Error('a pane was declared but never actually overflowed at any width, '
  + 'so scrollOwnership=pane is a claim rather than a tested contract');
console.log(`control · a pane genuinely overflowed at ${LIVE.pane.length} render(s) — first: ${LIVE.pane[0]}`);
console.log(`control · optional-collapse fired at ${LIVE.collapse.length} render(s)`
  + (LIVE.collapse.length ? ` — first: ${LIVE.collapse[0]}` : ''));
console.log(LIVE.reserved.length
  ? `control · optional-reserved painted at ${LIVE.reserved.length} render(s)`
  : 'note      · no pattern in this catalogue needed `optional-reserved`. The policy is declared and its\n'
    + '            control is in place; nothing here yet has a designed emptiness worth naming, and saying\n'
    + '            so is better than inventing one to make a count non-zero.');

/* CONTROL · THE TWO KINDS ARE DISTINGUISHABLE. Keeping each kind's affordance constant across depths
   is only half the claim: if `views` and `collection` paint the SAME affordance, a reader cannot tell
   an item selector from a view switch and the encoding has bought nothing. The per-depth control
   could not catch that — `views` occurs only at depth 1 in this corpus, so nothing disagreed with it
   — and a regression that styled the nested views strip as an item selector passed it. */
if (!AFFORD.collection || !AFFORD.views)
  throw new Error('the corpus does not paint both tab kinds, so nothing tests that they differ');
if (AFFORD.collection.sig === AFFORD.views.sig)
  throw new Error(`both tab kinds paint the same affordance (${AFFORD.views.sig}) — an item selector `
    + `and a view switch are different claims about the content and must look different`);
console.log('\nTHE TWO TAB KINDS — one affordance each, at every depth, and distinguishable');
for (const [k, v] of Object.entries(AFFORD)) console.log(`  ${k.padEnd(11)} ${v.sig}`);
/* THE SLOT INSPECTOR, ACROSS THE ATLAS. Every media slot that was painted, what the pattern granted
   it and what it actually did with it. A contract nothing ever exercised would not be one, so the
   build refuses a run in which no media slot was measured at all. */
if (!LIVE.fit.length) throw new Error('no media slot was inspected on any render, so the slot-fit contract is untested');
console.log(`\nTHE SLOT INSPECTOR — ${LIVE.fit.length} media slot(s) painted, every one inhabiting its slot`);
for (const line of [...new Set(LIVE.fit)].sort()) console.log(`  ${line}`);
if (LIVE.signal.length) {
  console.log('\n  SIGNALS (nothing acted on them — they are for a human to rule on)');
  for (const line of [...new Set(LIVE.signal)]) console.log(`    ${line}`);
}

/* WHAT IS APPROVED AND NEVER RENDERED. An approved subdesign nothing exercises has been designed and
   not tested, and the honest thing is to say which ones rather than let the green run imply
   coverage. Named, not failed: the corpus is a real lesson, and it does not owe us one figure of
   every aspect class. This list IS the brief for the slot-fit atlas. */
{
  const gap = [];
  for (const [id, p2] of Object.entries(PATTERNS)) {
    if (id.startsWith('_')) continue;
    for (const d of p2.subdesigns) if (!LIVE.rendered.has(`${id}/${d.id}`)) gap.push(`${id}/${d.id} (${d.surface}${d.aspects ? ' · ' + d.aspects.join(', ') : ''})`);
  }
  if (gap.length) console.log(`\napproved and never rendered — designed, not tested:\n  ${gap.join('\n  ')}`);
}

console.log('\nTHE CATALOGUE, AS RENDERED');
for (const id of Object.keys(PATTERNS).filter((k) => !k.startsWith('_'))) {
  const rs = REPORT.filter((r) => r.pattern === id);
  if (!rs.length) continue;
  console.log(`  ${id.padEnd(26)} ${rs.map((r) => `${r.surface[0]}:${r.subdesign}`).join(' ')}`
    + `  page ${Math.min(...rs.map((r) => r.pageHeight))}-${Math.max(...rs.map((r) => r.pageHeight))}px`);
}
fs.writeFileSync(path.join(OUT, 'composition-report.json'), JSON.stringify(REPORT, null, 2));
console.log(`\nwrote ${path.relative(root, OUT)} — ${REPORT.length + adv + alt} renders, `
  + `${Object.keys(PATTERNS).filter((k) => !k.startsWith('_')).length} patterns, `
  + `${new Set(REPORT.filter((r) => r.shell).map((r) => r.shell)).size} shell(s), `
  + `${new Set(REPORT.map((r) => r.image.split('-').slice(0, 1).join())).size} pages`);
